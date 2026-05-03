import type { IntentProfile } from "@/types/intent-profile";
import type { TasteProfile } from "@/types/taste-profile";
import type { DesignNode } from "@/lib/canvas/design-node";
import { compileTasteToDirectives } from "@/lib/canvas/directive-compiler";
import { deriveDesignKnobs } from "@/lib/canvas/design-knobs";
import { repairDesignNodeTaste, validateDesignNodeTaste } from "@/lib/canvas/design-node-taste-validator";
import { passesDesignTasteScore, scoreDesignNodeTaste } from "@/lib/canvas/design-node-taste-scorer";
import { detectStructuralTasteEdits } from "@/lib/canvas/structural-edit-tracker";
import type { CompositionAnalysis } from "@/types/composition-analysis";

const editorialTaste: TasteProfile = {
  summary: "Editorial, image-led, restrained.",
  adjectives: ["editorial", "restrained", "cinematic"],
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
    suggestedColors: { background: "#faf9f6", surface: "#f1eee8", text: "#1a1a1a", accent: "#8a6f4d" },
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
  avoid: ["pricing tables", "logo bars", "stats rows", "feature card grids"],
  confidence: 0.9,
  referenceCount: 2,
  dominantReferenceType: "photography",
  warnings: [],
};

const portfolioIntent: IntentProfile = {
  summary: "Designer portfolio.",
  businessGoal: "portfolio",
  outputType: "marketing-site",
  contentPriority: ["work samples", "bio"],
  mustInclude: ["selected work"],
  mustAvoid: ["pricing section unless explicitly requested", "logo bars", "feature cards"],
  referenceRoles: [],
  literalness: "balanced",
  copyTone: "personal and specific",
  successCriteria: ["work has room", "quiet CTAs"],
  userLanguage: "portfolio for an editorial designer",
  confidence: 0.8,
  warnings: [],
};

const editorialIntent: IntentProfile = {
  ...portfolioIntent,
  summary: "Editorial issue landing page.",
  businessGoal: "editorial",
  contentPriority: ["editorial narrative", "photography"],
  mustAvoid: ["pricing", "logo bars", "feature card grids"],
  copyTone: "editorial",
};

const premiumSaasTaste: TasteProfile = {
  ...editorialTaste,
  summary: "Premium SaaS, crisp and conversion-oriented.",
  adjectives: ["premium", "clear", "technical"],
  archetypeMatch: "premium-saas",
  layoutBias: { ...editorialTaste.layoutBias, density: "balanced", rhythm: "uniform", heroStyle: "contained", sectionFlow: "stacked", gridBehavior: "strict", whitespaceIntent: "breathing" },
  imageTreatment: { ...editorialTaste.imageTreatment, style: "product", sizing: "contained", cornerRadius: "rounded", shadow: "subtle" },
  ctaTone: { style: "bold", shape: "subtle-radius", hierarchy: "primary-dominant" },
  avoid: [],
  dominantReferenceType: "ui-screenshot",
};

const palette = ["#faf9f6", "#f1eee8", "#1a1a1a", "#8a6f4d"];

function root(children: DesignNode[]): DesignNode {
  return { id: "root", type: "frame", name: "Page", style: { width: "fill", display: "flex", flexDirection: "column", background: palette[0], foreground: palette[2] }, children };
}

function section(id: string, name: string, children: DesignNode[], extra: DesignNode["style"] = {}): DesignNode {
  return {
    id,
    type: "frame",
    name,
    style: { width: "fill", display: "flex", flexDirection: "column", padding: { top: 96, right: 64, bottom: 96, left: 64 }, background: palette[0], ...extra },
    children,
  };
}

function text(id: string, value: string, fontSize = 18): DesignNode {
  return { id, type: "text", name: value, style: { fontSize, fontFamily: fontSize >= 28 ? "Bespoke Serif" : "Geist Sans", foreground: palette[2] }, content: { text: value } };
}

