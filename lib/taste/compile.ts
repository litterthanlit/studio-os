// lib/taste/compile.ts
// Layered taste compile (master plan 1.5). Merges the taste layers —
//   derived (extracted from references) ← explicit (designer overrides) ← learned
//   (accepted preferences in scope) — plus the brief's measured directives into
// the legacy TasteProfile, the DesignKnobVector options and the tokens.
//
// Rules:
// - Every directive carries provenance.
// - HARD numeric directives come only from measured values above
//   HARD_CONFIDENCE (or the designer's explicit overrides). Perceived numeric
//   directives (px sizes, spacing, radii, padding) are SOFT.
// - The archetype is a hint weighted by its confidence, not the ontology.
// - With no measured directives and no learned rules the result is the legacy
//   compile, byte-for-byte (legacy profiles produce unchanged prompt text).
// - Precedence on the same dimension: explicit > learned > measured > perceived.

import {
  compileTasteToDirectives,
  type CompileDirectivesOptions,
  type CompiledDirectives,
  type Directive,
  type FidelityMode,
} from "@/lib/canvas/directive-compiler";
import type { DeepPartial, DesignKnobVector } from "@/lib/canvas/design-knobs";
import type { DesignSystemTokens } from "@/lib/canvas/generate-system";
import type { Preference, Provenance } from "@/lib/design-memory/types";
import type { BriefDirective } from "@/lib/intent/brief";
import type { TasteProfile } from "@/types/taste-profile";

/** Measured values at or above this confidence may be HARD. */
export const HARD_CONFIDENCE = 0.7;

export type LearnedRule = Pick<Preference, "id" | "dimension" | "rule" | "value" | "scope" | "confidence">;

export type TasteScope = { projectId?: string; screenId?: string };

export type LayeredTaste = {
  /** derived + explicit merged (explicit as userOverrides), measured type scale applied. */
  tasteProfile: TasteProfile | null;
  /** The brief's directives (measured + perceived), each with provenance. */
  measured: BriefDirective[];
  /** Accepted preferences in scope. */
  learned: LearnedRule[];
};

type UserOverrides = NonNullable<TasteProfile["userOverrides"]>;

/** Dimensions whose values are numbers (px, ratios): HARD only when measured or explicit. */
const NUMERIC_DIMENSIONS = new Set(["typeScale", "spacingSystem", "cornerRadius", "density", "grid"]);

/** Learned-rule dimensions that map onto an explicit override field (explicit wins). */
const OVERRIDE_FIELDS: Record<string, keyof UserOverrides> = {
  headingFont: "headingFont",
  bodyFont: "bodyFont",
  palette: "palette",
  density: "density",
};

export function inScope(rule: Pick<LearnedRule, "scope">, scope: TasteScope): boolean {
  switch (rule.scope.level) {
    case "user":
      return true;
    case "project":
      return !rule.scope.targetId || rule.scope.targetId === scope.projectId;
    case "screen":
      return Boolean(scope.screenId) && rule.scope.targetId === scope.screenId;
    default:
      // Node-scoped preferences apply to edits of that node, never to generation.
      return false;
  }
}

/** Build the layered input. `explicit` (when given) wins over the derived profile's own overrides. */
export function compileLayeredTaste(args: {
  derived: TasteProfile | null;
  explicit?: UserOverrides | null;
  learned?: LearnedRule[];
  briefDirectives?: BriefDirective[];
  scope?: TasteScope;
}): LayeredTaste {
  const scope = args.scope ?? {};
  const learned = (args.learned ?? []).filter((rule) => inScope(rule, scope));
  const measured = args.briefDirectives ?? [];
  let tasteProfile = args.derived;
  if (tasteProfile && args.explicit) {
    tasteProfile = { ...tasteProfile, userOverrides: { ...tasteProfile.userOverrides, ...args.explicit } };
  }

  // A measured, accepted type scale replaces an approximate one.
  const type = measured.find((d) => d.dimension === "typography" && d.provenance.source === "measured");
  const sizes = (type?.value as { sizes?: number[] } | undefined)?.sizes;
  if (tasteProfile && type && sizes && sizes.length >= 3) {
    const sorted = [...sizes].sort((a, b) => a - b);
    tasteProfile = {
      ...tasteProfile,
      typeScale: { body: Math.round(sorted[0]!), heading: Math.round(sorted[Math.floor(sorted.length / 2)]!), display: Math.round(sorted[sorted.length - 1]!) },
      typeScaleSource: type.provenance.confidence >= HARD_CONFIDENCE ? "measured" : "fallback",
    };
  }
  return { tasteProfile, measured, learned };
}

function isLayered(layered: LayeredTaste): boolean {
  return layered.measured.length > 0 || layered.learned.length > 0;
}

function explicitDimensions(taste: TasteProfile | null): Set<string> {
  const ov = taste?.userOverrides;
  const dims = new Set<string>();
  if (!ov) return dims;
  if (ov.headingFont) dims.add("headingFont");
  if (ov.bodyFont) dims.add("bodyFont");
  if (ov.palette?.length) dims.add("palette");
  if (ov.density) dims.add("density");
  return dims;
}

function measuredToDirective(d: BriefDirective): { directive: Directive; dimension: string; hard: boolean } {
  const dimension =
    d.dimension === "layout" ? "grid"
      : d.dimension === "typography" ? "typeScale"
        : d.dimension === "color" ? "palette"
          : d.dimension === "mode" ? "colorMode"
            : d.dimension;
  const hardEligible = d.provenance.source === "explicit" || (d.provenance.source === "measured" && d.provenance.confidence >= HARD_CONFIDENCE);
  const value = Array.isArray(d.value)
    ? (d.value as unknown[]).map((v) => (typeof v === "string" ? v : typeof v === "object" && v && "hex" in v ? String((v as { hex: string }).hex) : JSON.stringify(v)))
    : typeof d.value === "string" || typeof d.value === "number"
      ? d.value
      : JSON.stringify(d.value);
  return {
    dimension,
    hard: d.hardness === "hard" && hardEligible,
    directive: { dimension, rule: d.rule, value, source: "extracted", provenance: d.provenance },
  };
}

