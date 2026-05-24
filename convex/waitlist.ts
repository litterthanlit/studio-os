import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { now } from "./auth";

export const add = mutation({
  args: {
    serviceSecret: v.string(),
    email: v.string(),
    source: v.optional(v.string()),
    ipHash: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    assertServiceSecret(args.serviceSecret);
    const email = args.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("INVALID_EMAIL");
    const existing = await ctx.db
      .query("waitlistEntries")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (existing) return { ok: true, alreadyRegistered: true };
    const time = now();
    await ctx.db.insert("waitlistEntries", {
      email,
      status: "pending",
      source: args.source,
      ipHash: args.ipHash,
      createdAt: time,
      updatedAt: time,
    });
    return { ok: true, alreadyRegistered: false };
  },
});

export const count = query({
  args: {},
  handler: async (ctx) => {
    const entries = await ctx.db.query("waitlistEntries").withIndex("by_status", (q) => q.eq("status", "pending")).collect();
    return entries.length;
  },
});

function assertServiceSecret(value: string) {
  const expected = process.env.CONVEX_INTERNAL_API_SECRET;
  if (!expected || value !== expected) throw new Error("FORBIDDEN");
}
