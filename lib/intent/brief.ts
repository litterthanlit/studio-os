// lib/intent/brief.ts
// The design brief (master plan 1.4): goal and output type (0.2 classifier),
// per-reference roles (explicit > annotation > inferred from perception),
// region roles, constraints, conflicts and at most 3 questions — plus the
// directives the brief implies, each with provenance, and the cache key that
// invalidates derived taste when the brief changes.

import { createHash } from "node:crypto";
import type {
  BriefOutputType,
  BriefReference,
  DesignBrief,
  Provenance,
  ReferenceRole,
} from "@/lib/design-memory/types";
import { inferReferenceRole, type IntentProfile, type IntentReferenceRole } from "@/types/intent-profile";
import { detectConflicts } from "./conflicts";
import type { ReferencePerception } from "./perceive";

export type BriefReferenceInput = {
  id: string;
  weight: "primary" | "default" | "muted";
  annotation?: string;
  /** Roles the designer assigned (role chips). */
  roles?: ReferenceRole[];
  regions?: BriefReference["regions"];
};

export type BriefDraft = Omit<DesignBrief, "id" | "projectId" | "version" | "createdAt">;

export type BriefDirective = {
  dimension: "layout" | "typography" | "color" | "mode" | "imagery" | "components" | "mood" | "density";
  rule: string;
  value: unknown;
  hardness: "hard" | "soft";
  provenance: Provenance;
};

const INTENT_TO_BRIEF_ROLE: Record<IntentReferenceRole, ReferenceRole> = {
  layout: "layout",
  palette: "color",
  typography: "typography",
  mood: "mood",
  imagery: "imagery",
  component: "components",
  interaction: "components",
};

/** Roles inferred from what was perceived and measured. */
export function inferRolesFromPerception(perception?: ReferencePerception): ReferenceRole[] {
  if (!perception) return ["mood"];
  const roles: ReferenceRole[] = [];
  const type = perception.composition?.referenceType;
  if (perception.measured.grid && perception.measured.grid.confidence >= 0.6 && perception.measured.grid.columns >= 2) roles.push("layout");
  if (perception.measured.type?.accepted && perception.measured.type.confidence >= 0.5) roles.push("typography");
  if (type === "photograph") roles.push("imagery");
  if (perception.appUi || type === "screenshot") roles.push("components");
  const accent = perception.measured.palette?.swatches.find((s) => s.role === "accent");
  if (accent && accent.area >= 0.08) roles.push("color");
  return roles.length > 0 ? [...new Set(roles)].slice(0, 2) : ["mood"];
}

export function assignRoles(
  ref: BriefReferenceInput,
  perception?: ReferencePerception,
): { roles: ReferenceRole[]; roleSource: NonNullable<BriefReference["roleSource"]> } {
  if (ref.weight === "muted") return { roles: ["ignore"], roleSource: "explicit" };
  if (ref.roles && ref.roles.length > 0) return { roles: ref.roles, roleSource: "explicit" };
  if (ref.annotation?.trim()) return { roles: [INTENT_TO_BRIEF_ROLE[inferReferenceRole(ref.annotation)]], roleSource: "annotation" };
  return { roles: inferRolesFromPerception(perception), roleSource: "inferred" };
}

function toBriefOutputType(outputType: string): BriefOutputType {
  if (outputType === "component-gallery") return "component";
  return (["marketing-site", "web-app-ui", "mobile-app-ui", "component", "multi-page-site"].includes(outputType)
    ? outputType
    : "marketing-site") as BriefOutputType;
}

export function buildDesignBrief(args: {
  prompt: string;
  intentProfile: IntentProfile;
  references: BriefReferenceInput[];
  perceptions: Record<string, ReferencePerception | undefined>;
  /** Answers to earlier questions (question id → option). */
  answers?: Record<string, string>;
}): BriefDraft {
  const references: BriefReference[] = args.references.map((ref) => {
    const { roles, roleSource } = assignRoles(ref, args.perceptions[ref.id]);
    return {
      assetId: ref.id,
      weight: ref.weight,
      roles,
      roleSource,
      ...(ref.regions && ref.regions.length > 0 ? { regions: ref.regions } : {}),
    };
  });
  const { conflicts, questions } = detectConflicts(
    references.map((ref) => ({ assetId: ref.assetId, weight: ref.weight, roles: ref.roles, perception: args.perceptions[ref.assetId] })),
    args.answers,
  );
  return {
    goal: args.prompt,
    outputType: toBriefOutputType(args.intentProfile.outputType),
    outputTypeConfidence: args.intentProfile.confidence,
    references,
    constraints: [
      ...args.intentProfile.mustInclude.map((item) => `include: ${item}`),
      ...args.intentProfile.mustAvoid.map((item) => `avoid: ${item}`),
    ],
    conflicts,
    questions: questions.map((q) => (args.answers?.[q.id] ? { ...q, answer: args.answers[q.id] } : q)),
  };
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`)
    .join(",")}}`;
}

/**
 * Cache key for taste derived from this brief: everything that changes which
 * references say what. A role, weight, region or answer edit changes the key.
 */
