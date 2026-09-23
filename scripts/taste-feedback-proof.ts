/**
 * Proof gate 0.3 — taste signature, image identity, and corrections that persist.
 *
 * 1. The extraction signature changes with prompt or weights (and order), and is stable otherwise.
 * 2. Refresh keeps userOverrides.
 * 3. A palette edit produces a HARD palette directive (source: user-override).
 * 4. A structural edit changes the serialized knobs (userOverrides.knobs).
 * 5. The generation baseline survives stripCanvasForPersistence and a reload.
 * Plus: every reference is attached with a label, primary/role-bearing at high detail.
 *
 * Run: npm run proof:taste-feedback
 */
import assert from "node:assert/strict";
import type { DesignNode } from "../lib/canvas/design-node";
import type { TasteProfile } from "../types/taste-profile";
import { mergeRefreshedTasteProfile } from "../types/taste-profile";
import {
  buildTasteImageContent,
  buildTasteSignature,
  normalizeTasteReferences,
} from "../lib/canvas/taste-extract-inputs";
import {
  applyTasteEditsToOverrides,
  buildGenerationBaseline,
  detectTasteEditsFromBaseline,
  isGenerationBaseline,
} from "../lib/canvas/taste-edit-tracker";
import { compileTasteToDirectives } from "../lib/canvas/directive-compiler";
import { deriveDesignKnobs } from "../lib/canvas/design-knobs";
import { stripCanvasForPersistence } from "../lib/canvas/canvas-persistence";
import { normalizeRemoteCanvasState } from "../lib/canvas/canvas-convex-sync";
import { createEmptyCanvas, type ArtboardItem } from "../lib/canvas/unified-canvas-state";

const PALETTE = ["#faf9f6", "#f1eee8", "#1a1a1a", "#8a6f4d"];

const taste: TasteProfile = {
  summary: "Editorial, image-led, restrained.",
  adjectives: ["editorial", "restrained"],
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
    recommendedPairings: ["Bespoke Serif", "Geist"],
  },
  colorBehavior: {
    mode: "light",
    palette: "restrained",
    accentStrategy: "no-accent",
    saturation: "desaturated",
    temperature: "warm",
    suggestedColors: { background: PALETTE[0], surface: PALETTE[1], text: PALETTE[2], accent: PALETTE[3] },
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
  avoid: ["pricing tables"],
  confidence: 0.9,
  referenceCount: 2,
  dominantReferenceType: "photography",
  warnings: [],
} as TasteProfile;

function text(id: string, value: string, fontSize = 18, foreground = PALETTE[2]): DesignNode {
  return {
    id,
    type: "text",
    name: value,
    style: { fontSize, fontFamily: fontSize >= 28 ? "Bespoke Serif" : "Geist", foreground },
    content: { text: value },
  };
}

function section(id: string, name: string, children: DesignNode[], extra: DesignNode["style"] = {}): DesignNode {
  return {
    id,
    type: "frame",
    name,
    style: { width: "fill", display: "flex", flexDirection: "column", padding: { top: 96, right: 64, bottom: 96, left: 64 }, background: PALETTE[0], ...extra },
    children,
  };
}

function generatedTree(): DesignNode {
  return {
    id: "root",
    type: "frame",
    name: "Page",
    style: { width: "fill", display: "flex", flexDirection: "column", background: PALETTE[0], foreground: PALETTE[2] },
    children: [
      section("hero", "Hero", [text("h", "A quiet study of form", 72)]),
      section(
        "features",
        "Feature card grid",
        ["One", "Two", "Three"].map((label) =>
          section(`card-${label}`, `${label} card`, [text(`t-${label}`, label, 22), text(`b-${label}`, "Feature copy", 15)], { borderRadius: 16 }),
        ),
        { display: "grid", gridTemplate: "repeat(3, 1fr)" },
      ),
      section("story", "Story", [text("s", "Long-form body copy", 16)]),
    ],
  };
}

