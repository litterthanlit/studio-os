// lib/engine/pipeline.ts
// Runs the design pipeline for one generation run. Steps checkpoint into the
// run (as JSON strings, so deep DesignNode trees never hit Convex's value
// nesting limit); a resumed run skips every step already done. Progress rows
// come only from real step events.

import { createHash } from "node:crypto";
import { currentModelTelemetryContext, flushModelTelemetry, withModelTelemetryContext } from "@/lib/ai/model-telemetry";
import { screenSetRunStatus } from "@/lib/agent/agent-runs";
import type { RunRecord, RunStatus, RunStore } from "./run-store";
import { analyzeReferences } from "./steps/analyzeReferences";
import { buildBrief } from "./steps/buildBrief";
import { compileTaste } from "./steps/compileTaste";
import { generate, GenerationFailedError } from "./steps/generate";
import { persist } from "./steps/persist";
import { resolveAssets } from "./steps/resolveAssets";
import { verify } from "./steps/verify";
import {
  ENGINE_STEPS,
  type EngineCheckpoints,
  type EngineDeps,
  type EngineInput,
  type EngineStep,
  type EngineStepKey,
} from "./types";

const STEPS = [resolveAssets, analyzeReferences, buildBrief, compileTaste, generate, verify, persist] as EngineStep<EngineStepKey>[];

type StoredCheckpoint = { json: string };

function encodeCheckpoint(value: unknown): StoredCheckpoint {
  return { json: JSON.stringify(value) };
}

function decodeCheckpoint(value: unknown): unknown {
  if (value && typeof value === "object" && typeof (value as StoredCheckpoint).json === "string") {
    return JSON.parse((value as StoredCheckpoint).json);
  }
  return undefined;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`)
    .join(",")}}`;
}

export function engineInputHash(input: EngineInput): string {
  return createHash("sha256").update(stableStringify(input)).digest("hex");
}

/** Checkpoints of completed steps, decoded. */
export function checkpointsFromRun(run: Pick<RunRecord, "steps">): EngineCheckpoints {
  const checkpoints: EngineCheckpoints = {};
  for (const step of run.steps ?? []) {
    if (step.status !== "done") continue;
    const decoded = decodeCheckpoint(step.checkpoint);
    if (decoded !== undefined) (checkpoints as Record<string, unknown>)[step.key] = decoded;
  }
  return checkpoints;
}

function designStateSummary(checkpoints: EngineCheckpoints) {
  const taste = checkpoints.compileTaste;
  return {
    tasteSource: taste?.sources.tasteProfile ?? "none",
    tokensSource: taste?.sources.designTokens ?? "default",
    archetype: taste?.tasteProfile?.archetypeMatch ?? null,
  };
}

/** Result body: agents get the canvas summary (as before 1.2); the editor gets the trees to apply. */
export function buildRunResult(input: EngineInput, checkpoints: EngineCheckpoints): Record<string, unknown> {
  const generated = checkpoints.generate!;
  const brief = checkpoints.buildBrief!;
  const taste = checkpoints.compileTaste!;
  const saved = checkpoints.persist ?? {};

  // The editor and benchmarks apply / score the trees themselves.
  if (input.target !== "agent") {
    const payload = {
      kind: generated.kind,
      siteName: generated.result.siteName,
      variants:
        generated.kind === "screen"
          ? generated.result.variants
          : generated.result.screens.map((screen) => ({
              id: screen.id,
              name: screen.name,
              pageTree: screen.pageTree,
              screenRole: screen.screenRole,
              screenPurpose: screen.screenPurpose,
            })),
      generationResult: generated.kind === "screen" ? generated.result.generationResult : "v6-screens",
      v6Debug: generated.kind === "screen" ? generated.result.v6Debug : undefined,
      tasteProfile: taste.tasteProfile,
      designTokens: taste.designTokens,
      sources: taste.sources,
      analyses: (checkpoints.analyzeReferences?.analyses ?? []).map((entry) => ({ referenceId: entry.referenceId, analysis: entry.analysis })),
      intent: brief.intentClassification,
      breakpoint: brief.breakpoint,
      briefId: brief.briefId ?? null,
      warnings: checkpoints.verify?.warnings ?? [],
    };
    return { target: input.target, kind: generated.kind, json: JSON.stringify(payload) };
  }

  if (generated.kind === "screen") {
    const variant = generated.result.variants[0]!;
    return {
      projectId: input.projectId,
      artboardId: saved.artboardIds?.[0] ?? null,
      revision: saved.revision ?? null,
      siteName: generated.result.siteName,
      generationResult: generated.result.generationResult,
      v6Debug: generated.result.v6Debug,
      designState: designStateSummary(checkpoints),
      briefId: brief.briefId ?? null,
      summary: saved.summary ?? null,
      variant: { id: variant.id, name: variant.name, description: variant.description },
    };
  }
  return {
    projectId: input.projectId,
    revision: saved.revision ?? null,
    siteName: generated.result.siteName,
    generationResult: "v6-screens",
    effectiveArchetype: generated.result.effectiveArchetype,
    designState: designStateSummary(checkpoints),
    briefId: brief.briefId ?? null,
    plan: generated.result.plan,
    screens: generated.result.screens.map((screen, index) => ({
      id: saved.artboardIds?.[index] ?? screen.id,
      planId: screen.id,
      name: screen.name,
      screenRole: screen.screenRole,
      screenPurpose: screen.screenPurpose,
    })),
    summary: saved.summary ?? null,
    applied: saved.applied ?? [],
  };
}

