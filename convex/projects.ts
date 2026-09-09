/* eslint-disable @typescript-eslint/no-explicit-any */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { canReadProject, canWriteProject, getCurrentUser, now, requireUser, writeAuditLog } from "./auth";
import {
  canvasDocumentAuthorshipPatch,
  parseCanvasWriter,
  type CanvasWriter,
} from "../lib/canvas/agent-presence";

const canvasWriter = v.union(v.literal("user"), v.literal("agent"));

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("projects")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .filter((q) => q.neq(q.field("status"), "deleted"))
      .collect();
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    return await ctx.db
      .query("projects")
      .withIndex("by_owner_slug", (q: any) => q.eq("ownerId", user._id).eq("slug", args.slug))
      .unique();
  },
});

export const upsertBySlug = mutation({
  args: {
    slug: v.string(),
    name: v.string(),
    brief: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const slug = normalizeSlug(args.slug);
    const time = now();
    const existing = await ctx.db
      .query("projects")
      .withIndex("by_owner_slug", (q: any) => q.eq("ownerId", user._id).eq("slug", slug))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name.trim(),
        brief: args.brief?.trim() || undefined,
        color: args.color || existing.color,
        updatedAt: time,
      });
      return existing._id;
    }

    const projectId = await ctx.db.insert("projects", {
      ownerId: user._id,
      name: args.name.trim(),
      slug,
      brief: args.brief?.trim() || undefined,
      color: args.color || "#4B57DB",
      visibility: "private",
      status: "active",
      createdAt: time,
      updatedAt: time,
    });
    await writeAuditLog(ctx, {
      actorId: user._id,
      action: "projects.create",
      targetTable: "projects",
      targetId: projectId,
      metadata: { slug },
    });
    return projectId;
  },
});

export const loadCanvas = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    await canReadProject(ctx, args.projectId);
    return await ctx.db
      .query("canvasDocuments")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .unique();
  },
});

export const saveCanvas = mutation({
  args: {
    projectId: v.id("projects"),
    state: v.any(),
    expectedRevision: v.optional(v.number()),
    schemaVersion: v.optional(v.number()),
    writer: v.optional(canvasWriter),
  },
  returns: v.object({
    id: v.id("canvasDocuments"),
    revision: v.number(),
  }),
  handler: async (ctx, args) => {
    const { project } = await canWriteProject(ctx, args.projectId);
    return await persistCanvasState(ctx, project, {
      ...args,
      writer: parseCanvasWriter(args.writer) ?? "user",
    });
  },
});

function normalizeSlug(value: string) {
  const slug = value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  if (!slug) throw new Error("INVALID_SLUG");
  return slug.slice(0, 80);
}

function assertServiceSecret(value: string) {
  const expected = process.env.CONVEX_INTERNAL_API_SECRET;
  if (!expected || value !== expected) throw new Error("FORBIDDEN");
}

/**
 * Single persist path for the project's canvas document.
 *
 * Editor `saveCanvas`, agent `saveCanvasForAgent`, and user-agent
 * `saveCanvasForUserAgent` all call this. It is the only writer that
 * increments `canvasDocuments.revision`, so UI saves and agent writes
 * share one document and the same `expectedRevision` counter.
 * `writer` stamps `lastWriter` / `lastAgentAt` / `lastAgentRevision`.
 */
