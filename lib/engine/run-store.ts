// lib/engine/run-store.ts
// Generation run store (Convex `generationRuns`; in-memory under the dev auth
// bypass and in proofs). Runs carry step checkpoints, progress events and
// outputs so the pipeline can resume and the editor can render real progress.

import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { isConvexConfigured } from "@/lib/convex/is-configured";
import { createAgentConvexClient, type AgentConvexAuth } from "@/lib/agent/convex-agent-client";

export type RunKind = "screen" | "screen-set" | "section" | "restyle" | "stress-test" | "benchmark";
export type RunStatus = "queued" | "running" | "complete" | "partial" | "failed";

export type RunRecord = {
  runId: string;
  projectId: string;
  kind: RunKind;
  status: RunStatus;
  progress: Array<{ step: string; at: number; detail?: string }>;
  /** Step checkpoints: completed steps are skipped when a run resumes. */
  steps: RunStep[];
  /** Partial / final outputs (e.g. sections as they land, trees, screens). */
  outputs: Array<{ kind: string; ref: string; data?: unknown }>;
  inputHash: string;
  input: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
  error: string | null;
  missingScreenIds: string[];
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
};

export type RunStep = {
  key: string;
  status: "pending" | "running" | "done" | "failed";
  startedAt?: number;
  endedAt?: number;
  error?: string;
  checkpoint?: unknown;
};

export type RunPatch = {
  status?: RunStatus;
  stepKey?: string;
  stepStatus?: RunStep["status"];
  checkpoint?: unknown;
  output?: { kind: string; ref: string; data?: unknown };
  step?: string;
  detail?: string;
  result?: Record<string, unknown>;
  error?: string;
  missingScreenIds?: string[];
};

export interface RunStore {
  create(args: {
    projectId: string;
    kind: RunKind;
    input: Record<string, unknown>;
    inputHash?: string;
    stepKeys?: string[];
  }): Promise<string>;
  update(runId: string, patch: RunPatch): Promise<void>;
  get(runId: string): Promise<RunRecord | null>;
}

export type RunProgress = (step: string, detail?: string) => Promise<void>;

const TERMINAL: ReadonlySet<RunStatus> = new Set(["complete", "partial", "failed"]);

function accessArgs(auth: AgentConvexAuth) {
  if (auth.serviceSecret) {
    return {
      serviceSecret: auth.serviceSecret,
      ...(auth.actingUserId ? { actingUserId: auth.actingUserId as Id<"users"> } : {}),
    };
  }
  return {};
}

export function createConvexRunStore(auth: AgentConvexAuth): RunStore {
  const withClient = async <T>(fn: (client: NonNullable<ReturnType<typeof createAgentConvexClient>>) => Promise<T>) => {
    const client = createAgentConvexClient(auth);
    if (!client) throw new Error("Convex is not configured");
    try {
      return await fn(client);
    } finally {
      client.clearAuth();
    }
  };
  return {
    create: (args) =>
      withClient((client) =>
        client.mutation(api.generationRuns.create, {
          projectId: args.projectId as Id<"projects">,
          kind: args.kind,
          input: args.input,
          ...(args.inputHash ? { inputHash: args.inputHash } : {}),
          ...(args.stepKeys ? { stepKeys: args.stepKeys } : {}),
          ...accessArgs(auth),
        }),
      ),
    update: (runId, patch) =>
      withClient(async (client) => {
        await client.mutation(api.generationRuns.update, {
          runId: runId as Id<"generationRuns">,
          ...patch,
          ...accessArgs(auth),
        });
      }),
    get: (runId) =>
      withClient((client) =>
        client.query(api.generationRuns.get, { runId: runId as Id<"generationRuns">, ...accessArgs(auth) }),
      ),
  };
}

function applyStepPatch(steps: RunStep[], patch: RunPatch, time: number): RunStep[] {
  if (!patch.stepKey || !patch.stepStatus) return steps;
  const list = steps.some((step) => step.key === patch.stepKey)
    ? steps
    : [...steps, { key: patch.stepKey, status: "pending" as const }];
  return list.map((step) =>
    step.key !== patch.stepKey
      ? step
      : {
          ...step,
          status: patch.stepStatus!,
          ...(patch.stepStatus === "running" ? { startedAt: time } : {}),
          ...(patch.stepStatus === "done" || patch.stepStatus === "failed" ? { endedAt: time } : {}),
          ...(patch.checkpoint !== undefined ? { checkpoint: patch.checkpoint } : {}),
          ...(patch.stepStatus === "failed" && patch.error ? { error: patch.error } : {}),
        },
  );
}

const memoryRuns = new Map<string, RunRecord>();

/** Process-local store (dev auth bypass and proofs). Not durable across instances. */
export function createMemoryRunStore(runs: Map<string, RunRecord> = memoryRuns): RunStore {
  let counter = 0;
  return {
    async create(args) {
      const time = Date.now();
      const runId = `run_mem_${time.toString(36)}_${(counter++).toString(36)}`;
      runs.set(runId, {
        runId,
        projectId: args.projectId,
        kind: args.kind,
        status: "queued",
        progress: [{ step: "queued", at: time }],
        steps: (args.stepKeys ?? []).map((key) => ({ key, status: "pending" as const })),
        outputs: [],
        inputHash: args.inputHash ?? "",
        input: args.input,
        result: null,
        error: null,
        missingScreenIds: [],
        createdAt: time,
        updatedAt: time,
        completedAt: null,
      });
      return runId;
    },
    async update(runId, patch) {
      const run = runs.get(runId);
      if (!run) throw new Error("RUN_NOT_FOUND");
      const time = Date.now();
      runs.set(runId, {
        ...run,
        status: patch.status ?? run.status,
        progress: patch.step
          ? [...run.progress, { step: patch.step, at: time, ...(patch.detail ? { detail: patch.detail } : {}) }]
          : run.progress,
        steps: applyStepPatch(run.steps, patch, time),
        outputs: patch.output
          ? [...run.outputs.filter((output) => output.ref !== patch.output!.ref), patch.output].slice(-60)
          : run.outputs,
        result: patch.result ?? run.result,
        error: patch.error ?? run.error,
        missingScreenIds: patch.missingScreenIds ?? run.missingScreenIds,
        updatedAt: time,
        completedAt: patch.status && TERMINAL.has(patch.status) ? time : run.completedAt,
      });
    },
    async get(runId) {
      return runs.get(runId) ?? null;
    },
  };
}

/** Convex when reachable with credentials; process memory under the dev auth bypass. */
export function runStoreFor(auth: AgentConvexAuth): RunStore {
  const hasCredentials = Boolean(auth.serviceSecret || auth.bearerToken);
  return isConvexConfigured() && hasCredentials ? createConvexRunStore(auth) : createMemoryRunStore();
}

