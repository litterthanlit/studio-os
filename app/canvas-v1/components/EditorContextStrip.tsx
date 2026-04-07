"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { isDesignNodeTree, findNodePath, type PageNode } from "@/lib/canvas/compose";
import { findDesignNodePath, type DesignNode } from "@/lib/canvas/design-node";
import type { ArtboardItem } from "@/lib/canvas/unified-canvas-state";

type EditorContextStripProps = {
  activeArtboard: ArtboardItem | null;
  selectedNodeId: string | null;
  breakpointLabel: string;
  className?: string;
};

function pageNodeLabel(node: PageNode): string {
  if (node.name) return node.name;
  return node.type.charAt(0).toUpperCase() + node.type.slice(1);
}

export function EditorContextStrip({
  activeArtboard,
  selectedNodeId,
  breakpointLabel,
  className,
}: EditorContextStripProps) {
  const segments = React.useMemo(() => {
    if (!activeArtboard || !selectedNodeId) return null;
    const tree = activeArtboard.pageTree;
    if (isDesignNodeTree(tree)) {
      const path = findDesignNodePath(tree as DesignNode, selectedNodeId);
      if (!path?.length) return null;
      return path.map((n) => ({
        id: n.id,
        label: n.name || n.type,
        type: n.type,
      }));
    }
    const path = findNodePath(tree, selectedNodeId);
    if (!path?.length) return null;
    return path.map((n) => ({
      id: n.id,
      label: pageNodeLabel(n),
      type: n.type,
    }));
  }, [activeArtboard, selectedNodeId]);

  if (!segments?.length) return null;

  const last = segments[segments.length - 1];

  return (
    <div
      className={cn(
        "pointer-events-none absolute left-3 right-3 top-3 z-[30] flex max-w-[min(100%,42rem)] items-center gap-1 rounded-[4px] border border-[var(--border-subtle)] bg-[var(--card-bg)]/95 px-2.5 py-1.5 text-[11px] shadow-sm backdrop-blur-[2px]",
        className
      )}
    >
      <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--text-muted)]">
        {breakpointLabel}
      </span>
      {segments.map((seg, i) => (
        <React.Fragment key={seg.id}>
          <ChevronRight
            size={10}
            className="shrink-0 text-[var(--border-primary)]"
            strokeWidth={1.5}
          />
          <span
            className={cn(
              "min-w-0 truncate",
              i === segments.length - 1
                ? "font-medium text-[var(--text-primary)]"
                : "text-[var(--text-muted)]"
            )}
          >
            {seg.label}
          </span>
        </React.Fragment>
      ))}
      <span className="ml-auto shrink-0 rounded-[2px] bg-[var(--accent-subtle)] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-[var(--accent)]">
        {last.type}
      </span>
    </div>
  );
}
