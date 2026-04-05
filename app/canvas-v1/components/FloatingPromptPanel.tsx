"use client";

/**
 * FloatingPromptPanel — floating panel wrapper that renders PromptComposerV2
 * inside floating chrome. Appears when the Prompt tool (K) is active.
 *
 * Positioned between the canvas and the inspector panel (280px wide, 8px gap).
 */

import * as React from "react";
import { X } from "lucide-react";
import { PromptComposerV2 } from "./PromptComposerV2";
import type { DesignNode } from "@/lib/canvas/design-node";
import type { PageNode } from "@/lib/canvas/compose";

type FloatingPromptPanelProps = {
  projectId: string;
  selectedNode: DesignNode | PageNode | null;
  onClose: () => void;
};

export function FloatingPromptPanel({ projectId, selectedNode, onClose }: FloatingPromptPanelProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const retryRef = React.useRef<(() => void) | null>(null);

  return (
    <div className="absolute right-[288px] top-4 bottom-4 w-[300px] z-20 flex flex-col bg-white rounded-[4px] border-[0.5px] border-[#EFEFEC] shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden dark:bg-[#1A1A1A] dark:border-[#333333]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 shrink-0">
        <span className="font-mono text-[10px] font-medium uppercase tracking-[1px] text-[#A0A0A0] dark:text-[#666666]">
          Prompt
        </span>
        <button
          type="button"
          onClick={onClose}
          className="w-5 h-5 flex items-center justify-center rounded-[2px] text-[#A0A0A0] hover:text-[#1A1A1A] hover:bg-[#F5F5F0] transition-colors dark:text-[#666666] dark:hover:text-[#FFFFFF] dark:hover:bg-[#2A2A2A]"
        >
          <X size={12} strokeWidth={1.5} />
        </button>
      </div>

      {/* Divider */}
      <div className="h-px bg-[#EFEFEC] dark:bg-[#333333]" />

      {/* Prompt content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <PromptComposerV2
          textareaRef={textareaRef}
          selectedNode={selectedNode}
          projectId={projectId}
          varySignal={0}
          retryRef={retryRef}
        />
      </div>
    </div>
  );
}
