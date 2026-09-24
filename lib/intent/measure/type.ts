// lib/intent/measure/type.ts
// Type scale measured from text boxes: the vision model returns text boxes with
// pixel heights under a strict schema; heights are clustered into levels and a
// modular ratio is fitted. Inconsistent measurements are rejected.

import { imageUrlBlock, tracedCompletion, modelFor } from "@/lib/ai/model-router";

export type TextBox = { text?: string; heightPx: number; role?: string };

export type MeasuredTypeScale = {
  /** Cluster sizes (px, ascending). */
  sizes: number[];
  /** Fitted modular ratio between adjacent steps. */
  ratio: number;
  /** Nearest named scale (e.g. 1.333 perfect fourth). */
  named: string;
  /** Mean squared deviation (in steps) of sizes from base · ratio^n. */
  residual: number;
  accepted: boolean;
  confidence: number;
  reason?: string;
};

const NAMED_RATIOS: Array<[number, string]> = [
  [1.067, "minor second"],
  [1.125, "major second"],
  [1.2, "minor third"],
  [1.25, "major third"],
  [1.333, "perfect fourth"],
  [1.414, "augmented fourth"],
  [1.5, "perfect fifth"],
  [1.618, "golden ratio"],
];

const CLUSTER_TOLERANCE = 0.06; // 6% in log space
const MAX_RESIDUAL = 0.01;

function clusterHeights(heights: number[]): number[] {
  const sorted = heights.filter((h) => Number.isFinite(h) && h > 2).sort((a, b) => a - b);
  const clusters: number[][] = [];
  for (const h of sorted) {
    const last = clusters[clusters.length - 1];
    if (last && Math.log(h / last[last.length - 1]!) < CLUSTER_TOLERANCE) last.push(h);
    else clusters.push([h]);
  }
  return clusters.map((c) => {
    const s = [...c].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)]!;
  });
}

function residualFor(sizes: number[], ratio: number): number {
  const base = sizes[0]!;
  const lr = Math.log(ratio);
  const deviations = sizes.map((size) => {
    const steps = Math.log(size / base) / lr;
    return (steps - Math.round(steps)) ** 2;
  });
  return deviations.reduce((s, d) => s + d, 0) / sizes.length;
}

/**
 * Fit the modular ratio: among ratios in [1.06, 1.7] whose residual is within
 * tolerance, take the largest (small ratios trivially fit any sizes with many
 * steps); refine around it.
 */
export function measureTypeScaleFromBoxes(boxes: TextBox[]): MeasuredTypeScale {
  const sizes = clusterHeights(boxes.map((b) => b.heightPx));
  const reject = (reason: string): MeasuredTypeScale => ({ sizes, ratio: 0, named: "unknown", residual: Infinity, accepted: false, confidence: 0, reason });
  if (sizes.length < 3) return reject("fewer than 3 distinct text sizes");

  let bestRatio = 0;
  let bestResidual = Infinity;
  for (let r = 1.7; r >= 1.06; r -= 0.001) {
    const residual = residualFor(sizes, r);
    if (residual <= MAX_RESIDUAL) {
      // local refinement: minimize residual within ±0.04 of the largest fitting ratio
      for (let q = r - 0.04; q <= r + 0.04; q += 0.0005) {
        const rq = residualFor(sizes, q);
        if (rq < bestResidual) {
          bestResidual = rq;
          bestRatio = q;
        }
      }
      break;
    }
  }
  if (!bestRatio) return reject("sizes do not follow a consistent modular scale");

  // Guard against degenerate fits: the steps used must be mostly contiguous.
  const base = sizes[0]!;
  const steps = sizes.map((s) => Math.round(Math.log(s / base) / Math.log(bestRatio)));
  const maxStep = Math.max(...steps);
  if (maxStep > sizes.length * 2 + 1) return reject("fitted scale skips too many steps");

  const named = NAMED_RATIOS.reduce((best, entry) => (Math.abs(entry[0] - bestRatio) < Math.abs(best[0] - bestRatio) ? entry : best));
  const confidence = Math.max(0, Math.min(1, (1 - bestResidual / MAX_RESIDUAL) * Math.min(1, sizes.length / 4)));
  return {
    sizes: sizes.map((s) => Math.round(s * 10) / 10),
    ratio: Math.round(bestRatio * 1000) / 1000,
    named: Math.abs(named[0] - bestRatio) < 0.02 ? named[1] : "custom",
    residual: Math.round(bestResidual * 10000) / 10000,
    accepted: true,
    confidence: Math.round(confidence * 100) / 100,
  };
}

const TYPE_BOX_PROMPT = `Measure the typography in this image. Return ONLY JSON:
{"boxes":[{"text":"first words","heightPx":<number>,"role":"display|heading|subheading|body|caption|label"}]}
Rules:
- One entry per distinct text block (up to 24). heightPx = the CAP HEIGHT of one line in image pixels, measured, not guessed from role.
- Include the smallest body/caption text and the largest display text.
- Do not include logos, icons or text inside photos.`;

/** Vision-model text boxes → measured type scale. Throws only on transport errors. */
export async function measureTypeScale(imageUrl: string): Promise<MeasuredTypeScale & { boxes: TextBox[] }> {
  const response = await tracedCompletion("intent.measure-type", {
    model: modelFor("measure"),
    temperature: 0,
    max_tokens: 1200,
    response_format: { type: "json_object" },
    messages: [{ role: "user", content: [{ type: "text", text: TYPE_BOX_PROMPT }, imageUrlBlock(imageUrl, "high")] }],
  });
  const boxes = parseTextBoxes(response.choices[0]?.message?.content ?? "");
  return { ...measureTypeScaleFromBoxes(boxes), boxes };
}

/** Strict schema: an array of { heightPx: positive number }; anything else is dropped. */
export function parseTextBoxes(raw: string): TextBox[] {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : raw) as { boxes?: unknown };
    if (!Array.isArray(parsed.boxes)) return [];
    return parsed.boxes
      .filter((box): box is Record<string, unknown> => Boolean(box) && typeof box === "object")
      .map((box) => ({
        text: typeof box.text === "string" ? box.text.slice(0, 80) : undefined,
        heightPx: Number(box.heightPx),
        role: typeof box.role === "string" ? box.role : undefined,
      }))
      .filter((box) => Number.isFinite(box.heightPx) && box.heightPx > 0 && box.heightPx < 2000)
      .slice(0, 40);
  } catch {
    return [];
  }
}
