import { v } from "convex/values";
import { mutation } from "./_generated/server";

/** Batched model-call telemetry from the Next server (service secret only). */

const record = v.object({
  step: v.string(),
  model: v.string(),
  inputTokens: v.number(),
  outputTokens: v.number(),
  cachedInputTokens: v.number(),
  latencyMs: v.number(),
  finishReason: v.union(v.null(), v.string()),
  costUsd: v.union(v.null(), v.number()),
  ok: v.boolean(),
  error: v.optional(v.string()),
  runId: v.optional(v.string()),
  projectId: v.optional(v.string()),
  at: v.number(),
});

function assertServiceSecret(value: string) {
  const expected = process.env.CONVEX_INTERNAL_API_SECRET;
  if (!expected || value !== expected) throw new Error("FORBIDDEN");
}

export const recordBatch = mutation({
  args: { records: v.array(record), serviceSecret: v.string() },
  returns: v.number(),
  handler: async (ctx, args) => {
    assertServiceSecret(args.serviceSecret);
    const batch = args.records.slice(0, 100);
    for (const entry of batch) {
      await ctx.db.insert("modelCalls", {
        ...entry,
        step: entry.step.slice(0, 80),
        model: entry.model.slice(0, 120),
      });
    }
    return batch.length;
  },
});
