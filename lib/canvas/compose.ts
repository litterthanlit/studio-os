import type { DesignSystemTokens } from "./generate-system";
import type { SiteType } from "./templates";

export type CanvasStage = "moodboard" | "system" | "generate" | "compose";
export type Breakpoint = "desktop" | "tablet" | "mobile";
export type InspectorTab = "content" | "style" | "layout" | "effects" | "ai";

export type PageNodeType =
  | "page"
  | "section"
  | "heading"
  | "paragraph"
  | "button-row"
  | "button"
  | "metric-row"
  | "metric-item"
  | "logo-row"
  | "logo-item"
  | "feature-grid"
  | "feature-card"
  | "testimonial-grid"
  | "testimonial-card"
  | "pricing-grid"
  | "pricing-tier";

export type PageNodeStyle = {
  background?: string;
  foreground?: string;
  muted?: string;
  accent?: string;
  borderColor?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  lineHeight?: number;
  letterSpacing?: number;
  borderRadius?: number;
  paddingX?: number;
  paddingY?: number;
  gap?: number;
  columns?: number;
  maxWidth?: number;
  minHeight?: number;
  align?: "left" | "center" | "right";
  direction?: "row" | "column";
  justify?: "start" | "center" | "end" | "between";
  opacity?: number;
  blur?: number;
  shadow?: "none" | "soft" | "medium";
  emphasized?: boolean;
  badgeTone?: "surface" | "accent" | "outline";
};

export type PageNodeContent = {
  text?: string;
  subtext?: string;
  kicker?: string;
  label?: string;
  href?: string;
  price?: string;
  badge?: string;
  meta?: string;
  icon?: string;
  mediaUrl?: string;
  mediaAlt?: string;
};

export type PageNode = {
  id: string;
  type: PageNodeType;
  name: string;
  content?: PageNodeContent;
  style?: PageNodeStyle;
  responsiveOverrides?: Partial<Record<Breakpoint, Partial<PageNodeStyle>>>;
  hidden?: Partial<Record<Breakpoint, boolean>>;
  children?: PageNode[];
};

export type GeneratedVariant = {
  id: string;
  name: string;
  pageTree: PageNode;
  previewImage?: string | null;
  compiledCode?: string | null;
  sourcePrompt: string;
  createdAt: string;
  isFavorite?: boolean;
  description?: string;
  siteType?: SiteType;
};

export type ComposeArtboard = {
  id: string;
  variantId: string;
  name: string;
  x: number;
  y: number;
  pageTree: PageNode;
};

export type ComposeOverlay =
  | {
      id: string;
      type: "note";
      x: number;
      y: number;
      width: number;
      height: number;
      text: string;
      color?: string;
    }
  | {
      id: string;
      type: "reference";
      x: number;
      y: number;
      width: number;
      height: number;
      imageUrl: string;
      label?: string;
    };

export type ComposeDocument = {
  artboards: ComposeArtboard[];
  selectedArtboardId: string | null;
  selectedNodeId: string | null;
  primaryArtboardId: string | null;
  breakpoint: Breakpoint;
  pan: { x: number; y: number };
  zoom: number;
  overlays: ComposeOverlay[];
  inspectorTab: InspectorTab;
  exportArtifact?: {
    code: string;
    name: string;
    updatedAt: string;
  } | null;
};

export const BREAKPOINT_WIDTHS: Record<Breakpoint, number> = {
  desktop: 1440,
  tablet: 768,
  mobile: 375,
};

export const COMPOSE_ARTBOARD_GAP = 100;

type VariantProfile = {
  key: string;
  name: string;
  description: string;
  heroAlign: "left" | "center";
  heroTone: "surface" | "accent" | "outline";
  featuresColumns: number;
  sectionBackgrounds: Array<"background" | "surface" | "accentWash">;
  pricingEmphasis: number;
};

