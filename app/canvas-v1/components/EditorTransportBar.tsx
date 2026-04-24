"use client";

/**
 * EditorTransportBar — single bottom pill: tools (cursor / hand / frame / text / prompt),
 * optional Generate. Replaces separate ToolPalette + BottomBarV3.
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
import { StudioButton } from "@/components/ui/studio-button";

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
  { id: "prompt", label: "Prompt / chat", shortcut: "K", icon: MessageCircle },
];

type EditorTransportBarProps = {
  activeTool: string;
  onToolChange: (tool: string) => void;
  onGenerate?: () => void;
};

export function EditorTransportBar({
  activeTool,
  onToolChange,
  onGenerate,
}: EditorTransportBarProps) {
  return (
    <div
      className="absolute bottom-[28px] left-1/2 z-30 flex min-h-[48px] -translate-x-1/2 items-center gap-2.5 rounded-[8px] border-[0.5px] border-border-subtle bg-card-bg px-3 py-2 shadow-sm"
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
      {onGenerate && (
        <StudioButton
          type="button"
          variant="primary"
          className="min-h-10 shrink-0 px-4 py-2 text-[12px]"
          onClick={onGenerate}
        >
          Generate
        </StudioButton>
      )}
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
        "flex h-10 w-10 items-center justify-center rounded-[6px] transition-colors",
        isActive
          ? "bg-accent-light/30 text-accent"
          : "text-text-muted hover:bg-surface-hover hover:text-text-secondary"
      )}
      title={title}
      onClick={onClick}
    >
      <Icon size={20} strokeWidth={1.5} />
    </button>
  );
}
