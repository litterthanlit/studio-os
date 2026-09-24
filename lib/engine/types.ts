// lib/engine/types.ts
// One server-side design pipeline for the editor, agents and benchmarks
// (master plan 1.2): resolveAssets → analyzeReferences → buildBrief →
// compileTaste → generate → verify → persist. Every step is idempotent and
// checkpoints into the run, so a failed run resumes from its last good step.

import type { CompositionAnalysis } from "@/types/composition-analysis";
import type { IntentProfile, IntentReferenceInput } from "@/types/intent-profile";
import type { TasteProfile } from "@/types/taste-profile";
import type { FidelityMode } from "@/lib/canvas/directive-compiler";
import type { DesignSystemTokens } from "@/lib/canvas/generate-system";
import type {
  GenerateV6DesignVariantsInput,
  GenerateV6DesignVariantsResult,
} from "@/lib/canvas/generate-design-core";
import type {
  GenerateAppScreenSetInput,
  GenerateAppScreenSetResult,
} from "@/lib/canvas/generate-screen-set-core";
import type { AnalyzeCompositionResult } from "@/lib/taste/analyze-composition-core";
import type { TasteExtractBody, TasteExtractResult } from "@/lib/taste/extract-core";
import type { ReferenceImageAnalysisResult } from "@/lib/canvas/analyze-images-core";
import type { DesignBrief } from "@/lib/design-memory/types";
import type { ClassifyIntentArgs } from "@/lib/canvas/intent-classifier";
import type { RunStore } from "./run-store";

export const ENGINE_STEPS = [
  "resolveAssets",
  "analyzeReferences",
  "buildBrief",
  "compileTaste",
  "generate",
  "verify",
  "persist",
] as const;
export type EngineStepKey = (typeof ENGINE_STEPS)[number];

/** Bump when composition analysis output changes, so cached analyses are recomputed. */
export const ANALYZER_VERSION = "composition-v1";

export type EngineReference = {
  id: string;
  url: string;
  weight: "primary" | "default" | "muted";
  annotation?: string;
  /** SHA-256 of the uploaded bytes when known (file-storage assets). */
  contentHash?: string;
};

export type EngineInput = {
  /** Convex project id (signed in) or the local project slug. */
  projectId: string;
  /** "auto" routes on the brief's output type (app outputs → screen set). */
  mode: "auto" | "screen" | "screen-set";
  /** Who applies the outputs: the editor (client REPLACE_SITE), agents / benchmarks (server). */
  target: "editor" | "agent" | "benchmark";
  prompt: string;
  siteType?: string;
  siteName?: string;
  artboardName?: string;
  fidelityMode?: FidelityMode;
  breakpoint?: "desktop" | "mobile";
  references: EngineReference[];
  /** Request overrides; otherwise the project's design memory, else extraction. */
  tasteProfile?: TasteProfile | null;
  designTokens?: DesignSystemTokens | null;
};

export type ResolvedAsset = EngineReference & { hash: string };

export type ReferenceAnalysisEntry = {
  referenceId: string;
  hash: string;
  referenceIndex: number;
  weight: "primary" | "default" | "muted";
  analysis: CompositionAnalysis;
  cached: boolean;
};

export type BriefCheckpoint = {
  brief: Omit<DesignBrief, "id" | "projectId" | "version" | "createdAt">;
  briefId?: string;
  intentProfile: IntentProfile;
  intentClassification: { outputType: string; businessGoal: string; confidence: number; alternatives: unknown[] };
  kind: "screen" | "screen-set";
  breakpoint: "desktop" | "mobile";
};

export type TasteCheckpoint = {
  tasteProfile: TasteProfile | null;
  designTokens: DesignSystemTokens;
  compositionData: Array<{ analysis: CompositionAnalysis; weight: "primary" | "default" | "muted"; referenceIndex: number }>;
  sources: { tasteProfile: "request" | "project" | "extracted" | "none"; designTokens: "request" | "project" | "derived" | "default" };
};

export type GenerateCheckpoint =
  | { kind: "screen"; result: Extract<GenerateV6DesignVariantsResult, { ok: true }> }
  | { kind: "screen-set"; result: Extract<GenerateAppScreenSetResult, { ok: true }> };

export type VerifyCheckpoint = { ok: boolean; treeCount: number; warnings: string[] };

export type PersistCheckpoint = {
  revision?: number;
  artboardIds?: string[];
  applied?: string[];
  summary?: unknown;
};

export type EngineCheckpoints = {
  resolveAssets?: { assets: ResolvedAsset[] };
  analyzeReferences?: { analyses: ReferenceAnalysisEntry[] };
  buildBrief?: BriefCheckpoint;
  compileTaste?: TasteCheckpoint;
  generate?: GenerateCheckpoint;
  verify?: VerifyCheckpoint;
  persist?: PersistCheckpoint;
};

export type EngineProjectState = {
  tasteProfile: TasteProfile | null;
  designTokens: DesignSystemTokens | null;
};

export type EngineDeps = {
  store: RunStore;
  /** The project's stored taste + tokens (design memory); null when none / signed out. */
  loadProjectState: () => Promise<EngineProjectState | null>;
  /** Reference-analysis cache (design memory); omitted when signed out. */
  analysisCache?: {
    get: (hash: string, analyzerVersion: string) => Promise<CompositionAnalysis | null>;
    save: (hash: string, analyzerVersion: string, analysis: CompositionAnalysis) => Promise<void>;
  };
  saveBrief?: (brief: BriefCheckpoint["brief"]) => Promise<{ briefId: string }>;
  saveDerivedTaste?: (profile: TasteProfile) => Promise<void>;
  analyzeComposition: (url: string) => Promise<AnalyzeCompositionResult>;
  analyzeImages: (urls: string[]) => Promise<ReferenceImageAnalysisResult>;
  extractTaste: (body: TasteExtractBody) => Promise<TasteExtractResult>;
  classifyIntent: (args: ClassifyIntentArgs) => Promise<IntentProfile>;
  generateScreen: (input: GenerateV6DesignVariantsInput) => Promise<GenerateV6DesignVariantsResult>;
  generateScreenSet: (input: GenerateAppScreenSetInput) => Promise<GenerateAppScreenSetResult>;
  /** Server-side canvas write (agents); the editor applies outputs itself. */
  canvas?: {
    /** Already-loaded document for the first write attempt (a newer save then rebases). */
    initialDoc?: { state?: unknown; revision?: number } | null;
    load: () => Promise<{ state?: unknown; revision?: number } | null>;
    save: (payload: { state: unknown; expectedRevision?: number; schemaVersion: number }) => Promise<{ revision: number; unchanged: boolean }>;
  };
};

export type StepContext = {
  runId: string;
  input: EngineInput;
  deps: EngineDeps;
  checkpoints: EngineCheckpoints;
  progress: (step: string, detail?: string) => Promise<void>;
};

export type EngineStep<K extends EngineStepKey> = {
  key: K;
  run: (ctx: StepContext) => Promise<NonNullable<EngineCheckpoints[K]>>;
};

export function intentReferencesFor(assets: ResolvedAsset[]): IntentReferenceInput[] {
  return assets
    .filter((asset) => asset.weight !== "muted")
    .map((asset) => ({ id: asset.id, weight: asset.weight, annotation: asset.annotation }));
}
