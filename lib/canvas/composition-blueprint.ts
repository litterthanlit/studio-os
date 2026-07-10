import type { CompositionAnalysis } from "@/types/composition-analysis";
import type { TasteProfile } from "@/types/taste-profile";

type FidelityMode = "close" | "balanced" | "push";

export type CompositionInput = {
  analysis: CompositionAnalysis;
  weight: "primary" | "default" | "muted";
  referenceIndex: number;
};

type BlueprintInput = {
  compositions: CompositionInput[];
  fidelityMode: FidelityMode;
};

const MAX_BLUEPRINT_LINES = 40;
const MAX_SECONDARY_INFLUENCES = 4;

export function buildCompositionBlueprint(input: BlueprintInput): string {
  const { compositions, fidelityMode } = input;
  if (compositions.length === 0) return "";

  const primary = selectPrimaryComposition(compositions);
  if (!primary) return "";

  const { analysis } = primary;
  const fidelityLabel = fidelityMode === "close"
    ? "follow this blueprint closely"
    : fidelityMode === "balanced"
      ? "use this blueprint as strong guidance, adapt to content needs"
      : "use this blueprint as loose inspiration, prioritize creative interpretation";

  const lines: string[] = [];
  lines.push("## COMPOSITION BLUEPRINT");
  lines.push("");

  const confidenceNote = `${analysis.referenceConfidence} confidence`;
  const eraNote = analysis.era;
  const secondaryNote = analysis.secondaryTraits?.length
    ? ` with ${analysis.secondaryTraits.join(", ")} traits`
    : "";

  switch (analysis.referenceType) {
    case "screenshot":
      lines.push(`Source: screenshot${secondaryNote} (${confidenceNote}, ${eraNote})`);
      lines.push("");
      appendScreenshotBlueprint(lines, analysis);
      break;
    case "photograph":
      lines.push(`Source: photograph${analysis.photograph ? ` — ${analysis.photograph.subjectArchetype}` : ""}${secondaryNote} (${confidenceNote}, ${eraNote})`);
      lines.push("");
      appendPhotographBlueprint(lines, analysis);
      break;
    case "editorial":
      lines.push(`Source: editorial spread${secondaryNote} (${confidenceNote}, ${eraNote})`);
      lines.push("");
      appendEditorialBlueprint(lines, analysis);
      break;
    case "poster":
      lines.push(`Source: poster${secondaryNote} (${confidenceNote}, ${eraNote})`);
      lines.push("");
      appendEditorialBlueprint(lines, analysis);
      break;
    case "mixed":
      lines.push(`Source: ${analysis.referenceType}${secondaryNote} (${confidenceNote}, ${eraNote})`);
      lines.push("");
      if (analysis.screenshot) appendScreenshotBlueprint(lines, analysis);
      else if (analysis.photograph) appendPhotographBlueprint(lines, analysis);
      else if (analysis.editorial) appendEditorialBlueprint(lines, analysis);
      if (analysis.secondaryTraits?.length) {
        appendSecondaryInfluence(lines, analysis);
      }
      break;
  }

  if (analysis.specialLayouts?.length) {
    lines.push("");
    lines.push("SPECIAL LAYOUTS DETECTED:");
    for (const sl of analysis.specialLayouts) {
      lines.push(`- ${sl.pattern}: ${sl.details}`);
    }
  }

  lines.push("");
  lines.push(`KEY MOVE: ${analysis.keyCompositionalMove}`);
  lines.push("");
  lines.push(`FIDELITY: ${fidelityMode} — ${fidelityLabel}`);

  const secondaries = getSecondaryCompositions(compositions, primary);
  if (secondaries.length > 0) {
    lines.push("");
    lines.push("### SECONDARY INFLUENCES");
    lines.push("Structure comes from the primary reference above. Borrow texture, mood, and rhythm from these:");
    for (const secondary of secondaries) {
      appendSecondaryReferenceInfluence(lines, secondary);
    }
  }

  lines.push("");
  lines.push("Where the COMPOSITION BLUEPRINT conflicts with archetype grammar, follow the blueprint.");
  lines.push("Where HARD taste directives conflict with the blueprint, follow the directive. SOFT directives yield to blueprint structure.");

  return trimBlueprintLines(lines, MAX_BLUEPRINT_LINES);
}

