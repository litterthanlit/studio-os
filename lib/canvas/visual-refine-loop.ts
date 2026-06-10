import type OpenAI from "openai";
import { imageUrlBlock, SONNET_4_6 } from "@/lib/ai/model-router";
import type { TasteProfile } from "@/types/taste-profile";
import type { DesignNode } from "./design-node";
import { renderDesignNodeScreenshotDataUrl } from "./design-node-screenshot";
import {
  scoreDesignBenchmarkFidelity,
  type TasteFidelityScore,
} from "./design-taste-evaluator";
import { validateAndNormalizeDesignTree } from "./design-tree-validator";
import { resolveDesignMediaUrls } from "./design-media-resolver";
import type { FidelityMode } from "./directive-compiler";

export type VisualRefineLoopResult = {
  tree: DesignNode;
  visualScore: TasteFidelityScore | null;
  refined: boolean;
  screenshotCaptured: boolean;
};

export type VisualRefineLoopArgs = {
  tree: DesignNode;
  tasteProfile: TasteProfile;
  referenceUrls: string[];
  designPrompt: string;
  referenceImageBlocks: ReturnType<typeof imageUrlBlock>[];
  router: OpenAI;
  retryMaxTokens: number;
  fidelityMode: FidelityMode;
  parseDesignNodeResponse: (raw: string, finishReason?: string | null) => unknown;
};

function visualRefineThreshold(fidelityMode: FidelityMode): number {
  if (fidelityMode === "close") return 7.5;
  if (fidelityMode === "push") return 7;
  return 7.25;
}

export function buildVisualCritiqueRetryPrompt(
  score: TasteFidelityScore,
  tasteProfile: TasteProfile,
): string {
  const weakDimensions: string[] = [];
  if (score.palette < 7) weakDimensions.push(`palette (${score.palette}/10)`);
  if (score.typography < 7) weakDimensions.push(`typography (${score.typography}/10)`);
  if (score.density < 7) weakDimensions.push(`density/spacing (${score.density}/10)`);
  if (score.structure < 7) weakDimensions.push(`structure (${score.structure}/10)`);

  return [
    "## Visual critique (rendered screenshot vs references)",
    `Overall fidelity: ${score.overall}/10`,
    weakDimensions.length > 0
      ? `Weak dimensions: ${weakDimensions.join(", ")}`
      : "Weak dimensions: overall composition",
    `Critique: ${score.justification}`,
    "",
    "Regenerate the full DesignNode tree to fix these visual issues.",
    `Preserve archetype ${tasteProfile.archetypeMatch} and avoid: ${tasteProfile.avoid.join(", ") || "none"}.`,
    "Return only valid DesignNode JSON.",
  ].join("\n");
}

export async function runVisualRefineLoop(
  args: VisualRefineLoopArgs,
): Promise<VisualRefineLoopResult> {
  const {
    tree,
    tasteProfile,
    referenceUrls,
    designPrompt,
    referenceImageBlocks,
    router,
    retryMaxTokens,
    fidelityMode,
    parseDesignNodeResponse,
  } = args;

  if (referenceUrls.length === 0 || !process.env.OPENROUTER_API_KEY) {
    return { tree, visualScore: null, refined: false, screenshotCaptured: false };
  }

  const screenshotDataUrl = await renderDesignNodeScreenshotDataUrl(tree);
  if (!screenshotDataUrl) {
    return { tree, visualScore: null, refined: false, screenshotCaptured: false };
  }

  let visualScore: TasteFidelityScore;
  try {
    visualScore = await scoreDesignBenchmarkFidelity(
      referenceUrls.slice(0, 4),
      screenshotDataUrl,
      tasteProfile,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("[visual-refine] Benchmark scoring failed:", message);
    return { tree, visualScore: null, refined: false, screenshotCaptured: true };
  }

  const threshold = visualRefineThreshold(fidelityMode);
  if (visualScore.overall >= threshold) {
    return {
      tree,
      visualScore,
      refined: false,
      screenshotCaptured: true,
    };
  }

  const critiquePrompt = `${designPrompt}\n\n${buildVisualCritiqueRetryPrompt(visualScore, tasteProfile)}`;
  try {
    const retryResponse = await router.chat.completions.create({
      model: SONNET_4_6,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: critiquePrompt },
          ...referenceImageBlocks,
        ],
      }],
      max_tokens: retryMaxTokens,
      temperature: 0.4,
      response_format: { type: "json_object" },
    });

    const retryRaw = retryResponse.choices[0]?.message?.content ?? "";
    const retryParsed = parseDesignNodeResponse(retryRaw, retryResponse.choices[0]?.finish_reason);
    const retryValidated = validateAndNormalizeDesignTree(retryParsed);
    if (!retryValidated.ok) {
      return { tree, visualScore, refined: false, screenshotCaptured: true };
    }

    const refinedTree = await resolveDesignMediaUrls(retryValidated.tree);
    const refinedScreenshot = await renderDesignNodeScreenshotDataUrl(refinedTree);
    let refinedScore = visualScore;
    if (refinedScreenshot) {
      try {
        refinedScore = await scoreDesignBenchmarkFidelity(
          referenceUrls.slice(0, 4),
          refinedScreenshot,
          tasteProfile,
        );
      } catch {
        refinedScore = visualScore;
      }
    }

    const selectedTree = refinedScore.overall >= visualScore.overall ? refinedTree : tree;

    return {
      tree: selectedTree,
      visualScore: selectedTree === refinedTree ? refinedScore : visualScore,
      refined: selectedTree === refinedTree,
      screenshotCaptured: true,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("[visual-refine] Refine pass failed:", message);
    return { tree, visualScore, refined: false, screenshotCaptured: true };
  }
}
