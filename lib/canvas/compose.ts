import type { DesignSystemTokens } from "./generate-system";
import type { SiteType } from "./templates";
import type { TasteProfile } from "@/types/taste-profile";
import type { DesignNode } from "./design-node";

export type CanvasStage = "collect" | "compose";
export type Breakpoint = "desktop" | "mobile";
export type InspectorTab = "content" | "style" | "layout" | "effects" | "ai";
export type VariantMode = "safe" | "creative" | "alternative";

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
  fontStyle?: "normal" | "italic";       // V3.3
  textDecoration?: "none" | "underline"; // V3.3
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
  pageTree: PageNode | DesignNode;
  previewImage?: string | null;
  compiledCode?: string | null;
  previewSource?: "ai" | "fallback";
  previewFallbackReason?: string | null;
  sourcePrompt: string;
  createdAt: string;
  isFavorite?: boolean;
  description?: string;
  siteType?: SiteType;
  strategy?: VariantMode;
  strategyLabel?: string;
  tasteEmphasis?: string[];
};

export type ComposeArtboard = {
  id: string;
  variantId: string;
  name: string;
  breakpoint: Breakpoint;
  x: number;
  y: number;
  pageTree: PageNode | DesignNode;
  compiledCode?: string | null;
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
    }
  | {
      id: string;
      type: "arrow";
      x: number;
      y: number;
      width: number;
      height: number;
      color?: string;
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
  mobile: 375,
};

export const COMPOSE_ARTBOARD_GAP = 200;

/** Fixed canvas positions for the two breakpoint artboards created from a single variant. */
export const BREAKPOINT_ARTBOARD_LAYOUTS: Array<{
  breakpoint: Breakpoint;
  name: string;
  x: number;
}> = [
  { breakpoint: "desktop", name: "Desktop 1440", x: 0 },
  { breakpoint: "mobile",  name: "Mobile 375",   x: 1440 + 200 },
];

// ─── Artboard creation + fit-to-view ──────────────────────────────────────────

export type ArtboardSpec = {
  id: string;
  variantId: string;
  name: string;
  breakpoint: Breakpoint;
  label: string;
  x: number;
  y: number;
  pageTree: PageNode | DesignNode;
  compiledCode?: string | null;
};

/**
 * Type guard: DesignNode root is always type "frame", PageNode root is always type "page".
 * Only valid for root-level trees — a non-root frame child would also pass this check,
 * but we only call this on artboard.pageTree (always a root).
 */
export function isDesignNodeTree(tree: PageNode | DesignNode): tree is DesignNode {
  return tree.type === "frame";
}

/**
 * Creates two side-by-side breakpoint artboards from a single variant's page tree.
 * Desktop is centered at the origin; Mobile is positioned to the right
 * with an 80px gap.
 */
export function createInitialArtboards(
  pageTree: PageNode,
  tokens: DesignSystemTokens,
  variantId: string,
  compiledCode?: string | null
): ArtboardSpec[] {
  const gap = COMPOSE_ARTBOARD_GAP;
  const desktopX = 0;
  const mobileX = BREAKPOINT_WIDTHS.desktop + gap;

  const layouts: Array<{ breakpoint: Breakpoint; label: string; x: number }> = [
    { breakpoint: "desktop", label: "Desktop", x: desktopX },
    { breakpoint: "mobile",  label: "Mobile",  x: mobileX },
  ];

  return layouts.map(({ breakpoint, label, x }) => ({
    id: uid("artboard"),
    variantId,
    name: `${label} ${BREAKPOINT_WIDTHS[breakpoint]}`,
    breakpoint,
    label,
    x,
    y: 0,
    pageTree: structuredClone(pageTree),
    compiledCode: compiledCode ?? null,
  }));
}

/**
 * Returns { pan, zoom } to frame all artboards in the viewport with padding.
 */
