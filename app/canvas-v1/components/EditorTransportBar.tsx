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
      className="absolute bottom-[32px] left-1/2 z-30 flex h-[40px] -translate-x-1/2 items-center gap-2 rounded-[6px] border-[0.5px] border-border-subtle bg-card-bg px-2.5 py-1"
      style={{ fontFamily: "'IBM Plex Mono', monospace" }}
    >
      <div className="flex flex-row gap-0.5">
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
          className="h-[28px] shrink-0 px-3 py-0 text-[12px]"
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