const VARIANT_PROFILES: VariantProfile[] = [
  {
    key: "signal",
    name: "Signal",
    description: "Centered product story with compact proof and tight conversion flow.",
    heroAlign: "center",
    heroTone: "surface",
    featuresColumns: 3,
    sectionBackgrounds: ["background", "surface", "background", "surface", "accentWash", "background"],
    pricingEmphasis: 1,
  },
  {
    key: "atlas",
    name: "Atlas",
    description: "Editorial split layout with stronger narrative pacing and bolder sections.",
    heroAlign: "left",
    heroTone: "outline",
    featuresColumns: 2,
    sectionBackgrounds: ["background", "background", "surface", "background", "surface", "accentWash"],
    pricingEmphasis: 2,
  },
  {
    key: "monograph",
    name: "Monograph",
    description: "High-contrast showcase with oversized typography and generous whitespace.",
    heroAlign: "left",
    heroTone: "accent",
    featuresColumns: 3,
    sectionBackgrounds: ["accentWash", "background", "background", "surface", "background", "surface"],
    pricingEmphasis: 0,
  },
];

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function titleCase(value: string): string {
  return value
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function compactWords(prompt: string): string[] {
  return prompt
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 2);
}

export function inferSiteName(prompt: string, fallback = "Studio OS Site"): string {
  const quoted = prompt.match(/"([^"]+)"/)?.[1];
  if (quoted) return titleCase(quoted);

  const words = compactWords(prompt);
  if (words.length === 0) return fallback;
  return titleCase(words.slice(0, Math.min(words.length, 3)).join(" "));
}

function inferAudience(prompt: string): string {
  const words = compactWords(prompt);
  if (words.includes("developers") || words.includes("engineering")) return "product and engineering teams";
  if (words.includes("founders") || words.includes("startup")) return "founders shipping their next release";
  if (words.includes("design") || words.includes("creative")) return "creative teams with high visual standards";
  if (words.includes("agency")) return "clients looking for a decisive creative partner";
  return "teams who want a site that feels intentional from day one";
}

function inferPromise(prompt: string): string {
  const clean = prompt.trim();
  if (!clean) return "Turn taste into a working site faster.";
  const firstSentence = clean.split(/[.!?]/)[0]?.trim();
  if (!firstSentence) return "Turn taste into a working site faster.";
  return titleCase(firstSentence);
}

function withAlpha(hex: string, alpha: string): string {
  if (!hex.startsWith("#")) return hex;
  return `${hex}${alpha}`;
}

function surfaceForMode(tokens: DesignSystemTokens, mode: "background" | "surface" | "accentWash"): string {
  if (mode === "surface") return tokens.colors.surface;
  if (mode === "accentWash") return withAlpha(tokens.colors.accent, "14");
  return tokens.colors.background;
}

function createNode(
  type: PageNodeType,
  name: string,
  content?: PageNodeContent,
  style?: PageNodeStyle,
  children?: PageNode[]
): PageNode {
  return {
    id: uid(type),
    type,
    name,
    content,
    style,
    children,
  };
}

function createFeatureCards(siteName: string): PageNode[] {
  return [
    createNode("feature-card", "Clarity Card", {
      icon: "◈",
      text: "Taste distilled into reusable sections",
      subtext: `Build ${siteName} from a coherent system instead of scattered inspiration.`,
    }),
    createNode("feature-card", "Speed Card", {
      icon: "→",
      text: "Generate several full-page directions at once",
      subtext: "Compare different visual narratives before committing to a single page.",
    }),
    createNode("feature-card", "Refine Card", {
      icon: "◇",
      text: "Edit structure and styling visually",
      subtext: "Move from AI output to a presentable page without leaving the canvas.",
    }),
  ];
}

