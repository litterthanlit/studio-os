// lib/ai/model-router.ts
// Unified model client via OpenRouter — one SDK, one key, all models.

import OpenAI from "openai";
import { buildModelCallRecord, recordModelCall } from "./model-telemetry";

// ── Model strings ─────────────────────────────────────────────
export const SONNET_4_6 = "anthropic/claude-sonnet-4-6";
export const GEMINI_FLASH = "google/gemini-2.5-flash";
export const KIMI_K25 = "moonshotai/kimi-k2.5";
export const GEMINI_PRO = "google/gemini-2.5-pro";

// ── Per-step model routes (master plan 1.10) ──────────────────
// Call sites ask for a route, never a model string. Each route has an env
// override (MODEL_ROUTE_<NAME>, e.g. MODEL_ROUTE_JUDGE=openai/gpt-5). The judge
// defaults to a different model family from the generator, so evaluation is
// not the generator grading itself.
export type ModelRoute = "perceive" | "measure" | "classify" | "generate" | "variant" | "judge" | "judgeRealtime";

export const MODEL_ROUTES: Readonly<Record<ModelRoute, { model: string; env: string; purpose: string }>> = {
  perceive: { model: SONNET_4_6, env: "MODEL_ROUTE_PERCEIVE", purpose: "Reference perception, taste extraction, composition analysis" },
  measure: { model: GEMINI_FLASH, env: "MODEL_ROUTE_MEASURE", purpose: "Cheap vision measurement (type boxes, token colors)" },
  classify: { model: GEMINI_FLASH, env: "MODEL_ROUTE_CLASSIFY", purpose: "Intent classification and small text utilities" },
  generate: { model: SONNET_4_6, env: "MODEL_ROUTE_GENERATE", purpose: "Base design / screen generation, planning, refine" },
  variant: { model: SONNET_4_6, env: "MODEL_ROUTE_VARIANT", purpose: "Pushed / restructured variant derivation" },
  judge: { model: GEMINI_PRO, env: "MODEL_ROUTE_JUDGE", purpose: "Benchmark taste judging (different family from generate)" },
  judgeRealtime: { model: GEMINI_FLASH, env: "MODEL_ROUTE_JUDGE_REALTIME", purpose: "In-loop scoring (images, realtime taste checks)" },
};

/** The model for a route: env override, else the default. */
export function modelFor(route: ModelRoute): string {
  const entry = MODEL_ROUTES[route];
  const override = process.env[entry.env]?.trim();
  return override || entry.model;
}

/** Provider family of an OpenRouter model id ("anthropic/claude-…" → "anthropic"). */
export function modelFamily(model: string): string {
  return model.split("/")[0] ?? model;
}

// ── Prompt caching ────────────────────────────────────────────
type CacheableTextPart = OpenAI.Chat.Completions.ChatCompletionContentPartText & { cache_control?: { type: "ephemeral" } };

/** Families where OpenRouter honours explicit cache_control breakpoints. */
const EXPLICIT_CACHE_FAMILIES = new Set(["anthropic", "google"]);
/** System prompts at least this long get a cache breakpoint (≈1k tokens, Anthropic's minimum). */
const CACHEABLE_SYSTEM_CHARS = 4000;

/**
 * A stable prefix (schema, grammar, few-shot) followed by the per-request
 * suffix. The prefix carries a cache breakpoint; providers with implicit
 * prefix caching (OpenAI, Gemini) benefit from the ordering alone.
 */
export function cacheablePromptParts(prefix: string, suffix: string): OpenAI.Chat.Completions.ChatCompletionContentPartText[] {
  const head: CacheableTextPart = { type: "text", text: prefix, cache_control: { type: "ephemeral" } };
  return [head, { type: "text", text: suffix }];
}

/**
 * Apply cache hints for the target model: long system prompts get a breakpoint
 * on explicit-cache families; breakpoints are stripped for families that do
 * not take them.
 */
export function withCacheHints<T extends OpenAI.Chat.Completions.ChatCompletionCreateParams>(params: T): T {
  const explicit = EXPLICIT_CACHE_FAMILIES.has(modelFamily(params.model));
  const messages = params.messages.map((message) => {
    if (explicit && message.role === "system" && typeof message.content === "string" && message.content.length >= CACHEABLE_SYSTEM_CHARS) {
      return { ...message, content: [{ type: "text", text: message.content, cache_control: { type: "ephemeral" } } as CacheableTextPart] };
    }
    if (!explicit && Array.isArray(message.content)) {
      return {
        ...message,
        content: (message.content as unknown as Array<Record<string, unknown>>).map((part) =>
          "cache_control" in part ? Object.fromEntries(Object.entries(part).filter(([key]) => key !== "cache_control")) : part,
        ),
      };
    }
    return message;
  });
  return { ...params, messages } as T;
}

export type V6TokenBudgets = {
  baseMaxTokens: number;
  variantMaxTokens: number;
  retryMaxTokens: number;
};

export type ModelFailureInfo = {
  status?: number;
  message: string;
  kind: "credit-exhaustion" | "missing-key" | "model-error";
};

export function getV6TokenBudgets(): V6TokenBudgets {
  return {
    baseMaxTokens: envInt("V6_BASE_MAX_TOKENS", 16000),
    variantMaxTokens: envInt("V6_VARIANT_MAX_TOKENS", 16000),
    retryMaxTokens: envInt("V6_RETRY_MAX_TOKENS", 16000),
  };
}

export function describeModelFailure(error: unknown): ModelFailureInfo {
  const status = readStatus(error);
  const message = error instanceof Error ? error.message : String(error);
  if (status === 402 || /credit|afford|insufficient|quota|balance/i.test(message)) {
    return { status, message, kind: "credit-exhaustion" };
  }
  if (/OPENROUTER_API_KEY/i.test(message)) {
    return { status, message, kind: "missing-key" };
  }
  return { status, message, kind: "model-error" };
}