export type PipelineOutcome = {
  status: RunStatus;
  result: Record<string, unknown> | null;
  error: string | null;
  failedStep: EngineStepKey | null;
  errorKind: string | null;
  /** Steps executed in this invocation (resumed runs skip completed ones). */
  executed: EngineStepKey[];
};

/**
 * Execute (or resume) a run to a terminal status. Never throws. Checkpoints are
 * read from the store, so calling this again after a failure resumes from the
 * failed step.
 */
export async function executePipeline(args: {
  runId: string;
  input: EngineInput;
  deps: EngineDeps;
}): Promise<PipelineOutcome> {
  const { runId, input, deps } = args;
  const store: RunStore = deps.store;
  const executed: EngineStepKey[] = [];
  const progress = async (step: string, detail?: string) => {
    await store.update(runId, { step, ...(detail ? { detail } : {}) }).catch(() => undefined);
  };

  const existing = await store.get(runId);
  const checkpoints = existing ? checkpointsFromRun(existing) : {};

  // An enclosing run (e.g. an async agent run wrapping this pipeline) keeps its runId on model calls.
  const telemetryRunId = currentModelTelemetryContext().runId ?? runId;
  return withModelTelemetryContext({ runId: telemetryRunId, projectId: input.projectId }, async () => {
    try {
      await store.update(runId, { status: "running", step: existing?.steps?.some((s) => s.status === "done") ? "resumed" : "running" });
      for (const step of STEPS) {
        if ((checkpoints as Record<string, unknown>)[step.key] !== undefined) continue;
        await store.update(runId, { stepKey: step.key, stepStatus: "running" });
        executed.push(step.key);
        try {
          const output = await step.run({ runId, input, deps, checkpoints, progress });
          (checkpoints as Record<string, unknown>)[step.key] = output;
          await store.update(runId, { stepKey: step.key, stepStatus: "done", checkpoint: encodeCheckpoint(output) });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          await store.update(runId, { stepKey: step.key, stepStatus: "failed", error: message });
          throw Object.assign(error instanceof Error ? error : new Error(message), { failedStep: step.key });
        }
      }

      const result = buildRunResult(input, checkpoints);
      const generated = checkpoints.generate!;
      const { status, missingScreenIds } =
        generated.kind === "screen-set"
          ? screenSetRunStatus(generated.result.plan, generated.result.screens)
          : { status: "complete" as const, missingScreenIds: [] as string[] };
      const error = status === "partial" ? `Missing screens: ${missingScreenIds.join(", ")}` : undefined;
      for (const [index, ref] of (generated.kind === "screen"
        ? generated.result.variants.map((variant) => variant.id)
        : generated.result.screens.map((screen) => screen.id)
      ).entries()) {
        await store.update(runId, { output: { kind: generated.kind === "screen" ? "tree" : "screen", ref, data: { index } } }).catch(() => undefined);
      }
      await store.update(runId, { status, step: status, result, missingScreenIds, ...(error ? { error } : {}) });
      return { status, result, error: error ?? null, failedStep: null, errorKind: null, executed };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const failedStep = (error as { failedStep?: EngineStepKey }).failedStep ?? null;
      const errorKind = error instanceof GenerationFailedError ? error.kind : null;
      await store
        .update(runId, {
          status: "failed",
          step: "failed",
          error: message,
          result: { error: message, failedStep, generationResult: errorKind ?? "v6-failed", ...(error instanceof GenerationFailedError && error.debug ? { v6Debug: error.debug } : {}) },
        })
        .catch(() => undefined);
      return { status: "failed", result: null, error: message, failedStep, errorKind, executed };
    } finally {
      await flushModelTelemetry();
    }
  });
}

/** Insert a queued run (step list + input hash) and hand execution to `schedule` (Next `after()`). */
export async function startPipelineRun(args: {
  input: EngineInput;
  deps: EngineDeps;
  schedule: (task: () => Promise<void>) => void;
}): Promise<{ runId: string; status: "queued" }> {
  const { input, deps } = args;
  const runId = await deps.store.create({
    projectId: input.projectId,
    kind: input.mode === "screen-set" ? "screen-set" : "screen",
    input: input as unknown as Record<string, unknown>,
    inputHash: engineInputHash(input),
    stepKeys: [...ENGINE_STEPS],
  });
  args.schedule(async () => {
    await executePipeline({ runId, input, deps });
  });
  return { runId, status: "queued" };
}
