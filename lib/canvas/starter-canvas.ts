import type { DesignSystemTokens } from "@/lib/canvas/generate-system";
import type { ImageAnalysis } from "@/lib/canvas/analyze-images";
import type { TasteProfile } from "@/types/taste-profile";
import {
  saveProject,
  upsertProjectState,
  type StoredProject,
} from "@/lib/project-store";
import type { DesignNode, DesignNodeStyle } from "./design-node";
import {
  createMoodboardReferenceItem,
  createEmptyCanvas,
  type ArtboardItem,
  type ArrowItem,
  type CanvasItem,
  type FrameItem,
  type NoteItem,
  type ReferenceItem,
  type UnifiedCanvasState,
} from "./unified-canvas-state";
import type { SiteType } from "./templates";

export const STARTER_CANVAS_PROJECT_ID = "starter-canvas";
export const STARTER_CANVAS_LAYOUT_VERSION = 8;

const STARTER_LAYOUT_LS_KEY = "studio-os:starter-canvas-layout-version";

const C = {
  accent: "#2563FF",
  bg: "#F2ECE4",
  surface: "#FFFFFF",
  muted: "#ECE6DD",
  border: "#DCD4C9",
  primary: "#1A1A1A",
  secondary: "#6B6B6B",
  warm: "#B88A5A",
  inkSoft: "#303030",
};

const FONT = {
  sans: "'Geist Sans', Inter, system-ui, sans-serif",
  serif: "'Bespoke Serif', Georgia, serif",
  mono: "'IBM Plex Mono', monospace",
};

const SITE_ID = "starter-site-systems";
const DESKTOP_ARTBOARD_ID = "starter-desktop-proof";
const SELECTED_SECTION_ID = "starter-proof-system-section";
const STARTER_SITE_TYPE: SiteType = "saas-landing";

function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function referenceSvg(kind: "landing" | "type" | "system" | "product"): string {
  const common = `font-family="Inter, ui-sans-serif, system-ui, sans-serif"`;
  const mono = `font-family="'IBM Plex Mono', ui-monospace, monospace"`;

  if (kind === "landing") {
    return svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="520" height="680" viewBox="0 0 520 680">
      <rect width="520" height="680" fill="${C.surface}"/>
      <rect x="32" y="30" width="456" height="620" fill="${C.bg}" stroke="${C.border}"/>
      <text x="54" y="68" ${mono} font-size="12" fill="${C.secondary}">AURORA CLOUD</text>
      <rect x="352" y="49" width="54" height="1" fill="${C.border}"/>
      <rect x="418" y="40" width="48" height="20" fill="${C.primary}"/>
      <text x="54" y="156" ${common} font-size="58" font-weight="650" fill="${C.primary}">Ship calm</text>
      <text x="54" y="218" ${common} font-size="58" font-weight="650" fill="${C.primary}">systems.</text>
      <text x="56" y="264" ${common} font-size="18" fill="${C.secondary}">Enterprise workflows with a sharper product story.</text>
      <rect x="54" y="310" width="116" height="38" rx="4" fill="${C.accent}"/>
      <rect x="184" y="310" width="118" height="38" rx="4" fill="${C.surface}" stroke="${C.border}"/>
      <rect x="56" y="410" width="408" height="166" fill="${C.primary}"/>
      <rect x="82" y="438" width="102" height="12" fill="${C.surface}" opacity="0.9"/>
      <rect x="82" y="470" width="252" height="8" fill="${C.surface}" opacity="0.45"/>
      <rect x="82" y="492" width="184" height="8" fill="${C.surface}" opacity="0.25"/>
      <rect x="360" y="438" width="72" height="72" fill="${C.accent}"/>
      <rect x="82" y="602" width="86" height="8" fill="${C.primary}" opacity="0.72"/>
      <rect x="212" y="602" width="86" height="8" fill="${C.primary}" opacity="0.72"/>
      <rect x="342" y="602" width="86" height="8" fill="${C.primary}" opacity="0.72"/>
      <rect x="38" y="36" width="92" height="24" rx="3" fill="${C.accent}"/>
      <text x="50" y="52" ${mono} font-size="10" fill="${C.surface}">STYLE REF</text>
    </svg>`);
  }

  if (kind === "type") {
    return svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="520" height="680" viewBox="0 0 520 680">
      <rect width="520" height="680" fill="${C.bg}"/>
      <rect x="40" y="42" width="440" height="596" fill="${C.surface}" stroke="${C.border}"/>
      <text x="62" y="84" ${mono} font-size="11" fill="${C.secondary}">TYPE SCALE / SPECIMEN 04</text>
      <line x1="62" y1="112" x2="458" y2="112" stroke="${C.border}"/>
      <text x="62" y="214" font-family="Georgia, serif" font-size="104" fill="${C.primary}">Aa</text>
      <text x="252" y="174" ${common} font-size="34" font-weight="650" fill="${C.primary}">Bespoke</text>
      <text x="252" y="216" ${common} font-size="34" font-weight="650" fill="${C.primary}">systems</text>
      <text x="64" y="286" ${common} font-size="19" fill="${C.secondary}">Editorial contrast with neutral product utility.</text>
      <line x1="62" y1="330" x2="458" y2="330" stroke="${C.border}"/>
      <text x="62" y="382" font-family="Georgia, serif" font-size="58" fill="${C.primary}">Display 64/1.0</text>
      <text x="62" y="438" ${common} font-size="30" fill="${C.primary}">Heading 32/1.1</text>
      <text x="62" y="488" ${common} font-size="17" fill="${C.primary}">Body 17/1.55 for explanation and product copy.</text>
      <text x="62" y="540" ${mono} font-size="12" fill="${C.accent}">IBM PLEX MONO / DATA LABELS</text>
      <line x1="62" y1="576" x2="458" y2="576" stroke="${C.border}"/>
      <text x="62" y="612" ${mono} font-size="10" fill="${C.secondary}">04 08 16 24 40 64</text>
    </svg>`);
  }

  if (kind === "system") {
    return svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="520" height="680" viewBox="0 0 520 680">
      <rect width="520" height="680" fill="${C.surface}"/>
      <rect x="34" y="34" width="452" height="612" fill="${C.bg}" stroke="${C.border}"/>
      <text x="58" y="76" ${mono} font-size="11" fill="${C.secondary}">COMPONENT SYSTEM</text>
      <rect x="58" y="112" width="118" height="38" rx="4" fill="${C.primary}"/>
      <rect x="194" y="112" width="118" height="38" rx="4" fill="${C.accent}"/>
      <rect x="330" y="112" width="118" height="38" rx="4" fill="${C.surface}" stroke="${C.border}"/>
      <rect x="58" y="190" width="390" height="44" rx="4" fill="${C.surface}" stroke="${C.border}"/>
      <rect x="74" y="206" width="110" height="10" fill="${C.border}"/>
      <rect x="58" y="270" width="390" height="90" fill="${C.surface}" stroke="${C.border}"/>
      <rect x="78" y="292" width="86" height="10" fill="${C.primary}"/>
      <rect x="78" y="320" width="310" height="8" fill="${C.border}"/>
      <rect x="78" y="340" width="214" height="8" fill="${C.border}"/>
      <rect x="58" y="404" width="78" height="78" fill="${C.primary}"/>
      <rect x="152" y="404" width="78" height="78" fill="${C.accent}"/>
      <rect x="246" y="404" width="78" height="78" fill="${C.muted}" stroke="${C.border}"/>
      <rect x="340" y="404" width="78" height="78" fill="${C.surface}" stroke="${C.border}"/>
      <text x="58" y="536" ${mono} font-size="10" fill="${C.secondary}">Tabs</text>
      <rect x="58" y="556" width="84" height="32" fill="${C.surface}" stroke="${C.primary}"/>
      <rect x="142" y="556" width="84" height="32" fill="${C.surface}" stroke="${C.border}"/>
      <rect x="226" y="556" width="84" height="32" fill="${C.surface}" stroke="${C.border}"/>
    </svg>`);
  }

  return svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="520" height="680" viewBox="0 0 520 680">
    <rect width="520" height="680" fill="${C.bg}"/>
    <rect x="36" y="38" width="448" height="604" fill="${C.surface}" stroke="${C.border}"/>
    <text x="62" y="82" ${mono} font-size="11" fill="${C.secondary}">PRODUCT MODULE CROP</text>
    <rect x="62" y="120" width="396" height="92" fill="${C.primary}"/>
    <text x="88" y="158" ${common} font-size="16" fill="${C.surface}">Revenue quality</text>
    <text x="88" y="190" ${common} font-size="34" font-weight="650" fill="${C.surface}">98.4%</text>
    <rect x="332" y="150" width="86" height="22" fill="${C.accent}"/>
    <rect x="62" y="252" width="180" height="124" fill="${C.surface}" stroke="${C.border}"/>
    <rect x="274" y="252" width="184" height="124" fill="${C.surface}" stroke="${C.border}"/>
    <text x="84" y="292" ${mono} font-size="10" fill="${C.secondary}">ACTIVATION</text>
    <text x="84" y="338" ${common} font-size="38" fill="${C.primary}">42k</text>
    <text x="296" y="292" ${mono} font-size="10" fill="${C.secondary}">RETENTION</text>
    <text x="296" y="338" ${common} font-size="38" fill="${C.primary}">81%</text>
    <rect x="62" y="424" width="396" height="150" fill="${C.surface}" stroke="${C.border}"/>
    <line x1="92" y1="534" x2="418" y2="534" stroke="${C.border}"/>
    <polyline points="92,506 154,488 216,500 278,462 340,450 418,430" fill="none" stroke="${C.accent}" stroke-width="4"/>
    <circle cx="278" cy="462" r="6" fill="${C.primary}"/>
    <text x="62" y="612" ${common} font-size="15" fill="${C.secondary}">Sparse metrics, visible decisions, no clutter.</text>
  </svg>`);
}

