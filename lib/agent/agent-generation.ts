// lib/agent/agent-generation.ts
// Agent screen / screen-set generation. Since master plan 1.2 this is a thin
// entrypoint into the shared engine pipeline (lib/engine): the canvas's
// references become the run's references, taste and tokens resolve request →
// project design memory → extraction, and the persist step writes the canvas
// (rebasing on revision conflicts).

import type { Id } from "@/convex/_generated/dataModel";
import { normalizeRemoteCanvasState } from "@/lib/canvas/canvas-convex-sync";
import type { FidelityMode } from "@/lib/canvas/directive-compiler";
import {
  generateV6DesignVariants,
  type GenerateV6DesignVariantsInput,
  type GenerateV6DesignVariantsResult,
} from "@/lib/canvas/generate-design-core";
import {
  generateAppScreenSet,
  type GenerateAppScreenSetInput,
  type GenerateAppScreenSetResult,
} from "@/lib/canvas/generate-screen-set-core";
import type { DesignSystemTokens } from "@/lib/canvas/generate-system";
import type { ReferenceItem, UnifiedCanvasState } from "@/lib/canvas/unified-canvas-state";
import { getEffectiveReferenceWeight } from "@/lib/canvas/unified-canvas-state";
import { createEngineDeps } from "@/lib/engine/deps";
import { executePipeline, engineInputHash } from "@/lib/engine/pipeline";
import { createMemoryRunStore, type RunPatch, type RunStore } from "@/lib/engine/run-store";
import { ENGINE_STEPS, type EngineDeps, type EngineInput, type EngineReference } from "@/lib/engine/types";
import { engineReferencesFromItems } from "@/lib/engine/references";
import type { TasteProfile } from "@/types/taste-profile";
import type { IntentReferenceInput } from "@/types/intent-profile";
import { resolveAgentDesignState } from "./agent-design-state";
import {
  agentLoadCanvas,
  agentLoadDesignState,
  agentSaveCanvas,
  type AgentConvexAuth,
} from "./convex-agent-client";

type CanvasDoc = { state?: unknown; revision?: number } | null;

export type AgentGenerationDeps = {
  loadCanvas: (auth: AgentConvexAuth, projectId: Id<"projects">) => Promise<CanvasDoc>;
  saveCanvas: typeof agentSaveCanvas;
  loadDesignState: typeof agentLoadDesignState;
  generateScreen: (input: GenerateV6DesignVariantsInput) => Promise<GenerateV6DesignVariantsResult>;
  generateScreenSet: (input: GenerateAppScreenSetInput) => Promise<GenerateAppScreenSetResult>;
  /** Further engine dependency overrides (proofs, benchmarks). */
  engine?: Partial<EngineDeps>;
};

export const defaultAgentGenerationDeps: AgentGenerationDeps = {
  loadCanvas: agentLoadCanvas,
  saveCanvas: agentSaveCanvas,
  loadDesignState: agentLoadDesignState,
  generateScreen: generateV6DesignVariants,
  generateScreenSet: generateAppScreenSet,
};

export type AgentGenerationOutcome = {
  ok: boolean;
  status: number;
  body: Record<string, unknown>;
};

export type AgentGenerateScreenInput = {
  auth: AgentConvexAuth;
  projectId: Id<"projects">;
  prompt: string;
  breakpoint?: "desktop" | "mobile";
  name?: string;
  fidelityMode?: FidelityMode;
  tasteProfile?: TasteProfile | null;
  designTokens?: DesignSystemTokens | null;
  /** Progress rows for async runs. */
  onProgress?: (step: string, detail?: string) => void | Promise<void>;
};

export type AgentGenerateScreenSetInput = Omit<AgentGenerateScreenInput, "name">;

function nonMutedReferences(state: UnifiedCanvasState): ReferenceItem[] {
  return state.items
    .filter((item): item is ReferenceItem => item.kind === "reference" && Boolean(item.imageUrl))
    .filter((item) => getEffectiveReferenceWeight(item) !== "muted")
    .sort(
      (a, b) =>
        (getEffectiveReferenceWeight(a) === "primary" ? 0 : 1) -
        (getEffectiveReferenceWeight(b) === "primary" ? 0 : 1),
    );
}

