import type { IntentProfile } from "@/types/intent-profile";
import type { TasteProfile } from "@/types/taste-profile";
import type { DesignNode, DesignNodeStyle } from "./design-node";
import { walkDesignTree } from "./design-node";
import type { CompiledDirectives, FidelityMode } from "./directive-compiler";
import type { DesignKnobVector } from "./design-knobs";

export type DesignTasteViolation = {
  severity: "hard" | "soft";
  dimension: "palette" | "structure" | "typography" | "imagery" | "cta" | "components" | "intent";
  message: string;
  repair?: "replace-with-nearest-palette" | "regenerate-section" | "increase-heading-scale" | "convert-secondary-buttons-to-links" | "reduce-chrome" | "adjust-spacing";
};

export type DesignNodeTasteMetrics = {
  sectionCount: number;
  averageSectionPadding: number;
  sectionHeightVariance: number;
  colorPaletteUsed: string[];
  offPaletteColors: string[];
  offPaletteCount: number;
  offPaletteMajorRoleCount: number;
  headingFonts: string[];
  bodyFonts: string[];
  typeScaleMax: number;
  typeScaleMin: number;
  typeScaleRatio: number;
  imageNodeCount: number;
  coverImageSectionCount: number;
  fullBleedSectionCount: number;
  buttonCount: number;
  textLinkCount: number;
  cardGridCount: number;
  statsPatternCount: number;
  logoBarCount: number;
  pricingPatternCount: number;
  testimonialPatternCount: number;
  iconRowCount: number;
  averageRadius: number;
  shadowUsageCount: number;
  layoutModes: { flex: number; grid: number; absolute: number };
};

type ColorRole = "background" | "surface" | "text" | "accent" | "border";

type ColorObservation = {
  color: string;
  role: ColorRole;
  major: boolean;
};

export type DesignTasteValidationResult = {
  passed: boolean;
  score: number;
  violations: DesignTasteViolation[];
  repairable: boolean;
  metrics: DesignNodeTasteMetrics;
};