function textNode(
  id: string,
  text: string,
  style: DesignNodeStyle,
  name = "Text"
): DesignNode {
  return {
    id,
    type: "text",
    name,
    style,
    content: { text },
  };
}

function frameNode(
  id: string,
  name: string,
  style: DesignNodeStyle,
  children: DesignNode[] = []
): DesignNode {
  return { id, type: "frame", name, style, children };
}

function buttonNode(id: string, label: string, primary = false): DesignNode {
  return {
    id,
    type: "button",
    name: label,
    style: {
      width: "hug",
      height: "hug",
      padding: { top: 12, right: 18, bottom: 12, left: 18 },
      background: primary ? C.accent : C.surface,
      foreground: primary ? C.surface : C.primary,
      borderColor: primary ? C.accent : C.border,
      borderWidth: 1,
      borderRadius: 4,
      fontFamily: FONT.sans,
      fontSize: 14,
      fontWeight: 600,
    },
    content: { text: label },
  };
}

function dividerNode(id: string): DesignNode {
  return {
    id,
    type: "divider",
    name: "Rule",
    style: { width: "fill", height: 1, background: C.border },
  };
}

function chip(id: string, label: string): DesignNode {
  return frameNode(id, label, {
    width: "hug",
    height: "hug",
    padding: { top: 8, right: 10, bottom: 8, left: 10 },
    background: C.surface,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 4,
  }, [
    textNode(`${id}-text`, label, {
      fontFamily: FONT.mono,
      fontSize: 10,
      fontWeight: 500,
      letterSpacing: 0,
      foreground: C.secondary,
    }),
  ]);
}

function createReferences(): ReferenceItem[] {
  const refs = [
    {
      id: "starter-ref-premium-saas",
      title: "Premium SaaS Landing",
      imageUrl: referenceSvg("landing"),
      tags: ["enterprise saas", "hero hierarchy", "product block", "high-trust blue"],
      weight: "primary" as const,
      confidence: "high" as const,
      naturalWidth: 520,
      naturalHeight: 680,
    },
    {
      id: "starter-ref-typography",
      title: "Typography Specimen",
      imageUrl: referenceSvg("type"),
      tags: ["editorial type", "modular scale", "thin rules", "serif contrast"],
      weight: "default" as const,
      confidence: "medium" as const,
      naturalWidth: 520,
      naturalHeight: 680,
    },
    {
      id: "starter-ref-components",
      title: "Component System",
      imageUrl: referenceSvg("system"),
      tags: ["component system", "thin borders", "tokens", "controls"],
      weight: "default" as const,
      confidence: "medium" as const,
      naturalWidth: 520,
      naturalHeight: 680,
    },
    {
      id: "starter-ref-product-module",
      title: "Product UI Module",
      imageUrl: referenceSvg("product"),
      tags: ["product UI", "metric module", "restrained data", "sparse dashboard"],
      weight: "muted" as const,
      confidence: "low" as const,
      naturalWidth: 520,
      naturalHeight: 680,
    },
  ];

  const placed: CanvasItem[] = [];

  return refs.map((ref, index) => {
    const item = createMoodboardReferenceItem({
      id: ref.id,
      imageUrl: ref.imageUrl,
      title: ref.title,
      source: "generated",
      naturalWidth: ref.naturalWidth,
      naturalHeight: ref.naturalHeight,
      existingItems: placed,
      zIndex: index + 1,
      weight: ref.weight,
    });

    const next: ReferenceItem = {
      ...item,
      annotation:
        ref.weight === "primary"
          ? "AI composition confidence: high. Treated as the primary style reference."
          : ref.weight === "muted"
            ? "AI composition confidence: low. Muted so it does not dominate generation."
            : "AI composition confidence: medium. Kept as supporting taste evidence.",
      isStyleRef: ref.weight === "primary",
      compositionAnalysis: {
        referenceType: "screenshot",
        referenceConfidence: ref.confidence,
        era: "contemporary",
        analyzedAt: new Date().toISOString(),
        balance: ref.weight === "primary" ? "symmetric" : "asymmetric",
        density: "balanced",
        tension: ref.weight === "primary" ? "moderate" : "low",
        keyCompositionalMove:
          ref.weight === "primary"
            ? "Clear enterprise SaaS hierarchy with product proof"
            : ref.weight === "muted"
              ? "Useful product data signal but too dashboard-adjacent"
              : "Supporting system detail",
        spacingSystem: "8px-grid",
        typographicDensity: "balanced",
        hierarchyClarity: ref.weight === "muted" ? "subtle" : "obvious",
        displayTypePlacement: ref.weight === "primary" ? "isolated-whitespace" : "centered",
        lineHeightCharacter: "balanced-readable",
        letterSpacingIntent: "neutral",
        headingToBodyRatio: ref.weight === "primary" ? "dramatic" : "moderate",
      },
      extracted: {
        colors: [C.primary, C.surface, C.accent, C.muted, C.bg],
        fonts: ["Geist Sans", "Bespoke Serif", "IBM Plex Mono"],
        tags: ref.tags,
      },
    };

    placed.push(next);
    return next;
  });
}

