import assert from "node:assert/strict";
import {
  buildDesignContract,
  createVisualReview,
  formatDesignContractMarkdown,
} from "../lib/canvas/agent-design-contract";
import type { UnifiedCanvasState } from "../lib/canvas/unified-canvas-state";
import type { DesignSystemTokens } from "../lib/canvas/generate-system";
import type { TasteProfile } from "../types/taste-profile";

const tokens: DesignSystemTokens = {
  colors: {
    primary: "#111111",
    secondary: "#2A2A2A",
    accent: "#FF5A1F",
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

const tasteProfile: TasteProfile = {
  summary: "Editorial event direction with fixed rails, oversized masthead type, and poster-like ticket CTAs.",
  adjectives: ["editorial", "dense", "poster-like"],
  archetypeMatch: "culture-event",
  archetypeConfidence: 0.91,
  layoutBias: {
    density: "dense",
    rhythm: "asymmetric",
    heroStyle: "text-dominant",
    sectionFlow: "editorial-grid",
    gridBehavior: "strict",
    whitespaceIntent: "structural",
  },
  typographyTraits: {
    scale: "dramatic",
    headingTone: "editorial",
    bodyTone: "neutral",
    contrast: "extreme",
    casePreference: "uppercase-headings",
    recommendedPairings: ["Condensed display", "Neutral sans"],
  },
  colorBehavior: {
    mode: "light",
    palette: "neutral-plus-accent",
    accentStrategy: "single-pop",
    saturation: "moderate",
    temperature: "warm",
    suggestedColors: { background: "#FAFAF8", surface: "#FFFFFF", text: "#111111", accent: "#FF5A1F" },
  },
  imageTreatment: {
    style: "editorial",
    sizing: "mixed",
    treatment: "raw",
    cornerRadius: "none",
    borders: true,
    shadow: "none",
    aspectPreference: "mixed",
  },
  ctaTone: { style: "editorial", shape: "sharp", hierarchy: "primary-dominant" },
  avoid: ["generic SaaS card grids", "soft gradient blob backgrounds", "pill CTAs"],
  confidence: 0.86,
  referenceCount: 2,
  dominantReferenceType: "poster",
  warnings: [],
};

const state = {
  schemaVersion: 4,
  viewport: { pan: { x: 0, y: 0 }, zoom: 0.5 },
  components: [],
  activeBreakpoint: "desktop",
  selection: { selectedItemIds: [], activeItemId: "event-home", selectedNodeId: null, selectedNodeIds: [] },
  prompt: {
    value: "Build a culture event app for talks and tickets",
    siteType: "culture-event",
    isOpen: true,
    history: [],
    isGenerating: false,
    agentSteps: [],
    generationResult: null,
  },
  aiPreview: null,
  masterEditSession: null,
  exportArtifact: null,
  variantPreview: null,
  updatedAt: "2026-05-23T00:00:00.000Z",
  items: [
    {
      id: "ref-poster",
      kind: "reference",
      x: 0,
      y: 0,
      width: 240,
      height: 180,
      zIndex: 1,
      locked: false,
      imageUrl: "data:image/png;base64,poster",
      title: "Poster reference",
      source: "upload",
      weight: "primary",
      annotation: "Use for masthead, grid rails, and ticket CTA.",
      extracted: { colors: ["#111111", "#FF5A1F"], fonts: ["Condensed display"], tags: ["poster", "event", "masthead"] },
    },
    {
      id: "event-home",
      kind: "artboard",
      x: 360,
      y: 0,
      width: 1440,
      height: 1200,
      zIndex: 2,
      locked: false,
      siteId: "event-site",
      breakpoint: "desktop",
      name: "Event Home",
      pageTree: {
        id: "root",
        type: "frame",
        name: "Event Home",
        style: { display: "flex", flexDirection: "column", background: "#FAFAF8" },
        children: [
          { id: "hero", type: "frame", name: "Hero", style: { display: "grid", gridTemplate: "repeat(12, 1fr)" }, children: [] },
          { id: "tickets", type: "button", name: "Ticket CTA", style: { borderRadius: 0 }, content: { text: "Get tickets" } },
        ],
      },
    },
  ],
} satisfies Partial<UnifiedCanvasState>;

const contract = buildDesignContract({
  projectId: "event-app",
  projectName: "Vibe Nights",
  state: state as UnifiedCanvasState,
  tasteProfile,
  designTokens: tokens,
  projectContext: {
    brief: "A culture event app for lineup discovery and ticket conversion.",
    stage: "working-prototype",
    targetAudience: "Designers and culture fans",
    appArchetype: "culture-event",
    prototypeUrls: ["https://preview.example.com"],
    screenshots: ["data:image/png;base64,current"],
    references: [],
    brandAssets: [],
    agentSummaries: ["Built in Cursor with a rough landing page and ticket route."],
    constraints: ["Must not feel like a generic SaaS dashboard."],
  },
});

assert.equal(contract.projectIntent.name, "Vibe Nights");
assert.equal(contract.appStructure.appArchetype, "culture-event");
assert.equal(contract.referenceIntent[0]?.referenceId, "ref-poster");
assert.ok(contract.referenceIntent[0]?.preserve.some((item) => /masthead|grid|ticket/i.test(item)));
assert.ok(contract.layoutConstraints.some((item) => /strict|grid|editorial/i.test(item)));
assert.ok(contract.antiPatternChecks.some((check) => check.detectedPatterns.includes("generic SaaS card grids")));
assert.ok(contract.screenDirections.some((screen) => screen.screenId === "event-home" && screen.states.includes("default")));
assert.ok(contract.screenshotCheckpoints.some((checkpoint) => checkpoint.screenId === "event-home"));

const markdown = formatDesignContractMarkdown(contract);
assert.match(markdown, /# Design Contract — Vibe Nights/);
assert.match(markdown, /Reference Intent/);
assert.match(markdown, /Agent Tasks/);
assert.match(markdown, /generic SaaS card grids/);

const review = createVisualReview({
  contract,
  screenId: "event-home",
  sourceScreenshot: "data:image/png;base64,built",
  comparedAgainstArtboard: "event-home",
  observedIssues: ["Agent rebuilt this as equal-width rounded feature cards."],
});

assert.equal(review.passFail, "fail");
assert.ok(review.requiredFixes.some((fix) => /card|grid|rounded|SaaS/i.test(fix)));
assert.match(review.recommendedAgentPrompt, /Update Event Home/);
assert.match(review.recommendedAgentPrompt, /Do not introduce/);

console.log("agent design harness proof passed");
