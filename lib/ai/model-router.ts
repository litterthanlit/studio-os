// lib/ai/model-router.ts
// Unified model client via OpenRouter — one SDK, one key, all models.

import OpenAI from "openai";

// ── Model strings ─────────────────────────────────────────────
export const SONNET_4_6 = "anthropic/claude-sonnet-4-6";
export const GEMINI_FLASH = "google/gemini-2.5-flash";
export const KIMI_K25 = "moonshotai/kimi-k2.5";

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

// ── Convenience caller ────────────────────────────────────────
export async function callModel(options: {
  model: string;
  system?: string;
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
}): Promise<string> {
  const { model, system, messages, maxTokens = 2000, temperature = 0.4, jsonMode = false } = options;

  const allMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
  if (system) {
    allMessages.push({ role: "system", content: system });
  }
  allMessages.push(...messages);

  const response = await getRouter().chat.completions.create({
    model,
    messages: allMessages,
    max_tokens: maxTokens,
    temperature,
    ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
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
