"use client";

/**
 * EditorTransportBar — single bottom pill for canvas tools.
 */

import * as React from "react";
import {
  MousePointer2,
  Hand,
  MessageCircle,
  LayoutTemplate,
  Type,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TOOLS: Array<{
  id: string;
  label: string;
  shortcut: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
}> = [
  { id: "select", label: "Cursor", shortcut: "V", icon: MousePointer2 },
  { id: "hand", label: "Hand", shortcut: "H", icon: Hand },
  { id: "frame", label: "Frame", shortcut: "F", icon: LayoutTemplate },
  { id: "text", label: "Text", shortcut: "T", icon: Type },
  { id: "prompt", label: "Direction", shortcut: "K", icon: MessageCircle },
];

type EditorTransportBarProps = {
  activeTool: string;
  onToolChange: (tool: string) => void;
};

export function EditorTransportBar({
  activeTool,
  onToolChange,
}: EditorTransportBarProps) {
  return (
    <div
      className="absolute bottom-4 left-1/2 z-30 flex min-h-[42px] -translate-x-1/2 items-center gap-1.5 rounded-[8px] border-[0.5px] border-border-subtle bg-card-bg px-2 py-1.5 shadow-sm 2xl:bottom-[28px] 2xl:min-h-[48px] 2xl:gap-2.5 2xl:px-3 2xl:py-2"
      style={{ fontFamily: "'IBM Plex Mono', monospace" }}
    >
      <div
        className="flex flex-row gap-1"
        role="toolbar"
        aria-label="Canvas tools"
      >
        {TOOLS.map((tool) => (
          <TransportToolButton
            key={tool.id}
            tool={tool}
            isActive={activeTool === tool.id}
            onClick={() => onToolChange(tool.id)}
          />
        ))}
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
      aria-pressed={isActive}
      aria-label={tool.label}
      className={cn(
        "flex size-9 items-center justify-center rounded-[6px] transition-colors 2xl:size-10",
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
