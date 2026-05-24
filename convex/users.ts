/* eslint-disable @typescript-eslint/no-explicit-any */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { adminEmails, now, requireIdentity, requireUser } from "./auth";

export const storeCurrent = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);
    const time = now();
    const email = identity.email?.toLowerCase();
    const existing = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        subject: identity.subject,
        email,
        name: identity.name,
        avatarUrl: identity.pictureUrl,
        updatedAt: time,
      });
      await ensureAllowlistedAdminRole(ctx, existing._id, email, time);
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
    await ensureAllowlistedAdminRole(ctx, userId, email, time);
    return userId;
  },
});

export const current = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
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

async function ensureAllowlistedAdminRole(
  ctx: MutationCtx,
  userId: Id<"users">,
  email: string | undefined,
  time: number
) {
  if (!email || !adminEmails().has(email)) return;
  const existingRole = await ctx.db
    .query("roles")
    .withIndex("by_user_role", (q: any) => q.eq("userId", userId).eq("role", "admin"))
    .unique();
  if (existingRole) {
    await ctx.db.patch(existingRole._id, { updatedAt: time });
    return;
  }
  await ctx.db.insert("roles", {
    userId,
    role: "admin",
    source: "allowlist",
    createdAt: time,
    updatedAt: time,
  });
}