function createHeroFrame(): FrameItem {
  return {
    id: "starter-frame-hero",
    kind: "frame",
    name: "01 / Cover",
    x: 820,
    y: 92,
    width: 390,
    height: 276,
    zIndex: 10,
    locked: false,
    style: {
      width: 390,
      height: 276,
      display: "flex",
      flexDirection: "column",
      gap: 22,
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      background: "transparent",
      foreground: C.primary,
    },
    children: [
      textNode("starter-hero-kicker", "01 / COVER", {
        fontFamily: FONT.mono,
        fontSize: 10,
        fontWeight: 650,
        letterSpacing: 0,
        foreground: C.secondary,
      }),
      frameNode("starter-hero-copy", "System canvas title", {
        width: "fill",
        height: "hug",
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }, [
        textNode("starter-hero-title-1", "System", {
          fontFamily: FONT.serif,
          fontSize: 92,
          fontWeight: 500,
          lineHeight: 0.9,
          foreground: C.primary,
        }),
        textNode("starter-hero-title-2", "canvas", {
          fontFamily: FONT.serif,
          fontSize: 92,
          fontWeight: 500,
          lineHeight: 0.9,
          foreground: C.primary,
        }),
      ]),
      textNode("starter-hero-subtitle", "A shared space for thinking in systems.\nAlign on direction. Build with confidence.", {
        width: 360,
        fontFamily: FONT.sans,
        fontSize: 16,
        lineHeight: 1.45,
        foreground: C.secondary,
      }),
    ],
  };
}

function createProjectMetaFrame(): FrameItem {
  return {
    id: "starter-frame-project-meta",
    kind: "frame",
    name: "Project Status",
    x: 1230,
    y: 110,
    width: 210,
    height: 160,
    zIndex: 11,
    locked: false,
    style: {
      width: 210,
      height: 160,
      display: "flex",
      flexDirection: "column",
      gap: 18,
      padding: { top: 18, right: 18, bottom: 18, left: 18 },
      background: "rgba(255,255,255,0.58)",
      borderColor: C.border,
      borderWidth: 1,
      borderRadius: 6,
    },
    children: [
      textNode("starter-meta-project-label", "PROJECT", {
        fontFamily: FONT.mono,
        fontSize: 9,
        fontWeight: 650,
        foreground: C.secondary,
      }),
      textNode("starter-meta-project-name", "Northstar", {
        fontFamily: FONT.sans,
        fontSize: 15,
        fontWeight: 600,
        foreground: C.primary,
      }),
      textNode("starter-meta-updated", "LAST UPDATED\nToday, 10:42 AM", {
        fontFamily: FONT.mono,
        fontSize: 9,
        lineHeight: 1.7,
        foreground: C.secondary,
      }),
      textNode("starter-meta-status", "STATUS\nIn progress", {
        fontFamily: FONT.mono,
        fontSize: 9,
        lineHeight: 1.7,
        foreground: C.accent,
      }),
    ],
  };
}

function createPrincipleFrame(): FrameItem {
  return {
    id: "starter-frame-principle",
    kind: "frame",
    name: "Principle Card",
    x: 1515,
    y: 92,
    width: 300,
    height: 190,
    zIndex: 12,
    locked: false,
    style: {
      width: 300,
      height: 190,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      padding: { top: 24, right: 24, bottom: 24, left: 24 },
      background: "#121214",
      borderColor: "#25252A",
      borderWidth: 1,
      borderRadius: 6,
    },
    children: [
      textNode("starter-principle-label", "PRINCIPLE", {
        fontFamily: FONT.mono,
        fontSize: 9,
        fontWeight: 650,
        foreground: "#A6A6A6",
      }),
      textNode("starter-principle-title", "Clarity\nat scale.", {
        fontFamily: FONT.serif,
        fontSize: 34,
        lineHeight: 1.02,
        foreground: C.surface,
      }),
      textNode("starter-principle-body", "Design systems\nthat amplify impact.", {
        fontFamily: FONT.sans,
        fontSize: 12,
        lineHeight: 1.45,
        foreground: "#BDBDB7",
      }),
    ],
  };
}

function createTasteSignalsFrame(): FrameItem {
  return {
    id: "starter-frame-taste-signals",
    kind: "frame",
    name: "02 / Taste Signals",
    x: 80,
    y: 760,
    width: 340,
    height: 300,
    zIndex: 13,
    locked: false,
    style: {
      width: 340,
      height: 300,
      display: "flex",
      flexDirection: "column",
      gap: 18,
      padding: { top: 24, right: 24, bottom: 24, left: 24 },
      background: "rgba(255,255,255,0.64)",
      borderColor: C.border,
      borderWidth: 1,
      borderRadius: 6,
    },
    children: [
      textNode("starter-taste-label", "02 / TASTE SIGNALS", {
        fontFamily: FONT.mono,
        fontSize: 9,
        fontWeight: 650,
        foreground: C.secondary,
      }),
      textNode("starter-taste-title", "Shared taste.\nStronger products.", {
        fontFamily: FONT.serif,
        fontSize: 29,
        lineHeight: 1.02,
        foreground: C.primary,
      }),
      textNode("starter-taste-body", "Signals from research, culture,\nand our best work.", {
        fontFamily: FONT.sans,
        fontSize: 13,
        lineHeight: 1.45,
        foreground: C.secondary,
      }),
      frameNode("starter-taste-thumbnails", "Taste thumbnails", {
        display: "grid",
        gridTemplate: "1fr 1fr 1fr 1fr",
        gap: 10,
      }, [
        swatchCard("starter-swatch-blue", C.accent),
        swatchCard("starter-swatch-warm", "#FF7043"),
        swatchCard("starter-swatch-noise", "#111111"),
        swatchCard("starter-swatch-pale", "#BFD6FF"),
      ]),
    ],
  };
}

