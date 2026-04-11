// lib/canvas/design-node.ts
// V6 node model — 5 universal types with expanded CSS style properties.
// Replaces the 16-type PageNode system for richer editorial composition.

export type DesignNodeType = "frame" | "text" | "image" | "button" | "divider";

export type Breakpoint = "desktop" | "mobile";

export type EffectType = "dropShadow" | "innerShadow" | "layerBlur" | "backgroundBlur";

type EffectBase = {
  id: string;
  type: EffectType;
  enabled?: boolean;
};

export type ShadowEffect = EffectBase & {
  type: "dropShadow" | "innerShadow";
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string;
};

export type BlurEffect = EffectBase & {
  type: "layerBlur" | "backgroundBlur";
  radius: number;
};

export type EffectEntry = ShadowEffect | BlurEffect;

export type DesignNode = {
  id: string;
  type: DesignNodeType;
  name: string;
  isGroup?: boolean;
  style: DesignNodeStyle;
  content?: DesignNodeContent;
  children?: DesignNode[];
  responsiveOverrides?: Partial<Record<Breakpoint, Partial<DesignNodeStyle>>>;
  hidden?: Partial<Record<Breakpoint, boolean>>;
  componentRef?: ComponentInstanceRef;  // NEW — Track 3
};

// === Gradient Types (V6 Phase 2A) ===

export type GradientStop = {
  color: string;
  position: number; // 0-100
};

export type GradientValue = {
  type: "linear" | "radial";
  angle?: number;                          // linear only, degrees
  position?: { x: number; y: number };     // radial only, center %. defaults 50/50
  stops: GradientStop[];
  interpolation?: "srgb" | "oklch";        // default "srgb"
};

// === Clip Path Types (V6 Phase 2F) ===

export type ClipPathValue = {
  type: "circle" | "ellipse" | "inset" | "polygon";
  circle?: { radius: number; cx: number; cy: number };           // all values as %
  ellipse?: { rx: number; ry: number; cx: number; cy: number };  // all values as %
  inset?: { top: number; right: number; bottom: number; left: number; borderRadius?: number };  // % except borderRadius in px
  polygon?: Array<{ x: number; y: number }>;                     // each point as %
};

// === Transform Types (V6 Phase 2B) ===

export type TransformValue = {
  rotate?: number;             // degrees, clockwise
  scale?: {
    x: number;                 // 1 = 100%
    y: number;
  };
};

// === Component System Types (Track 3) ===

export type AllowedStyleOverride = Pick<DesignNodeStyle,
  | "background" | "gradient" | "foreground" | "muted" | "accent"
  | "borderColor" | "borderWidth" | "borderRadius"
  | "opacity" | "shadow" | "blur" | "effects"
  | "fontFamily" | "fontSize" | "fontWeight" | "lineHeight"
  | "letterSpacing" | "fontStyle" | "textDecoration" | "textAlign"
  | "padding"
  | "coverImage" | "coverSize" | "coverPosition"
  | "transform" | "transformOrigin"
  | "blendMode"
  | "clipPath"
>;

export const ALLOWED_STYLE_FIELDS = new Set<string>([
  "background", "gradient", "foreground", "muted", "accent",
  "borderColor", "borderWidth", "borderRadius",
  "opacity", "shadow", "blur", "effects",
  "fontFamily", "fontSize", "fontWeight", "lineHeight",
  "letterSpacing", "fontStyle", "textDecoration", "textAlign",
  "padding",
  "coverImage", "coverSize", "coverPosition",
  "transform", "transformOrigin",
  "blendMode",
  "clipPath",
]);

export type NodeOverride = {
  style?: Partial<AllowedStyleOverride>;
  content?: Partial<DesignNodeContent>;
  hidden?: Partial<Record<Breakpoint, boolean>>;
};

export type ComponentOverrides = Record<string, NodeOverride>;

export type ComponentInstanceRef = {
  masterId: string;
  masterVersion: number;
  overrides: ComponentOverrides;
  /** Named preset (Track 9). Omitted or null = default `master.tree`. */
  presetId?: string | null;
};

/** Alternate full tree for an instance; node IDs should match `master.tree` for overrides. */
export type ComponentPreset = {
  id: string;
  name: string;
  tree: DesignNode;
};

export type ComponentMaster = {
  id: string;
  name: string;
  category: string;
  source: "builtin" | "user";
  tree: DesignNode;
  version: number;
  createdAt: string;
  updatedAt: string;
  /** Optional named variants (Track 9). Default layout is always `tree`. */
  presets?: ComponentPreset[];
};

export type DesignNodeContent = {
  text?: string;
  subtext?: string;
  kicker?: string;
  label?: string;
  href?: string;
  src?: string;
  alt?: string;
  icon?: string;
  // Transitional — preserved from PageNode for migration, not the final model
  price?: string;
  badge?: string;
  meta?: string;
};

