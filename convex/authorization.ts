/* eslint-disable @typescript-eslint/no-explicit-any */
import { v } from "convex/values";
import { internalQuery } from "./_generated/server";
import { adminEmails } from "./auth";

export const assertAdminIdentity = internalQuery({
  args: {
    tokenIdentifier: v.string(),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", args.tokenIdentifier))
      .unique();
    const allowlisted = Boolean(args.email && adminEmails().has(args.email.toLowerCase()));
    if (!user) {
      if (allowlisted) throw new Error("ADMIN_USER_NOT_STORED");
      throw new Error("UNAUTHORIZED");
    }
    const role = await ctx.db
      .query("roles")
      .withIndex("by_user_role", (q: any) => q.eq("userId", user._id).eq("role", "admin"))
      .unique();
    if (!allowlisted && !role) throw new Error("ADMIN_REQUIRED");
    return { userId: user._id };
  },
});
