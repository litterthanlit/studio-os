import type { TasteProfile } from "@/types/taste-profile";
import type { DesignNode } from "./design-node";
import { walkDesignTree } from "./design-node";
import { mergeKnobPatches, sanitizeKnobPatch } from "./design-knobs";
import { computeDesignNodeTasteMetrics, type DesignNodeTasteMetrics } from "./design-node-taste-validator";
import { detectStructuralTasteEditsFromMetrics } from "./structural-edit-tracker";

export type TasteEdit = {
  dimension: string;
  before: string | number;
  after: string | number;
  description: string;
  confidence?: number;
  suggestedOverride?: unknown;
};

/**
 * Compact, persisted record of what a generation produced — stored on generated
 * artboards (`ArtboardItem.generationBaseline`) so taste-edit detection survives
 * reloads instead of depending on a session-only tree snapshot.
 */
export type GenerationBaseline = {
  version: 1;
  capturedAt: string;
  headingFont?: string;
  bodyFont?: string;
  /** Hex background/foreground colors the generation used (capped). */
  palette: string[];
  averageSectionPadding: number;
  metrics: DesignNodeTasteMetrics;
};

const BASELINE_COLOR_CAP = 24;

export function buildGenerationBaseline(tree: DesignNode, capturedAt = new Date().toISOString()): GenerationBaseline {
  const fonts = collectFonts(tree);
  const metrics = computeDesignNodeTasteMetrics(tree);
  return {
    version: 1,
    capturedAt,
    ...(fonts.heading ? { headingFont: fonts.heading } : {}),
    ...(fonts.body ? { bodyFont: fonts.body } : {}),
    palette: collectColors(tree).slice(0, BASELINE_COLOR_CAP),
    averageSectionPadding: collectSectionPadding(tree).avg,
    metrics: {
      ...metrics,
      colorPaletteUsed: metrics.colorPaletteUsed.slice(0, BASELINE_COLOR_CAP),
      offPaletteColors: metrics.offPaletteColors.slice(0, BASELINE_COLOR_CAP),
    },
  };
}

export function isGenerationBaseline(value: unknown): value is GenerationBaseline {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<GenerationBaseline>;
  return v.version === 1 && Array.isArray(v.palette) && typeof v.metrics === "object" && v.metrics !== null;
}

/**
 * Compare current tree against the generated snapshot.
 * Returns significant taste-divergent edits.
 */
export function detectTasteEdits(
  currentTree: DesignNode,
  snapshotTree: DesignNode,
): TasteEdit[] {
  return detectTasteEditsFromBaseline(currentTree, buildGenerationBaseline(snapshotTree));
}

/** Metric-to-metric: the current tree's baseline against the persisted generation baseline. */
export function detectTasteEditsFromBaseline(
  currentTree: DesignNode,
  baseline: GenerationBaseline,
): TasteEdit[] {
  const current = buildGenerationBaseline(currentTree, baseline.capturedAt);
  const edits: TasteEdit[] = [];

  if (current.headingFont && baseline.headingFont && current.headingFont !== baseline.headingFont) {
    edits.push({
      dimension: "headingFont",
      before: baseline.headingFont,
      after: current.headingFont,
      description: `Changed heading font: ${baseline.headingFont} → ${current.headingFont}`,
      suggestedOverride: { headingFont: current.headingFont },
    });
  }

  if (current.bodyFont && baseline.bodyFont && current.bodyFont !== baseline.bodyFont) {
    edits.push({
      dimension: "bodyFont",
      before: baseline.bodyFont,
      after: current.bodyFont,
      description: `Changed body font: ${baseline.bodyFont} → ${current.bodyFont}`,
      suggestedOverride: { bodyFont: current.bodyFont },
    });
  }

  // Spacing changes (> 20% delta on section padding)
  if (current.averageSectionPadding > 0 && baseline.averageSectionPadding > 0) {
    const delta = Math.abs(current.averageSectionPadding - baseline.averageSectionPadding) / baseline.averageSectionPadding;
    if (delta > 0.2) {
      const before = Math.round(baseline.averageSectionPadding);
      const after = Math.round(current.averageSectionPadding);
      edits.push({
        dimension: "density",
        before,
        after,
        description: `${after < before ? "Tightened" : "Loosened"} section spacing: ${before}px → ${after}px`,
        suggestedOverride: { density: densityFromSectionPadding(after) },
      });
    }
  }

  // Color changes (off-palette)
  const newColors = current.palette.filter((c) => !baseline.palette.includes(c));
  if (newColors.length >= 2) {
    edits.push({
      dimension: "palette",
      before: baseline.palette.slice(0, 5).join(", "),
      after: current.palette.slice(0, 5).join(", "),
      description: `Changed ${newColors.length} colors from generated palette`,
      suggestedOverride: { palette: current.palette.slice(0, 8) },
    });
  }

  for (const structuralEdit of detectStructuralTasteEditsFromMetrics(current.metrics, baseline.metrics)) {
    edits.push({
      dimension: structuralEdit.dimension,
      before: stringifyEditValue(structuralEdit.before),
      after: stringifyEditValue(structuralEdit.after),
      description: structuralEdit.description,
      confidence: structuralEdit.confidence,
      suggestedOverride: structuralEdit.suggestedOverride,
    });
  }

  return edits;
}