// ── OpenRouter client ─────────────────────────────────────────
let _router: OpenAI | null = null;

export function getRouter(): OpenAI {
  if (!_router) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY is not configured");
    _router = new OpenAI({
      apiKey,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        "X-Title": process.env.OPENROUTER_APP_TITLE || "Studio OS",
      },
    });
  }
  return _router;
}

/**
 * Proof/test seam: route every model call through a stand-in client (mocked
 * completions). Pass null to restore the real OpenRouter client.
 */
export function setRouterForTesting(router: OpenAI | null): void {
  _router = router;
}

// ── Traced completion ─────────────────────────────────────────
/**
 * chat.completions.create with per-call telemetry: step, model, input/output/
 * cached tokens, latency, finish reason, cost estimate and the current runId
 * (see withModelTelemetryContext). Records are written in batches.
 */
export async function tracedCompletion(
  step: string,
  params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
  options?: { router?: OpenAI; timeout?: number },
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  const startedAt = Date.now();
  try {
    const response = await (options?.router ?? getRouter()).chat.completions.create(
      withCacheHints(params),
      options?.timeout ? { timeout: options.timeout } : undefined,
    );
    recordModelCall(
      buildModelCallRecord({
        step,
        model: response.model || params.model,
        usage: response.usage,
        latencyMs: Date.now() - startedAt,
        finishReason: response.choices?.[0]?.finish_reason ?? null,
      }),
    );
    return response;
  } catch (error) {
    recordModelCall(
      buildModelCallRecord({ step, model: params.model, usage: null, latencyMs: Date.now() - startedAt, error }),
    );
    throw error;
  }
}

/**
 * Streamed variant of tracedCompletion (Live Build, 1.9): forwards each content
 * delta to `onDelta` and resolves to a non-streamed-shaped completion (full
 * content, finish reason, usage) so callers parse and validate it as before.
 */
export async function tracedStreamCompletion(
  step: string,
  params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
  onDelta: (text: string) => void,
  options?: { router?: OpenAI; timeout?: number },
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  const startedAt = Date.now();
  try {
    const stream = await (options?.router ?? getRouter()).chat.completions.create(
      { ...withCacheHints(params), stream: true, stream_options: { include_usage: true } },
      options?.timeout ? { timeout: options.timeout } : undefined,
    );
    // A client that answers with a full completion instead of a stream: one delta.
    if (!(Symbol.asyncIterator in Object(stream))) {
      const completion = stream as unknown as OpenAI.Chat.Completions.ChatCompletion;
      const whole = completion.choices?.[0]?.message?.content ?? "";
      if (whole) onDelta(whole);
      recordModelCall(
        buildModelCallRecord({ step, model: completion.model || params.model, usage: completion.usage, latencyMs: Date.now() - startedAt, finishReason: completion.choices?.[0]?.finish_reason ?? null }),
      );
      return completion;
    }
    let content = "";
    let finishReason: OpenAI.Chat.Completions.ChatCompletion.Choice["finish_reason"] | null = null;
    let usage: OpenAI.Completions.CompletionUsage | undefined;
    let model = params.model;
    for await (const chunk of stream) {
      model = chunk.model || model;
      if (chunk.usage) usage = chunk.usage;
      const choice = chunk.choices?.[0];
      const delta = choice?.delta?.content;
      if (delta) {
        content += delta;
        onDelta(delta);
      }
      if (choice?.finish_reason) finishReason = choice.finish_reason;
    }
    recordModelCall(buildModelCallRecord({ step, model, usage, latencyMs: Date.now() - startedAt, finishReason }));
    return {
      id: `stream-${startedAt}`,
      object: "chat.completion",
      created: Math.floor(startedAt / 1000),
      model,
      usage,
      choices: [{ index: 0, logprobs: null, finish_reason: finishReason ?? "stop", message: { role: "assistant", content, refusal: null } }],
    };
  } catch (error) {
    recordModelCall(buildModelCallRecord({ step, model: params.model, usage: null, latencyMs: Date.now() - startedAt, error }));
    throw error;
  }
}

// ── Convenience caller ────────────────────────────────────────
export async function callModel(options: {
  model: string;
  system?: string;
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
  /** Telemetry step name. */
  step?: string;
}): Promise<string> {
  const { model, system, messages, maxTokens = 2000, temperature = 0.4, jsonMode = false, step = "model.call" } = options;

  const allMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
  if (system) {
    allMessages.push({ role: "system", content: system });
  }
  allMessages.push(...messages);

  const response = await tracedCompletion(step, {
    model,
    messages: allMessages,
    max_tokens: maxTokens,
    temperature,
    ...(jsonMode ? { response_format: { type: "json_object" as const } } : {}),
  });

  return response.choices[0]?.message?.content ?? "";
}

// ── Vision helper ─────────────────────────────────────────────
export function imageUrlBlock(url: string, detail: "auto" | "low" | "high" = "auto") {
  return {
    type: "image_url" as const,
    image_url: { url, detail },
  };
}

function envInt(name: string, fallback: number): number {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function readStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const record = error as { status?: unknown; code?: unknown };
  if (typeof record.status === "number") return record.status;
  if (typeof record.code === "number") return record.code;
  return undefined;
}

// ── Direct OpenAI client (for embeddings only) ───────────────
let _openai: OpenAI | null = null;
export function getOpenAI(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured (needed for embeddings)");
    _openai = new OpenAI({ apiKey });
  }
  return _openai;
}
