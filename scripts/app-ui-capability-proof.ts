/**
 * Proof gate P6 — App-UI design capability (intent routing + screen-set helpers).
 *
 * Run: npm run proof:app-ui-capability
 */
import assert from "node:assert/strict";
import { extractIntentProfile } from "../types/intent-profile";
import {
  buildDesignTreePrompt,
  buildFrameForArchetype,
  resolveEffectiveArchetype,
} from "../lib/canvas/design-tree-prompt";
import { compileTasteToDirectives } from "../lib/canvas/directive-compiler";
import { deriveDesignKnobs } from "../lib/canvas/design-knobs";
import { validateDesignNodeTaste } from "../lib/canvas/design-node-taste-validator";
import type { DesignSystemTokens } from "../lib/canvas/generate-system";
import type { TasteProfile } from "../types/taste-profile";
import {
  applyCanvasAgentOperations,
  buildCanvasSummary,
} from "../lib/agent/canvas-agent-ops";
import { buildDesignContract } from "../lib/canvas/agent-design-contract";
import { createEmptyCanvas } from "../lib/canvas/unified-canvas-state";
import type { DesignNode } from "../lib/canvas/design-node";
import {
  buildScreenSetContext,
  summarizeScreenTree,
  type AppScreenPlanItem,
} from "../lib/canvas/screen-context-builder";

const sampleTree: DesignNode = {
  id: "app-root",
  type: "frame",
  name: "App Shell",
  style: { display: "flex", flexDirection: "row", width: 1440, height: 900 },
  children: [
    {
      id: "sidebar",
      type: "frame",
      name: "Sidebar",
      style: { width: 240, display: "flex", flexDirection: "column" },
      children: [],
    },
    {
      id: "main",
      type: "frame",
      name: "Main",
      style: { display: "flex", flexDirection: "column", flexGrow: 1 },
      children: [],
    },
  ],
};

function testDashboardIntentRouting() {
  const intent = extractIntentProfile({ prompt: "analytics dashboard for a fitness app" });
  assert.equal(intent.outputType, "web-app-ui");
  assert.equal(
    resolveEffectiveArchetype({ intentProfile: intent, prompt: "analytics dashboard for a fitness app" }),
    "app-dashboard",
  );
  console.log("[proof] Dashboard prompt → app-dashboard grammar");
}

function testLandingPageUnchanged() {
  const intent = extractIntentProfile({ prompt: "landing page for a SaaS startup" });
  assert.equal(intent.outputType, "marketing-site");
  assert.equal(
    resolveEffectiveArchetype({ tasteArchetype: "premium-saas", intentProfile: intent }),
    "premium-saas",
  );
  console.log("[proof] Landing page prompt → premium-saas (unchanged)");
}

function testMobileIntentRouting() {
  const intent = extractIntentProfile({ prompt: "mobile app onboarding with tab bar" });
  assert.equal(intent.outputType, "mobile-app-ui");
  assert.equal(
    resolveEffectiveArchetype({ intentProfile: intent, prompt: "mobile app onboarding with tab bar" }),
    "app-mobile",
  );
  console.log("[proof] Mobile app prompt → app-mobile grammar");
}

function testScreenSetContext() {
  const plan: AppScreenPlanItem[] = [
    { id: "settings", name: "Settings", screenRole: "settings", purpose: "Account prefs", keyElements: ["profile", "notifications"] },
    { id: "billing", name: "Billing", screenRole: "billing", purpose: "Plans and invoices", keyElements: ["plan card", "invoice table"] },
  ];
  const context = buildScreenSetContext({
    plan,
    currentIndex: 1,
    generatedSummaries: [{ name: "Settings", summary: "Sidebar + settings form" }],
  });
  assert.ok(context.includes("Billing"));
  assert.ok(context.includes("Shared shell rules"));
  assert.ok(context.includes("Settings"));
  console.log("[proof] Screen-set context includes shell rules and siblings");
}