async function persistCanvasState(
  ctx: MutationCtx,
  project: Doc<"projects">,
  args: {
    state: unknown;
    expectedRevision?: number;
    schemaVersion?: number;
    writer: CanvasWriter;
  },
) {
  const existing = await ctx.db
    .query("canvasDocuments")
    .withIndex("by_project", (q) => q.eq("projectId", project._id))
    .unique();
  const time = now();

  if (existing) {
    if (
      typeof args.expectedRevision === "number" &&
      args.expectedRevision !== existing.revision
    ) {
      throw new Error("CANVAS_REVISION_CONFLICT");
    }
    const nextRevision = existing.revision + 1;
    const authorship = canvasDocumentAuthorshipPatch({
      writer: args.writer,
      nextRevision,
      time,
    });
    await ctx.db.patch(existing._id, {
      state: args.state,
      schemaVersion: args.schemaVersion ?? existing.schemaVersion,
      documentVersion: existing.documentVersion + 1,
      revision: nextRevision,
      lastSavedAt: time,
      updatedAt: time,
      lastWriter: authorship.lastWriter,
      ...(authorship.lastAgentAt != null ? { lastAgentAt: authorship.lastAgentAt } : {}),
      ...(authorship.lastAgentRevision != null
        ? { lastAgentRevision: authorship.lastAgentRevision }
        : {}),
    });
    await ctx.db.insert("canvasSnapshots", {
      ownerId: project.ownerId,
      projectId: project._id,
      canvasDocumentId: existing._id,
      revision: nextRevision,
      state: args.state,
      createdAt: time,
    });
    return { id: existing._id, revision: nextRevision };
  }

  const authorship = canvasDocumentAuthorshipPatch({
    writer: args.writer,
    nextRevision: 1,
    time,
  });
  const canvasDocumentId = await ctx.db.insert("canvasDocuments", {
    ownerId: project.ownerId,
    projectId: project._id,
    schemaVersion: args.schemaVersion ?? 4,
    documentVersion: 1,
    revision: 1,
    state: args.state,
    status: "active",
    lastSavedAt: time,
    lastWriter: authorship.lastWriter,
    ...(authorship.lastAgentAt != null ? { lastAgentAt: authorship.lastAgentAt } : {}),
    ...(authorship.lastAgentRevision != null
      ? { lastAgentRevision: authorship.lastAgentRevision }
      : {}),
    createdAt: time,
    updatedAt: time,
  });
  await ctx.db.insert("canvasSnapshots", {
    ownerId: project.ownerId,
    projectId: project._id,
    canvasDocumentId,
    revision: 1,
    state: args.state,
    createdAt: time,
  });
  return { id: canvasDocumentId, revision: 1 };
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

export const assertProjectAccessForAgent = query({
  args: {
    projectId: v.id("projects"),
    serviceSecret: v.string(),
  },
  handler: async (ctx, args) => {
    assertServiceSecret(args.serviceSecret);
    const project = await ctx.db.get(args.projectId);
    if (!project || project.status === "deleted") throw new Error("PROJECT_NOT_FOUND");
    return { ok: true as const };
  },
});

export const loadCanvasForAgent = query({
  args: {
    projectId: v.id("projects"),
    serviceSecret: v.string(),
  },
  handler: async (ctx, args) => {
    assertServiceSecret(args.serviceSecret);
    const project = await ctx.db.get(args.projectId);
    if (!project || project.status === "deleted") throw new Error("PROJECT_NOT_FOUND");
    return await ctx.db
      .query("canvasDocuments")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .unique();
  },
});

export const saveCanvasForAgent = mutation({
  args: {
    projectId: v.id("projects"),
    state: v.any(),
    expectedRevision: v.optional(v.number()),
    schemaVersion: v.optional(v.number()),
    serviceSecret: v.string(),
  },
  returns: v.object({
    id: v.id("canvasDocuments"),
    revision: v.number(),
  }),
  handler: async (ctx, args) => {
    assertServiceSecret(args.serviceSecret);
    const project = await ctx.db.get(args.projectId);
    if (!project || project.status === "deleted") throw new Error("PROJECT_NOT_FOUND");
    return await persistCanvasState(ctx, project, { ...args, writer: "agent" });
  },
});

const projectListItem = v.object({
  _id: v.id("projects"),
  name: v.string(),
  slug: v.string(),
  brief: v.optional(v.string()),
  updatedAt: v.number(),
});

export const listMineForUserAgent = query({
  args: {
    actingUserId: v.id("users"),
    serviceSecret: v.string(),
  },
  returns: v.array(projectListItem),
  handler: async (ctx, args) => {
    assertServiceSecret(args.serviceSecret);
    const user = await ctx.db.get(args.actingUserId);
    if (!user || user.status !== "active") throw new Error("UNAUTHORIZED");
    const rows = await ctx.db
      .query("projects")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.actingUserId))
      .collect();
    return rows
      .filter((project) => project.status !== "deleted")
      .map((project) => ({
        _id: project._id,
        name: project.name,
        slug: project.slug,
        brief: project.brief,
        updatedAt: project.updatedAt,
      }));
  },
});

export const assertProjectAccessForUserAgent = query({
  args: {
    projectId: v.id("projects"),
    actingUserId: v.id("users"),
    serviceSecret: v.string(),
  },
  returns: v.object({ ok: v.literal(true) }),
  handler: async (ctx, args) => {
    assertServiceSecret(args.serviceSecret);
    await requireOwnedProjectForUserAgent(ctx, args.projectId, args.actingUserId);
    return { ok: true as const };
  },
});

export const loadCanvasForUserAgent = query({
  args: {
    projectId: v.id("projects"),
    actingUserId: v.id("users"),
    serviceSecret: v.string(),
  },
  returns: v.union(v.null(), v.any()),
  handler: async (ctx, args) => {
    assertServiceSecret(args.serviceSecret);
    await requireOwnedProjectForUserAgent(ctx, args.projectId, args.actingUserId);
    return await ctx.db
      .query("canvasDocuments")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .unique();
  },
});

export const saveCanvasForUserAgent = mutation({
  args: {
    projectId: v.id("projects"),
    actingUserId: v.id("users"),
    state: v.any(),
    expectedRevision: v.optional(v.number()),
    schemaVersion: v.optional(v.number()),
    serviceSecret: v.string(),
  },
  returns: v.object({
    id: v.id("canvasDocuments"),
    revision: v.number(),
  }),
  handler: async (ctx, args) => {
    assertServiceSecret(args.serviceSecret);
    const project = await requireOwnedProjectForUserAgent(ctx, args.projectId, args.actingUserId);
    return await persistCanvasState(ctx, project, { ...args, writer: "agent" });
  },
});
