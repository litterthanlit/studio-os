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
}: BreadcrumbBarProps) {
  const path = React.useMemo(() => {
    if (!selectedNodeId) return null;
    return findNodePath(pageTree, selectedNodeId);
  }, [pageTree, selectedNodeId]);

  if (!path || path.length === 0) return null;

  return (
    <div className="absolute bottom-12 left-1/2 z-30 -translate-x-1/2">
      <div className="flex items-center gap-1 rounded-[4px] border-[0.5px] border-[#EFEFEC] bg-white px-2 py-1 shadow-sm text-[11px]">
        {/* Breakpoint label as the root segment */}
        <span className="text-[#A0A0A0] select-none">{breakpointLabel}</span>

        {path.map((node, index) => {
          const isLast = index === path.length - 1;
          return (
            <React.Fragment key={node.id}>
              <ChevronRight size={10} className="text-[#E5E5E0] shrink-0" strokeWidth={1.5} />
              <button
                type="button"
                className={
                  isLast
                    ? "text-[#1A1A1A] whitespace-nowrap select-none"
                    : "text-[#A0A0A0] hover:text-[#6B6B6B] cursor-pointer whitespace-nowrap transition-colors select-none"
                }
                onClick={() => onSelectNode(node.id)}
              >
                {displayName(node)}
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