function createTestimonials(siteName: string): PageNode[] {
  return [
    createNode("testimonial-card", "Testimonial One", {
      text: `"${siteName} turned our visual references into a page we could actually ship."`,
      subtext: "Mila Chen, Design Lead",
      meta: "Launch team",
    }),
    createNode("testimonial-card", "Testimonial Two", {
      text: "We stopped losing momentum between idea, system, and final landing page.",
      subtext: "Omar Singh, Founder",
      meta: "Early-stage product",
    }),
    createNode("testimonial-card", "Testimonial Three", {
      text: "The compose step made the AI output feel editable, not disposable.",
      subtext: "Ari Walker, Creative Director",
      meta: "Studio workflow",
    }),
  ];
}

function createPricingTiers(siteName: string, emphasized: number): PageNode[] {
  return [
    createNode(
      "pricing-tier",
      "Starter Tier",
      {
        text: "Starter",
        price: "$29",
        subtext: "For solo explorations",
        meta: "3 active boards • export HTML • local-first storage",
      },
      { emphasized: emphasized === 0 }
    ),
    createNode(
      "pricing-tier",
      "Studio Tier",
      {
        text: "Studio",
        price: "$79",
        subtext: `For teams shaping ${siteName}`,
        meta: "Unlimited variants • compose editor • deployment export",
        badge: "Popular",
      },
      { emphasized: emphasized === 1 }
    ),
    createNode(
      "pricing-tier",
      "Scale Tier",
      {
        text: "Scale",
        price: "$149",
        subtext: "For multi-brand systems",
        meta: "Advanced AI refinements • deeper responsive controls • priority support",
      },
      { emphasized: emphasized === 2 }
    ),
  ];
}

function createLogoItems(): PageNode[] {
  return ["Northstar", "Vanta", "Studio Mono", "Atlas", "Orbit", "Frame"]
    .map((label) => createNode("logo-item", `${label} Logo`, { text: label }));
}

function createMetricItems(): PageNode[] {
  return [
    createNode("metric-item", "Metric One", { text: "4x", subtext: "faster direction setting" }),
    createNode("metric-item", "Metric Two", { text: "3", subtext: "full-page variants in one pass" }),
    createNode("metric-item", "Metric Three", { text: "1", subtext: "compose surface for export" }),
  ];
}

