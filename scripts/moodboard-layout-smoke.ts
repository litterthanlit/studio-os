import assert from "node:assert/strict";
import {
  createMoodboardReferenceItem,
  getEffectiveReferenceWeight,
  type CanvasItem,
  type ReferenceItem,
} from "../lib/canvas/unified-canvas-state";

const existing: ReferenceItem[] = [
  {
    id: "ref-a",
    kind: "reference",
    x: 100,
    y: 146,
    width: 260,
    height: 340,
    zIndex: 1,
    locked: false,
    imageUrl: "a.jpg",
    weight: "primary",
  },
  {
    id: "ref-b",
    kind: "reference",
    x: 380,
    y: 146,
    width: 180,
    height: 220,
    zIndex: 2,
    locked: false,
    imageUrl: "b.jpg",
  },
] as CanvasItem[] as ReferenceItem[];

const next = createMoodboardReferenceItem({
  id: "ref-c",
  imageUrl: "c.jpg",
  title: "C",
  naturalWidth: 1200,
  naturalHeight: 1600,
  existingItems: existing,
  zIndex: 3,
});

assert.equal(next.kind, "reference");
assert.equal(next.x, 500);
assert.equal(next.y, 146);
assert.equal(next.width, 180);
assert.equal(next.height, 240);

assert.equal(
  getEffectiveReferenceWeight({
    ...next,
    compositionAnalysis: {
      referenceType: "poster",
      referenceConfidence: "high",
      era: "contemporary",
      analyzedAt: new Date().toISOString(),
      balance: "dynamic",
      density: "balanced",
      tension: "moderate",
      keyCompositionalMove: "Clear focal hierarchy",
      spacingSystem: "8px-grid",
      typographicDensity: "balanced",
      hierarchyClarity: "obvious",
      displayTypePlacement: "centered",
      lineHeightCharacter: "balanced-readable",
      letterSpacingIntent: "neutral",
      headingToBodyRatio: "dramatic",
    },
  }),
  "primary"
);

console.log("moodboard layout smoke passed");
