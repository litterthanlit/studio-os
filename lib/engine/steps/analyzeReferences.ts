import { ANALYZER_VERSION, type EngineStep, type ReferenceAnalysisEntry } from "../types";

const MAX_ANALYZED = 6;

/**
 * Composition analysis per non-muted reference, cached per content hash +
 * analyzer version in design memory. A reference that cannot be analyzed is
 * skipped (fail open), exactly like the editor did client-side.
 */
export const analyzeReferences: EngineStep<"analyzeReferences"> = {
  key: "analyzeReferences",
  async run({ deps, checkpoints, progress }) {
    const assets = (checkpoints.resolveAssets?.assets ?? []).filter((asset) => asset.weight !== "muted");
    const analyses: ReferenceAnalysisEntry[] = [];
    for (let index = 0; index < Math.min(assets.length, MAX_ANALYZED); index++) {
      const asset = assets[index]!;
      const cached = await deps.analysisCache?.get(asset.hash, ANALYZER_VERSION).catch(() => null);
      if (cached) {
        analyses.push({ referenceId: asset.id, hash: asset.hash, referenceIndex: index, weight: asset.weight, analysis: cached, cached: true });
        continue;
      }
      await progress("analyzing-reference", asset.id);
      try {
        const result = await deps.analyzeComposition(asset.url);
        if (!result.ok) continue;
        analyses.push({ referenceId: asset.id, hash: asset.hash, referenceIndex: index, weight: asset.weight, analysis: result.analysis, cached: false });
        await deps.analysisCache?.save(asset.hash, ANALYZER_VERSION, result.analysis).catch(() => undefined);
      } catch {
        // fail open: generation proceeds without this reference's composition
      }
    }
    return { analyses };
  },
};
