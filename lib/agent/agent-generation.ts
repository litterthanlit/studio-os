// lib/agent/agent-generation.ts
// Agent screen / screen-set generation, shared by the synchronous routes and
// async agent runs. Taste and tokens come from the request, else from the
// project's stored design state (`resolveAgentDesignState`), else defaults.

import type { Id } from "@/convex/_generated/dataModel";
import { applyCanvasDocumentWrite } from "@/lib/canvas/canvas-document";
import { normalizeRemoteCanvasState } from "@/lib/canvas/canvas-convex-sync";
import { BREAKPOINT_WIDTHS, inferSiteName } from "@/lib/canvas/compose";
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
import type { TasteProfile } from "@/types/taste-profile";
import type { IntentReferenceInput } from "@/types/intent-profile";
import { buildCanvasSummary } from "./canvas-agent-ops";
import { resolveAgentDesignState, type ResolvedAgentDesignState } from "./agent-design-state";
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
};

export type AgentGenerateScreenSetInput = Omit<AgentGenerateScreenInput, "name">;

/** Non-muted references, primary first — the same ordering the editor sends. */
export function extractReferenceInputs(state: UnifiedCanvasState): {
  referenceUrls: string[];
  references: IntentReferenceInput[];
} {
  const refs = state.items
    .filter((item): item is ReferenceItem => item.kind === "reference" && Boolean(item.imageUrl))
    .filter((item) => getEffectiveReferenceWeight(item) !== "muted")
    .sort(
      (a, b) =>
        (getEffectiveReferenceWeight(a) === "primary" ? 0 : 1) -
        (getEffectiveReferenceWeight(b) === "primary" ? 0 : 1),
    );
  return {
    referenceUrls: refs.map((ref) => ref.imageUrl),
    references: refs.map((ref) => ({
      id: ref.id,
      weight: getEffectiveReferenceWeight(ref),
      annotation: ref.annotation?.trim() || undefined,
    })),
  };
}

function designStateSummary(design: ResolvedAgentDesignState) {
  return {
    tasteSource: design.source.tasteProfile,
    tokensSource: design.source.designTokens,
    archetype: design.tasteProfile?.archetypeMatch ?? null,
  };
}

async function loadContext(
  input: AgentGenerateScreenInput | AgentGenerateScreenSetInput,
  deps: AgentGenerationDeps,
) {
  const [doc, design] = await Promise.all([
    deps.loadCanvas(input.auth, input.projectId),
    resolveAgentDesignState({
      auth: input.auth,
      projectId: input.projectId,
      tasteProfile: input.tasteProfile,
      designTokens: input.designTokens,
      load: deps.loadDesignState,
    }),
  ]);
  const currentState = normalizeRemoteCanvasState(doc?.state ?? null);
  return { doc, design, currentState, ...extractReferenceInputs(currentState) };
}

