// lib/intent/measure/palette.ts
// Palette measured from pixels: k-means in OKLab on a downsampled image, with
// area share per swatch and a role guess (background / surface / text / accent).

import { chroma, deltaE, oklabToRgb, rgbToHex, rgbToOklab, type OKLab } from "./color";
import { decodeImage, type ImageInput, type RawImage } from "./image";

export type PaletteRole = "background" | "surface" | "text" | "accent" | "secondary";

export type MeasuredSwatch = {
  hex: string;
  oklab: OKLab;
  /** Share of sampled pixels, 0–1. */
  area: number;
  role: PaletteRole;
};

export type MeasuredPalette = {
  swatches: MeasuredSwatch[];
  sampleCount: number;
  confidence: number;
};

const SAMPLE_WIDTH = 96;
const MERGE_DELTA_E = 3;
const MIN_AREA = 0.008;

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dist2(a: OKLab, b: OKLab): number {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
}

/** Deterministic k-means++ in OKLab. */
export function kmeansOklab(points: OKLab[], k: number, iterations = 24): Array<{ center: OKLab; count: number }> {
  if (points.length === 0) return [];
  const random = mulberry32(7);
  const centers: OKLab[] = [points[Math.floor(random() * points.length)]!];
  while (centers.length < Math.min(k, points.length)) {
    const weights = points.map((p) => Math.min(...centers.map((c) => dist2(p, c))));
    const total = weights.reduce((sum, w) => sum + w, 0);
    if (total === 0) break;
    let pick = random() * total;
    let index = 0;
    for (; index < weights.length - 1; index++) {
      pick -= weights[index]!;
      if (pick <= 0) break;
    }
    centers.push(points[index]!);
  }

  let assignment = new Array<number>(points.length).fill(0);
  for (let iter = 0; iter < iterations; iter++) {
    const next = points.map((p) => {
      let best = 0;
      let bestD = Infinity;
      centers.forEach((c, i) => {
        const d = dist2(p, c);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      return best;
    });
    const sums = centers.map(() => [0, 0, 0, 0]);
    next.forEach((cluster, i) => {
      const p = points[i]!;
      const s = sums[cluster]!;
      s[0] += p[0];
      s[1] += p[1];
      s[2] += p[2];
      s[3] += 1;
    });
    sums.forEach((s, i) => {
      if (s[3]! > 0) centers[i] = [s[0]! / s[3]!, s[1]! / s[3]!, s[2]! / s[3]!];
    });
    const changed = next.some((cluster, i) => cluster !== assignment[i]);
    assignment = next;
    if (!changed) break;
  }
  const counts = centers.map(() => 0);
  assignment.forEach((cluster) => counts[cluster]!++);
  return centers.map((center, i) => ({ center, count: counts[i]! })).filter((c) => c.count > 0);
}

function mergeClose(clusters: Array<{ center: OKLab; count: number }>) {
  const merged: Array<{ center: OKLab; count: number }> = [];
  for (const cluster of [...clusters].sort((a, b) => b.count - a.count)) {
    const near = merged.find((m) => deltaE(m.center, cluster.center) < MERGE_DELTA_E);
    if (near) {
      const total = near.count + cluster.count;
      near.center = near.center.map((v, i) => (v * near.count + cluster.center[i]! * cluster.count) / total) as OKLab;
      near.count = total;
    } else {
      merged.push({ center: [...cluster.center] as OKLab, count: cluster.count });
    }
  }
  return merged;
}

function assignRoles(swatches: Array<Omit<MeasuredSwatch, "role">>): MeasuredSwatch[] {
  const sorted = [...swatches].sort((a, b) => b.area - a.area);
  const roles = new Map<Omit<MeasuredSwatch, "role">, PaletteRole>();
  const background = sorted[0];
  if (background) roles.set(background, "background");
  const neutrals = sorted.filter((s) => s !== background && chroma(s.oklab) < 0.05);
  if (background) {
    // Text: strong lightness contrast with the background, weighted by how much of it there is.
    const text = [...neutrals]
      .filter((s) => Math.abs(s.oklab[0] - background.oklab[0]) > 0.35)
      .sort(
        (a, b) =>
          Math.abs(b.oklab[0] - background.oklab[0]) * Math.sqrt(b.area) -
          Math.abs(a.oklab[0] - background.oklab[0]) * Math.sqrt(a.area),
      )[0];
    if (text) roles.set(text, "text");
    const surface = neutrals.find((s) => !roles.has(s) && Math.abs(s.oklab[0] - background.oklab[0]) < 0.15);
    if (surface) roles.set(surface, "surface");
  }
  const accent = sorted
    .filter((s) => !roles.has(s) && chroma(s.oklab) >= 0.06)
    .sort((a, b) => chroma(b.oklab) * Math.sqrt(b.area) - chroma(a.oklab) * Math.sqrt(a.area))[0];
  if (accent) roles.set(accent, "accent");
  return sorted.map((s) => ({ ...s, role: roles.get(s) ?? "secondary" }));
}

export function measurePaletteFromPixels(image: RawImage, k = 8): MeasuredPalette {
  const points: OKLab[] = [];
  for (let i = 0; i + 2 < image.data.length; i += 3) {
    points.push(rgbToOklab(image.data[i]!, image.data[i + 1]!, image.data[i + 2]!));
  }
  const clusters = mergeClose(kmeansOklab(points, k)).filter((c) => c.count / points.length >= MIN_AREA);
  const covered = clusters.reduce((sum, c) => sum + c.count, 0) || 1;
  const swatches = clusters.map((c) => ({
    hex: rgbToHex(oklabToRgb(c.center)),
    oklab: c.center.map((v) => Math.round(v * 10000) / 10000) as OKLab,
    area: Math.round((c.count / covered) * 1000) / 1000,
  }));
  const withRoles = assignRoles(swatches);
  // Confidence: how much of the image the palette explains, tempered by fragmentation.
  const confidence = Math.max(0, Math.min(1, (covered / points.length) * (withRoles.length <= 6 ? 1 : 6 / withRoles.length)));
  return { swatches: withRoles, sampleCount: points.length, confidence: Math.round(confidence * 100) / 100 };
}

export async function measurePalette(input: ImageInput, k = 8): Promise<MeasuredPalette> {
  return measurePaletteFromPixels(await decodeImage(input, SAMPLE_WIDTH, "nearest"), k);
}
