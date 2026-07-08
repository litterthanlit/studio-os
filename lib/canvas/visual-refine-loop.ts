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

export type VisualRefineIteration = {
  iteration: number;
  score: number;
  applied: boolean;
};

export type VisualRefineLoopResult = {
  tree: DesignNode;
  visualScore: TasteFidelityScore | null;
  refined: boolean;
  screenshotCaptured: boolean;
  iterations: VisualRefineIteration[];
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
  /** Test hook — bypasses vision API when provided. */
  scoreScreenshot?: (screenshotDataUrl: string) => Promise<TasteFidelityScore>;
  /** Test hook — bypasses model regeneration when provided. */
  regenerateFromCritique?: (
    content: OpenAI.Chat.Completions.ChatCompletionContentPart[],
  ) => Promise<DesignNode | null>;
  startedAtMs?: number;
};

const VISUAL_REFINE_MAX_ELAPSED_MS = 40_000;
const CATASTROPHIC_VARIANT_GAP = 2.0;

export function getVisualRefineMaxIterations(): number {
  const raw = Number.parseInt(process.env.STUDIO_OS_VISUAL_REFINE_MAX_ITERATIONS ?? "", 10);
  const configured = Number.isFinite(raw) && raw > 0 ? raw : 2;
  return Math.min(3, configured);
}

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

/**
 * Build the vision payload for a refine regeneration pass.
 * References use low detail; the self-screenshot uses high detail (subject of critique).
 */
export function buildVisualRefineRegenerationContent(args: {
  designPrompt: string;
  critiquePrompt: string;
  referenceImageBlocks: ReturnType<typeof imageUrlBlock>[];
  screenshotDataUrl: string;
  referenceCount: number;
  score: TasteFidelityScore;
}): OpenAI.Chat.Completions.ChatCompletionContentPart[] {
  const refLabel =
    args.referenceCount === 1
      ? "Image 1 is the user's reference."
      : `Images 1-${args.referenceCount} are the user's references.`;

  const instruction = [
    refLabel,
    `The final image is YOUR previous attempt, which scored ${args.score.overall}/10.`,
    `Issues: ${args.score.justification}`,
    "Regenerate the DesignNode tree fixing these issues while keeping what works.",
  ].join(" ");

  return [
    { type: "text", text: `${args.designPrompt}\n\n${args.critiquePrompt}\n\n${instruction}` },
    ...args.referenceImageBlocks,
    imageUrlBlock(args.screenshotDataUrl, "high"),
  ];
}

type ScoredTree = {
  tree: DesignNode;
  score: TasteFidelityScore;
  screenshotDataUrl: string;
};

async function scoreTreeScreenshot(
  tree: DesignNode,
  referenceUrls: string[],
  tasteProfile: TasteProfile,
  scoreScreenshot?: VisualRefineLoopArgs["scoreScreenshot"],
): Promise<ScoredTree | null> {
  const screenshotDataUrl = scoreScreenshot
    ? `data:image/png;base64,mock-${tree.id}`
    : await renderDesignNodeScreenshotDataUrl(tree);
  if (!screenshotDataUrl) return null;

  try {
    const score = scoreScreenshot
      ? await scoreScreenshot(screenshotDataUrl)
      : await scoreDesignBenchmarkFidelity(
          referenceUrls.slice(0, 4),
          screenshotDataUrl,
          tasteProfile,
        );
    return { tree, score, screenshotDataUrl };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("[visual-refine] Benchmark scoring failed:", message);
    return null;
  }
}

