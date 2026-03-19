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
import { getProjectState } from "@/lib/project-store";
import type { DesignSystemTokens } from "@/lib/canvas/generate-system";
import type { ReferenceItem } from "@/lib/canvas/unified-canvas-state";
import { useDrag } from "../hooks/useDrag";
import { useCanvasGestures } from "../hooks/useCanvasGestures";
import { CanvasReference } from "./CanvasReference";
import { CanvasArtboard } from "./CanvasArtboard";
import { CanvasNote } from "./CanvasNote";
import { CanvasArrow } from "./CanvasArrow";
import { PromptPanel } from "./PromptPanel";
import { InspectorPanelV3 } from "./InspectorPanelV3";
import { LayersPanelV3 } from "./LayersPanelV3";
import { BottomBarV3 } from "./BottomBarV3";
import { useReferenceExtractor } from "../hooks/useReferenceExtractor";
import { useCanvasKeyboard } from "../hooks/useCanvasKeyboard";

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

type UnifiedCanvasViewProps = {
  projectId: string;
};

export function UnifiedCanvasView({ projectId }: UnifiedCanvasViewProps) {
  const { state, dispatch } = useCanvas();
  const { viewport, items } = state;

  // Panel visibility state
  const [showLayers, setShowLayers] = React.useState(false);
  const [showInspector, setShowInspector] = React.useState(true);

  // Keyboard shortcuts
  useCanvasKeyboard({
    state,
    dispatch,
    onToggleLayers: () => setShowLayers((v) => !v),
    onToggleInspector: () => setShowInspector((v) => !v),
  });

  // Load design tokens from project state for artboard rendering
  const [tokens, setTokens] = React.useState<DesignSystemTokens | null>(null);
  React.useEffect(() => {
    const projectState = getProjectState(projectId);
    if (projectState.canvas?.designTokens) {
      setTokens(projectState.canvas.designTokens);
    }
  }, [projectId]);

  // ── Drag state for visual feedback ─────────────────────────────────

  const [draggingId, setDraggingId] = React.useState<string | null>(null);

  // Auto-extract colors/fonts/tags from references
  const { isAnalyzing } = useReferenceExtractor(items, dispatch);

  const dragHandlers = useDrag({
    zoom: viewport.zoom,
    onDragStart: (itemId) => {
      setDraggingId(itemId);
      // FIX: Push history BEFORE the drag starts so undo restores the pre-drag position.
      // Previously this was in onDragEnd which captured the already-moved state.
      dispatch({ type: "PUSH_HISTORY", description: "Moved item" });
      if (!state.selection.selectedItemIds.includes(itemId)) {
        dispatch({ type: "SELECT_ITEM", itemId });
      }
    },
    onDragMove: (itemId, newPos) => {
      dispatch({ type: "MOVE_ITEM", itemId, x: newPos.x, y: newPos.y });
    },
    onDragEnd: (itemId, finalPos) => {
      dispatch({ type: "MOVE_ITEM", itemId, x: finalPos.x, y: finalPos.y });
      setDraggingId(null);
    },
  });

  // ── Canvas gestures (pan/zoom) ─────────────────────────────────────

  const gestureHandlers = useCanvasGestures({
    currentZoom: viewport.zoom,
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

  // ── File drop support ──────────────────────────────────────────────

  const [isDragOver, setIsDragOver] = React.useState(false);

  const screenToCanvas = React.useCallback(
    (screenX: number, screenY: number) => {
      const container = gestureHandlers.containerRef.current;
      if (!container) return { x: 0, y: 0 };
      const rect = container.getBoundingClientRect();
      return {
        x: (screenX - rect.left - viewport.pan.x) / viewport.zoom,
        y: (screenY - rect.top - viewport.pan.y) / viewport.zoom,
      };
    },
    [viewport, gestureHandlers.containerRef]
  );

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

      for (let i = 0; i < files.length; i++) {
        try {
          const dataUrl = await fileToDataUrl(files[i]);
          const refItem: ReferenceItem = {
            id: uid("ref"),
            kind: "reference",
            x: canvasPos.x + i * 220,
            y: canvasPos.y,
            width: 200,
            height: 200,
            zIndex: items.length + i,
            locked: false,
            imageUrl: dataUrl,
            title: files[i].name,
            source: "upload",
          };
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

      const imageItems = Array.from(e.clipboardData?.items ?? []).filter(
        (item) => item.type.startsWith("image/")
      );
      if (imageItems.length === 0) return;

      e.preventDefault();

      // Paste at viewport center
      const container = gestureHandlers.containerRef.current;
      const centerX = container ? container.clientWidth / 2 : 500;
      const centerY = container ? container.clientHeight / 2 : 400;
      const canvasPos = {
        x: (centerX - viewport.pan.x) / viewport.zoom,
        y: (centerY - viewport.pan.y) / viewport.zoom,
      };

      for (let i = 0; i < imageItems.length; i++) {
        const file = imageItems[i].getAsFile();
        if (!file) continue;
        try {
          const dataUrl = await fileToDataUrl(file);
          const refItem: ReferenceItem = {
            id: uid("ref"),
            kind: "reference",
            x: canvasPos.x + i * 220,
            y: canvasPos.y,
            width: 200,
            height: 200,
            zIndex: items.length + i,
            locked: false,
            imageUrl: dataUrl,
            title: "Pasted image",
            source: "upload",
          };
          dispatch({ type: "PUSH_HISTORY", description: "Pasted reference" });
          dispatch({ type: "ADD_ITEM", item: refItem });
        } catch {
          // Skip
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [dispatch, items.length, viewport, gestureHandlers.containerRef]);

  // ── Click on empty canvas → deselect ───────────────────────────────

  const handleCanvasClick = React.useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).dataset.canvasSurface) {
        dispatch({ type: "DESELECT_ALL" });
      }
    },
    [dispatch]
  );

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div
      ref={gestureHandlers.containerRef}
      className={cn(
        "relative h-full w-full overflow-hidden bg-[#FAFAF8]",
        isDragOver && "ring-2 ring-inset ring-[#1E5DF2] ring-dashed"
      )}
      style={{
        backgroundImage:
          "radial-gradient(circle, #D5D5D0 0.75px, transparent 0.75px)",
        backgroundSize: "20px 20px",
      }}
      onClick={handleCanvasClick}
      onPointerDown={gestureHandlers.handlePointerDown}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      data-canvas-surface="true"
    >
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
          <p className="text-[14px] text-[#A0A0A0]">Drop references or start with a prompt</p>
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
                  isAnalyzing={isAnalyzing(item.id)}
                  onPointerDown={dragHandlers.onPointerDown}
                />
              );
            case "artboard":
              return (
                <CanvasArtboard
                  key={item.id}
                  item={item}
                  tokens={tokens}
                  isDragging={draggingId === item.id}
                  onPointerDown={dragHandlers.onPointerDown}
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
            default:
              return null;
          }
        })}
      </div>

      {/* Layers panel */}
      {showLayers && <LayersPanelV3 />}

      {/* Inspector panel */}
      {showInspector && <InspectorPanelV3 projectId={projectId} />}

      {/* Floating prompt panel */}
      <PromptPanel />

      {/* Bottom bar */}
      <BottomBarV3
        showLayers={showLayers}
        onToggleLayers={() => setShowLayers((v) => !v)}
        showInspector={showInspector}
        onToggleInspector={() => setShowInspector((v) => !v)}
      />
    </div>
  );
}