function swatchCard(id: string, color: string): DesignNode {
  return frameNode(id, "Signal", {
    height: 70,
    background: color,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 2,
  });
}

function createTypeSystemFrame(): FrameItem {
  return {
    id: "starter-frame-type-system",
    kind: "frame",
    name: "03 / Type System",
    x: 820,
    y: 400,
    width: 280,
    height: 190,
    zIndex: 14,
    locked: false,
    style: {
      width: 280,
      height: 190,
      display: "flex",
      flexDirection: "column",
      gap: 16,
      padding: { top: 20, right: 20, bottom: 20, left: 20 },
      background: "rgba(255,255,255,0.58)",
      borderColor: C.border,
      borderWidth: 1,
      borderRadius: 6,
    },
    children: [
      textNode("starter-type-label", "03 / TYPE SYSTEM", {
        fontFamily: FONT.mono,
        fontSize: 9,
        fontWeight: 650,
        foreground: C.secondary,
      }),
      frameNode("starter-type-specimens", "Specimens", {
        display: "grid",
        gridTemplate: "1fr 1fr",
        gap: 24,
        alignItems: "end",
      }, [
        textNode("starter-type-serif", "Aa", {
          fontFamily: FONT.serif,
          fontSize: 74,
          lineHeight: 0.9,
          foreground: C.primary,
        }),
        textNode("starter-type-sans", "Aa\nNeutral Sans", {
          fontFamily: FONT.sans,
          fontSize: 28,
          lineHeight: 1.25,
          foreground: C.primary,
        }),
      ]),
      frameNode("starter-type-palette", "Palette", {
        display: "grid",
        gridTemplate: "1fr 1fr 1fr 1fr 1fr",
        gap: 0,
        height: 22,
      }, [
        swatchCard("starter-type-swatch-1", "#111111"),
        swatchCard("starter-type-swatch-2", "#2A2A2A"),
        swatchCard("starter-type-swatch-3", "#E7E3DD"),
        swatchCard("starter-type-swatch-4", C.accent),
        swatchCard("starter-type-swatch-5", "#FF7043"),
      ]),
    ],
  };
}

function createLayoutTokensFrame(): FrameItem {
  return {
    id: "starter-frame-layout-tokens",
    kind: "frame",
    name: "04 / Layout Tokens",
    x: 1150,
    y: 400,
    width: 300,
    height: 190,
    zIndex: 15,
    locked: false,
    style: {
      width: 300,
      height: 190,
      display: "grid",
      gridTemplate: "0.7fr 1.3fr",
      gap: 18,
      padding: { top: 20, right: 20, bottom: 20, left: 20 },
      background: "rgba(255,255,255,0.58)",
      borderColor: C.border,
      borderWidth: 1,
      borderRadius: 6,
    },
    children: [
      frameNode("starter-layout-list", "Token list", {
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }, [
        textNode("starter-layout-label", "04 / LAYOUT TOKENS", {
          fontFamily: FONT.mono,
          fontSize: 9,
          fontWeight: 650,
          foreground: C.secondary,
        }),
        textNode("starter-layout-values", "8pt\n64px\n12\n1280", {
          fontFamily: FONT.sans,
          fontSize: 18,
          lineHeight: 1.55,
          foreground: C.primary,
        }),
      ]),
      frameNode("starter-layout-lines", "Layout grid", {
        display: "grid",
        gridTemplate: "1fr 1fr 1fr 1fr 1fr",
        gap: 12,
      }, Array.from({ length: 5 }).map((_, index) =>
        frameNode(`starter-layout-line-${index}`, "Line", {
          width: 1,
          height: "fill",
          background: "#D4CCC1",
        })
      )),
    ],
  };
}

function createTasteAlignmentFrame(): FrameItem {
  return {
    id: "starter-frame-taste-alignment",
    kind: "frame",
    name: "05 / Data Module",
    x: 86,
    y: 790,
    width: 260,
    height: 210,
    zIndex: 16,
    locked: false,
    style: {
      width: 260,
      height: 210,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      padding: { top: 22, right: 22, bottom: 22, left: 22 },
      background: "#121214",
      borderColor: "#25252A",
      borderWidth: 1,
      borderRadius: 6,
    },
    children: [
      textNode("starter-align-label", "05 / DATA MODULE", {
        fontFamily: FONT.mono,
        fontSize: 9,
        foreground: "#A6A6A6",
      }),
      textNode("starter-align-title", "Taste alignment", {
        fontFamily: FONT.serif,
        fontSize: 21,
        foreground: C.surface,
      }),
      textNode("starter-align-score", "84%", {
        fontFamily: FONT.sans,
        fontSize: 40,
        lineHeight: 1,
        foreground: C.accent,
      }),
      textNode("starter-align-delta", "+12% vs last 30 days", {
        fontFamily: FONT.mono,
        fontSize: 10,
        foreground: "#7AA3FF",
      }),
    ],
  };
}

function createSynthesisFrame(): FrameItem {
  return {
    id: "starter-frame-synthesis",
    kind: "frame",
    name: "06 / System Map",
    x: 460,
    y: 640,
    width: 440,
    height: 310,
    zIndex: 17,
    locked: false,
    style: {
      width: 440,
      height: 310,
      display: "flex",
      flexDirection: "column",
      gap: 20,
      padding: { top: 24, right: 24, bottom: 24, left: 24 },
      background: "rgba(255,255,255,0.42)",
      borderColor: C.accent,
      borderWidth: 1,
      borderStyle: "dashed",
      borderRadius: 6,
    },
    children: [
      textNode("starter-synthesis-label", "06 / SYSTEM MAP", {
        fontFamily: FONT.mono,
        fontSize: 9,
        fontWeight: 650,
        foreground: C.accent,
      }),
      frameNode("starter-synthesis-inputs", "Inputs", {
        display: "grid",
        gridTemplate: "1fr 1fr 1fr",
        gap: 22,
      }, [
        systemPill("starter-synth-taste", "Taste\nsignals"),
        systemPill("starter-synth-type", "Type\nsystem"),
        systemPill("starter-synth-layout", "Layout\ntokens"),
      ]),
      frameNode("starter-synthesis-engine", "Synthesis engine", {
        width: 210,
        height: 70,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 4,
        padding: { top: 10, right: 14, bottom: 10, left: 14 },
        background: C.surface,
        borderColor: C.accent,
        borderWidth: 1,
        borderRadius: 6,
        alignSelf: "center",
      }, [
        textNode("starter-synth-engine-label", "SYSTEM ENGINE", {
          fontFamily: FONT.mono,
          fontSize: 8,
          foreground: C.secondary,
        }),
        textNode("starter-synth-engine-title", "Synthesis\nengine", {
          fontFamily: FONT.sans,
          fontSize: 18,
          fontWeight: 650,
          lineHeight: 1.05,
          foreground: C.accent,
        }),
      ]),
      frameNode("starter-synthesis-outputs", "Outputs", {
        display: "grid",
        gridTemplate: "1fr 1fr",
        gap: 86,
      }, [
        systemPill("starter-synth-components", "Components\nlibrary"),
        systemPill("starter-synth-handoff", "Handoff\nspecs"),
      ]),
    ],
  };
}

