"use client";

/**
 * EditorTransportBar — floating bottom toolbar for canvas tools.
 */

import * as React from "react";
import {
  MousePointer2,
  Hand,
  Frame,
  Type,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TOOL_GROUPS: Array<
  Array<{
    id: string;
    label: string;
    shortcut: string;
    icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  }>
> = [
  [
    { id: "select", label: "Cursor", shortcut: "V", icon: MousePointer2 },
    { id: "hand", label: "Hand", shortcut: "H", icon: Hand },
  ],
  [
    { id: "frame", label: "Frame", shortcut: "F", icon: Frame },
    { id: "text", label: "Text", shortcut: "T", icon: Type },
  ],
  [{ id: "prompt", label: "Direction", shortcut: "K", icon: Sparkles }],
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
      className="absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-[6px] border-[0.5px] border-border-subtle bg-card-bg px-2 py-1.5 shadow-sm 2xl:bottom-7 2xl:px-2.5 2xl:py-2"
      style={{ fontFamily: "'IBM Plex Mono', monospace" }}
    >
      <div
        className="flex flex-row items-center gap-1"
        role="toolbar"
        aria-label="Canvas tools"
      >
        {TOOL_GROUPS.map((group, groupIndex) => (
          <React.Fragment key={group.map((tool) => tool.id).join("-")}>
            {groupIndex > 0 && (
              <div
                className="mx-1 h-5 w-px shrink-0 bg-border-subtle 2xl:mx-1.5"
                aria-hidden="true"
              />
            )}
            {group.map((tool) => (
              <TransportToolButton
                key={tool.id}
                tool={tool}
                isActive={activeTool === tool.id}
                onClick={() => onToolChange(tool.id)}
              />
            ))}
          </React.Fragment>
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
  tool: (typeof TOOL_GROUPS)[number][number];
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
        "flex size-9 items-center justify-center rounded-[4px] transition-colors 2xl:size-10",
        isActive
          ? "bg-accent-subtle text-accent"
          : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
      )}
      title={title}
      onClick={onClick}
    >
      <Icon size={18} strokeWidth={1.5} />
    </button>
  );
}
