import type { IntentProfile } from "@/types/intent-profile";
import type { TasteProfile } from "@/types/taste-profile";
import type { DesignKnobVector } from "./design-knobs";
import type { DesignNode } from "./design-node";
import { computeDesignNodeTasteMetrics } from "./design-node-taste-validator";

export type StructuralTasteEdit = {
  dimension:
    | "sectionCount"
    | "sectionRemoved"
    | "sectionAdded"
    | "sectionOrder"
    | "ctaHierarchy"
    | "buttonToTextLink"
    | "imageSizing"
    | "fullBleedUsage"
    | "cardGridRemoved"
    | "layoutMode"
    | "gridRatio"
    | "copyDensity"
    | "componentChrome"
    | "imagerySubject";
  before: unknown;
  after: unknown;
  confidence: number;
  description: string;
  suggestedOverride: Partial<TasteProfile["userOverrides"]> | Partial<IntentProfile> | Partial<DesignKnobVector>;
};

export function detectStructuralTasteEdits(currentTree: DesignNode, snapshotTree: DesignNode): StructuralTasteEdit[] {
  const current = computeDesignNodeTasteMetrics(currentTree);
  const snapshot = computeDesignNodeTasteMetrics(snapshotTree);
  const edits: StructuralTasteEdit[] = [];

  if (current.sectionCount !== snapshot.sectionCount) {
    edits.push({
      dimension: current.sectionCount < snapshot.sectionCount ? "sectionRemoved" : "sectionAdded",
      before: snapshot.sectionCount,
      after: current.sectionCount,
      confidence: 0.75,
      description: `${current.sectionCount < snapshot.sectionCount ? "Removed" : "Added"} sections: ${snapshot.sectionCount} -> ${current.sectionCount}`,
      suggestedOverride: {
        contentPriority: [],
        mustAvoid: current.sectionCount < snapshot.sectionCount ? ["extra sections unless explicitly requested"] : [],
      },
    });
    edits.push({
      dimension: "sectionCount",
      before: snapshot.sectionCount,
      after: current.sectionCount,
      confidence: 0.7,
      description: `Changed preferred section count: ${snapshot.sectionCount} -> ${current.sectionCount}`,
      suggestedOverride: {
        layout: { sectionCount: { min: Math.max(1, current.sectionCount - 1), max: current.sectionCount + 1 } },
      } as Partial<DesignKnobVector>,
    });
  }

  if (snapshot.cardGridCount > current.cardGridCount) {
    edits.push({
      dimension: "cardGridRemoved",
      before: snapshot.cardGridCount,
      after: current.cardGridCount,
      confidence: 0.85,
      description: "Removed card-grid structure from generated output",
      suggestedOverride: {
        components: { cardGridLikelihood: 0.05 },
      } as Partial<DesignKnobVector>,
    });
  }

  if (snapshot.buttonCount > current.buttonCount && current.textLinkCount > snapshot.textLinkCount) {
    edits.push({
      dimension: "buttonToTextLink",
      before: { buttons: snapshot.buttonCount, textLinks: snapshot.textLinkCount },
      after: { buttons: current.buttonCount, textLinks: current.textLinkCount },
      confidence: 0.8,
      description: "Converted button CTAs toward text-link hierarchy",
      suggestedOverride: {
        ctaStyle: "text-link-preferred",
      } as Partial<TasteProfile["userOverrides"]>,
    });
  }

  if (current.fullBleedSectionCount > snapshot.fullBleedSectionCount) {
    edits.push({
      dimension: "fullBleedUsage",
      before: snapshot.fullBleedSectionCount,
      after: current.fullBleedSectionCount,
      confidence: 0.75,
      description: "Increased full-bleed image usage",
      suggestedOverride: {
        layout: { fullBleedRatio: Math.min(1, current.fullBleedSectionCount / Math.max(1, current.sectionCount)) },
        imagery: { dominance: 0.75 },
      } as Partial<DesignKnobVector>,
    });
  }

  if (current.layoutModes.grid !== snapshot.layoutModes.grid || current.layoutModes.absolute !== snapshot.layoutModes.absolute) {
    edits.push({
      dimension: "layoutMode",
      before: snapshot.layoutModes,
      after: current.layoutModes,
      confidence: 0.65,
      description: "Changed structural layout mode mix",
      suggestedOverride: {
        layout: {
          gridStrictness: current.layoutModes.grid > snapshot.layoutModes.grid ? 0.8 : 0.35,
          overlapDepth: current.layoutModes.absolute > snapshot.layoutModes.absolute ? 0.5 : 0.1,
        },
      } as Partial<DesignKnobVector>,
    });
  }

  if (current.shadowUsageCount < snapshot.shadowUsageCount || current.averageRadius < snapshot.averageRadius * 0.75) {
    edits.push({
      dimension: "componentChrome",
      before: { shadows: snapshot.shadowUsageCount, radius: snapshot.averageRadius },
      after: { shadows: current.shadowUsageCount, radius: current.averageRadius },
      confidence: 0.7,
      description: "Reduced component chrome",
      suggestedOverride: {
        components: { shadowDepth: 0.05, radius: Math.min(0.25, current.averageRadius / 32) },
      } as Partial<DesignKnobVector>,
    });
  }

  return edits;
}
