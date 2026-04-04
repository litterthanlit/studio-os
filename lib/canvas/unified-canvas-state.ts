/**
 * V3 Unified Canvas State — canonical data model for the unified canvas.
 *
 * All canvas items (references, artboards, notes, arrows) live in a single
 * flat `items` array. This replaces the separate `references`, `generatedVariants`,
 * `composeDocument`, and `canvasSession` legacy stores.
 */

import type { PageNode } from "./compose";
import type { DesignNode } from "./design-node";
import type { SiteType } from "./templates";
import {
  listProjectReferences,
  setProjectReferences,
  getProjectState,
  type StoredReference,
  type ProjectCanvasState,
} from "@/lib/project-store";
import type { ComposeDocument, ComposeOverlay, GeneratedVariant } from "./compose";
import { BREAKPOINT_WIDTHS } from "./compose";
import { runAutoToHugMigration } from "./design-node-migration";

// ─── Core Types ──────────────────────────────────────────────────────────────

export type Breakpoint = "desktop" | "mobile";

export type AIPreviewSession = {
  active: boolean;
  beforeItems: CanvasItem[];
  beforeSelection: UnifiedCanvasState["selection"];
  prompt: string;
  targetNodeId: string;
  timestamp: number;
};

export type UnifiedCanvasState = {
  schemaVersion: 3;
  viewport: { pan: { x: number; y: number }; zoom: number };
  items: CanvasItem[];
  selection: {
    selectedItemIds: string[];
    activeArtboardId: string | null;
    selectedNodeId: string | null;
    selectedNodeIds: string[];
  };
  prompt: {
    value: string;
    siteType: SiteType;
    isOpen: boolean;
    history: PromptRun[];
    splitRatio?: number;
    isGenerating: boolean;
    agentSteps: string[];
  };
  aiPreview: AIPreviewSession | null;
  exportArtifact: ExportArtifact | null;
  updatedAt: string;
};

export type BaseCanvasItem = {
  id: string;
  kind: "reference" | "artboard" | "note" | "arrow";
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  locked: boolean;
};

export type ReferenceItem = BaseCanvasItem & {
  kind: "reference";
  imageUrl: string;
  title?: string;
  source?: "upload" | "arena" | "pinterest" | "url";
  sourceUrl?: string;
  annotation?: string;
  extracted?: { colors: string[]; fonts: string[]; tags: string[] };
  isStyleRef?: boolean;
};

export type ArtboardItem = BaseCanvasItem & {
  kind: "artboard";
  siteId: string;
  breakpoint: Breakpoint;
  name: string;
  pageTree: PageNode | DesignNode;
  compiledCode?: string | null;
};

export type NoteItem = BaseCanvasItem & {
  kind: "note";
  text: string;
  color: string;
};

export type ArrowItem = BaseCanvasItem & {
  kind: "arrow";
  color: string;
};

export type CanvasItem = ReferenceItem | ArtboardItem | NoteItem | ArrowItem;

export type PromptRun = {
  id: string;
  createdAt: string;
  prompt: string;
  siteType: SiteType;
  referenceItemIds: string[];
  siteId: string;
  label: string;
  artboards?: PromptRunArtboard[];
};

export type PromptRunArtboard = Pick<
  ArtboardItem,
  "breakpoint" | "name" | "pageTree" | "compiledCode"
>;

