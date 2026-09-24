// lib/ai/model-prices.ts
// Cost estimates for model-call telemetry, in USD per 1M tokens. Estimates only:
// OpenRouter list prices at time of writing. Override without a deploy with
// STUDIO_OS_MODEL_PRICES='{"model/id":{"input":3,"output":15,"cachedInput":0.3}}'.

export type ModelPrice = {
  /** USD per 1M uncached input tokens */
  input: number;
  /** USD per 1M output tokens */
  output: number;
  /** USD per 1M cached input tokens (defaults to input) */
  cachedInput?: number;
};

export const MODEL_PRICES: Record<string, ModelPrice> = {
  "anthropic/claude-sonnet-4-6": { input: 3, output: 15, cachedInput: 0.3 },
  "google/gemini-2.5-flash": { input: 0.3, output: 2.5, cachedInput: 0.075 },
  "google/gemini-2.5-pro": { input: 1.25, output: 10, cachedInput: 0.31 },
  "moonshotai/kimi-k2.5": { input: 0.6, output: 2.5, cachedInput: 0.15 },
};

function envOverrides(): Record<string, ModelPrice> {
  const raw = process.env.STUDIO_OS_MODEL_PRICES;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, ModelPrice>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function getModelPrice(model: string): ModelPrice | null {
  return envOverrides()[model] ?? MODEL_PRICES[model] ?? null;
}

/** Estimated USD cost, or null when the model has no price entry. */
export function estimateModelCostUsd(
  model: string,
  usage: { inputTokens: number; outputTokens: number; cachedInputTokens: number },
): number | null {
  const price = getModelPrice(model);
  if (!price) return null;
  const uncached = Math.max(0, usage.inputTokens - usage.cachedInputTokens);
  const cost =
    (uncached * price.input +
      usage.cachedInputTokens * (price.cachedInput ?? price.input) +
      usage.outputTokens * price.output) /
    1_000_000;
  return Math.round(cost * 1e6) / 1e6;
}
