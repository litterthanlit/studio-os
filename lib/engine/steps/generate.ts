import { summarizeCompositionsForTaste } from "@/lib/canvas/composition-blueprint";
import { inferSiteName } from "@/lib/canvas/compose";
import type { SiteType } from "@/lib/canvas/templates";
import { intentReferencesFor, type EngineStep, type GenerateCheckpoint } from "../types";

export class GenerationFailedError extends Error {
  constructor(message: string, readonly kind: string, readonly debug?: unknown) {
    super(message);
    this.name = "GenerationFailedError";
  }
}

/** Screen (V6 variants) or screen set, with the brief's classification and the compiled taste. */
export const generate: EngineStep<"generate"> = {
  key: "generate",
  async run({ input, deps, checkpoints, progress }) {
    const brief = checkpoints.buildBrief!;
    const taste = checkpoints.compileTaste!;
    const assets = (checkpoints.resolveAssets?.assets ?? []).filter((asset) => asset.weight !== "muted");
    const referenceUrls = assets.map((asset) => asset.url);
    const rolesById = new Map(brief.brief.references.map((ref) => [ref.assetId, ref.roles as string[]]));
    const references = intentReferencesFor(assets, rolesById);
    const compositionContext = taste.compositionData.length > 0
      ? summarizeCompositionsForTaste(taste.compositionData)
      : undefined;

    await progress("generating", `${brief.kind} · taste: ${taste.sources.tasteProfile} · references: ${referenceUrls.length}`);
    const common = {
      prompt: input.prompt.trim(),
      tokens: taste.designTokens,
      siteType: input.siteType as SiteType | undefined,
      tasteProfile: taste.tasteProfile,
      referenceUrls,
      references,
      fidelityMode: input.fidelityMode ?? "balanced",
      compositionData: taste.compositionData.length > 0 ? taste.compositionData : undefined,
      compositionContext: compositionContext || undefined,
      intentClassification: brief.intentClassification,
      layeredTaste: taste.layered,
    };

    if (brief.kind === "screen-set") {
      const result = await deps.generateScreenSet({
        ...common,
        siteName: input.siteName ?? inferSiteName(input.prompt),
        breakpoint: brief.breakpoint,
        onProgress: progress,
      });
      if (!result.ok) throw new GenerationFailedError(result.error, result.failure?.kind ?? "v6-failed");
      return { kind: "screen-set", result } satisfies GenerateCheckpoint;
    }

    const result = await deps.generateScreen({ ...common, siteName: input.siteName ?? input.artboardName ?? inferSiteName(input.prompt) });
    if (!result.ok || !result.variants?.[0]?.pageTree) {
      const failure = result.ok ? null : result.v6Failure;
      throw new GenerationFailedError(
        result.ok ? "Generation returned no variants" : result.strictError ?? failure?.message ?? "Generation failed",
        result.ok ? "v6-failed" : failure?.kind ?? result.generationResult ?? "v6-failed",
        result.v6Debug,
      );
    }
    return { kind: "screen", result } satisfies GenerateCheckpoint;
  },
};
