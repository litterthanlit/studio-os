// lib/canvas/design-component-library.ts
// Pre-built DesignNode section templates + localStorage persistence for saved components.

import type { DesignNode } from "./design-node";

// ── Types ──────────────────────────────────────────────────────────────────

export type DesignComponent = {
  id: string;
  name: string;
  category: string;
  source: "template" | "saved";
  version: 1;
  projectId?: string;
  projectName?: string;
  createdAt: string;
  updatedAt: string;
  node: DesignNode;
};

// ── ID generation ──────────────────────────────────────────────────────────

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

// ── Template factories ─────────────────────────────────────────────────────

function createHero(): DesignComponent {
  const now = new Date().toISOString();
  return {
    id: "template-hero",
    name: "Hero",
    category: "Layout",
    source: "template",
    version: 1,
    createdAt: now,
    updatedAt: now,
    node: {
      id: uid("frame"),
      type: "frame",
      name: "Hero",
      style: {
        width: "fill",
        height: "hug",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        padding: { top: 120, right: 48, bottom: 120, left: 48 },
        background: "#FAFAF8",
      },
      children: [
        {
          id: uid("text"),
          type: "text",
          name: "Heading",
          style: { fontSize: 56, fontWeight: 700, textAlign: "center", lineHeight: 1.1 },
          content: { text: "Your Headline Here" },
        },
        {
          id: uid("text"),
          type: "text",
          name: "Subtext",
          style: { fontSize: 18, fontWeight: 400, textAlign: "center", foreground: "#6B6B6B", maxWidth: 560 },
          content: { text: "A concise description of what you offer and why it matters." },
        },
        {
          id: uid("button"),
          type: "button",
          name: "CTA",
          style: {
            background: "#1A1A1A",
            foreground: "#FFFFFF",
            padding: { top: 14, right: 32, bottom: 14, left: 32 },
            borderRadius: 4,
            fontSize: 15,
            fontWeight: 500,
          },
          content: { label: "Get Started" },
        },
      ],
    },
  };
}

function createSplitContent(): DesignComponent {
  const now = new Date().toISOString();
  return {
    id: "template-split",
    name: "Split Content",
    category: "Layout",
    source: "template",
    version: 1,
    createdAt: now,
    updatedAt: now,
    node: {
      id: uid("frame"),
      type: "frame",
      name: "Split Content",
      style: {
        width: "fill",
        height: "hug",
        display: "grid",
        gridTemplate: "1fr 1fr",
        gap: 48,
        padding: { top: 80, right: 48, bottom: 80, left: 48 },
        alignItems: "center",
      },
      children: [
        {
          id: uid("frame"),
          type: "frame",
          name: "Image Side",
          style: {
            display: "flex",
            width: "fill",
            height: 400,
            borderRadius: 8,
            background: "#F0F0EC",
            alignItems: "center",
            justifyContent: "center",
          },
          children: [
            {
              id: uid("text"),
              type: "text",
              name: "Placeholder",
              style: { fontSize: 14, foreground: "#A0A0A0" },
              content: { text: "Image" },
            },
          ],
        },
        {
          id: uid("frame"),
          type: "frame",
          name: "Text Side",
          style: { width: "fill", height: "hug", display: "flex", flexDirection: "column", gap: 20 },
          children: [
            {
              id: uid("text"),
              type: "text",
              name: "Heading",
              style: { fontSize: 36, fontWeight: 700, lineHeight: 1.15 },
              content: { text: "Section Heading" },
            },
            {
              id: uid("text"),
              type: "text",
              name: "Body",
              style: { fontSize: 16, foreground: "#6B6B6B", lineHeight: 1.6 },
              content: { text: "Describe the value proposition or feature in a few sentences. Keep it concise and focused." },
            },
            {
              id: uid("button"),
              type: "button",
              name: "CTA",
              style: {
                background: "#1A1A1A",
                foreground: "#FFFFFF",
                padding: { top: 12, right: 24, bottom: 12, left: 24 },
                borderRadius: 4,
                fontSize: 14,
                fontWeight: 500,
              },
              content: { label: "Learn More" },
            },
          ],
        },
      ],
    },
  };
}

