// lib/intent/conflicts.ts
// Conflicts between references on a dimension (mode, density, type scale,
// grid). A conflict is resolved by the reference that owns the dimension's
// role; otherwise it becomes a question (at most 3 per brief).

import type { BriefQuestion, DesignBrief, ReferenceRole } from "@/lib/design-memory/types";
import type { ReferencePerception } from "./perceive";

export type ConflictReference = {
  assetId: string;
  weight: "primary" | "default" | "muted";
  roles: ReferenceRole[];
  perception?: ReferencePerception;
};

export const MAX_QUESTIONS = 3;

type Dimension = { key: string; ownerRole: ReferenceRole; read: (p: ReferencePerception) => string | null; ask: (a: string, b: string, ids: [string, string]) => string };

const DIMENSIONS: Dimension[] = [
  {
    key: "mode",
    ownerRole: "color",
    read: (p) => (p.mode === "unknown" ? null : p.mode),
    ask: (a, b, [x, y]) => `${x} is ${a} and ${y} is ${b} — which mode should the design use?`,
  },
  {
    key: "density",
    ownerRole: "layout",
    read: (p) => p.appUi?.density ?? (p.composition?.density === "sparse" ? "spacious" : p.composition?.density === "rich" ? "compact" : null),
    ask: (a, b, [x, y]) => `${x} is ${a} and ${y} is ${b} — which density?`,
  },
  {
    key: "typeScale",
    ownerRole: "typography",
    read: (p) => (p.measured.type?.accepted ? (p.measured.type.ratio >= 1.4 ? "dramatic" : p.measured.type.ratio >= 1.22 ? "moderate" : "subtle") : null),
    ask: (a, b, [x, y]) => `${x} has a ${a} type scale and ${y} a ${b} one — which should lead?`,
  },
  {
    key: "grid",
    ownerRole: "layout",
    read: (p) => (p.measured.grid && p.measured.grid.confidence >= 0.6 ? (p.measured.grid.columns >= 8 ? "dense grid" : "open grid") : null),
    ask: (a, b, [x, y]) => `${x} uses a ${a} and ${y} an ${b} — which layout?`,
  },
];

/**
 * Conflicts are checked among primary references when there are two or more,
 * otherwise among all non-muted references. Muted references never count.
 */
export function detectConflicts(
  refs: ConflictReference[],
  answers: Record<string, string> = {},
): { conflicts: DesignBrief["conflicts"]; questions: BriefQuestion[] } {
  const active = refs.filter((ref) => ref.weight !== "muted" && ref.perception);
  const primaries = active.filter((ref) => ref.weight === "primary");
  const pool = primaries.length >= 2 ? primaries : active;

  const conflicts: DesignBrief["conflicts"] = [];
  const questions: BriefQuestion[] = [];
  for (const dimension of DIMENSIONS) {
    const readings = pool
      .map((ref) => ({ ref, value: dimension.read(ref.perception!) }))
      .filter((r): r is { ref: ConflictReference; value: string } => r.value !== null);
    const values = [...new Set(readings.map((r) => r.value))];
    if (values.length < 2) continue;

    const owner = active.find((ref) => ref.roles.includes(dimension.ownerRole));
    const ownerValue = owner?.perception ? dimension.read(owner.perception) : null;
    const questionId = `conflict-${dimension.key}`;
    const answer = answers[questionId];
    const resolution = answer ?? ownerValue ?? undefined;
    conflicts.push({ dimension: dimension.key, options: values, ...(resolution ? { resolution } : {}) });

    if (!resolution && questions.length < MAX_QUESTIONS) {
      const first = readings.find((r) => r.value === values[0])!;
      const second = readings.find((r) => r.value === values[1])!;
      questions.push({ id: questionId, prompt: dimension.ask(values[0]!, values[1]!, [first.ref.assetId, second.ref.assetId]), options: values });
    }
  }
  return { conflicts, questions };
}