function systemPill(id: string, label: string): DesignNode {
  return frameNode(id, label, {
    minHeight: 54,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: { top: 12, right: 12, bottom: 12, left: 12 },
    background: "rgba(255,255,255,0.72)",
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 5,
  }, [
    textNode(`${id}-text`, label, {
      fontFamily: FONT.sans,
      fontSize: 12,
      fontWeight: 600,
      lineHeight: 1.15,
      foreground: C.primary,
    }),
  ]);
}

function createComponentFrame(): FrameItem {
  return {
    id: "starter-frame-component",
    kind: "frame",
    name: "06 / Component",
    x: 470,
    y: 1015,
    width: 290,
    height: 150,
    zIndex: 18,
    locked: false,
    style: {
      width: 290,
      height: 150,
      display: "flex",
      flexDirection: "column",
      gap: 16,
      padding: { top: 18, right: 18, bottom: 18, left: 18 },
      background: "rgba(255,255,255,0.62)",
      borderColor: C.border,
      borderWidth: 1,
      borderRadius: 6,
    },
    children: [
      textNode("starter-component-label", "06 / COMPONENT", {
        fontFamily: FONT.mono,
        fontSize: 9,
        fontWeight: 650,
        foreground: C.secondary,
      }),
      textNode("starter-component-title", "Button / Primary", {
        fontFamily: FONT.sans,
        fontSize: 17,
        fontWeight: 650,
        foreground: C.primary,
      }),
      buttonNode("starter-component-button", "Label", true),
    ],
  };
}

function createHandoffFrame(): FrameItem {
  return {
    id: "starter-frame-handoff",
    kind: "frame",
    name: "07 / Handoff",
    x: 825,
    y: 1015,
    width: 260,
    height: 168,
    zIndex: 19,
    locked: false,
    style: {
      width: 260,
      height: 168,
      display: "flex",
      flexDirection: "column",
      gap: 14,
      padding: { top: 20, right: 20, bottom: 20, left: 20 },
      background: "rgba(255,255,255,0.62)",
      borderColor: C.border,
      borderWidth: 1,
      borderRadius: 6,
    },
    children: [
      textNode("starter-handoff-label", "07 / HANDOFF", {
        fontFamily: FONT.mono,
        fontSize: 9,
        foreground: C.secondary,
      }),
      textNode("starter-handoff-title", "Ready for dev", {
        fontFamily: FONT.serif,
        fontSize: 24,
        lineHeight: 1.05,
        foreground: C.primary,
      }),
      textNode("starter-handoff-list", "Specs complete\nTokens synced\nAssets ready", {
        fontFamily: FONT.sans,
        fontSize: 13,
        lineHeight: 1.55,
        foreground: C.primary,
      }),
      textNode("starter-handoff-link", "Open handoff spec ->", {
        fontFamily: FONT.sans,
        fontSize: 12,
        foreground: C.accent,
      }),
    ],
  };
}

function createClosingFrame(): FrameItem {
  return {
    id: "starter-frame-output-proof",
    kind: "frame",
    name: "Output Proof",
    x: 1160,
    y: 760,
    width: 210,
    height: 170,
    zIndex: 20,
    locked: false,
    style: {
      width: 210,
      height: 170,
      display: "flex",
      flexDirection: "column",
      gap: 8,
      padding: { top: 20, right: 20, bottom: 20, left: 20 },
      background: "rgba(255,255,255,0.6)",
      borderColor: C.border,
      borderWidth: 1,
      borderRadius: 6,
    },
    children: [
      textNode("starter-output-label", "OUTPUT", {
        fontFamily: FONT.mono,
        fontSize: 9,
        foreground: C.secondary,
      }),
      textNode("starter-output-title", "Taste.\nCanvas.\nHandoff.", {
        fontFamily: FONT.serif,
        fontSize: 31,
        lineHeight: 1,
        foreground: C.primary,
      }),
    ],
  };
}

function proofHero(): DesignNode {
  return frameNode("starter-proof-hero", "Hero", {
    width: "fill",
    height: 420,
    display: "grid",
    gridTemplate: "1.05fr 0.95fr",
    gap: 48,
    padding: { top: 72, right: 80, bottom: 64, left: 80 },
    background: C.bg,
  }, [
    frameNode("starter-proof-hero-copy", "Hero copy", {
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
    }, [
      textNode("starter-proof-kicker", "OS FOR CREATIVE OPERATIONS", {
        fontFamily: FONT.mono,
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: 0,
        foreground: C.accent,
      }),
      textNode("starter-proof-headline", "A calm command center for shipping sharper product stories.", {
        fontFamily: FONT.serif,
        fontSize: 70,
        fontWeight: 500,
        lineHeight: 0.96,
        foreground: C.primary,
      }),
      frameNode("starter-proof-actions", "Actions", {
        display: "flex",
        gap: 12,
      }, [
        buttonNode("starter-proof-primary-button", "Build from references", true),
        buttonNode("starter-proof-secondary-button", "View system"),
      ]),
    ]),
    frameNode("starter-proof-product-block", "Product block", {
      height: 286,
      display: "flex",
      flexDirection: "column",
      gap: 18,
      padding: { top: 24, right: 24, bottom: 24, left: 24 },
      background: C.primary,
      borderRadius: 6,
    }, [
      frameNode("starter-proof-product-top", "Product header", {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }, [
        textNode("starter-proof-product-title", "Live system proof", {
          fontFamily: FONT.sans,
          fontSize: 20,
          fontWeight: 650,
          foreground: C.surface,
        }),
        chip("starter-proof-product-status", "READY"),
      ]),
      dividerNode("starter-proof-product-rule"),
      frameNode("starter-proof-product-grid", "Product metrics", {
        display: "grid",
        gridTemplate: "1fr 1fr 1fr",
        gap: 12,
      }, [
        metricNode("starter-proof-metric-1", "References", "4"),
        metricNode("starter-proof-metric-2", "Sections", "7"),
        metricNode("starter-proof-metric-3", "Export", "HTML"),
      ]),
    ]),
  ]);
}

function metricNode(id: string, label: string, value: string): DesignNode {
  return frameNode(id, label, {
    height: 112,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: { top: 16, right: 14, bottom: 14, left: 14 },
    background: "#242424",
    borderColor: "#343434",
    borderWidth: 1,
    borderRadius: 4,
  }, [
    textNode(`${id}-label`, label, {
      fontFamily: FONT.mono,
      fontSize: 10,
      foreground: "#B8B8B3",
    }),
    textNode(`${id}-value`, value, {
      fontFamily: FONT.sans,
      fontSize: 30,
      fontWeight: 650,
      foreground: C.surface,
    }),
  ]);
}

