"use client";

/**
 * FloatingPromptPanel — floating panel wrapper that renders PromptComposerV2
 * inside floating chrome. Appears when the Prompt tool (K) is active.
 *
 * When the inspector is open, sits left of the 288px rail with an 8px gap;
 * otherwise anchors to the viewport right.
 */

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PromptComposerV2 } from "./PromptComposerV2";
import type { DesignNode } from "@/lib/canvas/design-node";
import type { PageNode } from "@/lib/canvas/compose";

type FloatingPromptPanelProps = {
  projectId: string;
  selectedNode: DesignNode | PageNode | null;
  onClose: () => void;
  inspectorOpen: boolean;
};

export function FloatingPromptPanel({
  projectId,
  selectedNode,
  onClose,
  inspectorOpen,
}: FloatingPromptPanelProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const retryRef = React.useRef<(() => void) | null>(null);

  return (
    <div
      className={cn(
        "absolute top-4 bottom-4 w-[300px] z-20 flex flex-col rounded-[4px] border-[0.5px] border-border-subtle bg-card-bg shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden",
        inspectorOpen ? "right-[296px]" : "right-4"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 shrink-0">
        <span className="font-mono text-[10px] font-medium uppercase tracking-[1px] text-section-label">
          Prompt
        </span>
        <button
          type="button"
          onClick={onClose}
          className="w-5 h-5 flex items-center justify-center rounded-[2px] text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
        >
          <X size={12} strokeWidth={1.5} />
        </button>
      </div>

      {/* Divider */}
      <div className="h-px bg-border-subtle" />

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
