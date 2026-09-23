/* eslint-disable @typescript-eslint/no-explicit-any */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { canWriteProject, now } from "./auth";

/**
 * Async agent runs. Callers authenticate like the canvas functions:
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

function toRecord(run: Doc<"agentRuns">) {
  return {
    runId: run._id,
    projectId: run.projectId,
    kind: run.kind,
    status: run.status,
    progress: run.progress,
    result: run.result ?? null,
    error: run.error ?? null,
    missingScreenIds: run.missingScreenIds ?? [],
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
    completedAt: run.completedAt ?? null,
  };
}

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    kind: v.union(v.literal("screen"), v.literal("screen-set")),
    input: v.any(),
    ...access,
  },
  returns: v.id("agentRuns"),
  handler: async (ctx, args) => {
    const project = await authorizeProject(ctx, args.projectId, args);
    const time = now();
    return await ctx.db.insert("agentRuns", {
      ownerId: project.ownerId,
      projectId: args.projectId,
      kind: args.kind,
      status: "queued",
      input: args.input,
      progress: [{ step: "queued", at: time }],
      createdAt: time,
      updatedAt: time,
    });
  },
});

export const update = mutation({
  args: {
    runId: v.id("agentRuns"),
    status: v.optional(runStatus),
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
    const patch: Partial<Doc<"agentRuns">> = { updatedAt: time };
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
    if (args.missingScreenIds) patch.missingScreenIds = args.missingScreenIds.slice(0, 20);
    await ctx.db.patch(args.runId, patch);
    return null;
  },
});

export const get = query({
  args: {
    runId: v.id("agentRuns"),
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
