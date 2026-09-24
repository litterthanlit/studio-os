// lib/intent/measure/grid.ts
// Column grid measured from a UI screenshot with projection profiles:
//   1. estimate the background (most common quantized color),
//   2. mark "ink" pixels that differ from it,
//   3. split the page into horizontal content bands (runs of rows with ink),
//   4. per band, project ink onto x and read runs (blocks) and gaps (gutters),
//   5. the grid is the band with the most equal-width blocks; the others vote.

import { decodeImage, imageWidth, type ImageInput, type RawImage } from "./image";

export type MeasuredGrid = {
  columns: number;
  columnWidth: number;
  gutter: number;
  marginLeft: number;
  marginRight: number;
  /** Width the measurements refer to (the original image width). */
  width: number;
  /** Share of multi-block bands consistent with the grid, 0–1. */
  confidence: number;
};

const SAMPLE_WIDTH = 720;
const INK_THRESHOLD = 28;

function backgroundColor(image: RawImage): [number, number, number] {
  const counts = new Map<number, number>();
  for (let i = 0; i + 2 < image.data.length; i += 3) {
    const key = ((image.data[i]! >> 3) << 10) | ((image.data[i + 1]! >> 3) << 5) | (image.data[i + 2]! >> 3);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let best = 0;
  let bestCount = -1;
  for (const [key, count] of counts) {
    if (count > bestCount) {
      best = key;
      bestCount = count;
    }
  }
  return [((best >> 10) & 31) * 8 + 4, ((best >> 5) & 31) * 8 + 4, (best & 31) * 8 + 4];
}

function inkMask(image: RawImage): Uint8Array {
  const [br, bg, bb] = backgroundColor(image);
  const mask = new Uint8Array(image.width * image.height);
  for (let p = 0, i = 0; p < mask.length; p++, i += 3) {
    const d = Math.abs(image.data[i]! - br) + Math.abs(image.data[i + 1]! - bg) + Math.abs(image.data[i + 2]! - bb);
    mask[p] = d > INK_THRESHOLD ? 1 : 0;
  }
  return mask;
}

type Run = { start: number; end: number };

function runs(profile: number[], threshold: number, minLength: number): Run[] {
  const out: Run[] = [];
  let start = -1;
  profile.forEach((value, index) => {
    if (value > threshold && start < 0) start = index;
    if ((value <= threshold || index === profile.length - 1) && start >= 0) {
      const end = value > threshold ? index : index - 1;
      if (end - start + 1 >= minLength) out.push({ start, end });
      start = -1;
    }
  });
  return out;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function coefficientOfVariation(values: number[]): number {
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  if (mean === 0) return Infinity;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) / mean;
}

export function measureGridFromPixels(image: RawImage, originalWidth = image.width): MeasuredGrid | null {
  const mask = inkMask(image);
  const { width, height } = image;
  const rowInk = Array.from({ length: height }, (_, y) => {
    let sum = 0;
    for (let x = 0; x < width; x++) sum += mask[y * width + x]!;
    return sum / width;
  });
  const bands = runs(rowInk, 0.002, 3);

  type BandBlocks = { blocks: Run[]; widths: number[]; gaps: number[] };
  const bandBlocks: BandBlocks[] = [];
  for (const band of bands) {
    const colInk = Array.from({ length: width }, (_, x) => {
      let sum = 0;
      for (let y = band.start; y <= band.end; y++) sum += mask[y * width + x]!;
      return sum / (band.end - band.start + 1);
    });
    const blocks = runs(colInk, 0.02, 2);
    if (blocks.length < 2) continue;
    const widths = blocks.map((b) => b.end - b.start + 1);
    const gaps = blocks.slice(1).map((b, i) => b.start - blocks[i]!.end - 1);
    bandBlocks.push({ blocks, widths, gaps });
  }
  if (bandBlocks.length === 0) return null;

  // The grid band: most blocks with near-equal widths and gutters.
  const regular = bandBlocks.filter((b) => coefficientOfVariation(b.widths) < 0.15 && coefficientOfVariation(b.gaps) < 0.35);
  const pool = regular.length > 0 ? regular : bandBlocks;
  const grid = [...pool].sort((a, b) => b.blocks.length - a.blocks.length)[0]!;

  const scale = originalWidth / width;
  const columns = grid.blocks.length;
  const columnWidth = median(grid.widths);
  const gutter = median(grid.gaps);
  const marginLeft = grid.blocks[0]!.start;
  const marginRight = width - 1 - grid.blocks[columns - 1]!.end;

  // Other bands agree when their block edges land on grid column edges.
  const edges = grid.blocks.flatMap((b) => [b.start, b.end]);
  const tolerance = Math.max(2, gutter / 2);
  const agreeing = bandBlocks.filter((band) =>
    band.blocks.every((b) => edges.some((e) => Math.abs(e - b.start) <= tolerance) && edges.some((e) => Math.abs(e - b.end) <= tolerance)),
  ).length;

  return {
    columns,
    columnWidth: Math.round(columnWidth * scale),
    gutter: Math.round(gutter * scale),
    marginLeft: Math.round(marginLeft * scale),
    marginRight: Math.round(marginRight * scale),
    width: originalWidth,
    confidence: Math.round((agreeing / bandBlocks.length) * 100) / 100,
  };
}

export async function measureGrid(input: ImageInput): Promise<MeasuredGrid | null> {
  const [image, width] = await Promise.all([decodeImage(input, SAMPLE_WIDTH), imageWidth(input)]);
  return measureGridFromPixels(image, width || image.width);
}
