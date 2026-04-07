// app/canvas-v1/lib/property-comparison.ts
// Property Comparison Engine for Advanced Multi-Edit / Shared Properties
// Compares property values across multiple DesignNodes to determine shared/mixed/incompatible states

import type { DesignNode, DesignNodeStyle, DesignNodeContent } from "@/lib/canvas/design-node";

export interface PropertyComparison<T> {
  status: "shared" | "mixed" | "incompatible";
  sharedValue?: T;
  values?: Map<string, T>; // nodeId -> value (for mixed)
}

/**
 * Deep equality check for values (handles objects, arrays, primitives)
 * Performance: O(n) for objects, exits early on first difference
 */
function isEqual<T>(a: T, b: T): boolean {
  // Handle primitive types and reference equality
  if (a === b) return true;

  // Handle null/undefined
  if (a == null || b == null) return a === b;

  // Handle different types
  if (typeof a !== typeof b) return false;

  // Handle arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!isEqual(a[i], b[i])) return false;
    }
    return true;
  }

  // Handle objects (including padding, etc.)
  if (typeof a === "object" && typeof b === "object") {
    const keysA = Object.keys(a as Record<string, unknown>);
    const keysB = Object.keys(b as Record<string, unknown>);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      const valA = (a as Record<string, unknown>)[key];
      const valB = (b as Record<string, unknown>)[key];
      if (!isEqual(valA, valB)) return false;
    }
    return true;
  }

  return false;
}

/**
 * Compare a single property across multiple nodes
 * @param nodes - Array of DesignNodes to compare
 * @param getter - Function to extract the property value from a node
 * @returns PropertyComparison with status and values
 * 
 * Performance: O(n) where n = nodes.length, exits early on first difference
 */
export function compareProperty<T>(
  nodes: DesignNode[],
  getter: (n: DesignNode) => T
): PropertyComparison<T> {
  // Edge case: 0 nodes
  if (nodes.length === 0) {
    return { status: "incompatible" };
  }

  // Edge case: 1 node
  if (nodes.length === 1) {
    return {
      status: "shared",
      sharedValue: getter(nodes[0]),
    };
  }

  // Get first value for comparison
  const firstValue = getter(nodes[0]);
  const values = new Map<string, T>();
  values.set(nodes[0].id, firstValue);

  // Compare remaining nodes - early exit on first difference
  for (let i = 1; i < nodes.length; i++) {
    const node = nodes[i];
    const value = getter(node);
    values.set(node.id, value);

    // Early exit: if we find a difference, we know it's mixed
    if (!isEqual(firstValue, value)) {
      // Continue collecting all values for the mixed result
      for (let j = i + 1; j < nodes.length; j++) {
        const remainingNode = nodes[j];
        values.set(remainingNode.id, getter(remainingNode));
      }
      return {
        status: "mixed",
        values,
      };
    }
  }

  // All values equal
  return {
    status: "shared",
    sharedValue: firstValue,
  };
}

/**
 * Type for common style property keys in DesignNodeStyle
 */
type StylePropertyKey = keyof DesignNodeStyle;

/**
 * Type for common content property keys in DesignNodeContent
 */
type ContentPropertyKey = keyof DesignNodeContent;

/**
 * Result of comparing multiple nodes across common properties
 */
export interface NodeComparisonResult {
  style: Partial<Record<StylePropertyKey, PropertyComparison<unknown>>>;
  content: Partial<Record<ContentPropertyKey, PropertyComparison<unknown>>>;
  type: PropertyComparison<DesignNode["type"]>; // node type comparison
  name: PropertyComparison<string>; // node name comparison
}

/**
 * List of common style properties to compare
 * These are the most frequently edited properties in the inspector
 */
const COMMON_STYLE_PROPERTIES: StylePropertyKey[] = [
  // Positioning
  "position",
  "x",
  "y",
  "width",
  "height",
  "zIndex",
  "overflow",

  // Layout
  "display",
  "flexDirection",
  "gap",
  "alignItems",
  "justifyContent",
  "gridTemplate",
  "flexGrow",
  "flexShrink",
  "aspectRatio",

  // Spacing
  "padding",

  // Typography
  "fontFamily",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
  "fontStyle",
  "textDecoration",
  "textAlign",

  // Visual
  "background",
  "coverImage",
  "coverSize",
  "coverPosition",
  "foreground",
  "muted",
  "accent",
  "borderColor",
  "borderWidth",
  "borderRadius",
  "opacity",
  "shadow",
  "scrimEnabled",
  "blur",
  "objectFit",
  "maxWidth",
];