function trimBlueprintLines(lines: string[], maxLines: number): string {
  if (lines.length <= maxLines) {
    return lines.join("\n");
  }

  const footerStart = lines.findIndex((line) =>
    line.startsWith("Where the COMPOSITION BLUEPRINT conflicts")
  );
  const footer = footerStart >= 0 ? lines.slice(footerStart) : lines.slice(-2);
  const body = footerStart >= 0 ? lines.slice(0, footerStart) : lines.slice(0, -2);
  const trimmedBody = body.slice(0, Math.max(0, maxLines - footer.length));
  return [...trimmedBody, ...footer].join("\n");
}

function getSecondaryCompositions(
  compositions: CompositionInput[],
  primary: CompositionInput
): CompositionInput[] {
  return compositions
    .filter((entry) => entry.weight !== "muted" && entry.referenceIndex !== primary.referenceIndex)
    .sort((a, b) => {
      const weightRank = (weight: CompositionInput["weight"]) => (weight === "primary" ? 0 : 1);
      const byWeight = weightRank(a.weight) - weightRank(b.weight);
      if (byWeight !== 0) return byWeight;
      return a.referenceIndex - b.referenceIndex;
    })
    .slice(0, MAX_SECONDARY_INFLUENCES);
}

function appendSecondaryReferenceInfluence(lines: string[], entry: CompositionInput): void {
  const { analysis } = entry;
  const weightLabel = entry.weight === "primary" ? "starred" : "default";
  const refLabel = `Ref ${entry.referenceIndex + 1} (${analysis.referenceType}, ${weightLabel})`;

  lines.push("");
  lines.push(`${refLabel}: ${analysis.keyCompositionalMove}`);
  lines.push(`- Spacing: ${formatSpacingSystem(analysis.spacingSystem)} | Typographic density: ${analysis.typographicDensity}`);

  if (analysis.referenceType === "photograph" && analysis.photograph) {
    lines.push(`- Palette mood: ${analysis.photograph.colorStory}; mood: ${analysis.photograph.mood}`);
    return;
  }

  if (analysis.referenceType === "editorial" && analysis.editorial) {
    lines.push(`- Editorial rhythm: ${analysis.editorial.pacing}, white space ${analysis.editorial.whiteSpaceStrategy}`);
    return;
  }

  if (analysis.referenceType === "screenshot" && analysis.screenshot) {
    lines.push(`- Component feel: ${analysis.screenshot.componentSignature.cornerStyle} corners, ${analysis.screenshot.componentSignature.buttonStyle} buttons`);
    return;
  }

  lines.push(`- Balance: ${analysis.balance}, tension: ${analysis.tension}`);
}

function formatSpacingSystem(spacingSystem: CompositionAnalysis["spacingSystem"]): string {
  switch (spacingSystem) {
    case "4px-grid":
      return "4px base";
    case "8px-grid":
      return "8px base";
    case "organic":
      return "organic spacing";
    case "golden-ratio":
      return "golden-ratio spacing";
    case "chaotic-intentional":
      return "intentional irregular spacing";
    default:
      return spacingSystem;
  }
}

function mapTypeScale(analysis: CompositionAnalysis): TasteProfile["typeScale"] | undefined {
  switch (analysis.headingToBodyRatio) {
    case "dramatic":
      return { display: 88, heading: 48, body: 18 };
    case "moderate":
      return { display: 56, heading: 36, body: 18 };
    case "subtle":
      return { display: 40, heading: 28, body: 16 };
    default:
      return undefined;
  }
}

function mapMeasuredDensity(density: CompositionAnalysis["density"]): TasteProfile["measuredDensity"] | undefined {
  switch (density) {
    case "sparse":
      return "sparse";
    case "balanced":
      return "balanced";
    case "rich":
      return "dense";
    default:
      return undefined;
  }
}