function createVariantPageTree(
  profile: VariantProfile,
  prompt: string,
  siteName: string,
  tokens: DesignSystemTokens
): PageNode {
  const audience = inferAudience(prompt);
  const promise = inferPromise(prompt);

  const hero = createNode(
    "section",
    "Hero Section",
    undefined,
    {
      background: surfaceForMode(tokens, profile.sectionBackgrounds[0]),
      align: profile.heroAlign,
      minHeight: 560,
      paddingX: 56,
      paddingY: 72,
      gap: 20,
      borderRadius: 26,
      badgeTone: profile.heroTone,
    },
    [
      createNode("paragraph", "Hero Kicker", {
        text: "Taste to site",
      }, { foreground: tokens.colors.accent, align: profile.heroAlign }),
      createNode("heading", "Hero Heading", {
        text: promise,
      }, { align: profile.heroAlign }),
      createNode("paragraph", "Hero Body", {
        text: `${siteName} helps ${audience}. Generate complete directions, compare them, and refine the strongest one visually.`,
      }, { align: profile.heroAlign, muted: tokens.colors.textMuted }),
      createNode("button-row", "Hero Actions", undefined, { align: profile.heroAlign, gap: 12 }, [
        createNode("button", "Primary Button", {
          text: "Open Compose",
          href: "#compose",
        }, { accent: tokens.colors.accent, emphasized: true }),
        createNode("button", "Secondary Button", {
          text: "Review Variants",
          href: "#variants",
        }, { borderColor: tokens.colors.border, foreground: tokens.colors.text }),
      ]),
      createNode("metric-row", "Hero Metrics", undefined, { gap: 16, align: profile.heroAlign }, createMetricItems()),
    ]
  );

  const proof = createNode(
    "section",
    "Proof Section",
    undefined,
    {
      background: surfaceForMode(tokens, profile.sectionBackgrounds[1]),
      align: "center",
      paddingX: 48,
      paddingY: 44,
      gap: 24,
      borderRadius: 22,
    },
    [
      createNode("paragraph", "Proof Label", {
        text: "Used by teams who design in public",
      }, { align: "center", muted: tokens.colors.textMuted }),
      createNode("logo-row", "Logo Row", undefined, { gap: 18, align: "center" }, createLogoItems()),
    ]
  );

  const features = createNode(
    "section",
    "Features Section",
    undefined,
    {
      background: surfaceForMode(tokens, profile.sectionBackgrounds[2]),
      align: profile.heroAlign,
      paddingX: 48,
      paddingY: 64,
      gap: 28,
      borderRadius: 22,
    },
    [
      createNode("heading", "Features Heading", {
        text: "From references to real page systems",
      }, { align: profile.heroAlign }),
      createNode("paragraph", "Features Body", {
        text: "Keep the references, extracted system, generated variants, and final composition in one place.",
      }, { align: profile.heroAlign, muted: tokens.colors.textMuted }),
      createNode(
        "feature-grid",
        "Feature Grid",
        undefined,
        { columns: profile.featuresColumns, gap: 18 },
        createFeatureCards(siteName)
      ),
    ]
  );

  const testimonials = createNode(
    "section",
    "Testimonials Section",
    undefined,
    {
      background: surfaceForMode(tokens, profile.sectionBackgrounds[3]),
      align: "left",
      paddingX: 48,
      paddingY: 64,
      gap: 24,
      borderRadius: 22,
    },
    [
      createNode("heading", "Testimonials Heading", {
        text: "The best output is the one you can still shape",
      }),
      createNode("testimonial-grid", "Testimonial Grid", undefined, { columns: 3, gap: 18 }, createTestimonials(siteName)),
    ]
  );

  const pricing = createNode(
    "section",
    "Pricing Section",
    undefined,
    {
      background: surfaceForMode(tokens, profile.sectionBackgrounds[4]),
      align: "center",
      paddingX: 48,
      paddingY: 64,
      gap: 24,
      borderRadius: 22,
    },
    [
      createNode("heading", "Pricing Heading", {
        text: "A workspace that gets sharper as you refine",
      }, { align: "center" }),
      createNode("pricing-grid", "Pricing Grid", undefined, { columns: 3, gap: 18 }, createPricingTiers(siteName, profile.pricingEmphasis)),
    ]
  );

  const cta = createNode(
    "section",
    "CTA Section",
    undefined,
    {
      background: surfaceForMode(tokens, profile.sectionBackgrounds[5]),
      align: "center",
      paddingX: 48,
      paddingY: 72,
      gap: 20,
      borderRadius: 22,
    },
    [
      createNode("heading", "CTA Heading", {
        text: "Generate fast. Compose carefully. Export confidently.",
      }, { align: "center" }),
      createNode("paragraph", "CTA Body", {
        text: "Pick the direction that feels right, then tune the layout, type, spacing, and copy until it is ready to ship.",
      }, { align: "center", muted: tokens.colors.textMuted }),
      createNode("button-row", "CTA Actions", undefined, { align: "center", gap: 12 }, [
        createNode("button", "CTA Button", {
          text: "Start with your moodboard",
          href: "#top",
        }, { accent: tokens.colors.accent, emphasized: true }),
      ]),
    ]
  );

  return createNode(
    "page",
    `${profile.name} Page`,
    { text: siteName },
    {
      background: tokens.colors.background,
      foreground: tokens.colors.text,
      muted: tokens.colors.textMuted,
      accent: tokens.colors.accent,
      borderColor: tokens.colors.border,
      gap: 18,
      paddingX: 24,
      paddingY: 24,
      maxWidth: 1200,
    },
    [hero, proof, features, testimonials, pricing, cta]
  );
}

