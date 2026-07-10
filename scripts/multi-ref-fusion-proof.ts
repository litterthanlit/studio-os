/**
 * Proof gate P2 — multi-reference fusion + numeric taste structure.
 *
 * Run: npm run proof:multi-ref-fusion
 */
import assert from "node:assert/strict";
import {
  buildCompositionBlueprint,
  deriveTasteStructureFromCompositions,
  type CompositionInput,
} from "../lib/canvas/composition-blueprint";
import { compileTasteToDirectives } from "../lib/canvas/directive-compiler";
import type { CompositionAnalysis } from "../types/composition-analysis";
import type { TasteProfile } from "../types/taste-profile";

const screenshotAnalysis: CompositionAnalysis = {
  referenceType: "screenshot",
  referenceConfidence: "high",
  era: "contemporary",
  analyzedAt: new Date().toISOString(),
  balance: "symmetric",
  density: "balanced",
  tension: "moderate",
  keyCompositionalMove: "Product hero with feature grid and proof bar",
  spacingSystem: "8px-grid",
  typographicDensity: "balanced",
  hierarchyClarity: "obvious",
  displayTypePlacement: "centered",
  lineHeightCharacter: "balanced-readable",
  letterSpacingIntent: "neutral",
  headingToBodyRatio: "moderate",
  screenshot: {
    sectionInventory: [
      { type: "hero", visualHierarchy: "balanced", heightCharacter: "tall" },
      { type: "features", visualHierarchy: "text-dominant", heightCharacter: "medium" },
    ],
    gridProportions: ["12-col", "3-up cards"],
    navigationStyle: "top-bar",
    typeDensityZone: "hero-heavy",
    textBlockWidth: "wide-measure",
    componentSignature: {
      cornerStyle: "subtle-radius",
      shadowDepth: "subtle",
      borderUsage: "subtle",
      buttonStyle: "filled",
    },
  },
};

const editorialAnalysis: CompositionAnalysis = {
  referenceType: "editorial",
  referenceConfidence: "high",
  era: "contemporary",
  analyzedAt: new Date().toISOString(),
  balance: "asymmetric",
  density: "sparse",
  tension: "relaxed",
  keyCompositionalMove: "Oversized serif headline over restrained whitespace",
  spacingSystem: "organic",
  typographicDensity: "text-heavy",
  hierarchyClarity: "obvious",
  displayTypePlacement: "edge-anchored",
  lineHeightCharacter: "tight-editorial",
  letterSpacingIntent: "tight-display",
  headingToBodyRatio: "dramatic",
  editorial: {
    textImageRelationship: "adjacent",
    typographyPlacement: "above-image",
    whiteSpaceStrategy: "dramatic",
    imageCropping: "full-bleed",
    pacing: "building",
    baselineGridAdherence: "optical",
    typeToMargin: "generous-breathing",
    paragraphSpacing: "line-breaks",
  },
};

const photographAnalysis: CompositionAnalysis = {
  referenceType: "photograph",
  referenceConfidence: "medium",
  era: "timeless",
  analyzedAt: new Date().toISOString(),
  balance: "asymmetric",
  density: "sparse",
  tension: "relaxed",
  keyCompositionalMove: "Warm side-lit portrait with negative space on the left",
  spacingSystem: "organic",
  typographicDensity: "image-dominant",
  hierarchyClarity: "subtle",
  displayTypePlacement: "overlapping-imagery",
  lineHeightCharacter: "loose-luxe",
  letterSpacingIntent: "neutral",
  headingToBodyRatio: "subtle",
  photograph: {
    subjectArchetype: "portrait",
    focalPoint: { x: 0.7, y: 0.35, strength: "strong" },
    compositionType: "rule-of-thirds",
    depthLayers: "shallow",
    colorStory: "warm terracotta and cream",
    lightDirection: "side",
    mood: "intimate and editorial",
  },
};

const threeRefFixture: CompositionInput[] = [
  { analysis: screenshotAnalysis, weight: "primary", referenceIndex: 0 },
  { analysis: editorialAnalysis, weight: "default", referenceIndex: 1 },
  { analysis: photographAnalysis, weight: "default", referenceIndex: 2 },
];

const legacyTaste: TasteProfile = {
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

function countSecondaryInfluenceBlocks(blueprint: string): number {
  const section = blueprint.split("### SECONDARY INFLUENCES")[1];
  if (!section) return 0;
  return section
    .split("\n")
    .filter((line) => /^Ref \d+ \(.+\):/.test(line.trim()))
    .length;
}

function main(): void {
  const blueprint = buildCompositionBlueprint({
    compositions: threeRefFixture,
    fidelityMode: "balanced",
  });

  assert.ok(blueprint.includes("## COMPOSITION BLUEPRINT"), "blueprint includes primary structure block");
  assert.ok(blueprint.includes("### SECONDARY INFLUENCES"), "blueprint includes secondary influences section");
  assert.ok(blueprint.includes("Source: screenshot"), "primary screenshot anchors structure");
  assert.equal(countSecondaryInfluenceBlocks(blueprint), 2, "blueprint includes two secondary influence blocks");
  assert.ok(blueprint.includes("Ref 2 (editorial"), "editorial secondary influence present");
  assert.ok(blueprint.includes("Ref 3 (photograph"), "photograph secondary influence present");
  assert.ok(blueprint.split("\n").length <= 40, "blueprint stays within prompt budget");

  const derived = deriveTasteStructureFromCompositions(threeRefFixture);
  assert.equal(derived.spacingSystem, "8px base");
  assert.equal(derived.typeScale?.display, 56);
  assert.equal(derived.measuredDensity, "balanced");

  const numericTaste: TasteProfile = {
    ...legacyTaste,
    spacingSystem: "8px base",
    typeScale: { display: 88, heading: 48, body: 18 },
    measuredDensity: "balanced",
  };
  const numericDirectives = compileTasteToDirectives(numericTaste, "balanced");
  const hardTypeScale = numericDirectives.hard.find((directive) => directive.dimension === "typeScale");
  const hardSpacing = numericDirectives.hard.find((directive) => directive.dimension === "spacingSystem");
  assert.ok(hardTypeScale, "numeric typeScale emits HARD directive");
  assert.match(hardTypeScale!.rule, /display 88px/);
  assert.match(hardTypeScale!.rule, /heading 48px/);
  assert.ok(hardSpacing, "spacingSystem emits HARD directive");
  assert.match(hardSpacing!.rule, /multiples of 8px/);

  const legacyDirectives = compileTasteToDirectives(legacyTaste, "balanced");
  const legacyTypeScale = [...legacyDirectives.hard, ...legacyDirectives.soft]
    .find((directive) => directive.dimension === "typeScale");
  assert.ok(legacyTypeScale, "legacy profile still emits typeScale directive");
  assert.match(legacyTypeScale!.rule, /Type scale: dramatic/);
  assert.equal(
    legacyDirectives.hard.find((directive) => directive.dimension === "spacingSystem"),
    undefined,
    "legacy profile does not emit spacingSystem HARD directive"
  );

  console.log("P2 proof: multi-ref fusion + numeric taste structure checks passed.");
}

main();
