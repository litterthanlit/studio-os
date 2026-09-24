// lib/intent/perceive.ts
// Perception of one reference (master plan 1.4): a single labelled vision call
// returns open-vocabulary qualities with evidence bounding boxes, the app-UI
// vocabulary and the legacy CompositionAnalysis (the "derived legacy view"),
// combined with pixel measurements from 1.3 (palette, grid, type scale).

import { SONNET_4_6, tracedCompletion } from "@/lib/ai/model-router";
import { COMPOSITION_SYSTEM_PROMPT, validateCompositionAnalysis } from "@/lib/taste/analyze-composition-core";
import type { AppUiComposition, CompositionAnalysis } from "@/types/composition-analysis";
import { labeledImageBlocks, type LabeledImageRef } from "./labels";
import { measureGrid, type MeasuredGrid } from "./measure/grid";
import { measurePalette, type MeasuredPalette } from "./measure/palette";
import { measureTypeScale, type MeasuredTypeScale } from "./measure/type";

export const PERCEPTION_DIMENSIONS = [
  "layout",
  "typography",
  "color",
  "imagery",
  "components",
  "navigation",
  "density",
  "data-display",
  "controls",
  "iconography",
  "mood",
] as const;
export type PerceptionDimension = (typeof PERCEPTION_DIMENSIONS)[number];

export type PerceivedQuality = {
  dimension: PerceptionDimension;
  /** Open vocabulary, e.g. "oversized serif masthead", "dense data table". */
  label: string;
  /** Normalized [x, y, w, h] in 0–1 image coordinates. */
  evidence: Array<{ bbox: [number, number, number, number] }>;
  confidence: number;
};

export type ReferencePerception = {
  assetId: string;
  composition: CompositionAnalysis | null;
  qualities: PerceivedQuality[];
  appUi?: AppUiComposition;
  measured: {
    palette?: MeasuredPalette;
    grid?: MeasuredGrid | null;
    type?: MeasuredTypeScale | null;
  };
  /** From the measured background lightness (measured beats perceived). */
  mode: "light" | "dark" | "unknown";
  confidence: number;
};

const PERCEPTION_ADDENDUM = `

## Perception (in addition to the CompositionAnalysis)

Return ONE JSON object: {"composition": <CompositionAnalysis>, "qualities": [...], "appUi": {...} | null}
- "qualities": up to 12 of the most important design qualities, open vocabulary:
  {"dimension": one of ${JSON.stringify(PERCEPTION_DIMENSIONS)}, "label": "short specific phrase", "evidence": [{"bbox": [x, y, w, h]}], "confidence": 0-1}
  bbox values are normalized 0–1 image coordinates of where the quality is visible. Every quality needs at least one bbox.
- "appUi": only for product / app screens, otherwise null:
  {"navigationModel": "sidebar"|"tab-bar"|"toolbar"|"command-palette"|"top-bar"|"none",
   "density": "compact"|"comfortable"|"spacious",
   "dataDisplay": ["table"|"cards"|"list"|"chart"|"kanban"|"timeline"|"form"|"detail"],
   "controls": ["buttons"|"segmented"|"toggles"|"inputs"|"selects"|"chips"|"sliders"|"menus"],
   "iconography": "none"|"outline"|"filled"|"duotone"|"emoji"}
The text before the image labels it with its reference id, weight and role; judge the image itself.`;

const NAV = new Set(["sidebar", "tab-bar", "toolbar", "command-palette", "top-bar", "none"]);

function clamp01(n: unknown): number {
  const value = typeof n === "number" ? n : Number(n);
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}

