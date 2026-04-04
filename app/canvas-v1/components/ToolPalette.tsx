"use client";

/**
 * ToolPalette — horizontal floating tool strip at the bottom-center of the canvas.
 *
 * Inspired by Paper.design's minimal tool palette. Positioned above the
 * BottomBarV3 zoom strip. Hand tool enables canvas panning via useCanvasGestures.
 */

import { MousePointer2, Hand, BoxSelect, Sparkles } from "lucide-react";

type Tool = {
  id: string;
  label: string;
  shortcut: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
};

const TOOLS: Tool[] = [
  { id: "select", label: "Cursor", shortcut: "V", icon: MousePointer2 },
  { id: "hand", label: "Hand", shortcut: "H", icon: Hand },
  { id: "marquee", label: "Marquee", shortcut: "M", icon: BoxSelect },
  { id: "prompt", label: "Prompt", shortcut: "K", icon: Sparkles },
];

type ToolPaletteProps = {
  activeTool: string;
  onToolChange: (tool: string) => void;
};

export function ToolPalette({ activeTool, onToolChange }: ToolPaletteProps) {
  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex flex-row gap-0.5 bg-white border-[0.5px] border-[#EFEFEC] rounded-[4px] p-1">
      {TOOLS.map((tool) => (
        <ToolButton
          key={tool.id}
          tool={tool}
          isActive={activeTool === tool.id}
          onClick={() => onToolChange(tool.id)}
        />
      ))}
    </div>
  );
}

function ToolButton({
  tool,
  isActive,
  onClick,
}: {
  tool: Tool;
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = tool.icon;
  const title = tool.shortcut
    ? `${tool.label} (${tool.shortcut})`
    : tool.label;

  return (
    <button
      type="button"
      className={
        "w-8 h-8 flex items-center justify-center rounded-[2px] transition-colors " +
        (isActive
          ? "bg-[#D1E4FC]/30 text-[#4B57DB]"
          : "text-[#A0A0A0] hover:text-[#6B6B6B] hover:bg-[#F5F5F0]")
      }
      title={title}
      onClick={onClick}
    >
      <Icon size={16} strokeWidth={1.5} />
    </button>
  );
}
