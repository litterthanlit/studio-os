import type { TasteProfile } from "@/types/taste-profile";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Directive {
  dimension: string;
  rule: string;
  value: string | number | string[];
  source: "extracted" | "user-override" | "feedback";
}

export interface CompiledDirectives {
  hard: Directive[];
  soft: Directive[];
  avoid: Directive[];
  fidelityMode: "close" | "balanced" | "push";
}

export type FidelityMode = "close" | "balanced" | "push";

// ─── Dimension Hardness Classification ──────────────────────────────────────

const DIMENSION_HARDNESS: Record<string, "always-hard" | "hard-in-close" | "always-soft"> = {
  palette: "always-hard",
  headingFont: "always-hard",
  bodyFont: "always-hard",
  avoidList: "always-hard",
  density: "hard-in-close",
  cornerRadius: "hard-in-close",
  ctaTone: "hard-in-close",
  ctaShape: "hard-in-close",
  colorMode: "hard-in-close",
  temperature: "hard-in-close",
  typeScale: "hard-in-close",
  typeContrast: "hard-in-close",
  paletteStrategy: "always-soft",
  layoutBias: "always-soft",
  heroStyle: "always-soft",
  gridBehavior: "always-soft",
  whitespace: "always-soft",
  imageryPreference: "always-soft",
  moodTags: "always-soft",
  shadow: "always-soft",
};

// ─── Density → padding mapping ──────────────────────────────────────────────

const DENSITY_PADDING: Record<string, number> = {
  spacious: 80,
  balanced: 48,
  dense: 24,
};

// ─── Corner radius → px mapping ─────────────────────────────────────────────

const CORNER_RADIUS_MAP: Record<string, string> = {
  none: "0",
  subtle: "4-8",
  rounded: "12-20",
  pill: "999",
};

// ─── Compiler ───────────────────────────────────────────────────────────────