export type DesignNodeStyle = {
  // ── Positioning ──
  // Default: relative (normal flow). Only breakout elements become absolute.
  position?: "relative" | "absolute";
  x?: number;           // left offset — only when absolute
  y?: number;           // top offset — only when absolute
  width?: number | "hug" | "fill";
  height?: number | "hug" | "fill";
  zIndex?: number;
  overflow?: "visible" | "hidden";
  transform?: TransformValue;
  transformOrigin?: { x: number; y: number };  // percentage, defaults to { x: 50, y: 50 }

  // ── Layout ──
  display?: "flex" | "grid";
  flexDirection?: "row" | "column";
  gap?: number;
  alignItems?: "flex-start" | "center" | "flex-end" | "stretch";
  justifyContent?: "flex-start" | "center" | "flex-end" | "space-between";
  gridTemplate?: string;   // MVP: "repeat(N, 1fr)", "2fr 1fr", "1fr 2fr", "1fr 1fr 1fr" only
  flexGrow?: number;
  flexShrink?: number;
  aspectRatio?: number;

  // ── Spacing ──
  padding?: { top?: number; right?: number; bottom?: number; left?: number };

  // ── Typography ──
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  lineHeight?: number;
  letterSpacing?: number;
  fontStyle?: "normal" | "italic";
  textDecoration?: "none" | "underline";
  textAlign?: "left" | "center" | "right";

  // ── Visual ──
  background?: string;
  gradient?: GradientValue;
  coverImage?: string;       // Raw URL — rendered as positioned <img>, NOT CSS background-image
  coverSize?: "cover" | "contain";
  coverPosition?: string;
  foreground?: string;
  muted?: string;
  accent?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  opacity?: number;
  shadow?: string;           // Raw CSS box-shadow value
  scrimEnabled?: boolean;    // undefined = auto (light foreground detection), true = always, false = never
  scrimColor?: string;       // defaults to #000000
  scrimOpacity?: number;     // 0-100, defaults to 40
  blur?: number;             // CSS filter: blur(Npx)
  effects?: EffectEntry[];   // Ordered Figma-like effects stack
  objectFit?: "cover" | "contain" | "fill";
  maxWidth?: number | string; // number=px, string=CSS value
  blendMode?: "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "color" | "luminosity";
  clipPath?: ClipPathValue;
};

// ── Helpers ──

export function walkDesignTree(node: DesignNode, callback: (n: DesignNode) => void): void {
  callback(node);
  node.children?.forEach((child) => walkDesignTree(child, callback));
}

/** Path from root to target, or null if not found. */
export function findDesignNodePath(root: DesignNode, targetId: string): DesignNode[] | null {
  function walk(n: DesignNode, path: DesignNode[]): DesignNode[] | null {
    const next = [...path, n];
    if (n.id === targetId) return next;
    for (const child of n.children ?? []) {
      const found = walk(child, next);
      if (found) return found;
    }
    return null;
  }
  return walk(root, []);
}

export function findDesignNodeById(node: DesignNode, targetId: string | null): DesignNode | null {
  if (!targetId) return null;
  if (node.id === targetId) return node;
  for (const child of node.children ?? []) {
    const match = findDesignNodeById(child, targetId);
    if (match) return match;
  }
  return null;
}

export function findDesignNodeParent(root: DesignNode, targetId: string): DesignNode | null {
  for (const child of root.children ?? []) {
    if (child.id === targetId) return root;
    const match = findDesignNodeParent(child, targetId);
    if (match) return match;
  }
  return null;
}

/** Deep-clone a DesignNode tree with fresh IDs on every node. */
export function cloneDesignNode(node: DesignNode): DesignNode {
  return {
    ...node,
    id: `${node.type}-${Math.random().toString(36).slice(2, 10)}`,
    children: node.children?.map(cloneDesignNode),
  };
}

/**
 * Deep-clone a DesignNode tree, remapping every node ID using the provided function.
 * Returns the cloned tree and a mapping from original IDs to new IDs.
 */
export function cloneDesignNodeWithIdMap(
  node: DesignNode,
  mapId: (originalId: string) => string
): { tree: DesignNode; idMap: Record<string, string> } {
  const idMap: Record<string, string> = {};

  function cloneNode(n: DesignNode): DesignNode {
    const newId = mapId(n.id);
    idMap[n.id] = newId;
    return {
      ...n,
      id: newId,
      style: { ...n.style, padding: n.style.padding ? { ...n.style.padding } : undefined },
      content: n.content ? { ...n.content } : undefined,
      children: n.children?.map(cloneNode),
      responsiveOverrides: n.responsiveOverrides
        ? Object.fromEntries(
            Object.entries(n.responsiveOverrides).map(([bp, style]) => [bp, { ...style }])
          ) as DesignNode["responsiveOverrides"]
        : undefined,
      hidden: n.hidden ? { ...n.hidden } : undefined,
      // componentRef is intentionally NOT cloned — resolved trees don't have nested instances in Track 3
    };
  }

  return { tree: cloneNode(node), idMap };
}