export function deriveTasteStructureFromCompositions(
  compositions: CompositionInput[]
): Pick<TasteProfile, "spacingSystem" | "typeScale" | "measuredDensity"> {
  const primary = selectPrimaryComposition(compositions);
  if (!primary) return {};

  const { analysis } = primary;
  const spacingSystem = formatSpacingSystem(analysis.spacingSystem);
  const typeScale = mapTypeScale(analysis);
  const measuredDensity = mapMeasuredDensity(analysis.density);

  return {
    ...(spacingSystem ? { spacingSystem } : {}),
    ...(typeScale ? { typeScale } : {}),
    ...(measuredDensity ? { measuredDensity } : {}),
  };
}

function selectPrimaryComposition(
  compositions: CompositionInput[]
): CompositionInput | null {
  const starred = compositions
    .filter((c) => c.weight === "primary")
    .sort((a, b) => b.referenceIndex - a.referenceIndex);
  if (starred.length > 0) return starred[0];

  const confidenceOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
  const byConfidence = [...compositions]
    .filter((c) => c.weight !== "muted")
    .sort((a, b) =>
      (confidenceOrder[b.analysis.referenceConfidence] ?? 0) -
      (confidenceOrder[a.analysis.referenceConfidence] ?? 0)
    );
  return byConfidence[0] ?? null;
}

function appendScreenshotBlueprint(lines: string[], a: CompositionAnalysis): void {
  const s = a.screenshot;
  if (!s) return;

  lines.push("STRUCTURE:");
  if (s.sectionInventory?.length) {
    const flow = s.sectionInventory
      .map((sec) => `${sec.type} (${sec.heightCharacter}, ${sec.visualHierarchy})`)
      .join(" → ");
    lines.push(`- Section flow: ${flow}`);
  }
  if (s.gridProportions?.length) {
    lines.push(`- Grid: ${s.gridProportions.join(", ")}`);
  }
  lines.push(`- Navigation: ${s.navigationStyle}`);
  lines.push(`- Spacing system: ${formatSpacingSystem(a.spacingSystem)}`);
  lines.push(`- Density: ${a.density}, Balance: ${a.balance}`);

  lines.push("");
  lines.push("COMPONENT SIGNATURE:");
  lines.push(`- Corners: ${s.componentSignature.cornerStyle}`);
  lines.push(`- Shadows: ${s.componentSignature.shadowDepth}`);
  lines.push(`- Borders: ${s.componentSignature.borderUsage}`);
  lines.push(`- Buttons: ${s.componentSignature.buttonStyle}`);

  lines.push("");
  lines.push("TYPOGRAPHY RHYTHM:");
  lines.push(`- Heading-to-body: ${a.headingToBodyRatio} scale jump`);
  lines.push(`- Text blocks: ${s.textBlockWidth}`);
  lines.push(`- Density zone: ${s.typeDensityZone}`);
  lines.push(`- Line height: ${a.lineHeightCharacter}`);
  lines.push(`- Letter spacing: ${a.letterSpacingIntent}`);
  lines.push(`- Hierarchy: ${a.hierarchyClarity}`);
}

function appendPhotographBlueprint(lines: string[], a: CompositionAnalysis): void {
  const p = a.photograph;
  if (!p) return;

  lines.push("COMPOSITIONAL INTENT:");
  lines.push(`- Balance: ${a.balance}`);
  if (p.focalPoint) {
    const xPos = p.focalPoint.x < 0.33 ? "left" : p.focalPoint.x > 0.66 ? "right" : "center";
    const yPos = p.focalPoint.y < 0.33 ? "upper" : p.focalPoint.y > 0.66 ? "lower" : "middle";
    lines.push(`- Focal point: ${yPos}-${xPos} (${p.focalPoint.strength})`);
  }
  lines.push(`- Composition: ${p.compositionType}`);
  lines.push(`- Depth: ${p.depthLayers}`);
  lines.push(`- Light: ${p.lightDirection}`);
  lines.push(`- Color story: ${p.colorStory}`);

  lines.push("");
  lines.push(`MOOD: ${p.mood}`);
  lines.push(`Tension: ${a.tension}`);

  lines.push("");
  lines.push("TRANSLATE TO LAYOUT:");
  if (a.balance === "asymmetric" || a.balance === "dynamic") {
    lines.push("- Use asymmetric layouts that create visual tension");
  }
  if (p.focalPoint) {
    const xPos = p.focalPoint.x < 0.33 ? "left" : p.focalPoint.x > 0.66 ? "right" : "center";
    const yPos = p.focalPoint.y < 0.33 ? "upper" : p.focalPoint.y > 0.66 ? "lower" : "center";
    lines.push(`- Place primary content in ${yPos}-${xPos} zones`);
  }
  if (p.depthLayers === "deep") {
    lines.push("- Use depth through layering (overlapping elements, z-index)");
  }
  if (a.density === "sparse") {
    lines.push("- Let whitespace create breathing room matching the photograph's negative space");
  }
}

