/**
 * useRubberBandSelection — click+drag on empty canvas to draw a
 * selection marquee and select all nodes whose bounds intersect it.
 *
 * Performance guarantees:
 * - Node bounding rects cached ONCE at drag start (threshold crossed)
 * - Marquee rect update + hit testing in a single rAF callback
 * - setLiveHits only fires when the hit set actually changes
 * - All drag state lives in refs; React state used only for committed output
 */

import React from "react";
import type { DesignNode } from "@/lib/canvas/design-node";
import { normalizeSelection } from "@/lib/canvas/multi-select-helpers";

// ── Types ────────────────────────────────────────────────────────────

export type MarqueeRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type CachedNodeRect = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type DragState = {
  active: boolean;
  /** Pointer coordinates at pointerdown (client) */
  startClientX: number;
  startClientY: number;
  /** Current pointer (client) */
  currentClientX: number;
  currentClientY: number;
  /** Whether the 4px threshold has been crossed */
  thresholdCrossed: boolean;
  /** Shift key held at start */
  shiftKey: boolean;
  /** Pointer ID for capture */
  pointerId: number;
};

type UseRubberBandSelectionOpts = {
  containerRef: React.RefObject<HTMLElement | null>;
  tree: DesignNode;
  zoom: number;
  interactive: boolean;
  /** When false, marquee drag is disabled (e.g. Frame or Hand tool). */
  enabled?: boolean;
  spaceHeldRef: React.RefObject<boolean>;
  isInteractingRef: React.RefObject<boolean>;
  existingSelection: string[];
  artboardId: string | null;
  onSetSelectedNodes: (nodeIds: string[]) => void;
  onDeselectAll: () => void;
};

type UseRubberBandSelectionReturn = {
  marqueeRect: MarqueeRect | null;
  liveHits: Set<string>;
  handlePointerDown: (e: React.PointerEvent) => void;
  handlePointerMove: (e: React.PointerEvent) => void;
  handlePointerUp: (e: React.PointerEvent) => void;
};

// ── Drag threshold (px) ──────────────────────────────────────────────

const DRAG_THRESHOLD = 4;

// ── Intersection test ────────────────────────────────────────────────

function rectsIntersect(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

// ── Find top-left-most node (primary selection) ──────────────────────

function findTopLeftMost(ids: string[], cachedRects: Map<string, CachedNodeRect>): string | null {
  let best: CachedNodeRect | null = null;
  for (const id of ids) {
    const rect = cachedRects.get(id);
    if (!rect) continue;
    if (!best || rect.y < best.y || (rect.y === best.y && rect.x < best.x)) {
      best = rect;
    }
  }
  return best?.id ?? null;
}

// ── Sets equality (unordered) ────────────────────────────────────────

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) {
    if (!b.has(v)) return false;
  }
  return true;
}

// ── Hook ─────────────────────────────────────────────────────────────

