"use client";

/**
 * V3 Unified Canvas View — the single top-level canvas renderer.
 *
 * Replaces the Collect/Compose stage split. Renders all canvas items
 * (references, artboards, notes, arrows) on one infinite transformed surface.
 * Handles pan/zoom gestures, item dragging, file drop, and clipboard paste.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { useCanvas } from "@/lib/canvas/canvas-context";
import { getProjectState, PROJECT_STATE_UPDATED_EVENT } from "@/lib/project-store";
import type { DesignSystemTokens } from "@/lib/canvas/generate-system";
import { getArtboardStartX } from "@/lib/canvas/unified-canvas-state";
import type { CanvasItem, ReferenceItem, ArtboardItem, FrameItem, TextItem } from "@/lib/canvas/unified-canvas-state";
import { useDrag } from "../hooks/useDrag";
import { useResize } from "../hooks/useResize";
import { useCanvasGestures } from "../hooks/useCanvasGestures";
import { useFrameDraw } from "../hooks/useFrameDraw";
import type { FrameDrawCommitPayload } from "../hooks/useFrameDraw";
import { useTextPlace } from "../hooks/useTextPlace";
import type { TextPlaceCommitPayload } from "../hooks/useTextPlace";
import { CanvasReference } from "./CanvasReference";
import { CanvasArtboard } from "./CanvasArtboard";
import { CanvasNote } from "./CanvasNote";
import { CanvasArrow } from "./CanvasArrow";
import { CanvasFrame } from "./CanvasFrame";
import { CanvasText } from "./CanvasText";
import { InspectorPanelV3, type InspectorPanelV3Handle } from "./InspectorPanelV3";
import { LayersPanelV3 } from "./LayersPanelV3";
import { EditorTransportBar } from "./EditorTransportBar";
import { useEditorTheme } from "../hooks/useEditorTheme";
import { EditorContextStrip } from "./EditorContextStrip";
import { EditorShortcutsModal } from "./EditorShortcutsModal";
import { BREAKPOINT_WIDTHS } from "@/lib/canvas/compose";
import { exitAnyActiveTextEditing } from "./ComposeDocumentView";
import { useReferenceExtractor } from "../hooks/useReferenceExtractor";
import { useCanvasKeyboard, type ClipboardEntry } from "../hooks/useCanvasKeyboard";
import { AnimatePresence } from "framer-motion";
import { SectionLibraryPanel } from "./SectionLibraryPanel";
import { ComponentGalleryPanel } from "./ComponentGalleryPanel";
import {
  CANVAS_SEL_FILL_SOFT,
  CANVAS_SEL_PRIMARY,
} from "@/app/canvas-v1/canvas-selection-tokens";
import { MiniRail } from "./MiniRail";
import { WelcomeOverlay, useWelcomeOverlay } from "./WelcomeOverlay";
import { isDesignNodeTree } from "@/lib/canvas/compose";
import {
  parseDesignNodesFromClipboard,
  cloneNodesForPaste,
  setMemoryDesignClip,
} from "@/lib/canvas/design-clipboard";
import { computeDesignPasteTarget } from "@/lib/canvas/design-paste-target";
import type { DesignNode } from "@/lib/canvas/design-node";
import { getNodeTree } from "@/lib/canvas/canvas-item-conversion";
import { MasterEditOverlay } from "./MasterEditOverlay";

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Failed to read file"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/** Max dimension (longest side) for dropped/pasted reference images */
const REF_IMAGE_MAX_DIM = 400;
const REF_IMAGE_FALLBACK = 200;

/** Load an image src and return proportionally-scaled {width, height} */
function getImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const { naturalWidth: nw, naturalHeight: nh } = img;
      if (nw <= 0 || nh <= 0) {
        resolve({ width: REF_IMAGE_FALLBACK, height: REF_IMAGE_FALLBACK });
        return;
      }
      const longest = Math.max(nw, nh);
      const scale = longest > REF_IMAGE_MAX_DIM ? REF_IMAGE_MAX_DIM / longest : 1;
      resolve({
        width: Math.round(nw * scale),
        height: Math.round(nh * scale),
      });
    };
    img.onerror = () => resolve({ width: REF_IMAGE_FALLBACK, height: REF_IMAGE_FALLBACK });
    img.src = src;
  });
}

type UnifiedCanvasViewProps = {
  projectId: string;
};

function createLoadingArtboards(currentItems: CanvasItem[]) {
  const startX = getArtboardStartX(currentItems);
  const gap = 80;
  const emptyPage = {
    id: "loading-page",
    type: "page" as const,
    name: "Loading",
    children: [],
  };

  return [
    { id: "loading-desktop", breakpoint: "desktop" as const, width: 1440, x: startX, name: "Desktop 1440" },
    { id: "loading-mobile", breakpoint: "mobile" as const, width: 390, x: startX + 1440 + gap, name: "Mobile 390" },
  ].map((artboard, index) => ({
    ...artboard,
    kind: "artboard" as const,
    y: 100,
    height: artboard.breakpoint === "desktop" ? 1780 : 1320,
    zIndex: 1000 + index,
    locked: true,
    siteId: "loading-site",
    pageTree: emptyPage,
    compiledCode: null,
  }));
}