function checkSignature() {
  const refs = normalizeTasteReferences({
    references: [
      { id: "ref-a", url: "https://img.example/a.png", weight: "primary", annotation: "typography from here" },
      { id: "ref-b", url: "https://img.example/b.png", weight: "default" },
    ],
    limit: 8,
  });
  const base = { contextVersion: 5, prompt: "Editorial landing page", references: refs, existingTokens: { a: 1 } };
  const sig = buildTasteSignature(base);

  assert.equal(buildTasteSignature({ ...base, references: refs.map((r) => ({ ...r })) }), sig, "stable for identical inputs");
  assert.notEqual(buildTasteSignature({ ...base, prompt: "Portfolio for a photographer" }), sig, "prompt changes the signature");
  assert.notEqual(
    buildTasteSignature({ ...base, references: refs.map((r, i) => (i === 1 ? { ...r, weight: "primary" as const } : r)) }),
    sig,
    "weights change the signature",
  );
  assert.notEqual(buildTasteSignature({ ...base, references: [...refs].reverse() }), sig, "order is not sorted away");

  const legacy = normalizeTasteReferences({
    referenceUrls: ["https://img.example/a.png"],
    referenceWeights: { "https://img.example/a.png": "primary" },
    limit: 8,
  });
  assert.deepEqual(legacy, [{ id: "reference-1", url: "https://img.example/a.png", weight: "primary" }]);
  console.log("[proof] 1. signature covers prompt, weights and order; stable otherwise");
}

function checkImages() {
  const refs = normalizeTasteReferences({
    references: Array.from({ length: 10 }, (_, i) => ({
      id: `ref-${i}`,
      url: `https://img.example/${i}.png`,
      weight: i === 0 ? "primary" : "default",
      role: i === 2 ? "typography" : undefined,
    })),
    limit: 8,
  });
  assert.equal(refs.length, 8, "attaches up to API_LIMITS.maxReferenceUrls (8), not 5");
  const content = buildTasteImageContent(refs);
  const images = content.filter((b) => b.type === "image_url");
  const labels = content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text);
  assert.equal(images.length, 8);
  assert.equal(labels[2], "Image 3 · ref-2 · default · role: typography");
  assert.equal(labels[0], "Image 1 · ref-0 · primary");
  const detail = images.map((b) => (b as { image_url: { detail: string } }).image_url.detail);
  assert.deepEqual(detail, ["high", "low", "high", "low", "low", "low", "low", "low"]);
  console.log("[proof]    images: 8 attached, each labelled; primary + role-bearing at high detail");
}

function checkRefreshKeepsOverrides() {
  const previous: TasteProfile = {
    ...taste,
    userOverrides: { headingFont: "Zodiak", palette: ["#101010", "#f5f0e8"], knobs: { components: { cardGridLikelihood: 0.05 } } },
  };
  const refreshed: TasteProfile = { ...taste, summary: "Refreshed", userOverrides: undefined };
  const merged = mergeRefreshedTasteProfile(previous, refreshed);
  assert.equal(merged.summary, "Refreshed");
  assert.deepEqual(merged.userOverrides?.palette, ["#101010", "#f5f0e8"]);
  assert.equal(merged.userOverrides?.headingFont, "Zodiak");
  assert.equal(merged.userOverrides?.knobs?.components?.cardGridLikelihood, 0.05);
  assert.equal(mergeRefreshedTasteProfile(null, refreshed), refreshed);
  console.log("[proof] 2. refresh keeps userOverrides");
}