function proofSystemSection(): DesignNode {
  return frameNode(SELECTED_SECTION_ID, "Selected system section", {
    width: "fill",
    height: 360,
    display: "grid",
    gridTemplate: "0.85fr 1.15fr",
    gap: 34,
    padding: { top: 64, right: 80, bottom: 64, left: 80 },
    background: C.surface,
    borderColor: C.border,
    borderWidth: 1,
  }, [
    frameNode("starter-proof-system-copy", "System copy", {
      display: "flex",
      flexDirection: "column",
      gap: 18,
    }, [
      textNode("starter-proof-system-kicker", "SYSTEM INTELLIGENCE", {
        fontFamily: FONT.mono,
        fontSize: 11,
        fontWeight: 600,
        foreground: C.accent,
      }),
      textNode("starter-proof-system-title", "Translate taste into editable structure.", {
        fontFamily: FONT.serif,
        fontSize: 50,
        lineHeight: 1,
        foreground: C.primary,
      }),
      textNode("starter-proof-system-body", "The mid-page module is selected on load so editing starts inside the proof, not outside the product story.", {
        fontFamily: FONT.sans,
        fontSize: 17,
        lineHeight: 1.55,
        foreground: C.secondary,
      }),
    ]),
    frameNode("starter-proof-system-grid", "System grid", {
      display: "grid",
      gridTemplate: "1fr 1fr",
      gap: 14,
    }, [
      systemCard("starter-proof-card-palette", "Palette", "Neutral surfaces with a single blue signal."),
      systemCard("starter-proof-card-type", "Type", "Display serif moments over clean sans utility."),
      systemCard("starter-proof-card-layout", "Layout", "Spacious sections with strict modular rhythm."),
      systemCard("starter-proof-card-export", "Handoff", "Real markup stays close to the canvas tree."),
    ]),
  ]);
}

function systemCard(id: string, title: string, body: string): DesignNode {
  return frameNode(id, title, {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    padding: { top: 20, right: 20, bottom: 20, left: 20 },
    background: C.bg,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 6,
  }, [
    textNode(`${id}-title`, title, {
      fontFamily: FONT.sans,
      fontSize: 20,
      fontWeight: 650,
      foreground: C.primary,
    }),
    textNode(`${id}-body`, body, {
      fontFamily: FONT.sans,
      fontSize: 15,
      lineHeight: 1.45,
      foreground: C.secondary,
    }),
  ]);
}

function proofWorkflow(): DesignNode {
  return frameNode("starter-proof-workflow", "Workflow", {
    width: "fill",
    height: 290,
    display: "grid",
    gridTemplate: "1fr 1fr 1fr",
    gap: 18,
    padding: { top: 56, right: 80, bottom: 56, left: 80 },
    background: C.bg,
  }, [
    workflowCard("starter-proof-flow-1", "01", "References", "Bring in source material and choose what carries the strongest signal."),
    workflowCard("starter-proof-flow-2", "02", "Synthesis", "Extract palette, type, spacing, and section grammar from the set."),
    workflowCard("starter-proof-flow-3", "03", "Handoff", "Refine the live proof and export when the direction is real."),
  ]);
}

function workflowCard(id: string, number: string, title: string, body: string): DesignNode {
  return frameNode(id, title, {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: { top: 22, right: 22, bottom: 22, left: 22 },
    background: C.surface,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 6,
  }, [
    textNode(`${id}-number`, number, {
      fontFamily: FONT.mono,
      fontSize: 11,
      foreground: C.accent,
    }),
    frameNode(`${id}-copy`, "Copy", {
      display: "flex",
      flexDirection: "column",
      gap: 10,
    }, [
      textNode(`${id}-title`, title, {
        fontFamily: FONT.sans,
        fontSize: 24,
        fontWeight: 650,
        foreground: C.primary,
      }),
      textNode(`${id}-body`, body, {
        fontFamily: FONT.sans,
        fontSize: 15,
        lineHeight: 1.45,
        foreground: C.secondary,
      }),
    ]),
  ]);
}

function proofClosing(): DesignNode {
  return frameNode("starter-proof-closing-section", "Closing CTA", {
    width: "fill",
    height: 310,
    display: "grid",
    gridTemplate: "1.2fr 0.8fr",
    gap: 28,
    padding: { top: 62, right: 80, bottom: 62, left: 80 },
    background: C.primary,
  }, [
    frameNode("starter-proof-closing-copy", "Closing copy", {
      display: "flex",
      flexDirection: "column",
      gap: 18,
    }, [
      textNode("starter-proof-closing-title", "Move from direction to production without flattening taste.", {
        fontFamily: FONT.serif,
        fontSize: 52,
        lineHeight: 1,
        foreground: C.surface,
      }),
      textNode("starter-proof-closing-body", "Studio OS keeps references, decisions, sections, and exportable UI in one editable loop.", {
        width: 580,
        fontFamily: FONT.sans,
        fontSize: 17,
        lineHeight: 1.55,
        foreground: "#D7D7D2",
      }),
    ]),
    frameNode("starter-proof-closing-panel", "Closing panel", {
      display: "flex",
      flexDirection: "column",
      gap: 14,
      padding: { top: 22, right: 22, bottom: 22, left: 22 },
      background: "#242424",
      borderColor: "#343434",
      borderWidth: 1,
      borderRadius: 6,
    }, [
      chip("starter-proof-closing-chip-1", "NO LOCK-IN"),
      chip("starter-proof-closing-chip-2", "RESPONSIVE"),
      chip("starter-proof-closing-chip-3", "EDITABLE"),
    ]),
  ]);
}

function buildDesktopPage(): DesignNode {
  return frameNode("starter-proof-page", "Starter SaaS Page", {
    width: "fill",
    height: "hug",
    display: "flex",
    flexDirection: "column",
    gap: 0,
    background: C.surface,
  }, [
    proofHero(),
    proofSystemSection(),
    proofWorkflow(),
    proofClosing(),
  ]);
}

