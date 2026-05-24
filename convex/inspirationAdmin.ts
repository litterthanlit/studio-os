/* eslint-disable @typescript-eslint/no-explicit-any */
import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { now, requireAdmin, writeAuditLog } from "./auth";

const curationStatus = v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"), v.literal("featured"));
const source = v.union(v.literal("lummi"), v.literal("arena"), v.literal("pinterest"), v.literal("upload"), v.literal("sample"));

export const list = query({
  args: {
    filter: v.optional(v.union(v.literal("all"), v.literal("pending"), v.literal("approved"), v.literal("rejected"), v.literal("featured"))),
    minScore: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const limit = Math.min(args.limit ?? 100, 200);
    const minScore = Math.max(0, Math.min(args.minScore ?? 0, 100));
    const filter = args.filter ?? "all";
    const rows =
      filter === "all"
        ? await ctx.db.query("inspirationImages").withIndex("by_created").order("desc").take(limit)
        : await ctx.db
            .query("inspirationImages")
            .withIndex("by_status_score", (q) => q.eq("curationStatus", filter))
            .filter((q) => q.gte(q.field("scoreOverall"), minScore))
            .take(limit);
    return rows.map((img) => ({
      id: img._id,
      source: img.source,
      sourceId: img.sourceId,
      imageUrl: img.imageUrl,
      thumbnailUrl: img.thumbnailUrl,
      title: img.title,
      scoreComposition: img.scoreComposition,
      scoreColor: img.scoreColor,
      scoreMood: img.scoreMood,
      scoreUniqueness: img.scoreUniqueness,
      scoreOverall: img.scoreOverall,
      tags: img.tags,
      colors: img.colors,
      mood: img.mood,
      style: img.style,
      curationStatus: img.curationStatus,
      displayCount: img.displayCount,
      createdAt: new Date(img.createdAt).toISOString(),
    }));
  },
});

export const updateStatus = mutation({
  args: {
    imageId: v.id("inspirationImages"),
    status: curationStatus,
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const image = await ctx.db.get(args.imageId);
    if (!image) throw new Error("IMAGE_NOT_FOUND");
    const time = now();
    await ctx.db.patch(args.imageId, {
      curationStatus: args.status,
      reviewedAt: time,
      reviewedBy: admin._id,
      updatedAt: time,
    });
    await writeAuditLog(ctx, {
      actorId: admin._id,
      action: "inspirationImages.updateStatus",
      targetTable: "inspirationImages",
      targetId: args.imageId,
      metadata: { status: args.status },
    });
    return { ok: true };
  },
});

export const createImport = internalMutation({
  args: {
    requestedBy: v.id("users"),
    provider: v.union(v.literal("lummi"), v.literal("pinterest"), v.literal("arena")),
    source: v.string(),
  },
  handler: async (ctx, args) => {
    const time = now();
    return await ctx.db.insert("inspirationImports", {
      requestedBy: args.requestedBy,
      provider: args.provider,
      source: args.source,
      status: "running",
      total: 0,
      scored: 0,
      approved: 0,
      createdAt: time,
      updatedAt: time,
    });
  },
});

export const finishImport = internalMutation({
  args: {
    importId: v.id("inspirationImports"),
    total: v.number(),
    scored: v.number(),
    approved: v.number(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.importId, {
      status: args.error ? "failed" : "completed",
      total: args.total,
      scored: args.scored,
      approved: args.approved,
      error: args.error,
      updatedAt: now(),
    });
  },
});

export const upsertScoredImage = internalMutation({
  args: {
    source,
    sourceId: v.string(),
    imageUrl: v.string(),
    thumbnailUrl: v.optional(v.string()),
    title: v.optional(v.string()),
    analysis: v.any(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("inspirationImages")
      .withIndex("by_source", (q: any) => q.eq("source", args.source).eq("sourceId", args.sourceId))
      .unique();
    if (existing) return { id: existing._id, inserted: false, approved: existing.scoreOverall >= 75 };

    const time = now();
    const scores = args.analysis.scores ?? {};
    const scoreOverall = clampScore(scores.overall);
    const id = await ctx.db.insert("inspirationImages", {
      source: args.source,
      sourceId: args.sourceId,
      imageUrl: args.imageUrl,
      thumbnailUrl: args.thumbnailUrl,
      title: args.title,
      scoreComposition: clampScore(scores.composition),
      scoreColor: clampScore(scores.color),
      scoreMood: clampScore(scores.mood),
      scoreUniqueness: clampScore(scores.uniqueness),
      scoreOverall,
      gptAnalysis: args.analysis,
      tags: Array.isArray(args.analysis.tags) ? args.analysis.tags.map(String).slice(0, 20) : [],
      colors: Array.isArray(args.analysis.colors) ? args.analysis.colors.map(String).slice(0, 12) : [],
      mood: typeof args.analysis.mood === "string" ? args.analysis.mood : undefined,
      style: typeof args.analysis.style === "string" ? args.analysis.style : undefined,
      curationStatus: scoreOverall >= 75 ? "approved" : "pending",
      displayCount: 0,
      createdAt: time,
      updatedAt: time,
    });
    return { id, inserted: true, approved: scoreOverall >= 75 };
  },
});

function clampScore(value: unknown) {
  return Math.max(0, Math.min(typeof value === "number" ? Math.round(value) : 0, 100));
}