function editorialGood(): DesignNode {
  return root([
    section("hero", "Hero", [text("h", "A quiet study of form", 72)], { height: 680, coverImage: "photo:editorial", padding: { top: 0, right: 0, bottom: 64, left: 64 } }),
    section("spread", "Editorial Spread", [text("s1", "Feature", 42), text("b1", "Long-form body copy", 16)], { display: "grid", gridTemplate: "3fr 2fr", height: 460 }),
    section("quote", "Pullquote", [text("q", "Design is a matter of attention.", 36)], { background: palette[2], foreground: "#ffffff", height: 260 }),
    section("photo", "Photo Break", [], { height: 500, coverImage: "photo:texture", padding: { top: 0, right: 0, bottom: 0, left: 0 } }),
    section("index", "Story Index", [text("i1", "01 The archive", 24), text("i2", "02 The room", 24)], { height: 380 }),
    section("footer", "Footer", [text("f", "Subscribe ->", 14)], { height: 120 }),
  ]);
}

function editorialBadSaas(): DesignNode {
  return root([
    section("hero", "Hero", [text("h", "Editorial colors, SaaS bones", 48)]),
    section("logos", "Trusted by logo bar", [text("l1", "Logo"), text("l2", "Logo"), text("l3", "Logo")]),
    section("features", "Feature card grid", ["One", "Two", "Three"].map((label) => section(`card-${label}`, `${label} card`, [text(`t-${label}`, label, 22), text(`b-${label}`, "Feature copy", 15)], { borderRadius: 16 })), { display: "grid", gridTemplate: "repeat(3, 1fr)" }),
    section("stats", "Stats", [text("st1", "95%"), text("st2", "3x"), text("st3", "10k+")]),
    section("pricing", "Pricing tiers", [text("p", "$29 / month")]),
  ]);
}

function premiumSaasGood(): DesignNode {
  return root([
    section("hero", "Product hero", [text("h", "Launch better dashboards", 56), { id: "b", type: "button", name: "CTA", style: { background: palette[3], foreground: "#ffffff", borderRadius: 6, padding: { top: 12, right: 20, bottom: 12, left: 20 } }, content: { text: "Start now" } }]),
    section("product", "Product grid", [text("p", "Product screenshot", 28)], { display: "grid", gridTemplate: "2fr 1fr" }),
    section("features", "Feature cards", ["Plan", "Design", "Ship"].map((label) => section(`saas-card-${label}`, `${label} card`, [text(`s-${label}`, label, 22), text(`copy-${label}`, "Clear product value", 15)], { borderRadius: 8 })), { display: "grid", gridTemplate: "repeat(3, 1fr)" }),
    section("proof", "Results", [text("r1", "2x faster"), text("r2", "99% uptime")]),
    section("footer", "Footer", [text("f", "Contact", 14)]),
  ]);
}

function offPalette(): DesignNode {
  const tree = editorialGood();
  tree.children![1].style.background = "#ff00ff";
  tree.children![2].style.background = "#00ff00";
  tree.children![3].style.background = "#0000ff";
  tree.children![4].style.background = "#ffff00";
  tree.children![5].style.background = "#00ffff";
  return tree;
}

function fontMismatch(): DesignNode {
  const tree = editorialGood();
  tree.children!.forEach((section) => {
    section.children?.forEach((child) => {
      if (child.type === "text") child.style.fontFamily = "Arial";
    });
  });
  return tree;
}

function denseMismatch(): DesignNode {
  const tree = editorialGood();
  tree.children!.forEach((section) => {
    section.style.padding = { top: 8, right: 8, bottom: 8, left: 8 };
  });
  return tree;
}

function radiusMismatch(): DesignNode {
  const tree = editorialGood();
  tree.children!.forEach((section) => {
    section.style.borderRadius = 32;
  });
  return tree;
}

function containedImageMismatch(): DesignNode {
  return root([
    section("hero", "Hero", [text("h", "A quiet study of form", 72), { id: "img", type: "image", name: "Tiny image", style: { width: 160, height: 120, objectFit: "contain", borderRadius: 12 }, content: { src: "photo:small", alt: "Small image" } }]),
    section("spread", "Editorial Spread", [text("s1", "Feature", 42), text("b1", "Long-form body copy", 16)]),
    section("quote", "Pullquote", [text("q", "Design is attention.", 36)]),
    section("index", "Story Index", [text("i1", "01 The archive", 24)]),
    section("footer", "Footer", [text("f", "Subscribe ->", 14)]),
  ]);
}

