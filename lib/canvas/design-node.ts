// lib/canvas/design-node.ts
// V6 node model — 5 universal types with expanded CSS style properties.
// Replaces the 16-type PageNode system for richer editorial composition.

export type DesignNodeType = "frame" | "text" | "image" | "button" | "divider";

export type Breakpoint = "desktop" | "mobile";

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

// === Component System Types (Track 3) ===

export type AllowedStyleOverride = Pick<DesignNodeStyle,
  | "background" | "foreground" | "muted" | "accent"
  | "borderColor" | "borderWidth" | "borderRadius"
  | "opacity" | "shadow" | "blur"
  | "fontFamily" | "fontSize" | "fontWeight" | "lineHeight"
  | "letterSpacing" | "fontStyle" | "textDecoration" | "textAlign"
  | "padding"
  | "coverImage" | "coverSize" | "coverPosition"
>;

export const ALLOWED_STYLE_FIELDS = new Set<string>([
  "background", "foreground", "muted", "accent",
  "borderColor", "borderWidth", "borderRadius",
  "opacity", "shadow", "blur",
  "fontFamily", "fontSize", "fontWeight", "lineHeight",
  "letterSpacing", "fontStyle", "textDecoration", "textAlign",
  "padding",
  "coverImage", "coverSize", "coverPosition",
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
  blur?: number;             // CSS filter: blur(Npx)
  objectFit?: "cover" | "contain" | "fill";
  maxWidth?: number | string; // number=px, string=CSS value
};

// ── Helpers ──

export function walkDesignTree(node: DesignNode, callback: (n: DesignNode) => void): void {
  callback(node);
  node.children?.forEach((child) => walkDesignTree(child, callback));
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
