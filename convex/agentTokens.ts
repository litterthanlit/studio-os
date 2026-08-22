import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { now, requireUser, writeAuditLog } from "./auth";

const MAX_TOKENS_PER_USER = 20;
const MAX_NAME_LENGTH = 60;
const AGENT_PAT_PREFIX = "sos_live_";

const tokenListItem = v.object({
  _id: v.id("agentTokens"),
  name: v.string(),
  prefix: v.string(),
  projectId: v.optional(v.id("projects")),
  createdAt: v.number(),
  lastUsedAt: v.optional(v.number()),
});

function assertServiceSecret(value: string) {
  const expected = process.env.CONVEX_INTERNAL_API_SECRET;
  if (!expected || value !== expected) throw new Error("FORBIDDEN");
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function generatePlaintextToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${AGENT_PAT_PREFIX}${hex}`;
}

export const listMine = query({
  args: {},
  returns: v.array(tokenListItem),
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const rows = await ctx.db
      .query("agentTokens")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    return rows
      .filter((row) => row.revokedAt == null)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((row) => ({
        _id: row._id,
        name: row.name,
        prefix: row.prefix,
        projectId: row.projectId,
        createdAt: row.createdAt,
        lastUsedAt: row.lastUsedAt,
      }));
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    projectId: v.optional(v.id("projects")),
  },
  returns: v.object({
    id: v.id("agentTokens"),
    token: v.string(),
    prefix: v.string(),
    name: v.string(),
    projectId: v.optional(v.id("projects")),
  }),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const name = args.name.trim().slice(0, MAX_NAME_LENGTH) || "Agent token";

    if (args.projectId) {
      const project = await ctx.db.get(args.projectId);
      if (!project || project.status === "deleted") throw new Error("PROJECT_NOT_FOUND");
      if (project.ownerId !== user._id) throw new Error("PROJECT_FORBIDDEN");
    }

    const existing = await ctx.db
      .query("agentTokens")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const activeCount = existing.filter((row) => row.revokedAt == null).length;
    if (activeCount >= MAX_TOKENS_PER_USER) {
      throw new Error("TOKEN_LIMIT_REACHED");
    }

    const token = generatePlaintextToken();
    const tokenHash = await sha256Hex(token);
    const prefix = token.slice(0, 16);
    const time = now();
    const id = await ctx.db.insert("agentTokens", {
      userId: user._id,
      name,
      tokenHash,
      prefix,
      projectId: args.projectId,
      createdAt: time,
    });

    await writeAuditLog(ctx, {
      actorId: user._id,
      action: "agentTokens.create",
      targetTable: "agentTokens",
      targetId: id,
      metadata: { prefix, projectId: args.projectId ?? null },
    });

    return { id, token, prefix, name, projectId: args.projectId };
  },
});

export const revoke = mutation({
  args: { tokenId: v.id("agentTokens") },
  returns: v.object({ ok: v.literal(true) }),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const row = await ctx.db.get(args.tokenId);
    if (!row || row.userId !== user._id) throw new Error("TOKEN_NOT_FOUND");
    if (row.revokedAt) return { ok: true as const };
    await ctx.db.patch(args.tokenId, { revokedAt: now() });
    await writeAuditLog(ctx, {
      actorId: user._id,
      action: "agentTokens.revoke",
      targetTable: "agentTokens",
      targetId: args.tokenId,
    });
    return { ok: true as const };
  },
});

export const resolve = mutation({
  args: {
    tokenHash: v.string(),
    serviceSecret: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      userId: v.id("users"),
      projectId: v.optional(v.id("projects")),
    }),
  ),
  handler: async (ctx, args) => {
    assertServiceSecret(args.serviceSecret);
    if (!args.tokenHash.trim()) return null;

    const row = await ctx.db
      .query("agentTokens")
      .withIndex("by_hash", (q) => q.eq("tokenHash", args.tokenHash))
      .unique();
    if (!row || row.revokedAt) return null;

    const user = await ctx.db.get(row.userId);
    if (!user || user.status !== "active") return null;

    await ctx.db.patch(row._id, { lastUsedAt: now() });
    return {
      userId: row.userId as Id<"users">,
      projectId: row.projectId,
    };
  },
});
