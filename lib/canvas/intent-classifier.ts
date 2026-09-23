// lib/canvas/intent-classifier.ts
// Async intent classification: a small model call returns outputType / businessGoal /
// confidence / alternatives against a closed schema; the word-boundary heuristic in
// `types/intent-profile.ts` is the fallback (no key, model error, invalid output).

import { GEMINI_FLASH, getRouter } from "@/lib/ai/model-router";
import {
  extractIntentProfile,
  INTENT_BUSINESS_GOALS,
  INTENT_OUTPUT_TYPES,
  type IntentAlternative,
  type IntentBusinessGoal,
  type IntentOutputType,
  type IntentProfile,
  type IntentReferenceInput,
} from "@/types/intent-profile";

export type IntentClassification = {
  outputType: IntentOutputType;
  businessGoal: IntentBusinessGoal;
  confidence: number;
  alternatives: IntentAlternative[];
};

export type ClassifyIntentArgs = {
  prompt: string;
  siteType?: string;
  projectBrief?: string;
  references?: IntentReferenceInput[];
  /** Test hook / injection point — replaces the model call. Return null to force the heuristic. */
  classify?: (input: { prompt: string; siteType?: string; projectBrief?: string }) => Promise<unknown>;
  /** Below this model confidence the heuristic reading is kept. */
  minConfidence?: number;
  timeoutMs?: number;
};

const DEFAULT_MIN_CONFIDENCE = 0.55;
const DEFAULT_TIMEOUT_MS = 8_000;

const SYSTEM_PROMPT = `You classify a design request for a UI generation tool. Return ONLY JSON:
{"outputType": one of ${JSON.stringify(INTENT_OUTPUT_TYPES)},
 "businessGoal": one of ${JSON.stringify(INTENT_BUSINESS_GOALS)},
 "confidence": number 0-1,
 "alternatives": [{"outputType": ..., "businessGoal": ..., "confidence": number}] (0-2 items, less likely readings)}
Rules:
- "marketing-site" = landing pages, websites, homepages for any business (a bakery, an app, an event).
- "web-app-ui" = in-product screens used after sign-in (dashboards, admin, settings, tables, inboxes).
- "mobile-app-ui" = native/mobile app screens or flows (iOS, Android, phone app, onboarding/checkout inside an app).
- "component" / "component-gallery" = a single UI component, or a set of components / UI kit.
- businessGoal "app-ui" for app screens; "community" for events, clubs, meetups; "unknown" if unclear.
- Judge meaning, not substrings: "approachable", "apparel", "happy" are not about apps; "networking" is not about a portfolio.`;

function isOutputType(value: unknown): value is IntentOutputType {
  return typeof value === "string" && (INTENT_OUTPUT_TYPES as readonly string[]).includes(value);
}

function isBusinessGoal(value: unknown): value is IntentBusinessGoal {
  return typeof value === "string" && (INTENT_BUSINESS_GOALS as readonly string[]).includes(value);
}

function clampConfidence(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(1, n));
}

/** Validate an untrusted classification (model output or client payload). Null when invalid. */
export function parseIntentClassification(raw: unknown): IntentClassification | null {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value.replace(/^```(?:json)?\s*|\s*```$/g, ""));
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (!isOutputType(record.outputType) || !isBusinessGoal(record.businessGoal)) return null;
  const confidence = clampConfidence(record.confidence);
  if (confidence === null) return null;

  const alternatives: IntentAlternative[] = Array.isArray(record.alternatives)
    ? record.alternatives
        .map((alt): IntentAlternative | null => {
          if (!alt || typeof alt !== "object") return null;
          const a = alt as Record<string, unknown>;
          const altConfidence = clampConfidence(a.confidence);
          if (!isOutputType(a.outputType) || !isBusinessGoal(a.businessGoal) || altConfidence === null) {
            return null;
          }
          return { outputType: a.outputType, businessGoal: a.businessGoal, confidence: altConfidence };
        })
        .filter((alt): alt is IntentAlternative => alt !== null)
        .slice(0, 3)
    : [];

  return { outputType: record.outputType, businessGoal: record.businessGoal, confidence, alternatives };
}

