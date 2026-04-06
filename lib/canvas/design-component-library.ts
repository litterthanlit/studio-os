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

// ── Public template list ───────────────────────────────────────────────────

export const DESIGN_TEMPLATES: Array<() => DesignComponent> = [
  createHero,
  createSplitContent,
  createFeaturesGrid,
  createQuoteBlock,
  createProofRow,
  createCTABanner,
  createFooter,
];

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
  ];
}

/** Create a fresh DesignComponent from a template by ID. Fresh node IDs on every call. */
export function createTemplateById(templateId: string): DesignComponent | null {
  const factories: Record<string, () => DesignComponent> = {
    "template-hero": createHero,
    "template-split": createSplitContent,
    "template-features": createFeaturesGrid,
    "template-quote": createQuoteBlock,
    "template-proof": createProofRow,
    "template-cta": createCTABanner,
    "template-footer": createFooter,
  };
  const factory = factories[templateId];
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
