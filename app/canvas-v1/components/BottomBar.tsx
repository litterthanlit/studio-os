"use client";

import * as React from "react";
import { Minus, Plus, PanelLeft, PanelRight, BookImage, Palette } from "lucide-react";
import { cn } from "@/lib/utils";

export type BottomBarProps = {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomSet?: (zoom: number) => void;
  showLayers: boolean;
  onToggleLayers: () => void;
  showInspector?: boolean;
  onToggleInspector?: () => void;
  referencesDockOpen: boolean;
  onToggleReferences: () => void;
  systemDockOpen: boolean;
  onToggleSystem: () => void;
};

function BarButton({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
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
        "flex h-7 w-7 items-center justify-center rounded-[2px] transition-colors duration-75",
        active
          ? "bg-[#D1E4FC]/30 text-[#4B57DB]"
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
  onZoomSet,
  showLayers,
  onToggleLayers,
  showInspector,
  onToggleInspector,
  referencesDockOpen,
  onToggleReferences,
  systemDockOpen,
  onToggleSystem,
}: BottomBarProps) {
  const pct = Math.round(zoom * 100);
  const [editing, setEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(String(pct));
  const inputRef = React.useRef<HTMLInputElement>(null);

  function commitZoom() {
    setEditing(false);
    const parsed = parseInt(editValue, 10);
    if (!isNaN(parsed) && parsed >= 10 && parsed <= 500 && onZoomSet) {
      onZoomSet(parsed / 100);
    }
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
      <div className="pointer-events-auto flex h-9 max-w-[480px] items-center gap-1 rounded-[4px] border border-[#E5E5E0] bg-white px-2 shadow-sm">
        {/* ── Zoom controls ── */}
        <BarButton onClick={onZoomOut} title="Zoom out (⌘−)">
          <Minus size={14} strokeWidth={1.5} />
        </BarButton>

        {editing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value.replace(/[^0-9]/g, ""))}
            onBlur={commitZoom}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitZoom();
              if (e.key === "Escape") setEditing(false);
            }}
            className="w-10 bg-transparent text-center font-mono text-[11px] text-[#1A1A1A] outline-none"
            autoFocus
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setEditValue(String(pct));
              setEditing(true);
            }}
            className="min-w-[40px] text-center font-mono text-[11px] tabular-nums text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
            title="Click to set zoom"
          >
            {pct}%
          </button>
        )}

        <BarButton onClick={onZoomIn} title="Zoom in (⌘+)">
          <Plus size={14} strokeWidth={1.5} />
        </BarButton>

        {/* ── Divider ── */}
        <div className="mx-1 h-4 w-px bg-[#E5E5E0]" />

        {/* ── Panel toggles ── */}
        <BarButton active={showLayers} onClick={onToggleLayers} title="Layers (L)">
          <PanelLeft size={14} strokeWidth={1.5} />
        </BarButton>

        {onToggleInspector && (
          <BarButton active={showInspector} onClick={onToggleInspector} title="Inspector (I)">
            <PanelRight size={14} strokeWidth={1.5} />
          </BarButton>
        )}

        <BarButton active={referencesDockOpen} onClick={onToggleReferences} title="References">
          <BookImage size={14} strokeWidth={1.5} />
        </BarButton>

        <BarButton active={systemDockOpen} onClick={onToggleSystem} title="Design tokens">
          <Palette size={14} strokeWidth={1.5} />
        </BarButton>
      </div>
    </div>
  );
}