export function fitArtboardsToView(
  artboards: Array<{ x: number; y: number; breakpoint: Breakpoint }>,
  viewportWidth: number,
  viewportHeight: number,
  padding = 60
): { pan: { x: number; y: number }; zoom: number } {
  if (artboards.length === 0 || viewportWidth <= 0 || viewportHeight <= 0) {
    return { pan: { x: padding, y: padding }, zoom: 0.25 };
  }

  // Approximate artboard heights based on breakpoint
  function approxHeight(bp: Breakpoint): number {
    if (bp === "mobile") return 1320;
    return 1780;
  }

  const minX = Math.min(...artboards.map((a) => a.x));
  const minY = Math.min(...artboards.map((a) => a.y));
  const maxX = Math.max(...artboards.map((a) => a.x + BREAKPOINT_WIDTHS[a.breakpoint]));
  const maxY = Math.max(...artboards.map((a) => a.y + approxHeight(a.breakpoint)));

  const contentWidth = maxX - minX;
  const contentHeight = maxY - minY;

  const availableWidth = viewportWidth - padding * 2;
  const availableHeight = viewportHeight - padding * 2;

  const zoom = Math.min(
    availableWidth / contentWidth,
    availableHeight / contentHeight,
    1 // never zoom in beyond 100%
  );

  const pan = {
    x: (viewportWidth - contentWidth * zoom) / 2 - minX * zoom,
    y: padding - minY * zoom,
  };

  return { pan, zoom };
}

export function normalizeCanvasStage(value?: string | null): CanvasStage | null {
  if (!value) return null;
  if (value === "moodboard" || value === "system" || value === "collect" || value === "generate") {
    return "collect";
  }
  if (value === "compose") {
    return value;
  }
  return null;
}

type SectionId = "hero" | "proof" | "features" | "testimonials" | "pricing" | "cta";

