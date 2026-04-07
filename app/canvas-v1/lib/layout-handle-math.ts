// Task 1.1: Gap-First Layout Manipulation — Math Utilities
// Phase 1: Gap handle positioning and drag-to-resize math

export type GapRect = {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
};

/**
 * Calculate gap rectangles between flex/grid children.
 * 
 * For row layout: gaps are vertical strips between children (x-axis gaps)
 * For column layout: gaps are horizontal strips between children (y-axis gaps)
 * 
 * All coordinates are relative to the parent container.
 */
export function calculateGapRects(
  parentRect: DOMRect,
  childRects: DOMRect[],
  direction: "row" | "column"
): GapRect[] {
  if (childRects.length < 2) {
    return [];
  }

  const gaps: GapRect[] = [];

  // Sort children by position to ensure correct gap ordering
  const sortedChildren = [...childRects].sort((a, b) => {
    if (direction === "row") {
      return a.left - b.left;
    } else {
      return a.top - b.top;
    }
  });

  for (let i = 0; i < sortedChildren.length - 1; i++) {
    const current = sortedChildren[i];
    const next = sortedChildren[i + 1];

    let gapRect: GapRect;

    if (direction === "row") {
      // Row layout: vertical gap strip between children
      const gapLeft = current.right - parentRect.left;
      const gapRight = next.left - parentRect.left;
      const gapWidth = gapRight - gapLeft;
      
      // Height spans from top of highest child to bottom of lowest child
      const gapTop = Math.min(current.top, next.top) - parentRect.top;
      const gapBottom = Math.max(current.bottom, next.bottom) - parentRect.top;
      const gapHeight = gapBottom - gapTop;

      gapRect = {
        index: i,
        x: gapLeft,
        y: gapTop,
        width: gapWidth,
        height: gapHeight,
        centerX: gapLeft + gapWidth / 2,
        centerY: gapTop + gapHeight / 2,
      };
    } else {
      // Column layout: horizontal gap strip between children
      const gapTop = current.bottom - parentRect.top;
      const gapBottom = next.top - parentRect.top;
      const gapHeight = gapBottom - gapTop;

      // Width spans from left of leftmost child to right of rightmost child
      const gapLeft = Math.min(current.left, next.left) - parentRect.left;
      const gapRight = Math.max(current.right, next.right) - parentRect.left;
      const gapWidth = gapRight - gapLeft;

      gapRect = {
        index: i,
        x: gapLeft,
        y: gapTop,
        width: gapWidth,
        height: gapHeight,
        centerX: gapLeft + gapWidth / 2,
        centerY: gapTop + gapHeight / 2,
      };
    }

    gaps.push(gapRect);
  }

  return gaps;
}

/**
 * Convert drag delta (screen pixels) to gap value change.
 * 
 * @param deltaPixels - Screen pixel delta from drag operation
 * @param direction - Layout direction (row uses delta X, column uses delta Y)
 * @param zoom - Current canvas zoom level (screen pixels ÷ zoom = canvas pixels)
 * @returns Gap value change in canvas pixels
 */
export function deltaToGap(
  deltaPixels: number,
  direction: "row" | "column",
  zoom: number
): number {
  // Account for zoom: screen pixels need to be converted to canvas pixels
  const effectiveZoom = zoom > 0 ? zoom : 1;
  return deltaPixels / effectiveZoom;
}

/**
 * Constrain a numeric value to min/max bounds.
 * Default minimum is 0 (gap values cannot be negative).
 */
export function constrainValue(value: number, min = 0, max?: number): number {
  let constrained = Math.max(min, value);
  if (max !== undefined) {
    constrained = Math.min(max, constrained);
  }
  return constrained;
}

/**
 * Format a numeric value for display in measurement labels.
 * Returns integer pixel values like "24px".
 */
export function formatMeasurement(value: number): string {
  const rounded = Math.round(value);
  return `${rounded}px`;
}

/**
 * Extend a gap rectangle's hit area for easier mouse targeting.
 * Framer-style: expand the rect by padding in all directions while
 * maintaining the same center point.
 */