/**
 * List of common content properties to compare
 */
const COMMON_CONTENT_PROPERTIES: ContentPropertyKey[] = [
  "text",
  "subtext",
  "kicker",
  "label",
  "href",
  "src",
  "alt",
  "icon",
];

/**
 * Compare multiple DesignNodes across all common properties
 * @param nodes - Array of DesignNodes to compare
 * @returns NodeComparisonResult with comparisons for style, content, type, and name
 * 
 * Performance: O(p * n) where p = properties count, n = nodes count
 * Early exit optimization: stops comparing a property on first difference
 */
export function compareNodes(nodes: DesignNode[]): NodeComparisonResult {
  const style: Partial<Record<StylePropertyKey, PropertyComparison<unknown>>> = {};
  const content: Partial<Record<ContentPropertyKey, PropertyComparison<unknown>>> = {};

  // Compare style properties
  for (const prop of COMMON_STYLE_PROPERTIES) {
    style[prop] = compareProperty(nodes, (n) => n.style[prop]);
  }

  // Compare content properties
  for (const prop of COMMON_CONTENT_PROPERTIES) {
    content[prop] = compareProperty(nodes, (n) => n.content?.[prop]);
  }

  return {
    style,
    content,
    type: compareProperty(nodes, (n) => n.type),
    name: compareProperty(nodes, (n) => n.name),
  };
}

/**
 * Compare a specific subset of style properties
 * Useful for inspector sections that only care about certain properties
 * @param nodes - Array of DesignNodes to compare
 * @param properties - Array of style property keys to compare
 * @returns Partial record of property comparisons
 */
export function compareStyleProperties(
  nodes: DesignNode[],
  properties: StylePropertyKey[]
): Partial<Record<StylePropertyKey, PropertyComparison<unknown>>> {
  const result: Partial<Record<StylePropertyKey, PropertyComparison<unknown>>> = {};

  for (const prop of properties) {
    result[prop] = compareProperty(nodes, (n) => n.style[prop]);
  }

  return result;
}

/**
 * Compare spacing-related properties (padding, gap)
 * @param nodes - Array of DesignNodes to compare
 * @returns Comparisons for padding and gap
 */
export function compareSpacingProperties(
  nodes: DesignNode[]
): Pick<NodeComparisonResult["style"], "padding" | "gap"> {
  return {
    padding: compareProperty(nodes, (n) => n.style.padding),
    gap: compareProperty(nodes, (n) => n.style.gap),
  };
}

/**
 * Compare size-related properties (width, height)
 * @param nodes - Array of DesignNodes to compare
 * @returns Comparisons for width and height
 */
export function compareSizeProperties(
  nodes: DesignNode[]
): Pick<NodeComparisonResult["style"], "width" | "height"> {
  return {
    width: compareProperty(nodes, (n) => n.style.width),
    height: compareProperty(nodes, (n) => n.style.height),
  };
}

/**
 * Compare typography-related properties
 * @param nodes - Array of DesignNodes to compare
 * @returns Comparisons for typography properties
 */
export function compareTypographyProperties(
  nodes: DesignNode[]
): Pick<
  NodeComparisonResult["style"],
  | "fontFamily"
  | "fontSize"
  | "fontWeight"
  | "lineHeight"
  | "letterSpacing"
  | "fontStyle"
  | "textDecoration"
  | "textAlign"
> {
  return {
    fontFamily: compareProperty(nodes, (n) => n.style.fontFamily),
    fontSize: compareProperty(nodes, (n) => n.style.fontSize),
    fontWeight: compareProperty(nodes, (n) => n.style.fontWeight),
    lineHeight: compareProperty(nodes, (n) => n.style.lineHeight),
    letterSpacing: compareProperty(nodes, (n) => n.style.letterSpacing),
    fontStyle: compareProperty(nodes, (n) => n.style.fontStyle),
    textDecoration: compareProperty(nodes, (n) => n.style.textDecoration),
    textAlign: compareProperty(nodes, (n) => n.style.textAlign),
  };
}

