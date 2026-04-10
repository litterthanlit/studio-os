import type { CompositionAnalysis } from "@/types/composition-analysis";

type FidelityMode = "close" | "balanced" | "push";

type BlueprintInput = {
  compositions: Array<{
    analysis: CompositionAnalysis;
    weight: "primary" | "default" | "muted";
    referenceIndex: number;
  }>;
  fidelityMode: FidelityMode;
};

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
  lines.push("");
  lines.push("Where the COMPOSITION BLUEPRINT conflicts with archetype grammar, follow the blueprint.");
  lines.push("Where HARD taste directives conflict with the blueprint, follow the directive. SOFT directives yield to blueprint structure.");

  return lines.join("\n");
}

function selectPrimaryComposition(
  compositions: BlueprintInput["compositions"]
): BlueprintInput["compositions"][number] | null {
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
  lines.push(`- Spacing system: ${a.spacingSystem}`);
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