export function extendGapHitArea(gapRect: GapRect, padding: number): GapRect {
  const newWidth = gapRect.width + padding * 2;
  const newHeight = gapRect.height + padding * 2;
  
  return {
    index: gapRect.index,
    x: gapRect.centerX - newWidth / 2,
    y: gapRect.centerY - newHeight / 2,
    width: newWidth,
    height: newHeight,
    centerX: gapRect.centerX,
    centerY: gapRect.centerY,
  };
}

// ============================================================================
// Padding calculations
// ============================================================================

export type PaddingHandlePosition = {
  side: "top" | "right" | "bottom" | "left";
  x: number; // handle center x (relative to container)
  y: number; // handle center y (relative to container)
  currentValue: number;
};

/** Calculate padding handle positions for a frame */
export function calculatePaddingPositions(
  nodeRect: { x: number; y: number; width: number; height: number },
  padding: { top?: number; right?: number; bottom?: number; left?: number }
): PaddingHandlePosition[] {
  const p = { top: 0, right: 0, bottom: 0, left: 0, ...padding };
  
  return [
    {
      side: "top",
      x: nodeRect.x + nodeRect.width / 2,
      y: nodeRect.y + p.top / 2, // centered in padding area
      currentValue: p.top,
    },
    {
      side: "right",
      x: nodeRect.x + nodeRect.width - p.right / 2,
      y: nodeRect.y + nodeRect.height / 2,
      currentValue: p.right,
    },
    {
      side: "bottom",
      x: nodeRect.x + nodeRect.width / 2,
      y: nodeRect.y + nodeRect.height - p.bottom / 2,
      currentValue: p.bottom,
    },
    {
      side: "left",
      x: nodeRect.x + p.left / 2,
      y: nodeRect.y + nodeRect.height / 2,
      currentValue: p.left,
    },
  ];
}

/** Convert drag delta to new padding value */
export function deltaToPadding(
  deltaPixels: number,
  side: "top" | "right" | "bottom" | "left",
  zoom: number
): number {
  // For top/left: negative delta = smaller padding
  // For bottom/right: positive delta = smaller padding (inverted)
  const multiplier = side === "top" || side === "left" ? -1 : 1;
  return (deltaPixels * multiplier) / zoom;
}

/** Merge padding update with existing values (prevents wiping other sides) */
export function mergePadding(
  current: { top?: number; right?: number; bottom?: number; left?: number } | undefined,
  side: "top" | "right" | "bottom" | "left",
  value: number
): { top?: number; right?: number; bottom?: number; left?: number } {
  return {
    ...current,
    [side]: value,
  };
}

/** Apply modifier keys to padding update */
export function applyPaddingModifiers(
  current: { top?: number; right?: number; bottom?: number; left?: number } | undefined,
  side: "top" | "right" | "bottom" | "left",
  value: number,
  modifiers: { shift: boolean; option: boolean }
): { top?: number; right?: number; bottom?: number; left?: number } {
  const base = { top: 0, right: 0, bottom: 0, left: 0, ...current };
  
  if (modifiers.option && modifiers.shift) {
    // Adjust all sides equally
    return {
      top: value,
      right: value,
      bottom: value,
      left: value,
    };
  }
  
  if (modifiers.option) {
    // Adjust opposite side
    const opposites: Record<string, string> = {
      top: "bottom",
      bottom: "top",
      left: "right",
      right: "left",
    };
    return {
      ...base,
      [side]: value,
      [opposites[side]]: value,
    };
  }
  
  // Single side only
  return {
    ...base,
    [side]: value,
  };
}

// ============================================================================
// Self-executing tests (run in dev mode with ?test=math)
// ============================================================================

