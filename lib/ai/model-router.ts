// lib/ai/model-router.ts
// Unified model client via OpenRouter — one SDK, one key, all models.

import OpenAI from "openai";

// ── Model strings ─────────────────────────────────────────────
export const SONNET_4_6 = "anthropic/claude-sonnet-4-6";
export const GEMINI_FLASH = "google/gemini-2.5-flash";
export const KIMI_K25 = "moonshotai/kimi-k2.5";

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
        "HTTP-Referer": "https://studioos.app",
        "X-Title": "Studio OS",
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
