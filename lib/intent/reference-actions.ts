// lib/intent/reference-actions.ts
// Pure model behind the understanding UI (master plan 1.8): role chips and
// region lasso edits on reference items, the compact perception summary cached
// on a reference for the X-ray overlay, cover-fit geometry between image and
// card coordinates, the Intent Card model (≤ 1 question) and Taste Memory
// sentences. Components stay thin; the proof exercises these directly.

import type { BriefDraft, BriefDirective } from "./brief";
import type { ReferencePerception } from "./perceive";
import type { ReferenceRole } from "@/lib/design-memory/types";

export type BBox = [number, number, number, number];
export type ReferenceRegion = { bbox: BBox; role: ReferenceRole };

/** Chip order = keyboard 1–7. */
export const REFERENCE_ROLES: ReadonlyArray<{ role: ReferenceRole; label: string; key: string }> = [
  { role: "layout", label: "Layout", key: "1" },
  { role: "typography", label: "Type", key: "2" },
  { role: "color", label: "Color", key: "3" },
  { role: "imagery", label: "Imagery", key: "4" },
  { role: "components", label: "Components", key: "5" },
  { role: "mood", label: "Mood", key: "6" },
  { role: "ignore", label: "Ignore", key: "7" },
];

export function roleForKey(key: string): ReferenceRole | null {
  return REFERENCE_ROLES.find((entry) => entry.key === key)?.role ?? null;
}