const asymmetricEditorialComposition: CompositionAnalysis = {
  referenceType: "editorial",
  referenceConfidence: "high",
  era: "timeless",
  analyzedAt: new Date(0).toISOString(),
  balance: "asymmetric",
  density: "sparse",
  tension: "tense",
  keyCompositionalMove: "Full-bleed image with edge-anchored type",
  spacingSystem: "organic",
  typographicDensity: "image-dominant",
  hierarchyClarity: "subtle",
  displayTypePlacement: "edge-anchored",
  lineHeightCharacter: "loose-luxe",
  letterSpacingIntent: "tight-display",
  headingToBodyRatio: "dramatic",
  specialLayouts: [{ pattern: "asymmetric-blocks", details: "Offset image and type" }, { pattern: "extreme-whitespace", details: "Large quiet fields" }],
  editorial: {
    textImageRelationship: "overlay",
    typographyPlacement: "over-image",
    whiteSpaceStrategy: "dramatic",
    imageCropping: "full-bleed",
    pacing: "contrasting",
    baselineGridAdherence: "optical",
    typeToMargin: "edge-anchored",
    paragraphSpacing: "extra-leading",
  },
};

const symmetricScreenshotComposition: CompositionAnalysis = {
  ...asymmetricEditorialComposition,
  referenceType: "screenshot",
  balance: "symmetric",
  density: "rich",
  tension: "moderate",
  typographicDensity: "text-heavy",
  displayTypePlacement: "centered",
  headingToBodyRatio: "subtle",
  specialLayouts: [],
  editorial: undefined,
  screenshot: {
    sectionInventory: [],
    gridProportions: ["repeat(3, 1fr)"],
    navigationStyle: "top-bar",
    typeDensityZone: "distributed",
    textBlockWidth: "wide-measure",
    componentSignature: { cornerStyle: "rounded", shadowDepth: "medium", borderUsage: "structural", buttonStyle: "filled" },
  },
};

const cases = [
  { name: "editorial good passes", tree: editorialGood(), taste: editorialTaste, intent: editorialIntent, shouldPass: true },
  { name: "editorial SaaS card output fails", tree: editorialBadSaas(), taste: editorialTaste, intent: editorialIntent, shouldPass: false },
  { name: "premium SaaS good passes", tree: premiumSaasGood(), taste: premiumSaasTaste, intent: null, shouldPass: true },
  { name: "creative portfolio rejects pricing leakage", tree: editorialBadSaas(), taste: { ...editorialTaste, archetypeMatch: "creative-portfolio" }, intent: portfolioIntent, shouldPass: false },
  { name: "off-palette output fails", tree: offPalette(), taste: editorialTaste, intent: editorialIntent, shouldPass: false },
  { name: "font mismatch fails", tree: fontMismatch(), taste: editorialTaste, intent: editorialIntent, shouldPass: false },
  { name: "density mismatch fails", tree: denseMismatch(), taste: editorialTaste, intent: editorialIntent, shouldPass: false },
  { name: "radius mismatch fails", tree: radiusMismatch(), taste: editorialTaste, intent: editorialIntent, shouldPass: false },
  { name: "full-bleed image mismatch fails", tree: containedImageMismatch(), taste: editorialTaste, intent: editorialIntent, shouldPass: false },
];

let failed = false;
for (const item of cases) {
  const knobs = deriveDesignKnobs({ tasteProfile: item.taste, intentProfile: item.intent, fidelityMode: "balanced" });
  const validation = validateDesignNodeTaste({
    tree: item.tree,
    tasteProfile: item.taste,
    intentProfile: item.intent,
    knobVector: knobs,
    directives: compileTasteToDirectives(item.taste, "balanced"),
    fidelityMode: "balanced",
  });
  const score = scoreDesignNodeTaste({ validation, tasteProfile: item.taste, intentProfile: item.intent, knobVector: knobs });
  const passed = validation.passed && passesDesignTasteScore(score, "balanced");
  const ok = passed === item.shouldPass;
  console.log(`${ok ? "PASS" : "FAIL"} ${item.name}: score=${score.overall}, hard=${validation.violations.filter((v) => v.severity === "hard").length}, violations=${validation.violations.length}`);
  if (!ok) failed = true;
}

