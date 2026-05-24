/* eslint-disable @typescript-eslint/no-explicit-any */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { now, requireUser } from "./auth";

export const listPublic = query({
  args: {
    limit: v.optional(v.number()),
    minScore: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 9, 20);
    const minScore = Math.max(0, Math.min(args.minScore ?? 75, 100));
    const approved = await ctx.db
      .query("inspirationImages")
      .withIndex("by_status_score", (q) => q.eq("curationStatus", "approved"))
      .filter((q) => q.gte(q.field("scoreOverall"), minScore))
      .take(limit);
    if (approved.length >= limit) return approved.map(normalizeImage);

    const featured = await ctx.db
      .query("inspirationImages")
      .withIndex("by_status_score", (q) => q.eq("curationStatus", "featured"))
      .filter((q) => q.gte(q.field("scoreOverall"), minScore))
      .take(limit - approved.length);
    return [...featured, ...approved].slice(0, limit).map(normalizeImage);
  },
});

export const getDaily = mutation({
  args: {
    limit: v.optional(v.number()),
    minScore: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const dateKey = new Date().toISOString().slice(0, 10);
    const cached = await ctx.db
      .query("inspirationDaily")
      .withIndex("by_user_date", (q: any) => q.eq("userId", user._id).eq("dateKey", dateKey))
      .unique();
    if (cached) {
      const images = await Promise.all(cached.imageIds.map((id: any) => ctx.db.get(id)));
      return {
        images: images.filter(Boolean).map((image) => normalizeImage(image as any)),
        collection: cached.collection ?? "Daily Inspiration",
        scored: true,
      };
    }

    const limit = Math.min(args.limit ?? 9, 20);
    const minScore = Math.max(0, Math.min(args.minScore ?? 75, 100));
    const approved = await ctx.db
      .query("inspirationImages")
      .withIndex("by_status_score", (q) => q.eq("curationStatus", "approved"))
      .filter((q) => q.gte(q.field("scoreOverall"), minScore))
      .take(limit);
    const featured =
      approved.length >= limit
        ? []
        : await ctx.db
            .query("inspirationImages")
            .withIndex("by_status_score", (q) => q.eq("curationStatus", "featured"))
            .filter((q) => q.gte(q.field("scoreOverall"), minScore))
            .take(limit - approved.length);
    const images = [...featured, ...approved].slice(0, limit).map(normalizeImage);
    const imageIds = images.map((image: any) => image.id);
    const time = now();

    await ctx.db.insert("inspirationDaily", {
      userId: user._id,
      dateKey,
      imageIds,
      collection: "Curated",
      createdAt: time,
      updatedAt: time,
    });
    for (const imageId of imageIds) {
      const image = await ctx.db.get(imageId);
      if (!image) continue;
      await ctx.db.patch(imageId, {
        displayCount: image.displayCount + 1,
        lastDisplayedAt: time,
        updatedAt: time,
      });
    }
    return { images, collection: "Curated", scored: true };
  },
});

export const listLikes = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return [];
    return await ctx.db
      .query("inspirationLikes")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

export const like = mutation({
  args: {
    imageId: v.id("inspirationImages"),
    feedbackTags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const image = await ctx.db.get(args.imageId);
    if (!image || image.curationStatus === "rejected") throw new Error("IMAGE_NOT_FOUND");
    const existing = await ctx.db
      .query("inspirationLikes")
      .withIndex("by_user_image", (q: any) => q.eq("userId", user._id).eq("imageId", args.imageId))
      .unique();
    if (existing) return existing._id;
    return await ctx.db.insert("inspirationLikes", {
      userId: user._id,
      imageId: args.imageId,
      feedbackTags: (args.feedbackTags ?? []).slice(0, 12),
      likedAt: now(),
    });
  },
});

export const unlike = mutation({
  args: { imageId: v.id("inspirationImages") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const existing = await ctx.db
      .query("inspirationLikes")
      .withIndex("by_user_image", (q: any) => q.eq("userId", user._id).eq("imageId", args.imageId))
      .unique();
    if (existing) await ctx.db.delete(existing._id);
    return { ok: true };
  },
});

function normalizeImage(img: any) {
  return {
    id: img._id,
    source: img.source,
    sourceId: img.sourceId,
    imageUrl: img.imageUrl,
    thumbnailUrl: img.thumbnailUrl,
    title: img.title,
    scores: {
      composition: img.scoreComposition,
      color: img.scoreColor,
      mood: img.scoreMood,
      uniqueness: img.scoreUniqueness,
      overall: img.scoreOverall,
    },
    tags: img.tags,
    colors: img.colors,
    mood: img.mood,
    style: img.style,
    displayCount: img.displayCount,
  };
}