/** Toggle one role chip. "ignore" is exclusive: it clears the others, and any other role clears it. */
export function toggleReferenceRole(current: ReferenceRole[] | undefined, role: ReferenceRole): ReferenceRole[] {
  const roles = current ?? [];
  if (roles.includes(role)) return roles.filter((r) => r !== role);
  if (role === "ignore") return ["ignore"];
  return [...roles.filter((r) => r !== "ignore"), role];
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

/** Normalize a dragged rectangle (any corner order) to a [x, y, w, h] bbox in 0–1. */
export function normalizeBBox(a: { x: number; y: number }, b: { x: number; y: number }): BBox {
  const x0 = clamp01(Math.min(a.x, b.x));
  const y0 = clamp01(Math.min(a.y, b.y));
  const x1 = clamp01(Math.max(a.x, b.x));
  const y1 = clamp01(Math.max(a.y, b.y));
  const r = (n: number) => Math.round(n * 1000) / 1000;
  return [r(x0), r(y0), r(x1 - x0), r(y1 - y0)];
}

/** Add a lasso region; slivers (< 2% on a side) are ignored. At most 8 regions. */
export function addReferenceRegion(current: ReferenceRegion[] | undefined, bbox: BBox, role: ReferenceRole): ReferenceRegion[] {
  if (bbox[2] < 0.02 || bbox[3] < 0.02) return current ?? [];
  return [...(current ?? []), { bbox, role }].slice(-8);
}

export function removeReferenceRegion(current: ReferenceRegion[] | undefined, index: number): ReferenceRegion[] {
  return (current ?? []).filter((_, i) => i !== index);
}

// ── Cover-fit geometry ────────────────────────────────────────────────────────

/**
 * The image is drawn `object-fit: cover` in the card. Maps between normalized
 * image coordinates (what perception and regions use) and card pixels.
 */
export function coverTransform(natural: { width: number; height: number }, box: { width: number; height: number }) {
  const scale = Math.max(box.width / natural.width, box.height / natural.height);
  const drawnW = natural.width * scale;
  const drawnH = natural.height * scale;
  const offsetX = (box.width - drawnW) / 2;
  const offsetY = (box.height - drawnH) / 2;
  return {
    toCard: (nx: number, ny: number) => ({ x: offsetX + nx * drawnW, y: offsetY + ny * drawnH }),
    toImage: (px: number, py: number) => ({ x: clamp01((px - offsetX) / drawnW), y: clamp01((py - offsetY) / drawnH) }),
    /** Card px per image px at measurement width `measuredWidth`. */
    scaleFor: (measuredWidth: number) => drawnW / measuredWidth,
  };
}

// ── Perception summary (cached on the reference item) ─────────────────────────

export type PerceptionSummary = {
  mode: ReferencePerception["mode"];
  palette: Array<{ hex: string; role: string; area: number }>;
  grid: { columns: number; columnWidth: number; gutter: number; marginLeft: number; marginRight: number; width: number; confidence: number } | null;
  type: { ratio: number; named: string; sizes: number[] } | null;
  keyMoves: Array<{ label: string; dimension: string; bbox: BBox }>;
};

export function summarizePerception(perception: ReferencePerception): PerceptionSummary {
  const grid = perception.measured.grid;
  const type = perception.measured.type;
  return {
    mode: perception.mode,
    palette: (perception.measured.palette?.swatches ?? []).slice(0, 6).map((s) => ({ hex: s.hex, role: s.role, area: Math.round(s.area * 1000) / 1000 })),
    grid: grid
      ? { columns: grid.columns, columnWidth: grid.columnWidth, gutter: grid.gutter, marginLeft: grid.marginLeft, marginRight: grid.marginRight, width: grid.width, confidence: grid.confidence }
      : null,
    type: type?.accepted ? { ratio: type.ratio, named: type.named, sizes: type.sizes.slice(0, 8) } : null,
    keyMoves: perception.qualities
      .filter((q) => q.evidence[0] && q.confidence >= 0.5)
      .slice(0, 5)
      .map((q) => ({ label: q.label, dimension: q.dimension, bbox: q.evidence[0]!.bbox })),
  };
}

/** The X-ray's facts as plain text (the overlay also lists them for screen readers). */
export function xrayFacts(summary: PerceptionSummary): string[] {
  const facts: string[] = [];
  if (summary.grid) {
    facts.push(`${summary.grid.columns}-column grid · ${summary.grid.gutter}px gutter · ${summary.grid.marginLeft}px margins (at ${summary.grid.width}px)`);
  }
  if (summary.type) facts.push(`Type ratio ${summary.type.ratio} (${summary.type.named}) · ${summary.type.sizes.join(" / ")}px`);
  if (summary.palette.length > 0) facts.push(`Palette ${summary.palette.map((s) => `${s.role} ${s.hex} ${Math.round(s.area * 100)}%`).join(", ")}`);
  if (summary.mode !== "unknown") facts.push(`${summary.mode === "dark" ? "Dark" : "Light"} mode`);
  summary.keyMoves.forEach((move, index) => facts.push(`Key move ${index + 1}: ${move.label}`));
  return facts;
}

// ── Intent Card ───────────────────────────────────────────────────────────────

export type IntentCardBrief = Pick<BriefDraft, "references" | "conflicts" | "questions"> & {
  directives: Array<Pick<BriefDirective, "dimension" | "rule" | "provenance">>;
};

export type IntentCardModel = {
  rows: Array<{ id: string; text: string; source: string }>;
  question: { id: string; prompt: string; options: string[] } | null;
};

const ROLE_LABEL: Record<string, string> = { layout: "layout", typography: "type", color: "color", imagery: "imagery", components: "components", mood: "mood" };

/**
 * "UNDERSTOOD": what each reference contributes, what is ignored, and at most
 * one open question. `names` maps reference ids to short display names (A, B…).
 */
export function intentCardModel(brief: IntentCardBrief, names: Record<string, string> = {}): IntentCardModel {
  const name = (id: string) => names[id] ?? id;
  const rows: IntentCardModel["rows"] = [];
  for (const directive of brief.directives.filter((d) => d.provenance.source === "measured" || d.provenance.source === "explicit")) {
    const refs = directive.provenance.refIds ?? [];
    rows.push({
      id: `d-${directive.dimension}`,
      text: directive.rule.replace(/ \(measured at \d+px\)/, ""),
      source: refs.length > 0 ? `from ${refs.map(name).join(", ")}` : directive.provenance.source,
    });
  }
  for (const ref of brief.references) {
    if (ref.roles.includes("ignore")) {
      rows.push({ id: `i-${ref.assetId}`, text: `${name(ref.assetId)} ignored`, source: ref.weight === "muted" ? "muted" : "role" });
    } else if (ref.roleSource === "explicit" || ref.roleSource === "annotation") {
      rows.push({ id: `r-${ref.assetId}`, text: `${ref.roles.map((r) => ROLE_LABEL[r] ?? r).join(" + ")} ← ${name(ref.assetId)}`, source: ref.roleSource });
    }
  }
  const open = brief.questions.find((q) => !q.answer);
  return { rows: rows.slice(0, 8), question: open ? { id: open.id, prompt: open.prompt, options: open.options } : null };
}

// ── Taste Memory ──────────────────────────────────────────────────────────────

export function scopeLabel(scope: { level: string }): string {
  switch (scope.level) {
    case "node":
      return "one element";
    case "screen":
      return "this screen";
    case "project":
      return "this project";
    default:
      return "all projects";
  }
}

/** "Primary palette MUST use only: …" → a sentence with scope and evidence. */
export function preferenceSentence(p: { rule: string; scope: { level: string }; evidence: { count: number } }): string {
  const rule = p.rule.replace(/ MUST /g, " should ").replace(/^Do NOT /, "Avoid: ");
  const edits = p.evidence.count === 1 ? "1 action" : `${p.evidence.count} actions`;
  return `${rule} — ${scopeLabel(p.scope)} · learned from ${edits}`;
}