type VariantProfile = {
  key: string;
  name: string;
  description: string;
  heroAlign: "left" | "center";
  heroTone: "surface" | "accent" | "outline";
  featuresColumns: number;
  sectionOrder: SectionId[];
  sectionBackgrounds: Record<SectionId, "background" | "surface" | "accentWash">;
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
    // Full 6-section funnel
    sectionOrder: ["hero", "proof", "features", "testimonials", "pricing", "cta"],
    sectionBackgrounds: {
      hero: "background", proof: "surface", features: "background",
      testimonials: "surface", pricing: "accentWash", cta: "background",
    },
    pricingEmphasis: 1,
  },
  {
    key: "atlas",
    name: "Atlas",
    description: "Editorial split layout — features-first, no pricing, leaner conversion.",
    heroAlign: "left",
    heroTone: "outline",
    featuresColumns: 2,
    // Impact-first: drop proof and pricing, features come immediately after hero
    sectionOrder: ["hero", "features", "testimonials", "cta"],
    sectionBackgrounds: {
      hero: "background", proof: "background", features: "surface",
      testimonials: "background", pricing: "surface", cta: "accentWash",
    },
    pricingEmphasis: 2,
  },
  {
    key: "monograph",
    name: "Monograph",
    description: "Trust-first — social proof immediately after hero, no pricing section.",
    heroAlign: "left",
    heroTone: "accent",
    featuresColumns: 3,
    // Social proof before features, no pricing
    sectionOrder: ["hero", "testimonials", "proof", "features", "cta"],
    sectionBackgrounds: {
      hero: "accentWash", proof: "background", features: "background",
      testimonials: "surface", pricing: "background", cta: "surface",
    },
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

export function inferSiteName(prompt: string, fallback = "Your Brand"): string {
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

  // If the user quoted an intended headline, use it directly
  const quoted = clean.match(/"([^"]+)"/)?.[1];
  if (quoted) return titleCase(quoted);

  // Short prompts (≤4 words) are likely a brand name or noun phrase — safe to use as-is
  const words = clean.split(/\s+/).filter((w) => w.length > 0);
  if (words.length <= 4) return titleCase(clean);

  // Longer prompts are creative direction — extract a headline-worthy fragment.
  // Pull first sentence or first 6 words as a meaningful starting headline.
  const firstSentence = clean.match(/^[^.!?]+[.!?]?/)?.[0] ?? "";
  const sentenceWords = firstSentence.split(/\s+/).filter((w) => w.length > 0);
  if (sentenceWords.length <= 8 && sentenceWords.length > 0) {
    return titleCase(firstSentence.replace(/[.!?]+$/, ""));
  }
  // Fallback: use first 5 meaningful words
  return titleCase(words.slice(0, 5).join(" "));
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

function createFeatureCards(siteName: string, adjectives: string[]): PageNode[] {
  const [adj1 = "intuitive", adj2 = "powerful", adj3 = "reliable"] = adjectives;
  return [
    createNode("feature-card", "Feature One", {
      icon: "◈",
      text: `${titleCase(adj1)} by design`,
      subtext: `Every interaction in ${siteName} is shaped by this principle.`,
    }),
    createNode("feature-card", "Feature Two", {
      icon: "→",
      text: `${titleCase(adj2)} when it counts`,
      subtext: `The capability that sets ${siteName} apart from the rest.`,
    }),
    createNode("feature-card", "Feature Three", {
      icon: "◇",
      text: `${titleCase(adj3)} at scale`,
      subtext: `${siteName} stays consistent as your team grows.`,
    }),
  ];
}

function normalizeValue(value: string | undefined, fallback: string) {
  const nextValue = value?.trim();
  return nextValue && nextValue.length > 0 ? nextValue : fallback;
}

function cornerRadiusForTaste(corners: string | undefined) {
  const normalized = corners?.toLowerCase() ?? "";
  if (normalized.includes("sharp")) return 14;
  if (normalized.includes("round") || normalized.includes("soft")) return 30;
  return 22;
}

function sectionSpacingForTaste(
  whitespacePreference: string | undefined,
  density: string | undefined,
  mode: VariantMode
) {
  const prefersOpen =
    (whitespacePreference?.toLowerCase() ?? "").includes("open") ||
    (whitespacePreference?.toLowerCase() ?? "").includes("spacious");
  const prefersDense =
    (whitespacePreference?.toLowerCase() ?? "").includes("tight") ||
    (density?.toLowerCase() ?? "").includes("dense");

  if (mode === "creative") {
    return prefersDense
      ? { paddingX: 44, paddingY: 56, gap: 20 }
      : { paddingX: 64, paddingY: 84, gap: 30 };
  }

  if (mode === "alternative") {
    return prefersOpen
      ? { paddingX: 60, paddingY: 74, gap: 26 }
      : { paddingX: 46, paddingY: 58, gap: 18 };
  }

  if (prefersDense) {
    return { paddingX: 42, paddingY: 54, gap: 16 };
  }

  if (prefersOpen) {
    return { paddingX: 60, paddingY: 76, gap: 28 };
  }

  return { paddingX: 52, paddingY: 64, gap: 22 };
}

function heroAlignmentForTaste(
  baseAlign: VariantProfile["heroAlign"],
  heroStyle: string | undefined,
  mode: VariantMode
): VariantProfile["heroAlign"] {
  const normalized = heroStyle?.toLowerCase() ?? "";
  if (mode === "alternative") {
    return baseAlign === "left" ? "center" : "left";
  }
  if (normalized.includes("center")) return "center";
  if (normalized.includes("split") || normalized.includes("editorial")) return "left";
  return baseAlign;
}

function heroToneForTaste(
  baseTone: VariantProfile["heroTone"],
  dominantMood: string | undefined,
  mode: VariantMode
): VariantProfile["heroTone"] {
  const normalized = dominantMood?.toLowerCase() ?? "";
  if (mode === "creative") return "accent";
  if (normalized.includes("editorial") || normalized.includes("quiet")) return "outline";
  if (normalized.includes("bold") || normalized.includes("dramatic")) return "accent";
  return baseTone;
}

function featureColumnsForTaste(
  baseColumns: number,
  gridStyle: string | undefined,
  mode: VariantMode
) {
  const normalized = gridStyle?.toLowerCase() ?? "";
  if (mode === "alternative") return baseColumns === 3 ? 2 : 3;
  if (normalized.includes("editorial") || normalized.includes("magazine")) return 2;
  if (normalized.includes("modular") || normalized.includes("grid")) return 3;
  return baseColumns;
}

function ctaCopyForTaste(ctaTone: TasteProfile["ctaTone"] | undefined, mode: VariantMode) {
  if (mode === "creative") return "Generate a bolder direction";
  if (mode === "alternative") return "See another layout path";
  if (ctaTone?.style === "bold") return "Book the working session";
  if (ctaTone?.style === "understated") return "View the composed site";
  return "Open Compose";
}


function tasteAlignmentNote(tasteProfile: TasteProfile | null | undefined, mode: VariantMode) {
  if (!tasteProfile) {
    if (mode === "creative") {
      return "This variant pushes the layout and pacing while staying anchored to your system.";
    }
    if (mode === "alternative") {
      return "This variant explores a different layout rhythm from the same project direction.";
    }
    return "This variant stays closest to the current project system.";
  }

  if (mode === "creative") {
    return `This variant emphasizes ${normalizeValue(
      tasteProfile.imageTreatment.style,
      "image treatment"
    )} and ${normalizeValue(tasteProfile.layoutBias.heroStyle, "hero treatment")} from your references.`;
  }

  if (mode === "alternative") {
    return `This variant emphasizes ${normalizeValue(
      tasteProfile.layoutBias.gridBehavior,
      "grid structure"
    )} with a different layout approach from your references.`;
  }

  return `This variant emphasizes ${normalizeValue(
    tasteProfile.layoutBias.whitespaceIntent,
    "spacing balance"
  )} and ${normalizeValue(
    tasteProfile.typographyTraits.headingTone,
    "typographic mood"
  )} from your references.`;
}

function createTestimonials(siteName: string): PageNode[] {
  return [
    createNode("testimonial-card", "Testimonial One", {
      text: `"${siteName} changed the way our team works — we shipped in half the time."`,
      subtext: "Alex K., Head of Product",
      meta: "Series B startup",
    }),
    createNode("testimonial-card", "Testimonial Two", {
      text: `"The quality of output went up immediately. Our clients noticed."`,
      subtext: "Jordan M., Founder & CEO",
      meta: "Digital agency",
    }),
    createNode("testimonial-card", "Testimonial Three", {
      text: `"We evaluated six options. ${siteName} was the only one that felt right."`,
      subtext: "Sam L., VP of Design",
      meta: "Enterprise team",
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
        price: "$–",
        subtext: "For individuals",
        meta: "Core features • 1 workspace • community support",
      },
      { emphasized: emphasized === 0 }
    ),
    createNode(
      "pricing-tier",
      "Pro Tier",
      {
        text: "Pro",
        price: "$–",
        subtext: `For growing teams using ${siteName}`,
        meta: "All features • unlimited workspaces • priority support",
        badge: "Popular",
      },
      { emphasized: emphasized === 1 }
    ),
    createNode(
      "pricing-tier",
      "Enterprise Tier",
      {
        text: "Enterprise",
        price: "Custom",
        subtext: "For large organisations",
        meta: "Custom integrations • SLA • dedicated support",
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
    createNode("metric-item", "Metric One", { text: "—", subtext: "key result for your users" }),
    createNode("metric-item", "Metric Two", { text: "—", subtext: "time to first outcome" }),
    createNode("metric-item", "Metric Three", { text: "—", subtext: "teams already using it" }),
  ];
}

function createVariantPageTree(
  profile: VariantProfile,
  prompt: string,
  siteName: string,
  tokens: DesignSystemTokens,
  tasteProfile: TasteProfile | null,
  mode: VariantMode
): PageNode {
  const audience = inferAudience(prompt);
  const promise = inferPromise(prompt);
  const adjectives: string[] = tasteProfile?.adjectives?.length
    ? tasteProfile.adjectives
    : ["thoughtful", "refined", "structured"];
  const [adj1 = "thoughtful", adj2 = "refined"] = adjectives;

  const spacing = sectionSpacingForTaste(
    tasteProfile?.layoutBias.whitespaceIntent,
    tasteProfile?.layoutBias.density,
    mode
  );
  const featureColumns = featureColumnsForTaste(
    profile.featuresColumns,
    tasteProfile?.layoutBias.gridBehavior,
    mode
  );
  const heroAlign = heroAlignmentForTaste(
    profile.heroAlign,
    tasteProfile?.layoutBias.heroStyle,
    mode
  );
  const heroTone = heroToneForTaste(
    profile.heroTone,
    tasteProfile?.colorBehavior.mode,
    mode
  );
  const radius = cornerRadiusForTaste(tasteProfile?.imageTreatment.cornerRadius);
  const imageStyle = normalizeValue(tasteProfile?.imageTreatment.style, "editorial");
  const ctaCopy = ctaCopyForTaste(tasteProfile?.ctaTone, mode);

  // Derive headings from the brief and taste profile — write copy that feels specific
  const featuresHeading =
    mode === "creative"
      ? `Why ${audience} choose ${adj1}`
      : `Everything ${audience} need`;
  const featuresBody =
    `${titleCase(adj1)} design meets ${adj2} execution. ` +
    `Every detail considered, nothing left to chance.`;
  const testimonialsHeading = `Trusted by ${audience}`;
  const pricingHeading = `Choose your plan`;
  const ctaHeading =
    mode === "alternative"
      ? `Ready to get started?`
      : `Build something ${adj1}`;
  const ctaBody =
    `Join ${audience} already using ${siteName}.`;
  const heroKicker = `${titleCase(adj1)} • ${titleCase(adj2)}`;
  const heroBody =
    `${siteName} helps ${audience} move faster without sacrificing quality. ` +
    `${titleCase(adj1)} by default, ${adj2} by design.`;

  // Build all possible sections — sectionOrder below decides which to include
  const bg = (id: SectionId) => surfaceForMode(tokens, profile.sectionBackgrounds[id]);

  const hero = createNode(
    "section",
    "Hero Section",
    undefined,
    {
      background: bg("hero"),
      align: heroAlign,
      minHeight: mode === "creative" ? 620 : 560,
      paddingX: spacing.paddingX,
      paddingY: spacing.paddingY + 8,
      gap: spacing.gap,
      borderRadius: radius + 4,
      badgeTone: heroTone,
    },
    [
      createNode("paragraph", "Hero Kicker", {
        text: heroKicker,
      }, { foreground: tokens.colors.accent, align: heroAlign }),
      createNode("heading", "Hero Heading", {
        text: promise,
      }, { align: heroAlign }),
      createNode("paragraph", "Hero Body", {
        text: heroBody,
      }, { align: heroAlign, muted: tokens.colors.textMuted }),
      createNode("button-row", "Hero Actions", undefined, { align: heroAlign, gap: 12 }, [
        createNode("button", "Primary Button", {
          text: ctaCopy,
          href: "#cta",
        }, { accent: tokens.colors.accent, emphasized: true }),
        createNode("button", "Secondary Button", {
          text: "See how it works",
          href: "#features",
        }, { borderColor: tokens.colors.border, foreground: tokens.colors.text }),
      ]),
      createNode("metric-row", "Hero Metrics", undefined, { gap: 16, align: heroAlign }, createMetricItems()),
    ]
  );

  const proof = createNode(
    "section",
    "Proof Section",
    undefined,
    {
      background: bg("proof"),
      align: "center",
      paddingX: spacing.paddingX - 4,
      paddingY: spacing.paddingY - 14,
      gap: spacing.gap + 2,
      borderRadius: radius,
    },
    [
      createNode("paragraph", "Proof Label", {
        text: `Trusted by teams who care about ${imageStyle} quality`,
      }, { align: "center", muted: tokens.colors.textMuted }),
      createNode("logo-row", "Logo Row", undefined, { gap: 18, align: "center" }, createLogoItems()),
    ]
  );

  const features = createNode(
    "section",
    "Features Section",
    undefined,
    {
      background: bg("features"),
      align: heroAlign,
      paddingX: spacing.paddingX,
      paddingY: spacing.paddingY,
      gap: spacing.gap + 6,
      borderRadius: radius,
    },
    [
      createNode("heading", "Features Heading", {
        text: featuresHeading,
      }, { align: heroAlign }),
      createNode("paragraph", "Features Body", {
        text: featuresBody,
      }, { align: heroAlign, muted: tokens.colors.textMuted }),
      createNode(
        "feature-grid",
        "Feature Grid",
        undefined,
        { columns: featureColumns, gap: spacing.gap },
        createFeatureCards(siteName, adjectives)
      ),
    ]
  );

  const testimonials = createNode(
    "section",
    "Testimonials Section",
    undefined,
    {
      background: bg("testimonials"),
      align: "left",
      paddingX: spacing.paddingX,
      paddingY: spacing.paddingY,
      gap: spacing.gap + 2,
      borderRadius: radius,
    },
    [
      createNode("heading", "Testimonials Heading", {
        text: testimonialsHeading,
      }),
      createNode("testimonial-grid", "Testimonial Grid", undefined, { columns: 3, gap: 18 }, createTestimonials(siteName)),
    ]
  );

  const pricing = createNode(
    "section",
    "Pricing Section",
    undefined,
    {
      background: bg("pricing"),
      align: "center",
      paddingX: spacing.paddingX,
      paddingY: spacing.paddingY,
      gap: spacing.gap + 2,
      borderRadius: radius,
    },
    [
      createNode("heading", "Pricing Heading", {
        text: pricingHeading,
      }, { align: "center" }),
      createNode("pricing-grid", "Pricing Grid", undefined, { columns: 3, gap: 18 }, createPricingTiers(siteName, profile.pricingEmphasis)),
    ]
  );

  const cta = createNode(
    "section",
    "CTA Section",
    undefined,
    {
      background: bg("cta"),
      align: "center",
      paddingX: spacing.paddingX,
      paddingY: spacing.paddingY + 8,
      gap: spacing.gap,
      borderRadius: radius,
    },
    [
      createNode("heading", "CTA Heading", {
        text: ctaHeading,
      }, { align: "center" }),
      createNode("paragraph", "CTA Body", {
        text: ctaBody,
      }, { align: "center", muted: tokens.colors.textMuted }),
      createNode("button-row", "CTA Actions", undefined, { align: "center", gap: 12 }, [
        createNode("button", "CTA Button", {
          text: ctaCopy,
          href: "#top",
        }, { accent: tokens.colors.accent, emphasized: true }),
      ]),
    ]
  );

  // Build only the sections this variant calls for, in the order it specifies
  const sectionMap: Record<SectionId, PageNode> = { hero, proof, features, testimonials, pricing, cta };
  const children = profile.sectionOrder.map((id) => sectionMap[id]);

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
    children
  );
}

export function createVariantSet(
  prompt: string,
  tokens: DesignSystemTokens,
  siteType: SiteType,
  siteName = inferSiteName(prompt),
  tasteProfile: TasteProfile | null = null,
  requestedModes: VariantMode[] = ["safe", "creative", "alternative"]
): GeneratedVariant[] {
  const createdAt = new Date().toISOString();
  const resolvedSiteType = siteType === "auto" ? "saas-landing" : siteType;
  const variantModes: VariantMode[] = requestedModes.length > 0 ? requestedModes : ["safe"];

  return VARIANT_PROFILES.filter((_, index) => Boolean(variantModes[index])).map((profile, index) => {
    const mode = variantModes[index] ?? "safe";
    return {
      id: uid("variant"),
      name: `${profile.name} ${index + 1}`,
      pageTree: createVariantPageTree(
        profile,
        prompt,
        siteName,
        tokens,
        tasteProfile,
        mode
      ),
      previewImage: null,
      compiledCode: null,
      sourcePrompt: prompt,
      createdAt,
      isFavorite: false,
      description: tasteAlignmentNote(tasteProfile, mode),
      siteType: resolvedSiteType,
      strategy: mode,
      strategyLabel:
        mode === "safe"
          ? "A: Safe"
          : mode === "creative"
          ? "B: Creative"
          : "C: Alternative",
      tasteEmphasis:
        mode === "safe"
          ? [
              normalizeValue(
                tasteProfile?.layoutBias.whitespaceIntent,
                "spacing balance"
              ),
              normalizeValue(
                tasteProfile?.typographyTraits.headingTone,
                "type mood"
              ),
            ]
          : mode === "creative"
          ? [
              normalizeValue(
                tasteProfile?.imageTreatment.style,
                "image treatment"
              ),
              normalizeValue(
                tasteProfile?.layoutBias.heroStyle,
                "hero treatment"
              ),
            ]
          : [
              normalizeValue(tasteProfile?.layoutBias.gridBehavior, "grid style"),
              normalizeValue(
                tasteProfile?.colorBehavior.suggestedColors?.background,
                "background preference"
              ),
            ],
    };
  });
}

export function createComposeDocument(variant: GeneratedVariant): ComposeDocument {
  const artboards = BREAKPOINT_ARTBOARD_LAYOUTS.map(({ breakpoint, name, x }) => ({
    id: uid("artboard"),
    variantId: variant.id,
    breakpoint,
    name,
    x,
    y: 0,
    pageTree: structuredClone(variant.pageTree),
    compiledCode: variant.compiledCode ?? null,
  }));

  return {
    artboards,
    selectedArtboardId: artboards[0]?.id ?? null,
    selectedNodeId: artboards[0]?.pageTree.children?.[0]?.id ?? artboards[0]?.pageTree.id ?? null,
    primaryArtboardId: artboards[0]?.id ?? null,
    breakpoint: "desktop",
    pan: { x: 120, y: 120 },
    zoom: 0.25,
    overlays: [],
    inspectorTab: "content",
    exportArtifact: null,
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeComposeDocument(value: unknown): ComposeDocument | null {
  if (!isPlainObject(value)) return null;
  if (!Array.isArray(value.artboards)) return null;

  const validArtboards = value.artboards.filter(
    (artboard): artboard is ComposeArtboard =>
      isPlainObject(artboard) &&
      typeof artboard.id === "string" &&
      typeof artboard.name === "string" &&
      typeof artboard.x === "number" &&
      typeof artboard.y === "number" &&
      isPlainObject(artboard.pageTree)
  );

  if (validArtboards.length === 0) return null;

  // Back-fill breakpoint for artboards saved before Phase 3B.
  // Filter out legacy tablet artboards (saved data may contain breakpoints no longer in the type).
  const artboards = validArtboards
    .filter((artboard) => (artboard.breakpoint as string) !== "tablet")
    .map((artboard) => {
      if (artboard.breakpoint === "desktop" || artboard.breakpoint === "mobile") {
        return artboard;
      }
      const inferred = BREAKPOINT_ARTBOARD_LAYOUTS.find((l) => l.name === artboard.name)?.breakpoint ?? "desktop";
      return { ...artboard, breakpoint: inferred };
    });

  const panSource = isPlainObject(value.pan) ? value.pan : null;
  const overlays = Array.isArray(value.overlays) ? (value.overlays as ComposeOverlay[]) : [];

  return {
    artboards,
    selectedArtboardId:
      typeof value.selectedArtboardId === "string" || value.selectedArtboardId === null
        ? value.selectedArtboardId
        : null,
    selectedNodeId:
      typeof value.selectedNodeId === "string" || value.selectedNodeId === null
        ? value.selectedNodeId
        : null,
    primaryArtboardId:
      typeof value.primaryArtboardId === "string" || value.primaryArtboardId === null
        ? value.primaryArtboardId
        : null,
    breakpoint:
      value.breakpoint === "desktop" || value.breakpoint === "mobile"
        ? value.breakpoint
        : "desktop",
    pan: {
      x: typeof panSource?.x === "number" ? panSource.x : 120,
      y: typeof panSource?.y === "number" ? panSource.y : 120,
    },
    zoom:
      typeof value.zoom === "number" ? Math.max(0.1, Math.min(5, value.zoom)) : 0.58,
    overlays,
    inspectorTab:
      value.inspectorTab === "content" ||
      value.inspectorTab === "style" ||
      value.inspectorTab === "layout" ||
      value.inspectorTab === "effects" ||
      value.inspectorTab === "ai"
        ? value.inspectorTab
        : "content",
    exportArtifact:
      isPlainObject(value.exportArtifact) &&
      typeof value.exportArtifact.code === "string" &&
      typeof value.exportArtifact.name === "string" &&
      typeof value.exportArtifact.updatedAt === "string"
        ? {
            code: value.exportArtifact.code,
            name: value.exportArtifact.name,
            updatedAt: value.exportArtifact.updatedAt,
          }
        : null,
  };
}

export function rehydrateComposeDocument(
  base: ComposeDocument,
  persisted: ComposeDocument | null
): ComposeDocument {
  const safePersisted = sanitizeComposeDocument(persisted);
  if (!safePersisted) return base;

  const persistedByVariantId = new Map(
    safePersisted.artboards.map((artboard) => [artboard.variantId, artboard])
  );
  const persistedByName = new Map(
    safePersisted.artboards.map((artboard) => [artboard.name, artboard])
  );

  // Check if persisted artboards use the old 80px gap — if so, use base positions
  const persistedArtboards = safePersisted.artboards;
  const hasStalePositions =
    persistedArtboards.length >= 2 &&
    persistedArtboards.some((a, i) => {
      if (i === 0) return false;
      const prev = persistedArtboards[i - 1];
      const prevWidth = BREAKPOINT_WIDTHS[prev.breakpoint] ?? 1440;
      const gap = a.x - (prev.x + prevWidth);
      return gap > 0 && gap < COMPOSE_ARTBOARD_GAP;
    });

  const artboards = base.artboards.map((artboard) => {
    const match =
      persistedByVariantId.get(artboard.variantId) ??
      persistedByName.get(artboard.name);

    if (!match) return artboard;

    return {
      ...artboard,
      // Use base positions (new gap) if persisted positions are stale
      x: hasStalePositions ? artboard.x : match.x,
      y: hasStalePositions ? artboard.y : match.y,
      pageTree: structuredClone(match.pageTree ?? artboard.pageTree),
    };
  });

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const resolvedPersisted = safePersisted!;

  function resolveArtboardId(persistedId: string | null): string | null {
    if (!persistedId) return null;
    const previous = resolvedPersisted.artboards.find((artboard) => artboard.id === persistedId);
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
    breakpoint: safePersisted.breakpoint ?? base.breakpoint,
    pan: safePersisted.pan ?? base.pan,
    zoom:
      typeof safePersisted.zoom === "number"
        ? Math.max(0.1, Math.min(5, safePersisted.zoom))
        : base.zoom,
    overlays: safePersisted.overlays ?? base.overlays,
    inspectorTab: safePersisted.inspectorTab ?? base.inspectorTab,
    selectedArtboardId:
      resolveArtboardId(safePersisted.selectedArtboardId) ?? base.selectedArtboardId,
    primaryArtboardId:
      resolveArtboardId(safePersisted.primaryArtboardId) ?? base.primaryArtboardId,
    selectedNodeId: safePersisted.selectedNodeId ?? base.selectedNodeId,
    exportArtifact: safePersisted.exportArtifact ?? base.exportArtifact,
  };
}

export function getNodeStyle(node: PageNode, breakpoint: Breakpoint): PageNodeStyle {
  return {
    ...(node.style ?? {}),
    ...(breakpoint === "desktop" ? {} : node.responsiveOverrides?.[breakpoint]),
  };
}

export function isNodeHidden(node: PageNode, breakpoint: Breakpoint): boolean {
  return node.hidden?.[breakpoint] ?? false;
}

export function cloneNode<T>(value: T): T {
  return structuredClone(value);
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

export function findParentNode(
  root: PageNode,
  targetId: string
): PageNode | null {
  if (!root.children) return null;
  for (const child of root.children) {
    if (child.id === targetId) return root;
    const found = findParentNode(child, targetId);
    if (found) return found;
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
  itemId: string,
  updater: (tree: PageNode) => PageNode
): ComposeDocument {
  return {
    ...document,
    artboards: document.artboards.map((artboard) =>
      artboard.id === itemId
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

export function compileSectionNodeToTSX(
  sectionNode: PageNode,
  tokens: DesignSystemTokens,
  componentName = "ComposedSection"
): string {
  const wrappedPage: PageNode = {
    id: `page-export-${sectionNode.id}`,
    type: "page",
    name: `${sectionNode.name} Export`,
    style: {
      background: tokens.colors.background,
      foreground: tokens.colors.text,
      muted: tokens.colors.textMuted,
      accent: tokens.colors.accent,
      borderColor: tokens.colors.border,
      gap: 18,
      paddingX: 24,
      paddingY: 24,
      maxWidth: BREAKPOINT_WIDTHS.desktop,
    },
    children: [cloneNode(sectionNode)],
  };

  return compilePageTreeToTSX(wrappedPage, tokens, componentName);
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