const mutedKnobs = deriveDesignKnobs({
  tasteProfile: premiumSaasTaste,
  intentProfile: editorialIntent,
  fidelityMode: "balanced",
  compositionData: [{ analysis: asymmetricEditorialComposition, weight: "muted", referenceIndex: 0 }],
});
const primaryKnobs = deriveDesignKnobs({
  tasteProfile: premiumSaasTaste,
  intentProfile: editorialIntent,
  fidelityMode: "balanced",
  compositionData: [{ analysis: asymmetricEditorialComposition, weight: "primary", referenceIndex: 0 }],
});
const mixedKnobs = deriveDesignKnobs({
  tasteProfile: premiumSaasTaste,
  intentProfile: editorialIntent,
  fidelityMode: "balanced",
  compositionData: [
    { analysis: symmetricScreenshotComposition, weight: "default", referenceIndex: 0 },
    { analysis: asymmetricEditorialComposition, weight: "primary", referenceIndex: 1 },
  ],
});
const defaultOnlyKnobs = deriveDesignKnobs({
  tasteProfile: premiumSaasTaste,
  intentProfile: editorialIntent,
  fidelityMode: "balanced",
  compositionData: [{ analysis: symmetricScreenshotComposition, weight: "default", referenceIndex: 0 }],
});
const noCompositionKnobs = deriveDesignKnobs({ tasteProfile: premiumSaasTaste, intentProfile: editorialIntent, fidelityMode: "balanced" });

const metaChecks = [
  { name: "muted references do not affect knobs", ok: mutedKnobs.layout.asymmetry === noCompositionKnobs.layout.asymmetry && mutedKnobs.layout.fullBleedRatio === noCompositionKnobs.layout.fullBleedRatio },
  { name: "primary composition changes knobs", ok: primaryKnobs.layout.asymmetry > noCompositionKnobs.layout.asymmetry && primaryKnobs.layout.fullBleedRatio > noCompositionKnobs.layout.fullBleedRatio },
  { name: "primary reference dominates default reference", ok: mixedKnobs.layout.asymmetry > defaultOnlyKnobs.layout.asymmetry && mixedKnobs.layout.fullBleedRatio > defaultOnlyKnobs.layout.fullBleedRatio },
];

const repairedPalette = repairDesignNodeTaste(offPalette(), validateDesignNodeTaste({
  tree: offPalette(),
  tasteProfile: editorialTaste,
  intentProfile: editorialIntent,
  knobVector: deriveDesignKnobs({ tasteProfile: editorialTaste, intentProfile: editorialIntent, fidelityMode: "balanced" }),
  directives: compileTasteToDirectives(editorialTaste, "balanced"),
  fidelityMode: "balanced",
}), palette);
const repairedColors = new Set<string>();
function collectRepairedColors(node: DesignNode): void {
  if (node.style.background?.startsWith("#")) repairedColors.add(node.style.background.toLowerCase());
  if (node.style.foreground?.startsWith("#")) repairedColors.add(node.style.foreground.toLowerCase());
  if (node.style.borderColor?.startsWith("#")) repairedColors.add(node.style.borderColor.toLowerCase());
  node.children?.forEach(collectRepairedColors);
}
collectRepairedColors(repairedPalette);
metaChecks.push({ name: "palette repair does not flatten colors", ok: repairedColors.size >= 3 });

const structuralSnapshot = editorialBadSaas();
structuralSnapshot.children?.[0].children?.push({ id: "snap-button", type: "button", name: "Secondary CTA", style: { background: palette[3], foreground: "#ffffff", borderRadius: 6 }, content: { text: "Learn more" } });
const structuralCurrent = editorialGood();
structuralCurrent.children?.[0].children?.push(text("current-link", "Learn more ->", 16));
const structuralEdits = detectStructuralTasteEdits(structuralCurrent, structuralSnapshot).map((edit) => edit.dimension);
metaChecks.push({ name: "structural edit detects section removal", ok: structuralEdits.includes("sectionCount") || structuralEdits.includes("sectionRemoved") });
metaChecks.push({ name: "structural edit detects card-grid removal", ok: structuralEdits.includes("cardGridRemoved") });
metaChecks.push({ name: "structural edit detects CTA style change", ok: structuralEdits.includes("buttonToTextLink") });
metaChecks.push({ name: "structural edit detects image scale change", ok: structuralEdits.includes("fullBleedUsage") });

for (const check of metaChecks) {
  console.log(`${check.ok ? "PASS" : "FAIL"} ${check.name}`);
  if (!check.ok) failed = true;
}

if (failed) process.exit(1);