/**
 * Compare visual/fill properties
 * @param nodes - Array of DesignNodes to compare
 * @returns Comparisons for visual properties
 */
export function compareVisualProperties(
  nodes: DesignNode[]
): Pick<
  NodeComparisonResult["style"],
  | "background"
  | "foreground"
  | "borderColor"
  | "borderWidth"
  | "borderRadius"
  | "opacity"
  | "shadow"
> {
  return {
    background: compareProperty(nodes, (n) => n.style.background),
    foreground: compareProperty(nodes, (n) => n.style.foreground),
    borderColor: compareProperty(nodes, (n) => n.style.borderColor),
    borderWidth: compareProperty(nodes, (n) => n.style.borderWidth),
    borderRadius: compareProperty(nodes, (n) => n.style.borderRadius),
    opacity: compareProperty(nodes, (n) => n.style.opacity),
    shadow: compareProperty(nodes, (n) => n.style.shadow),
  };
}

/**
 * Check if all nodes have the same type (useful for type-specific UI)
 * @param nodes - Array of DesignNodes to compare
 * @returns true if all nodes have the same type
 */
export function haveSameType(nodes: DesignNode[]): boolean {
  if (nodes.length <= 1) return true;
  const firstType = nodes[0].type;
  return nodes.every((n) => n.type === firstType);
}

/**
 * Get the shared type if all nodes have the same type, null otherwise
 * @param nodes - Array of DesignNodes to compare
 * @returns The shared type or null
 */
export function getSharedType(nodes: DesignNode[]): DesignNode["type"] | null {
  if (nodes.length === 0) return null;
  const firstType = nodes[0].type;
  const allSame = nodes.every((n) => n.type === firstType);
  return allSame ? firstType : null;
}

/**
 * Benchmark the comparison engine
 * @param nodeCount - Number of nodes to simulate
 * @param iterations - Number of benchmark iterations
 * @returns Average time in milliseconds
 */
export function benchmarkComparison(
  nodeCount: number,
  iterations: number = 100
): number {
  // Create mock nodes
  const nodes: DesignNode[] = Array.from({ length: nodeCount }, (_, i) => ({
    id: `node-${i}`,
    type: "frame",
    name: `Frame ${i}`,
    style: {
      width: i === 0 ? 100 : 100, // All same for shared test
      height: i === 0 ? 200 : 200,
      padding: { top: 16, right: 16, bottom: 16, left: 16 },
      background: "#FFFFFF",
      gap: 8,
      fontSize: 14,
    },
  }));

  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    compareNodes(nodes);
  }

  const end = performance.now();
  return (end - start) / iterations;
}

/**
 * Benchmark with mixed values (worst case - must check all nodes)
 * @param nodeCount - Number of nodes to simulate
 * @param iterations - Number of benchmark iterations
 * @returns Average time in milliseconds
 */
export function benchmarkComparisonMixed(
  nodeCount: number,
  iterations: number = 100
): number {
  // Create mock nodes with different values (last node differs)
  const nodes: DesignNode[] = Array.from({ length: nodeCount }, (_, i) => ({
    id: `node-${i}`,
    type: "frame",
    name: `Frame ${i}`,
    style: {
      width: i === nodeCount - 1 ? 999 : 100, // Last node different
      height: 200,
      padding: { top: 16, right: 16, bottom: 16, left: 16 },
      background: "#FFFFFF",
      gap: 8,
      fontSize: 14,
    },
  }));

  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    compareNodes(nodes);
  }

  const end = performance.now();
  return (end - start) / iterations;
}

// Export all functions
export default {
  compareProperty,
  compareNodes,
  compareStyleProperties,
  compareSpacingProperties,
  compareSizeProperties,
  compareTypographyProperties,
  compareVisualProperties,
  haveSameType,
  getSharedType,
  benchmarkComparison,
  benchmarkComparisonMixed,
};
