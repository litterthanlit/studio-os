/* eslint-disable @typescript-eslint/no-explicit-any */
import { v } from "convex/values";
import { internalMutation, mutation } from "./_generated/server";
import { now } from "./auth";

const providerValidator = v.union(
  v.literal("openrouter"),
  v.literal("openai"),
  v.literal("lummi"),
  v.literal("arena"),
  v.literal("pinterest"),
  v.literal("dribbble"),
  v.literal("savee"),
  v.literal("cosmosso"),
  v.literal("resend"),
  v.literal("internal")
);

const costCategoryValidator = v.union(v.literal("free"), v.literal("standard"), v.literal("expensive"));

const consumeArgs = {
  namespace: v.string(),
  subjectKey: v.string(),
  limit: v.number(),
  windowMs: v.number(),
  provider: providerValidator,
  route: v.string(),
  costCategory: costCategoryValidator,
  costUnits: v.optional(v.number()),
};

export const consume = internalMutation({
  args: consumeArgs,
  handler: async (ctx, args) => consumeBucket(ctx, args),
});

export const consumeServerRoute = mutation({
  args: {
    serviceSecret: v.string(),
    ...consumeArgs,
  },
  handler: async (ctx, args) => {
    assertServiceSecret(args.serviceSecret);
    return consumeBucket(ctx, args);
  },
});

async function consumeBucket(
  ctx: any,
  args: {
    namespace: string;
    subjectKey: string;
    limit: number;
    windowMs: number;
    provider: "openrouter" | "openai" | "lummi" | "arena" | "pinterest" | "dribbble" | "savee" | "cosmosso" | "resend" | "internal";
    route: string;
    costCategory: "free" | "standard" | "expensive";
    costUnits?: number;
  }
) {
  if (args.limit <= 0 || args.windowMs <= 0) throw new Error("INVALID_RATE_LIMIT");

  const time = now();
  const windowStart = Math.floor(time / args.windowMs) * args.windowMs;
  const windowEnd = windowStart + args.windowMs;
  const bucketKey = `${args.namespace}:${args.subjectKey}:${windowStart}`;

  const bucket = await ctx.db
    .query("rateLimitBuckets")
    .withIndex("by_bucket_key", (q: any) => q.eq("bucketKey", bucketKey))
    .unique();

  if (bucket && bucket.count >= args.limit) {
    return {
      allowed: false,
      retryAfterMs: Math.max(0, bucket.windowEnd - time),
      remaining: 0,
    };
  }

  if (bucket) {
    await ctx.db.patch(bucket._id, {
      count: bucket.count + 1,
      updatedAt: time,
    });
  } else {
    await ctx.db.insert("rateLimitBuckets", {
      bucketKey,
      namespace: args.namespace,
      subjectKey: args.subjectKey,
      windowStart,
      windowEnd,
      count: 1,
      updatedAt: time,
    });
  }

  await recordUsage(ctx, {
    provider: args.provider,
    route: args.route,
    subjectKey: args.subjectKey,
    costCategory: args.costCategory,
    costUnits: args.costUnits ?? 1,
    time,
  });

  return {
    allowed: true,
    retryAfterMs: 0,
    remaining: Math.max(0, args.limit - ((bucket?.count ?? 0) + 1)),
  };
}

async function recordUsage(
  ctx: any,
  args: {
    provider: "openrouter" | "openai" | "lummi" | "arena" | "pinterest" | "dribbble" | "savee" | "cosmosso" | "resend" | "internal";
    route: string;
    subjectKey: string;
    costCategory: "free" | "standard" | "expensive";
    costUnits: number;
    time: number;
  }
) {
  const dayKey = new Date(args.time).toISOString().slice(0, 10);
  const matches = await ctx.db
    .query("providerUsage")
    .withIndex("by_subject_day", (q: any) => q.eq("subjectKey", args.subjectKey).eq("dayKey", dayKey))
    .collect();
  const existing = matches.find(
    (row: any) => row.provider === args.provider && row.route === args.route
  );

  if (existing) {
    await ctx.db.patch(existing._id, {
      requestCount: existing.requestCount + 1,
      costUnits: existing.costUnits + args.costUnits,
      updatedAt: args.time,
    });
    return;
  }

  await ctx.db.insert("providerUsage", {
    provider: args.provider,
    route: args.route,
    subjectKey: args.subjectKey,
    dayKey,
    costCategory: args.costCategory,
    requestCount: 1,
    costUnits: args.costUnits,
    createdAt: args.time,
    updatedAt: args.time,
  });
}

function assertServiceSecret(value: string) {
  const expected = process.env.CONVEX_INTERNAL_API_SECRET;
  if (!expected || value !== expected) throw new Error("FORBIDDEN");
}