export function useRubberBandSelection(
  opts: UseRubberBandSelectionOpts,
): UseRubberBandSelectionReturn {
  const {
    containerRef,
    tree,
    zoom,
    interactive,
    enabled = true,
    spaceHeldRef: spaceHeld,
    isInteractingRef: isInteracting,
    existingSelection,
    // artboardId reserved for future active-artboard scoping
    onSetSelectedNodes,
    onDeselectAll,
  } = opts;

  // ── React state (drives rendering) ──────────────────────────────
  const [marqueeRect, setMarqueeRect] = React.useState<MarqueeRect | null>(null);
  const [liveHits, setLiveHits] = React.useState<Set<string>>(new Set());

  // ── Refs (drag state — no re-renders) ───────────────────────────
  const dragRef = React.useRef<DragState>({
    active: false,
    startClientX: 0,
    startClientY: 0,
    currentClientX: 0,
    currentClientY: 0,
    thresholdCrossed: false,
    shiftKey: false,
    pointerId: 0,
  });

  const cachedRectsRef = React.useRef<CachedNodeRect[]>([]);
  const cachedRectsMapRef = React.useRef<Map<string, CachedNodeRect>>(new Map());
  const containerOriginRef = React.useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const rafRef = React.useRef<number>(0);
  const liveHitsRef = React.useRef<Set<string>>(new Set());

  // ── Cache node bounding rects (called once when threshold crossed) ──

  const cacheNodeRects = React.useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    containerOriginRef.current = { x: containerRect.left, y: containerRect.top };

    const nodeEls = container.querySelectorAll<HTMLElement>("[data-node-id]");
    const rects: CachedNodeRect[] = [];
    const map = new Map<string, CachedNodeRect>();

    nodeEls.forEach((el) => {
      // Skip hidden nodes
      if (el.offsetParent === null) return;

      const id = el.getAttribute("data-node-id");
      if (!id) return;

      // Skip the root node (don't want to select the entire artboard)
      if (id === tree.id) return;

      const elRect = el.getBoundingClientRect();
      const cached: CachedNodeRect = {
        id,
        x: (elRect.left - containerRect.left) / zoom,
        y: (elRect.top - containerRect.top) / zoom,
        width: elRect.width / zoom,
        height: elRect.height / zoom,
      };
      rects.push(cached);
      map.set(id, cached);
    });

    cachedRectsRef.current = rects;
    cachedRectsMapRef.current = map;
  }, [containerRef, tree.id, zoom]);

  // ── Compute marquee from drag state ─────────────────────────────

  const computeMarquee = React.useCallback((): MarqueeRect => {
    const d = dragRef.current;
    const origin = containerOriginRef.current;

    const startX = (d.startClientX - origin.x) / zoom;
    const startY = (d.startClientY - origin.y) / zoom;
    const endX = (d.currentClientX - origin.x) / zoom;
    const endY = (d.currentClientY - origin.y) / zoom;

    const x = Math.min(startX, endX);
    const y = Math.min(startY, endY);
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);

    return { x, y, width, height };
  }, [zoom]);

  // ── Hit test against cached rects ───────────────────────────────

  const hitTest = React.useCallback(
    (rect: MarqueeRect): Set<string> => {
      const hits = new Set<string>();
      for (const cached of cachedRectsRef.current) {
        if (rectsIntersect(rect, cached)) {
          hits.add(cached.id);
        }
      }
      return hits;
    },
    [],
  );

  // ── Pointer Down ────────────────────────────────────────────────

  const handlePointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      if (!interactive || !enabled) return;

      // Only primary button (left click)
      if (e.button !== 0) return;

      // Don't activate during space+drag (pan)
      if (spaceHeld.current) return;

      // Don't activate if another interaction is running
      if (isInteracting.current) return;

      // Only trigger on empty canvas — skip if clicking on a node, resize handle,
      // insertion bar, button, or input
      const target = e.target as HTMLElement;
      if (
        target.closest("[data-node-id]") ||
        target.closest("[data-resize-handle]") ||
        target.closest("[data-insertion-bar]") ||
        target.closest("button") ||
        target.closest("input") ||
        target.closest("textarea") ||
        target.closest("[contenteditable]")
      ) {
        return;
      }

      dragRef.current = {
        active: true,
        startClientX: e.clientX,
        startClientY: e.clientY,
        currentClientX: e.clientX,
        currentClientY: e.clientY,
        thresholdCrossed: false,
        shiftKey: e.shiftKey,
        pointerId: e.pointerId,
      };
    },
    [interactive, enabled, spaceHeld, isInteracting],  // refs — stable identity
  );

  // ── Pointer Move ────────────────────────────────────────────────

  const handlePointerMove = React.useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current;
      if (!d.active) return;

      d.currentClientX = e.clientX;
      d.currentClientY = e.clientY;

      // Check threshold
      if (!d.thresholdCrossed) {
        const dx = e.clientX - d.startClientX;
        const dy = e.clientY - d.startClientY;
        if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return;

        d.thresholdCrossed = true;
        // Cache node rects now (once)
        cacheNodeRects();
      }

      // Schedule rAF for marquee update + hit testing
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        if (!dragRef.current.active || !dragRef.current.thresholdCrossed) return;

        const rect = computeMarquee();
        setMarqueeRect(rect);

        const newHits = hitTest(rect);

        // Only update liveHits if the set actually changed
        if (!setsEqual(newHits, liveHitsRef.current)) {
          liveHitsRef.current = newHits;
          setLiveHits(new Set(newHits));
        }
      });
    },
    [cacheNodeRects, computeMarquee, hitTest],
  );

  // ── Pointer Up ──────────────────────────────────────────────────

  const handlePointerUp = React.useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current;
      if (!d.active) return;

      // Cancel any pending rAF
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }

      const wasThresholdCrossed = d.thresholdCrossed;
      const shiftKey = d.shiftKey;

      // Reset drag state
      dragRef.current = {
        active: false,
        startClientX: 0,
        startClientY: 0,
        currentClientX: 0,
        currentClientY: 0,
        thresholdCrossed: false,
        shiftKey: false,
        pointerId: 0,
      };

      // Clear marquee visual
      setMarqueeRect(null);

      if (!wasThresholdCrossed) {
        // This was a click on empty canvas (no drag) — deselect
        if (!shiftKey) {
          onDeselectAll();
        }
        // Shift+click on empty = no-op
        liveHitsRef.current = new Set();
        setLiveHits(new Set());
        return;
      }

      // Get final hit set
      const finalHits = Array.from(liveHitsRef.current);

      // Clear live hits
      liveHitsRef.current = new Set();
      setLiveHits(new Set());

      if (finalHits.length === 0) {
        if (shiftKey) {
          // Shift + zero hits = no-op (keep existing selection)
          return;
        }
        onDeselectAll();
        return;
      }

      // Normalize: remove children whose parents are also selected
      let normalized = normalizeSelection(finalHits, tree);

      // Shift+rubber-band: add to existing selection
      if (shiftKey && existingSelection.length > 0) {
        const combined = new Set([...existingSelection, ...normalized]);
        normalized = normalizeSelection(Array.from(combined), tree);
      }

      if (normalized.length === 0) {
        if (!shiftKey) {
          onDeselectAll();
        }
        return;
      }

      // Sort with primary = top-left-most
      const primary = findTopLeftMost(normalized, cachedRectsMapRef.current);
      if (primary) {
        // Put primary first, rest after
        const rest = normalized.filter((id) => id !== primary);
        onSetSelectedNodes([primary, ...rest]);
      } else {
        onSetSelectedNodes(normalized);
      }
    },
    [tree, existingSelection, onSetSelectedNodes, onDeselectAll],
  );

  // ── Clean up on unmount ─────────────────────────────────────────

  React.useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return {
    marqueeRect,
    liveHits,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
