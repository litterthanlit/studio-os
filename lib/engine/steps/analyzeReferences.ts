import { ANALYZER_VERSION, type EngineStep, type ReferenceAnalysisEntry } from "../types";

const MAX_ANALYZED = 6;

/**
 * Perception + measurement per non-muted reference (1.4), cached per content
 * hash + analyzer version in design memory. The legacy CompositionAnalysis is
 * the perception's derived view. Type scale is measured for primaries and
 * typography-role references only (it costs a vision call). A reference that
 * cannot be perceived is skipped (fail open).
 */
export const analyzeReferences: EngineStep<"analyzeReferences"> = {
  key: "analyzeReferences",
  async run({ deps, checkpoints, progress }) {
    const assets = (checkpoints.resolveAssets?.assets ?? []).filter((asset) => asset.weight !== "muted");
    const analyses: ReferenceAnalysisEntry[] = [];
    for (let index = 0; index < Math.min(assets.length, MAX_ANALYZED); index++) {
      const asset = assets[index]!;
      const base = { referenceId: asset.id, hash: asset.hash, referenceIndex: index, weight: asset.weight };
      const cached = await deps.analysisCache?.get(asset.hash, ANALYZER_VERSION).catch(() => null);
      if (cached) {
        analyses.push({ ...base, analysis: cached.composition, perception: { ...cached, assetId: asset.id }, cached: true });
        continue;
      }
      await progress("analyzing-reference", asset.id);
      try {
        const perception = await deps.perceiveReference(
          { id: asset.id, url: asset.url, weight: asset.weight, roles: asset.roles },
          { measureType: asset.weight === "primary" || Boolean(asset.roles?.includes("typography")) },
        );
        analyses.push({ ...base, analysis: perception.composition, perception, cached: false });
        if (perception.composition || perception.measured.palette) {
          await deps.analysisCache?.save(asset.hash, ANALYZER_VERSION, perception).catch(() => undefined);
        }
      } catch {
        // fail open: generation proceeds without this reference's perception
      }
    }
    return { analyses };
  },
};