export function createVariantSet(
  prompt: string,
  tokens: DesignSystemTokens,
  siteType: SiteType,
  siteName = inferSiteName(prompt)
): GeneratedVariant[] {
  const createdAt = new Date().toISOString();
  const resolvedSiteType = siteType === "auto" ? "saas-landing" : siteType;

  return VARIANT_PROFILES.map((profile, index) => ({
    id: uid("variant"),
    name: `${profile.name} ${index + 1}`,
    pageTree: createVariantPageTree(profile, prompt, siteName, tokens),
    previewImage: null,
    compiledCode: null,
    sourcePrompt: prompt,
    createdAt,
    isFavorite: false,
    description: profile.description,
    siteType: resolvedSiteType,
  }));
}

export function createComposeDocument(variants: GeneratedVariant[]): ComposeDocument {
  const artboards = variants.map((variant, index) => ({
    id: uid("artboard"),
    variantId: variant.id,
    name: variant.name,
    x: index * (BREAKPOINT_WIDTHS.desktop + COMPOSE_ARTBOARD_GAP),
    y: 0,
    pageTree: structuredClone(variant.pageTree),
  }));

  return {
    artboards,
    selectedArtboardId: artboards[0]?.id ?? null,
    selectedNodeId: artboards[0]?.pageTree.children?.[0]?.id ?? artboards[0]?.pageTree.id ?? null,
    primaryArtboardId: artboards[0]?.id ?? null,
    breakpoint: "desktop",
    pan: { x: 120, y: 120 },
    zoom: 0.58,
    overlays: [],
    inspectorTab: "content",
    exportArtifact: null,
  };
}

export function rehydrateComposeDocument(
  base: ComposeDocument,
  persisted: ComposeDocument | null
): ComposeDocument {
  if (!persisted) return base;

  const persistedByVariantId = new Map(
    persisted.artboards.map((artboard) => [artboard.variantId, artboard])
  );
  const persistedByName = new Map(
    persisted.artboards.map((artboard) => [artboard.name, artboard])
  );

  const artboards = base.artboards.map((artboard) => {
    const match =
      persistedByVariantId.get(artboard.variantId) ??
      persistedByName.get(artboard.name);

    if (!match) return artboard;

    return {
      ...artboard,
      x: match.x,
      y: match.y,
      pageTree: structuredClone(match.pageTree ?? artboard.pageTree),
    };
  });

  function resolveArtboardId(persistedId: string | null): string | null {
    if (!persistedId) return null;
    const previous = persisted.artboards.find((artboard) => artboard.id === persistedId);
    if (!previous) return null;
    return (
      artboards.find(
        (artboard) =>
          artboard.variantId === previous.variantId || artboard.name === previous.name
      )?.id ?? null
    );
  }

  return {
    ...base,
    artboards,
    breakpoint: persisted.breakpoint ?? base.breakpoint,
    pan: persisted.pan ?? base.pan,
    zoom:
      typeof persisted.zoom === "number"
        ? Math.max(0.1, Math.min(5, persisted.zoom))
        : base.zoom,
    overlays: persisted.overlays ?? base.overlays,
    inspectorTab: persisted.inspectorTab ?? base.inspectorTab,
    selectedArtboardId:
      resolveArtboardId(persisted.selectedArtboardId) ?? base.selectedArtboardId,
    primaryArtboardId:
      resolveArtboardId(persisted.primaryArtboardId) ?? base.primaryArtboardId,
    selectedNodeId: persisted.selectedNodeId ?? base.selectedNodeId,
    exportArtifact: persisted.exportArtifact ?? base.exportArtifact,
  };
}

export function getNodeStyle(node: PageNode, breakpoint: Breakpoint): PageNodeStyle {
  return {
    ...(node.style ?? {}),
    ...(breakpoint === "desktop" ? {} : node.responsiveOverrides?.[breakpoint]),
  };
}