export function compileTasteToDirectives(
  taste: TasteProfile | null | undefined,
  fidelityMode: FidelityMode = "balanced"
): CompiledDirectives {
  const result: CompiledDirectives = {
    hard: [],
    soft: [],
    avoid: [],
    fidelityMode,
  };

  if (!taste) return result;

  // Collect all directives with their natural dimension
  const allDirectives: Array<Directive & { _dimKey: string }> = [];

  // ── Color ──────────────────────────────────────────────────────────
  const colors = taste.colorBehavior.suggestedColors;
  const paletteHexes = [colors.background, colors.surface, colors.text, colors.accent, colors.secondary].filter(Boolean);
  if (paletteHexes.length > 0) {
    allDirectives.push({
      _dimKey: "palette",
      dimension: "palette",
      rule: `Primary palette MUST use only: ${paletteHexes.join(", ")}`,
      value: paletteHexes,
      source: "extracted",
    });
  }

  allDirectives.push({
    _dimKey: "paletteStrategy",
    dimension: "paletteStrategy",
    rule: `Palette strategy: ${taste.colorBehavior.palette}`,
    value: taste.colorBehavior.palette,
    source: "extracted",
  });

  allDirectives.push({
    _dimKey: "colorMode",
    dimension: "colorMode",
    rule: `Color mode: ${taste.colorBehavior.mode}`,
    value: taste.colorBehavior.mode,
    source: "extracted",
  });

  allDirectives.push({
    _dimKey: "temperature",
    dimension: "temperature",
    rule: `Temperature: ${taste.colorBehavior.temperature}`,
    value: taste.colorBehavior.temperature,
    source: "extracted",
  });

  // ── Typography ─────────────────────────────────────────────────────
  const pairings = taste.typographyTraits.recommendedPairings;
  if (pairings[0]) {
    allDirectives.push({
      _dimKey: "headingFont",
      dimension: "headingFont",
      rule: `Heading font MUST be: ${pairings[0]}`,
      value: pairings[0],
      source: "extracted",
    });
  }
  if (pairings[1]) {
    allDirectives.push({
      _dimKey: "bodyFont",
      dimension: "bodyFont",
      rule: `Body font MUST be: ${pairings[1]}`,
      value: pairings[1],
      source: "extracted",
    });
  }

  allDirectives.push({
    _dimKey: "typeScale",
    dimension: "typeScale",
    rule: `Type scale: ${taste.typographyTraits.scale}`,
    value: taste.typographyTraits.scale,
    source: "extracted",
  });

  allDirectives.push({
    _dimKey: "typeContrast",
    dimension: "typeContrast",
    rule: `Type contrast: ${taste.typographyTraits.contrast}`,
    value: taste.typographyTraits.contrast,
    source: "extracted",
  });

  // ── Layout ─────────────────────────────────────────────────────────
  const minPadding = DENSITY_PADDING[taste.layoutBias.density] ?? 48;
  allDirectives.push({
    _dimKey: "density",
    dimension: "density",
    rule: `Density: ${taste.layoutBias.density} — section padding >= ${minPadding}px`,
    value: minPadding,
    source: "extracted",
  });

  allDirectives.push({
    _dimKey: "heroStyle",
    dimension: "heroStyle",
    rule: `Hero style: ${taste.layoutBias.heroStyle}`,
    value: taste.layoutBias.heroStyle,
    source: "extracted",
  });

  allDirectives.push({
    _dimKey: "gridBehavior",
    dimension: "gridBehavior",
    rule: `Grid behavior: ${taste.layoutBias.gridBehavior}`,
    value: taste.layoutBias.gridBehavior,
    source: "extracted",
  });

  allDirectives.push({
    _dimKey: "whitespace",
    dimension: "whitespace",
    rule: `Whitespace intent: ${taste.layoutBias.whitespaceIntent}`,
    value: taste.layoutBias.whitespaceIntent,
    source: "extracted",
  });

  // ── Image Treatment ────────────────────────────────────────────────
  const radiusLabel = CORNER_RADIUS_MAP[taste.imageTreatment.cornerRadius] ?? "4-8";
  allDirectives.push({
    _dimKey: "cornerRadius",
    dimension: "cornerRadius",
    rule: `Corner radius: ${radiusLabel}px`,
    value: radiusLabel,
    source: "extracted",
  });

  allDirectives.push({
    _dimKey: "shadow",
    dimension: "shadow",
    rule: `Shadow treatment: ${taste.imageTreatment.shadow}`,
    value: taste.imageTreatment.shadow,
    source: "extracted",
  });

  // ── CTA ────────────────────────────────────────────────────────────
  allDirectives.push({
    _dimKey: "ctaTone",
    dimension: "ctaTone",
    rule: `CTA tone: ${taste.ctaTone.style}`,
    value: taste.ctaTone.style,
    source: "extracted",
  });

  allDirectives.push({
    _dimKey: "ctaShape",
    dimension: "ctaShape",
    rule: `CTA shape: ${taste.ctaTone.shape}`,
    value: taste.ctaTone.shape,
    source: "extracted",
  });

  // ── Mood ───────────────────────────────────────────────────────────
  if (taste.adjectives.length > 0) {
    allDirectives.push({
      _dimKey: "moodTags",
      dimension: "mood",
      rule: `Design mood: ${taste.adjectives.join(", ")}`,
      value: taste.adjectives,
      source: "extracted",
    });
  }

  // ── Classify each directive as hard / soft based on fidelity mode ──
  for (const directive of allDirectives) {
    const { _dimKey, ...clean } = directive;
    const hardness = DIMENSION_HARDNESS[_dimKey] ?? "always-soft";

    if (hardness === "always-hard") {
      result.hard.push(clean);
    } else if (hardness === "hard-in-close" && fidelityMode === "close") {
      result.hard.push(clean);
    } else if (hardness === "hard-in-close" && fidelityMode === "balanced") {
      result.soft.push(clean);
    } else if (hardness === "hard-in-close" && fidelityMode === "push") {
      result.soft.push(clean);
    } else {
      // always-soft
      result.soft.push(clean);
    }
  }

  // ── Avoid list ─────────────────────────────────────────────────────
  for (const item of taste.avoid) {
    result.avoid.push({
      dimension: "avoid",
      rule: `Do NOT ${item}`,
      value: item,
      source: "extracted",
    });
  }

  return result;
}

// ─── Serializer ─────────────────────────────────────────────────────────────

export function directivesToPromptText(directives: CompiledDirectives): string {
  const lines: string[] = [];

  lines.push(`## Compiled Design Directives (fidelity: ${directives.fidelityMode})`);
  lines.push("");

  if (directives.hard.length > 0) {
    lines.push("### HARD CONSTRAINTS — the model MUST follow these exactly:");
    for (const d of directives.hard) {
      lines.push(`- [${d.dimension}] ${d.rule}`);
    }
    lines.push("");
  }

  if (directives.soft.length > 0) {
    lines.push("### SOFT PREFERENCES — follow these as guidance, may deviate with good reason:");
    for (const d of directives.soft) {
      lines.push(`- [${d.dimension}] ${d.rule}`);
    }
    lines.push("");
  }

  if (directives.avoid.length > 0) {
    lines.push("### AVOID — do NOT use these patterns:");
    for (const d of directives.avoid) {
      lines.push(`- [${d.dimension}] ${d.rule}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
