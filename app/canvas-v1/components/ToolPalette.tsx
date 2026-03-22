"use client";

/**
 * ToolPalette — horizontal floating tool strip at the bottom-center of the canvas.
 *
 * Inspired by Paper.design's minimal tool palette. Positioned above the
 * BottomBarV3 zoom strip. Hand tool enables canvas panning via useCanvasGestures.
 */

import { MousePointer2, Hand, Square, Type, Gem } from "lucide-react";

type Tool = {
  id: string;
  label: string;
  shortcut: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  disabled?: boolean;
};

const SELECTION_TOOLS: Tool[] = [
  { id: "select", label: "Select", shortcut: "V", icon: MousePointer2 },
  { id: "hand", label: "Hand", shortcut: "H", icon: Hand },
];

const CREATION_TOOLS: Tool[] = [
  { id: "rectangle", label: "Shape", shortcut: "R", icon: Square },
  { id: "text", label: "Text", shortcut: "T", icon: Type },
  { id: "future", label: "Component", shortcut: "", icon: Gem, disabled: true },
];

type ToolPaletteProps = {
  activeTool: string;
  onToolChange: (tool: string) => void;
};

export function ToolPalette({ activeTool, onToolChange }: ToolPaletteProps) {
  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex flex-row gap-0.5 bg-white/90 backdrop-blur-sm border border-[#E5E5E0] rounded-[4px] shadow-sm p-1">
      {/* Selection tools */}
      {SELECTION_TOOLS.map((tool) => (
        <ToolButton
          key={tool.id}
          tool={tool}
          isActive={activeTool === tool.id}
          onClick={() => onToolChange(tool.id)}
        />
      ))}

      {/* Divider */}
      <div className="w-px h-4 bg-[#E5E5E0] self-center mx-0.5" />

      {/* Creation tools */}
      {CREATION_TOOLS.map((tool) => (
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

  if (tool.disabled) {
    return (
      <div
        className="w-8 h-8 flex items-center justify-center rounded-[2px] text-[#E5E5E0] cursor-default"
        title={title}
      >
        <Icon size={16} strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <button
      type="button"
      className={
        "w-8 h-8 flex items-center justify-center rounded-[2px] transition-colors " +
        (isActive
          ? "bg-[#D1E4FC]/30 text-[#1E5DF2]"
          : "text-[#A0A0A0] hover:text-[#6B6B6B] hover:bg-[#F5F5F0]")
      }
      title={title}
      onClick={onClick}
    >
      <Icon size={16} strokeWidth={1.5} />
    </button>
  );
}
