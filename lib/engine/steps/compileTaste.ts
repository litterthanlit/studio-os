import { analysisToTokens } from "@/lib/canvas/generate-system";
import { defaultDesignTokens } from "@/lib/agent/default-design-tokens";
import type { EngineStep, TasteCheckpoint } from "../types";

/**
 * Taste + tokens for generation, same precedence for every entrypoint:
 *   taste:  request → project design memory → extracted from references → none
 *   tokens: request → project design memory → derived from references → defaults
 * Extracted taste is written back to design memory (derived layer).
 */
export const compileTaste: EngineStep<"compileTaste"> = {
  key: "compileTaste",
  async run({ input, deps, checkpoints, progress }) {
    await progress("taste");
    const assets = (checkpoints.resolveAssets?.assets ?? []).filter((asset) => asset.weight !== "muted");
    const analyses = checkpoints.analyzeReferences?.analyses ?? [];
    const compositionData: TasteCheckpoint["compositionData"] = analyses.map((entry) => ({
      analysis: entry.analysis,
      weight: entry.weight,
      referenceIndex: entry.referenceIndex,
    }));
    const project = await deps.loadProjectState().catch(() => null);

    let designTokens = input.designTokens ?? project?.designTokens ?? null;
    let tokensSource: TasteCheckpoint["sources"]["designTokens"] = input.designTokens
      ? "request"
      : project?.designTokens
        ? "project"
        : "default";
    if (!designTokens && assets.length > 0) {
      const analyzed = await deps.analyzeImages(assets.slice(0, 6).map((asset) => asset.url)).catch(() => null);
      if (analyzed?.ok) {
        designTokens = analysisToTokens(analyzed.analysis);
        tokensSource = "derived";
      }
    }

    let tasteProfile = input.tasteProfile ?? project?.tasteProfile ?? null;
    let tasteSource: TasteCheckpoint["sources"]["tasteProfile"] = input.tasteProfile
      ? "request"
      : project?.tasteProfile
        ? "project"
        : "none";
    if (!tasteProfile && assets.length > 0) {
      const extracted = await deps.extractTaste({
        projectId: input.projectId,
        references: assets.slice(0, 6).map((asset) => ({ id: asset.id, url: asset.url, weight: asset.weight, annotation: asset.annotation })),
        prompt: input.prompt,
        existingTokens: designTokens ?? undefined,
        compositionData: compositionData.length > 0 ? compositionData : undefined,
      });
      if (extracted.ok) {
        tasteProfile = extracted.profile;
        tasteSource = "extracted";
        await deps.saveDerivedTaste?.(extracted.profile).catch(() => undefined);
      }
    }

    return {
      tasteProfile,
      designTokens: designTokens ?? defaultDesignTokens(),
      compositionData,
      sources: { tasteProfile: tasteSource, designTokens: tokensSource },
    };
  },
};