export function UnifiedCanvasView({ projectId }: UnifiedCanvasViewProps) {
  const { state, dispatch } = useCanvas();
  const { viewport, items } = state;
  const loadingArtboards = React.useMemo(() => createLoadingArtboards(items), [items]);
  const hasArtboards = items.some((item) => item.kind === "artboard");

  // Welcome overlay for first-time users
  const { visible: welcomeVisible, dismiss: dismissWelcome, show: showWelcome } = useWelcomeOverlay();

  const { effectiveTheme, preference, cyclePreference } = useEditorTheme();
  const [shortcutsOpen, setShortcutsOpen] = React.useState(false);

  // Panel visibility state
  const [showLayers, setShowLayers] = React.useState(true);
  const [showInspector, setShowInspector] = React.useState(true);
  const [showComponentGallery, setShowComponentGallery] = React.useState(false);
  const [activeTool, setActiveTool] = React.useState("select");
  const [sectionLibraryInsertIndex, setSectionLibraryInsertIndex] =
    React.useState<number | null>(null);

  // Marquee is no longer a tool — box-select uses Cursor (select) only.
  React.useEffect(() => {
    if (activeTool === "marquee") setActiveTool("select");
  }, [activeTool]);

  const openPromptWithInspector = React.useCallback(() => {
    setShowInspector(true);
    setActiveTool("prompt");
  }, []);

  const handleOpenSectionLibrary = React.useCallback((insertAtIndex: number) => {
    setSectionLibraryInsertIndex(insertAtIndex);
  }, []);

  // Discrete zoom flag — enables CSS transition during step/zoom-to-fit/zoom-to-selection actions
  const [isDiscreteZoom, setIsDiscreteZoom] = React.useState(false);
  const discreteZoomTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerDiscreteZoom = React.useCallback(() => {
    setIsDiscreteZoom(true);
    if (discreteZoomTimerRef.current) clearTimeout(discreteZoomTimerRef.current);
    discreteZoomTimerRef.current = setTimeout(() => setIsDiscreteZoom(false), 200);
  }, []);

  // Prompt textarea ref for focus management
  const promptTextareaRef = React.useRef<HTMLTextAreaElement>(null);
  const inspectorPanelRef = React.useRef<InspectorPanelV3Handle>(null);

  // Focus prompt: ensure inspector is visible, focus textarea
  const handleFocusPrompt = React.useCallback(() => {
    setShowInspector(true);
    setActiveTool("prompt");
    // Focus after state updates render
    setTimeout(() => promptTextareaRef.current?.focus(), 0);
  }, []);

  const handleRetryGeneration = React.useCallback(() => {
    inspectorPanelRef.current?.retryGeneration();
  }, []);

  const focusPromptWithPrefill = React.useCallback((prefill: string) => {
    setShowInspector(true);
    setActiveTool("prompt");
    dispatch({ type: "SET_PROMPT", value: prefill });
    setTimeout(() => {
      const textarea = promptTextareaRef.current;
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(prefill.length, prefill.length);
      }
    }, 0);
  }, [dispatch]);

  // Stable refs so zoom keyboard shortcuts can call implementations defined after containerRef
  const zoomToFitRef = React.useRef<(() => void) | null>(null);
  const zoomToSelectionRef = React.useRef<(() => void) | null>(null);
  const zoomToFitStable = React.useCallback(() => zoomToFitRef.current?.(), []);
  const zoomToSelectionStable = React.useCallback(() => zoomToSelectionRef.current?.(), []);

  // Cross-context clipboard for canvas ↔ artboard transfers
  const [clipboard, setClipboard] = React.useState<ClipboardEntry | null>(null);

  // Keyboard shortcuts
  useCanvasKeyboard({
    state,
    dispatch,
    onToggleLayers: () => setShowLayers((v) => !v),
    onToggleInspector: () => setShowInspector((v) => !v),
    onFocusPrompt: handleFocusPrompt,
    onSetActiveTool: setActiveTool,
    zoomToFit: zoomToFitStable,
    zoomToSelection: zoomToSelectionStable,
    clipboard,
    setClipboard,
  });

  // Load design tokens from project state for artboard rendering
  const [tokens, setTokens] = React.useState<DesignSystemTokens | null>(null);
  React.useEffect(() => {
    const syncTokens = () => {
      const projectState = getProjectState(projectId);
      setTokens(projectState.canvas?.designTokens ?? null);
    };

    syncTokens();
    window.addEventListener(PROJECT_STATE_UPDATED_EVENT, syncTokens);
    return () => window.removeEventListener(PROJECT_STATE_UPDATED_EVENT, syncTokens);
  }, [projectId]);

  // ── Drag state for visual feedback ─────────────────────────────────

  const [draggingId, setDraggingId] = React.useState<string | null>(null);

  // Drop target artboard — set when dragging a frame/text item over an artboard
  const [dropTargetArtboardId, setDropTargetArtboardId] = React.useState<string | null>(null);

  // Keep a ref so the pointerup closure (captured inside useDrag) can read the latest value
  const dropTargetArtboardIdRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    dropTargetArtboardIdRef.current = dropTargetArtboardId;
  }, [dropTargetArtboardId]);

  // Keep a ref to state.items so drag-end closures always have current item data
  const itemsRef = React.useRef(items);
  React.useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Auto-extract colors/fonts/tags from references
  const { isAnalyzing } = useReferenceExtractor(items, dispatch);

  const dragHandlers = useDrag({
    zoom: viewport.zoom,
    onDragStart: (itemId) => {
      setDraggingId(itemId);
      setDropTargetArtboardId(null);
      // FIX: Push history BEFORE the drag starts so undo restores the pre-drag position.
      // Previously this was in onDragEnd which captured the already-moved state.
      dispatch({ type: "PUSH_HISTORY", description: "Moved item" });
      if (!state.selection.selectedItemIds.includes(itemId)) {
        dispatch({ type: "SELECT_ITEM", itemId });
      }
    },
    onDragMove: (itemId, newPos) => {
      dispatch({ type: "MOVE_ITEM", itemId, x: newPos.x, y: newPos.y });

      // Detect artboard overlap for frame/text items
      const currentItems = itemsRef.current;
      const draggedItem = currentItems.find((i) => i.id === itemId);
      if (draggedItem && (draggedItem.kind === "frame" || draggedItem.kind === "text")) {
        // Use newPos (the live drag position) for center calculation
        const dragCenterX = newPos.x + draggedItem.width / 2;
        const dragCenterY = newPos.y + draggedItem.height / 2;

        const targetArtboard = currentItems.find(
          (i) =>
            i.kind === "artboard" &&
            dragCenterX >= i.x &&
            dragCenterX <= i.x + i.width &&
            dragCenterY >= i.y &&
            dragCenterY <= i.y + i.height
        );

        setDropTargetArtboardId(targetArtboard?.id ?? null);
      } else {
        setDropTargetArtboardId(null);
      }
    },
    onDragCancel: (_itemId) => {
      setDropTargetArtboardId(null);
      setDraggingId(null);
    },
    onDragEnd: (itemId, finalPos) => {
      const dropTarget = dropTargetArtboardIdRef.current;

      if (dropTarget) {
        const draggedItem = itemsRef.current.find((i) => i.id === itemId);
        const artboard = itemsRef.current.find((i) => i.id === dropTarget);

        if (
          draggedItem &&
          (draggedItem.kind === "frame" || draggedItem.kind === "text") &&
          artboard
        ) {
          const tree = getNodeTree(artboard);
          if (tree) {
            dispatch({
              type: "REPARENT_TO_ARTBOARD",
              itemId: draggedItem.id,
              artboardId: dropTarget,
              parentNodeId: tree.id,
              index: -1, // append
            });
            setDropTargetArtboardId(null);
            setDraggingId(null);
            return;
          }
        }
      }

      dispatch({ type: "MOVE_ITEM", itemId, x: finalPos.x, y: finalPos.y });
      setDropTargetArtboardId(null);
      setDraggingId(null);
    },
  });

  // ── Resize handlers for references ───────────────────────────────────

  const [resizingId, setResizingId] = React.useState<string | null>(null);

  const resizeHandlers = useResize({
    zoom: viewport.zoom,
    onResizeStart: (itemId) => {
      setResizingId(itemId);
      dispatch({ type: "PUSH_HISTORY", description: "Resized reference" });
    },
    onResize: (itemId, bounds) => {
      dispatch({ type: "UPDATE_ITEM", itemId, changes: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } });
    },
    onResizeEnd: (itemId, bounds) => {
      dispatch({ type: "UPDATE_ITEM", itemId, changes: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } });
      setResizingId(null);
    },
  });

  // ── Canvas gestures (pan/zoom) ─────────────────────────────────────

  const gestureHandlers = useCanvasGestures({
    currentZoom: viewport.zoom,
    activeTool,
    onDiscreteZoom: triggerDiscreteZoom,
    onPan: (delta) => {
      dispatch({
        type: "SET_VIEWPORT",
        pan: {
          x: viewport.pan.x + delta.dx,
          y: viewport.pan.y + delta.dy,
        },
        zoom: viewport.zoom,
      });
    },
    onZoom: (newZoom, center) => {
      // Zoom centered on cursor position
      const zoomRatio = newZoom / viewport.zoom;
      dispatch({
        type: "SET_VIEWPORT",
        pan: {
          x: center.x - (center.x - viewport.pan.x) * zoomRatio,
          y: center.y - (center.y - viewport.pan.y) * zoomRatio,
        },
        zoom: newZoom,
      });
    },
  });
  const { containerRef, handlePointerDown, spaceHeldRef, isPanningRef } = gestureHandlers;

  // ── Canvas-level draw tool commit handlers ─────────────────────────
  //
  // The hooks compute coords as (clientX - containerRect.left) / zoom.
  // The container is the outer (pre-transform) div. Items live inside a child
  // that has `transform: translate(pan.x, pan.y) scale(zoom)`. World coords are:
  //   worldX = (clientX - containerRect.left - pan.x) / zoom
  // So:  worldX = hookPayload.x - pan.x / zoom
  //      worldY = hookPayload.y - pan.y / zoom

  const handleCanvasFrameCommit = React.useCallback(
    (payload: FrameDrawCommitPayload) => {
      const { pan, zoom } = viewport;
      const worldX = payload.x - pan.x / zoom;
      const worldY = payload.y - pan.y / zoom;
      const worldWidth = payload.width;
      const worldHeight = payload.height;
      dispatch({
        type: "ADD_FRAME",
        x: Math.round(worldX),
        y: Math.round(worldY),
        width: Math.max(24, Math.round(worldWidth)),
        height: Math.max(24, Math.round(worldHeight)),
      });
      setActiveTool("select");
    },
    [viewport, dispatch],
  );

  const handleCanvasTextCommit = React.useCallback(
    (payload: TextPlaceCommitPayload) => {
      const { pan, zoom } = viewport;
      const worldX = payload.x - pan.x / zoom;
      const worldY = payload.y - pan.y / zoom;
      const worldWidth = payload.width;
      const worldHeight = payload.height;
      dispatch({
        type: "ADD_TEXT",
        x: Math.round(worldX),
        y: Math.round(worldY),
        width: Math.max(24, Math.round(worldWidth)),
        height: Math.max(20, Math.round(worldHeight)),
        mode: payload.mode,
      });
      setActiveTool("select");
    },
    [viewport, dispatch],
  );

  const canvasFrameDraw = useFrameDraw({
    containerRef,
    zoom: viewport.zoom,
    interactive: true,
    canvasTool: activeTool,
    spaceHeldRef,
    onCommit: handleCanvasFrameCommit,
  });

  const canvasTextPlace = useTextPlace({
    containerRef,
    zoom: viewport.zoom,
    interactive: true,
    canvasTool: activeTool,
    spaceHeldRef,
    onCommit: handleCanvasTextCommit,
  });

  // ── Screen-to-world coordinate conversion ─────────────────────────

  const screenToCanvas = React.useCallback(
    (screenX: number, screenY: number) => {
      const container = containerRef.current;
      if (!container) return { x: 0, y: 0 };
      const rect = container.getBoundingClientRect();
      return {
        x: (screenX - rect.left - viewport.pan.x) / viewport.zoom,
        y: (screenY - rect.top - viewport.pan.y) / viewport.zoom,
      };
    },
    [containerRef, viewport]
  );

  // ── Zoom-to-fit: center all artboards in viewport ──────────────────

  const zoomToFit = React.useCallback(() => {
    const artboards = items.filter((i) => i.kind === "artboard" || i.kind === "frame" || i.kind === "text");
    if (artboards.length === 0) return;

    const PADDING = 64;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const ab of artboards) {
      minX = Math.min(minX, ab.x);
      minY = Math.min(minY, ab.y);
      maxX = Math.max(maxX, ab.x + ab.width);
      maxY = Math.max(maxY, ab.y + ab.height);
    }

    const contentW = maxX - minX;
    const contentH = maxY - minY;
    const container = containerRef.current;
    if (!container) return;

    const viewW = container.clientWidth;
    const viewH = container.clientHeight;
    const newZoom = Math.min((viewW - PADDING * 2) / contentW, (viewH - PADDING * 2) / contentH, 4);
    const clampedZoom = Math.max(0.1, Math.min(8, newZoom));

    const newPanX = (viewW - contentW * clampedZoom) / 2 - minX * clampedZoom;
    const newPanY = (viewH - contentH * clampedZoom) / 2 - minY * clampedZoom;

    triggerDiscreteZoom();
    dispatch({
      type: "SET_VIEWPORT",
      pan: { x: newPanX, y: newPanY },
      zoom: clampedZoom,
    });
  }, [items, containerRef, dispatch, triggerDiscreteZoom]);

  // ── Zoom-to-selection: zoom to selected item or selected node ────────

  const zoomToSelection = React.useCallback(() => {
    const { selectedItemIds, activeItemId, selectedNodeId } = state.selection;

    // Try selected canvas item first
    const selectedItemId = selectedItemIds[0];
    if (selectedItemId) {
      const item = items.find((i) => i.id === selectedItemId);
      if (item) {
        const PADDING = 64;
        const container = containerRef.current;
        if (!container) return;
        const viewW = container.clientWidth;
        const viewH = container.clientHeight;
        const newZoom = Math.min((viewW - PADDING * 2) / item.width, (viewH - PADDING * 2) / item.height, 4);
        const clampedZoom = Math.max(0.1, Math.min(8, newZoom));
        const newPanX = (viewW - item.width * clampedZoom) / 2 - item.x * clampedZoom;
        const newPanY = (viewH - item.height * clampedZoom) / 2 - item.y * clampedZoom;
        triggerDiscreteZoom();
        dispatch({ type: "SET_VIEWPORT", pan: { x: newPanX, y: newPanY }, zoom: clampedZoom });
        return;
      }
    }

    // Try selected design node via DOM bounds
    if (activeItemId && selectedNodeId) {
      const nodeEl = document.querySelector(`[data-node-id="${selectedNodeId}"]`) as HTMLElement | null;
      if (nodeEl && containerRef.current) {
        const container = containerRef.current;
        const containerRect = container.getBoundingClientRect();
        const nodeRect = nodeEl.getBoundingClientRect();
        const PADDING = 64;
        const viewW = container.clientWidth;
        const viewH = container.clientHeight;
        // Convert screen rect to canvas coords
        const nodeCanvasX = (nodeRect.left - containerRect.left - viewport.pan.x) / viewport.zoom;
        const nodeCanvasY = (nodeRect.top - containerRect.top - viewport.pan.y) / viewport.zoom;
        const nodeCanvasW = nodeRect.width / viewport.zoom;
        const nodeCanvasH = nodeRect.height / viewport.zoom;
        const newZoom = Math.min((viewW - PADDING * 2) / nodeCanvasW, (viewH - PADDING * 2) / nodeCanvasH, 4);
        const clampedZoom = Math.max(0.1, Math.min(8, newZoom));
        const newPanX = (viewW - nodeCanvasW * clampedZoom) / 2 - nodeCanvasX * clampedZoom;
        const newPanY = (viewH - nodeCanvasH * clampedZoom) / 2 - nodeCanvasY * clampedZoom;
        triggerDiscreteZoom();
        dispatch({ type: "SET_VIEWPORT", pan: { x: newPanX, y: newPanY }, zoom: clampedZoom });
        return;
      }
    }

    // Nothing selected — fall back to zoom-to-fit
    zoomToFit();
  }, [state.selection, items, containerRef, viewport, dispatch, triggerDiscreteZoom, zoomToFit]);

  // Wire stable refs so keyboard shortcuts can call the real implementations
  React.useEffect(() => {
    zoomToFitRef.current = zoomToFit;
    zoomToSelectionRef.current = zoomToSelection;
  }, [zoomToFit, zoomToSelection]);

  // ── Drag box selection ─────────────────────────────────────────────

  const [dragSelection, setDragSelection] = React.useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  // Track whether a drag selection just completed so we can suppress the click-to-deselect
  const didDragSelectRef = React.useRef(false);

  const handleDragSelectDown = React.useCallback(
    (e: React.MouseEvent) => {
      // Only left mouse button
      if (e.button !== 0) return;
      // Only select tool (not hand tool)
      if (activeTool !== "select") return;
      // Don't start if space is held (that's pan)
      if (spaceHeldRef.current) return;
      // Don't start if already panning
      if (isPanningRef.current) return;
      // Only on empty canvas surface (not on items)
      if (!(e.target as HTMLElement).dataset.canvasSurface) return;

      const worldPos = screenToCanvas(e.clientX, e.clientY);
      setDragSelection({
        startX: worldPos.x,
        startY: worldPos.y,
        currentX: worldPos.x,
        currentY: worldPos.y,
      });
    },
    [activeTool, spaceHeldRef, isPanningRef, screenToCanvas]
  );

  // Keep a ref in sync so mouseUp can read latest value without state updater
  const dragSelectionRef = React.useRef(dragSelection);
  React.useEffect(() => {
    dragSelectionRef.current = dragSelection;
  }, [dragSelection]);

  React.useEffect(() => {
    if (!dragSelection) return;

    const handleMouseMove = (e: MouseEvent) => {
      const worldPos = screenToCanvas(e.clientX, e.clientY);
      setDragSelection((prev) =>
        prev ? { ...prev, currentX: worldPos.x, currentY: worldPos.y } : null
      );
    };

    const handleMouseUp = () => {
      // Read from ref (always latest) — do NOT dispatch inside a state updater
      // as that triggers "Cannot update component while rendering another" errors.
      const current = dragSelectionRef.current;
      setDragSelection(null);

      if (!current) return;

      const dx = Math.abs(current.currentX - current.startX);
      const dy = Math.abs(current.currentY - current.startY);

      // If the drag was tiny (< 5px in both directions), treat as a click — deselect handled by handleCanvasClick
      if (dx < 5 && dy < 5) return;

      // Mark that a drag selection just completed so we suppress the click handler
      didDragSelectRef.current = true;
      requestAnimationFrame(() => {
        didDragSelectRef.current = false;
      });

      // Calculate bounding box
      const selBox = {
        x: Math.min(current.startX, current.currentX),
        y: Math.min(current.startY, current.currentY),
        w: dx,
        h: dy,
      };

      // Find all items whose bounds intersect with the selection rectangle
      const intersecting = items.filter((item) => {
        return (
          selBox.x < item.x + item.width &&
          selBox.x + selBox.w > item.x &&
          selBox.y < item.y + item.height &&
          selBox.y + selBox.h > item.y
        );
      });

      // Select first intersecting item (multi-select not yet implemented)
      if (intersecting.length > 0) {
        dispatch({ type: "SELECT_ITEM", itemId: intersecting[0].id });
      } else {
        dispatch({ type: "DESELECT_ALL" });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragSelection, screenToCanvas, items, dispatch]);

  // ── File drop support ──────────────────────────────────────────────

  const [isDragOver, setIsDragOver] = React.useState(false);

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsDragOver(true);
  }, []);

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    // Only trigger if leaving the container itself
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOver(false);
  }, []);

  const handleDrop = React.useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/")
      );
      if (files.length === 0) return;

      const canvasPos = screenToCanvas(e.clientX, e.clientY);

      let offsetX = 0;
      for (let i = 0; i < files.length; i++) {
        try {
          const dataUrl = await fileToDataUrl(files[i]);
          const dims = await getImageDimensions(dataUrl);
          const refItem: ReferenceItem = {
            id: uid("ref"),
            kind: "reference",
            x: canvasPos.x + offsetX,
            y: canvasPos.y,
            width: dims.width,
            height: dims.height,
            zIndex: items.length + i,
            locked: false,
            imageUrl: dataUrl,
            title: files[i].name,
            source: "upload",
          };
          offsetX += dims.width + 20;
          dispatch({ type: "PUSH_HISTORY", description: "Added reference" });
          dispatch({ type: "ADD_ITEM", item: refItem });
        } catch {
          // Skip files that fail to read
        }
      }
    },
    [dispatch, items.length, screenToCanvas]
  );

  // ── Clipboard paste support ────────────────────────────────────────

  React.useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;

      const textPlain = e.clipboardData?.getData("text/plain") ?? "";
      const parsedNodes = parseDesignNodesFromClipboard(textPlain);
      if (
        parsedNodes &&
        parsedNodes.length > 0 &&
        state.selection.activeItemId
      ) {
        const ab = items.find(
          (i): i is ArtboardItem =>
            i.kind === "artboard" && i.id === state.selection.activeItemId
        );
        if (ab && isDesignNodeTree(ab.pageTree)) {
          e.preventDefault();
          setMemoryDesignClip(parsedNodes);
          const pasteTarget = computeDesignPasteTarget(
            ab.pageTree as DesignNode,
            state.selection.selectedNodeId
          );
          dispatch({
            type: "PASTE_DESIGN_NODES",
            itemId: state.selection.activeItemId,
            nodes: cloneNodesForPaste(parsedNodes),
            insertAfterId:
              pasteTarget.insertAfterId === undefined
                ? undefined
                : pasteTarget.insertAfterId,
            parentNodeId: pasteTarget.parentNodeId,
          });
          return;
        }
      }

      const imageItems = Array.from(e.clipboardData?.items ?? []).filter(
        (item) => item.type.startsWith("image/")
      );
      if (imageItems.length === 0) return;

      e.preventDefault();

      // Paste at viewport center
      const container = containerRef.current;
      const centerX = container ? container.clientWidth / 2 : 500;
      const centerY = container ? container.clientHeight / 2 : 400;
      const canvasPos = {
        x: (centerX - viewport.pan.x) / viewport.zoom,
        y: (centerY - viewport.pan.y) / viewport.zoom,
      };

      let pasteOffsetX = 0;
      for (let i = 0; i < imageItems.length; i++) {
        const file = imageItems[i].getAsFile();
        if (!file) continue;
        try {
          const dataUrl = await fileToDataUrl(file);
          const dims = await getImageDimensions(dataUrl);
          const refItem: ReferenceItem = {
            id: uid("ref"),
            kind: "reference",
            x: canvasPos.x + pasteOffsetX,
            y: canvasPos.y,
            width: dims.width,
            height: dims.height,
            zIndex: items.length + i,
            locked: false,
            imageUrl: dataUrl,
            title: "Pasted image",
            source: "upload",
          };
          pasteOffsetX += dims.width + 20;
          dispatch({ type: "PUSH_HISTORY", description: "Pasted reference" });
          dispatch({ type: "ADD_ITEM", item: refItem });
        } catch {
          // Skip
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [containerRef, dispatch, items, items.length, viewport, state.selection.activeItemId, state.selection.selectedNodeId]);

  // ── Click on empty canvas → deselect ───────────────────────────────

  const activeArtboard = React.useMemo((): ArtboardItem | null => {
    const id = state.selection.activeItemId;
    if (!id) return null;
    const item = items.find((i) => i.kind === "artboard" && i.id === id);
    return item ? (item as ArtboardItem) : null;
  }, [state.selection.activeItemId, items]);

  const contextBreakpointLabel = React.useMemo(() => {
    if (!activeArtboard) return "";
    const w = BREAKPOINT_WIDTHS[activeArtboard.breakpoint] ?? activeArtboard.width;
    return `${activeArtboard.breakpoint} · ${w}px`;
  }, [activeArtboard]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "?") return;
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable) return;
      e.preventDefault();
      setShortcutsOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleCanvasClick = React.useCallback(
    (e: React.MouseEvent) => {
      // Suppress click-to-deselect when a drag selection just completed
      if (didDragSelectRef.current) return;
      // Hand tool: clicking should not select/deselect — panning is the only interaction
      if (activeTool === "hand") return;
      if ((e.target as HTMLElement).dataset.canvasSurface) {
        exitAnyActiveTextEditing();
        dispatch({ type: "DESELECT_ALL" });
      }
    },
    [dispatch, activeTool]
  );

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="flex h-full w-full flex-col" data-theme={effectiveTheme}>
      <EditorShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      {/* Top tool rail (panel toggles + nav) */}
      <MiniRail
        layersVisible={showLayers}
        onToggleLayers={() => setShowLayers((v) => !v)}
        inspectorVisible={showInspector}
        onToggleInspector={() => setShowInspector((v) => !v)}
        componentGalleryVisible={showComponentGallery}
        onToggleComponentGallery={() => setShowComponentGallery((v) => !v)}
        onShowWelcome={showWelcome}
        editorThemePreference={preference}
        onCycleEditorTheme={cyclePreference}
        onOpenShortcuts={() => setShortcutsOpen(true)}
      />

      {/* Editor row: Layers | Canvas | Inspector */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-row">
        {showLayers && <LayersPanelV3 projectId={projectId} />}

      {/* Canvas surface */}
      <div
        ref={containerRef}
        className={cn(
          "editor-canvas-surface relative h-full min-h-0 min-w-0 flex-1 overflow-hidden bg-canvas-workspace",
          isDragOver && "ring-1 ring-inset ring-[rgba(59,130,246,0.45)] ring-dashed"
        )}
      style={{
        backgroundColor: "var(--canvas-color, var(--canvas-workspace))",
      }}
      onClick={handleCanvasClick}
      onMouseDown={handleDragSelectDown}
      onPointerDown={(e) => {
        canvasFrameDraw.handlePointerDown(e);
        canvasTextPlace.handlePointerDown(e);
        handlePointerDown(e);
      }}
      onPointerMove={(e) => {
        canvasFrameDraw.handlePointerMove(e);
        canvasTextPlace.handlePointerMove(e);
      }}
      onPointerUp={(e) => {
        canvasFrameDraw.handlePointerUp(e);
        canvasTextPlace.handlePointerUp(e);
      }}
      onAuxClick={(e) => { if (e.button === 1) e.preventDefault(); }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      data-canvas-surface="true"
    >
      <EditorContextStrip
        activeArtboard={activeArtboard}
        selectedNodeId={state.selection.selectedNodeId}
        breakpointLabel={contextBreakpointLabel}
      />

      {/* Empty canvas state */}
      {items.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {/* Muted slat-logo placeholder */}
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="opacity-20 mb-4">
            <rect x="4" y="8" width="4" height="32" rx="2" fill="#A0A0A0" />
            <rect x="12" y="4" width="4" height="40" rx="2" fill="#A0A0A0" />
            <rect x="20" y="6" width="4" height="36" rx="2" fill="#A0A0A0" />
            <rect x="28" y="4" width="4" height="40" rx="2" fill="#A0A0A0" />
            <rect x="36" y="8" width="4" height="32" rx="2" fill="#A0A0A0" />
          </svg>
          <p className="text-[14px] font-medium text-text">Drop references to teach Studio OS your taste</p>
          <p className="mt-1 text-[12px] text-text-muted">Then generate an editable site direction from the Prompt panel.</p>
        </div>
      )}

      {/* Transformed canvas world */}
      <div
        style={{
          transform: `translate(${viewport.pan.x}px, ${viewport.pan.y}px) scale(${viewport.zoom})`,
          transformOrigin: "0 0",
          position: "absolute",
          top: 0,
          left: 0,
          transition: isDiscreteZoom ? "transform 150ms ease-out" : undefined,
        }}
        data-canvas-surface="true"
      >
        {items.map((item) => {
          switch (item.kind) {
            case "reference":
              return (
                <CanvasReference
                  key={item.id}
                  item={item}
                  isDragging={draggingId === item.id}
                  isResizing={resizingId === item.id}
                  isAnalyzing={isAnalyzing(item.id)}
                  onPointerDown={dragHandlers.onPointerDown}
                  onResizeHandlePointerDown={resizeHandlers.onHandlePointerDown}
                />
              );
            case "artboard":
              return (
                <CanvasArtboard
                  key={item.id}
                  item={item}
                  tokens={tokens}
                  activeTool={activeTool}
                  isDragging={draggingId === item.id}
                  isGenerating={state.prompt.isGenerating}
                  agentSteps={state.prompt.agentSteps}
                  generationResult={state.prompt.generationResult}
                  onOpenSectionLibrary={handleOpenSectionLibrary}
                  onOpenComponentGallery={() => setShowComponentGallery(true)}
                  onFocusPromptWithPrefill={focusPromptWithPrefill}
                  onPointerDown={dragHandlers.onPointerDown}
                  onRetry={handleRetryGeneration}
                />
              );
            case "note":
              return (
                <CanvasNote
                  key={item.id}
                  item={item}
                  isDragging={draggingId === item.id}
                  onPointerDown={dragHandlers.onPointerDown}
                />
              );
            case "arrow":
              return (
                <CanvasArrow
                  key={item.id}
                  item={item}
                  isDragging={draggingId === item.id}
                  onPointerDown={dragHandlers.onPointerDown}
                />
              );
            case "frame":
              return (
                <CanvasFrame
                  key={item.id}
                  item={item as FrameItem}
                  zoom={viewport.zoom}
                  isDragging={draggingId === item.id}
                  onPointerDown={dragHandlers.onPointerDown}
                />
              );
            case "text":
              return (
                <CanvasText
                  key={item.id}
                  item={item as TextItem}
                  zoom={viewport.zoom}
                  isDragging={draggingId === item.id}
                  onPointerDown={dragHandlers.onPointerDown}
                />
              );
            default:
              return null;
          }
        })}

        {!hasArtboards &&
          state.prompt.isGenerating &&
          loadingArtboards.map((item) => (
            <CanvasArtboard
              key={item.id}
              item={item}
              tokens={tokens}
              isGenerating
              agentSteps={state.prompt.agentSteps}
              generationResult={state.prompt.generationResult}
              onRetry={handleRetryGeneration}
            />
          ))}

        {/* Drop target artboard highlight — shown while dragging a frame/text over an artboard */}
        {dropTargetArtboardId && (() => {
          const target = state.items.find((i) => i.id === dropTargetArtboardId);
          if (!target) return null;
          return (
            <div
              style={{
                position: "absolute",
                left: target.x,
                top: target.y,
                width: target.width,
                height: target.height,
                border: `1px solid ${CANVAS_SEL_PRIMARY}`,
                backgroundColor: "rgba(191, 219, 254, 0.22)",
                pointerEvents: "none",
                borderRadius: 4,
                zIndex: 999999,
              }}
            />
          );
        })()}

        {/* Drag selection rectangle */}
        {dragSelection && (
          <div
            className="absolute border border-[rgba(59,130,246,0.42)] bg-[rgba(59,130,246,0.05)] pointer-events-none"
            style={{
              left: Math.min(dragSelection.startX, dragSelection.currentX),
              top: Math.min(dragSelection.startY, dragSelection.currentY),
              width: Math.abs(dragSelection.currentX - dragSelection.startX),
              height: Math.abs(dragSelection.currentY - dragSelection.startY),
            }}
          />
        )}

        {/* Frame draw preview */}
        {canvasFrameDraw.drawRect && (
          <div
            style={{
              position: "absolute",
              left: canvasFrameDraw.drawRect.x - viewport.pan.x / viewport.zoom,
              top: canvasFrameDraw.drawRect.y - viewport.pan.y / viewport.zoom,
              width: canvasFrameDraw.drawRect.width,
              height: canvasFrameDraw.drawRect.height,
              border: `1px dashed ${CANVAS_SEL_PRIMARY}`,
              backgroundColor: CANVAS_SEL_FILL_SOFT,
              pointerEvents: "none",
            }}
          />
        )}

        {/* Text place preview */}
        {canvasTextPlace.drawRect && (
          <div
            style={{
              position: "absolute",
              left: canvasTextPlace.drawRect.x - viewport.pan.x / viewport.zoom,
              top: canvasTextPlace.drawRect.y - viewport.pan.y / viewport.zoom,
              width: canvasTextPlace.drawRect.width,
              height: canvasTextPlace.drawRect.height,
              border: `1px dashed ${CANVAS_SEL_PRIMARY}`,
              backgroundColor: CANVAS_SEL_FILL_SOFT,
              pointerEvents: "none",
            }}
          />
        )}
      </div>

      {/* Section library panel */}
      <AnimatePresence>
        {sectionLibraryInsertIndex !== null && (
          <SectionLibraryPanel
            isOpen
            onClose={() => setSectionLibraryInsertIndex(null)}
            insertAtIndex={sectionLibraryInsertIndex}
          />
        )}
      </AnimatePresence>

      {/* Component library panel (templates + primitives + project/legacy components) */}
      <ComponentGalleryPanel
        isOpen={showComponentGallery}
        onClose={() => setShowComponentGallery(false)}
      />

      <EditorTransportBar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        onGenerate={openPromptWithInspector}
      />
      </div>
        {showInspector && (
          <InspectorPanelV3
            projectId={projectId}
            promptTextareaRef={promptTextareaRef}
            panelRef={inspectorPanelRef}
            onOpenGenerate={openPromptWithInspector}
            activeTool={activeTool}
            onInspectorTabChange={(tab) => {
              if (tab === "prompt") {
                setActiveTool("prompt");
              } else if (activeTool === "prompt") {
                setActiveTool("select");
              }
            }}
          />
        )}
      </div>

      {/* Master edit mode overlay (Track 3) */}
      {state.masterEditSession && (
        <MasterEditOverlay
          masterEditSession={state.masterEditSession}
          components={state.components}
          dispatch={dispatch}
        />
      )}

      {/* Welcome overlay for first-time users */}
      <WelcomeOverlay visible={welcomeVisible} onDismiss={dismissWelcome} />

    </div>
  );
}
