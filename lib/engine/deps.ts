// lib/engine/deps.ts
// Production dependencies for the engine pipeline: real analysis / extraction /
// classification / generation cores, design memory when the caller has Convex
// credentials, and the run store.

import type { Id } from "@/convex/_generated/dataModel";
import { agentLoadCanvas, agentLoadDesignState, agentSaveCanvas, type AgentConvexAuth } from "@/lib/agent/convex-agent-client";
import { analyzeReferenceImages } from "@/lib/canvas/analyze-images-core";
import { generateV6DesignVariants } from "@/lib/canvas/generate-design-core";
import { generateAppScreenSet } from "@/lib/canvas/generate-screen-set-core";
import type { DesignSystemTokens } from "@/lib/canvas/generate-system";
import { classifyIntent } from "@/lib/canvas/intent-classifier";
import { isConvexConfigured } from "@/lib/convex/is-configured";
import { createDesignMemoryClient } from "@/lib/design-memory/client";
import { splitTasteProfile } from "@/lib/design-memory/types";
import { analyzeCompositionImage } from "@/lib/taste/analyze-composition-core";
import { extractTasteProfile } from "@/lib/taste/extract-core";
import type { CompositionAnalysis } from "@/types/composition-analysis";
import type { TasteProfile } from "@/types/taste-profile";
import { runStoreFor, type RunStore } from "./run-store";
import type { EngineDeps } from "./types";

function hasConvexCredentials(auth: AgentConvexAuth): boolean {
  return isConvexConfigured() && Boolean(auth.serviceSecret || auth.bearerToken);
}

export function createEngineDeps(args: {
  auth: AgentConvexAuth;
  projectId: string;
  store?: RunStore;
  /** Server-side canvas writes (agents). */
  withCanvas?: boolean;
  overrides?: Partial<EngineDeps>;
}): EngineDeps {
  const { auth, projectId } = args;
  const pid = projectId as Id<"projects">;
  const memory = hasConvexCredentials(auth) ? createDesignMemoryClient(auth) : null;

  const deps: EngineDeps = {
    store: args.store ?? runStoreFor(auth),
    loadProjectState: async () => {
      if (!hasConvexCredentials(auth)) return null;
      const row = await agentLoadDesignState(auth, pid);
      return row
        ? { tasteProfile: (row.tasteProfile as TasteProfile | null) ?? null, designTokens: (row.designTokens as DesignSystemTokens | null) ?? null }
        : null;
    },
    ...(memory
      ? {
          analysisCache: {
            get: async (hash: string, analyzerVersion: string) =>
              ((await memory.getReferenceAnalysis(projectId, { assetHash: hash, analyzerVersion }))?.perceived as CompositionAnalysis | undefined) ?? null,
            save: async (hash: string, analyzerVersion: string, analysis: CompositionAnalysis) => {
              // Composition analysis is the vision model's perception; measured values arrive in 1.3.
              await memory.saveReferenceAnalysis(projectId, { assetHash: hash, analyzerVersion, measured: {}, perceived: analysis, confidence: 0.7 });
            },
          },
          saveBrief: async (brief) => ({ briefId: (await memory.saveBrief(projectId, brief)).briefId }),
          saveDerivedTaste: async (profile) => {
            const { derived } = splitTasteProfile(profile as unknown as Parameters<typeof splitTasteProfile>[0]);
            await memory.saveTasteLayer(projectId, {
              kind: "derived",
              data: derived,
              provenance: [{ source: "perceived", confidence: typeof profile.confidence === "number" ? profile.confidence : 0.5 }],
            });
          },
        }
      : {}),
    analyzeComposition: analyzeCompositionImage,
    analyzeImages: analyzeReferenceImages,
    extractTaste: extractTasteProfile,
    classifyIntent,
    generateScreen: generateV6DesignVariants,
    generateScreenSet: generateAppScreenSet,
    ...(args.withCanvas
      ? {
          canvas: {
            load: () => agentLoadCanvas(auth, pid),
            save: async (payload) => {
              const saved = await agentSaveCanvas(auth, { projectId: pid, ...payload });
              return { revision: saved.revision, unchanged: saved.unchanged };
            },
          },
        }
      : {}),
  };
  return { ...deps, ...args.overrides };
}