function createFeaturesGrid(): DesignComponent {
  const now = new Date().toISOString();
  const makeCard = (title: string, desc: string) => ({
    id: uid("frame"),
    type: "frame" as const,
    name: title,
    style: {
      width: "fill" as const,
      height: "hug" as const,
      display: "flex" as const,
      flexDirection: "column" as const,
      gap: 12,
      padding: { top: 28, right: 24, bottom: 28, left: 24 },
      borderRadius: 8,
      background: "#F5F5F0",
    },
    children: [
      {
        id: uid("text"),
        type: "text" as const,
        name: "Title",
        style: { fontSize: 18, fontWeight: 600 },
        content: { text: title },
      },
      {
        id: uid("text"),
        type: "text" as const,
        name: "Description",
        style: { fontSize: 14, foreground: "#6B6B6B", lineHeight: 1.5 },
        content: { text: desc },
      },
    ],
  });

  return {
    id: "template-features",
    name: "Features Grid",
    category: "Content",
    source: "template",
    version: 1,
    createdAt: now,
    updatedAt: now,
    node: {
      id: uid("frame"),
      type: "frame",
      name: "Features",
      style: {
        width: "fill",
        height: "hug",
        display: "grid",
        gridTemplate: "repeat(3, 1fr)",
        gap: 24,
        padding: { top: 80, right: 48, bottom: 80, left: 48 },
      },
      children: [
        makeCard("Feature One", "Brief explanation of this feature and the value it provides."),
        makeCard("Feature Two", "Brief explanation of this feature and the value it provides."),
        makeCard("Feature Three", "Brief explanation of this feature and the value it provides."),
      ],
    },
  };
}

function createQuoteBlock(): DesignComponent {
  const now = new Date().toISOString();
  return {
    id: "template-quote",
    name: "Quote Block",
    category: "Content",
    source: "template",
    version: 1,
    createdAt: now,
    updatedAt: now,
    node: {
      id: uid("frame"),
      type: "frame",
      name: "Quote",
      style: {
        width: "fill",
        height: "hug",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 20,
        padding: { top: 96, right: 64, bottom: 96, left: 64 },
        background: "#F5F5F0",
      },
      children: [
        {
          id: uid("text"),
          type: "text",
          name: "Quote",
          style: { fontSize: 28, fontWeight: 400, fontStyle: "italic", textAlign: "center", lineHeight: 1.4, maxWidth: 640 },
          content: { text: "The best interfaces feel like they were designed just for you." },
        },
        {
          id: uid("text"),
          type: "text",
          name: "Attribution",
          style: { fontSize: 13, fontWeight: 500, textAlign: "center", foreground: "#6B6B6B", letterSpacing: 0.02 },
          content: { text: "— Author Name, Title" },
        },
      ],
    },
  };
}

function createProofRow(): DesignComponent {
  const now = new Date().toISOString();
  const makeLogo = (label: string) => ({
    id: uid("frame"),
    type: "frame" as const,
    name: label,
    style: {
      width: "hug" as const,
      height: "hug" as const,
      display: "flex" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      padding: { top: 12, right: 20, bottom: 12, left: 20 },
    },
    children: [
      {
        id: uid("text"),
        type: "text" as const,
        name: label,
        style: { fontSize: 13, fontWeight: 500, foreground: "#A0A0A0", letterSpacing: 0.03 },
        content: { text: label },
      },
    ],
  });

  return {
    id: "template-proof",
    name: "Proof Row",
    category: "Content",
    source: "template",
    version: 1,
    createdAt: now,
    updatedAt: now,
    node: {
      id: uid("frame"),
      type: "frame",
      name: "Proof",
      style: {
        width: "fill",
        height: "hug",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 32,
        padding: { top: 40, right: 48, bottom: 40, left: 48 },
      },
      children: [
        makeLogo("Partner One"),
        makeLogo("Partner Two"),
        makeLogo("Partner Three"),
        makeLogo("Partner Four"),
        makeLogo("Partner Five"),
      ],
    },
  };
}

