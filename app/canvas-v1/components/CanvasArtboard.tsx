"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useCanvas } from "@/lib/canvas/canvas-context";
import { ComposeDocumentView, exitAnyActiveTextEditing } from "./ComposeDocumentView";
import { ComposeDocumentViewV6, exitAnyActiveTextEditingV6 } from "./ComposeDocumentViewV6";
import { BREAKPOINT_WIDTHS, findNodeById, isDesignNodeTree } from "@/lib/canvas/compose";
import type { ArtboardItem, GenerationResult } from "@/lib/canvas/unified-canvas-state";
import { getGenerationStage } from "@/lib/canvas/unified-canvas-state";
import type { DesignSystemTokens } from "@/lib/canvas/generate-system";
import { GenerationAnimation } from "./GenerationAnimation";

type CanvasArtboardProps = {
  item: ArtboardItem;
  tokens: DesignSystemTokens | null;
  isDragging?: boolean;
  isGenerating?: boolean;
  agentSteps?: string[];
  generationResult?: GenerationResult;
  onPointerDown?: (e: React.PointerEvent, itemId: string, x: number, y: number) => void;
  onOpenSectionLibrary?: (insertAtIndex: number) => void;
  onFocusPromptWithPrefill?: (prefill: string) => void;
  onRetry?: () => void;
};

export function CanvasArtboard({ item, tokens, isDragging, isGenerating, agentSteps, generationResult, onPointerDown, onOpenSectionLibrary, onFocusPromptWithPrefill, onRetry }: CanvasArtboardProps) {
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

  const handleSectionReorder = React.useCallback(
    (nodeId: string, newIndex: number) => {
      dispatch({
        type: "REORDER_NODE",
        artboardId: item.id,
        nodeId,
        newIndex,
      });
    },
    [dispatch, item.id]
  );

  const handleNodeContentUpdate = React.useCallback(
    (nodeId: string, key: string, value: string) => {
      if (key === "text") {
        dispatch({
          type: "UPDATE_TEXT_CONTENT_SITE",
          artboardId: item.id,
          nodeId,
          text: value,
        });
        return;
      }

      dispatch({
        type: "UPDATE_NODE",
        artboardId: item.id,
        nodeId,
        changes: {
          content: {
            ...(findNodeById(item.pageTree, nodeId)?.content ?? {}),
            [key]: value,
          },
        },
      });
    },
    [dispatch, item.id, item.pageTree]
  );

  const handleNodeStyleUpdate = React.useCallback(
    (nodeId: string, style: Record<string, unknown>) => {
      dispatch({
        type: "UPDATE_NODE_STYLE",
        artboardId: item.id,
        nodeId,
        style: style as import("@/lib/canvas/compose").PageNodeStyle,
      });
    },
    [dispatch, item.id]
  );

  const handleReplaceNodeImage = React.useCallback(
    (nodeId: string, file: File) => {
      const reader = new FileReader();

      reader.onload = () => {
        const mediaUrl = typeof reader.result === "string" ? reader.result : null;
        if (!mediaUrl) return;
        const syncedArtboardIds = state.items
          .filter(
            (canvasItem): canvasItem is ArtboardItem =>
              canvasItem.kind === "artboard" && canvasItem.siteId === item.siteId
          )
          .map((canvasItem) => canvasItem.id);

        dispatch({ type: "PUSH_HISTORY", description: "Replaced image" });
        syncedArtboardIds.forEach((artboardId) => {
          dispatch({
            type: "UPDATE_NODE",
            artboardId,
            nodeId,
            changes: {
              content: {
                ...(findNodeById(item.pageTree, nodeId)?.content ?? {}),
                mediaUrl,
                mediaAlt: file.name || "Uploaded image",
              },
            },
          });
        });
      };

      reader.readAsDataURL(file);
    },
    [dispatch, item.pageTree, item.siteId, state.items]
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
          "canvas-artboard relative bg-white",
          isDesktop ? "border-t-2 border-t-[#1E5DF2]" : "border-t border-t-[#E5E5E0]",
          isSelected && "outline outline-1 outline-[#1E5DF2]",
          isActiveArtboard && "editing"
        )}
        onClick={(e) => {
          e.stopPropagation();
          if (!(e.target as HTMLElement).closest("[data-node-id]")) {
            exitAnyActiveTextEditing();
            exitAnyActiveTextEditingV6();
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
          {isGenerating ? (
            <GenerationAnimation
              stage={getGenerationStage(agentSteps ?? [])}
              width={breakpointWidth}
              height={400}
              generationResult={generationResult}
              onRetry={onRetry}
            />
          ) : tokens && isDesignNodeTree(item.pageTree) ? (
            <ComposeDocumentViewV6
              tree={item.pageTree as import("@/lib/canvas/design-node").DesignNode}
              selectedNodeId={isActiveArtboard ? state.selection.selectedNodeId : null}
              selectedNodeIds={isActiveArtboard ? state.selection.selectedNodeIds : []}
              onSelectNode={handleNodeSelect}
              onToggleNodeSelection={(nodeId) => {
                dispatch({ type: "TOGGLE_NODE_SELECTION", artboardId: item.id, nodeId });
              }}
              onSetSelectedNodes={(nodeIds) => {
                dispatch({ type: "SET_SELECTED_NODES", artboardId: item.id, nodeIds });
              }}
              onUpdateContent={handleNodeContentUpdate}
              onUpdateNodeStyle={handleNodeStyleUpdate}
              onPushHistory={(desc) => dispatch({ type: "PUSH_HISTORY", description: desc })}
              artboardId={item.id}
              zoom={state.viewport.zoom}
              interactive
            />
          ) : tokens ? (
            <ComposeDocumentView
              pageTree={item.pageTree}
              tokens={tokens}
              breakpoint={item.breakpoint}
              selectedNodeId={isActiveArtboard ? state.selection.selectedNodeId : null}
              onSelectNode={handleNodeSelect}
              onUpdateContent={handleNodeContentUpdate}
              onReorderSection={handleSectionReorder}
              onOpenSectionLibrary={onOpenSectionLibrary}
              onFocusPromptWithPrefill={onFocusPromptWithPrefill}
              onReplaceImage={handleReplaceNodeImage}
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