function buildMobilePage(): DesignNode {
  return frameNode("starter-mobile-page", "Starter SaaS Mobile Page", {
    width: "fill",
    height: "hug",
    display: "flex",
    flexDirection: "column",
    gap: 0,
    background: C.surface,
  }, [
    frameNode("starter-mobile-hero", "Mobile hero", {
      width: "fill",
      height: 360,
      display: "flex",
      flexDirection: "column",
      gap: 24,
      padding: { top: 34, right: 24, bottom: 34, left: 24 },
      background: C.bg,
    }, [
      textNode("starter-mobile-kicker", "STUDIO OS", {
        fontFamily: FONT.mono,
        fontSize: 11,
        foreground: C.accent,
      }),
      textNode("starter-mobile-title", "A calm command center for sharper product stories.", {
        fontFamily: FONT.serif,
        fontSize: 42,
        lineHeight: 1,
        foreground: C.primary,
      }),
      textNode("starter-mobile-body", "References, synthesis, canvas, and export in one responsive proof.", {
        fontFamily: FONT.sans,
        fontSize: 16,
        lineHeight: 1.45,
        foreground: C.secondary,
      }),
      buttonNode("starter-mobile-button", "Build from references", true),
    ]),
    frameNode("starter-mobile-system-section", "Mobile system section", {
      width: "fill",
      height: 430,
      display: "flex",
      flexDirection: "column",
      gap: 16,
      padding: { top: 32, right: 24, bottom: 32, left: 24 },
      background: C.surface,
      borderColor: C.border,
      borderWidth: 1,
    }, [
      textNode("starter-mobile-system-kicker", "SYSTEM INTELLIGENCE", {
        fontFamily: FONT.mono,
        fontSize: 10,
        foreground: C.accent,
      }),
      textNode("starter-mobile-system-title", "Taste becomes editable structure.", {
        fontFamily: FONT.serif,
        fontSize: 34,
        lineHeight: 1.03,
        foreground: C.primary,
      }),
      systemCard("starter-mobile-card-palette", "Palette", "Neutral surfaces with one clear blue signal."),
      systemCard("starter-mobile-card-layout", "Layout", "Strict rhythm, generous spacing, thin borders."),
    ]),
    frameNode("starter-mobile-footer", "Mobile footer", {
      width: "fill",
      height: 250,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      gap: 16,
      padding: { top: 30, right: 24, bottom: 30, left: 24 },
      background: C.primary,
    }, [
      textNode("starter-mobile-footer-title", "Real markup. No lock-in.", {
        fontFamily: FONT.serif,
        fontSize: 36,
        lineHeight: 1,
        foreground: C.surface,
      }),
      textNode("starter-mobile-footer-body", "Export a responsive proof when the system is ready.", {
        fontFamily: FONT.sans,
        fontSize: 15,
        lineHeight: 1.45,
        foreground: "#D7D7D2",
      }),
    ]),
  ]);
}

function createArtboards(): ArtboardItem[] {
  return [
    {
      id: DESKTOP_ARTBOARD_ID,
      kind: "artboard",
      x: 1420,
      y: 660,
      width: 1440,
      height: 1380,
      zIndex: 20,
      locked: false,
      siteId: SITE_ID,
      breakpoint: "desktop",
      name: "Desktop Proof - SaaS 1440",
      pageTree: buildDesktopPage(),
      compiledCode: null,
    },
  ];
}

function createMobileProofFrame(): FrameItem {
  const mobileTree = buildMobilePage();
  return {
    id: "starter-frame-mobile-proof",
    kind: "frame",
    name: "Mobile Proof - 375px",
    x: 2920,
    y: 660,
    width: 375,
    height: 1040,
    zIndex: 21,
    locked: false,
    style: {
      ...mobileTree.style,
      width: 375,
      height: 1040,
      overflow: "hidden",
      borderColor: C.border,
      borderWidth: 1,
      borderRadius: 8,
      background: C.surface,
    },
    children: mobileTree.children ?? [],
  };
}

function createNotes(): NoteItem[] {
  return [
    {
      id: "starter-note-swap-reference",
      kind: "note",
      x: 1015,
      y: 710,
      width: 150,
      height: 58,
      zIndex: 30,
      locked: false,
      text: "Consider consolidating primitive names.",
      color: C.surface,
    },
    {
      id: "starter-note-refine-section",
      kind: "note",
      x: 170,
      y: 1065,
      width: 172,
      height: 58,
      zIndex: 31,
      locked: false,
      text: "Refine hierarchy scale ramp",
      color: C.surface,
    },
    {
      id: "starter-note-export-desktop",
      kind: "note",
      x: 1120,
      y: 1010,
      width: 170,
      height: 58,
      zIndex: 32,
      locked: false,
      text: "Review spacing naming",
      color: C.surface,
    },
  ];
}

function createArrows(): ArrowItem[] {
  return [
    {
      id: "starter-arrow-refs-synthesis",
      kind: "arrow",
      x: 420,
      y: 560,
      width: 76,
      height: 24,
      zIndex: 33,
      locked: false,
      color: C.accent,
    },
    {
      id: "starter-arrow-synthesis-taste",
      kind: "arrow",
      x: 780,
      y: 493,
      width: 48,
      height: 24,
      zIndex: 34,
      locked: false,
      color: C.accent,
    },
    {
      id: "starter-arrow-taste-proof",
      kind: "arrow",
      x: 665,
      y: 590,
      width: 24,
      height: 56,
      zIndex: 35,
      locked: false,
      color: C.accent,
    },
    {
      id: "starter-arrow-proof-handoff",
      kind: "arrow",
      x: 760,
      y: 1090,
      width: 66,
      height: 24,
      zIndex: 36,
      locked: false,
      color: C.accent,
    },
  ];
}

const starterTasteProfile: TasteProfile = {
  summary: "Restrained enterprise SaaS with editorial type contrast, spacious modular sections, clean borders, and a single high-trust blue accent.",
  adjectives: ["restrained", "system-led", "editorial", "precise", "calm"],
  archetypeMatch: "premium-saas-product",
  archetypeConfidence: 0.91,
  secondaryArchetype: "editorial-system",
  layoutBias: {
    density: "balanced",
    rhythm: "progressive",
    heroStyle: "contained",
    sectionFlow: "stacked",
    gridBehavior: "strict",
    whitespaceIntent: "structural",
  },
  typographyTraits: {
    scale: "expanded",
    headingTone: "editorial",
    bodyTone: "neutral",
    contrast: "high",
    casePreference: "mixed",
    recommendedPairings: ["Bespoke Serif", "Geist Sans", "IBM Plex Mono"],
  },
  colorBehavior: {
    mode: "light",
    palette: "neutral-plus-accent",
    accentStrategy: "single-pop",
    saturation: "muted",
    temperature: "neutral",
    suggestedColors: {
      background: C.bg,
      surface: C.surface,
      text: C.primary,
      accent: C.accent,
      secondary: C.secondary,
    },
  },
  imageTreatment: {
    style: "product",
    sizing: "contained",
    treatment: "raw",
    cornerRadius: "subtle",
    borders: true,
    shadow: "none",
    aspectPreference: "mixed",
  },
  ctaTone: {
    style: "understated",
    shape: "subtle-radius",
    hierarchy: "balanced",
  },
  avoid: [
    "dashboard clutter",
    "rounded startup gimmicks",
    "decorative gradients",
    "heavy shadows",
    "generic card grids",
  ],
  confidence: 0.88,
  referenceCount: 4,
  dominantReferenceType: "ui-screenshot",
  warnings: [],
};