async function regenerateTreeFromCritique(args: {
  designPrompt: string;
  visualScore: TasteFidelityScore;
  tasteProfile: TasteProfile;
  referenceImageBlocks: ReturnType<typeof imageUrlBlock>[];
  screenshotDataUrl: string;
  referenceUrls: string[];
  router: OpenAI;
  retryMaxTokens: number;
  parseDesignNodeResponse: VisualRefineLoopArgs["parseDesignNodeResponse"];
  regenerateFromCritique?: VisualRefineLoopArgs["regenerateFromCritique"];
}): Promise<DesignNode | null> {
  const critiquePrompt = buildVisualCritiqueRetryPrompt(args.visualScore, args.tasteProfile);
  const content = buildVisualRefineRegenerationContent({
    designPrompt: args.designPrompt,
    critiquePrompt,
    referenceImageBlocks: args.referenceImageBlocks,
    screenshotDataUrl: args.screenshotDataUrl,
    referenceCount: Math.min(args.referenceUrls.length, 4),
    score: args.visualScore,
  });

  try {
    if (args.regenerateFromCritique) {
      return await args.regenerateFromCritique(content);
    }

    const retryResponse = await args.router.chat.completions.create({
      model: SONNET_4_6,
      messages: [{ role: "user", content }],
      max_tokens: args.retryMaxTokens,
      temperature: 0.4,
      response_format: { type: "json_object" },
    });

    const retryRaw = retryResponse.choices[0]?.message?.content ?? "";
    const retryParsed = args.parseDesignNodeResponse(
      retryRaw,
      retryResponse.choices[0]?.finish_reason,
    );
    const retryValidated = validateAndNormalizeDesignTree(retryParsed);
    if (!retryValidated.ok) return null;
    return await resolveDesignMediaUrls(retryValidated.tree);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("[visual-refine] Refine pass failed:", message);
    return null;
  }
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
    scoreScreenshot,
    regenerateFromCritique,
    startedAtMs = Date.now(),
  } = args;

  const emptyResult = (current: DesignNode): VisualRefineLoopResult => ({
    tree: current,
    visualScore: null,
    refined: false,
    screenshotCaptured: false,
    iterations: [],
  });

  if (referenceUrls.length === 0 || !process.env.OPENROUTER_API_KEY) {
    return emptyResult(tree);
  }

  const threshold = visualRefineThreshold(fidelityMode);
  const maxIterations = getVisualRefineMaxIterations();
  const iterations: VisualRefineIteration[] = [];

  let currentTree = tree;
  let bestTree = tree;
  let bestScore: TasteFidelityScore | null = null;
  let previousScore: number | null = null;
  let screenshotCaptured = false;
  let refined = false;

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    if (Date.now() - startedAtMs > VISUAL_REFINE_MAX_ELAPSED_MS) {
      console.warn("[visual-refine] Elapsed time cap reached; returning best tree");
      break;
    }

    const scored = await scoreTreeScreenshot(
      currentTree,
      referenceUrls,
      tasteProfile,
      scoreScreenshot,
    );
    if (!scored) {
      if (iteration === 0) return emptyResult(tree);
      break;
    }

    screenshotCaptured = true;
    const { score } = scored;

    if (!bestScore || score.overall > bestScore.overall) {
      bestScore = score;
      bestTree = currentTree;
    }

    iterations.push({
      iteration: iteration + 1,
      score: score.overall,
      applied: false,
    });

    if (score.overall >= threshold) {
      break;
    }

    if (previousScore !== null && score.overall < previousScore) {
      break;
    }

    if (iteration >= maxIterations - 1) {
      break;
    }

    if (Date.now() - startedAtMs > VISUAL_REFINE_MAX_ELAPSED_MS) {
      break;
    }

    const refinedTree = await regenerateTreeFromCritique({
      designPrompt,
      visualScore: score,
      tasteProfile,
      referenceImageBlocks,
      screenshotDataUrl: scored.screenshotDataUrl,
      referenceUrls,
      router,
      retryMaxTokens,
      parseDesignNodeResponse,
      regenerateFromCritique,
    });

    if (!refinedTree) {
      break;
    }

    iterations[iterations.length - 1]!.applied = true;
    refined = true;
    currentTree = refinedTree;
    previousScore = score.overall;
  }

  return {
    tree: bestTree,
    visualScore: bestScore,
    refined,
    screenshotCaptured,
    iterations,
  };
}

/** Score-only pass for derived variants (no regeneration). */
export async function scoreDesignNodeVisualFidelity(args: {
  tree: DesignNode;
  referenceUrls: string[];
  tasteProfile: TasteProfile;
}): Promise<TasteFidelityScore | null> {
  if (args.referenceUrls.length === 0 || !process.env.OPENROUTER_API_KEY) {
    return null;
  }

  const scored = await scoreTreeScreenshot(
    args.tree,
    args.referenceUrls,
    args.tasteProfile,
  );
  return scored?.score ?? null;
}

export async function guardDerivedVariantVisualScore(args: {
  variant: "pushed" | "restructured";
  tree: DesignNode;
  baseVisualScore: number;
  referenceUrls: string[];
  tasteProfile: TasteProfile;
  rederive: () => Promise<DesignNode | null>;
}): Promise<{
  tree: DesignNode;
  visualScore: number | null;
  rederived: boolean;
}> {
  let tree = args.tree;
  let visualScore = (await scoreDesignNodeVisualFidelity({
    tree,
    referenceUrls: args.referenceUrls,
    tasteProfile: args.tasteProfile,
  }))?.overall ?? null;

  let rederived = false;
  if (
    visualScore !== null &&
    args.baseVisualScore - visualScore > CATASTROPHIC_VARIANT_GAP
  ) {
    const replacement = await args.rederive();
    if (replacement) {
      tree = replacement;
      rederived = true;
      visualScore = (await scoreDesignNodeVisualFidelity({
        tree,
        referenceUrls: args.referenceUrls,
        tasteProfile: args.tasteProfile,
      }))?.overall ?? visualScore;
      logVariantGuard(args.variant, visualScore, true);
    }
  }

  return { tree, visualScore, rederived };
}

function logVariantGuard(
  variant: "pushed" | "restructured",
  visualScore: number | null,
  rederived: boolean,
): void {
  if (visualScore === null) return;
  console.warn(
    `[visual-refine] ${variant} variant catastrophic regression — re-derived once (score=${visualScore}, rederived=${rederived})`,
  );
}