function createCTABanner(): DesignComponent {
  const now = new Date().toISOString();
  return {
    id: "template-cta",
    name: "CTA Banner",
    category: "Action",
    source: "template",
    version: 1,
    createdAt: now,
    updatedAt: now,
    node: {
      id: uid("frame"),
      type: "frame",
      name: "CTA",
      style: {
        width: "fill",
        height: "hug",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 20,
        padding: { top: 80, right: 48, bottom: 80, left: 48 },
        background: "#1A1A1A",
      },
      children: [
        {
          id: uid("text"),
          type: "text",
          name: "Heading",
          style: { fontSize: 32, fontWeight: 700, textAlign: "center", foreground: "#FFFFFF" },
          content: { text: "Ready to get started?" },
        },
        {
          id: uid("button"),
          type: "button",
          name: "CTA",
          style: {
            background: "#FFFFFF",
            foreground: "#1A1A1A",
            padding: { top: 14, right: 32, bottom: 14, left: 32 },
            borderRadius: 4,
            fontSize: 15,
            fontWeight: 500,
          },
          content: { label: "Start Now" },
        },
      ],
    },
  };
}

function createFooter(): DesignComponent {
  const now = new Date().toISOString();
  return {
    id: "template-footer",
    name: "Footer",
    category: "Action",
    source: "template",
    version: 1,
    createdAt: now,
    updatedAt: now,
    node: {
      id: uid("frame"),
      type: "frame",
      name: "Footer",
      style: {
        width: "fill",
        height: "hug",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        padding: { top: 48, right: 48, bottom: 48, left: 48 },
      },
      children: [
        {
          id: uid("text"),
          type: "text",
          name: "Company",
          style: { fontSize: 13, fontWeight: 500, foreground: "#6B6B6B" },
          content: { text: "Company Name" },
        },
        {
          id: uid("text"),
          type: "text",
          name: "Copyright",
          style: { fontSize: 11, foreground: "#A0A0A0" },
          content: { text: "All rights reserved." },
        },
      ],
    },
  };
}

/** Geist/shadcn-like product primitives — shared with premium-saas prompt in design-tree-prompt.ts */
export const PRODUCT_PRIMITIVE_STYLE_TOKENS = {
  accent: "#4B57DB",
  accentHover: "#3D49C7",
  accentLight: "#D1E4FC",
  border: "#E5E5E0",
  borderSubtle: "#EFEFEC",
  text: "#1A1A1A",
  muted: "#6B6B6B",
  surface: "#FFFFFF",
  canvas: "#FAFAF8",
  destructive: "#EF4444",
  destructiveSurface: "#FEF2F2",
} as const;

const TOK = PRODUCT_PRIMITIVE_STYLE_TOKENS;

/** Primary filled button — accent bg, white label, radius 4px. */
function createPrimitiveButtonPrimary(): DesignComponent {
  const now = new Date().toISOString();
  return {
    id: "template-btn-primary",
    name: "Button — Primary",
    category: "Primitives",
    source: "template",
    version: 1,
    createdAt: now,
    updatedAt: now,
    node: {
      id: uid("frame"),
      type: "frame",
      name: "Button Primary",
      style: {
        width: "fill",
        height: "hug",
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        padding: { top: 16, right: 24, bottom: 16, left: 24 },
        background: TOK.canvas,
      },
      children: [
        {
          id: uid("button"),
          type: "button",
          name: "Primary",
          style: {
            width: "hug",
            height: "hug",
            background: TOK.accent,
            foreground: "#FFFFFF",
            padding: { top: 10, right: 20, bottom: 10, left: 20 },
            borderRadius: 4,
            fontSize: 14,
            fontWeight: 600,
            borderWidth: 0,
          },
          content: { text: "Primary" },
        },
      ],
    },
  };
}

