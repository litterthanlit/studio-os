// lib/taste/preferences.ts
// Preferences learned from design actions (master plan 1.6).
//
// Signals: variant picks, "similar" / "different" section regenerations, edits
// at approve / regenerate / idle boundaries (idle is debounced), and reverts.
// Content edits (copy, image subjects) are separated from taste edits and never
// become preferences. Each taste signal becomes a `proposed` preference with an
// inferred scope (node / screen / project / user); accepted ones feed the
// learned layer of the taste compile (lib/taste/compile.ts).

import { sanitizeKnobPatch } from "@/lib/canvas/design-knobs";
import { densityFromSectionPadding, type TasteEdit } from "@/lib/canvas/taste-edit-tracker";
import type { Preference, PreferenceScopeLevel } from "@/lib/design-memory/types";

export type SignalBase = { id: string; at: number; screenId: string };

export type DesignSignal =
  | (SignalBase & { kind: "variant-pick"; picked: string; rejected: string[] })
  | (SignalBase & { kind: "section-regenerate"; sectionName: string; intent: "similar" | "different" })
  | (SignalBase & { kind: "edits"; boundary: "approve" | "regenerate" | "idle"; edits: TasteEdit[]; nodeIds?: string[] })
  | (SignalBase & { kind: "revert"; dimensions: string[] });

export type PreferenceScope = { level: PreferenceScopeLevel; targetId?: string };

export type PreferenceProposal = {
  dimension: string;
  rule: string;
  value: unknown;
  scope: PreferenceScope;
  eventIds: string[];
  confidence: number;
  origin: Preference["origin"];
};

/** Existing preference rows (any status), possibly from other projects (user scope). */
export type KnownPreference = Pick<Preference, "id" | "dimension" | "value" | "scope" | "status"> & { projectId?: string };

/** Edits that change content, not taste: never learned. */
export const CONTENT_DIMENSIONS = new Set(["copyDensity", "imagerySubject", "text", "content"]);

/** Structural edits that are about one component, not the screen. */
const NODE_LOCAL_DIMENSIONS = new Set(["buttonToTextLink", "imageSizing", "componentChrome", "ctaHierarchy"]);

const KNOB_SECTIONS = new Set(["layout", "typography", "color", "imagery", "components", "content"]);

export function classifyEdit(edit: Pick<TasteEdit, "dimension">): "taste" | "content" {
  return CONTENT_DIMENSIONS.has(edit.dimension) ? "content" : "taste";
}

/** "<siteId>:<name>" — one screen across its breakpoints. */
export function screenIdForArtboard(artboard: { siteId: string; name: string }): string {
  return `${artboard.siteId}:${artboard.name}`;
}

function valueKey(value: unknown): string {
  return JSON.stringify(value);
}

/**
 * Scope from evidence:
 *   node    — a component-local edit on exactly one node
 *   user    — the same preference already exists in another project
 *   project — the same preference already exists on another screen (or at project level)
 *   screen  — otherwise
 */
export function inferScope(args: {
  dimension: string;
  value: unknown;
  screenId: string;
  projectId?: string;
  nodeIds?: string[];
  /** The source edit is component-local (defaults to the dimension's own classification). */
  nodeLocal?: boolean;
  known?: KnownPreference[];
}): PreferenceScope {
  if (args.nodeIds?.length === 1 && (args.nodeLocal ?? NODE_LOCAL_DIMENSIONS.has(args.dimension))) {
    return { level: "node", targetId: args.nodeIds[0] };
  }
  const same = (args.known ?? []).filter(
    (p) => p.status !== "rejected" && p.dimension === args.dimension && valueKey(p.value) === valueKey(args.value),
  );
  if (same.some((p) => p.scope.level === "user" || (p.projectId && args.projectId && p.projectId !== args.projectId))) {
    return { level: "user" };
  }
  if (same.some((p) => p.scope.level === "project" || (p.scope.level === "screen" && p.scope.targetId !== args.screenId))) {
    return { level: "project" };
  }
  return { level: "screen", targetId: args.screenId };
}

type Draft = Omit<PreferenceProposal, "scope" | "eventIds"> & { nodeLocal?: boolean };

