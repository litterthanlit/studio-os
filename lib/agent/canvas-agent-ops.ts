import type { DesignNode } from "@/lib/canvas/design-node";
import { isDesignNodeTree } from "@/lib/canvas/compose";
import { validateAndNormalizeDesignTree } from "@/lib/canvas/design-tree-validator";
import type {
  ArtboardItem,
  Breakpoint,
  ReferenceItem,
  UnifiedCanvasState,
} from "@/lib/canvas/unified-canvas-state";
import { createEmptyCanvas } from "@/lib/canvas/unified-canvas-state";
import { stripCanvasForPersistence } from "@/lib/canvas/canvas-convex-sync";

export type CanvasAgentOperation =
  | {
      type: "add_artboard";
      name: string;
      breakpoint: Breakpoint;
      tree: unknown;
      x?: number;
      y?: number;
      siteId?: string;
    }
  | {
      type: "replace_artboard_tree";
      artboardId: string;
      tree: unknown;
    }
  | {
      type: "add_reference";
      imageUrl: string;
      title?: string;
      source?: ReferenceItem["source"];
    };

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const BREAKPOINT_WIDTHS: Record<Breakpoint, number> = {
  desktop: 1440,
  mobile: 375,
};

export function buildCanvasSummary(state: UnifiedCanvasState) {
  const artboards = state.items
    .filter((item): item is ArtboardItem => item.kind === "artboard")
    .map((artboard) => ({
      id: artboard.id,
      name: artboard.name,
      breakpoint: artboard.breakpoint,
      siteId: artboard.siteId,
      sectionNames: isDesignNodeTree(artboard.pageTree)
        ? (artboard.pageTree.children ?? []).map((child) => child.name || child.id)
        : [],
    }));

  const references = state.items
    .filter((item): item is ReferenceItem => item.kind === "reference")
    .map((reference) => ({
      id: reference.id,
      title: reference.title ?? null,
      imageUrl: reference.imageUrl,
      weight: reference.weight ?? "default",
    }));

  return {
    artboardCount: artboards.length,
    referenceCount: references.length,
    artboards,
    references,
    activeBreakpoint: state.activeBreakpoint,
    updatedAt: state.updatedAt,
  };
}

export function applyCanvasAgentOperations(
  inputState: UnifiedCanvasState | null,
  operations: CanvasAgentOperation[],
): { state: UnifiedCanvasState; applied: string[]; errors: string[] } {
  const state = inputState ? structuredClone(inputState) : createEmptyCanvas();
  const applied: string[] = [];
  const errors: string[] = [];

  for (const operation of operations) {
    if (operation.type === "add_artboard") {
      const validated = validateAndNormalizeDesignTree(operation.tree);
      if (!validated.ok) {
        errors.push(`add_artboard: ${validated.reason}`);
        continue;
      }

      const id = uid("artboard");
      const siteId = operation.siteId ?? uid("site");
      const breakpoint = operation.breakpoint;
      const width = BREAKPOINT_WIDTHS[breakpoint] ?? 1440;
      const maxZ = state.items.reduce((max, item) => Math.max(max, item.zIndex), 0);
      const x = operation.x ?? 120 + state.items.filter((item) => item.kind === "artboard").length * 80;
      const y = operation.y ?? 120;

      const artboard: ArtboardItem = {
        id,
        kind: "artboard",
        x,
        y,
        width,
        height: 900,
        zIndex: maxZ + 1,
        locked: false,
        siteId,
        breakpoint,
        name: operation.name,
        pageTree: validated.tree,
      };

      state.items.push(artboard);
      applied.push(`add_artboard:${id}`);
      continue;
    }

    if (operation.type === "replace_artboard_tree") {
      const artboard = state.items.find(
        (item): item is ArtboardItem =>
          item.kind === "artboard" && item.id === operation.artboardId,
      );
      if (!artboard) {
        errors.push(`replace_artboard_tree: artboard ${operation.artboardId} not found`);
        continue;
      }

      const validated = validateAndNormalizeDesignTree(operation.tree);
      if (!validated.ok) {
        errors.push(`replace_artboard_tree: ${validated.reason}`);
        continue;
      }

      artboard.pageTree = validated.tree;
      applied.push(`replace_artboard_tree:${operation.artboardId}`);
      continue;
    }

    if (operation.type === "add_reference") {
      const maxZ = state.items.reduce((max, item) => Math.max(max, item.zIndex), 0);
      const reference: ReferenceItem = {
        id: uid("reference"),
        kind: "reference",
        x: 40,
        y: 40 + state.items.filter((item) => item.kind === "reference").length * 24,
        width: 240,
        height: 160,
        zIndex: maxZ + 1,
        locked: false,
        imageUrl: operation.imageUrl,
        title: operation.title,
        source: operation.source ?? "url",
      };
      state.items.push(reference);
      applied.push(`add_reference:${reference.id}`);
    }
  }

  state.updatedAt = new Date().toISOString();
  return {
    state: stripCanvasForPersistence(state),
    applied,
    errors,
  };
}

export function getArtboardTree(state: UnifiedCanvasState, artboardId: string): DesignNode | null {
  const artboard = state.items.find(
    (item): item is ArtboardItem => item.kind === "artboard" && item.id === artboardId,
  );
  if (!artboard || !isDesignNodeTree(artboard.pageTree)) return null;
  return artboard.pageTree;
}

export function extractReferenceUrls(state: UnifiedCanvasState): string[] {
  return state.items
    .filter((item): item is ReferenceItem => item.kind === "reference")
    .filter((item) => item.weight !== "muted")
    .map((item) => item.imageUrl)
    .filter(Boolean);
}