function createPrimitiveButtonOutline(): DesignComponent {
  const now = new Date().toISOString();
  return {
    id: "template-btn-outline",
    name: "Button — Outline",
    category: "Primitives",
    source: "template",
    version: 1,
    createdAt: now,
    updatedAt: now,
    node: {
      id: uid("frame"),
      type: "frame",
      name: "Button Outline",
      style: {
        width: "fill",
        height: "hug",
        display: "flex",
        padding: { top: 16, right: 24, bottom: 16, left: 24 },
        background: TOK.canvas,
      },
      children: [
        {
          id: uid("button"),
          type: "button",
          name: "Outline",
          style: {
            width: "hug",
            height: "hug",
            background: "transparent",
            foreground: TOK.accent,
            borderColor: TOK.accent,
            borderWidth: 1,
            borderRadius: 4,
            padding: { top: 10, right: 20, bottom: 10, left: 20 },
            fontSize: 14,
            fontWeight: 600,
          },
          content: { text: "Outline" },
        },
      ],
    },
  };
}

function createPrimitiveButtonGhost(): DesignComponent {
  const now = new Date().toISOString();
  return {
    id: "template-btn-ghost",
    name: "Button — Ghost",
    category: "Primitives",
    source: "template",
    version: 1,
    createdAt: now,
    updatedAt: now,
    node: {
      id: uid("frame"),
      type: "frame",
      name: "Button Ghost",
      style: {
        width: "fill",
        height: "hug",
        display: "flex",
        padding: { top: 16, right: 24, bottom: 16, left: 24 },
        background: TOK.canvas,
      },
      children: [
        {
          id: uid("button"),
          type: "button",
          name: "Ghost",
          style: {
            width: "hug",
            height: "hug",
            background: "transparent",
            foreground: TOK.muted,
            borderWidth: 0,
            borderRadius: 4,
            padding: { top: 10, right: 12, bottom: 10, left: 12 },
            fontSize: 14,
            fontWeight: 500,
          },
          content: { text: "Ghost" },
        },
      ],
    },
  };
}

function createPrimitiveButtonDestructive(): DesignComponent {
  const now = new Date().toISOString();
  return {
    id: "template-btn-destructive",
    name: "Button — Destructive",
    category: "Primitives",
    source: "template",
    version: 1,
    createdAt: now,
    updatedAt: now,
    node: {
      id: uid("frame"),
      type: "frame",
      name: "Button Destructive",
      style: {
        width: "fill",
        height: "hug",
        display: "flex",
        padding: { top: 16, right: 24, bottom: 16, left: 24 },
        background: TOK.canvas,
      },
      children: [
        {
          id: uid("button"),
          type: "button",
          name: "Destructive",
          style: {
            width: "hug",
            height: "hug",
            background: TOK.destructiveSurface,
            foreground: TOK.destructive,
            borderColor: TOK.destructive,
            borderWidth: 1,
            borderRadius: 4,
            padding: { top: 10, right: 20, bottom: 10, left: 20 },
            fontSize: 14,
            fontWeight: 600,
          },
          content: { text: "Remove" },
        },
      ],
    },
  };
}

function createPrimitiveBadge(): DesignComponent {
  const now = new Date().toISOString();
  return {
    id: "template-badge",
    name: "Badge",
    category: "Primitives",
    source: "template",
    version: 1,
    createdAt: now,
    updatedAt: now,
    node: {
      id: uid("frame"),
      type: "frame",
      name: "Badge",
      style: {
        width: "fill",
        height: "hug",
        display: "flex",
        padding: { top: 16, right: 24, bottom: 16, left: 24 },
        background: TOK.canvas,
      },
      children: [
        {
          id: uid("frame"),
          type: "frame",
          name: "Badge Pill",
          style: {
            width: "hug",
            height: "hug",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: { top: 4, right: 10, bottom: 4, left: 10 },
            background: TOK.accentLight,
            borderRadius: 999,
          },
          children: [
            {
              id: uid("text"),
              type: "text",
              name: "Label",
              style: { fontSize: 12, fontWeight: 600, foreground: TOK.accent },
              content: { text: "Badge" },
            },
          ],
        },
      ],
    },
  };
}

