import type { TasteProfile } from "@/types/taste-profile";
import { getArchetypeBannedNodeTypes } from "./archetype-bans";

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
  composition: "always-hard",
  cornerRadius: "always-hard",
  bannedNodeTypes: "always-hard",
  density: "hard-in-close",
  ctaTone: "hard-in-close",
  ctaShape: "hard-in-close",
  colorMode: "hard-in-close",
  temperature: "hard-in-close",
  typeScale: "hard-in-close",
  typeContrast: "hard-in-close",
  imageryStyle: "hard-in-close",
  imageSizing: "hard-in-close",
  sectionFlow: "hard-in-close",
  paletteStrategy: "always-soft",
  layoutBias: "always-soft",
  heroStyle: "always-soft",
  gridBehavior: "always-soft",
  whitespace: "always-soft",
  imageryPreference: "always-soft",
  rhythm: "always-soft",
  headingTone: "always-soft",
  casePreference: "always-soft",
  accentStrategy: "always-soft",
  saturation: "always-soft",
  imageTreatment: "always-soft",
  ctaHierarchy: "always-soft",
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

  // ── Imagery — style, sizing, treatment ─────────────────────────────
  const IMAGERY_STYLE_RULES: Record<string, string> = {
    editorial: "Photography MUST be the primary visual element — images fill sections rather than decorating them. Think magazine spreads, not stock photo thumbnails.",
    product: "Product imagery should be prominent and well-composed — show the product in context, not as isolated cutouts.",
    atmospheric: "Imagery should create atmosphere and mood — use environmental photography, not icons or illustrations.",
    abstract: "Use abstract or artistic imagery as visual texture — not decorative clip art.",
    documentary: "Use documentary-style photography — candid, real, not staged or stock.",
    minimal: "Use imagery sparingly and intentionally — when an image appears, it should carry weight.",
  };

  if (taste.imageTreatment.style) {
    allDirectives.push({
      _dimKey: "imageryStyle",
      dimension: "imagery",
      rule: IMAGERY_STYLE_RULES[taste.imageTreatment.style] ?? `Imagery style: ${taste.imageTreatment.style}`,
      value: taste.imageTreatment.style,
      source: "extracted",
    });
  }

  const SIZING_RULES: Record<string, string> = {
    "full-bleed": "Images MUST fill their containers edge-to-edge — no small thumbnails, no images shrunk into cards. Full-bleed or near-full-bleed.",
    "contained": "Images should be well-sized within containers — not full-bleed, but substantial and intentional.",
    "mixed": "Mix image sizing — some full-bleed hero images, some contained editorial images.",
    "thumbnail-grid": "Use a grid of well-composed thumbnails — consistent sizing, intentional grid structure.",
  };

  if (taste.imageTreatment.sizing) {
    allDirectives.push({
      _dimKey: "imageSizing",
      dimension: "imagery",
      rule: SIZING_RULES[taste.imageTreatment.sizing] ?? `Image sizing: ${taste.imageTreatment.sizing}`,
      value: taste.imageTreatment.sizing,
      source: "extracted",
    });
  }

  if (taste.imageTreatment.treatment && taste.imageTreatment.treatment !== "raw") {
    allDirectives.push({
      _dimKey: "imageTreatment",
      dimension: "imagery",
      rule: `Image treatment: ${taste.imageTreatment.treatment}`,
      value: taste.imageTreatment.treatment,
      source: "extracted",
    });
  }

  // ── Layout — section flow, rhythm ────────────────────────────────
  const SECTION_FLOW_RULES: Record<string, string> = {
    "editorial-grid": "Sections MUST follow editorial grid pacing — like magazine spreads, not stacked SaaS blocks. Vary section layouts, use asymmetric compositions, let images and text interact.",
    "overlapping": "Sections should overlap or interlock — break the stacked block pattern.",
    "interlocking": "Sections should interlock visually — shared elements, overlapping imagery, connected layouts.",
    "stacked": "Clean stacked sections — but vary internal layout per section to avoid monotony.",
  };

  if (taste.layoutBias.sectionFlow) {
    allDirectives.push({
      _dimKey: "sectionFlow",
      dimension: "layout",
      rule: SECTION_FLOW_RULES[taste.layoutBias.sectionFlow] ?? `Section flow: ${taste.layoutBias.sectionFlow}`,
      value: taste.layoutBias.sectionFlow,
      source: "extracted",
    });
  }

  const RHYTHM_RULES: Record<string, string> = {
    asymmetric: "Layout rhythm: asymmetric — vary column widths, text/image placement, and section proportions. Never repeat the same layout pattern in consecutive sections.",
    alternating: "Layout rhythm: alternating — alternate between different section layouts (image-left/image-right, wide/narrow).",
    progressive: "Layout rhythm: progressive — build visual intensity through the page, from calm to bold.",
    uniform: "Layout rhythm: uniform — consistent section structure throughout.",
  };

  if (taste.layoutBias.rhythm) {
    allDirectives.push({
      _dimKey: "rhythm",
      dimension: "layout",
      rule: RHYTHM_RULES[taste.layoutBias.rhythm] ?? `Layout rhythm: ${taste.layoutBias.rhythm}`,
      value: taste.layoutBias.rhythm,
      source: "extracted",
    });
  }

  // ── Typography — heading tone, case preference ───────────────────
  const HEADING_TONE_RULES: Record<string, string> = {
    display: "Headings should use display-weight type at dramatic scale — headlines are visual elements, not just labels.",
    editorial: "Headings should feel editorial — magazine-quality typography with considered weight, tracking, and scale.",
    technical: "Headings should feel technical and precise — clean, structured, no decoration.",
    humanist: "Headings should feel warm and humanist — approachable, not sterile.",
    geometric: "Headings should feel geometric and modern — clean lines, consistent rhythm.",
  };

  if (taste.typographyTraits.headingTone) {
    allDirectives.push({
      _dimKey: "headingTone",
      dimension: "typography",
      rule: HEADING_TONE_RULES[taste.typographyTraits.headingTone] ?? `Heading tone: ${taste.typographyTraits.headingTone}`,
      value: taste.typographyTraits.headingTone,
      source: "extracted",
    });
  }

  if (taste.typographyTraits.casePreference && taste.typographyTraits.casePreference !== "mixed") {
    allDirectives.push({
      _dimKey: "casePreference",
      dimension: "typography",
      rule: `Case preference: ${taste.typographyTraits.casePreference}`,
      value: taste.typographyTraits.casePreference,
      source: "extracted",
    });
  }

  // ── Color — accent strategy, saturation ──────────────────────────
  if (taste.colorBehavior.accentStrategy) {
    allDirectives.push({
      _dimKey: "accentStrategy",
      dimension: "color",
      rule: `Accent strategy: ${taste.colorBehavior.accentStrategy}`,
      value: taste.colorBehavior.accentStrategy,
      source: "extracted",
    });
  }

  if (taste.colorBehavior.saturation) {
    allDirectives.push({
      _dimKey: "saturation",
      dimension: "color",
      rule: `Color saturation: ${taste.colorBehavior.saturation}`,
      value: taste.colorBehavior.saturation,
      source: "extracted",
    });
  }

  // ── CTA hierarchy ────────────────────────────────────────────────
  if (taste.ctaTone.hierarchy && taste.ctaTone.hierarchy !== "balanced") {
    allDirectives.push({
      _dimKey: "ctaHierarchy",
      dimension: "cta",
      rule: `CTA hierarchy: ${taste.ctaTone.hierarchy}`,
      value: taste.ctaTone.hierarchy,
      source: "extracted",
    });
  }

  // ── Composition — the big structural directive ───────────────────
  // Synthesize multiple taste signals into one clear compositional instruction
  const compositionParts: string[] = [];

  // Determine the design genre from reference type + imagery + mood
  const refType = taste.dominantReferenceType;
  const imgStyle = taste.imageTreatment.style;
  const sectionFlow = taste.layoutBias.sectionFlow;
  const adjectives = taste.adjectives;

  const isEditorial = refType === "photography" || refType === "poster" ||
    imgStyle === "editorial" || imgStyle === "atmospheric" ||
    sectionFlow === "editorial-grid" ||
    adjectives.some(a => ["editorial", "magazine", "refined", "restrained", "cinematic"].includes(a.toLowerCase()));

  const isMinimal = adjectives.some(a => ["minimal", "sparse", "clean", "restrained"].includes(a.toLowerCase())) ||
    taste.layoutBias.density === "spacious";

  if (isEditorial) {
    compositionParts.push("This is an EDITORIAL direction — the generated site must feel like a magazine or gallery, NOT a SaaS product page.");
    compositionParts.push("Sections should feel like magazine spreads — photography and typography carry the design, not UI widgets or feature cards.");
    compositionParts.push("Do NOT use: 3-column feature card grids, stats/numbers sections, pricing tables, icon rows, logo bars, or any pattern that reads as 'startup landing page'.");
  }

  if (isMinimal) {
    compositionParts.push("Use fewer sections (5-6 maximum) with more space per section — quality over quantity. Every section must earn its place.");
  }

  if (taste.imageTreatment.style === "editorial" || taste.imageTreatment.sizing === "full-bleed") {
    compositionParts.push("Photography must be used at scale — filling sections, not shrunk into small cards or thumbnails.");
  }

  if (compositionParts.length > 0) {
    allDirectives.push({
      _dimKey: "composition",
      dimension: "composition",
      rule: compositionParts.join(" "),
      value: compositionParts,
      source: "extracted",
    });
  }

  // ── Structural avoids — auto-generated from taste signals ────────
  if (isEditorial) {
    const structuralAvoids = [
      "use 3-column or 6-card feature grids — these read as SaaS, not editorial",
      "use stats/numbers social proof sections — these read as startup boilerplate",
      "shrink photography into small cards or thumbnails — photography must be used at scale",
      "use icon rows or icon-feature lists — use typography and photography instead",
    ];
    for (const item of structuralAvoids) {
      // Only add if not already in the taste avoid list
      if (!taste.avoid.some(existing => existing.toLowerCase().includes(item.split("—")[0].trim().toLowerCase().slice(0, 20)))) {
        result.avoid.push({
          dimension: "avoid",
          rule: `Do NOT ${item}`,
          value: item,
          source: "extracted",
        });
      }
    }
  }

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

  // ── Banned node types — archetype-level hard constraint ──────────
  const bannedTypes = getArchetypeBannedNodeTypes(taste.archetypeMatch);
  if (bannedTypes.length > 0) {
    result.hard.push({
      dimension: "bannedNodeTypes",
      rule: `Do NOT use these node types: ${bannedTypes.join(", ")}`,
      value: bannedTypes,
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

  // ── User overrides — hard constraints regardless of fidelity mode ──
  if (taste.userOverrides) {
    const ov = taste.userOverrides;

    if (ov.headingFont) {
      const existing = result.hard.findIndex(d => d.dimension === "headingFont");
      const override: Directive = { dimension: "headingFont", rule: `Heading font MUST be: ${ov.headingFont}`, value: ov.headingFont, source: "user-override" };
      if (existing >= 0) result.hard[existing] = override;
      else result.hard.push(override);
    }

    if (ov.bodyFont) {
      const existing = result.hard.findIndex(d => d.dimension === "bodyFont");
      const override: Directive = { dimension: "bodyFont", rule: `Body font MUST be: ${ov.bodyFont}`, value: ov.bodyFont, source: "user-override" };
      if (existing >= 0) result.hard[existing] = override;
      else result.hard.push(override);
    }

    if (ov.density) {
      const existing = result.hard.findIndex(d => d.dimension === "density");
      const override: Directive = { dimension: "density", rule: `density: ${ov.density}`, value: ov.density, source: "user-override" };
      if (existing >= 0) result.hard[existing] = override;
      else result.hard.push(override);
    }

    if (ov.removeFromAvoid && ov.removeFromAvoid.length > 0) {
      result.avoid = result.avoid.filter(d => !ov.removeFromAvoid!.includes(d.value as string));
    }

    if (ov.addToAvoid && ov.addToAvoid.length > 0) {
      for (const item of ov.addToAvoid) {
        result.avoid.push({
          dimension: "avoid",
          rule: `Do NOT ${item}`,
          value: item,
          source: "user-override",
        });
      }
    }
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
