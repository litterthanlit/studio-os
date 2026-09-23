// lib/ai/model-telemetry.ts
// Per-call model telemetry: step, model, input/output/cached tokens (from
// `usage`), latency, finish reason, cost estimate and runId. Records buffer in
// memory and flush in batches to a sink (Convex `modelCalls` by default).
// Server-only.

import { AsyncLocalStorage } from "node:async_hooks";
import { after } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { getPublicConvexUrl } from "@/lib/convex/is-configured";
import { estimateModelCostUsd } from "./model-prices";

export type ModelCallRecord = {
  step: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  latencyMs: number;
  finishReason: string | null;
  costUsd: number | null;
  ok: boolean;
  error?: string;
  runId?: string;
  projectId?: string;
  at: number;
};

export type ModelTelemetryContext = { runId?: string; projectId?: string };

export type ModelTelemetrySink = (records: ModelCallRecord[]) => Promise<void>;

const BATCH_SIZE = 20;
const FLUSH_DELAY_MS = 1500;

const contextStore = new AsyncLocalStorage<ModelTelemetryContext>();
let buffer: ModelCallRecord[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let inflight: Promise<void> = Promise.resolve();
let sinkOverride: ModelTelemetrySink | null | undefined;

/** Tag every model call inside `fn` with a run / project id. */
export function withModelTelemetryContext<T>(context: ModelTelemetryContext, fn: () => Promise<T>): Promise<T> {
  const parent = contextStore.getStore() ?? {};
  return contextStore.run({ ...parent, ...context }, fn);
}

export function currentModelTelemetryContext(): ModelTelemetryContext {
  return contextStore.getStore() ?? {};
}

/** Proof/test seam. `null` disables writes; `undefined` restores the default sink. */
export function setModelTelemetrySink(sink: ModelTelemetrySink | null | undefined): void {
  sinkOverride = sink;
}

function convexSink(): ModelTelemetrySink | null {
  const url = getPublicConvexUrl();
  const serviceSecret = process.env.CONVEX_INTERNAL_API_SECRET?.trim();
  if (!url || !serviceSecret || process.env.STUDIO_OS_DISABLE_MODEL_TELEMETRY === "true") return null;
  return async (records) => {
    const client = new ConvexHttpClient(url);
    await client.mutation(anyApi.modelCalls.recordBatch, { records, serviceSecret });
  };
}

function activeSink(): ModelTelemetrySink | null {
  return sinkOverride === undefined ? convexSink() : sinkOverride;
}

/** Normalize an OpenAI-compatible `usage` block. */
export function readUsage(usage: unknown): { inputTokens: number; outputTokens: number; cachedInputTokens: number } {
  const u = (usage ?? {}) as {
    prompt_tokens?: number;
    completion_tokens?: number;
    prompt_tokens_details?: { cached_tokens?: number } | null;
    cache_read_input_tokens?: number;
  };
  const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : 0);
  return {
    inputTokens: num(u.prompt_tokens),
    outputTokens: num(u.completion_tokens),
    cachedInputTokens: num(u.prompt_tokens_details?.cached_tokens) || num(u.cache_read_input_tokens),
  };
}

export function buildModelCallRecord(args: {
  step: string;
  model: string;
  usage: unknown;
  latencyMs: number;
  finishReason?: string | null;
  error?: unknown;
}): ModelCallRecord {
  const usage = readUsage(args.usage);
  const context = currentModelTelemetryContext();
  return {
    step: args.step,
    model: args.model,
    ...usage,
    latencyMs: Math.round(args.latencyMs),
    finishReason: args.finishReason ?? null,
    costUsd: estimateModelCostUsd(args.model, usage),
    ok: !args.error,
    ...(args.error ? { error: (args.error instanceof Error ? args.error.message : String(args.error)).slice(0, 300) } : {}),
    ...(context.runId ? { runId: context.runId } : {}),
    ...(context.projectId ? { projectId: context.projectId } : {}),
    at: Date.now(),
  };
}

export function recordModelCall(record: ModelCallRecord): void {
  buffer.push(record);
  if (buffer.length >= BATCH_SIZE) {
    void flushModelTelemetry();
    return;
  }
  if (!timer) {
    timer = setTimeout(() => void flushModelTelemetry(), FLUSH_DELAY_MS);
    (timer as { unref?: () => void }).unref?.();
    scheduleFlushAfterResponse();
  }
}

/**
 * Serverless functions can freeze before a timer fires: inside a Next request,
 * also flush once the response is sent. Outside a request scope `after()`
 * throws, and the timer / explicit flushes cover it.
 */
function scheduleFlushAfterResponse(): void {
  try {
    after(() => flushModelTelemetry());
  } catch {
    // not in a request scope
  }
}

/** Write buffered records now. Never throws. */
export function flushModelTelemetry(): Promise<void> {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  const batch = buffer;
  buffer = [];
  const sink = activeSink();
  if (batch.length === 0 || !sink) return inflight;
  inflight = inflight.then(() =>
    sink(batch).catch((error) => {
      console.warn("[model-telemetry] Batch write failed:", error instanceof Error ? error.message : error);
    }),
  );
  return inflight;
}

/** Records waiting to be flushed (proofs). */
export function pendingModelCallRecords(): readonly ModelCallRecord[] {
  return buffer;
}