export function computeDesignNodeTasteMetrics(tree: DesignNode, palette: string[] = []): DesignNodeTasteMetrics {
  const sections = tree.children ?? [];
  const sectionPadding = sections.map((section) => averagePadding(section.style.padding)).filter((value) => value > 0);
  const sectionHeights = sections.map((section) => numericHeight(section.style.height)).filter((value): value is number => typeof value === "number");
  const colors = new Set<string>();
  const colorObservations: ColorObservation[] = [];
  const headingFonts = new Set<string>();
  const bodyFonts = new Set<string>();
  const fontSizes: number[] = [];
  const radii: number[] = [];
  const layoutModes = { flex: 0, grid: 0, absolute: 0 };

  let imageNodeCount = 0;
  let coverImageSectionCount = 0;
  let fullBleedSectionCount = 0;
  let buttonCount = 0;
  let textLinkCount = 0;
  let shadowUsageCount = 0;
  let cardGridCount = 0;
  let statsPatternCount = 0;
  let logoBarCount = 0;
  let pricingPatternCount = 0;
  let testimonialPatternCount = 0;
  let iconRowCount = 0;

  for (const section of sections) {
    const nameText = nodeSearchText(section);
    if (section.style.coverImage) coverImageSectionCount++;
    if (isFullBleedSection(section)) fullBleedSectionCount++;
    if (isCardGrid(section)) cardGridCount++;
    if (isStatsPattern(section, nameText)) statsPatternCount++;
    if (isLogoBar(section, nameText)) logoBarCount++;
    if (/\b(pricing|price|tier|plan)\b/i.test(nameText)) pricingPatternCount++;
    if (/\b(testimonial|customer|review|quote)\b/i.test(nameText)) testimonialPatternCount++;
    if (isIconRow(section)) iconRowCount++;
  }

  walkDesignTree(tree, (node) => {
    collectStyleColors(node, colors, colorObservations);
    if (node.type === "image") imageNodeCount++;
    if (node.type === "button") buttonCount++;
    if (node.type === "text" && (node.style.textDecoration === "underline" || /→|learn more|view|read|contact/i.test(node.content?.text ?? ""))) textLinkCount++;
    if (node.style.display === "flex") layoutModes.flex++;
    if (node.style.display === "grid") layoutModes.grid++;
    if (node.style.position === "absolute") layoutModes.absolute++;
    if (node.style.shadow || node.style.effects?.some((effect) => effect.enabled !== false && (effect.type === "dropShadow" || effect.type === "innerShadow"))) shadowUsageCount++;
    const radius = parseRadius(node.style.borderRadius);
    if (radius !== null) radii.push(radius);
    if (typeof node.style.fontSize === "number") {
      fontSizes.push(node.style.fontSize);
      if (node.style.fontSize >= 28 && node.style.fontFamily) headingFonts.add(node.style.fontFamily);
      if (node.style.fontSize >= 12 && node.style.fontSize <= 18 && node.style.fontFamily) bodyFonts.add(node.style.fontFamily);
    }
  });

  const colorPaletteUsed = Array.from(colors);
  const normalizedPalette = palette.map(normalizeColor).filter(Boolean);
  const offPaletteObservations = normalizedPalette.length > 0
    ? colorObservations.filter((entry) => !isAllowedPaletteException(entry) && !normalizedPalette.includes(normalizeColor(entry.color)))
    : [];
  const offPaletteColors = normalizedPalette.length > 0
    ? Array.from(new Set(offPaletteObservations.map((entry) => normalizeColor(entry.color))))
    : [];
  const offPaletteMajorRoleCount = offPaletteObservations.filter((entry) => entry.major).length;
  const typeScaleMax = fontSizes.length ? Math.max(...fontSizes) : 0;
  const typeScaleMin = fontSizes.length ? Math.min(...fontSizes) : 0;

  return {
    sectionCount: sections.length,
    averageSectionPadding: avg(sectionPadding),
    sectionHeightVariance: variance(sectionHeights),
    colorPaletteUsed,
    offPaletteColors,
    offPaletteCount: offPaletteObservations.length,
    offPaletteMajorRoleCount,
    headingFonts: Array.from(headingFonts),
    bodyFonts: Array.from(bodyFonts),
    typeScaleMax,
    typeScaleMin,
    typeScaleRatio: typeScaleMin > 0 ? typeScaleMax / typeScaleMin : 0,
    imageNodeCount,
    coverImageSectionCount,
    fullBleedSectionCount,
    buttonCount,
    textLinkCount,
    cardGridCount,
    statsPatternCount,
    logoBarCount,
    pricingPatternCount,
    testimonialPatternCount,
    iconRowCount,
    averageRadius: avg(radii),
    shadowUsageCount,
    layoutModes,
  };
}

