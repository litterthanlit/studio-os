// lib/canvas/sample-project.ts
// Assembles a complete sample project from existing DesignNode templates.
// Used by the welcome overlay to give first-time users something real to explore.

import { createTemplateById } from "./design-component-library";
import type { DesignNode } from "./design-node";
import type { ArtboardItem, ReferenceItem, UnifiedCanvasState } from "./unified-canvas-state";
import { createEmptyCanvas } from "./unified-canvas-state";
import { saveProject, type StoredProject } from "@/lib/project-store";

// ── Constants ────────────────────────────────────────────────────────────────

export const SAMPLE_PROJECT_ID = "sample-project";
const SAMPLE_PROJECT_NAME = "Sample Project";

/** Bump when sample canvas layout changes; see `hydrateSampleProjectCanvas`. */
export const SAMPLE_CANVAS_LAYOUT_VERSION = 2;
const SAMPLE_LAYOUT_LS_KEY = "studio-os:sample-canvas-layout-version";

const ARTBOARD_X = 1200;
const ARTBOARD_Y = 100;
const DESKTOP_WIDTH = 1440;
const DESKTOP_HEIGHT = 1780;
const MOBILE_WIDTH = 375;
const MOBILE_HEIGHT = 1320;
const ARTBOARD_GAP = 200;
const ROW_GAP = 160;

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
  { bg: "#4B57DB", label: "Brand accent", title: "Accent Swatch" },
];

function createSampleReferences(): ReferenceItem[] {
  return SAMPLE_REFERENCES.map((ref, i) => ({
    id: uid("ref"),
    kind: "reference" as const,
    x: 100,
    y: 100 + i * 320,
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

function templatesToSectionNodes(templateIds: string[]): DesignNode[] {
  const nodes: DesignNode[] = [];
  for (const templateId of templateIds) {
    const component = createTemplateById(templateId);
    if (component) nodes.push(component.node);
  }
  return nodes;
}

function buildPageRoot(children: DesignNode[]): DesignNode {
  return {
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
    children,
  };
}

/**
 * Creates a sample project: references + 3 artboards (desktop full page, mobile stack,
 * desktop “spotlight” row) for editor UI testing.
 */
export function createSampleProject(): {
  project: StoredProject;
  canvasState: UnifiedCanvasState;
} {
  const fullPageSections = templatesToSectionNodes([
    "template-hero",
    "template-split",
    "template-features",
    "template-quote",
    "template-proof",
    "template-cta",
    "template-footer",
  ]);

  const mobileSections = templatesToSectionNodes([
    "template-hero",
    "template-features",
    "template-cta",
  ]);

  const spotlightSections = templatesToSectionNodes([
    "template-split",
    "template-quote",
    "template-proof",
    "template-cta",
  ]);

  const siteId = uid("site");

  const desktopMain: ArtboardItem = {
    id: uid("artboard"),
    kind: "artboard",
    x: ARTBOARD_X,
    y: ARTBOARD_Y,
    width: DESKTOP_WIDTH,
    height: DESKTOP_HEIGHT,
    zIndex: 0,
    locked: false,
    siteId,
    breakpoint: "desktop",
    name: `Desktop · Full page · ${DESKTOP_WIDTH}px`,
    pageTree: buildPageRoot(fullPageSections),
    compiledCode: null,
  };

  const mobileBoard: ArtboardItem = {
    id: uid("artboard"),
    kind: "artboard",
    x: ARTBOARD_X + DESKTOP_WIDTH + ARTBOARD_GAP,
    y: ARTBOARD_Y,
    width: MOBILE_WIDTH,
    height: MOBILE_HEIGHT,
    zIndex: 1,
    locked: false,
    siteId,
    breakpoint: "mobile",
    name: `Mobile · ${MOBILE_WIDTH}px`,
    pageTree: buildPageRoot(mobileSections),
    compiledCode: null,
  };

  const desktopSpotlight: ArtboardItem = {
    id: uid("artboard"),
    kind: "artboard",
    x: ARTBOARD_X,
    y: ARTBOARD_Y + DESKTOP_HEIGHT + ROW_GAP,
    width: DESKTOP_WIDTH,
    height: DESKTOP_HEIGHT,
    zIndex: 2,
    locked: false,
    siteId,
    breakpoint: "desktop",
    name: `Desktop · Spotlight · ${DESKTOP_WIDTH}px`,
    pageTree: buildPageRoot(spotlightSections),
    compiledCode: null,
  };

  const references = createSampleReferences();

  const canvasState = createEmptyCanvas();
  canvasState.items = [...references, desktopMain, mobileBoard, desktopSpotlight];
  canvasState.viewport = { pan: { x: 440, y: 108 }, zoom: 0.3 };
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
    window.localStorage.setItem(SAMPLE_LAYOUT_LS_KEY, String(SAMPLE_CANVAS_LAYOUT_VERSION));
  }

  return project.id;
}

/**
 * One-time upgrade for `sample-project`: older saves had a single desktop artboard.
 * If the stored layout version is behind, replace canvas with the current rich sample.
 * Users who already have 2+ artboards on this project are left unchanged and marked current.
 */
export function hydrateSampleProjectCanvas(
  projectId: string,
  state: UnifiedCanvasState
): UnifiedCanvasState {
  if (projectId !== SAMPLE_PROJECT_ID || typeof window === "undefined") return state;

  const storedVer = parseInt(window.localStorage.getItem(SAMPLE_LAYOUT_LS_KEY) ?? "0", 10);
  if (storedVer >= SAMPLE_CANVAS_LAYOUT_VERSION) return state;

  const artboardCount = state.items.filter((i) => i.kind === "artboard").length;
  if (artboardCount >= 2) {
    window.localStorage.setItem(SAMPLE_LAYOUT_LS_KEY, String(SAMPLE_CANVAS_LAYOUT_VERSION));
    return state;
  }

  const { canvasState } = createSampleProject();
  window.localStorage.setItem(SAMPLE_LAYOUT_LS_KEY, String(SAMPLE_CANVAS_LAYOUT_VERSION));
  return canvasState;
}
