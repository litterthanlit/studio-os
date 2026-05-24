import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { now, requireUser, writeAuditLog } from "./auth";

const shareSnapshot = v.array(
  v.object({
    id: v.string(),
    imageUrl: v.string(),
    board: v.string(),
    notes: v.optional(v.string()),
    tags: v.object({
      style: v.array(v.string()),
      colors: v.array(v.string()),
      contentType: v.array(v.string()),
      mood: v.array(v.string()),
      ai: v.array(v.string()),
    }),
    curationStatus: v.optional(v.union(v.string(), v.null())),
  })
);

export const publishExport = mutation({
  args: {
    publicId: v.string(),
    html: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!/^[a-zA-Z0-9_-]{8,32}$/.test(args.publicId)) throw new Error("INVALID_PUBLIC_ID");
    if (!args.html.trim()) throw new Error("HTML_REQUIRED");
    if (new TextEncoder().encode(args.html).length > 2 * 1024 * 1024) {
      throw new Error("HTML_TOO_LARGE");
    }

    const time = now();
    const existing = await ctx.db
      .query("publishedExports")
      .withIndex("by_public_id", (q) => q.eq("publicId", args.publicId))
      .unique();
    if (existing) throw new Error("PUBLIC_ID_CONFLICT");

    const id = await ctx.db.insert("publishedExports", {
      ownerId: user._id,
      publicId: args.publicId,
      html: args.html,
      isActive: true,
      createdAt: time,
      updatedAt: time,
    });
    await writeAuditLog(ctx, {
      actorId: user._id,
      action: "publishedExports.create",
      targetTable: "publishedExports",
      targetId: id,
      metadata: { publicId: args.publicId },
    });
    return { id, publicId: args.publicId };
  },
});

export const getPublishedExport = query({
  args: { publicId: v.string() },
  handler: async (ctx, args) => {
    if (!/^[a-zA-Z0-9_-]{8,32}$/.test(args.publicId)) return null;
    const row = await ctx.db
      .query("publishedExports")
      .withIndex("by_public_id", (q) => q.eq("publicId", args.publicId))
      .unique();
    if (!row?.isActive) return null;
    return { html: row.html, createdAt: row.createdAt };
  },
});

export const createShareLink = mutation({
  args: {
    shareId: v.string(),
    projectName: v.optional(v.string()),
    snapshot: shareSnapshot,
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!/^[a-zA-Z0-9_-]{8,32}$/.test(args.shareId)) throw new Error("INVALID_SHARE_ID");
    if (args.snapshot.length > 250) throw new Error("TOO_MANY_REFERENCES");

    if (args.projectId) {
      const project = await ctx.db.get(args.projectId);
      if (!project || project.ownerId !== user._id) throw new Error("PROJECT_FORBIDDEN");
    }

    const time = now();
    const existing = await ctx.db
      .query("shareLinks")
      .withIndex("by_share_id", (q) => q.eq("shareId", args.shareId))
      .unique();
    if (existing) throw new Error("SHARE_ID_CONFLICT");

    const id = await ctx.db.insert("shareLinks", {
      ownerId: user._id,
      projectId: args.projectId,
      shareId: args.shareId,
      projectName: args.projectName?.trim() || "Studio Moodboard",
      snapshot: args.snapshot,
      isActive: true,
      createdAt: time,
      updatedAt: time,
    });
    await writeAuditLog(ctx, {
      actorId: user._id,
      action: "shareLinks.create",
      targetTable: "shareLinks",
      targetId: id,
      metadata: { shareId: args.shareId },
    });
    return { id, shareId: args.shareId };
  },
});

export const getShareLink = query({
  args: { shareId: v.string() },
  handler: async (ctx, args) => {
    if (!/^[a-zA-Z0-9_-]{8,32}$/.test(args.shareId)) return null;
    const row = await ctx.db
      .query("shareLinks")
      .withIndex("by_share_id", (q) => q.eq("shareId", args.shareId))
      .unique();
    if (!row?.isActive) return null;
    if (row.expiresAt && row.expiresAt <= now()) return null;
    return {
      share_id: row.shareId,
      project_name: row.projectName,
      snapshot: row.snapshot,
      created_at: new Date(row.createdAt).toISOString(),
    };
  },
});

export const revokeShareLink = mutation({
  args: { shareId: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const row = await ctx.db
      .query("shareLinks")
      .withIndex("by_share_id", (q) => q.eq("shareId", args.shareId))
      .unique();
    if (!row || row.ownerId !== user._id) throw new Error("SHARE_NOT_FOUND");
    await ctx.db.patch(row._id, { isActive: false, updatedAt: now() });
    await writeAuditLog(ctx, {
      actorId: user._id,
      action: "shareLinks.revoke",
      targetTable: "shareLinks",
      targetId: row._id,
      metadata: { shareId: args.shareId },
    });
    return { ok: true };
  },
});
