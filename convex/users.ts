import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  getCurrentUser,
  now,
  requireIdentity,
  requireUser,
  syncStudioUserRecord,
} from "./authHelpers";

export const storeCurrent = mutation({
  args: {},
  returns: v.id("users"),
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);
    const authUserId = await getAuthUserId(ctx);
    if (authUserId) {
      await syncStudioUserRecord(ctx, authUserId, identity);
      return authUserId;
    }

    const time = now();
    const email = identity.email?.toLowerCase();
    const existing = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (existing) {
      await syncStudioUserRecord(ctx, existing._id, identity);
      return existing._id;
    }

    const userId = await ctx.db.insert("users", {
      tokenIdentifier: identity.tokenIdentifier,
      subject: identity.subject,
      email,
      name: identity.name,
      avatarUrl: identity.pictureUrl,
      onboardingComplete: false,
      status: "active",
      createdAt: time,
      updatedAt: time,
    });
    await syncStudioUserRecord(ctx, userId, identity);
    return userId;
  },
});

export const current = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});

export const setOnboardingComplete = mutation({
  args: { complete: v.boolean() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await ctx.db.patch(user._id, {
      onboardingComplete: args.complete,
      updatedAt: now(),
    });
    return { ok: true };
  },
});