function appendEditorialBlueprint(lines: string[], a: CompositionAnalysis): void {
  const e = a.editorial;
  if (!e) return;

  lines.push("EDITORIAL STRUCTURE:");
  lines.push(`- Text-image: ${e.textImageRelationship}`);
  lines.push(`- Typography placement: ${e.typographyPlacement}`);
  lines.push(`- White space: ${e.whiteSpaceStrategy}`);
  lines.push(`- Image cropping: ${e.imageCropping}`);
  lines.push(`- Pacing: ${e.pacing}`);

  lines.push("");
  lines.push("TYPOGRAPHY SPACING:");
  lines.push(`- Baseline grid: ${e.baselineGridAdherence}`);
  lines.push(`- Type-to-margin: ${e.typeToMargin}`);
  if (e.pullQuoteScale) lines.push(`- Pull quotes: ${e.pullQuoteScale} scale`);
  lines.push(`- Paragraph spacing: ${e.paragraphSpacing}`);
  lines.push(`- Line height: ${a.lineHeightCharacter}`);
  lines.push(`- Letter spacing: ${a.letterSpacingIntent}`);
  if (e.captionTreatment && e.captionTreatment !== "none") {
    lines.push(`- Caption treatment: ${e.captionTreatment}`);
  }
}

function appendSecondaryInfluence(lines: string[], a: CompositionAnalysis): void {
  if (!a.secondaryTraits?.length) return;
  lines.push("");
  lines.push(`${a.secondaryTraits[0].toUpperCase()} INFLUENCE:`);
  if (a.secondaryTraits.includes("editorial") && a.editorial) {
    lines.push(`- Text-image relationship trends toward ${a.editorial.textImageRelationship}`);
    lines.push(`- White space strategy: ${a.editorial.whiteSpaceStrategy}`);
  }
  if (a.secondaryTraits.includes("photograph") && a.photograph) {
    lines.push(`- Compositional mood: ${a.photograph.mood}`);
    lines.push(`- Lighting influence: ${a.photograph.lightDirection}`);
  }
}

export function summarizeCompositionsForTaste(
  compositions: Array<{
    analysis: CompositionAnalysis;
    weight: "primary" | "default" | "muted";
    referenceIndex: number;
  }>
): string {
  if (compositions.length === 0) return "";

  return compositions
    .filter((c) => c.weight !== "muted")
    .map((c, i) => {
      const a = c.analysis;
      const weightLabel = c.weight === "primary" ? "(primary)" : "(default)";
      const parts: string[] = [];

      parts.push(`Reference ${i + 1} ${weightLabel}: ${a.referenceType}`);

      if (a.screenshot) {
        const sections = a.screenshot.sectionInventory?.map((s) => s.type).join(", ");
        parts.push(`sections: ${sections ?? "unknown"}`);
        parts.push(`${a.screenshot.componentSignature.cornerStyle} corners`);
      }
      if (a.photograph) {
        parts.push(`${a.photograph.subjectArchetype} photography`);
        parts.push(`${a.photograph.compositionType} composition`);
        parts.push(`mood: ${a.photograph.mood}`);
      }
      if (a.editorial) {
        parts.push(`text-image: ${a.editorial.textImageRelationship}`);
        parts.push(`pacing: ${a.editorial.pacing}`);
      }

      parts.push(`${a.balance} balance, ${a.density} density, ${a.tension} tension`);
      parts.push(`era: ${a.era}`);

      return parts.join(", ");
    })
    .join("\n");
}