/** Merge a classification into the heuristic profile (keeps content priority, references, tone rules). */
export function applyIntentClassification(
  args: Pick<ClassifyIntentArgs, "prompt" | "siteType" | "projectBrief" | "references">,
  classification: IntentClassification,
): IntentProfile {
  const heuristic = extractIntentProfile(args);
  const { businessGoal } = classification;
  const mustAvoid = [
    businessGoal === "portfolio" ? "pricing section unless explicitly requested" : "",
    businessGoal === "editorial" ? "generic SaaS feature grids" : "",
    businessGoal === "editorial" ? "logo bars and stats rows" : "",
  ].filter(Boolean);
  return {
    ...heuristic,
    outputType: classification.outputType,
    businessGoal,
    mustAvoid,
    copyTone: businessGoal === "editorial" ? "editorial" : businessGoal === "portfolio" ? "personal and specific" : "clear",
    confidence: classification.confidence,
    warnings: businessGoal === "unknown" ? ["Intent is broad; using conservative marketing-site defaults."] : [],
    classifiedBy: "model",
    alternatives: classification.alternatives,
  };
}

async function classifyWithModel(
  input: { prompt: string; siteType?: string; projectBrief?: string },
  timeoutMs: number,
): Promise<unknown> {
  if (!process.env.OPENROUTER_API_KEY) return null;
  const user = [
    `Request: ${input.prompt}`,
    input.siteType && input.siteType !== "auto" ? `Site type hint: ${input.siteType}` : "",
    input.projectBrief ? `Project brief: ${input.projectBrief}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const response = await getRouter().chat.completions.create(
    {
      model: GEMINI_FLASH,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: user.slice(0, 4000) },
      ],
      max_tokens: 300,
      temperature: 0,
      response_format: { type: "json_object" },
    },
    { timeout: timeoutMs },
  );
  return response.choices[0]?.message?.content ?? null;
}

/**
 * Classify intent with the model, falling back to the word-boundary heuristic.
 * Never throws.
 */
export async function classifyIntent(args: ClassifyIntentArgs): Promise<IntentProfile> {
  const input = { prompt: args.prompt, siteType: args.siteType, projectBrief: args.projectBrief };
  const minConfidence = args.minConfidence ?? DEFAULT_MIN_CONFIDENCE;
  try {
    const raw = args.classify
      ? await args.classify(input)
      : await classifyWithModel(input, args.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    const classification = parseIntentClassification(raw);
    if (classification && classification.confidence >= minConfidence) {
      return applyIntentClassification(args, classification);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("[intent-classifier] Model classification failed; using heuristic:", message);
  }
  return extractIntentProfile(args);
}

/**
 * Resolve the intent profile for generation. A pre-computed classification (e.g. the
 * one the editor used to pick screens vs variants) is validated and reused so routing
 * and generation agree; otherwise classify now.
 */
export async function resolveIntentProfile(
  args: ClassifyIntentArgs & { classification?: unknown },
): Promise<IntentProfile> {
  const provided = parseIntentClassification(args.classification);
  if (provided) return applyIntentClassification(args, provided);
  return classifyIntent(args);
}

/**
 * Reference inputs for intent roles: real ids, weights and annotations when the caller
 * has them; otherwise stable positional ids with weights from composition data.
 * Never uses the image URL as an annotation.
 */
export function buildIntentReferences(args: {
  references?: IntentReferenceInput[];
  referenceUrls: string[];
  compositionData?: Array<{ weight: "primary" | "default" | "muted"; referenceIndex: number }>;
}): IntentReferenceInput[] {
  if (Array.isArray(args.references) && args.references.length > 0) {
    return args.references.slice(0, Math.max(args.referenceUrls.length, 1)).map((ref, index) => ({
      id: typeof ref.id === "string" && ref.id ? ref.id.slice(0, 120) : `reference-${index + 1}`,
      weight: ref.weight === "primary" || ref.weight === "muted" ? ref.weight : "default",
      annotation: typeof ref.annotation === "string" ? ref.annotation.slice(0, 500) : undefined,
    }));
  }
  const weightByIndex = new Map(
    (args.compositionData ?? []).map((entry) => [entry.referenceIndex, entry.weight]),
  );
  return args.referenceUrls.map((_url, index) => ({
    id: `reference-${index + 1}`,
    weight: weightByIndex.get(index) ?? "default",
  }));
}
