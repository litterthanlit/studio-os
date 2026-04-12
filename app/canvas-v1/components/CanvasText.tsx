"use client";

import React from "react";
import type { TextItem } from "@/lib/canvas/unified-canvas-state";
import { useCanvas } from "@/lib/canvas/canvas-context";
import { canvasItemToDesignNode } from "@/lib/canvas/canvas-item-conversion";
import { ComposeDocumentViewV6 } from "./ComposeDocumentViewV6";
import type { DesignNode, DesignNodeStyle } from "@/lib/canvas/design-node";

type CanvasTextProps = {
  item: TextItem;
  zoom: number;
  isDragging?: boolean;
  onPointerDown?: (e: React.PointerEvent, itemId: string, itemX: number, itemY: number) => void;
};

export function CanvasText({ item, zoom, isDragging, onPointerDown }: CanvasTextProps) {
  const { state, dispatch } = useCanvas();
  const isActive = state.selection.activeItemId === item.id;

  const tree = React.useMemo(() => canvasItemToDesignNode(item), [item]);

  // Determine height: "hug" means height is not numeric — use minHeight only
  const heightIsNumeric = typeof item.style.height === "number";
  const computedHeight = heightIsNumeric ? (item.style.height as number) : undefined;

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
        height: computedHeight,
        minHeight: computedHeight ? undefined : 20,
        zIndex: item.zIndex,
        opacity: isDragging ? 0.6 : 1,
        cursor: isDragging ? "grabbing" : "text",
      }}
      onPointerDown={(e) => {
        if (onPointerDown) {
          onPointerDown(e, item.id, item.x, item.y);
        }
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
        onDiscardTextEdit={() => {
          dispatch({ type: "REMOVE_ITEM", itemId: item.id });
        }}
        itemId={item.id}
        zoom={zoom}
        interactive
      />
    </div>
  );
}
