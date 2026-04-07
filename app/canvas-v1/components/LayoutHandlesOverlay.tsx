"use client";

import * as React from "react";
import type { DesignNode, DesignNodeStyle } from "@/lib/canvas/design-node";
import { findDesignNodeById } from "@/lib/canvas/design-node";
import { GapHandle } from "./GapHandle";
import { MeasurementLabel } from "./MeasurementLabel";
import { useLayoutDrag } from "@/app/canvas-v1/hooks/useLayoutDrag";
import { calculateGapRects, deltaToGap, constrainValue, GapRect } from "@/app/canvas-v1/lib/layout-handle-math";

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
      const childElements = Array.from(parentEl.children).filter(
        (el): el is HTMLElement => el instanceof HTMLElement && el.hasAttribute("data-node-id")
      );
      
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
    
    // Commit the change
    onUpdateNodeStyle(selectedNodeId, { gap: dragState.currentValue });
    onPushHistory(`Adjusted gap to ${Math.round(dragState.currentValue)}px`);
    
    setDragState({
      isDragging: false,
      gapIndex: null,
      startValue: 0,
      currentValue: 0,
      pointerX: 0,
      pointerY: 0,
    });
  }, [dragState, selectedNodeId, onUpdateNodeStyle, onPushHistory]);
  
  // Handle keyboard cancel
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dragState.isDragging) {
        setDragState({
          isDragging: false,
          gapIndex: null,
          startValue: 0,
          currentValue: 0,
          pointerX: 0,
          pointerY: 0,
        });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dragState.isDragging]);
  
  if (!isLayoutContainer || gapRects.length === 0) return null;
  
  const direction = selectedNode!.style.flexDirection === "column" ? "column" : "row";
  
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
      {gapRects.map((gapRect, index) => (
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
      
      {/* Measurement label at pointer position during drag */}
      {dragState.isDragging && (
        <MeasurementLabel
          value={dragState.currentValue}
          x={dragState.pointerX}
          y={dragState.pointerY}
          visible={true}
          label="Gap"
        />
      )}
    </div>
  );
}
