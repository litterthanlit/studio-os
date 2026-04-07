"use client";

/**
 * useBatchUpdate Hook — Track 7: Advanced Multi-Edit / Shared Properties
 *
 * Abstracts single vs batch dispatch logic, making it easy for the inspector
 * to work with either single or multi-select without conditional logic.
 */

import { useCallback, useMemo } from "react";
import type { CanvasAction } from "@/lib/canvas/canvas-reducer";
import type { NodeOverride } from "@/lib/canvas/design-node";
import type { PageNodeStyle } from "@/lib/canvas/compose";

interface UseBatchUpdateResult {
  /** Update style for single or multiple nodes */
  updateStyle: (style: Partial<PageNodeStyle>) => void;
  /** Update instance override for single or multiple instances */
  updateInstanceOverride: (instanceId: string, masterNodeId: string, override: NodeOverride) => void;
  /** True when operating on multiple nodes */
  isBatch: boolean;
}

/**
 * Hook that abstracts single vs batch dispatch logic.
 *
 * @param artboardId - The ID of the active artboard
 * @param nodeIds - Array of node IDs to update (1 for single, >1 for batch)
 * @param dispatch - The canvas dispatch function
 * @returns Object with update functions and batch flag
 */
export function useBatchUpdate(
  artboardId: string,
  nodeIds: string[],
  dispatch: React.Dispatch<CanvasAction>
): UseBatchUpdateResult {
  const isBatch = useMemo(() => nodeIds.length > 1, [nodeIds.length]);

  const updateStyle = useCallback(
    (style: Partial<PageNodeStyle>) => {
      if (nodeIds.length === 0) return;

      if (isBatch) {
        dispatch({
          type: "UPDATE_NODE_STYLE_BATCH",
          artboardId,
          nodeIds,
          style,
        });
      } else {
        dispatch({
          type: "UPDATE_NODE_STYLE",
          artboardId,
          nodeId: nodeIds[0],
          style,
        });
      }
    },
    [artboardId, nodeIds, isBatch, dispatch]
  );

  const updateInstanceOverride = useCallback(
    (instanceId: string, masterNodeId: string, override: NodeOverride) => {
      // For instance overrides, we dispatch single action even in multi-select
      // since each instance has its own override map
      dispatch({
        type: "UPDATE_INSTANCE_OVERRIDE",
        artboardId,
        instanceId,
        masterNodeId,
        override,
      });
    },
    [artboardId, dispatch]
  );

  return {
    updateStyle,
    updateInstanceOverride,
    isBatch,
  };
}
