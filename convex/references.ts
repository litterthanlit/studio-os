/* eslint-disable @typescript-eslint/no-explicit-any */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { canReadProject, canWriteProject, now, requireUser } from "./auth";

const source = v.union(
  v.literal("arena"),
  v.literal("pinterest"),
  v.literal("cosmosso"),
  v.literal("savee"),
  v.literal("dribbble"),
  v.literal("upload"),
  v.literal("extension"),
  v.literal("lummi")
);

export const listMine = query({
  args: {
    projectId: v.optional(v.id("projects")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (args.projectId) await canReadProject(ctx, args.projectId);
    const limit = Math.min(args.limit ?? 100, 200);
    const q = args.projectId
      ? ctx.db
          .query("references")
          .withIndex("by_owner_project", (idx: any) => idx.eq("ownerId", user._id).eq("projectId", args.projectId))
      : ctx.db.query("references").withIndex("by_owner", (idx) => idx.eq("ownerId", user._id));
    return await q.order("desc").take(limit);
  },
});

export const create = mutation({
  args: {
    projectId: v.optional(v.id("projects")),
    boardId: v.optional(v.string()),
    imageUrl: v.string(),
    thumbnailUrl: v.optional(v.string()),
    title: v.optional(v.string()),
    source,
    tags: v.optional(v.array(v.string())),
    colors: v.optional(v.array(v.string())),
    mood: v.optional(v.string()),
    style: v.optional(v.string()),
    contentType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (args.projectId) await canWriteProject(ctx, args.projectId);
    const time = now();
    return await ctx.db.insert("references", {
      ownerId: user._id,
      projectId: args.projectId,
      boardId: args.boardId,
      imageUrl: args.imageUrl,
      thumbnailUrl: args.thumbnailUrl,
      title: args.title,
      source: args.source,
      tags: args.tags ?? [],
      colors: args.colors ?? [],
      mood: args.mood,
      style: args.style,
      contentType: args.contentType,
      createdAt: time,
      updatedAt: time,
    });
  },
});

export const updateTags = mutation({
  args: {
    referenceId: v.id("references"),
    tags: v.array(v.string()),
    tagTiers: v.optional(v.any()),
    colors: v.array(v.string()),
    mood: v.optional(v.string()),
    style: v.optional(v.string()),
    contentType: v.optional(v.string()),
    era: v.optional(v.string()),
    composition: v.optional(v.string()),
    typography: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const ref = await ctx.db.get(args.referenceId);
    if (!ref || ref.ownerId !== user._id) throw new Error("REFERENCE_NOT_FOUND");
    await ctx.db.patch(ref._id, {
      tags: args.tags,
      tagTiers: args.tagTiers,
      colors: args.colors,
      mood: args.mood,
      style: args.style,
      contentType: args.contentType,
      era: args.era,
      composition: args.composition,
      typography: args.typography,
      updatedAt: now(),
    });
    return { ok: true };
  },
});

export const storeEmbedding = mutation({
  args: {
    referenceId: v.id("references"),
    embedding: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const ref = await ctx.db.get(args.referenceId);
    if (!ref || ref.ownerId !== user._id) throw new Error("REFERENCE_NOT_FOUND");
    if (args.embedding.length !== 1536) throw new Error("INVALID_EMBEDDING");
    await ctx.db.patch(ref._id, {
      embedding: args.embedding,
      updatedAt: now(),
    });
    return { ok: true };
  },
});

export const searchMine = query({
  args: {
    query: v.string(),
    projectId: v.optional(v.id("projects")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (args.projectId) await canReadProject(ctx, args.projectId);
    const term = args.query.trim().toLowerCase();
    if (!term) return [];
    const refs = await (args.projectId
      ? ctx.db
          .query("references")
          .withIndex("by_owner_project", (q: any) => q.eq("ownerId", user._id).eq("projectId", args.projectId))
          .take(200)
      : ctx.db.query("references").withIndex("by_owner", (q) => q.eq("ownerId", user._id)).take(200));

    return refs
      .map((ref) => {
        const haystack = [
          ref.title,
          ref.boardId,
          ref.mood,
          ref.style,
          ref.contentType,
          ...(ref.tags ?? []),
          ...(ref.colors ?? []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return { ref, score: haystack.includes(term) ? 1 : 0 };
      })
      .filter((item) => item.score > 0)
      .slice(0, Math.min(args.limit ?? 20, 50))
      .map((item) => item.ref);
  },
});