export type ExportArtifact = {
  siteId: string;
  artboardId: string;
  name: string;
  code: string;
  updatedAt: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

const REFERENCE_CARD_WIDTH = 200;
const REFERENCE_CARD_HEIGHT = 200;
const REFERENCE_GRID_COLUMNS = 3;
const REFERENCE_GRID_GAP = 20;
const REFERENCE_START_X = 100;
const REFERENCE_START_Y = 100;

const ARTBOARD_START_X = 1200;
const ARTBOARD_START_Y = 100;
const ARTBOARD_GAP = 80;

/**
 * Calculate the artboard start X dynamically based on the rightmost edge
 * of all reference items on the canvas. This prevents artboards from
 * overlapping references when many or large references are present.
 */
export function getArtboardStartX(items: CanvasItem[]): number {
  const MIN_START_X = 1200; // minimum, even with no references
  const BUFFER = 120; // gap between reference cluster and first artboard

  let maxRefRight = 0;
  for (const item of items) {
    if (item.kind === "reference") {
      const right = item.x + (item.width || 200);
      if (right > maxRefRight) maxRefRight = right;
    }
  }

  return Math.max(MIN_START_X, maxRefRight + BUFFER);
}

function artboardHeight(breakpoint: Breakpoint): number {
  if (breakpoint === "mobile") return 1320;
  return 1780;
}

// ─── Empty Canvas Factory ────────────────────────────────────────────────────

export function createEmptyCanvas(): UnifiedCanvasState {
  return {
    schemaVersion: 3,
    viewport: { pan: { x: 0, y: 0 }, zoom: 0.5 },
    items: [],
    selection: { selectedItemIds: [], activeArtboardId: null, selectedNodeId: null, selectedNodeIds: [] },
    prompt: {
      value: "",
      siteType: "auto",
      history: [],
      isOpen: true,
      isGenerating: false,
      agentSteps: [],
    },
    aiPreview: null,
    exportArtifact: null,
    updatedAt: new Date().toISOString(),
  };
}

// ─── Migration: Legacy → V3 ─────────────────────────────────────────────────

/**
 * Converts a StoredReference into a ReferenceItem at a grid position.
 */
function storedRefToCanvasItem(
  ref: StoredReference,
  index: number,
  zIndexBase: number
): ReferenceItem {
  const col = index % REFERENCE_GRID_COLUMNS;
  const row = Math.floor(index / REFERENCE_GRID_COLUMNS);
  return {
    id: ref.id || uid("ref"),
    kind: "reference",
    x: REFERENCE_START_X + col * (REFERENCE_CARD_WIDTH + REFERENCE_GRID_GAP),
    y: REFERENCE_START_Y + row * (REFERENCE_CARD_HEIGHT + REFERENCE_GRID_GAP),
    width: REFERENCE_CARD_WIDTH,
    height: REFERENCE_CARD_HEIGHT,
    zIndex: zIndexBase + index,
    locked: false,
    imageUrl: ref.imageUrl,
    title: ref.title,
    source: ref.source,
    sourceUrl: ref.sourceUrl,
  };
}

/**
 * Compute artboard x-positions for V3 layout based on a given start X.
 * desktop at startX, mobile at startX+1440+80
 */
function computeArtboardX(startX: number): Record<Breakpoint, number> {
  return {
    desktop: startX,
    mobile: startX + BREAKPOINT_WIDTHS.desktop + ARTBOARD_GAP,
  };
}

/**
 * Fixed artboard x-positions for V3 layout (used during migration when no
 * dynamic reference context is available).
 */
const V3_ARTBOARD_X: Record<Breakpoint, number> = computeArtboardX(ARTBOARD_START_X);

/**
 * Converts ComposeDocument artboards to ArtboardItems at V3 positions.
 * Positions are computed dynamically to avoid overlapping reference items.
 */
function composeArtboardsToItems(
  doc: ComposeDocument,
  zIndexBase: number,
  existingItems: CanvasItem[] = []
): ArtboardItem[] {
  const startX = getArtboardStartX(existingItems);
  const artboardPositions = computeArtboardX(startX);
  const siteId = uid("site");
  // Filter out legacy tablet artboards (saved data may contain breakpoints no longer in the type)
  const filteredArtboards = doc.artboards.filter((a) => (a.breakpoint as string) !== "tablet");
  return filteredArtboards.map((artboard, i) => {
    const bp = (artboard.breakpoint === "mobile" ? "mobile" : "desktop") as Breakpoint;
    return {
      id: artboard.id || uid("artboard"),
      kind: "artboard" as const,
      x: artboardPositions[bp],
      y: ARTBOARD_START_Y,
      width: BREAKPOINT_WIDTHS[bp],
      height: artboardHeight(bp),
      zIndex: zIndexBase + i,
      locked: false,
      siteId,
      breakpoint: bp,
      name: artboard.name || `${bp.charAt(0).toUpperCase() + bp.slice(1)} ${BREAKPOINT_WIDTHS[bp]}`,
      pageTree: artboard.pageTree,
      compiledCode: artboard.compiledCode ?? null,
    };
  });
}

/**
 * Converts ComposeDocument overlays to NoteItem / ArrowItem / ReferenceItem.
 */
function overlaysToItems(
  overlays: ComposeOverlay[],
  zIndexBase: number
): CanvasItem[] {
  return overlays.map((overlay, i): CanvasItem => {
    const base = {
      x: overlay.x,
      y: overlay.y,
      width: overlay.width,
      height: overlay.height,
      zIndex: zIndexBase + i,
      locked: false,
    };

    switch (overlay.type) {
      case "note":
        return {
          ...base,
          id: overlay.id || uid("note"),
          kind: "note",
          text: overlay.text,
          color: overlay.color || "#FEF3C7",
        };
      case "arrow":
        return {
          ...base,
          id: overlay.id || uid("arrow"),
          kind: "arrow",
          color: overlay.color || "#A0A0A0",
        };
      case "reference":
        return {
          ...base,
          id: overlay.id || uid("ref"),
          kind: "reference",
          imageUrl: overlay.imageUrl,
          title: overlay.label,
        };
    }
  });
}

/**
 * Creates two artboard items from a single GeneratedVariant.
 * Positions are computed dynamically to avoid overlapping reference items.
 */
function variantToArtboards(
  variant: GeneratedVariant,
  zIndexBase: number,
  existingItems: CanvasItem[] = []
): ArtboardItem[] {
  const startX = getArtboardStartX(existingItems);
  const artboardPositions = computeArtboardX(startX);
  const siteId = uid("site");
  const layouts: Array<{ breakpoint: Breakpoint; label: string }> = [
    { breakpoint: "desktop", label: "Desktop" },
    { breakpoint: "mobile", label: "Mobile" },
  ];

  return layouts.map(({ breakpoint, label }, i) => ({
    id: uid("artboard"),
    kind: "artboard" as const,
    x: artboardPositions[breakpoint],
    y: ARTBOARD_START_Y,
    width: BREAKPOINT_WIDTHS[breakpoint],
    height: artboardHeight(breakpoint),
    zIndex: zIndexBase + i,
    locked: false,
    siteId,
    breakpoint,
    name: `${label} ${BREAKPOINT_WIDTHS[breakpoint]}`,
    pageTree: structuredClone(variant.pageTree),
    compiledCode: variant.compiledCode ?? null,
  }));
}

/**
 * Read the legacy canvas session from localStorage.
 */
function readLegacyCanvasSession(projectId: string): Record<string, unknown> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`studio-os:canvas-session:${projectId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Read the legacy compose workspace from localStorage.
 */
function readLegacyComposeWorkspace(projectId: string): ComposeDocument | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`studio-os:compose-workspace:${projectId}`);
    if (!raw) return null;
    return JSON.parse(raw) as ComposeDocument;
  } catch {
    return null;
  }
}

/**
 * Pure migration function. Converts all existing persisted state into
 * UnifiedCanvasState without breaking existing projects.
 *
 * Migration order (from codex-v3-architecture.md):
 * 1. If projectState.unifiedCanvas exists and schemaVersion === 3 → use it
 * 2. Read legacy references → ReferenceItems clustered on the left
 * 3. Read legacy composeDocument.artboards → ArtboardItems on the right
 * 4. Read legacy composeDocument.overlays → Note/Arrow/Reference items
 * 5. If no compose doc but a generated/selected variant → normalize to artboards
 * 6. Set defaults
 *
 * Each step is wrapped in try/catch for error tolerance.
 */
export function migrateToV3(projectId: string): UnifiedCanvasState {
  const state = createEmptyCanvas();
  let zIndex = 0;

  // Step 1: Check for existing V3 state in localStorage
  try {
    const raw = typeof window !== "undefined"
      ? window.localStorage.getItem(`studio-os:canvas-v3:${projectId}`)
      : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.schemaVersion === 3 && Array.isArray(parsed.items)) {
        return parsed as UnifiedCanvasState;
      }
    }
  } catch {
    // Malformed V3 data — fall through to legacy migration
  }

  const projectState = getProjectState(projectId);
  const canvas: ProjectCanvasState = projectState.canvas || {};
  const legacySession = readLegacyCanvasSession(projectId);
  const legacyComposeWorkspace = readLegacyComposeWorkspace(projectId);

  // Step 2: Migrate project references → ReferenceItems on the left
  try {
    const refs = listProjectReferences(projectId);
    if (refs.length > 0) {
      const refItems = refs.map((ref, i) => storedRefToCanvasItem(ref, i, zIndex));
      state.items.push(...refItems);
      zIndex += refs.length;
    }
  } catch {
    // Drop references subsection on error
  }

  // Resolve compose document from multiple sources
  const composeDoc: ComposeDocument | null =
    (canvas.composeDocument as ComposeDocument | null | undefined) ??
    (legacySession?.composeDocument as ComposeDocument | null | undefined) ??
    legacyComposeWorkspace ??
    null;

  // Step 3: Migrate composeDocument.artboards → ArtboardItems on the right
  let hasArtboards = false;
  try {
    if (composeDoc && Array.isArray(composeDoc.artboards) && composeDoc.artboards.length > 0) {
      const artboardItems = composeArtboardsToItems(composeDoc, zIndex, state.items);
      state.items.push(...artboardItems);
      zIndex += artboardItems.length;
      hasArtboards = true;
    }
  } catch {
    // Drop artboards subsection on error
  }

  // Step 4: Migrate composeDocument.overlays → Note/Arrow/Reference items
  try {
    if (composeDoc && Array.isArray(composeDoc.overlays) && composeDoc.overlays.length > 0) {
      const overlayItems = overlaysToItems(composeDoc.overlays, zIndex);
      state.items.push(...overlayItems);
      zIndex += overlayItems.length;
    }
  } catch {
    // Drop overlays subsection on error
  }

  // Step 5: If no compose doc artboards but a generated/selected variant exists → build artboards
  try {
    if (!hasArtboards) {
      const variants: GeneratedVariant[] =
        (canvas.generatedVariants as GeneratedVariant[] | undefined) ??
        (legacySession?.variants as GeneratedVariant[] | undefined) ??
        [];
      const selectedId =
        (canvas.selectedVariantId as string | null | undefined) ??
        (legacySession?.selectedVariantId as string | null | undefined) ??
        null;

      const targetVariant = selectedId
        ? (variants.find((v) => v.id === selectedId) ?? variants[0])
        : variants[0];

      if (targetVariant && targetVariant.pageTree) {
        const artboardItems = variantToArtboards(targetVariant, zIndex, state.items);
        state.items.push(...artboardItems);
        zIndex += artboardItems.length;
      }
    }
  } catch {
    // Drop variant normalization on error
  }

  // Step 6: Migrate viewport from compose document or legacy session
  try {
    if (composeDoc) {
      state.viewport = {
        pan: composeDoc.pan || { x: 0, y: 0 },
        zoom: composeDoc.zoom || 0.5,
      };
    } else {
      state.viewport = { pan: { x: 0, y: 0 }, zoom: 0.5 };
    }
  } catch {
    state.viewport = { pan: { x: 0, y: 0 }, zoom: 0.5 };
  }

  // Migrate prompt state
  try {
    state.prompt.value =
      (canvas.componentPrompt as string | undefined) ??
      (legacySession?.componentPrompt as string | undefined) ??
      "";
    state.prompt.siteType =
      (canvas.siteType as SiteType | undefined) ??
      (legacySession?.siteType as SiteType | undefined) ??
      "auto";
  } catch {
    // Keep defaults
  }

  // Migrate export artifact
  try {
    const legacyExport = composeDoc?.exportArtifact;
    if (legacyExport && legacyExport.code && legacyExport.name) {
      const artboard = state.items.find((item): item is ArtboardItem => item.kind === "artboard");
      state.exportArtifact = {
        siteId: artboard?.siteId ?? "",
        artboardId: artboard?.id ?? "",
        name: legacyExport.name,
        code: legacyExport.code,
        updatedAt: legacyExport.updatedAt || new Date().toISOString(),
      };
    }
  } catch {
    // Keep null
  }

  // FIX: Only auto-open prompt panel on truly empty canvases.
  // createEmptyCanvas() defaults isOpen=true, but migrated projects with items
  // should not auto-open the prompt panel.
  if (state.items.length > 0) {
    state.prompt.isOpen = false;
  }

  state.updatedAt = new Date().toISOString();
  return state;
}

// ─── Persistence ─────────────────────────────────────────────────────────────

const CANVAS_V3_PREFIX = "studio-os:canvas-v3:";

/**
 * Persist unified canvas state to localStorage.
 *
 * Rules (from codex-v3-architecture.md):
 * - Strip compiledCode from artboard items (regenerated on demand)
 * - Save exportArtifact.code only if already present
 * - Sync reference items back to legacy reference list for project cards/counts
 */
export function saveUnifiedCanvas(projectId: string, state: UnifiedCanvasState): void {
  if (typeof window === "undefined") return;

  // Strip compiledCode from artboards before saving
  const strippedItems = state.items.map((item) => {
    if (item.kind === "artboard" && item.compiledCode) {
      return { ...item, compiledCode: null };
    }
    return item;
  });

  const toSave: UnifiedCanvasState = {
    ...state,
    items: strippedItems,
    // Never persist an in-flight generation session. Reloads should reopen in
    // a stable idle state, not with stale spinners or agent logs.
    prompt: {
      ...state.prompt,
      isGenerating: false,
      agentSteps: [],
    },
    // AI preview is transient session state — never persist
    aiPreview: null,
  };

  try {
    window.localStorage.setItem(
      `${CANVAS_V3_PREFIX}${projectId}`,
      JSON.stringify(toSave)
    );
  } catch {
    // Quota exceeded — try without export artifact code
    try {
      const fallback = {
        ...toSave,
        exportArtifact: toSave.exportArtifact
          ? { ...toSave.exportArtifact, code: "" }
          : null,
      };
      window.localStorage.setItem(
        `${CANVAS_V3_PREFIX}${projectId}`,
        JSON.stringify(fallback)
      );
    } catch {
      // Nothing more we can do
    }
  }

  // Sync reference items back to legacy storage so project cards/counts still work
  try {
    const referenceItems = state.items.filter(
      (item): item is ReferenceItem => item.kind === "reference"
    );
    const storedRefs: StoredReference[] = referenceItems.map((item) => ({
      id: item.id,
      imageUrl: item.imageUrl,
      source: item.source || "url",
      sourceUrl: item.sourceUrl,
      title: item.title,
      addedAt: new Date().toISOString(),
      projectId,
    }));
    setProjectReferences(projectId, storedRefs);
  } catch {
    // Non-critical — legacy sync failure shouldn't block save
  }
}

/**
 * Load unified canvas state from localStorage.
 * Falls back to migrateToV3() if no V3 data exists or it's malformed.
 */
export function loadUnifiedCanvas(projectId: string): UnifiedCanvasState {
  runAutoToHugMigration();
  if (typeof window === "undefined") return createEmptyCanvas();

  try {
    const raw = window.localStorage.getItem(`${CANVAS_V3_PREFIX}${projectId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.schemaVersion === 3 && Array.isArray(parsed.items)) {
        const loadedState = parsed as UnifiedCanvasState;
        return {
          ...loadedState,
          selection: {
            ...loadedState.selection,
            selectedNodeIds: loadedState.selection.selectedNodeIds ?? [],
          },
          prompt: {
            ...createEmptyCanvas().prompt,
            ...loadedState.prompt,
            isGenerating: false,
            agentSteps: [],
          },
          aiPreview: null,
        };
      }
    }
  } catch {
    // Malformed data — fall through to migration
  }

  // No valid V3 state — run migration from legacy data
  try {
    return migrateToV3(projectId);
  } catch {
    // Total migration failure — return empty canvas
    return createEmptyCanvas();
  }
}
