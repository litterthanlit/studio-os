"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";
import type { PageNode } from "@/lib/canvas/compose";
import { findNodePath } from "@/lib/canvas/compose";

type BreadcrumbBarProps = {
  pageTree: PageNode;
  selectedNodeId: string | null;
  breakpointLabel: string;
  onSelectNode: (nodeId: string) => void;
  onAddToMultiSelect?: (nodeId: string) => void;
  onBreadcrumbHover?: (nodeId: string | null) => void;
};

function displayName(node: PageNode): string {
  if (node.name) return node.name;
  return node.type.charAt(0).toUpperCase() + node.type.slice(1);
}

export function BreadcrumbBar({
  pageTree,
  selectedNodeId,
  breakpointLabel,
  onSelectNode,
  onAddToMultiSelect,
  onBreadcrumbHover,
}: BreadcrumbBarProps) {
  const [hoveredBreadcrumbId, setHoveredBreadcrumbId] = React.useState<string | null>(null);
  const [showCmdHint, setShowCmdHint] = React.useState(false);

  const path = React.useMemo(() => {
    if (!selectedNodeId) return null;
    return findNodePath(pageTree, selectedNodeId);
  }, [pageTree, selectedNodeId]);

  // Notify parent of hover state changes
  React.useEffect(() => {
    onBreadcrumbHover?.(hoveredBreadcrumbId);
  }, [hoveredBreadcrumbId, onBreadcrumbHover]);

  if (!path || path.length === 0) return null;

  return (
    <div className="absolute bottom-12 left-1/2 z-30 -translate-x-1/2">
      <div className="flex items-center gap-1 rounded-[4px] border-[0.5px] border-[#EFEFEC] bg-white px-2 py-1 shadow-sm text-[11px] dark:bg-[#1A1A1A] dark:border-[#333333]">
        {/* Breakpoint label as the root segment */}
        <span className="text-[#A0A0A0] select-none dark:text-[#666666]">{breakpointLabel}</span>

        {path.map((node, index) => {
          const isLast = index === path.length - 1;
          const isHovered = hoveredBreadcrumbId === node.id;

          return (
            <React.Fragment key={node.id}>
              <ChevronRight size={10} className="text-[#E5E5E0] shrink-0 dark:text-[#555555]" strokeWidth={1.5} />
              <button
                type="button"
                className={
                  isLast
                    ? `text-[#1A1A1A] whitespace-nowrap select-none dark:text-[#FFFFFF] ${isHovered ? "underline decoration-[#4B57DB] underline-offset-2" : ""}`
                    : `whitespace-nowrap cursor-pointer transition-colors select-none ${
                        isHovered
                          ? "text-[#4B57DB] underline decoration-[#4B57DB] underline-offset-2"
                          : "text-[#A0A0A0] hover:text-[#6B6B6B] dark:text-[#666666] dark:hover:text-[#D0D0D0]"
                      }`
                }
                onMouseEnter={() => {
                  setHoveredBreadcrumbId(node.id);
                  setShowCmdHint(true);
                }}
                onMouseLeave={() => {
                  setHoveredBreadcrumbId(null);
                  setShowCmdHint(false);
                }}
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey) {
                    // Cmd+Click (Mac) or Ctrl+Click (Windows): add to multi-select
                    e.preventDefault();
                    e.stopPropagation();
                    onAddToMultiSelect?.(node.id);
                  } else {
                    // Regular click: navigate to node (existing behavior)
                    onSelectNode(node.id);
                  }
                }}
              >
                {displayName(node)}
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* Cmd+click hint tooltip */}
      {showCmdHint && hoveredBreadcrumbId && (
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-1 bg-[#1A1A1A] text-white text-[10px] rounded-[4px] whitespace-nowrap dark:bg-[#333333]">
          <span className="hidden sm:inline">Cmd+click to add to selection</span>
          <span className="sm:hidden">⌘+click to add</span>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#1A1A1A] rotate-45 dark:bg-[#333333]" />
        </div>
      )}
    </div>
  );
}
