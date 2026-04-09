"use client";

/**
 * EditorTransportBar — single bottom pill: tools (cursor / hand / marquee / frame / text / prompt),
 * zoom, optional Generate, undo/redo. Replaces separate ToolPalette + BottomBarV3.
 */

import * as React from "react";
import {
  MousePointer2,
  Hand,
  BoxSelect,
  MessageCircle,
  Undo2,
  Redo2,
  LayoutTemplate,
  Type,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvas } from "@/lib/canvas/canvas-context";
import { Breakpoint } from "@/lib/canvas/unified-canvas-state";
import { StudioButton } from "@/components/ui/studio-button";

const TOOLS: Array<{
  id: string;
  label: string;
  shortcut: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
}> = [
  { id: "select", label: "Cursor", shortcut: "V", icon: MousePointer2 },
  { id: "hand", label: "Hand", shortcut: "H", icon: Hand },
  { id: "marquee", label: "Marquee", shortcut: "M", icon: BoxSelect },
  { id: "frame", label: "Frame", shortcut: "F", icon: LayoutTemplate },
  { id: "text", label: "Text", shortcut: "T", icon: Type },
  { id: "prompt", label: "Prompt / chat", shortcut: "K", icon: MessageCircle },
];

type EditorTransportBarProps = {
  activeTool: string;
  onToolChange: (tool: string) => void;
  zoom: number;
  onZoomChange: (z: number) => void;
  onZoomToFit: () => void;
  onGenerate?: () => void;
};

export function EditorTransportBar({
  activeTool,
  onToolChange,
  zoom,
  onZoomChange,
  onZoomToFit,
  onGenerate,
}: EditorTransportBarProps) {
  const { state, dispatch, canUndo, canRedo } = useCanvas();
  const activeBreakpoint = state.activeBreakpoint ?? "desktop";
  const [editingZoom, setEditingZoom] = React.useState(false);
  const [zoomInput, setZoomInput] = React.useState("");
  const displayPercent = Math.round(zoom * 100);

  return (
    <div
      className="absolute bottom-[32px] left-1/2 -translate-x-1/2 z-30 flex h-[40px] items-center gap-2 rounded-[6px] border-[0.5px] border-border-subtle bg-card-bg px-2.5 py-1"
      style={{ fontFamily: "'IBM Plex Mono', monospace" }}
    >
      <div className="flex flex-row gap-0.5 pr-1 border-r border-border-subtle">
        {TOOLS.map((tool) => (
          <TransportToolButton
            key={tool.id}
            tool={tool}
            isActive={activeTool === tool.id}
            onClick={() => onToolChange(tool.id)}
          />
        ))}
      </div>

      <div className="flex items-center gap-1 pr-1.5 border-r border-border-subtle">
        <button
          type="button"
          title="Undo (⌘Z)"
          disabled={!canUndo}
          onClick={() => dispatch({ type: "UNDO" })}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-[4px] transition-colors",
            canUndo
              ? "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
              : "text-text-muted cursor-not-allowed opacity-40"
          )}
        >
          <Undo2 size={17} strokeWidth={1.5} />
        </button>
        <button
          type="button"
          title="Redo (⌘⇧Z)"
          disabled={!canRedo}
          onClick={() => dispatch({ type: "REDO" })}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-[4px] transition-colors",
            canRedo
              ? "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
              : "text-text-muted cursor-not-allowed opacity-40"
          )}
        >
          <Redo2 size={17} strokeWidth={1.5} />
        </button>
      </div>

      {/* Breakpoint switcher */}
      <div className="w-px h-5 bg-border-subtle mx-0.5" />
      <div className="flex flex-col items-center gap-0.5">
        <span
          className="text-[9px] uppercase tracking-[0.1em] text-text-muted select-none"
          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
        >
          Breakpoint
        </span>
        <div className="flex h-[22px] rounded-[2px] border border-border-control overflow-hidden">
          {(["desktop", "mobile"] as Breakpoint[]).map((bp) => (
            <button
              key={bp}
              type="button"
              onClick={() => dispatch({ type: "SET_ACTIVE_BREAKPOINT", breakpoint: bp })}
              className={`px-2 text-[10px] font-medium transition-colors ${
                activeBreakpoint === bp
                  ? "bg-[#4B57DB] text-white"
                  : "bg-card-bg text-text-secondary hover:text-text-primary"
              }`}
            >
              {bp === "desktop" ? "Desktop" : "Mobile"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2.5 pl-0.5">
        {onGenerate && (
          <StudioButton
            type="button"
            variant="primary"
            className="h-[28px] px-3 py-0 text-[12px] shrink-0"
            onClick={onGenerate}
          >
            Generate
          </StudioButton>
        )}
        {editingZoom ? (
          <input
            autoFocus
            value={zoomInput}
            onChange={(e) => setZoomInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const val = parseInt(zoomInput, 10);
                if (!isNaN(val) && val >= 10 && val <= 800) {
                  onZoomChange(val / 100);
                }
                setEditingZoom(false);
              }
              if (e.key === "Escape") setEditingZoom(false);
            }}
            onBlur={() => setEditingZoom(false)}
            className="w-[48px] border-none bg-transparent text-center text-[12px] text-text-primary outline-none"
            style={{ fontFamily: "inherit" }}
          />
        ) : (
          <span
            onClick={() => {
              setEditingZoom(true);
              setZoomInput(String(displayPercent));
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              onZoomToFit();
            }}
            className="min-w-[42px] cursor-pointer text-[12px] text-text-secondary"
          >
            {displayPercent}%
          </span>
        )}
      </div>
    </div>
  );
}

function TransportToolButton({
  tool,
  isActive,
  onClick,
}: {
  tool: (typeof TOOLS)[number];
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = tool.icon;
  const title = tool.shortcut ? `${tool.label} (${tool.shortcut})` : tool.label;

  return (
    <button
      type="button"
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-[4px] transition-colors",
        isActive
          ? "bg-accent-light/30 text-accent"
          : "text-text-muted hover:bg-surface-hover hover:text-text-secondary"
      )}
      title={title}
      onClick={onClick}
    >
      <Icon size={18} strokeWidth={1.5} />
    </button>
  );
}