/** Strict parse of the perception JSON; unknown / malformed entries are dropped. */
export function parsePerception(raw: string): Pick<ReferencePerception, "composition" | "qualities" | "appUi"> {
  let parsed: Record<string, unknown> = {};
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(match ? match[0] : raw) as Record<string, unknown>;
  } catch {
    return { composition: null, qualities: [] };
  }
  const compositionRaw = (parsed.composition ?? parsed) as Partial<CompositionAnalysis>;
  const composition = validateCompositionAnalysis(compositionRaw);
  if (composition) composition.analyzedAt = new Date().toISOString();

  const qualities: PerceivedQuality[] = (Array.isArray(parsed.qualities) ? parsed.qualities : [])
    .filter((q): q is Record<string, unknown> => Boolean(q) && typeof q === "object")
    .map((q) => ({
      dimension: q.dimension as PerceptionDimension,
      label: typeof q.label === "string" ? q.label.trim().slice(0, 80) : "",
      evidence: (Array.isArray(q.evidence) ? q.evidence : [])
        .map((e) => (e && typeof e === "object" ? (e as { bbox?: unknown }).bbox : null))
        .filter((bbox): bbox is number[] => Array.isArray(bbox) && bbox.length === 4 && bbox.every((n) => typeof n === "number"))
        .map((bbox) => ({ bbox: bbox.map(clamp01) as [number, number, number, number] })),
      confidence: clamp01(q.confidence),
    }))
    .filter((q) => (PERCEPTION_DIMENSIONS as readonly string[]).includes(q.dimension) && q.label && q.evidence.length > 0)
    .slice(0, 12);

  const app = parsed.appUi as Partial<AppUiComposition> | null | undefined;
  const appUi =
    app && typeof app === "object" && NAV.has(String(app.navigationModel))
      ? {
          navigationModel: app.navigationModel!,
          density: app.density === "compact" || app.density === "spacious" ? app.density : "comfortable",
          dataDisplay: Array.isArray(app.dataDisplay) ? app.dataDisplay.slice(0, 8) : [],
          controls: Array.isArray(app.controls) ? app.controls.slice(0, 8) : [],
          iconography: app.iconography ?? "outline",
        } as AppUiComposition
      : undefined;
  if (composition && appUi) composition.appUi = appUi;
  return { composition, qualities, ...(appUi ? { appUi } : {}) };
}

function modeFromPalette(palette?: MeasuredPalette): ReferencePerception["mode"] {
  const background = palette?.swatches.find((s) => s.role === "background");
  if (!background) return "unknown";
  if (background.oklab[0] < 0.45) return "dark";
  if (background.oklab[0] > 0.6) return "light";
  return "unknown";
}

export type PerceiveDeps = {
  /** Vision call returning the raw perception JSON (default: traced model call). */
  vision?: (ref: LabeledImageRef) => Promise<string>;
  measurePalette?: typeof measurePalette;
  measureGrid?: typeof measureGrid;
  measureType?: (url: string) => Promise<MeasuredTypeScale | null>;
};

async function defaultVision(ref: LabeledImageRef): Promise<string> {
  const response = await tracedCompletion("intent.perceive", {
    model: SONNET_4_6,
    max_tokens: 3500,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: COMPOSITION_SYSTEM_PROMPT + PERCEPTION_ADDENDUM },
      {
        role: "user",
        content: [
          { type: "text", text: "Perceive this reference and return the JSON object." },
          ...labeledImageBlocks([ref], () => "high"),
        ],
      },
    ],
  });
  return response.choices[0]?.message?.content ?? "";
}

/**
 * Perceive one reference. Measurements are local (sharp); the vision call needs
 * a key. Each part fails open, so a reference always yields a perception.
 */
export async function perceiveReference(
  ref: LabeledImageRef,
  options: { measureType?: boolean } = {},
  deps: PerceiveDeps = {},
): Promise<ReferencePerception> {
  const vision = deps.vision ?? (process.env.OPENROUTER_API_KEY ? defaultVision : null);
  const [visionRaw, palette, grid, type] = await Promise.all([
    vision ? vision(ref).catch(() => "") : Promise.resolve(""),
    (deps.measurePalette ?? measurePalette)(ref.url).catch(() => undefined),
    (deps.measureGrid ?? measureGrid)(ref.url).catch(() => null),
    options.measureType
      ? (deps.measureType ?? (process.env.OPENROUTER_API_KEY ? (url: string) => measureTypeScale(url) : async () => null))(ref.url).catch(() => null)
      : Promise.resolve(null),
  ]);
  const perceived = parsePerception(visionRaw);
  const measuredCount = [palette, grid, type].filter(Boolean).length;
  return {
    assetId: ref.id,
    ...perceived,
    measured: { ...(palette ? { palette } : {}), grid: grid ?? null, type: type ?? null },
    mode: modeFromPalette(palette),
    confidence: Math.round(((perceived.composition ? 0.5 : 0) + measuredCount * (0.5 / 3)) * 100) / 100,
  };
}