const starterDesignTokens: DesignSystemTokens = {
  colors: {
    primary: C.primary,
    secondary: C.secondary,
    accent: C.accent,
    background: C.bg,
    surface: C.surface,
    text: C.primary,
    textMuted: C.secondary,
    border: C.border,
  },
  typography: {
    fontFamily: FONT.sans,
    scale: {
      xs: "0.75rem",
      sm: "0.875rem",
      base: "1rem",
      lg: "1.125rem",
      xl: "1.25rem",
      "2xl": "1.5rem",
      "3xl": "2rem",
      "4xl": "3rem",
    },
    weights: { normal: 400, medium: 500, semibold: 650, bold: 700 },
    lineHeight: { tight: "1.05", normal: "1.45", relaxed: "1.65" },
  },
  spacing: {
    unit: 8,
    scale: {
      "0": "0",
      "1": "8px",
      "2": "16px",
      "3": "24px",
      "4": "32px",
      "6": "48px",
      "8": "64px",
      "12": "96px",
      "16": "128px",
    },
  },
  radii: { sm: "2px", md: "4px", lg: "6px", xl: "8px", full: "9999px" },
  shadows: {
    sm: "none",
    md: "none",
    lg: "none",
  },
  animation: {
    spring: {
      smooth: { stiffness: 300, damping: 32 },
      snappy: { stiffness: 420, damping: 28 },
      gentle: { stiffness: 220, damping: 24 },
      bouncy: { stiffness: 360, damping: 22 },
    },
  },
};

const starterAnalysis: ImageAnalysis = {
  quality: {
    scores: [
      { composition: 9, colorHarmony: 9, visualNoise: 9, designRelevance: 10, overall: 9.25, usedForExtraction: true },
      { composition: 8, colorHarmony: 8, visualNoise: 9, designRelevance: 9, overall: 8.5, usedForExtraction: true },
      { composition: 8, colorHarmony: 9, visualNoise: 9, designRelevance: 10, overall: 9, usedForExtraction: true },
      { composition: 8, colorHarmony: 8, visualNoise: 8, designRelevance: 9, overall: 8.25, usedForExtraction: true },
    ],
    dominantVibe: {
      label: "restrained enterprise SaaS",
      description: "Light neutral SaaS references with strict modular spacing, editorial display type, thin borders, and a single blue accent.",
      matchingImageIndices: [0, 1, 2, 3],
    },
    usableImageCount: 4,
  },
  colors: {
    dominant: [C.bg, C.surface, C.primary],
    accents: [C.accent, C.warm],
    neutrals: [C.muted, C.border, C.secondary],
    confidence: { dominant: 0.92, accents: 0.9, neutrals: 0.88 },
  },
  typography: {
    category: "mixed",
    weights: ["400", "500", "650"],
    hierarchy: "Large editorial display headings paired with neutral sans body and monospace data labels.",
    confidence: 0.86,
  },
  spacing: {
    density: "spacious",
    rhythm: "strict modular sections with generous internal gutters",
    confidence: 0.89,
  },
  vibe: {
    density: "minimal",
    tone: "serious",
    energy: "calm",
  },
  designDirection: "Premium SaaS system with editorial contrast and a restrained blue accent.",
  summary: "The reference set points to a system-led SaaS direction: quiet surfaces, crisp borders, and confident hierarchy. Use the blue accent sparingly and avoid decorative startup tropes or dense dashboard noise.",
};

export function createStarterCanvasProject(): {
  project: StoredProject;
  canvasState: UnifiedCanvasState;
} {
  const now = new Date().toISOString();
  const canvasState = createEmptyCanvas();

  canvasState.items = [
    createHeroFrame(),
    createProjectMetaFrame(),
    createPrincipleFrame(),
    ...createReferences(),
    createTasteSignalsFrame(),
    createTypeSystemFrame(),
    createLayoutTokensFrame(),
    createTasteAlignmentFrame(),
    createSynthesisFrame(),
    createComponentFrame(),
    createHandoffFrame(),
    createClosingFrame(),
    ...createArtboards(),
    createMobileProofFrame(),
    ...createNotes(),
    ...createArrows(),
  ];
  canvasState.viewport = { pan: { x: 148, y: 76 }, zoom: 0.48 };
  canvasState.activeBreakpoint = "desktop";
  canvasState.selection = {
    selectedItemIds: [DESKTOP_ARTBOARD_ID],
    activeItemId: DESKTOP_ARTBOARD_ID,
    selectedNodeId: SELECTED_SECTION_ID,
    selectedNodeIds: [SELECTED_SECTION_ID],
  };
  canvasState.prompt = {
    ...canvasState.prompt,
    value: "",
    siteType: STARTER_SITE_TYPE,
    isOpen: false,
    isGenerating: false,
    agentSteps: [],
    generationResult: null,
  };
  canvasState.updatedAt = now;

  const project: StoredProject = {
    id: STARTER_CANVAS_PROJECT_ID,
    name: "Starter Canvas",
    brief: "A guided Studio OS starter canvas showing the references-to-handoff workflow.",
    color: C.accent,
    createdAt: now,
  };

  return { project, canvasState };
}

export function persistStarterCanvas(): string {
  const { project, canvasState } = createStarterCanvasProject();

  saveProject(project);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      `studio-os:canvas-v3:${project.id}`,
      JSON.stringify(canvasState)
    );
    window.localStorage.setItem(STARTER_LAYOUT_LS_KEY, String(STARTER_CANVAS_LAYOUT_VERSION));
  }

  upsertProjectState(project.id, {
    canvas: {
      tasteProfile: starterTasteProfile,
      designTokens: starterDesignTokens,
      analysis: starterAnalysis,
      siteType: STARTER_SITE_TYPE,
      fidelityMode: "balanced",
    },
  });

  return project.id;
}

export function hydrateStarterCanvas(
  projectId: string,
  state: UnifiedCanvasState
): UnifiedCanvasState {
  if (projectId !== STARTER_CANVAS_PROJECT_ID || typeof window === "undefined") return state;

  const storedVersion = parseInt(
    window.localStorage.getItem(STARTER_LAYOUT_LS_KEY) ?? "0",
    10
  );
  const heroFrame = state.items.find((item) => item.id === "starter-frame-hero");
  const productRef = state.items.find((item) => item.id === "starter-ref-product-module");
  const hasCurrentMoodboardLayout =
    heroFrame?.x === 820 &&
    productRef?.kind === "reference" &&
    productRef.weight === "muted" &&
    productRef.x < 700;

  if (
    storedVersion >= STARTER_CANVAS_LAYOUT_VERSION &&
    state.items.length > 0 &&
    hasCurrentMoodboardLayout
  ) {
    return state;
  }

  const { canvasState } = createStarterCanvasProject();
  window.localStorage.setItem(STARTER_LAYOUT_LS_KEY, String(STARTER_CANVAS_LAYOUT_VERSION));
  return canvasState;
}
