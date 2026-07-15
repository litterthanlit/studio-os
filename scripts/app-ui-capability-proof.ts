/**
 * Proof gate P6 — App-UI design capability (intent routing + screen-set helpers).
 *
 * Run: npm run proof:app-ui-capability
 */
import assert from "node:assert/strict";
import { extractIntentProfile } from "../types/intent-profile";
import { resolveEffectiveArchetype } from "../lib/canvas/design-tree-prompt";
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

testDashboardIntentRouting();
testLandingPageUnchanged();
testMobileIntentRouting();
testScreenSetContext();
testScreenRoleOnCanvasOps();
testAppStructureUsesScreenRole();
testSummarizeScreenTree();

console.log("\n[proof:app-ui-capability] All assertions passed.");