export function briefCacheKey(brief: Pick<BriefDraft, "outputType" | "references" | "conflicts">): string {
  return createHash("sha256")
    .update(
      stableStringify({
        outputType: brief.outputType,
        references: brief.references.map((ref) => ({ id: ref.assetId, weight: ref.weight, roles: ref.roles, regions: ref.regions ?? null })),
        resolutions: brief.conflicts.map((c) => [c.dimension, c.resolution ?? null]),
      }),
    )
    .digest("hex")
    .slice(0, 32);
}

/** The reference that speaks for a role: role owners first (primary before default), never muted. */
function ownerFor(brief: BriefDraft, role: ReferenceRole): BriefReference | undefined {
  const owners = brief.references.filter((ref) => ref.weight !== "muted" && ref.roles.includes(role));
  return owners.find((ref) => ref.weight === "primary") ?? owners[0];
}

/**
 * Directives implied by the brief. Numeric facts come only from measurements
 * of the owning reference; HARD only above a confidence threshold. Muted
 * references never contribute.
 */
export function briefToDirectives(
  brief: BriefDraft,
  perceptions: Record<string, ReferencePerception | undefined>,
): BriefDirective[] {
  const directives: BriefDirective[] = [];
  const layoutRef = ownerFor(brief, "layout");
  const typeRef = ownerFor(brief, "typography");
  const colorRef = ownerFor(brief, "color");

  const grid = layoutRef ? perceptions[layoutRef.assetId]?.measured.grid : null;
  if (layoutRef && grid) {
    directives.push({
      dimension: "layout",
      rule: `Use a ${grid.columns}-column grid with ${grid.gutter}px gutters and ${grid.marginLeft}px outer margins (measured at ${grid.width}px)`,
      value: { columns: grid.columns, gutter: grid.gutter, margin: grid.marginLeft, width: grid.width },
      hardness: grid.confidence >= 0.7 ? "hard" : "soft",
      provenance: { source: "measured", refIds: [layoutRef.assetId], confidence: grid.confidence },
    });
  }
  const type = typeRef ? perceptions[typeRef.assetId]?.measured.type : null;
  if (typeRef && type?.accepted) {
    directives.push({
      dimension: "typography",
      rule: `Type scale ratio ${type.ratio} (${type.named}); sizes step by ×${type.ratio}`,
      value: { ratio: type.ratio, sizes: type.sizes },
      hardness: type.confidence >= 0.6 ? "hard" : "soft",
      provenance: { source: "measured", refIds: [typeRef.assetId], confidence: type.confidence },
    });
  }
  const palette = colorRef ? perceptions[colorRef.assetId]?.measured.palette : null;
  if (colorRef && palette && palette.swatches.length > 0) {
    const byRole = (role: string) => palette.swatches.find((s) => s.role === role);
    const parts = (["background", "surface", "text", "accent"] as const)
      .map((role) => (byRole(role) ? `${role} ${byRole(role)!.hex} (${Math.round(byRole(role)!.area * 100)}%)` : null))
      .filter(Boolean);
    directives.push({
      dimension: "color",
      rule: `Palette measured from ${colorRef.assetId}: ${parts.join(", ")}`,
      value: palette.swatches.map((s) => ({ hex: s.hex, role: s.role, area: s.area })),
      hardness: palette.confidence >= 0.7 ? "hard" : "soft",
      provenance: { source: "measured", refIds: [colorRef.assetId], confidence: palette.confidence },
    });
  }

  const modeConflict = brief.conflicts.find((c) => c.dimension === "mode");
  const modeSource = colorRef ?? ownerFor(brief, "mood") ?? brief.references.find((r) => r.weight === "primary");
  const mode = modeConflict?.resolution ?? (modeSource ? perceptions[modeSource.assetId]?.mode : undefined);
  if (mode && mode !== "unknown") {
    directives.push({
      dimension: "mode",
      rule: `Color mode: ${mode}`,
      value: mode,
      hardness: modeConflict?.resolution ? "hard" : "soft",
      provenance: modeConflict?.resolution
        ? { source: "explicit", confidence: 1 }
        : { source: "measured", refIds: modeSource ? [modeSource.assetId] : [], confidence: 0.8 },
    });
  }

  for (const role of ["imagery", "components", "mood"] as const) {
    const ref = ownerFor(brief, role);
    const perception = ref ? perceptions[ref.assetId] : undefined;
    if (!ref || !perception) continue;
    const dimensionFor: Record<string, string[]> = { imagery: ["imagery"], components: ["components", "controls", "navigation", "data-display", "iconography"], mood: ["mood", "density"] };
    const labels = perception.qualities
      .filter((q) => dimensionFor[role]!.includes(q.dimension) && q.confidence >= 0.5)
      .map((q) => q.label)
      .slice(0, 4);
    if (labels.length === 0) continue;
    directives.push({
      dimension: role,
      rule: `${role} from ${ref.assetId}: ${labels.join("; ")}`,
      value: labels,
      hardness: "soft",
      provenance: { source: "perceived", refIds: [ref.assetId], confidence: 0.6 },
    });
  }
  return directives;
}
