import { analysisToTokens } from "@/lib/canvas/generate-system";
import { defaultDesignTokens } from "@/lib/agent/default-design-tokens";
import { compileLayeredTaste, layeredTokens } from "@/lib/taste/compile";
import type { EngineStep, TasteCheckpoint } from "../types";

/** Brief roles → taste-extraction roles (the extractor's older vocabulary). */
const TASTE_ROLE: Record<string, string> = {
  layout: "layout",
  typography: "typography",
  color: "palette",
  imagery: "imagery",
  components: "component",
  mood: "mood",
};

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
    const compositionData: TasteCheckpoint["compositionData"] = analyses.flatMap((entry) =>
      entry.analysis ? [{ analysis: entry.analysis, weight: entry.weight, referenceIndex: entry.referenceIndex }] : [],
    );
    const brief = checkpoints.buildBrief;
    const rolesById = new Map((brief?.brief.references ?? []).map((ref) => [ref.assetId, ref.roles]));
    const loaded = await deps.loadProjectState().catch(() => null);
    // Derived taste extracted under a different brief (roles, weights, regions or
    // answers changed) is stale: re-extract. Taste the designer set has no key.
    const stale = Boolean(brief && loaded?.tasteCacheKey && loaded.tasteCacheKey !== brief.cacheKey);
    const project = stale && loaded ? { ...loaded, tasteProfile: null } : loaded;
    if (stale) await progress("taste-invalidated", "brief changed");

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
        references: assets.slice(0, 6).map((asset) => {
          const role = TASTE_ROLE[rolesById.get(asset.id)?.[0] ?? ""];
          return { id: asset.id, url: asset.url, weight: asset.weight, ...(role ? { role } : { annotation: asset.annotation }) };
        }),
        prompt: input.prompt,
        existingTokens: designTokens ?? undefined,
        compositionData: compositionData.length > 0 ? compositionData : undefined,
      });
      if (extracted.ok) {
        tasteProfile = extracted.profile;
        tasteSource = "extracted";
        if (brief) await deps.saveDerivedTaste?.(extracted.profile, brief.cacheKey).catch(() => undefined);
      }
    }

    // Layered compile: derived ← explicit (already on the profile) ← learned in
    // scope, plus the brief's measured directives. Measured colors refine derived
    // or default tokens, never tokens the designer or the request set.
    const learned = (await deps.loadLearned?.().catch(() => [])) ?? [];
    const layered = compileLayeredTaste({
      derived: tasteProfile,
      learned,
      briefDirectives: brief?.directives ?? [],
      scope: { projectId: input.projectId },
    });
    const baseTokens = designTokens ?? defaultDesignTokens();
    const compiledTokens = tokensSource === "derived" || tokensSource === "default" ? layeredTokens(baseTokens, layered) : baseTokens;

    return {
      tasteProfile: layered.tasteProfile,
      designTokens: compiledTokens,
      compositionData,
      layered,
      sources: { tasteProfile: tasteSource, designTokens: tokensSource },
    };
  },
};
