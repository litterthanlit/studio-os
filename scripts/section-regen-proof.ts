/**
 * Proof gate P3 — section regen returns DesignNode variants.
 *
 * Run: npm run proof:section-regen
 */
import assert from "node:assert/strict";
import { buildDesignTreeSectionPrompt } from "../lib/canvas/design-tree-prompt";
import type { DesignSystemTokens } from "../lib/canvas/generate-system";
import { validateAndNormalizeDesignSectionTree } from "../lib/canvas/design-tree-validator";
import type { DesignNode } from "../lib/canvas/design-node";

const DEV_BASE = process.env.SECTION_REGEN_PROOF_BASE ?? "http://localhost:3000";

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
    scale: {
      xs: "0.75rem",
      sm: "0.875rem",
      base: "1rem",
      lg: "1.125rem",
      xl: "1.25rem",
      "2xl": "1.5rem",
      "3xl": "1.875rem",
      "4xl": "2.25rem",
    },
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

const sampleSection: DesignNode = {
  id: "proof-hero-section",
  type: "frame",
  name: "Hero",
  style: {
    display: "flex",
    flexDirection: "column",
    gap: 24,
    paddingTop: 96,
    paddingBottom: 96,
    paddingLeft: 48,
    paddingRight: 48,
    background: "#FAFAF8",
    width: "fill",
  },
  children: [
    {
      id: "proof-hero-heading",
      type: "text",
      name: "Heading",
      content: "Design with taste.",
      style: {
        fontSize: 56,
        fontWeight: 700,
        lineHeight: 1.05,
        foreground: "#1A1A1A",
      },
    },
    {
      id: "proof-hero-body",
      type: "text",
      name: "Body",
      content: "A refreshed hero section for the proof gate.",
      style: {
        fontSize: 18,
        lineHeight: 1.5,
        foreground: "#6B6B6B",
        maxWidth: 560,
      },
    },
  ],
};

function assertSectionResponseShape(data: unknown): void {
  assert.equal(typeof data, "object");
  assert.ok(data && !Array.isArray(data));
  const body = data as Record<string, unknown>;
  assert.ok(Array.isArray(body.variants), "response must include variants[]");
  assert.ok(body.variants.length > 0, "variants must not be empty");
  const variant = body.variants[0] as Record<string, unknown>;
  assert.ok(variant.pageTree, "variants[0].pageTree must exist");
  assert.equal((variant.pageTree as DesignNode).type, "frame");
  assert.ok(!("code" in body), "legacy TSX response must not be returned for useDesignNode");
}

async function checkDevServer(): Promise<boolean> {
  try {
    await fetch(`${DEV_BASE}/api/canvas/generate-component`, { method: "OPTIONS" });
    return true;
  } catch {
    return false;
  }
}

async function runLiveRouteProof(): Promise<void> {
  const sectionPrompt = buildDesignTreeSectionPrompt(
    tokens,
    "Hero",
    { above: "Navigation header with logo and links", below: "Feature grid with three cards" },
    { intent: "more-like-this", direction: "Refresh the hero copy and spacing." },
  );

  const res = await fetch(`${DEV_BASE}/api/canvas/generate-component`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: sectionPrompt,
      tokens,
      regenerationIntent: "more-like-this",
      useDesignNode: true,
      mode: "single",
    }),
  });

  const text = await res.text();
  assert.ok(res.ok, `section regen route failed (${res.status}): ${text.slice(0, 300)}`);
  const data = JSON.parse(text) as unknown;
  assertSectionResponseShape(data);
}

function runPipelineProof(): void {
  const sectionPrompt = buildDesignTreeSectionPrompt(
    tokens,
    "Hero",
    { above: "Navigation header", below: "Feature grid" },
    { intent: "different-approach" },
  );
  assert.ok(sectionPrompt.includes("SINGLE SECTION"), "section prompt targets single-section output");

  const validated = validateAndNormalizeDesignSectionTree(sampleSection);
  assert.equal(validated.ok, true, validated.ok ? undefined : validated.reason);
  assertSectionResponseShape({
    generationResult: "v6",
    fallbackUsed: false,
    variants: [{ pageTree: sampleSection }],
  });
}

async function main(): Promise<void> {
  runPipelineProof();

  const devServerUp = await checkDevServer();
  if (!devServerUp) {
    console.log("P3 proof: pipeline checks passed; live route check skipped (dev server not running).");
    return;
  }

  if (!process.env.OPENROUTER_API_KEY) {
    console.log("P3 proof: pipeline checks passed; live route check skipped (OPENROUTER_API_KEY missing).");
    return;
  }

  await runLiveRouteProof();
  console.log("P3 proof: pipeline + live section-regen route checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