/** Taste edit → preference draft (null: content edit or nothing learnable). */
export function draftFromEdit(edit: TasteEdit): Draft[] {
  if (classifyEdit(edit) === "content") return [];
  const confidence = edit.confidence ?? 0.6;
  const suggestion = edit.suggestedOverride && typeof edit.suggestedOverride === "object"
    ? (edit.suggestedOverride as Record<string, unknown>)
    : {};
  switch (edit.dimension) {
    case "headingFont":
      return [{ dimension: "headingFont", rule: `Heading font MUST be: ${edit.after}`, value: String(edit.after), confidence, origin: "human-edit" }];
    case "bodyFont":
      return [{ dimension: "bodyFont", rule: `Body font MUST be: ${edit.after}`, value: String(edit.after), confidence, origin: "human-edit" }];
    case "density": {
      const density = typeof edit.after === "number" ? densityFromSectionPadding(edit.after) : String(edit.after);
      return [{ dimension: "density", rule: `Density: ${density}`, value: density, confidence, origin: "human-edit" }];
    }
    case "palette": {
      const raw = Array.isArray(suggestion.palette) ? suggestion.palette : String(edit.after).split(",");
      const palette = [...new Set(raw.map((c) => String(c).trim().toLowerCase()).filter((c) => /^#[0-9a-f]{3,8}$/.test(c)))].slice(0, 8);
      return palette.length > 0
        ? [{ dimension: "palette", rule: `Primary palette MUST use only: ${palette.join(", ")}`, value: palette, confidence, origin: "human-edit" }]
        : [];
    }
  }
  const drafts: Draft[] = [];
  const knobPatch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(suggestion)) if (KNOB_SECTIONS.has(key)) knobPatch[key] = value;
  const sanitized = sanitizeKnobPatch(knobPatch);
  if (Object.keys(sanitized).length > 0) {
    drafts.push({ dimension: "knobs", rule: edit.description, value: sanitized, confidence, origin: "human-edit", nodeLocal: NODE_LOCAL_DIMENSIONS.has(edit.dimension) });
  }
  for (const avoid of Array.isArray(suggestion.mustAvoid) ? suggestion.mustAvoid : []) {
    if (typeof avoid === "string" && avoid) drafts.push({ dimension: "avoid", rule: `Do NOT ${avoid}`, value: avoid, confidence, origin: "human-edit" });
  }
  if (typeof suggestion.ctaStyle === "string") {
    drafts.push({ dimension: "ctaTone", rule: `CTA tone: ${suggestion.ctaStyle}`, value: suggestion.ctaStyle, confidence, origin: "human-edit", nodeLocal: NODE_LOCAL_DIMENSIONS.has(edit.dimension) });
  }
  return drafts;
}

/** Proposals for one signal (reverts produce none — they retract, see the recorder). */
export function proposalsFromSignal(
  signal: DesignSignal,
  context: { projectId?: string; known?: KnownPreference[] } = {},
): PreferenceProposal[] {
  const scoped = (draft: Draft, nodeIds?: string[]): PreferenceProposal => {
    const { nodeLocal, ...rest } = draft;
    return {
      ...rest,
      scope: inferScope({
        dimension: draft.dimension,
        value: draft.value,
        screenId: signal.screenId,
        projectId: context.projectId,
        nodeIds,
        nodeLocal: Boolean(nodeLocal),
        known: context.known,
      }),
      eventIds: [signal.id],
    };
  };
  switch (signal.kind) {
    case "edits":
      return signal.edits.flatMap((edit) => draftFromEdit(edit).map((draft) => scoped(draft, signal.nodeIds)));
    case "variant-pick":
      if (signal.rejected.length === 0) return [];
      return [scoped({
        dimension: "variantDirection",
        rule: `Prefer the "${signal.picked}" direction over ${signal.rejected.map((r) => `"${r}"`).join(", ")}`,
        value: signal.picked.toLowerCase(),
        confidence: 0.5,
        origin: "variant-pick",
      })];
    case "section-regenerate":
      return [scoped(
        signal.intent === "different"
          ? { dimension: "avoid", rule: `Do NOT repeat the previous "${signal.sectionName}" section approach`, value: `repeat the previous "${signal.sectionName}" section approach`, confidence: 0.4, origin: "inferred" }
          : { dimension: "sectionApproach", rule: `Keep the "${signal.sectionName}" section's structure; vary its content`, value: signal.sectionName, confidence: 0.4, origin: "inferred" },
      )];
    case "revert":
      return [];
  }
}

export type PreferenceRecorderDeps = {
  projectId?: string;
  propose: (proposal: PreferenceProposal) => Promise<unknown>;
  /** Mark an open proposal rejected (a reverted edit). */
  retract: (preferenceId: string) => Promise<unknown>;
  known: () => KnownPreference[];
  idleMs?: number;
  schedule?: (fn: () => void, ms: number) => () => void;
};

/**
 * Stateful recorder. Idle edit signals are debounced per screen (the latest
 * cumulative edit set wins); approve / regenerate boundaries flush at once.
 * An edit that disappears from a later edit set on the same screen is a revert:
 * its open proposal is retracted. Identical proposals are not re-sent.
 */
export function createPreferenceRecorder(deps: PreferenceRecorderDeps) {
  const idleMs = deps.idleMs ?? 4000;
  const schedule = deps.schedule ?? ((fn, ms) => {
    const handle = setTimeout(fn, ms);
    return () => clearTimeout(handle);
  });
  const pending = new Map<string, Extract<DesignSignal, { kind: "edits" }>>();
  const timers = new Map<string, () => void>();
  const sent = new Map<string, Set<string>>(); // screenId → proposal keys already sent
  const lastDimensions = new Map<string, Set<string>>(); // screenId → taste dimensions in the last edit set

  const keyOf = (p: PreferenceProposal) => JSON.stringify([p.dimension, p.scope.level, p.scope.targetId ?? null, p.value]);

  async function send(signal: DesignSignal) {
    const proposals = proposalsFromSignal(signal, { projectId: deps.projectId, known: deps.known() });
    const seen = sent.get(signal.screenId) ?? new Set<string>();
    sent.set(signal.screenId, seen);
    for (const proposal of proposals) {
      const key = keyOf(proposal);
      if (signal.kind === "edits" && seen.has(key)) continue;
      seen.add(key);
      await deps.propose(proposal);
    }
  }

  async function retract(screenId: string, dimensions: string[]) {
    const dims = new Set(dimensions);
    for (const p of deps.known()) {
      if (p.status !== "proposed" || !dims.has(p.dimension)) continue;
      if (p.scope.level === "screen" && p.scope.targetId !== screenId) continue;
      if (p.scope.level === "user" || p.scope.level === "project") continue; // broader evidence stands
      await deps.retract(p.id);
    }
    const seen = sent.get(screenId);
    if (seen) for (const key of [...seen]) if (dims.has(JSON.parse(key)[0])) seen.delete(key);
  }

  async function flushScreen(screenId: string) {
    timers.get(screenId)?.();
    timers.delete(screenId);
    const signal = pending.get(screenId);
    pending.delete(screenId);
    if (signal) await send(signal);
  }

  async function record(signal: DesignSignal): Promise<void> {
    if (signal.kind === "revert") {
      pending.delete(signal.screenId);
      await retract(signal.screenId, signal.dimensions);
      return;
    }
    if (signal.kind !== "edits") {
      await send(signal);
      return;
    }
    const tasteEdits = signal.edits.filter((edit) => classifyEdit(edit) === "taste");
    const dims = new Set(tasteEdits.map((edit) => edit.dimension));
    const previous = lastDimensions.get(signal.screenId);
    lastDimensions.set(signal.screenId, dims);
    const reverted = previous ? [...previous].filter((d) => !dims.has(d)) : [];
    if (reverted.length > 0) {
      const stillProduced = new Set([...dims].flatMap(mappedDimensions));
      const retracted = [...new Set(reverted.flatMap(mappedDimensions))].filter((d) => !stillProduced.has(d));
      if (retracted.length > 0) await retract(signal.screenId, retracted);
    }
    const cleaned = { ...signal, edits: tasteEdits };
    if (signal.boundary === "idle") {
      pending.set(signal.screenId, cleaned);
      timers.get(signal.screenId)?.();
      timers.set(signal.screenId, schedule(() => void flushScreen(signal.screenId), idleMs));
      return;
    }
    pending.set(signal.screenId, cleaned);
    await flushScreen(signal.screenId);
  }

  async function flush(): Promise<void> {
    for (const screenId of [...pending.keys()]) await flushScreen(screenId);
  }

  return { record, flush };
}

/** Preference dimensions an edit dimension can produce (for retraction). */
function mappedDimensions(editDimension: string): string[] {
  if (["headingFont", "bodyFont", "density", "palette"].includes(editDimension)) return [editDimension];
  return ["knobs", "avoid", "ctaTone"];
}
