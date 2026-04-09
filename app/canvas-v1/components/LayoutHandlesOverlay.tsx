"use client";

import * as React from "react";
import type { DesignNode, DesignNodeStyle } from "@/lib/canvas/design-node";
import { findDesignNodeById } from "@/lib/canvas/design-node";
import { GapHandle } from "./GapHandle";
import { PaddingHandle } from "./PaddingHandle";
import { MeasurementLabel } from "./MeasurementLabel";
import { useLayoutDrag } from "@/app/canvas-v1/hooks/useLayoutDrag";
import { 
  calculateGapRects, 
  deltaToGap, 
  constrainValue, 
  type GapRect,
  calculatePaddingPositions, 
  deltaToPadding, 
  mergePadding,
  applyPaddingModifiers,
  type PaddingHandlePosition 
} from "@/app/canvas-v1/lib/layout-handle-math";

export type LayoutHandlesOverlayProps = {
  tree: DesignNode;
  selectedNodeId: string | null;
  zoom: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onUpdateNodeStyle: (nodeId: string, style: Partial<DesignNodeStyle>) => void;
  onPushHistory: (description: string) => void;
};

export function LayoutHandlesOverlay({
  tree,
  selectedNodeId,
  zoom,
  containerRef,
  onUpdateNodeStyle,
  onPushHistory,
}: LayoutHandlesOverlayProps) {
  // Skip SSR - DOM-dependent component
  const [isMounted, setIsMounted] = React.useState(false);
  React.useEffect(() => {
    setIsMounted(true);
  }, []);
  
  const [hoveredGapIndex, setHoveredGapIndex] = React.useState<number | null>(null);
  const [gapRects, setGapRects] = React.useState<GapRect[]>([]);
  const [dragState, setDragState] = React.useState<{
    isDragging: boolean;
    gapIndex: number | null;
    startValue: number;
    currentValue: number;
    pointerX: number;
    pointerY: number;
  }>({
    isDragging: false,
    gapIndex: null,
    startValue: 0,
    currentValue: 0,
    pointerX: 0,
    pointerY: 0,
  });
  const [paddingPositions, setPaddingPositions] = React.useState<PaddingHandlePosition[]>([]);
  const [hoveredPaddingSide, setHoveredPaddingSide] = React.useState<string | null>(null);
  const [paddingDragState, setPaddingDragState] = React.useState<{
    isDragging: boolean;
    side: "top" | "right" | "bottom" | "left" | null;
    startValue: number;
    currentValue: number;
    pointerX: number;
    pointerY: number;
    modifiers: { shift: boolean; option: boolean };
  }>({
    isDragging: false,
    side: null,
    startValue: 0,
    currentValue: 0,
    pointerX: 0,
    pointerY: 0,
    modifiers: { shift: false, option: false },
  });
  
  const selectedNode = selectedNodeId ? findDesignNodeById(tree, selectedNodeId) : null;
  const isLayoutContainer = selectedNode && 
    (selectedNode.style.display === "flex" || selectedNode.style.display === "grid") &&
    (selectedNode.children && selectedNode.children.length > 1);
  
  // Measure gaps when selection changes
  React.useEffect(() => {
    if (!isLayoutContainer || !containerRef.current || !selectedNodeId || !selectedNode) {
      setGapRects([]);
      return;
    }

    const container = containerRef.current;
    const parentEl = container.querySelector<HTMLElement>(
      `[data-node-id="${selectedNodeId}"]`
    );

    if (!parentEl) {
      setGapRects([]);
      return;
    }

    const z = zoom > 0 ? zoom : 1;

    const measure = () => {
      const containerRect = container.getBoundingClientRect();
      const parentRect = parentEl.getBoundingClientRect();

      // Resolve DOM nodes for each tree child (handles wrapper divs, coverImage, etc.)
      const treeChildren = selectedNode.children ?? [];
      const finalChildren: HTMLElement[] = [];
      for (const child of treeChildren) {
        const el = parentEl.querySelector<HTMLElement>(
          `[data-node-id="${child.id}"]`
        );
        if (el && el !== parentEl) finalChildren.push(el);
      }

      if (finalChildren.length < 2) {
        setGapRects([]);
        return;
      }

      const childRects = finalChildren.map((el) => el.getBoundingClientRect());
      const direction =
        selectedNode.style.flexDirection === "column" ? "column" : "row";
      const rects = calculateGapRects(parentRect, childRects, direction);

      // Match ResizeOverlay: rect math from getBoundingClientRect is in screen space
      // inside a CSS transform:scale(zoom) subtree — convert to container-local CSS px.
      const ox = (parentRect.left - containerRect.left) / z;
      const oy = (parentRect.top - containerRect.top) / z;
      const transformed = rects.map((r) => ({
        ...r,
        x: ox + r.x / z,
        y: oy + r.y / z,
        width: r.width / z,
        height: r.height / z,
        centerX: ox + r.centerX / z,
        centerY: oy + r.centerY / z,
      }));

      // #region agent log
      fetch("http://127.0.0.1:7393/ingest/391248b0-24d6-418e-a9f6-e5cbe0f87918", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "f3006b" },
        body: JSON.stringify({
          sessionId: "f3006b",
          id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          hypothesisId: "H5-gap-measure",
          runId: "initial-pass",
          location: "LayoutHandlesOverlay:measureGapRects",
          message: "measured selected layout container for gap handles",
          data: {
            selectedNodeId,
            display: selectedNode.style.display ?? null,
            flexDirection: selectedNode.style.flexDirection ?? null,
            treeChildCount: treeChildren.length,
            domChildCount: finalChildren.length,
            gapRectCount: transformed.length,
            firstGap: transformed[0] ?? null,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      setGapRects(transformed);
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(parentEl);

    return () => observer.disconnect();
  }, [selectedNodeId, selectedNode, isLayoutContainer, containerRef, tree, zoom]);
  
  // Measure padding when selection changes
  React.useEffect(() => {
    if (!selectedNodeId || !containerRef.current) {
      setPaddingPositions([]);
      return;
    }

    const container = containerRef.current;
    const nodeEl = container.querySelector<HTMLElement>(
      `[data-node-id="${selectedNodeId}"]`
    );
    if (!nodeEl) {
      setPaddingPositions([]);
      return;
    }

    const z = zoom > 0 ? zoom : 1;

    const measure = () => {
      const nodeRect = nodeEl.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const relativeRect = {
        x: (nodeRect.left - containerRect.left) / z,
        y: (nodeRect.top - containerRect.top) / z,
        width: nodeRect.width / z,
        height: nodeRect.height / z,
      };

      const padding = selectedNode?.style.padding || {};
      const positions = calculatePaddingPositions(relativeRect, padding);
      setPaddingPositions(positions);
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(nodeEl);

    return () => observer.disconnect();
  }, [selectedNodeId, selectedNode, containerRef, zoom]);
  
  const handleGapDragStart = React.useCallback((gapIndex: number, pointerEvent: React.PointerEvent) => {
    const gapRect = gapRects[gapIndex];
    if (!gapRect || !selectedNode) return;
    
    const startValue = selectedNode.style.gap ?? 0;
    
    setDragState({
      isDragging: true,
      gapIndex,
      startValue,
      currentValue: startValue,
      pointerX: pointerEvent.clientX,
      pointerY: pointerEvent.clientY,
    });
    
    // Capture pointer
    (pointerEvent.currentTarget as HTMLElement).setPointerCapture(pointerEvent.pointerId);
  }, [gapRects, selectedNode]);
  
  const handleGapDragMove = React.useCallback((e: React.PointerEvent) => {
    if (!dragState.isDragging || dragState.gapIndex === null || !selectedNode) return;
    
    const direction = selectedNode.style.flexDirection === "column" ? "column" : "row";
    const deltaX = (e.clientX - dragState.pointerX) / (zoom > 0 ? zoom : 1);
    const deltaY = (e.clientY - dragState.pointerY) / (zoom > 0 ? zoom : 1);
    const deltaPixels = direction === "row" ? deltaX : deltaY;
    
    // Check shift key
    const isShift = e.shiftKey;
    const increment = isShift ? 10 : 1;
    
    const newValue = constrainValue(
      dragState.startValue + Math.round(deltaPixels / increment) * increment,
      0
    );
    
    setDragState((prev) => ({
      ...prev,
      currentValue: newValue,
      pointerX: e.clientX,
      pointerY: e.clientY,
    }));
  }, [dragState, selectedNode, zoom]);
  
  const handleGapDragEnd = React.useCallback((e: React.PointerEvent) => {
    if (!dragState.isDragging || dragState.gapIndex === null || !selectedNodeId) return;
    
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    
    // Capture final value before clearing state
    const finalValue = dragState.currentValue;
    
    // Clear drag state first (must happen before dispatch to avoid render-phase update)
    setDragState({
      isDragging: false,
      gapIndex: null,
      startValue: 0,
      currentValue: 0,
      pointerX: 0,
      pointerY: 0,
    });
    
    // Defer the dispatch to avoid "setState during render" error
    React.startTransition(() => {
      onUpdateNodeStyle(selectedNodeId, { gap: finalValue });
      onPushHistory(`Adjusted gap to ${Math.round(finalValue)}px`);
    });
  }, [dragState, selectedNodeId, onUpdateNodeStyle, onPushHistory]);
  
  const handlePaddingDragStart = React.useCallback((side: "top" | "right" | "bottom" | "left", pointerEvent: React.PointerEvent) => {
    const position = paddingPositions.find(p => p.side === side);
    if (!position || !selectedNode) return;
    
    const startValue = position.currentValue;
    const isShift = pointerEvent.shiftKey;
    const isOption = pointerEvent.altKey || pointerEvent.metaKey; // Option on Mac
    
    setPaddingDragState({
      isDragging: true,
      side,
      startValue,
      currentValue: startValue,
      pointerX: pointerEvent.clientX,
      pointerY: pointerEvent.clientY,
      modifiers: { shift: isShift, option: isOption },
    });
    
    (pointerEvent.currentTarget as HTMLElement).setPointerCapture(pointerEvent.pointerId);
  }, [paddingPositions, selectedNode]);
  
  const handlePaddingDragMove = React.useCallback((e: React.PointerEvent) => {
    if (!paddingDragState.isDragging || !paddingDragState.side || !selectedNode) return;
    
    const side = paddingDragState.side;
    const deltaX = e.clientX - paddingDragState.pointerX;
    const deltaY = e.clientY - paddingDragState.pointerY;
    const deltaPixels = side === "left" || side === "right" ? deltaX : deltaY;
    
    // Apply shift snapping
    const isShift = e.shiftKey;
    const increment = isShift ? 10 : 1;
    const rawDelta = deltaToPadding(deltaPixels, side, zoom);
    const snappedDelta = Math.round(rawDelta / increment) * increment;
    
    const newValue = constrainValue(paddingDragState.startValue + snappedDelta, 0);
    
    setPaddingDragState((prev) => ({
      ...prev,
      currentValue: newValue,
      pointerX: e.clientX,
      pointerY: e.clientY,
      modifiers: { ...prev.modifiers, shift: isShift },
    }));
  }, [paddingDragState, selectedNode, zoom]);
  
  const handlePaddingDragEnd = React.useCallback((e: React.PointerEvent) => {
    if (!paddingDragState.isDragging || !paddingDragState.side || !selectedNodeId || !selectedNode) return;
    
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    
    const side = paddingDragState.side;
    const newValue = paddingDragState.currentValue;
    
    // Apply modifiers for final value
    const currentPadding = selectedNode.style.padding || {};
    const finalPadding = applyPaddingModifiers(
      currentPadding,
      side,
      newValue,
      paddingDragState.modifiers
    );
    
    // Capture description before clearing state
    const description = `Adjusted ${side} padding to ${Math.round(newValue)}px`;
    
    // Clear drag state first (must happen before dispatch to avoid render-phase update)
    setPaddingDragState({
      isDragging: false,
      side: null,
      startValue: 0,
      currentValue: 0,
      pointerX: 0,
      pointerY: 0,
      modifiers: { shift: false, option: false },
    });
    
    // Defer the dispatch to avoid "setState during render" error
    React.startTransition(() => {
      // CRITICAL: Emit full merged padding object (prevents shallow-merge bug)
      onUpdateNodeStyle(selectedNodeId, { padding: finalPadding });
      onPushHistory(description);
    });
  }, [paddingDragState, selectedNodeId, selectedNode, onUpdateNodeStyle, onPushHistory]);
  
  // Handle keyboard cancel
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && (dragState.isDragging || paddingDragState.isDragging)) {
        // Cancel both gap and padding drag
        setDragState({ isDragging: false, gapIndex: null, startValue: 0, currentValue: 0, pointerX: 0, pointerY: 0 });
        setPaddingDragState({ isDragging: false, side: null, startValue: 0, currentValue: 0, pointerX: 0, pointerY: 0, modifiers: { shift: false, option: false } });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dragState.isDragging, paddingDragState.isDragging]);
  
  // Padding handles show on ANY selected frame
  const showPaddingHandles = !!selectedNodeId;
  const showGapHandles = isLayoutContainer && gapRects.length > 0;

  React.useEffect(() => {
    if (!selectedNodeId || !selectedNode) return;
    // #region agent log
    fetch("http://127.0.0.1:7393/ingest/391248b0-24d6-418e-a9f6-e5cbe0f87918", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "f3006b" },
      body: JSON.stringify({
        sessionId: "f3006b",
        id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        hypothesisId: "H8-gap-eligibility",
        runId: "initial-pass",
        location: "LayoutHandlesOverlay:eligibility",
        message: "evaluated selected node for layout handles",
        data: {
          selectedNodeId,
          nodeType: selectedNode.type,
          display: selectedNode.style.display ?? null,
          flexDirection: selectedNode.style.flexDirection ?? null,
          childCount: selectedNode.children?.length ?? 0,
          isLayoutContainer: Boolean(isLayoutContainer),
          showGapHandles,
          showPaddingHandles,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, [isLayoutContainer, selectedNode, selectedNodeId, showGapHandles, showPaddingHandles]);
  
  // Skip during SSR and if nothing to show
  if (!isMounted || (!showPaddingHandles && !showGapHandles)) {
    return null;
  }
  
  const direction = selectedNode?.style.flexDirection === "column" ? "column" : "row";
  
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 11, // Above ResizeOverlay (10), below text editing
      }}
    >
      {/* Gap handles */}
      {showGapHandles &&
        gapRects.map((gapRect, index) => (
          <GapHandle
            key={`gap-${index}`}
            gapRect={gapRect}
            currentValue={selectedNode!.style.gap ?? 0}
            direction={direction}
            zoom={zoom}
            isHovered={hoveredGapIndex === index}
            isDragging={dragState.isDragging && dragState.gapIndex === index}
            dragValue={dragState.currentValue}
            onHover={(hovered) => setHoveredGapIndex(hovered ? index : null)}
            onDragStart={(e) => handleGapDragStart(index, e)}
            onDragMove={handleGapDragMove}
            onDragEnd={handleGapDragEnd}
          />
        ))}

      {/* Padding handles */}
      {showPaddingHandles &&
        paddingPositions.map((position) => (
          <PaddingHandle
            key={`padding-${position.side}`}
            position={position}
            zoom={zoom}
            isHovered={hoveredPaddingSide === position.side}
            isDragging={
              paddingDragState.isDragging &&
              paddingDragState.side === position.side
            }
            dragValue={
              paddingDragState.side === position.side
                ? paddingDragState.currentValue
                : undefined
            }
            onHover={(hovered) =>
              setHoveredPaddingSide(hovered ? position.side : null)
            }
            onDragStart={(e) => handlePaddingDragStart(position.side, e)}
            onDragMove={handlePaddingDragMove}
            onDragEnd={handlePaddingDragEnd}
          />
        ))}

      {/* Measurement labels: fixed positioning, outside pointer-capture layer */}
      {dragState.isDragging && (
        <MeasurementLabel
          value={dragState.currentValue}
          x={dragState.pointerX}
          y={dragState.pointerY}
          visible={true}
          label="Gap"
        />
      )}

      {paddingDragState.isDragging && (
        <MeasurementLabel
          value={paddingDragState.currentValue}
          x={paddingDragState.pointerX}
          y={paddingDragState.pointerY}
          visible={true}
          label={`Padding ${paddingDragState.side}`}
        />
      )}
    </div>
  );
}
