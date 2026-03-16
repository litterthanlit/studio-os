"use client";

import * as React from "react";
import { Map, BookImage, Palette, Minus, Plus, PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { DitherSurface } from "@/components/ui/dither-surface";

export type BottomBarProps = {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  showLayers: boolean;
  onToggleLayers: () => void;
  showMinimap: boolean;
  onToggleMinimap: () => void;
  referencesDockOpen: boolean;
  onToggleReferences: () => void;
  systemDockOpen: boolean;
  onToggleSystem: () => void;
};

function ToggleBtn({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-[4px] transition-colors duration-100",
        active
          ? "bg-[#D1E4FC] text-[#1E5DF2]"
          : "text-[#A0A0A0] hover:bg-[#F5F5F0] hover:text-[#6B6B6B]"
      )}
    >
      {children}
    </button>
  );
}

export function BottomBar({
  zoom,
  onZoomIn,
  onZoomOut,
  showLayers,
  onToggleLayers,
  showMinimap,
  onToggleMinimap,
  referencesDockOpen,
  onToggleReferences,
  systemDockOpen,
  onToggleSystem,
}: BottomBarProps) {
  const pct = Math.round(zoom * 100);

  return (
    <DitherSurface
      patternVariant="band"
      patternTone="warm"
      patternDensity="sm"
      muted
      className="flex h-[44px] shrink-0 items-center rounded-none border-x-0 border-b-0 px-3"
    >
      {/* Left: Zoom controls */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onZoomOut}
          title="Zoom out"
          className="flex h-7 w-7 items-center justify-center rounded-[4px] text-[#A0A0A0] transition-colors duration-100 hover:bg-[#F5F5F0] hover:text-[#6B6B6B]"
        >
          <Minus size={14} strokeWidth={1.5} />
        </button>
        <span
          className="min-w-[42px] text-center text-[12px] tabular-nums text-[#6B6B6B] select-none"
          style={{ fontFamily: "'Geist Mono', monospace" }}
        >
          {pct}%
        </span>
        <button
          type="button"
          onClick={onZoomIn}
          title="Zoom in"
          className="flex h-7 w-7 items-center justify-center rounded-[4px] text-[#A0A0A0] transition-colors duration-100 hover:bg-[#F5F5F0] hover:text-[#6B6B6B]"
        >
          <Plus size={14} strokeWidth={1.5} />
        </button>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Center: Toggles */}
      <div className="flex items-center gap-1">
        <ToggleBtn
          active={showLayers}
          onClick={onToggleLayers}
          title="Toggle layers (L)"
        >
          <PanelLeft size={16} strokeWidth={1.5} />
        </ToggleBtn>
        <ToggleBtn
          active={showMinimap}
          onClick={onToggleMinimap}
          title="Toggle minimap (M)"
        >
          <Map size={16} strokeWidth={1.5} />
        </ToggleBtn>
        <ToggleBtn
          active={referencesDockOpen}
          onClick={onToggleReferences}
          title="Toggle references"
        >
          <BookImage size={16} strokeWidth={1.5} />
        </ToggleBtn>
        <ToggleBtn
          active={systemDockOpen}
          onClick={onToggleSystem}
          title="Toggle tokens"
        >
          <Palette size={16} strokeWidth={1.5} />
        </ToggleBtn>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right: empty slot (reserved for future status) */}
      <div className="w-[88px]" />
    </DitherSurface>
  );
}
