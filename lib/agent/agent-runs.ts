// lib/agent/agent-runs.ts
// Async agent runs: authorize, insert a queued run, answer immediately, then
// execute after the response (`after()` in routes), writing progress rows per
// step. Agents poll with `get_run`. Convex-backed; in-memory only when Convex
// is unreachable (dev auth bypass).

import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { isConvexConfigured } from "@/lib/convex/is-configured";
import { createAgentConvexClient, type AgentConvexAuth } from "./convex-agent-client";
import type { AgentGenerationOutcome } from "./agent-generation";

export type AgentRunKind = "screen" | "screen-set";
export type AgentRunStatus = "queued" | "running" | "complete" | "partial" | "failed";

export type AgentRunRecord = {
  runId: string;
  projectId: string;
  kind: AgentRunKind;
  status: AgentRunStatus;
  progress: Array<{ step: string; at: number; detail?: string }>;
  result: Record<string, unknown> | null;
  error: string | null;
  missingScreenIds: string[];
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
};

export type AgentRunPatch = {
  status?: AgentRunStatus;
  step?: string;
  detail?: string;
  result?: Record<string, unknown>;
  error?: string;
  missingScreenIds?: string[];
};

export interface AgentRunStore {
  create(args: { projectId: string; kind: AgentRunKind; input: Record<string, unknown> }): Promise<string>;
  update(runId: string, patch: AgentRunPatch): Promise<void>;
  get(runId: string): Promise<AgentRunRecord | null>;
}

export type AgentRunProgress = (step: string, detail?: string) => Promise<void>;

const TERMINAL: ReadonlySet<AgentRunStatus> = new Set(["complete", "partial", "failed"]);

function accessArgs(auth: AgentConvexAuth) {
  if (auth.serviceSecret) {
    return {
      serviceSecret: auth.serviceSecret,
      ...(auth.actingUserId ? { actingUserId: auth.actingUserId as Id<"users"> } : {}),
    };
  }
  return {};
}

export function createConvexAgentRunStore(auth: AgentConvexAuth): AgentRunStore {
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
        client.mutation(api.agentRuns.create, {
          projectId: args.projectId as Id<"projects">,
          kind: args.kind,
          input: args.input,
          ...accessArgs(auth),
        }),
      ),
    update: (runId, patch) =>
      withClient(async (client) => {
        await client.mutation(api.agentRuns.update, {
          runId: runId as Id<"agentRuns">,
          ...patch,
          ...accessArgs(auth),
        });
      }),
    get: (runId) =>
      withClient((client) =>
        client.query(api.agentRuns.get, { runId: runId as Id<"agentRuns">, ...accessArgs(auth) }),
      ),
  };
}

const memoryRuns = new Map<string, AgentRunRecord>();

/** Process-local store (dev auth bypass and proofs). Not durable across instances. */
export function createMemoryAgentRunStore(runs: Map<string, AgentRunRecord> = memoryRuns): AgentRunStore {
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
export function agentRunStoreFor(auth: AgentConvexAuth): AgentRunStore {
  const hasCredentials = Boolean(auth.serviceSecret || auth.bearerToken);
  return isConvexConfigured() && hasCredentials ? createConvexAgentRunStore(auth) : createMemoryAgentRunStore();
}

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
    const outcome = await args.execute(progress);
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
    await executeAgentRun({ store: args.store, runId, kind: args.kind, execute: args.execute });
  });
  return { runId, status: "queued" };
}