export function densityFromSectionPadding(padding: number): "spacious" | "balanced" | "dense" {
  return padding < 48 ? "dense" : padding > 72 ? "spacious" : "balanced";
}

type UserOverrides = NonNullable<TasteProfile["userOverrides"]>;

const KNOB_SECTIONS = new Set(["layout", "typography", "color", "imagery", "components", "content"]);

/**
 * Fold confirmed taste edits into `userOverrides`: fonts, density and palette as
 * direct overrides; structural edits' knob-shaped suggestions deep-merge into
 * `userOverrides.knobs`; `ctaStyle` suggestions carry over.
 */
export function applyTasteEditsToOverrides(
  existing: TasteProfile["userOverrides"] | undefined,
  edits: TasteEdit[],
): UserOverrides {
  const overrides: UserOverrides = { ...existing };

  for (const edit of edits) {
    const suggestion =
      edit.suggestedOverride && typeof edit.suggestedOverride === "object"
        ? (edit.suggestedOverride as Record<string, unknown>)
        : {};

    switch (edit.dimension) {
      case "headingFont":
        overrides.headingFont = String(edit.after);
        continue;
      case "bodyFont":
        overrides.bodyFont = String(edit.after);
        continue;
      case "density":
        overrides.density =
          typeof edit.after === "number" ? densityFromSectionPadding(edit.after) : overrides.density;
        continue;
      case "palette": {
        const palette = Array.isArray(suggestion.palette)
          ? suggestion.palette
          : String(edit.after).split(",");
        const colors = palette
          .map((c) => String(c).trim().toLowerCase())
          .filter((c) => /^#[0-9a-f]{3,8}$/.test(c));
        if (colors.length > 0) overrides.palette = [...new Set(colors)].slice(0, 8);
        continue;
      }
    }

    const knobPatch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(suggestion)) {
      if (KNOB_SECTIONS.has(key)) knobPatch[key] = value;
    }
    const sanitized = sanitizeKnobPatch(knobPatch);
    if (Object.keys(sanitized).length > 0) {
      overrides.knobs = mergeKnobPatches(overrides.knobs ?? {}, sanitized);
    }
    if (typeof suggestion.ctaStyle === "string") {
      overrides.ctaStyle = suggestion.ctaStyle;
    }
  }

  return overrides;
}

function stringifyEditValue(value: unknown): string | number {
  if (typeof value === "number" || typeof value === "string") return value;
  return JSON.stringify(value);
}

function collectFonts(tree: DesignNode): { heading?: string; body?: string } {
  let heading: string | undefined;
  let body: string | undefined;

  walkDesignTree(tree, (node) => {
    if (!node.style.fontFamily) return;
    const font = node.style.fontFamily;
    const size = typeof node.style.fontSize === "number" ? node.style.fontSize : 16;

    if (size >= 28 && !heading) heading = font;
    if (size <= 18 && size >= 14 && !body) body = font;
  });

  return { heading, body };
}

function collectSectionPadding(tree: DesignNode): { avg: number } {
  const paddings: number[] = [];
  const sections = tree.children || [];
  for (const section of sections) {
    const p = section.style.padding;
    if (p && typeof p === "object" && "top" in p) {
      paddings.push((p as { top: number }).top);
    }
  }
  if (paddings.length === 0) return { avg: 0 };
  return { avg: paddings.reduce((a, b) => a + b, 0) / paddings.length };
}

function collectColors(tree: DesignNode): string[] {
  const colors = new Set<string>();
  walkDesignTree(tree, (node) => {
    if (node.style.background && typeof node.style.background === "string" && node.style.background.startsWith("#")) {
      colors.add(node.style.background.toLowerCase());
    }
    if (node.style.foreground && typeof node.style.foreground === "string" && node.style.foreground.startsWith("#")) {
      colors.add(node.style.foreground.toLowerCase());
    }
  });
  return Array.from(colors);
}
