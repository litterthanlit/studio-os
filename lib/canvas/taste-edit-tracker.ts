import type { DesignNode } from "./design-node";
import { walkDesignTree } from "./design-node";
import { detectStructuralTasteEdits } from "./structural-edit-tracker";

export type TasteEdit = {
  dimension: string;
  before: string | number;
  after: string | number;
  description: string;
  confidence?: number;
  suggestedOverride?: unknown;
};

/**
 * Compare current tree against the generated snapshot.
 * Returns significant taste-divergent edits.
 */
export function detectTasteEdits(
  currentTree: DesignNode,
  snapshotTree: DesignNode,
): TasteEdit[] {
  const edits: TasteEdit[] = [];
  const seen = new Set<string>();

  // Collect fonts from both trees
  const currentFonts = collectFonts(currentTree);
  const snapshotFonts = collectFonts(snapshotTree);

  // Heading font change
  if (currentFonts.heading && snapshotFonts.heading && currentFonts.heading !== snapshotFonts.heading) {
    const key = `heading-font`;
    if (!seen.has(key)) {
      seen.add(key);
      edits.push({
        dimension: "headingFont",
        before: snapshotFonts.heading,
        after: currentFonts.heading,
        description: `Changed heading font: ${snapshotFonts.heading} → ${currentFonts.heading}`,
      });
    }
  }

  // Body font change
  if (currentFonts.body && snapshotFonts.body && currentFonts.body !== snapshotFonts.body) {
    const key = `body-font`;
    if (!seen.has(key)) {
      seen.add(key);
      edits.push({
        dimension: "bodyFont",
        before: snapshotFonts.body,
        after: currentFonts.body,
        description: `Changed body font: ${snapshotFonts.body} → ${currentFonts.body}`,
      });
    }
  }

  // Spacing changes (> 20% delta on section padding)
  const currentSpacing = collectSectionPadding(currentTree);
  const snapshotSpacing = collectSectionPadding(snapshotTree);
  if (currentSpacing.avg > 0 && snapshotSpacing.avg > 0) {
    const delta = Math.abs(currentSpacing.avg - snapshotSpacing.avg) / snapshotSpacing.avg;
    if (delta > 0.2) {
      edits.push({
        dimension: "density",
        before: Math.round(snapshotSpacing.avg),
        after: Math.round(currentSpacing.avg),
        description: `${currentSpacing.avg < snapshotSpacing.avg ? "Tightened" : "Loosened"} section spacing: ${Math.round(snapshotSpacing.avg)}px → ${Math.round(currentSpacing.avg)}px`,
      });
    }
  }

  // Color changes (off-palette)
  const currentColors = collectColors(currentTree);
  const snapshotColors = collectColors(snapshotTree);
  const newColors = currentColors.filter((c) => !snapshotColors.includes(c));
  if (newColors.length >= 2) {
    edits.push({
      dimension: "palette",
      before: snapshotColors.slice(0, 5).join(", "),
      after: currentColors.slice(0, 5).join(", "),
      description: `Changed ${newColors.length} colors from generated palette`,
    });
  }

  for (const structuralEdit of detectStructuralTasteEdits(currentTree, snapshotTree)) {
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
