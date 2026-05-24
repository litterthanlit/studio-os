/* eslint-disable @typescript-eslint/no-explicit-any */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { canReadProject, canWriteProject, now, requireUser, writeAuditLog } from "./auth";

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
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
  },
  handler: async (ctx, args) => {
    const { user } = await canWriteProject(ctx, args.projectId);
    const existing = await ctx.db
      .query("canvasDocuments")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
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
      await ctx.db.patch(existing._id, {
        state: args.state,
        schemaVersion: args.schemaVersion ?? existing.schemaVersion,
        documentVersion: existing.documentVersion + 1,
        revision: nextRevision,
        lastSavedAt: time,
        updatedAt: time,
      });
      await ctx.db.insert("canvasSnapshots", {
        ownerId: user._id,
        projectId: args.projectId,
        canvasDocumentId: existing._id,
        revision: nextRevision,
        state: args.state,
        createdAt: time,
      });
      return { id: existing._id, revision: nextRevision };
    }

    const canvasDocumentId = await ctx.db.insert("canvasDocuments", {
      ownerId: user._id,
      projectId: args.projectId,
      schemaVersion: args.schemaVersion ?? 1,
      documentVersion: 1,
      revision: 1,
      state: args.state,
      status: "active",
      lastSavedAt: time,
      createdAt: time,
      updatedAt: time,
    });
    await ctx.db.insert("canvasSnapshots", {
      ownerId: user._id,
      projectId: args.projectId,
      canvasDocumentId,
      revision: 1,
      state: args.state,
      createdAt: time,
    });
    return { id: canvasDocumentId, revision: 1 };
  },
});

function normalizeSlug(value: string) {
  const slug = value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  if (!slug) throw new Error("INVALID_SLUG");
  return slug.slice(0, 80);
}