export function validateDesignNodeTaste(args: {
  tree: DesignNode;
  tasteProfile: TasteProfile | null;
  intentProfile: IntentProfile | null;
  knobVector: DesignKnobVector;
  directives: CompiledDirectives;
  fidelityMode: FidelityMode;
}): DesignTasteValidationResult {
  const palette = args.knobVector.color.palette;
  const metrics = computeDesignNodeTasteMetrics(args.tree, palette);
  const violations: DesignTasteViolation[] = [];
  const hardAvoids = [...(args.tasteProfile?.avoid ?? []), ...(args.intentProfile?.mustAvoid ?? []), ...args.directives.avoid.map((d) => String(d.value))].join(" ").toLowerCase();
  const editorialIntent = isEditorialLike(args.tasteProfile, args.intentProfile);
  const portfolioIntent = args.intentProfile?.businessGoal === "portfolio" || args.tasteProfile?.archetypeMatch === "creative-portfolio";
  const expectedHeadingFont = stringDirective(args.directives.hard, "headingFont") ?? args.tasteProfile?.userOverrides?.headingFont ?? args.tasteProfile?.typographyTraits.recommendedPairings[0];
  const expectedBodyFont = stringDirective(args.directives.hard, "bodyFont") ?? args.tasteProfile?.userOverrides?.bodyFont ?? args.tasteProfile?.typographyTraits.recommendedPairings[1];
  const targetPadding = targetPaddingForDensity(args.knobVector.layout.density);
  const targetRadius = targetRadiusForKnob(args.knobVector.components.radius);

  if (metrics.sectionCount < args.knobVector.layout.sectionCount.min || metrics.sectionCount > args.knobVector.layout.sectionCount.max) {
    violations.push({ severity: "soft", dimension: "structure", message: `Section count ${metrics.sectionCount} outside target ${args.knobVector.layout.sectionCount.min}-${args.knobVector.layout.sectionCount.max}`, repair: "regenerate-section" });
  }

  if (metrics.offPaletteMajorRoleCount > 0 || metrics.offPaletteColors.length > 2) {
    violations.push({ severity: "hard", dimension: "palette", message: `Uses ${metrics.offPaletteColors.length} off-palette colors (${metrics.offPaletteMajorRoleCount} major role uses)`, repair: "replace-with-nearest-palette" });
  }

  if (expectedHeadingFont && metrics.headingFonts.length > 0 && !metrics.headingFonts.some((font) => fontMatches(font, expectedHeadingFont))) {
    violations.push({ severity: "hard", dimension: "typography", message: `Heading font misses expected ${expectedHeadingFont}`, repair: "regenerate-section" });
  }

  if (expectedBodyFont && metrics.bodyFonts.length > 0 && !metrics.bodyFonts.some((font) => fontMatches(font, expectedBodyFont))) {
    violations.push({ severity: args.fidelityMode === "close" ? "hard" : "soft", dimension: "typography", message: `Body font misses expected ${expectedBodyFont}`, repair: "regenerate-section" });
  }

  if (metrics.averageSectionPadding > 0 && metrics.averageSectionPadding < targetPadding.min) {
    violations.push({ severity: args.fidelityMode === "push" ? "soft" : "hard", dimension: "structure", message: `Average section padding ${Math.round(metrics.averageSectionPadding)}px below target ${targetPadding.min}px`, repair: "adjust-spacing" });
  }

  if (metrics.averageSectionPadding > 0 && metrics.averageSectionPadding > targetPadding.max) {
    violations.push({ severity: "soft", dimension: "structure", message: `Average section padding ${Math.round(metrics.averageSectionPadding)}px above target ${targetPadding.max}px`, repair: "adjust-spacing" });
  }

  if (metrics.averageRadius > 0 && (metrics.averageRadius < targetRadius.min || metrics.averageRadius > targetRadius.max)) {
    const severeRadiusMiss = metrics.averageRadius > targetRadius.max * 2 || metrics.averageRadius + 4 < targetRadius.min;
    violations.push({ severity: args.fidelityMode === "close" || severeRadiusMiss ? "hard" : "soft", dimension: "components", message: `Average radius ${Math.round(metrics.averageRadius)}px outside target ${targetRadius.min}-${targetRadius.max}px`, repair: "reduce-chrome" });
  }

  if ((editorialIntent || portfolioIntent) && metrics.cardGridCount > 0 && args.knobVector.components.cardGridLikelihood < 0.25) {
    violations.push({ severity: "hard", dimension: "structure", message: "Editorial/portfolio intent but card grid detected", repair: "regenerate-section" });
  }

  if ((editorialIntent || portfolioIntent) && (metrics.statsPatternCount + metrics.logoBarCount + metrics.pricingPatternCount + metrics.iconRowCount) > 0) {
    violations.push({ severity: "hard", dimension: "intent", message: "SaaS boilerplate pattern leaked into editorial/portfolio output", repair: "regenerate-section" });
  }

  if (portfolioIntent && metrics.testimonialPatternCount > 0) {
    violations.push({ severity: "hard", dimension: "intent", message: "Portfolio output contains testimonial pattern", repair: "regenerate-section" });
  }

  if (args.knobVector.layout.fullBleedRatio >= 0.35 && metrics.fullBleedSectionCount === 0 && metrics.coverImageSectionCount === 0) {
    violations.push({ severity: "hard", dimension: "imagery", message: "Image-led/full-bleed target has no full-bleed imagery", repair: "regenerate-section" });
  }

  if (args.tasteProfile?.imageTreatment.sizing === "contained" && metrics.fullBleedSectionCount > Math.max(1, metrics.sectionCount * 0.4)) {
    violations.push({ severity: "soft", dimension: "imagery", message: "Contained image treatment has too many full-bleed sections", repair: "regenerate-section" });
  }

  if (args.tasteProfile?.imageTreatment.sizing === "thumbnail-grid" && metrics.cardGridCount === 0 && metrics.imageNodeCount < 3) {
    violations.push({ severity: "soft", dimension: "imagery", message: "Thumbnail-grid image treatment lacks image grid", repair: "regenerate-section" });
  }

  if (args.knobVector.components.ctaProminence <= 0.3 && metrics.buttonCount > Math.max(1, metrics.textLinkCount)) {
    violations.push({ severity: args.fidelityMode === "close" ? "hard" : "soft", dimension: "cta", message: "Text-link preferred but filled buttons dominate", repair: "convert-secondary-buttons-to-links" });
  }

  if (args.tasteProfile?.ctaTone.shape === "sharp" && metrics.averageRadius > 10 && metrics.buttonCount > 0) {
    violations.push({ severity: "soft", dimension: "cta", message: "Sharp CTA target but rounded controls dominate", repair: "reduce-chrome" });
  }

  if (args.tasteProfile?.ctaTone.hierarchy === "primary-dominant" && metrics.buttonCount === 0) {
    violations.push({ severity: "soft", dimension: "cta", message: "Primary CTA target but no button CTA found", repair: "regenerate-section" });
  }

  if (args.knobVector.typography.scaleContrast >= 0.75 && metrics.typeScaleRatio > 0 && metrics.typeScaleRatio < 3) {
    violations.push({ severity: "soft", dimension: "typography", message: "Type scale ratio lower than target", repair: "increase-heading-scale" });
  }

  if (args.knobVector.components.shadowDepth <= 0.2 && metrics.shadowUsageCount > 3) {
    violations.push({ severity: "soft", dimension: "components", message: "Shadow usage is heavier than target", repair: "reduce-chrome" });
  }

  for (const avoid of ["pricing", "logo", "stats", "feature grid", "card grid", "testimonial"]) {
    if (hardAvoids.includes(avoid) && patternMetric(metrics, avoid) > 0) {
      violations.push({ severity: "hard", dimension: "intent", message: `Avoid-list leak detected: ${avoid}`, repair: "regenerate-section" });
    }
  }

  const hardCount = violations.filter((violation) => violation.severity === "hard").length;
  const score = Math.max(0, 1 - hardCount * 0.22 - (violations.length - hardCount) * 0.08);
  return {
    passed: hardCount === 0 && score >= 0.72,
    score,
    violations,
    repairable: violations.every((violation) => violation.repair && violation.repair !== "regenerate-section"),
    metrics,
  };
}

