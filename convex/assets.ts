/* eslint-disable @typescript-eslint/no-explicit-any */
import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { canWriteProject, now, requireUser } from "./auth";

/**
 * Canvas image uploads go to Convex file storage; the canvas document keeps
 * only `{ imageUrl, storageId, contentHash }`. Flow:
 *   1. generateUploadUrl → client POSTs the (downscaled) image bytes
 *   2. register → records ownership and returns the served URL
 * Identical content in the same project dedupes to the existing asset.
 */

const MAX_ASSET_BYTES = 12 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"]);

export const generateUploadUrl = mutation({
  args: { projectId: v.id("projects") },
  returns: v.string(),
  handler: async (ctx, args) => {
    await canWriteProject(ctx, args.projectId);
    return await ctx.storage.generateUploadUrl();
  },
});

export const register = mutation({
  args: {
    projectId: v.id("projects"),
    storageId: v.id("_storage"),
    contentHash: v.string(),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
  },
  returns: v.object({
    url: v.string(),
    storageId: v.id("_storage"),
    contentHash: v.string(),
    deduped: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await canWriteProject(ctx, args.projectId);
    if (!/^[a-f0-9]{64}$/.test(args.contentHash)) throw new Error("INVALID_CONTENT_HASH");

    const meta = await ctx.db.system.get(args.storageId);
    if (!meta) throw new Error("UPLOAD_NOT_FOUND");
    const contentType = meta.contentType ?? "application/octet-stream";
    if (!ALLOWED_TYPES.has(contentType) || meta.size > MAX_ASSET_BYTES) {
      await ctx.storage.delete(args.storageId);
      throw new Error("UNSUPPORTED_UPLOAD");
    }

    const existing = await ctx.db
      .query("canvasAssets")
      .withIndex("by_project_hash", (q: any) => q.eq("projectId", args.projectId).eq("contentHash", args.contentHash))
      .first();
    if (existing && existing.storageId !== args.storageId) {
      const existingUrl = await ctx.storage.getUrl(existing.storageId);
      if (existingUrl) {
        await ctx.storage.delete(args.storageId);
        return { url: existingUrl, storageId: existing.storageId, contentHash: args.contentHash, deduped: true };
      }
    }

    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) throw new Error("UPLOAD_NOT_FOUND");
    if (!existing) {
      await ctx.db.insert("canvasAssets", {
        ownerId: user._id,
        projectId: args.projectId,
        storageId: args.storageId,
        contentHash: args.contentHash,
        contentType,
        byteSize: meta.size,
        width: args.width,
        height: args.height,
        createdAt: now(),
      });
    }
    return { url, storageId: args.storageId, contentHash: args.contentHash, deduped: false };
  },
});