export async function executeAgentGenerateScreen(
  input: AgentGenerateScreenInput,
  deps: AgentGenerationDeps = defaultAgentGenerationDeps,
): Promise<AgentGenerationOutcome> {
  const { doc, design, currentState, referenceUrls, references } = await loadContext(input, deps);
  const breakpoint = input.breakpoint ?? "desktop";

  const generation = await deps.generateScreen({
    prompt: input.prompt.trim(),
    tokens: design.designTokens,
    siteName: input.name ?? inferSiteName(input.prompt),
    tasteProfile: design.tasteProfile,
    referenceUrls,
    references,
    fidelityMode: input.fidelityMode ?? "balanced",
  });

  if (!generation.ok || !generation.variants?.[0]?.pageTree) {
    const failureMessage = generation.ok
      ? "Generation returned no variants"
      : generation.v6Failure?.message ?? "Generation failed";
    const failureKind = generation.ok
      ? "v6-failed"
      : generation.v6Failure?.kind ?? generation.generationResult ?? "v6-failed";
    return {
      ok: false,
      status: !generation.ok && generation.v6Failure?.kind === "credit-exhaustion" ? 402 : 502,
      body: {
        error: failureMessage,
        generationResult: failureKind,
        v6Debug: generation.v6Debug,
        designState: designStateSummary(design),
      },
    };
  }

  const artboardName = input.name ?? generation.siteName ?? "Generated Screen";
  const { state, schemaVersion, applied, errors } = applyCanvasDocumentWrite(currentState, [
    {
      type: "add_artboard",
      name: artboardName,
      breakpoint,
      tree: generation.variants[0].pageTree,
    },
  ]);

  if (applied.length === 0) {
    return { ok: false, status: 500, body: { error: "Failed to add generated artboard", details: errors } };
  }

  const saveResult = await deps.saveCanvas(input.auth, {
    projectId: input.projectId,
    state,
    expectedRevision: doc?.revision,
    schemaVersion,
  });

  const summary = buildCanvasSummary(state);
  return {
    ok: true,
    status: 200,
    body: {
      projectId: input.projectId,
      artboardId: summary.artboards.at(-1)?.id ?? null,
      revision: saveResult.revision,
      siteName: generation.siteName,
      generationResult: generation.generationResult,
      v6Debug: generation.v6Debug,
      designState: designStateSummary(design),
      summary,
      variant: {
        id: generation.variants[0].id,
        name: generation.variants[0].name,
        description: generation.variants[0].description,
      },
    },
  };
}

export async function executeAgentGenerateScreenSet(
  input: AgentGenerateScreenSetInput,
  deps: AgentGenerationDeps = defaultAgentGenerationDeps,
): Promise<AgentGenerationOutcome> {
  const { doc, design, currentState, referenceUrls, references } = await loadContext(input, deps);
  const breakpoint = input.breakpoint ?? "desktop";

  const generation = await deps.generateScreenSet({
    prompt: input.prompt.trim(),
    tokens: design.designTokens,
    siteName: inferSiteName(input.prompt),
    tasteProfile: design.tasteProfile,
    referenceUrls,
    references,
    fidelityMode: input.fidelityMode ?? "balanced",
    breakpoint,
  });

  if (!generation.ok) {
    return {
      ok: false,
      status: generation.failure?.kind === "credit-exhaustion" ? 402 : 502,
      body: {
        error: generation.error,
        generationResult: generation.failure?.kind ?? "v6-failed",
        designState: designStateSummary(design),
      },
    };
  }

  const siteId = `site-${Date.now()}`;
  const artboardWidth = BREAKPOINT_WIDTHS[breakpoint] ?? 1440;
  const gap = 80;
  const baseX = 120 + currentState.items.filter((item) => item.kind === "artboard").length * 40;

  const operations = generation.screens.map((screen, index) => ({
    type: "add_artboard" as const,
    name: screen.name,
    breakpoint,
    tree: screen.pageTree,
    siteId,
    screenRole: screen.screenRole,
    screenPurpose: screen.screenPurpose,
    x: baseX + index * (artboardWidth + gap),
    y: 100,
  }));

  const { state, schemaVersion, applied, errors } = applyCanvasDocumentWrite(currentState, operations);
  if (applied.length === 0) {
    return { ok: false, status: 500, body: { error: "Failed to add generated screens", details: errors } };
  }

  const saveResult = await deps.saveCanvas(input.auth, {
    projectId: input.projectId,
    state,
    expectedRevision: doc?.revision,
    schemaVersion,
  });

  const summary = buildCanvasSummary(state);
  return {
    ok: true,
    status: 200,
    body: {
      projectId: input.projectId,
      siteId,
      revision: saveResult.revision,
      siteName: generation.siteName,
      generationResult: "v6-screens",
      effectiveArchetype: generation.effectiveArchetype,
      designState: designStateSummary(design),
      plan: generation.plan,
      screens: generation.screens.map((screen, index) => ({
        id: summary.artboards.at(-generation.screens.length + index)?.id ?? screen.id,
        name: screen.name,
        screenRole: screen.screenRole,
        screenPurpose: screen.screenPurpose,
      })),
      summary,
      applied,
    },
  };
}