if (typeof window !== "undefined" && window.location?.search?.includes("test=math")) {
  console.log("=== Testing layout-handle-math ===\n");

  // Test data
  const parentRect = new DOMRect(0, 0, 500, 400);
  
  const childRects = [
    new DOMRect(20, 20, 100, 80),   // Child 0
    new DOMRect(140, 30, 120, 70),  // Child 1 (gap: 20px between x=120 and x=140)
    new DOMRect(280, 25, 100, 85),  // Child 2 (gap: 20px between x=260 and x=280)
  ];

  // Test 1: calculateGapRects (row)
  console.log("Test 1: calculateGapRects (row)");
  const rowGaps = calculateGapRects(parentRect, childRects, "row");
  console.log("  Found gaps:", rowGaps.length, "(expected: 2)");
  console.log("  Gap 0 width:", rowGaps[0]?.width, "(expected: 20)");
  console.log("  Gap 0 centerX:", rowGaps[0]?.centerX, "(expected: 130)");
  console.assert(rowGaps.length === 2, "Should have 2 gaps for 3 children");
  console.assert(rowGaps[0]?.width === 20, "Gap 0 should be 20px wide");
  console.assert(rowGaps[0]?.centerX === 130, "Gap 0 center should be at x=130");

  // Test 2: calculateGapRects (column)
  console.log("\nTest 2: calculateGapRects (column)");
  const columnChildren = [
    new DOMRect(20, 20, 100, 80),
    new DOMRect(25, 120, 90, 70),  // 20px gap between y=100 and y=120
    new DOMRect(30, 210, 95, 75),  // 20px gap between y=190 and y=210
  ];
  const colGaps = calculateGapRects(parentRect, columnChildren, "column");
  console.log("  Found gaps:", colGaps.length, "(expected: 2)");
  console.log("  Gap 0 height:", colGaps[0]?.height, "(expected: 20)");
  console.log("  Gap 0 centerY:", colGaps[0]?.centerY, "(expected: 110)");
  console.assert(colGaps.length === 2, "Should have 2 gaps for 3 children");
  console.assert(colGaps[0]?.height === 20, "Gap 0 should be 20px tall");
  console.assert(colGaps[0]?.centerY === 110, "Gap 0 center should be at y=110");

  // Test 3: calculateGapRects (edge case: single child)
  console.log("\nTest 3: calculateGapRects (single child)");
  const singleGap = calculateGapRects(parentRect, [childRects[0]], "row");
  console.log("  Found gaps:", singleGap.length, "(expected: 0)");
  console.assert(singleGap.length === 0, "Single child should have no gaps");

  // Test 4: deltaToGap
  console.log("\nTest 4: deltaToGap");
  const delta1 = deltaToGap(50, "row", 1);
  const delta2 = deltaToGap(50, "row", 0.5);
  const delta3 = deltaToGap(50, "column", 2);
  console.log("  50px @ 1x zoom:", delta1, "(expected: 50)");
  console.log("  50px @ 0.5x zoom:", delta2, "(expected: 100)");
  console.log("  50px @ 2x zoom:", delta3, "(expected: 25)");
  console.assert(delta1 === 50, "At 1x zoom, pixels equal canvas units");
  console.assert(delta2 === 100, "At 0.5x zoom, screen pixels are half canvas pixels");
  console.assert(delta3 === 25, "At 2x zoom, screen pixels are double canvas pixels");

  // Test 5: constrainValue
  console.log("\nTest 5: constrainValue");
  console.log("  constrainValue(5):", constrainValue(5), "(expected: 5)");
  console.log("  constrainValue(-10):", constrainValue(-10), "(expected: 0)");
  console.log("  constrainValue(150, 0, 100):", constrainValue(150, 0, 100), "(expected: 100)");
  console.log("  constrainValue(25, 10, 50):", constrainValue(25, 10, 50), "(expected: 25)");
  console.assert(constrainValue(5) === 5, "Positive value within range");
  console.assert(constrainValue(-10) === 0, "Negative value clamped to 0");
  console.assert(constrainValue(150, 0, 100) === 100, "Value clamped to max");
  console.assert(constrainValue(25, 10, 50) === 25, "Value within custom range");

  // Test 6: formatMeasurement
  console.log("\nTest 6: formatMeasurement");
  console.log("  formatMeasurement(24):", formatMeasurement(24), '(expected: "24px")');
  console.log("  formatMeasurement(24.7):", formatMeasurement(24.7), '(expected: "25px")');
  console.log("  formatMeasurement(24.2):", formatMeasurement(24.2), '(expected: "24px")');
  console.assert(formatMeasurement(24) === "24px", "Integer formatted correctly");
  console.assert(formatMeasurement(24.7) === "25px", "Rounded up correctly");
  console.assert(formatMeasurement(24.2) === "24px", "Rounded down correctly");

  // Test 7: extendGapHitArea
  console.log("\nTest 7: extendGapHitArea");
  const testGap: GapRect = {
    index: 0,
    x: 100,
    y: 50,
    width: 20,
    height: 60,
    centerX: 110,
    centerY: 80,
  };
  const extended = extendGapHitArea(testGap, 10);
  console.log("  Original:", { w: testGap.width, h: testGap.height, x: testGap.x, y: testGap.y });
  console.log("  Extended:", { w: extended.width, h: extended.height, x: extended.x, y: extended.y });
  console.log("  Center preserved:", extended.centerX === testGap.centerX && extended.centerY === testGap.centerY);
  console.assert(extended.width === 40, "Width increased by 2*padding");
  console.assert(extended.height === 80, "Height increased by 2*padding");
  console.assert(extended.centerX === 110, "Center X preserved");
  console.assert(extended.centerY === 80, "Center Y preserved");

  // Test 8: calculatePaddingPositions
  console.log("\nTest 8: calculatePaddingPositions");
  const frameRect = { x: 100, y: 50, width: 300, height: 200 };
  const padding = { top: 20, right: 30, bottom: 40, left: 50 };
  const positions = calculatePaddingPositions(frameRect, padding);
  console.log("  Found positions:", positions.length, "(expected: 4)");
  console.log("  Top handle:", { x: positions[0]?.x, y: positions[0]?.y, value: positions[0]?.currentValue });
  console.log("  Right handle:", { x: positions[1]?.x, y: positions[1]?.y, value: positions[1]?.currentValue });
  console.log("  Bottom handle:", { x: positions[2]?.x, y: positions[2]?.y, value: positions[2]?.currentValue });
  console.log("  Left handle:", { x: positions[3]?.x, y: positions[3]?.y, value: positions[3]?.currentValue });
  console.assert(positions.length === 4, "Should have 4 padding handles");
  console.assert(positions[0]?.side === "top" && positions[0]?.currentValue === 20, "Top handle correct");
  console.assert(positions[0]?.x === 250 && positions[0]?.y === 60, "Top handle centered at x=250, y=60 (frame top + padding/2)");
  console.assert(positions[1]?.side === "right" && positions[1]?.currentValue === 30, "Right handle correct");
  console.assert(positions[1]?.x === 385 && positions[1]?.y === 150, "Right handle centered at x=385 (frame right - padding/2), y=150");
  console.assert(positions[2]?.side === "bottom" && positions[2]?.currentValue === 40, "Bottom handle correct");
  console.assert(positions[2]?.x === 250 && positions[2]?.y === 230, "Bottom handle centered at x=250, y=230 (frame bottom - padding/2)");
  console.assert(positions[3]?.side === "left" && positions[3]?.currentValue === 50, "Left handle correct");
  console.assert(positions[3]?.x === 125 && positions[3]?.y === 150, "Left handle centered at x=125 (frame left + padding/2), y=150");

  // Test 9: calculatePaddingPositions (defaults to 0 for missing sides)
  console.log("\nTest 9: calculatePaddingPositions (defaults)");
  const partialPadding = { top: 10 };
  const defaultPositions = calculatePaddingPositions(frameRect, partialPadding);
  console.log("  Default values:", {
    top: defaultPositions[0]?.currentValue,
    right: defaultPositions[1]?.currentValue,
    bottom: defaultPositions[2]?.currentValue,
    left: defaultPositions[3]?.currentValue,
  });
  console.assert(defaultPositions[0]?.currentValue === 10, "Top uses provided value");
  console.assert(defaultPositions[1]?.currentValue === 0, "Right defaults to 0");
  console.assert(defaultPositions[2]?.currentValue === 0, "Bottom defaults to 0");
  console.assert(defaultPositions[3]?.currentValue === 0, "Left defaults to 0");

  // Test 10: deltaToPadding
  console.log("\nTest 10: deltaToPadding");
  const topDelta = deltaToPadding(20, "top", 1);
  const leftDelta = deltaToPadding(20, "left", 1);
  const rightDelta = deltaToPadding(20, "right", 1);
  const bottomDelta = deltaToPadding(20, "bottom", 1);
  const zoomedDelta = deltaToPadding(50, "top", 0.5);
  console.log("  20px @ 1x zoom top:", topDelta, "(expected: -20)");
  console.log("  20px @ 1x zoom left:", leftDelta, "(expected: -20)");
  console.log("  20px @ 1x zoom right:", rightDelta, "(expected: 20)");
  console.log("  20px @ 1x zoom bottom:", bottomDelta, "(expected: 20)");
  console.log("  50px @ 0.5x zoom top:", zoomedDelta, "(expected: -100)");
  console.assert(topDelta === -20, "Top: negative delta reduces padding");
  console.assert(leftDelta === -20, "Left: negative delta reduces padding");
  console.assert(rightDelta === 20, "Right: positive delta reduces padding");
  console.assert(bottomDelta === 20, "Bottom: positive delta reduces padding");
  console.assert(zoomedDelta === -100, "Zoom is applied correctly");

  // Test 11: mergePadding
  console.log("\nTest 11: mergePadding");
  const current = { top: 10, right: 20, bottom: 30, left: 40 };
  const merged = mergePadding(current, "top", 50);
  console.log("  Original:", current);
  console.log("  After merging top=50:", merged);
  console.assert(merged.top === 50, "Top value updated");
  console.assert(merged.right === 20, "Right value preserved");
  console.assert(merged.bottom === 30, "Bottom value preserved");
  console.assert(merged.left === 40, "Left value preserved");
  // Original should be unchanged
  console.assert(current.top === 10, "Original object not mutated");

  // Test 12: mergePadding (undefined current)
  console.log("\nTest 12: mergePadding (undefined current)");
  const fromUndefined = mergePadding(undefined, "right", 25);
  console.log("  From undefined:", fromUndefined);
  console.assert(fromUndefined.right === 25, "Side set correctly");
  console.assert(fromUndefined.top === undefined, "Other sides undefined");

  // Test 13: applyPaddingModifiers (single side - no modifiers)
  console.log("\nTest 13: applyPaddingModifiers (single side)");
  const currentPad = { top: 10, right: 20, bottom: 30, left: 40 };
  const single = applyPaddingModifiers(currentPad, "top", 60, { shift: false, option: false });
  console.log("  After top=60:", single);
  console.assert(single.top === 60, "Top updated");
  console.assert(single.right === 20, "Right unchanged");
  console.assert(single.bottom === 30, "Bottom unchanged");
  console.assert(single.left === 40, "Left unchanged");

  // Test 14: applyPaddingModifiers (Option = opposite side)
  console.log("\nTest 14: applyPaddingModifiers (Option = opposite side)");
  const opposite = applyPaddingModifiers(currentPad, "top", 60, { shift: false, option: true });
  console.log("  Option+top=60:", opposite);
  console.assert(opposite.top === 60, "Top updated");
  console.assert(opposite.bottom === 60, "Bottom (opposite) updated");
  console.assert(opposite.right === 20, "Right unchanged");
  console.assert(opposite.left === 40, "Left unchanged");

  const oppositeRight = applyPaddingModifiers(currentPad, "right", 100, { shift: false, option: true });
  console.log("  Option+right=100:", oppositeRight);
  console.assert(oppositeRight.right === 100 && oppositeRight.left === 100, "Right+Left updated as opposites");

  // Test 15: applyPaddingModifiers (Shift+Option = all sides)
  console.log("\nTest 15: applyPaddingModifiers (Shift+Option = all sides)");
  const allSides = applyPaddingModifiers(currentPad, "top", 80, { shift: true, option: true });
  console.log("  Shift+Option+top=80:", allSides);
  console.assert(allSides.top === 80, "Top set to value");
  console.assert(allSides.right === 80, "Right set to value");
  console.assert(allSides.bottom === 80, "Bottom set to value");
  console.assert(allSides.left === 80, "Left set to value");

  // Test 16: applyPaddingModifiers (with undefined current)
  console.log("\nTest 16: applyPaddingModifiers (undefined current, defaults to 0)");
  const fromEmpty = applyPaddingModifiers(undefined, "left", 50, { shift: false, option: true });
  console.log("  From empty with Option+left=50:", fromEmpty);
  console.assert(fromEmpty.left === 50 && fromEmpty.right === 50, "Left+Right (opposites) set, others default to 0");
  console.assert(fromEmpty.top === 0 && fromEmpty.bottom === 0, "Unspecified sides default to 0");

  console.log("\n=== All tests complete ===");
}