function testScreenRoleOnCanvasOps() {
  const state = createEmptyCanvas();
  const { state: next, applied } = applyCanvasAgentOperations(state, [
    {
      type: "add_artboard",
      name: "Settings",
      breakpoint: "desktop",
      tree: sampleTree,
      screenRole: "settings",
      screenPurpose: "Account and notification preferences",
    },
  ]);
  assert.equal(applied.length, 1);
  const summary = buildCanvasSummary(next);
  assert.equal(summary.artboards[0]?.screenRole, "settings");
  assert.equal(summary.artboards[0]?.screenPurpose, "Account and notification preferences");
  console.log("[proof] Canvas ops persist screenRole metadata");
}

function testAppStructureUsesScreenRole() {
  const state = createEmptyCanvas();
  const { state: next } = applyCanvasAgentOperations(state, [
    {
      type: "add_artboard",
      name: "Team Members",
      breakpoint: "desktop",
      tree: sampleTree,
      screenRole: "members",
      screenPurpose: "Invite and manage team members",
    },
  ]);
  const contract = buildDesignContract({
    projectId: "proof-project",
    projectName: "Proof App",
    state: next,
  });
  assert.equal(contract.appStructure.screens[0]?.routeId, "members");
  assert.ok(
    contract.screenDirections[0]?.purpose.includes("Invite and manage team members"),
  );
  console.log("[proof] Design contract uses authored screen metadata");
}

function testSummarizeScreenTree() {
  const summary = summarizeScreenTree(sampleTree);
  assert.ok(summary.includes("Sidebar"));
  assert.ok(summary.includes("Main"));
  console.log("[proof] Screen tree summary:", summary);
}

// ── 0.8: in-app prompt frame + status colors ─────────────────────────────

const PALETTE = ["#FAFAF8", "#FFFFFF", "#1A1A1A", "#4B57DB"];

const appTaste = {
  summary: "Calm, precise product UI.",
  adjectives: ["calm", "precise"],
  archetypeMatch: "premium-saas",
  archetypeConfidence: 0.8,
  layoutBias: { density: "balanced", rhythm: "asymmetric", heroStyle: "full-bleed", sectionFlow: "editorial-grid", gridBehavior: "strict", whitespaceIntent: "dramatic" },
  typographyTraits: { scale: "moderate", headingTone: "neutral", bodyTone: "technical", contrast: "moderate", casePreference: "mixed", recommendedPairings: ["Geist", "Geist"] },
  colorBehavior: {
    mode: "light", palette: "restrained", accentStrategy: "single-accent", saturation: "muted", temperature: "cool",
    suggestedColors: { background: PALETTE[0], surface: PALETTE[1], text: PALETTE[2], accent: PALETTE[3] },
  },
  imageTreatment: { style: "product", sizing: "contained", treatment: "raw", cornerRadius: "subtle", borders: true, shadow: "none", aspectPreference: "mixed" },
  ctaTone: { style: "product", shape: "rounded", hierarchy: "primary-dominant" },
  avoid: ["decorative gradients"],
  confidence: 0.8,
  referenceCount: 2,
  dominantReferenceType: "ui-screenshot",
  warnings: [],
} as unknown as TasteProfile;

const proofTokens = {
  colors: { primary: PALETTE[2], secondary: PALETTE[1], accent: PALETTE[3], background: PALETTE[0], surface: PALETTE[1], text: PALETTE[2], textMuted: "#6B6B6B", border: "#E5E5E0" },
  typography: { fontFamily: "Geist", scale: {}, weights: {} },
  spacing: {},
  radii: {},
  shadows: {},
} as unknown as DesignSystemTokens;