function checkPaletteOverride() {
  const baseline = buildGenerationBaseline(generatedTree());
  const edited = generatedTree();
  edited.children![0].style.background = "#101820";
  edited.children![2].style.background = "#f2e8dc";
  edited.children![0].children![0].style.foreground = "#fefefe";

  const edits = detectTasteEditsFromBaseline(edited, baseline);
  assert.ok(edits.some((e) => e.dimension === "palette"), "palette edit detected metric-to-metric");
  const overrides = applyTasteEditsToOverrides(undefined, edits);
  assert.ok(overrides.palette && overrides.palette.includes("#101820"), "palette branch writes userOverrides.palette");

  const directives = compileTasteToDirectives({ ...taste, userOverrides: overrides }, "balanced");
  const hardPalette = directives.hard.find((d) => d.dimension === "palette");
  assert.ok(hardPalette, "HARD palette directive present");
  assert.equal(hardPalette.source, "user-override");
  assert.deepEqual(hardPalette.value, overrides.palette);
  assert.ok(!directives.soft.some((d) => d.dimension === "palette"));
  console.log("[proof] 3. palette edit → HARD palette directive (user-override):", overrides.palette?.join(", "));
}

function checkStructuralKnobs() {
  const baseline = buildGenerationBaseline(generatedTree());
  const edited = generatedTree();
  edited.children = edited.children!.filter((child) => child.id !== "features");

  const edits = detectTasteEditsFromBaseline(edited, baseline);
  assert.ok(edits.some((e) => e.dimension === "cardGridRemoved"), "card-grid removal detected");
  const overrides = applyTasteEditsToOverrides(undefined, edits);
  assert.equal(overrides.knobs?.components?.cardGridLikelihood, 0.05, "structural edit writes userOverrides.knobs");

  const before = JSON.stringify(deriveDesignKnobs({ tasteProfile: taste, fidelityMode: "balanced" }));
  const afterKnobs = deriveDesignKnobs({ tasteProfile: { ...taste, userOverrides: overrides }, fidelityMode: "balanced" });
  assert.notEqual(JSON.stringify(afterKnobs), before, "serialized knobs change");
  assert.equal(afterKnobs.components.cardGridLikelihood, 0.05);

  // Untrusted/persisted knob patches are sanitized.
  const hostile = deriveDesignKnobs({
    tasteProfile: { ...taste, userOverrides: { knobs: { components: { radius: 9 }, color: { mode: "neon" }, bogus: { x: 1 } } as never } },
    fidelityMode: "balanced",
  });
  assert.equal(hostile.components.radius, 1, "numbers clamped to 0–1");
  assert.equal(hostile.color.mode, "light", "invalid enums ignored");
  console.log("[proof] 4. structural edit changes serialized knobs (cardGridLikelihood → 0.05)");
}

function checkBaselinePersists() {
  const tree = generatedTree();
  const artboard: ArtboardItem = {
    id: "artboard-1",
    kind: "artboard",
    x: 0,
    y: 0,
    width: 1440,
    height: 900,
    rotation: 0,
    zIndex: 1,
    locked: false,
    siteId: "site-1",
    breakpoint: "desktop",
    name: "Desktop",
    pageTree: tree,
    generationBaseline: buildGenerationBaseline(tree),
  } as ArtboardItem;
  const state = { ...createEmptyCanvas(), items: [artboard] };

  const persisted = stripCanvasForPersistence(state);
  const reloaded = normalizeRemoteCanvasState(JSON.parse(JSON.stringify(persisted)));
  const reloadedArtboard = reloaded.items.find((i) => i.id === "artboard-1") as ArtboardItem | undefined;
  assert.ok(reloadedArtboard, "artboard survives reload");
  assert.ok(isGenerationBaseline(reloadedArtboard.generationBaseline), "baseline survives strip + reload");
  assert.ok(JSON.stringify(reloadedArtboard.generationBaseline).length < 4096, "baseline stays compact");

  const edited = generatedTree();
  edited.children![0].children![0].style.fontFamily = "Zodiak";
  const edits = detectTasteEditsFromBaseline(edited, reloadedArtboard.generationBaseline!);
  assert.ok(edits.some((e) => e.dimension === "headingFont" && e.after === "Zodiak"), "edits detected after reload");
  console.log("[proof] 5. generation baseline survives stripCanvasForPersistence + reload; edits still detected");
}

checkSignature();
checkImages();
checkRefreshKeepsOverrides();
checkPaletteOverride();
checkStructuralKnobs();
checkBaselinePersists();
console.log("taste-feedback proof passed");
