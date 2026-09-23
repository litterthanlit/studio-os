/* eslint-disable @typescript-eslint/no-explicit-any */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { canReadProject, canWriteProject, now } from "./auth";

/**
 * Project design state: the taste profile and design tokens that shape
 * generation. Owner functions for the editor; `…ForAgent` (service secret) and
 * `…ForUserAgent` (service secret + acting owner) mirror `convex/projects.ts`.
 */

const MAX_DESIGN_STATE_BYTES = 256 * 1024;

const designStateResult = v.union(
  v.null(),
  v.object({
    tasteProfile: v.union(v.null(), v.any()),
    designTokens: v.union(v.null(), v.any()),
    tasteUpdatedAt: v.union(v.null(), v.number()),
    tokensUpdatedAt: v.union(v.null(), v.number()),
    updatedAt: v.number(),
  }),
);

/** `undefined` leaves a field unchanged; `null` clears it. */
const optionalValue = v.optional(v.union(v.null(), v.any()));

function assertServiceSecret(value: string) {
  const expected = process.env.CONVEX_INTERNAL_API_SECRET;
  if (!expected || value !== expected) throw new Error("FORBIDDEN");
}

function assertSize(value: unknown, field: string) {
  if (value === undefined || value === null) return;
  if (typeof value !== "object") throw new Error(`INVALID_${field.toUpperCase()}`);
  if (JSON.stringify(value).length > MAX_DESIGN_STATE_BYTES) throw new Error(`${field.toUpperCase()}_TOO_LARGE`);
}

async function loadRow(ctx: QueryCtx | MutationCtx, projectId: Id<"projects">) {
  return await ctx.db
    .query("projectDesignState")
    .withIndex("by_project", (q: any) => q.eq("projectId", projectId))
    .unique();
}

function toResult(row: Doc<"projectDesignState"> | null) {
  if (!row) return null;
  return {
    tasteProfile: row.tasteProfile ?? null,
    designTokens: row.designTokens ?? null,
    tasteUpdatedAt: row.tasteUpdatedAt ?? null,
    tokensUpdatedAt: row.tokensUpdatedAt ?? null,
    updatedAt: row.updatedAt,
  };
}

async function requireOwnedProjectForUserAgent(
  ctx: QueryCtx | MutationCtx,
  projectId: Id<"projects">,
  actingUserId: Id<"users">,
) {
  const project = await ctx.db.get(projectId);
  if (!project || project.status === "deleted") throw new Error("PROJECT_NOT_FOUND");
  if (project.ownerId !== actingUserId) throw new Error("PROJECT_FORBIDDEN");
  return project;
}

export const get = query({
  args: { projectId: v.id("projects") },
  returns: designStateResult,
  handler: async (ctx, args) => {
    await canReadProject(ctx, args.projectId);
    return toResult(await loadRow(ctx, args.projectId));
  },
});

export const save = mutation({
  args: {
    projectId: v.id("projects"),
    tasteProfile: optionalValue,
    designTokens: optionalValue,
  },
  returns: v.object({ updatedAt: v.number() }),
  handler: async (ctx, args) => {
    const { project } = await canWriteProject(ctx, args.projectId);
    assertSize(args.tasteProfile, "tasteProfile");
    assertSize(args.designTokens, "designTokens");

    const time = now();
    const patch: Record<string, unknown> = { updatedAt: time };
    if (args.tasteProfile !== undefined) {
      patch.tasteProfile = args.tasteProfile ?? undefined;
      patch.tasteUpdatedAt = time;
    }
    if (args.designTokens !== undefined) {
      patch.designTokens = args.designTokens ?? undefined;
      patch.tokensUpdatedAt = time;
    }

    const existing = await loadRow(ctx, args.projectId);
    if (existing) {
      await ctx.db.patch(existing._id, patch);
    } else {
      await ctx.db.insert("projectDesignState", {
        ownerId: project.ownerId,
        projectId: args.projectId,
        createdAt: time,
        ...(patch as { updatedAt: number }),
      });
    }
    return { updatedAt: time };
  },
});

export const getForAgent = query({
  args: {
    projectId: v.id("projects"),
    serviceSecret: v.string(),
  },
  returns: designStateResult,
  handler: async (ctx, args) => {
    assertServiceSecret(args.serviceSecret);
    const project = await ctx.db.get(args.projectId);
    if (!project || project.status === "deleted") throw new Error("PROJECT_NOT_FOUND");
    return toResult(await loadRow(ctx, args.projectId));
  },
});

export const getForUserAgent = query({
  args: {
    projectId: v.id("projects"),
    actingUserId: v.id("users"),
    serviceSecret: v.string(),
  },
  returns: designStateResult,
  handler: async (ctx, args) => {
    assertServiceSecret(args.serviceSecret);
    await requireOwnedProjectForUserAgent(ctx, args.projectId, args.actingUserId);
    return toResult(await loadRow(ctx, args.projectId));
  },
});
