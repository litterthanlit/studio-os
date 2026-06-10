/**
 * Proof gate: composition wiring + screenshot render + agent contract helpers.
 *
 * Run: npx tsx scripts/visual-loop-mcp-proof.ts
 */
import assert from "node:assert/strict";
import { summarizeCompositionsForTaste } from "../lib/canvas/composition-blueprint";
import type { CompositionAnalysis } from "../types/composition-analysis";
import { buildDesignTreePrompt } from "../lib/canvas/design-tree-prompt";
import type { DesignSystemTokens } from "../lib/canvas/generate-system";
import { renderDesignNodeScreenshotDataUrl } from "../lib/canvas/design-node-screenshot";
import type { DesignNode } from "../lib/canvas/design-node";
import { benchmarkScoreToObservedIssues } from "../lib/agent/visual-review-from-score";
import type { TasteFidelityScore } from "../lib/canvas/taste-evaluator";
import { AGENT_CONTEXT_TOOLS } from "../lib/canvas/agent-design-contract";

const tokens: DesignSystemTokens = {
  colors: {
    primary: "#111111",
    secondary: "#2A2A2A",
    accent: "#4B57DB",
    background: "#FAFAF8",
    surface: "#FFFFFF",
    text: "#111111",
    textMuted: "#6B6B6B",
    border: "#E5E5E0",
  },
  typography: {
    fontFamily: "Geist Sans",
    scale: { xs: "0.75rem", sm: "0.875rem", base: "1rem", lg: "1.125rem", xl: "1.25rem", "2xl": "1.5rem", "3xl": "1.875rem", "4xl": "2.25rem" },
    weights: { normal: 400, medium: 500, semibold: 600, bold: 700 },
    lineHeight: { tight: "1.1", normal: "1.45", relaxed: "1.7" },
  },
  spacing: { unit: 8, scale: { "1": "8px", "2": "16px", "4": "32px", "8": "64px" } },
  radii: { sm: "2px", md: "4px", lg: "6px", xl: "8px", full: "9999px" },
  shadows: { sm: "none", md: "0 8px 24px rgba(0,0,0,.08)", lg: "0 16px 48px rgba(0,0,0,.12)" },
  animation: {
    spring: {
      smooth: { stiffness: 180, damping: 24 },
      snappy: { stiffness: 280, damping: 20 },
      gentle: { stiffness: 120, damping: 28 },
      bouncy: { stiffness: 320, damping: 16 },
    },
  },
};

const sampleAnalysis: CompositionAnalysis = {
  referenceType: "editorial",
  referenceConfidence: "high",
  era: "contemporary",
  analyzedAt: new Date().toISOString(),
  balance: "asymmetric",
  density: "balanced",
  tension: "relaxed",
  keyCompositionalMove: "oversized masthead over full-bleed image",
  spacingSystem: "8px-grid",
  typographicDensity: "image-dominant",
  hierarchyClarity: "obvious",
  displayTypePlacement: "overlapping-imagery",
  lineHeightCharacter: "tight-editorial",
  letterSpacingIntent: "tight-display",
  headingToBodyRatio: "dramatic",
  secondaryTraits: [],
  editorial: {
    textImageRelationship: "overlay",
    typographyPlacement: "over-image",
    pacing: "even",
    whiteSpaceStrategy: "dramatic",
    imageCropping: "full-bleed",
    baselineGridAdherence: "optical",
    typeToMargin: "edge-anchored",
    paragraphSpacing: "line-breaks",
  },
};

const compositionContext = summarizeCompositionsForTaste([
  { analysis: sampleAnalysis, weight: "primary", referenceIndex: 0 },
]);
assert.ok(compositionContext.includes("editorial"), "composition context summarizes analysis");

const prompt = buildDesignTreePrompt(tokens, "Culture event landing page", "Vibe Nights", {
  compositionContext,
  compositionBlueprint: "## COMPOSITION BLUEPRINT\nTest blueprint",
});
assert.match(prompt, /Reference Composition Context/);
assert.match(prompt, /COMPOSITION BLUEPRINT/);

const sampleTree: DesignNode = {
  id: "root",
  type: "frame",
  name: "Page",
  style: {
    display: "flex",
    flexDirection: "column",
    width: 1280,
    background: "#FAFAF8",
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
  },
  children: [
    {
      id: "hero",
      type: "frame",
      name: "Hero",
      style: {
        display: "flex",
        flexDirection: "column",
        padding: { top: 96, right: 64, bottom: 96, left: 64 },
        gap: 24,
      },
      children: [
        {
          id: "headline",
          type: "text",
          name: "Headline",
          content: { text: "Vibe Nights" },
          style: { fontSize: 72, fontWeight: 600, foreground: "#111111" },
        },
        {
          id: "cta",
          type: "button",
          name: "CTA",
          content: { label: "Get tickets" },
          style: { background: "#4B57DB", foreground: "#FFFFFF", padding: { top: 12, right: 20, bottom: 12, left: 20 } },
        },
      ],
    },
  ],
};

async function main() {
const screenshot = await renderDesignNodeScreenshotDataUrl(sampleTree);
if (screenshot) {
  assert.match(screenshot, /^data:image\/png;base64,/);
  console.log("[proof] Screenshot captured:", Math.round(screenshot.length / 1024), "KB data URL");
} else {
  console.warn("[proof] Screenshot skipped (no Chromium) — visual loop will degrade gracefully");
}

const lowScore: TasteFidelityScore = {
  palette: 6,
  typography: 8,
  density: 5,
  structure: 4,
  overall: 5.5,
  justification: "Generic card grid leaked into editorial layout.",
  mode: "benchmark",
  timestamp: new Date().toISOString(),
};
const issues = benchmarkScoreToObservedIssues(lowScore);
assert.ok(issues.some((issue) => /structure|card grid/i.test(issue)));

assert.ok(AGENT_CONTEXT_TOOLS.includes("get_design_contract"));
assert.ok(AGENT_CONTEXT_TOOLS.includes("request_design"));
assert.ok(AGENT_CONTEXT_TOOLS.includes("submit_screenshot_for_review"));

console.log("visual-loop-mcp proof passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