function createPrimitiveCard(): DesignComponent {
  const now = new Date().toISOString();
  return {
    id: "template-card",
    name: "Card",
    category: "Primitives",
    source: "template",
    version: 1,
    createdAt: now,
    updatedAt: now,
    node: {
      id: uid("frame"),
      type: "frame",
      name: "Card",
      style: {
        width: "fill",
        height: "hug",
        display: "flex",
        padding: { top: 16, right: 24, bottom: 24, left: 24 },
        background: TOK.canvas,
      },
      children: [
        {
          id: uid("frame"),
          type: "frame",
          name: "Card Surface",
          style: {
            width: "fill",
            height: "hug",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            padding: { top: 20, right: 20, bottom: 20, left: 20 },
            background: TOK.surface,
            borderColor: TOK.border,
            borderWidth: 1,
            borderRadius: 6,
          },
          children: [
            {
              id: uid("text"),
              type: "text",
              name: "Title",
              style: { fontSize: 15, fontWeight: 600, foreground: TOK.text },
              content: { text: "Card title" },
            },
            {
              id: uid("text"),
              type: "text",
              name: "Body",
              style: { fontSize: 14, fontWeight: 400, foreground: TOK.muted, lineHeight: 1.5 },
              content: { text: "Supporting description for this card. Keep it to one or two lines." },
            },
          ],
        },
      ],
    },
  };
}

function createPrimitiveInputRow(): DesignComponent {
  const now = new Date().toISOString();
  return {
    id: "template-input-row",
    name: "Input row",
    category: "Primitives",
    source: "template",
    version: 1,
    createdAt: now,
    updatedAt: now,
    node: {
      id: uid("frame"),
      type: "frame",
      name: "Input Row",
      style: {
        width: "fill",
        height: "hug",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: { top: 16, right: 24, bottom: 16, left: 24 },
        background: TOK.canvas,
      },
      children: [
        {
          id: uid("text"),
          type: "text",
          name: "Label",
          style: { fontSize: 12, fontWeight: 500, foreground: TOK.muted, letterSpacing: 0.02 },
          content: { text: "Email" },
        },
        {
          id: uid("frame"),
          type: "frame",
          name: "Field",
          style: {
            width: "fill",
            height: 40,
            display: "flex",
            alignItems: "center",
            padding: { top: 0, right: 12, bottom: 0, left: 12 },
            background: TOK.surface,
            borderColor: TOK.border,
            borderWidth: 1,
            borderRadius: 2,
          },
          children: [
            {
              id: uid("text"),
              type: "text",
              name: "Placeholder",
              style: { fontSize: 14, foreground: "#A0A0A0" },
              content: { text: "you@company.com" },
            },
          ],
        },
      ],
    },
  };
}

function createPrimitiveSeparator(): DesignComponent {
  const now = new Date().toISOString();
  return {
    id: "template-separator",
    name: "Separator",
    category: "Primitives",
    source: "template",
    version: 1,
    createdAt: now,
    updatedAt: now,
    node: {
      id: uid("frame"),
      type: "frame",
      name: "Separator",
      style: {
        width: "fill",
        height: "hug",
        display: "flex",
        flexDirection: "column",
        padding: { top: 16, right: 24, bottom: 16, left: 24 },
        background: TOK.canvas,
      },
      children: [
        {
          id: uid("divider"),
          type: "divider",
          name: "Rule",
          style: {
            width: "fill",
            height: 1,
            borderWidth: 1,
            borderColor: TOK.border,
          },
        },
      ],
    },
  };
}

