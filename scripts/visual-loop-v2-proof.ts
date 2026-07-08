/**
 * Proof gate P1 — visual refine loop v2.
 *
 * Run: npm run proof:visual-loop-v2
 */
import assert from "node:assert/strict";
import type { DesignNode } from "../lib/canvas/design-node";
import type { TasteFidelityScore } from "../lib/canvas/taste-evaluator";
import type { TasteProfile } from "../types/taste-profile";
import { imageUrlBlock } from "../lib/ai/model-router";
import {
  buildVisualRefineRegenerationContent,
  getVisualRefineMaxIterations,
  runVisualRefineLoop,
} from "../lib/canvas/visual-refine-loop";

const tasteProfile: TasteProfile = {
  summary: "Editorial restraint.",
  adjectives: ["editorial"],
  archetypeMatch: "editorial-brand",
  archetypeConfidence: 0.9,
  layoutBias: {
    density: "spacious",
    rhythm: "asymmetric",
    heroStyle: "full-bleed",
    sectionFlow: "editorial-grid",
    gridBehavior: "editorial",
    whitespaceIntent: "dramatic",
  },
  typographyTraits: {
    scale: "dramatic",
    headingTone: "editorial",
    bodyTone: "literary",
    contrast: "high",
    casePreference: "mixed",
    recommendedPairings: ["Bespoke Serif", "Geist Sans"],
  },
  colorBehavior: {
    mode: "light",
    palette: "restrained",
    accentStrategy: "no-accent",
    saturation: "desaturated",
    temperature: "warm",
    suggestedColors: {
      background: "#faf9f6",
      surface: "#f1eee8",
      text: "#1a1a1a",
      accent: "#8a6f4d",
    },
  },
  imageTreatment: {
    style: "editorial",
    sizing: "full-bleed",
    treatment: "raw",
    cornerRadius: "subtle",
    borders: false,
    shadow: "none",
    aspectPreference: "mixed",
  },
  ctaTone: { style: "editorial", shape: "sharp", hierarchy: "text-link-preferred" },
  avoid: ["card grids"],
  confidence: 0.9,
  referenceCount: 2,
  dominantReferenceType: "photography",
  warnings: [],
};

function frame(id: string): DesignNode {
  return {
    id,
    type: "frame",
    name: id,
    style: { display: "flex", flexDirection: "column", width: 1280 },
    children: [],
  };
}

function mockScore(overall: number): TasteFidelityScore {
  return {
    palette: overall,
    typography: overall,
    density: overall,
    structure: overall,
    overall,
    justification: `mock score ${overall}`,
    mode: "benchmark",
    timestamp: new Date().toISOString(),
  };
}

const referenceBlocks = [
  imageUrlBlock("https://example.com/ref-a.png", "low"),
  imageUrlBlock("https://example.com/ref-b.png", "low"),
];

async function runMockedLoop(args: {
  scores: number[];
  refinedTrees: DesignNode[];
}) {
  let scoreIndex = 0;
  let treeIndex = 0;
  const startedAtMs = Date.now();

  return runVisualRefineLoop({
    tree: frame("base"),
    tasteProfile,
    referenceUrls: ["https://example.com/ref-a.png"],
    designPrompt: "Design prompt",
    referenceImageBlocks: referenceBlocks.slice(0, 1),
    router: {} as never,
    retryMaxTokens: 1000,
    fidelityMode: "balanced",
    parseDesignNodeResponse: () => frame("unused"),
    startedAtMs,
    scoreScreenshot: async () => {
      const overall = args.scores[scoreIndex] ?? args.scores[args.scores.length - 1] ?? 0;
      scoreIndex += 1;
      return mockScore(overall);
    },
    regenerateFromCritique: async () => {
      const next = args.refinedTrees[treeIndex];
      treeIndex += 1;
      return next ?? null;
    },
  });
}

async function main() {
  const regenContent = buildVisualRefineRegenerationContent({
    designPrompt: "Generate editorial homepage",
    critiquePrompt: "Fix structure",
    referenceImageBlocks: referenceBlocks,
    screenshotDataUrl: "data:image/png;base64,abc",
    referenceCount: 2,
    score: mockScore(5.5),
  });

  const imageParts = regenContent.filter((part) => part.type === "image_url");
  assert.equal(imageParts.length, 3, "expected 2 references + 1 self-screenshot");
  const selfShot = imageParts[imageParts.length - 1];
  assert.equal(selfShot?.type, "image_url");
  if (selfShot?.type === "image_url") {
    assert.equal(selfShot.image_url.detail, "high", "self-screenshot must use high detail");
    assert.match(selfShot.image_url.url, /^data:image\/png;base64,/);
  }

  const textPart = regenContent.find((part) => part.type === "text");
  assert.ok(textPart && textPart.type === "text");
  if (textPart?.type === "text") {
    assert.match(textPart.text, /YOUR previous attempt/);
    assert.match(textPart.text, /5\.5\/10/);
  }

  process.env.STUDIO_OS_VISUAL_REFINE_MAX_ITERATIONS = "3";
  assert.equal(getVisualRefineMaxIterations(), 3);
  process.env.STUDIO_OS_VISUAL_REFINE_MAX_ITERATIONS = "9";
  assert.equal(getVisualRefineMaxIterations(), 3, "hard cap is 3");
  delete process.env.STUDIO_OS_VISUAL_REFINE_MAX_ITERATIONS;
  assert.equal(getVisualRefineMaxIterations(), 2, "default is 2");

  process.env.STUDIO_OS_VISUAL_REFINE_MAX_ITERATIONS = "3";
  const failFailPass = await runMockedLoop({
    scores: [5, 6, 8],
    refinedTrees: [frame("refined-1"), frame("refined-2")],
  });
  assert.equal(failFailPass.iterations.length, 3);
  assert.equal(failFailPass.iterations[0]?.applied, true);
  assert.equal(failFailPass.iterations[1]?.applied, true);
  assert.equal(failFailPass.iterations[2]?.applied, false);
  assert.equal(failFailPass.tree.id, "refined-2");
  assert.equal(failFailPass.visualScore?.overall, 8);

  delete process.env.STUDIO_OS_VISUAL_REFINE_MAX_ITERATIONS;

  const failRegress = await runMockedLoop({
    scores: [5, 4],
    refinedTrees: [frame("refined-regress")],
  });
  assert.equal(failRegress.iterations.length, 2);
  assert.equal(failRegress.iterations[1]?.applied, false);
  assert.equal(failRegress.tree.id, "base");
  assert.equal(failRegress.visualScore?.overall, 5);

  const bestTreeWins = await runMockedLoop({
    scores: [5, 7, 6],
    refinedTrees: [frame("better"), frame("worse")],
  });
  assert.equal(bestTreeWins.tree.id, "better");
  assert.equal(bestTreeWins.visualScore?.overall, 7);

  console.log("visual-loop-v2 proof passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