export function repairDesignNodeTaste(tree: DesignNode, result: DesignTasteValidationResult, palette: string[]): DesignNode {
  const next = structuredClone(tree);
  const shouldReduceChrome = result.violations.some((v) => v.repair === "reduce-chrome");
  const shouldConvertButtons = result.violations.some((v) => v.repair === "convert-secondary-buttons-to-links");
  const shouldAdjustSpacing = result.violations.some((v) => v.repair === "adjust-spacing");
  walkDesignTree(next, (node) => {
    if (palette.length > 0) {
      if (node.style.background) node.style.background = nearestPaletteColor(node.style.background, palette, node.type === "button" ? "accent" : "background");
      if (node.style.foreground) node.style.foreground = nearestPaletteColor(node.style.foreground, palette, "text");
      if (node.style.borderColor) node.style.borderColor = nearestPaletteColor(node.style.borderColor, palette, "border");
      if (node.style.accent) node.style.accent = nearestPaletteColor(node.style.accent, palette, "accent");
      if (node.style.muted) node.style.muted = nearestPaletteColor(node.style.muted, palette, "surface");
    }
    if (shouldReduceChrome) {
      delete node.style.shadow;
      node.style.effects = node.style.effects?.filter((effect) => effect.type !== "dropShadow" && effect.type !== "innerShadow");
      if (typeof node.style.borderRadius === "number") node.style.borderRadius = Math.min(node.style.borderRadius, 8);
    }
    if (shouldConvertButtons && node.type === "button" && !/primary|hero/i.test(node.name)) {
      node.type = "text";
      node.style.background = "transparent";
      node.style.borderWidth = 0;
      node.style.textDecoration = "underline";
    }
    if (shouldAdjustSpacing && node.style.padding) {
      node.style.padding = scalePadding(node.style.padding, 1.15);
    }
  });
  return next;
}

export function buildTasteRetryPrompt(result: DesignTasteValidationResult): string {
  return [
    "The generated DesignNode tree failed deterministic taste validation.",
    "Regenerate the full tree while preserving the brief, but fix these issues:",
    ...result.violations.map((violation) => `- [${violation.severity}/${violation.dimension}] ${violation.message}`),
    "Return only valid DesignNode JSON.",
  ].join("\n");
}

