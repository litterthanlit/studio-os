"use client";

import { useCallback, useRef, useState, useEffect } from "react";

export type LayoutDragState = {
  isDragging: boolean;
  currentValue: number;
  deltaPixels: number;
};

export type UseLayoutDragOptions = {
  startValue: number;
  zoom: number;
  direction: "horizontal" | "vertical";
  min?: number;
  max?: number;
  increment?: number; // 10 for shift-key
  onChange: (value: number) => void;
  onCommit: (value: number) => void;
  onCancel: () => void;
};

export function useLayoutDrag(options: UseLayoutDragOptions) {
  const { startValue, zoom, direction, min = 0, max, increment = 1, onChange, onCommit, onCancel } = options;
  
  const [dragState, setDragState] = useState<LayoutDragState>({
    isDragging: false,
    currentValue: startValue,
    deltaPixels: 0,
  });
  
  const startPosRef = useRef({ x: 0, y: 0 });
  const startValueRef = useRef(startValue);
  const isShiftPressedRef = useRef(false);
  
  // Track shift key state
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift") isShiftPressedRef.current = true;
      if (e.key === "Escape" && dragState.isDragging) {
        setDragState({ isDragging: false, currentValue: startValueRef.current, deltaPixels: 0 });
        onCancel();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") isShiftPressedRef.current = false;
    };
    
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [dragState.isDragging, onCancel]);
  
  const startDrag = useCallback((pointerEvent: React.PointerEvent) => {
    pointerEvent.preventDefault();
    pointerEvent.stopPropagation();
    pointerEvent.currentTarget.setPointerCapture(pointerEvent.pointerId);
    
    startPosRef.current = { x: pointerEvent.clientX, y: pointerEvent.clientY };
    startValueRef.current = startValue;
    
    setDragState({
      isDragging: true,
      currentValue: startValue,
      deltaPixels: 0,
    });
  }, [startValue]);
  
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragState.isDragging) return;
    
    const deltaX = (e.clientX - startPosRef.current.x) / zoom;
    const deltaY = (e.clientY - startPosRef.current.y) / zoom;
    const delta = direction === "horizontal" ? deltaX : deltaY;
    
    // Apply shift increment if held
    const effectiveIncrement = isShiftPressedRef.current ? (increment > 1 ? increment : 10) : 1;
    let newValue = startValueRef.current + Math.round(delta / effectiveIncrement) * effectiveIncrement;
    
    // Constrain
    if (min !== undefined) newValue = Math.max(min, newValue);
    if (max !== undefined) newValue = Math.min(max, newValue);
    
    setDragState({
      isDragging: true,
      currentValue: newValue,
      deltaPixels: direction === "horizontal" ? e.clientX - startPosRef.current.x : e.clientY - startPosRef.current.y,
    });
    
    onChange(newValue);
  }, [dragState.isDragging, zoom, direction, min, max, increment, onChange]);
  
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragState.isDragging) return;
    
    e.currentTarget.releasePointerCapture(e.pointerId);
    
    setDragState(prev => ({ ...prev, isDragging: false }));
    onCommit(dragState.currentValue);
  }, [dragState.isDragging, dragState.currentValue, onCommit]);
  
  return {
    dragState,
    startDrag,
    handlePointerMove,
    handlePointerUp,
    isShiftPressed: () => isShiftPressedRef.current,
  };
}