// ── Public template list ───────────────────────────────────────────────────

export const DESIGN_TEMPLATES: Array<() => DesignComponent> = [
  createHero,
  createSplitContent,
  createFeaturesGrid,
  createQuoteBlock,
  createProofRow,
  createCTABanner,
  createFooter,
  createPrimitiveButtonPrimary,
  createPrimitiveButtonOutline,
  createPrimitiveButtonGhost,
  createPrimitiveButtonDestructive,
  createPrimitiveBadge,
  createPrimitiveCard,
  createPrimitiveInputRow,
  createPrimitiveSeparator,
];

const TEMPLATE_FACTORIES: Record<string, () => DesignComponent> = {
  "template-hero": createHero,
  "template-split": createSplitContent,
  "template-features": createFeaturesGrid,
  "template-quote": createQuoteBlock,
  "template-proof": createProofRow,
  "template-cta": createCTABanner,
  "template-footer": createFooter,
  "template-btn-primary": createPrimitiveButtonPrimary,
  "template-btn-outline": createPrimitiveButtonOutline,
  "template-btn-ghost": createPrimitiveButtonGhost,
  "template-btn-destructive": createPrimitiveButtonDestructive,
  "template-badge": createPrimitiveBadge,
  "template-card": createPrimitiveCard,
  "template-input-row": createPrimitiveInputRow,
  "template-separator": createPrimitiveSeparator,
};

/** Get template metadata without generating full nodes (for listing). */
export function getTemplateList(): Array<{ id: string; name: string; category: string }> {
  return [
    { id: "template-hero", name: "Hero", category: "Layout" },
    { id: "template-split", name: "Split Content", category: "Layout" },
    { id: "template-features", name: "Features Grid", category: "Content" },
    { id: "template-quote", name: "Quote Block", category: "Content" },
    { id: "template-proof", name: "Proof Row", category: "Content" },
    { id: "template-cta", name: "CTA Banner", category: "Action" },
    { id: "template-footer", name: "Footer", category: "Action" },
    { id: "template-btn-primary", name: "Button — Primary", category: "Primitives" },
    { id: "template-btn-outline", name: "Button — Outline", category: "Primitives" },
    { id: "template-btn-ghost", name: "Button — Ghost", category: "Primitives" },
    { id: "template-btn-destructive", name: "Button — Destructive", category: "Primitives" },
    { id: "template-badge", name: "Badge", category: "Primitives" },
    { id: "template-card", name: "Card", category: "Primitives" },
    { id: "template-input-row", name: "Input row", category: "Primitives" },
    { id: "template-separator", name: "Separator", category: "Primitives" },
  ];
}

/** Create a fresh DesignComponent from a template by ID. Fresh node IDs on every call. */
export function createTemplateById(templateId: string): DesignComponent | null {
  const factory = TEMPLATE_FACTORIES[templateId];
  return factory ? factory() : null;
}

// ── Saved component persistence ────────────────────────────────────────────

const STORAGE_KEY = "studio-os:component-library";

export function loadSavedComponents(): DesignComponent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DesignComponent[];
    // Filter to known versions only — skip unrecognized entries
    return parsed.filter((c) => {
      if (c.version !== 1) {
        console.warn(`[component-library] Skipping saved component "${c.name}" with unknown version ${c.version}`);
        return false;
      }
      return true;
    });
  } catch {
    return [];
  }
}

/**
 * @deprecated Use the `CREATE_MASTER` canvas action instead of writing to localStorage.
 * This function is kept for backward compatibility only and will be removed in a future release.
 */
export function saveComponent(entry: DesignComponent): void {
  const existing = loadSavedComponents();
  existing.push(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

export function deleteSavedComponent(id: string): void {
  const existing = loadSavedComponents();
  const filtered = existing.filter((c) => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}