function testAppPromptFrame() {
  const cases: Array<{ prompt: string; breakpoint: "desktop" | "mobile" }> = [
    { prompt: "Billing settings screen for a SaaS dashboard app", breakpoint: "desktop" },
    { prompt: "Onboarding flow for an iOS habit tracker", breakpoint: "mobile" },
  ];
  for (const { prompt, breakpoint } of cases) {
    const intentProfile = extractIntentProfile({ prompt });
    for (const tasteProfile of [null, appTaste]) {
      const text = buildDesignTreePrompt(proofTokens, prompt, "Acme", { intentProfile, tasteProfile, breakpoint });
      assert.ok(text.startsWith("You are a senior product designer composing an in-app screen"), `${prompt}: in-app frame`);
      assert.doesNotMatch(text, /landing page/i, `${prompt}: no "landing page"`);
      assert.doesNotMatch(text, /4-7 sections/i, `${prompt}: no "4-7 sections"`);
      assert.doesNotMatch(text, /section count:/i, `${prompt}: no knob section count`);
      assert.doesNotMatch(text, /\*\*PACING\*\*|Hero: 600-720px|\[heroStyle\]|\[sectionFlow\]/, `${prompt}: no hero or pacing rules`);
      assert.match(text, /2fr 1fr 1fr 1fr/, `${prompt}: table grid tracks`);
      assert.match(text, /\*\*Empty state\*\*[\s\S]*\*\*Loading state\*\*[\s\S]*\*\*Error state\*\*/, `${prompt}: empty/loading/error patterns`);
      assert.match(text, /\[statusColors\] Status colors are allowed ONLY on status UI/, `${prompt}: SOFT status-color directive`);
    }
  }

  const marketing = buildDesignTreePrompt(proofTokens, "Landing page for a neighborhood bakery", "Crumb", {
    intentProfile: extractIntentProfile({ prompt: "Landing page for a neighborhood bakery" }),
    tasteProfile: appTaste,
  });
  assert.ok(marketing.startsWith("You are a senior editorial designer composing a landing page"));
  assert.match(marketing, /Choose 4-7 sections/);
  assert.doesNotMatch(marketing, /\[statusColors\]/);
  assert.equal(buildFrameForArchetype("app-dashboard").kind, "app");
  assert.equal(buildFrameForArchetype("editorial-brand").kind, "marketing");
  console.log("[proof] App prompts use the in-app frame (no landing page / 4-7 sections / hero / pacing); marketing unchanged");
}

function statusTree(badgeName: string): DesignNode {
  return {
    id: "app-root",
    type: "frame",
    name: "App Shell",
    style: { display: "flex", flexDirection: "column", background: PALETTE[0], foreground: PALETTE[2] },
    children: [
      {
        id: "content",
        type: "frame",
        name: "Content",
        style: { display: "flex", flexDirection: "column", gap: 16, background: PALETTE[1] },
        children: [
          {
            id: "badge",
            type: "frame",
            name: badgeName,
            style: { background: "#E3F4EA", borderColor: "#2E9A63", borderWidth: 1, borderRadius: 4 },
            children: [{ id: "badge-text", type: "text", name: "Label", style: { foreground: "#1F7A4C", fontSize: 12 }, content: { text: "Paid" } }],
          },
          {
            id: "alert",
            type: "frame",
            name: badgeName.replace("success · Paid", "danger · Payment failed"),
            style: { background: "#FBE9E9", borderColor: "#D14343", borderWidth: 1 },
            children: [{ id: "alert-text", type: "text", name: "Message", style: { foreground: "#A12D2D", fontSize: 14 }, content: { text: "Card declined" } }],
          },
        ],
      },
    ],
  };
}

function testStatusColorsPassOnStatusNodes() {
  const intentProfile = extractIntentProfile({ prompt: "Billing settings screen for a SaaS dashboard app" });
  const knobVector = deriveDesignKnobs({ tasteProfile: appTaste, intentProfile, fidelityMode: "balanced" });
  const directives = compileTasteToDirectives(appTaste, "balanced", { appScreen: true });
  const validate = (tree: DesignNode) =>
    validateDesignNodeTaste({ tree, tasteProfile: appTaste, intentProfile, knobVector, directives, fidelityMode: "balanced" });

  const tagged = validate(statusTree("Status: success · Paid"));
  assert.equal(tagged.metrics.offPaletteColors.length, 0, "status-tagged nodes are exempt from palette checks");
  assert.ok(!tagged.violations.some((v) => v.dimension === "palette"), "no palette violation for status UI");

  const untagged = validate(statusTree("Paid badge"));
  assert.ok(untagged.violations.some((v) => v.dimension === "palette"), "the same colors off status UI still violate the palette");
  console.log("[proof] Status colors pass on status-tagged nodes; still flagged elsewhere");
}

testDashboardIntentRouting();
testLandingPageUnchanged();
testMobileIntentRouting();
testScreenSetContext();
testScreenRoleOnCanvasOps();
testAppStructureUsesScreenRole();
testSummarizeScreenTree();
testAppPromptFrame();
testStatusColorsPassOnStatusNodes();

console.log("\n[proof:app-ui-capability] All assertions passed.");
