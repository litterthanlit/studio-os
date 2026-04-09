"use client";

/**
 * useBatchUpdate Hook — Track 7: Advanced Multi-Edit / Shared Properties
 *
 * Abstracts single vs batch dispatch logic, making it easy for the inspector
 * to work with either single or multi-select without conditional logic.
 */

import { useCallback, useMemo } from "react";
import type { CanvasAction } from "@/lib/canvas/canvas-reducer";
import type { DesignNodeStyle, NodeOverride } from "@/lib/canvas/design-node";

interface UseBatchUpdateResult {
  /** Update style for single or multiple nodes */
  updateStyle: (style: Partial<DesignNodeStyle>) => void;
  /** Update instance override for single or multiple instances */
  updateInstanceOverride: (instanceId: string, masterNodeId: string, override: NodeOverride) => void;
  /** True when operating on multiple nodes */
  isBatch: boolean;
}

/**
 * Hook that abstracts single vs batch dispatch logic.
 *
 * @param itemId - The ID of the active artboard
 * @param nodeIds - Array of node IDs to update (1 for single, >1 for batch)
 * @param dispatch - The canvas dispatch function
 * @returns Object with update functions and batch flag
 */
export function useBatchUpdate(
  itemId: string,
  nodeIds: string[],
  dispatch: React.Dispatch<CanvasAction>
): UseBatchUpdateResult {
  const isBatch = useMemo(() => nodeIds.length > 1, [nodeIds.length]);

  const updateStyle = useCallback(
    (style: Partial<DesignNodeStyle>) => {
      if (nodeIds.length === 0) return;

      if (isBatch) {
        dispatch({
          type: "UPDATE_NODE_STYLE_BATCH",
          itemId,
          nodeIds,
          style,
        });
      } else {
        dispatch({
          type: "UPDATE_NODE_STYLE",
          itemId,
          nodeId: nodeIds[0],
          style,
        });
      }
    },
    [itemId, nodeIds, isBatch, dispatch]
  );

  const updateInstanceOverride = useCallback(
    (instanceId: string, masterNodeId: string, override: NodeOverride) => {
      // For instance overrides, we dispatch single action even in multi-select
      // since each instance has its own override map
      dispatch({
        type: "UPDATE_INSTANCE_OVERRIDE",
        itemId,
        instanceId,
        masterNodeId,
        override,
      });
    },
    [itemId, dispatch]
  );

  return {
    updateStyle,
    updateInstanceOverride,
    isBatch,
  };
}
