"use client";

/**
 * V3 Bottom Bar — floating transport strip with zoom, undo/redo, and panel toggles.
 */

import * as React from "react";
import { Minus, Plus, Undo2, Redo2, PanelLeft, PanelRight, MessageSquareText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvas } from "@/lib/canvas/canvas-context";

type BottomBarV3Props = {
  showLayers: boolean;
  onToggleLayers: () => void;
  showInspector: boolean;
  onToggleInspector: () => void;
};

function BarButton({
  active,
  disabled,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-[2px] transition-colors duration-75",
        disabled && "opacity-30 cursor-default",
        !disabled && active
          ? "bg-[#D1E4FC]/30 text-[#1E5DF2]"
          : !disabled
          ? "text-[#A0A0A0] hover:bg-[#F5F5F0] hover:text-[#6B6B6B]"
          : ""
      )}
    >
      {children}
    </button>
  );
}

export function BottomBarV3({
  showLayers,
  onToggleLayers,
  showInspector,
  onToggleInspector,
}: BottomBarV3Props) {
  const { state, dispatch, canUndo, canRedo } = useCanvas();
  const zoom = state.viewport.zoom;
  const zoomPct = Math.round(zoom * 100);

  const handleZoomIn = () => {
    const newZoom = Math.min(3, zoom * 1.25);
    dispatch({ type: "SET_VIEWPORT", pan: state.viewport.pan, zoom: newZoom });
  };
  const handleZoomOut = () => {
    const newZoom = Math.max(0.05, zoom / 1.25);
    dispatch({ type: "SET_VIEWPORT", pan: state.viewport.pan, zoom: newZoom });
  };

  return (
    <div className="absolute bottom-3 left-1/2 z-30 -translate-x-1/2">
      <div className="flex items-center gap-1 rounded-[4px] border border-[#E5E5E0] bg-white/95 backdrop-blur-sm px-2 py-1 shadow-sm">
        {/* Left: zoom controls */}
        <BarButton onClick={handleZoomOut} title="Zoom out">
          <Minus size={14} strokeWidth={1.5} />
        </BarButton>
        <span className="w-10 text-center font-mono text-[11px] text-[#6B6B6B] select-none">
          {zoomPct}%
        </span>
        <BarButton onClick={handleZoomIn} title="Zoom in">
          <Plus size={14} strokeWidth={1.5} />
        </BarButton>

        <div className="mx-1.5 h-4 w-px bg-[#E5E5E0]" />

        {/* Center: undo/redo */}
        <BarButton onClick={() => dispatch({ type: "UNDO" })} title="Undo (⌘Z)" disabled={!canUndo}>
          <Undo2 size={14} strokeWidth={1.5} />
        </BarButton>
        <BarButton onClick={() => dispatch({ type: "REDO" })} title="Redo (⌘⇧Z)" disabled={!canRedo}>
          <Redo2 size={14} strokeWidth={1.5} />
        </BarButton>

        <div className="mx-1.5 h-4 w-px bg-[#E5E5E0]" />

        {/* Right: panel toggles */}
        <BarButton active={showLayers} onClick={onToggleLayers} title="Layers (L)">
          <PanelLeft size={14} strokeWidth={1.5} />
        </BarButton>
        <BarButton active={showInspector} onClick={onToggleInspector} title="Inspector (I)">
          <PanelRight size={14} strokeWidth={1.5} />
        </BarButton>
        <BarButton active={state.prompt.isOpen} onClick={() => dispatch({ type: "TOGGLE_PROMPT_PANEL" })} title="Prompt (P)">
          <MessageSquareText size={14} strokeWidth={1.5} />
        </BarButton>
      </div>
    </div>
  );
}
