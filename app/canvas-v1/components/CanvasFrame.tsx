"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { FrameItem } from "@/lib/canvas/unified-canvas-state";
import { useCanvas } from "@/lib/canvas/canvas-context";
import { canvasItemToDesignNode } from "@/lib/canvas/canvas-item-conversion";
import { ComposeDocumentViewV6 } from "./ComposeDocumentViewV6";
import type { DesignNode, DesignNodeStyle } from "@/lib/canvas/design-node";

type CanvasFrameProps = {
  item: FrameItem;
  zoom: number;
  isDragging?: boolean;
  onPointerDown?: (e: React.PointerEvent, itemId: string, itemX: number, itemY: number) => void;
};

export function CanvasFrame({ item, zoom, isDragging, onPointerDown }: CanvasFrameProps) {
  const { state, dispatch } = useCanvas();
  const isSelected = state.selection.selectedItemIds.includes(item.id);
  const isActive = state.selection.activeItemId === item.id;

  const tree = React.useMemo(() => canvasItemToDesignNode(item), [item]);

  const handleNodeSelect = React.useCallback(
    (nodeId: string | null) => {
      if (nodeId) {
        dispatch({ type: "SELECT_NODE", itemId: item.id, nodeId });
      } else {
        dispatch({ type: "SELECT_ITEM", itemId: item.id });
      }
    },
    [dispatch, item.id]
  );

  const handleUpdateContent = React.useCallback(
    (nodeId: string, key: string, value: string) => {
      if (key === "text") {
        dispatch({ type: "UPDATE_TEXT_CONTENT_SITE", itemId: item.id, nodeId, text: value });
        return;
      }
      dispatch({
        type: "UPDATE_NODE",
        itemId: item.id,
        nodeId,
        changes: { content: { [key]: value } },
      });
    },
    [dispatch, item.id]
  );

  const handleUpdateNodeStyle = React.useCallback(
    (nodeId: string, style: Record<string, unknown>) => {
      dispatch({
        type: "UPDATE_NODE_STYLE",
        itemId: item.id,
        nodeId,
        style: style as Partial<DesignNodeStyle>,
      });
    },
    [dispatch, item.id]
  );

  const handleInsertSection = React.useCallback(
    (index: number, section: DesignNode, parentNodeId?: string | null) => {
      dispatch({
        type: "INSERT_SECTION",
        itemId: item.id,
        index,
        section,
        parentNodeId: parentNodeId ?? undefined,
      });
    },
    [dispatch, item.id]
  );

  const handleToggleNodeSelection = React.useCallback(
    (nodeId: string) => {
      dispatch({ type: "TOGGLE_NODE_SELECTION", itemId: item.id, nodeId });
    },
    [dispatch, item.id]
  );

  const handleSetSelectedNodes = React.useCallback(
    (nodeIds: string[]) => {
      dispatch({ type: "SET_SELECTED_NODES", itemId: item.id, nodeIds });
    },
    [dispatch, item.id]
  );

  const handlePushHistory = React.useCallback(
    (desc: string) => {
      dispatch({ type: "PUSH_HISTORY", description: desc });
    },
    [dispatch]
  );

  return (
    <div
      data-canvas-item-id={item.id}
      className="absolute"
      style={{
        left: item.x,
        top: item.y,
        width: item.width,
        zIndex: item.zIndex,
        opacity: isDragging ? 0.6 : 1,
        cursor: isDragging ? "grabbing" : undefined,
      }}
      onPointerDown={(e) => {
        // Initiate drag if handler is provided
        if (onPointerDown) {
          onPointerDown(e, item.id, item.x, item.y);
          return;
        }
        // Fallback: only handle direct clicks on the frame wrapper, not on child nodes
        if (!(e.target as HTMLElement).dataset.canvasItemId) return;
        dispatch({ type: "SELECT_ITEM", itemId: item.id });
      }}
    >
      {/* Frame label — shown above the frame when hovered or selected */}
      <div
        className={cn(
          "mb-1 font-mono text-[10px] uppercase tracking-[1px] transition-opacity duration-100",
          isSelected ? "text-[#4B57DB] opacity-100" : "text-[var(--text-muted)] opacity-0 hover:opacity-100"
        )}
        style={{ lineHeight: "1.2" }}
      >
        {item.name}
      </div>

      {/* Frame body */}
      <div
        className={cn(
          "relative",
          isSelected && "outline outline-2 outline-[#4B57DB]"
        )}
        style={{
          width: item.width,
          height: item.height,
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (!(e.target as HTMLElement).closest("[data-node-id]")) {
            dispatch({ type: "SELECT_ITEM", itemId: item.id });
          }
        }}
      >
        <ComposeDocumentViewV6
          tree={tree}
          components={state.components}
          masterEditDirty={Boolean(state.masterEditSession?.dirty)}
          selectedNodeId={isActive ? state.selection.selectedNodeId : null}
          selectedNodeIds={isActive ? state.selection.selectedNodeIds : []}
          onSelectNode={handleNodeSelect}
          onToggleNodeSelection={handleToggleNodeSelection}
          onSetSelectedNodes={handleSetSelectedNodes}
          onUpdateContent={handleUpdateContent}
          onUpdateNodeStyle={handleUpdateNodeStyle}
          onPushHistory={handlePushHistory}
          onInsertSection={handleInsertSection}
          itemId={item.id}
          zoom={zoom}
          interactive
        />
      </div>
    </div>
  );
}
