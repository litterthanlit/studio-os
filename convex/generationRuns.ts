/* eslint-disable @typescript-eslint/no-explicit-any */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { canWriteProject, now } from "./authHelpers";

/**
 * Generation runs (master plan 1.1, absorbing the 0.10 agentRuns). Callers authenticate like the canvas functions:
 * service secret (+ optional acting owner) for agent tokens, otherwise the
 * signed-in project owner.
 */

const MAX_PROGRESS_ROWS = 60;
const MAX_RESULT_BYTES = 512 * 1024;

const runStatus = v.union(
  v.literal("queued"),
  v.literal("running"),
  v.literal("complete"),
  v.literal("partial"),
  v.literal("failed"),
);

const access = {
  serviceSecret: v.optional(v.string()),
  actingUserId: v.optional(v.id("users")),
};

function assertServiceSecret(value: string) {
  const expected = process.env.CONVEX_INTERNAL_API_SECRET;
  if (!expected || value !== expected) throw new Error("FORBIDDEN");
}

async function authorizeProject(
  ctx: QueryCtx | MutationCtx,
  projectId: Id<"projects">,
  args: { serviceSecret?: string; actingUserId?: Id<"users"> },
): Promise<Doc<"projects">> {
  if (args.serviceSecret) {
    assertServiceSecret(args.serviceSecret);
    const project = await ctx.db.get(projectId);
    if (!project || project.status === "deleted") throw new Error("PROJECT_NOT_FOUND");
    if (args.actingUserId && project.ownerId !== args.actingUserId) throw new Error("PROJECT_FORBIDDEN");
    return project;
  }
  const { project } = await canWriteProject(ctx, projectId);
  return project;
}

const runKind = v.union(
  v.literal("screen"),
  v.literal("screen-set"),
  v.literal("section"),
  v.literal("restyle"),
  v.literal("stress-test"),
  v.literal("benchmark"),
);

const stepStatus = v.union(v.literal("pending"), v.literal("running"), v.literal("done"), v.literal("failed"));

function toRecord(run: Doc<"generationRuns">) {
  return {
    runId: run._id,
    projectId: run.projectId,
    kind: run.kind,
    status: run.status,
    briefId: run.briefId ?? null,
    inputHash: run.inputHash,
    input: run.input ?? null,
    steps: run.steps,
    progress: run.progress,
    outputs: run.outputs,
    result: run.result ?? null,
    error: run.error ?? null,
    missingScreenIds: run.missing ?? [],
    costMicros: run.costMicros ?? null,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
    completedAt: run.completedAt ?? null,
  };
}

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    kind: runKind,
    input: v.any(),
    inputHash: v.optional(v.string()),
    briefId: v.optional(v.id("designBriefs")),
    stepKeys: v.optional(v.array(v.string())),
    ...access,
  },
  returns: v.id("generationRuns"),
  handler: async (ctx, args) => {
    const project = await authorizeProject(ctx, args.projectId, args);
    const time = now();
    return await ctx.db.insert("generationRuns", {
      ownerId: project.ownerId,
      projectId: args.projectId,
      kind: args.kind,
      ...(args.briefId ? { briefId: args.briefId } : {}),
      inputHash: args.inputHash ?? "",
      status: "queued",
      input: args.input,
      steps: (args.stepKeys ?? []).map((key) => ({ key, status: "pending" as const })),
      progress: [{ step: "queued", at: time }],
      outputs: [],
      createdAt: time,
      updatedAt: time,
    });
  },
});

export const update = mutation({
  args: {
    runId: v.id("generationRuns"),
    status: v.optional(runStatus),
    stepKey: v.optional(v.string()),
    stepStatus: v.optional(stepStatus),
    checkpoint: v.optional(v.any()),
    output: v.optional(v.object({ kind: v.string(), ref: v.string(), data: v.optional(v.any()) })),
    costMicros: v.optional(v.number()),
    step: v.optional(v.string()),
    detail: v.optional(v.string()),
    result: v.optional(v.any()),
    error: v.optional(v.string()),
    missingScreenIds: v.optional(v.array(v.string())),
    ...access,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) throw new Error("RUN_NOT_FOUND");
    await authorizeProject(ctx, run.projectId, args);
    if (args.result !== undefined && JSON.stringify(args.result).length > MAX_RESULT_BYTES) {
      throw new Error("RUN_RESULT_TOO_LARGE");
    }

    const time = now();
    const patch: Partial<Doc<"generationRuns">> = { updatedAt: time };
    if (args.status) {
      patch.status = args.status;
      if (args.status === "complete" || args.status === "partial" || args.status === "failed") {
        patch.completedAt = time;
      }
    }
    if (args.step) {
      patch.progress = [
        ...run.progress,
        { step: args.step.slice(0, 80), at: time, ...(args.detail ? { detail: args.detail.slice(0, 500) } : {}) },
      ].slice(-MAX_PROGRESS_ROWS);
    }
    if (args.result !== undefined) patch.result = args.result;
    if (args.error !== undefined) patch.error = args.error.slice(0, 2000);
    if (args.missingScreenIds) patch.missing = args.missingScreenIds.slice(0, 20);
    if (args.costMicros !== undefined) patch.costMicros = args.costMicros;
    if (args.stepKey && args.stepStatus) {
      const steps = run.steps.some((step: any) => step.key === args.stepKey)
        ? run.steps
        : [...run.steps, { key: args.stepKey, status: "pending" as const }];
      patch.steps = steps.map((step: any) =>
        step.key !== args.stepKey
          ? step
          : {
              ...step,
              status: args.stepStatus!,
              ...(args.stepStatus === "running" ? { startedAt: time } : {}),
              ...(args.stepStatus === "done" || args.stepStatus === "failed" ? { endedAt: time } : {}),
              ...(args.checkpoint !== undefined ? { checkpoint: args.checkpoint } : {}),
              ...(args.stepStatus === "failed" && args.error ? { error: args.error.slice(0, 500) } : {}),
            },
      );
    }
    if (args.output) {
      const outputs = run.outputs.filter((output: any) => output.ref !== args.output!.ref);
      patch.outputs = [...outputs, args.output].slice(-60);
    }
    await ctx.db.patch(args.runId, patch);
    return null;
  },
});

export const get = query({
  args: {
    runId: v.id("generationRuns"),
    ...access,
  },
  returns: v.union(v.null(), v.any()),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) return null;
    await authorizeProject(ctx, run.projectId, args);
    return toRecord(run);
  },
});