export function findNodeById(node: PageNode, targetId: string | null): PageNode | null {
  if (!targetId) return null;
  if (node.id === targetId) return node;
  for (const child of node.children ?? []) {
    const match = findNodeById(child, targetId);
    if (match) return match;
  }
  return null;
}

export function findNodePath(node: PageNode, targetId: string | null, path: PageNode[] = []): PageNode[] | null {
  if (!targetId) return null;
  const nextPath = [...path, node];
  if (node.id === targetId) return nextPath;
  for (const child of node.children ?? []) {
    const childPath = findNodePath(child, targetId, nextPath);
    if (childPath !== null) return childPath;
  }
  return null;
}

export function updateNodeInTree(
  node: PageNode,
  targetId: string,
  updater: (node: PageNode) => PageNode
): PageNode {
  if (node.id === targetId) return updater(node);
  if (!node.children?.length) return node;
  return {
    ...node,
    children: node.children.map((child) => updateNodeInTree(child, targetId, updater)),
  };
}

export function updateNodeContent(
  node: PageNode,
  targetId: string,
  key: keyof PageNodeContent,
  value: string
): PageNode {
  return updateNodeInTree(node, targetId, (current) => ({
    ...current,
    content: {
      ...(current.content ?? {}),
      [key]: value,
    },
  }));
}

export function updateNodeStyleValue(
  node: PageNode,
  targetId: string,
  breakpoint: Breakpoint,
  key: keyof PageNodeStyle,
  value: PageNodeStyle[keyof PageNodeStyle]
): PageNode {
  return updateNodeInTree(node, targetId, (current) => {
    if (breakpoint === "desktop") {
      return {
        ...current,
        style: {
          ...(current.style ?? {}),
          [key]: value,
        },
      };
    }

    return {
      ...current,
      responsiveOverrides: {
        ...(current.responsiveOverrides ?? {}),
        [breakpoint]: {
          ...(current.responsiveOverrides?.[breakpoint] ?? {}),
          [key]: value,
        },
      },
    };
  });
}

export function updateArtboardTree(
  document: ComposeDocument,
  artboardId: string,
  updater: (tree: PageNode) => PageNode
): ComposeDocument {
  return {
    ...document,
    artboards: document.artboards.map((artboard) =>
      artboard.id === artboardId
        ? { ...artboard, pageTree: updater(artboard.pageTree) }
        : artboard
    ),
  };
}

export function getSelectedArtboard(document: ComposeDocument | null): ComposeArtboard | null {
  if (!document?.selectedArtboardId) return null;
  return document.artboards.find((artboard) => artboard.id === document.selectedArtboardId) ?? null;
}

export function getExportArtboard(document: ComposeDocument | null): ComposeArtboard | null {
  if (!document) return null;
  if (document.primaryArtboardId) {
    const primary = document.artboards.find((artboard) => artboard.id === document.primaryArtboardId);
    if (primary) return primary;
  }
  return getSelectedArtboard(document) ?? document.artboards[0] ?? null;
}

export function flattenNodes(node: PageNode, depth = 0): Array<{ node: PageNode; depth: number }> {
  const rows = [{ node, depth }];
  for (const child of node.children ?? []) {
    rows.push(...flattenNodes(child, depth + 1));
  }
  return rows;
}

function serializeTokens(tokens: DesignSystemTokens): string {
  return JSON.stringify(tokens, null, 2);
}

function serializeTree(tree: PageNode): string {
  return JSON.stringify(tree, null, 2);
}