function isEditorialLike(taste: TasteProfile | null, intent: IntentProfile | null): boolean {
  return intent?.businessGoal === "editorial" ||
    taste?.archetypeMatch === "editorial-brand" ||
    taste?.layoutBias.sectionFlow === "editorial-grid" ||
    taste?.imageTreatment.style === "editorial";
}

function isCardGrid(node: DesignNode): boolean {
  const children = node.children ?? [];
  const grid = node.style.display === "grid" && /repeat\((3|4),\s*1fr\)|1fr\s+1fr\s+1fr/.test(String(node.style.gridTemplate ?? ""));
  const cardLikeChildren = children.filter((child) => (child.children?.length ?? 0) >= 2 && (parseRadius(child.style.borderRadius) ?? 0) >= 6).length;
  return grid && children.length >= 3 && cardLikeChildren >= 2;
}

function isStatsPattern(node: DesignNode, text: string): boolean {
  return /\b(stats|metrics|numbers|results)\b/i.test(text) || ((node.children ?? []).filter((child) => /\d+[%+x]?\b/.test(nodeSearchText(child))).length >= 3);
}

function isLogoBar(node: DesignNode, text: string): boolean {
  return /\b(trusted by|logos?|partners?)\b/i.test(text) && (node.children?.length ?? 0) >= 3;
}

function isIconRow(node: DesignNode): boolean {
  return (node.children ?? []).filter((child) => child.content?.icon || /icon/i.test(child.name)).length >= 3;
}

function isFullBleedSection(node: DesignNode): boolean {
  const p = node.style.padding;
  const horizontalPadding = (p?.left ?? 0) + (p?.right ?? 0);
  return Boolean(node.style.coverImage) && horizontalPadding <= 16;
}

function nodeSearchText(node: DesignNode): string {
  const parts: string[] = [node.name, node.content?.text ?? "", node.content?.label ?? "", node.content?.kicker ?? ""];
  for (const child of node.children ?? []) parts.push(nodeSearchText(child));
  return parts.join(" ");
}

function collectStyleColors(node: DesignNode, colors: Set<string>, observations: ColorObservation[]): void {
  const style = node.style;
  const entries: Array<{ value: string | undefined; role: ColorRole; major: boolean }> = [
    { value: style.background, role: node.type === "button" ? "accent" : "background", major: node.type === "frame" || node.type === "button" },
    { value: style.foreground, role: "text", major: node.type === "text" || node.type === "button" },
    { value: style.borderColor, role: "border", major: false },
    { value: style.accent, role: "accent", major: true },
    { value: style.muted, role: "surface", major: false },
  ];
  for (const entry of entries) {
    if (typeof entry.value === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(entry.value)) {
      const color = expandHex(entry.value).toLowerCase();
      colors.add(color);
      observations.push({ color, role: entry.role, major: entry.major });
    }
  }
  for (const stop of style.gradient?.stops ?? []) {
    const color = expandHex(stop.color).toLowerCase();
    colors.add(color);
    observations.push({ color, role: "background", major: true });
  }
}

function averagePadding(padding: DesignNodeStyle["padding"]): number {
  if (!padding) return 0;
  return avg([padding.top ?? 0, padding.right ?? 0, padding.bottom ?? 0, padding.left ?? 0]);
}

function scalePadding(padding: NonNullable<DesignNodeStyle["padding"]>, scale: number): NonNullable<DesignNodeStyle["padding"]> {
  return {
    top: Math.round((padding.top ?? 0) * scale),
    right: Math.round((padding.right ?? 0) * scale),
    bottom: Math.round((padding.bottom ?? 0) * scale),
    left: Math.round((padding.left ?? 0) * scale),
  };
}

function numericHeight(height: DesignNodeStyle["height"]): number | null {
  return typeof height === "number" ? height : null;
}

function parseRadius(radius: DesignNodeStyle["borderRadius"]): number | null {
  if (typeof radius === "number") return radius;
  if (typeof radius === "string") {
    const first = Number(radius.match(/\d+/)?.[0]);
    return Number.isFinite(first) ? first : null;
  }
  return null;
}

function normalizeColor(color: string): string {
  return color.trim().toLowerCase();
}

