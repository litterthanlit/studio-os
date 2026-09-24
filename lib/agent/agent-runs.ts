// lib/agent/agent-runs.ts
// Async agent runs: authorize, insert a queued run, answer immediately, then
// execute after the response (`after()` in routes), writing progress rows per
// step. Agents poll with `get_run`. The store lives in lib/engine/run-store.ts
// (Convex `generationRuns`); the names below are kept for existing callers.

import type { AgentGenerationOutcome } from "./agent-generation";
import { flushModelTelemetry, withModelTelemetryContext } from "@/lib/ai/model-telemetry";
import {
  createConvexRunStore,
  createMemoryRunStore,
  runStoreFor,
  type RunKind,
  type RunPatch,
  type RunProgress,
  type RunRecord,
  type RunStatus,
  type RunStore,
} from "@/lib/engine/run-store";

export type AgentRunKind = RunKind;
export type AgentRunStatus = RunStatus;
export type AgentRunRecord = RunRecord;
export type AgentRunPatch = RunPatch;
export type AgentRunStore = RunStore;
export type AgentRunProgress = RunProgress;
export const createConvexAgentRunStore = createConvexRunStore;
export const createMemoryAgentRunStore = createMemoryRunStore;
export const agentRunStoreFor = runStoreFor;

/** complete when every planned screen landed, partial when some did, failed when none. */
export function screenSetRunStatus(
  plan: Array<{ id: string }>,
  screens: Array<{ id: string }>,
): { status: AgentRunStatus; missingScreenIds: string[] } {
  const produced = new Set(screens.map((screen) => screen.id));
  const missingScreenIds = plan.map((item) => item.id).filter((id) => !produced.has(id));
  if (screens.length === 0) return { status: "failed", missingScreenIds };
  return { status: missingScreenIds.length > 0 ? "partial" : "complete", missingScreenIds };
}

function statusForOutcome(kind: AgentRunKind, outcome: AgentGenerationOutcome) {
  if (!outcome.ok) {
    return { status: "failed" as const, missingScreenIds: [] as string[] };
  }
  if (kind === "screen-set") {
    const plan = (outcome.body.plan as Array<{ id: string }> | undefined) ?? [];
    const screens = (outcome.body.screens as Array<{ id: string; planId?: string }> | undefined) ?? [];
    return screenSetRunStatus(plan, screens.map((screen) => ({ id: screen.planId ?? screen.id })));
  }
  return { status: "complete" as const, missingScreenIds: [] as string[] };
}

/** Execute a queued run to a terminal status. Never throws. */
export async function executeAgentRun(args: {
  store: AgentRunStore;
  runId: string;
  projectId?: string;
  kind: AgentRunKind;
  execute: (progress: AgentRunProgress) => Promise<AgentGenerationOutcome>;
}): Promise<AgentRunStatus> {
  const { store, runId, kind } = args;
  const progress: AgentRunProgress = async (step, detail) => {
    try {
      await store.update(runId, { step, detail });
    } catch (error) {
      console.warn("[agent-runs] Progress write failed:", error instanceof Error ? error.message : error);
    }
  };

  try {
    await store.update(runId, { status: "running", step: "running" });
    // Every model call in this run is tagged with its runId.
    const outcome = await withModelTelemetryContext({ runId, projectId: args.projectId }, () => args.execute(progress));
    const { status, missingScreenIds } = statusForOutcome(kind, outcome);
    const error = !outcome.ok
      ? String(outcome.body.error ?? "Generation failed")
      : status === "partial"
        ? `Missing screens: ${missingScreenIds.join(", ")}`
        : undefined;
    await store.update(runId, {
      status,
      step: status,
      result: outcome.body,
      missingScreenIds,
      ...(error ? { error } : {}),
    });
    return status;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await store
      .update(runId, { status: "failed", step: "failed", error: message })
      .catch(() => undefined);
    return "failed";
  } finally {
    await flushModelTelemetry();
  }
}

/**
 * Insert a queued run and hand execution to `schedule` (Next `after()` in routes).
 * Returns as soon as the run row exists.
 */
export async function startAgentRun(args: {
  store: AgentRunStore;
  projectId: string;
  kind: AgentRunKind;
  input: Record<string, unknown>;
  execute: (progress: AgentRunProgress) => Promise<AgentGenerationOutcome>;
  schedule: (task: () => Promise<void>) => void;
}): Promise<{ runId: string; status: "queued" }> {
  const runId = await args.store.create({ projectId: args.projectId, kind: args.kind, input: args.input });
  args.schedule(async () => {
    await executeAgentRun({ store: args.store, runId, projectId: args.projectId, kind: args.kind, execute: args.execute });
  });
  return { runId, status: "queued" };
}
