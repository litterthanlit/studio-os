"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useCanvas } from "@/lib/canvas/canvas-context";
import { ComposeDocumentView } from "./ComposeDocumentView";
import { BREAKPOINT_WIDTHS } from "@/lib/canvas/compose";
import type { ArtboardItem } from "@/lib/canvas/unified-canvas-state";
import type { DesignSystemTokens } from "@/lib/canvas/generate-system";

type CanvasArtboardProps = {
  item: ArtboardItem;
  tokens: DesignSystemTokens | null;
  isDragging?: boolean;
  onPointerDown?: (e: React.PointerEvent, itemId: string, x: number, y: number) => void;
};

export function CanvasArtboard({ item, tokens, isDragging, onPointerDown }: CanvasArtboardProps) {
  const { state, dispatch } = useCanvas();
  const isSelected = state.selection.selectedItemIds.includes(item.id);
  const isActiveArtboard = state.selection.activeArtboardId === item.id;

  const breakpointWidth = BREAKPOINT_WIDTHS[item.breakpoint];
  const label = `${item.breakpoint.toUpperCase()} · ${breakpointWidth}PX`;
  const isDesktop = item.breakpoint === "desktop";

  const handleNodeSelect = React.useCallback(
    (nodeId: string | null) => {
      if (nodeId) {
        dispatch({ type: "SELECT_NODE", artboardId: item.id, nodeId });
      } else {
        dispatch({ type: "SELECT_ITEM", itemId: item.id });
      }
    },
    [dispatch, item.id]
  );

  return (
    <div
      data-canvas-item-id={item.id}
      className={cn("absolute", isDragging && "shadow-md")}
      style={{
        left: item.x,
        top: item.y,
        width: breakpointWidth,
        zIndex: item.zIndex,
      }}
      onPointerDown={(e) => onPointerDown?.(e, item.id, item.x, item.y)}
    >
      {/* Artboard header */}
      <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-[#A0A0A0]">
        {label}
      </div>

      {/* Artboard body */}
      <div
        className={cn(
          "bg-white",
          isDesktop ? "border-t-2 border-t-[#1E5DF2]" : "border-t border-t-[#E5E5E0]",
          isSelected && "ring-2 ring-[#1E5DF2] ring-offset-2"
        )}
        onClick={(e) => {
          e.stopPropagation();
          if (!(e.target as HTMLElement).closest("[data-node-id]")) {
            dispatch({ type: "SELECT_ITEM", itemId: item.id });
          }
        }}
      >
        {/* Click-intercepting overlay for point-and-edit selection */}
        <div
          className="relative"
          onClickCapture={(e) => {
            const target = e.target as HTMLElement;
            const link = target.closest("a");
            const button = target.closest("button");
            if (link || button) {
              e.preventDefault();
            }
          }}
        >
          {tokens ? (
            <ComposeDocumentView
              pageTree={item.pageTree}
              tokens={tokens}
              breakpoint={item.breakpoint}
              selectedNodeId={isActiveArtboard ? state.selection.selectedNodeId : null}
              onSelectNode={handleNodeSelect}
              interactive
            />
          ) : (
            <div
              className="flex items-center justify-center bg-[#F5F5F0] text-[13px] text-[#A0A0A0]"
              style={{ width: breakpointWidth, minHeight: 400 }}
            >
              No design tokens available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