function nearestPaletteColor(color: string, palette: string[], role: ColorRole = "surface"): string {
  if (!/^#/.test(color)) return color;
  const source = parseHexColor(color);
  if (!source) return color;
  const candidates = paletteCandidatesForRole(palette, role);
  let best = candidates[0] ?? palette[0] ?? color;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of candidates.length > 0 ? candidates : palette) {
    const parsed = parseHexColor(candidate);
    if (!parsed) continue;
    const distance = colorDistance(source, parsed);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return expandHex(best);
}

function patternMetric(metrics: DesignNodeTasteMetrics, avoid: string): number {
  if (avoid === "pricing") return metrics.pricingPatternCount;
  if (avoid === "logo") return metrics.logoBarCount;
  if (avoid === "stats") return metrics.statsPatternCount;
  if (avoid === "feature grid" || avoid === "card grid") return metrics.cardGridCount;
  if (avoid === "testimonial") return metrics.testimonialPatternCount;
  return 0;
}

function stringDirective(directives: Array<{ dimension: string; value: string | number | string[] }>, dimension: string): string | null {
  const value = directives.find((directive) => directive.dimension === dimension)?.value;
  return typeof value === "string" ? value : null;
}

function fontMatches(actual: string, expected: string): boolean {
  return actual.toLowerCase().includes(expected.toLowerCase()) || expected.toLowerCase().includes(actual.toLowerCase());
}

function targetPaddingForDensity(density: number): { min: number; max: number } {
  if (density >= 0.68) return { min: 56, max: 180 };
  if (density <= 0.32) return { min: 16, max: 72 };
  return { min: 32, max: 120 };
}

function targetRadiusForKnob(radius: number): { min: number; max: number } {
  if (radius <= 0.1) return { min: 0, max: 8 };
  if (radius <= 0.35) return { min: 0, max: 12 };
  if (radius <= 0.7) return { min: 6, max: 24 };
  return { min: 18, max: 999 };
}

function isAllowedPaletteException(entry: ColorObservation): boolean {
  const color = normalizeColor(expandHex(entry.color));
  if (entry.role === "text" && (color === "#ffffff" || color === "#000000")) return true;
  if (entry.major) return false;
  return color === "#ffffff" || color === "#000000" || color === "#f5f5f5" || color === "#eeeeee" || color === "#e5e5e5";
}

function paletteCandidatesForRole(palette: string[], role: ColorRole): string[] {
  const expanded = palette.map(expandHex).filter((color) => Boolean(parseHexColor(color)));
  if (expanded.length <= 2) return expanded;
  if (role === "background" || role === "surface" || role === "border") {
    return expanded
      .map((color) => ({ color, luminance: relativeLuminance(parseHexColor(color)!) }))
      .sort((a, b) => b.luminance - a.luminance)
      .slice(0, Math.max(2, Math.ceil(expanded.length / 2)))
      .map((entry) => entry.color);
  }
  if (role === "text") {
    return expanded
      .map((color) => ({ color, luminance: relativeLuminance(parseHexColor(color)!) }))
      .sort((a, b) => a.luminance - b.luminance)
      .slice(0, Math.max(1, Math.ceil(expanded.length / 2)))
      .map((entry) => entry.color);
  }
  const sortedBySaturation = expanded
    .map((color) => ({ color, saturation: saturation(parseHexColor(color)!) }))
    .sort((a, b) => b.saturation - a.saturation);
  return sortedBySaturation.slice(0, Math.max(1, Math.ceil(expanded.length / 2))).map((entry) => entry.color);
}

function parseHexColor(color: string): { r: number; g: number; b: number } | null {
  const hex = expandHex(color).replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(hex)) return null;
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

function expandHex(color: string): string {
  const value = color.trim().toLowerCase();
  const match = value.match(/^#([0-9a-f]{3})$/i);
  if (!match) return value;
  return `#${match[1].split("").map((char) => char + char).join("")}`;
}

function colorDistance(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11);
}

function relativeLuminance(color: { r: number; g: number; b: number }): number {
  return (0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b) / 255;
}

function saturation(color: { r: number; g: number; b: number }): number {
  const max = Math.max(color.r, color.g, color.b);
  const min = Math.min(color.r, color.g, color.b);
  return max === 0 ? 0 : (max - min) / max;
}

function avg(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function variance(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = avg(values);
  return avg(values.map((value) => Math.abs(value - mean)));
}
