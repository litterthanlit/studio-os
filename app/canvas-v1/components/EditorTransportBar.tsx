"use client";

/**
 * EditorTransportBar — single bottom pill: tools (cursor / hand / marquee / prompt),
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvas } from "@/lib/canvas/canvas-context";
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
  const { dispatch, canUndo, canRedo } = useCanvas();
  const [editingZoom, setEditingZoom] = React.useState(false);
  const [zoomInput, setZoomInput] = React.useState("");
  const displayPercent = Math.round(zoom * 100);

  return (
    <div
      className="absolute bottom-[12px] left-1/2 -translate-x-1/2 z-30 flex h-[32px] items-center gap-1.5 rounded-[4px] border-[0.5px] border-border-subtle bg-card-bg px-2 py-1"
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

      <div className="flex items-center gap-1 pr-1 border-r border-border-subtle">
        <button
          type="button"
          title="Undo (⌘Z)"
          disabled={!canUndo}
          onClick={() => dispatch({ type: "UNDO" })}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-[2px] transition-colors",
            canUndo
              ? "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
              : "text-text-muted cursor-not-allowed opacity-40"
          )}
        >
          <Undo2 size={15} strokeWidth={1.5} />
        </button>
        <button
          type="button"
          title="Redo (⌘⇧Z)"
          disabled={!canRedo}
          onClick={() => dispatch({ type: "REDO" })}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-[2px] transition-colors",
            canRedo
              ? "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
              : "text-text-muted cursor-not-allowed opacity-40"
          )}
        >
          <Redo2 size={15} strokeWidth={1.5} />
        </button>
      </div>

      <div className="flex items-center gap-2 pl-0.5">
        {onGenerate && (
          <StudioButton
            type="button"
            variant="primary"
            className="h-[22px] px-2.5 py-0 text-[11px] shrink-0"
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
            className="w-[40px] border-none bg-transparent text-center text-[11px] text-text-primary outline-none"
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
            className="min-w-[36px] cursor-pointer text-[11px] text-text-secondary"
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
        "flex h-7 w-7 items-center justify-center rounded-[2px] transition-colors",
        isActive
          ? "bg-accent-light/30 text-accent"
          : "text-text-muted hover:bg-surface-hover hover:text-text-secondary"
      )}
      title={title}
      onClick={onClick}
    >
      <Icon size={16} strokeWidth={1.5} />
    </button>
  );
}