export function compilePageTreeToTSX(
  pageTree: PageNode,
  tokens: DesignSystemTokens,
  componentName = "ComposedPage"
): string {
  const safeName = componentName.replace(/[^a-zA-Z0-9]/g, "") || "ComposedPage";
  return `// @ts-nocheck
/* eslint-disable */
import * as React from "react";
import { motion } from "framer-motion";

const TOKENS = ${serializeTokens(tokens)} as const;
const PAGE = ${serializeTree(pageTree)} as const;

function nodeStyle(node, breakpoint) {
  const base = node.style || {};
  const responsive = breakpoint === "desktop" ? {} : ((node.responsiveOverrides || {})[breakpoint] || {});
  return { ...base, ...responsive };
}

function shadowValue(shadow) {
  if (shadow === "medium") return TOKENS.shadows.md;
  if (shadow === "soft") return TOKENS.shadows.sm;
  return "none";
}

function textColor(style) {
  return style.foreground || TOKENS.colors.text;
}

function mutedColor(style) {
  return style.muted || TOKENS.colors.textMuted;
}

function renderNode(node, breakpoint) {
  const style = nodeStyle(node, breakpoint);
  const children = (node.children || []).map((child) => renderNode(child, breakpoint));

  switch (node.type) {
    case "page":
      return (
        <main
          key={node.id}
          style={{
            background: style.background || TOKENS.colors.background,
            color: textColor(style),
            minHeight: "100vh",
            padding: \`\${style.paddingY || 24}px \${style.paddingX || 24}px\`,
            display: "flex",
            flexDirection: "column",
            gap: style.gap || 18,
            fontFamily: TOKENS.typography.fontFamily,
          }}
        >
          {children}
        </main>
      );
    case "section":
      return (
        <section
          key={node.id}
          id={node.id}
          style={{
            background: style.background || "transparent",
            border: \`1px solid \${style.borderColor || TOKENS.colors.border}\`,
            borderRadius: style.borderRadius || 22,
            padding: \`\${style.paddingY || 48}px \${style.paddingX || 48}px\`,
            minHeight: style.minHeight || "auto",
          }}
        >
          <div
            style={{
              maxWidth: style.maxWidth || 1120,
              margin: "0 auto",
              display: "flex",
              flexDirection: "column",
              gap: style.gap || 18,
              alignItems: style.align === "center" ? "center" : "stretch",
              textAlign: style.align === "center" ? "center" : "left",
            }}
          >
            {children}
          </div>
        </section>
      );
    case "heading":
      return (
        <motion.h2
          key={node.id}
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          style={{
            margin: 0,
            fontSize: breakpoint === "mobile" ? "2rem" : "clamp(2.6rem, 7vw, 5rem)",
            lineHeight: 1,
            letterSpacing: "-0.04em",
            color: textColor(style),
            maxWidth: 900,
            fontWeight: 700,
          }}
        >
          {node.content?.text}
        </motion.h2>
      );
    case "paragraph":
      return (
        <p
          key={node.id}
          style={{
            margin: 0,
            color: style.foreground || mutedColor(style),
            fontSize: node.name.toLowerCase().includes("kicker") ? "0.8rem" : "1rem",
            lineHeight: 1.6,
            maxWidth: 720,
            letterSpacing: node.name.toLowerCase().includes("kicker") ? "0.12em" : "normal",
            textTransform: node.name.toLowerCase().includes("kicker") ? "uppercase" : "none",
            fontWeight: node.name.toLowerCase().includes("kicker") ? 600 : 400,
          }}
        >
          {node.content?.text}
        </p>
      );
    case "button-row":
      return (
        <div key={node.id} style={{ display: "flex", gap: style.gap || 12, flexWrap: "wrap", justifyContent: style.align === "center" ? "center" : "flex-start" }}>
          {children}
        </div>
      );
    case "button":
      return (
        <button
          key={node.id}
          type="button"
          style={{
            background: style.emphasized ? (style.accent || TOKENS.colors.accent) : "transparent",
            color: style.emphasized ? "#ffffff" : (style.foreground || TOKENS.colors.text),
            border: \`1px solid \${style.borderColor || (style.emphasized ? "transparent" : TOKENS.colors.border)}\`,
            borderRadius: style.borderRadius || 999,
            padding: "12px 18px",
            fontSize: "0.95rem",
            cursor: "pointer",
          }}
        >
          {node.content?.text}
        </button>
      );
    case "metric-row":
      return (
        <div key={node.id} style={{ display: "grid", width: "100%", gap: style.gap || 12, gridTemplateColumns: breakpoint === "mobile" ? "1fr" : \`repeat(\${children.length}, minmax(0, 1fr))\` }}>
          {children}
        </div>
      );
    case "metric-item":
      return (
        <div key={node.id} style={{ padding: "16px 18px", borderRadius: 18, border: \`1px solid \${TOKENS.colors.border}\`, background: TOKENS.colors.surface }}>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: TOKENS.colors.text }}>{node.content?.text}</div>
          <div style={{ marginTop: 6, fontSize: "0.9rem", color: TOKENS.colors.textMuted }}>{node.content?.subtext}</div>
        </div>
      );
    case "logo-row":
      return (
        <div key={node.id} style={{ display: "flex", gap: style.gap || 16, flexWrap: "wrap", justifyContent: style.align === "center" ? "center" : "flex-start" }}>
          {children}
        </div>
      );
    case "logo-item":
      return (
        <div key={node.id} style={{ padding: "10px 14px", borderRadius: 999, border: \`1px solid \${TOKENS.colors.border}\`, color: TOKENS.colors.textMuted }}>
          {node.content?.text}
        </div>
      );
    case "feature-grid":
    case "testimonial-grid":
    case "pricing-grid":
      return (
        <div
          key={node.id}
          style={{
            display: "grid",
            gap: style.gap || 18,
            gridTemplateColumns:
              breakpoint === "mobile"
                ? "1fr"
                : breakpoint === "tablet"
                ? "repeat(2, minmax(0, 1fr))"
                : \`repeat(\${style.columns || 3}, minmax(0, 1fr))\`,
          }}
        >
          {children}
        </div>
      );
    case "feature-card":
    case "testimonial-card":
    case "pricing-tier":
      return (
        <div
          key={node.id}
          style={{
            padding: "20px",
            borderRadius: style.borderRadius || 20,
            border: \`1px solid \${style.borderColor || TOKENS.colors.border}\`,
            background: style.emphasized ? (style.accent || TOKENS.colors.accent) : TOKENS.colors.surface,
            color: style.emphasized ? "#ffffff" : TOKENS.colors.text,
            boxShadow: shadowValue(style.shadow || (style.emphasized ? "medium" : "soft")),
            minHeight: node.type === "pricing-tier" ? 280 : 220,
          }}
        >
          {node.content?.icon ? (
            <div style={{ fontSize: "1.1rem", marginBottom: 12 }}>{node.content.icon}</div>
          ) : null}
          {node.content?.badge ? (
            <div style={{ display: "inline-flex", marginBottom: 12, padding: "6px 10px", borderRadius: 999, background: style.emphasized ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.04)", fontSize: "0.75rem" }}>
              {node.content.badge}
            </div>
          ) : null}
          <div style={{ fontSize: node.type === "pricing-tier" ? "1.05rem" : "1.1rem", fontWeight: 600, lineHeight: 1.2 }}>{node.content?.text}</div>
          {node.content?.price ? <div style={{ fontSize: "2.1rem", fontWeight: 700, marginTop: 14 }}>{node.content.price}</div> : null}
          {node.content?.subtext ? <p style={{ margin: "12px 0 0", color: style.emphasized ? "rgba(255,255,255,0.78)" : TOKENS.colors.textMuted, lineHeight: 1.6 }}>{node.content.subtext}</p> : null}
          {node.content?.meta ? <p style={{ margin: "12px 0 0", color: style.emphasized ? "rgba(255,255,255,0.68)" : TOKENS.colors.textMuted, lineHeight: 1.6 }}>{node.content.meta}</p> : null}
        </div>
      );
    default:
      return null;
  }
}

export default function ${safeName}() {
  return renderNode(PAGE, "desktop");
}
`;
}
