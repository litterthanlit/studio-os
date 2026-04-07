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
    if (!isLayoutContainer || !containerRef.current || !selectedNodeId) {
      setGapRects([]);
      return;
    }
    
    const container = containerRef.current;
    const parentEl = container.querySelector<HTMLElement>(`[data-node-id="${selectedNodeId}"]`);
    if (!parentEl) {
      setGapRects([]);
      return;
    }
    
    const measure = () => {
      const parentRect = parentEl.getBoundingClientRect();
      
      // FIX: Use querySelectorAll to find ALL descendant elements with data-node-id,
      // not just direct children. This handles cases where children are wrapped
      // in intermediate divs (e.g., when a frame has coverImage).
      const childElements = Array.from(parentEl.querySelectorAll<HTMLElement>(":scope > [data-node-id], :scope > div > [data-node-id]"));
      
      if (childElements.length < 2) {
        setGapRects([]);
        return;
      }
      
      const childRects = childElements.map(el => el.getBoundingClientRect());
      const direction = selectedNode!.style.flexDirection === "column" ? "column" : "row";
      const rects = calculateGapRects(parentRect, childRects, direction);
      setGapRects(rects);
    };
    
    measure();
    
    // Re-measure on resize
    const observer = new ResizeObserver(measure);
    observer.observe(parentEl);
    
    return () => observer.disconnect();
  }, [selectedNodeId, selectedNode, isLayoutContainer, containerRef, tree]);
  
  // Measure padding when selection changes
  React.useEffect(() => {
    if (!selectedNodeId || !containerRef.current) {
      setPaddingPositions([]);
      return;
    }
    
    const container = containerRef.current;
    const nodeEl = container.querySelector<HTMLElement>(`[data-node-id="${selectedNodeId}"]`);
    if (!nodeEl) {
      setPaddingPositions([]);
      return;
    }
    
    const measure = () => {
      const nodeRect = nodeEl.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const relativeRect = {
        x: nodeRect.left - containerRect.left,
        y: nodeRect.top - containerRect.top,
        width: nodeRect.width,
        height: nodeRect.height,
      };
      
      const padding = selectedNode?.style.padding || {};
      const positions = calculatePaddingPositions(relativeRect, padding);
      setPaddingPositions(positions);
    };
    
    measure();
    
    const observer = new ResizeObserver(measure);
    observer.observe(nodeEl);
    
    return () => observer.disconnect();
  }, [selectedNodeId, selectedNode, containerRef]);
  
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
    const deltaX = (e.clientX - dragState.pointerX) / zoom;
    const deltaY = (e.clientY - dragState.pointerY) / zoom;
    const deltaPixels = direction === "row" ? deltaX : deltaY;
    
    // Check shift key
    const isShift = e.shiftKey;
    const increment = isShift ? 10 : 1;
    
    const newValue = constrainValue(
      dragState.startValue + Math.round(deltaPixels / increment) * increment,
      0
    );
    
    setDragState(prev => ({
      ...prev,
      currentValue: newValue,
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
    
    setPaddingDragState(prev => ({
      ...prev,
      currentValue: newValue,
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
  
  // Skip during SSR and if nothing to show
  if (!isMounted || (!showPaddingHandles && !showGapHandles)) return null;
  
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
      {showGapHandles && gapRects.map((gapRect, index) => (
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
      
      {/* Measurement label at pointer position during gap drag */}
      {dragState.isDragging && (
        <MeasurementLabel
          value={dragState.currentValue}
          x={dragState.pointerX}
          y={dragState.pointerY}
          visible={true}
          label="Gap"
        />
      )}
      
      {/* Padding handles */}
      {showPaddingHandles && paddingPositions.map((position) => (
        <PaddingHandle
          key={`padding-${position.side}`}
          position={position}
          zoom={zoom}
          isHovered={hoveredPaddingSide === position.side}
          isDragging={paddingDragState.isDragging && paddingDragState.side === position.side}
          dragValue={paddingDragState.side === position.side ? paddingDragState.currentValue : undefined}
          onHover={(hovered) => setHoveredPaddingSide(hovered ? position.side : null)}
          onDragStart={(e) => handlePaddingDragStart(position.side, e)}
          onDragMove={handlePaddingDragMove}
          onDragEnd={handlePaddingDragEnd}
        />
      ))}

      {/* Measurement label for padding drag */}
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