/** Non-muted references, primary first — the same ordering the editor sends. */
export function extractReferenceInputs(state: UnifiedCanvasState): {
  referenceUrls: string[];
  references: IntentReferenceInput[];
} {
  const refs = nonMutedReferences(state);
  return {
    referenceUrls: refs.map((ref) => ref.imageUrl),
    references: refs.map((ref) => ({
      id: ref.id,
      weight: getEffectiveReferenceWeight(ref),
      annotation: ref.annotation?.trim() || undefined,
    })),
  };
}

/** Canvas references as engine references (the editor builds its list with the same helper). */
export function engineReferencesFromCanvas(state: UnifiedCanvasState): EngineReference[] {
  return engineReferencesFromItems(state.items.filter((item): item is ReferenceItem => item.kind === "reference"));
}

/** Progress events worth forwarding to an enclosing run (terminal / status rows are its own). */
const STATUS_ROWS = new Set(["queued", "running", "resumed", "complete", "partial", "failed"]);

function forwardingStore(inner: RunStore, onProgress?: AgentGenerateScreenInput["onProgress"]): RunStore {
  if (!onProgress) return inner;
  return {
    ...inner,
    update: async (runId: string, patch: RunPatch) => {
      await inner.update(runId, patch);
      if (patch.step && !STATUS_ROWS.has(patch.step)) await onProgress(patch.step, patch.detail);
    },
  };
}

async function runAgentPipeline(
  input: AgentGenerateScreenInput,
  mode: "screen" | "screen-set",
  deps: AgentGenerationDeps,
): Promise<AgentGenerationOutcome> {
  const doc = await deps.loadCanvas(input.auth, input.projectId);
  const state = normalizeRemoteCanvasState(doc?.state ?? null);

  const engineInput: EngineInput = {
    projectId: input.projectId,
    mode,
    target: "agent",
    prompt: input.prompt,
    ...(input.name ? { artboardName: input.name, siteName: input.name } : {}),
    fidelityMode: input.fidelityMode ?? "balanced",
    breakpoint: input.breakpoint ?? "desktop",
    references: engineReferencesFromCanvas(state),
    ...(input.tasteProfile ? { tasteProfile: input.tasteProfile } : {}),
    ...(input.designTokens ? { designTokens: input.designTokens } : {}),
  };

  const store = forwardingStore(createMemoryRunStore(new Map()), input.onProgress);
  const engineDeps = createEngineDeps({
    auth: input.auth,
    projectId: input.projectId,
    store,
    overrides: {
      ...deps.engine,
      loadProjectState: async () => {
        const design = await resolveAgentDesignState({ auth: input.auth, projectId: input.projectId, load: deps.loadDesignState });
        return { tasteProfile: design.tasteProfile, designTokens: design.storedDesignTokens };
      },
      generateScreen: deps.generateScreen,
      generateScreenSet: deps.generateScreenSet,
      canvas: {
        initialDoc: doc,
        load: () => deps.loadCanvas(input.auth, input.projectId),
        save: async (payload) => {
          const saved = await deps.saveCanvas(input.auth, { projectId: input.projectId, ...payload });
          return { revision: saved.revision, unchanged: saved.unchanged };
        },
      },
    },
  });

  const runId = await store.create({
    projectId: input.projectId,
    kind: mode,
    input: {},
    inputHash: engineInputHash(engineInput),
    stepKeys: [...ENGINE_STEPS],
  });
  const outcome = await executePipeline({ runId, input: engineInput, deps: engineDeps });

  if (outcome.status === "failed" || !outcome.result) {
    const run = await store.get(runId);
    const failure = (run?.result ?? {}) as Record<string, unknown>;
    return {
      ok: false,
      status: outcome.errorKind === "credit-exhaustion" ? 402 : outcome.failedStep === "persist" ? 500 : 502,
      body: {
        error: outcome.error ?? "Generation failed",
        generationResult: outcome.errorKind ?? "v6-failed",
        failedStep: outcome.failedStep,
        ...(failure.v6Debug ? { v6Debug: failure.v6Debug } : {}),
      },
    };
  }
  return { ok: true, status: 200, body: outcome.result };
}

export async function executeAgentGenerateScreen(
  input: AgentGenerateScreenInput,
  deps: AgentGenerationDeps = defaultAgentGenerationDeps,
): Promise<AgentGenerationOutcome> {
  return runAgentPipeline(input, "screen", deps);
}

export async function executeAgentGenerateScreenSet(
  input: AgentGenerateScreenSetInput,
  deps: AgentGenerationDeps = defaultAgentGenerationDeps,
): Promise<AgentGenerationOutcome> {
  return runAgentPipeline(input, "screen-set", deps);
}
