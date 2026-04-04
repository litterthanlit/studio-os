// lib/canvas/sample-project.ts
// Assembles a complete sample project from existing DesignNode templates.
// Used by the welcome overlay to give first-time users something real to explore.

import { createTemplateById } from "./design-component-library";
import type { DesignNode } from "./design-node";
import type { ArtboardItem, ReferenceItem, UnifiedCanvasState } from "./unified-canvas-state";
import { createEmptyCanvas } from "./unified-canvas-state";
import { saveProject, type StoredProject } from "@/lib/project-store";

// ── Constants ────────────────────────────────────────────────────────────────

const SAMPLE_PROJECT_ID = "sample-project";
const SAMPLE_PROJECT_NAME = "Sample Project";

const ARTBOARD_X = 1200;
const ARTBOARD_Y = 100;
const DESKTOP_WIDTH = 1440;
const DESKTOP_HEIGHT = 1780;

// Template IDs to assemble, in order
const SECTION_TEMPLATE_IDS = [
  "template-hero",
  "template-split",
  "template-features",
  "template-quote",
  "template-cta",
  "template-footer",
];

// ── ID generation ────────────────────────────────────────────────────────────

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

// ── Placeholder references ──────────────────────────────────────────────────

/** Create a solid-color SVG data URL that looks like a design reference swatch. */
function colorReferenceSvg(bg: string, label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
    <rect width="400" height="300" fill="${bg}"/>
    <text x="200" y="158" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#fff" opacity="0.6">${label}</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const SAMPLE_REFERENCES: { bg: string; label: string; title: string }[] = [
  { bg: "#1A1A1A", label: "Dark editorial", title: "Dark Editorial Reference" },
  { bg: "#2C3E50", label: "Muted blue", title: "Muted Blue Reference" },
  { bg: "#8B4513", label: "Warm earth", title: "Warm Earth Reference" },
];

function createSampleReferences(): ReferenceItem[] {
  return SAMPLE_REFERENCES.map((ref, i) => ({
    id: uid("ref"),
    kind: "reference" as const,
    x: 100,
    y: 100 + i * 340,
    width: 300,
    height: 300,
    zIndex: 0,
    locked: false,
    imageUrl: colorReferenceSvg(ref.bg, ref.label),
    title: ref.title,
    source: "upload" as const,
    extracted: { colors: [ref.bg], fonts: [], tags: [ref.label] },
  }));
}

// ── Sample project assembly ──────────────────────────────────────────────────

/**
 * Creates a sample project with a desktop artboard containing 6 template sections.
 * Returns the project metadata and canvas state, both ready to persist.
 */
export function createSampleProject(): {
  project: StoredProject;
  canvasState: UnifiedCanvasState;
} {
  // Build section children from existing templates
  const sectionNodes: DesignNode[] = [];
  for (const templateId of SECTION_TEMPLATE_IDS) {
    const component = createTemplateById(templateId);
    if (component) {
      sectionNodes.push(component.node);
    }
  }

  // Root frame wrapping all sections (the artboard's page tree)
  const rootFrame: DesignNode = {
    id: uid("frame"),
    type: "frame",
    name: "Page",
    style: {
      width: "fill",
      height: "hug",
      display: "flex",
      flexDirection: "column",
      gap: 0,
      background: "#FFFFFF",
    },
    children: sectionNodes,
  };

  // Desktop artboard item
  const artboard: ArtboardItem = {
    id: uid("artboard"),
    kind: "artboard",
    x: ARTBOARD_X,
    y: ARTBOARD_Y,
    width: DESKTOP_WIDTH,
    height: DESKTOP_HEIGHT,
    zIndex: 0,
    locked: false,
    siteId: uid("site"),
    breakpoint: "desktop",
    name: `Desktop ${DESKTOP_WIDTH}`,
    pageTree: rootFrame,
    compiledCode: null,
  };

  // Reference items (positioned left of the artboard)
  const references = createSampleReferences();

  // Canvas state
  const canvasState = createEmptyCanvas();
  canvasState.items = [...references, artboard];
  canvasState.prompt.isOpen = false;
  canvasState.updatedAt = new Date().toISOString();

  // Project record
  const project: StoredProject = {
    id: SAMPLE_PROJECT_ID,
    name: SAMPLE_PROJECT_NAME,
    brief: "A sample project to explore the Studio OS editor.",
    color: "#4B57DB",
    createdAt: new Date().toISOString(),
  };

  return { project, canvasState };
}

/**
 * Persists the sample project to localStorage and returns its ID.
 * Safe to call multiple times — overwrites any existing sample project.
 */
export function persistSampleProject(): string {
  const { project, canvasState } = createSampleProject();

  // Save project to the project list
  saveProject(project);

  // Save canvas state under the V3 key
  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      `studio-os:canvas-v3:${project.id}`,
      JSON.stringify(canvasState)
    );
  }

  return project.id;
}
