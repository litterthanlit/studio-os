// lib/design-memory/types.ts
// Design Memory contracts (master plan Appendix A) and the pure helpers that
// map between them and the legacy TasteProfile / DesignSystemTokens shapes.
// Isomorphic: imported by Convex functions, the server pipeline and proofs.

/**
 * Structural view of the legacy TasteProfile (types/taste-profile.ts). Kept local
 * so this module stays dependency-free for Convex functions.
 */
export type LegacyTasteProfile = {
  summary: string;
  confidence?: number;
  userOverrides?: Record<string, unknown>;
  [key: string]: unknown;
};
type TasteProfile = LegacyTasteProfile;

export type ReferenceRole = "layout" | "typography" | "color" | "mood" | "imagery" | "components" | "ignore";

export type BriefOutputType = "marketing-site" | "web-app-ui" | "mobile-app-ui" | "component" | "multi-page-site";

export type BriefReference = {
  assetId: string;
  weight: "primary" | "default" | "muted";
  roles: ReferenceRole[];
  /** Where the role came from: explicit (designer) > annotation > inferred. */
  roleSource?: "explicit" | "annotation" | "inferred";
  regions?: Array<{ bbox: [number, number, number, number]; role: ReferenceRole }>;
};

export type BriefQuestion = { id: string; prompt: string; options: string[]; answer?: string };

export type DesignBrief = {
  id: string;
  projectId: string;
  version: number;
  createdAt: number;
  goal: string;
  outputType: BriefOutputType;
  outputTypeConfidence: number;
  references: BriefReference[];
  constraints: string[];
  conflicts: Array<{ dimension: string; options: string[]; resolution?: string }>;
  /** At most 3. */
  questions: BriefQuestion[];
};

export type ProvenanceSource = "measured" | "perceived" | "explicit" | "learned" | "fallback";

export type Provenance = {
  source: ProvenanceSource;
  refIds?: string[];
  preferenceId?: string;
  confidence: number;
};

export type TasteLayerKind = "derived" | "explicit" | "learned";

export type TasteLayer = {
  projectId: string;
  kind: TasteLayerKind;
  cacheKey?: string;
  data: unknown;
  provenance: Provenance[];
  updatedAt: number;
};

export type PreferenceScopeLevel = "node" | "screen" | "project" | "user";

export type Preference = {
  id: string;
  ownerId: string;
  projectId?: string;
  dimension: string;
  rule: string;
  value: unknown;
  scope: { level: PreferenceScopeLevel; targetId?: string };
  evidence: { eventIds: string[]; count: number };
  confidence: number;
  status: "proposed" | "accepted" | "rejected";
  origin: "human-edit" | "agent-edit" | "variant-pick" | "inferred";
};

export type GenerationRunKind = "screen" | "screen-set" | "section" | "restyle" | "stress-test" | "benchmark";
export type GenerationRunStatus = "queued" | "running" | "partial" | "complete" | "failed";
export type GenerationRunStep = {
  key: string;
  status: "pending" | "running" | "done" | "failed";
  startedAt?: number;
  endedAt?: number;
  error?: string;
  /** Step output kept so a resumed run skips completed steps. */
  checkpoint?: unknown;
};

export type GenerationRun = {
  id: string;
  projectId: string;
  kind: GenerationRunKind;
  briefId?: string;
  inputHash: string;
  status: GenerationRunStatus;
  steps: GenerationRunStep[];
  outputs: Array<{ kind: "section" | "tree" | "screen"; ref: string; data?: unknown }>;
  missing?: string[];
  costMicros?: number;
  createdAt: number;
  updatedAt: number;
};

export type TokenSet = {
  projectId: string;
  name: string;
  /** Legacy DesignSystemTokens (what generation consumes today). */
  tokens: unknown;
  dtcg?: unknown;
  modes?: unknown;
  updatedAt: number;
};

/** Everything the pipeline reads about a project's design memory in one call. */
export type DesignMemorySnapshot = {
  projectId: string;
  tasteLayers: TasteLayer[];
  tokenSets: TokenSet[];
  brief: DesignBrief | null;
  preferences: Preference[];
};

export const DEFAULT_TOKEN_SET = "default";

// ── Legacy TasteProfile ⇄ layers ──────────────────────────────────────────

/**
 * Split a legacy TasteProfile into the derived layer (what extraction produced)
 * and the explicit layer (the designer's `userOverrides`).
 */
export function splitTasteProfile(profile: TasteProfile): {
  derived: Omit<TasteProfile, "userOverrides">;
  explicit: { userOverrides: NonNullable<TasteProfile["userOverrides"]> } | null;
} {
  const { userOverrides, ...derived } = profile;
  return {
    derived,
    explicit: userOverrides && Object.keys(userOverrides).length > 0 ? { userOverrides } : null,
  };
}

/** Rebuild the legacy TasteProfile from layers (explicit overrides on top of derived). */
export function tasteProfileFromLayers(layers: Array<Pick<TasteLayer, "kind" | "data">>): TasteProfile | null {
  const derived = layers.find((layer) => layer.kind === "derived")?.data as TasteProfile | undefined;
  if (!derived || typeof derived !== "object" || typeof derived.summary !== "string") return null;
  const explicit = layers.find((layer) => layer.kind === "explicit")?.data as
    | { userOverrides?: TasteProfile["userOverrides"] }
    | undefined;
  return explicit?.userOverrides ? { ...derived, userOverrides: explicit.userOverrides } : { ...derived };
}

export type LegacyDesignStateRow = {
  tasteProfile?: unknown;
  designTokens?: unknown;
  tasteUpdatedAt?: number;
  tokensUpdatedAt?: number;
  updatedAt: number;
};

/**
 * Pure migration of a 0.4 `projectDesignState` row into Design Memory writes.
 * Deterministic, so applying it twice yields the same rows (idempotent upserts).
 */
export function migrateLegacyDesignState(row: LegacyDesignStateRow): {
  layers: Array<{ kind: TasteLayerKind; data: unknown; provenance: Provenance[]; updatedAt: number }>;
  tokenSet: { name: string; tokens: unknown; updatedAt: number } | null;
} {
  const layers: Array<{ kind: TasteLayerKind; data: unknown; provenance: Provenance[]; updatedAt: number }> = [];
  const profile = row.tasteProfile as TasteProfile | undefined;
  if (profile && typeof profile === "object" && typeof profile.summary === "string") {
    const { derived, explicit } = splitTasteProfile(profile);
    const at = row.tasteUpdatedAt ?? row.updatedAt;
    layers.push({
      kind: "derived",
      data: derived,
      provenance: [{ source: "perceived", confidence: typeof profile.confidence === "number" ? profile.confidence : 0.5 }],
      updatedAt: at,
    });
    if (explicit) {
      layers.push({ kind: "explicit", data: explicit, provenance: [{ source: "explicit", confidence: 1 }], updatedAt: at });
    }
  }
  const tokenSet =
    row.designTokens && typeof row.designTokens === "object"
      ? { name: DEFAULT_TOKEN_SET, tokens: row.designTokens, updatedAt: row.tokensUpdatedAt ?? row.updatedAt }
      : null;
  return { layers, tokenSet };
}