/**
 * Directives for generation. Legacy input (no measured, no learned) → exactly
 * compileTasteToDirectives. Otherwise measured and learned directives replace
 * the perceived ones on their dimension, perceived numeric directives are
 * SOFT, and archetype-derived bans become a SOFT hint.
 */
export function compileLayeredDirectives(
  layered: LayeredTaste,
  fidelityMode: FidelityMode = "balanced",
  options: CompileDirectivesOptions = {},
): CompiledDirectives {
  const base = compileTasteToDirectives(layered.tasteProfile, fidelityMode, options);
  if (!isLayered(layered)) return base;

  const explicit = explicitDimensions(layered.tasteProfile);
  const isExplicit = (d: Directive) => d.provenance?.source === "explicit";
  let hard = [...base.hard];
  let soft = [...base.soft];
  const avoid = [...base.avoid];
  const replace = (dimension: string) => {
    hard = hard.filter((d) => d.dimension !== dimension || isExplicit(d));
    soft = soft.filter((d) => d.dimension !== dimension || isExplicit(d));
  };

  // 1. Perceived numeric directives are never HARD.
  const demoted = hard.filter((d) => NUMERIC_DIMENSIONS.has(d.dimension) && d.provenance?.source !== "measured" && !isExplicit(d));
  hard = hard.filter((d) => !demoted.includes(d));
  soft.push(...demoted);

  // 2. The archetype is a hint.
  const confidence = layered.tasteProfile?.archetypeConfidence ?? 0.5;
  hard = hard.filter((d) => {
    if (d.dimension !== "bannedNodeTypes") return true;
    soft.push({
      ...d,
      rule: `Archetype hint (${layered.tasteProfile?.archetypeMatch ?? "unknown"}, confidence ${confidence.toFixed(2)}): avoid these node types unless the brief needs them: ${(d.value as string[]).join(", ")}`,
      provenance: { source: "perceived", confidence },
    });
    return false;
  });

  // 3. Measured (and brief-perceived) directives replace perceived ones on their dimension.
  for (const d of layered.measured) {
    const { directive, dimension, hard: isHard } = measuredToDirective(d);
    if (explicit.has(dimension)) continue;
    if (d.provenance.source === "measured" || d.provenance.source === "explicit") replace(dimension);
    (isHard ? hard : soft).push(directive);
  }

  // 4. Learned preferences in scope (explicit wins on the same dimension).
  for (const rule of layered.learned) {
    const provenance: Provenance = { source: "learned", preferenceId: rule.id, confidence: rule.confidence };
    const value = typeof rule.value === "string" || typeof rule.value === "number" ? rule.value : JSON.stringify(rule.value);
    if (rule.dimension === "avoid") {
      avoid.push({ dimension: "avoid", rule: `Do NOT ${String(rule.value)}`, value, source: "feedback", provenance });
      continue;
    }
    if (rule.dimension === "knobs") continue; // → knob patch
    const field = OVERRIDE_FIELDS[rule.dimension];
    if (field && explicit.has(rule.dimension)) continue;
    replace(rule.dimension);
    const hardLearned = Boolean(field) && !NUMERIC_DIMENSIONS.has(rule.dimension);
    (hardLearned ? hard : soft).push({ dimension: rule.dimension, rule: rule.rule, value, source: "feedback", provenance });
  }

  return { hard, soft, avoid, fidelityMode };
}

/** deriveDesignKnobs options for a layered taste (legacy → {}; the preset applies fully). */
export function layeredKnobOptions(layered: LayeredTaste | null | undefined): { archetypeWeight?: number; patch?: DeepPartial<DesignKnobVector> } {
  if (!layered || !isLayered(layered)) return {};
  const patch = layered.learned
    .filter((rule) => rule.dimension === "knobs" && rule.value && typeof rule.value === "object")
    .reduce<Record<string, Record<string, unknown>>>((acc, rule) => {
      for (const [section, values] of Object.entries(rule.value as Record<string, Record<string, unknown>>)) {
        acc[section] = { ...acc[section], ...values };
      }
      return acc;
    }, {});
  return {
    archetypeWeight: layered.tasteProfile?.archetypeConfidence ?? 0.5,
    ...(Object.keys(patch).length > 0 ? { patch: patch as DeepPartial<DesignKnobVector> } : {}),
  };
}

/** Tokens with HARD measured colors applied by role (explicit palette overrides stay in directives). */
export function layeredTokens(tokens: DesignSystemTokens, layered: LayeredTaste): DesignSystemTokens {
  const color = layered.measured.find((d) => d.dimension === "color" && d.provenance.source === "measured");
  if (!color || color.hardness !== "hard" || color.provenance.confidence < HARD_CONFIDENCE) return tokens;
  if (explicitDimensions(layered.tasteProfile).has("palette")) return tokens;
  const swatches = (color.value as Array<{ hex: string; role: string }>) ?? [];
  const byRole = (role: string) => swatches.find((s) => s.role === role)?.hex;
  return {
    ...tokens,
    colors: {
      ...tokens.colors,
      ...(byRole("background") ? { background: byRole("background")! } : {}),
      ...(byRole("surface") ? { surface: byRole("surface")! } : {}),
      ...(byRole("text") ? { text: byRole("text")! } : {}),
      ...(byRole("accent") ? { accent: byRole("accent")! } : {}),
    },
  };
}
