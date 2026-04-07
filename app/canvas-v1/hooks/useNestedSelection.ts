// app/canvas-v1/hooks/useNestedSelection.ts
// Track 4: Hook for managing nested selection cycling state

import { useState, useRef, useCallback, useEffect } from "react";
import type { DesignNode } from "@/lib/canvas/design-node";
import {
  screenToArtboard,
  getNodesAtPoint,
  getContextualHits,
  cycleSelection,
  cycleSiblingSelection,
  getParent,
} from "@/lib/canvas/nested-selection";

export interface UseNestedSelectionResult {
  /** Current hover target (deepest node under cursor, contextual) */
  hoverTarget: DesignNode | null;

  /** Chain from root to hover target for breadcrumb display */
  parentChain: DesignNode[];

  /** Update hover position (call on mouse move) - uses 50ms debounce internally */
  setHoverPosition: (screenX: number, screenY: number) => void;

  /** Clear hover target */
  clearHover: () => void;

  /**
   * Cycle selection at position (for Cmd+Click)
   * Returns the node ID to select, or null if no hits
   */
  cycleAtPosition: (
    screenX: number,
    screenY: number,
    currentSelectionId: string | null,
    zoom: number,
    scrollX: number,
    scrollY: number
  ) => string | null;

  /**
   * Cycle through siblings (for Cmd+Shift+Click)
   * Returns the sibling node ID, or null if no siblings
   */
  cycleSiblings: (
    currentSelectionId: string,
    parent: DesignNode,
    direction: "next" | "previous"
  ) => string | null;

  /** Reset the cycle index */
  resetCycle: () => void;

  /** Current cycle info (for UI indicator) */
  cycleInfo: {
    currentIndex: number;
    totalHits: number;
  } | null;
}

const HOVER_DEBOUNCE_MS = 50;

export function useNestedSelection(
  rootNode: DesignNode | null,
  contextNodeId: string | null
): UseNestedSelectionResult {
  // Hover position state
  const [hoverPosition, setHoverPositionState] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Hover target (deepest contextual hit at hover position)
  const [hoverTarget, setHoverTarget] = useState<DesignNode | null>(null);

  // Parent chain from root to hover target
  const [parentChain, setParentChain] = useState<DesignNode[]>([]);

  // Cycle tracking
  const [cycleIndex, setCycleIndex] = useState<number>(0);
  const [lastHits, setLastHits] = useState<DesignNode[]>([]);
  const [cycleInfo, setCycleInfo] = useState<{
    currentIndex: number;
    totalHits: number;
  } | null>(null);

  // Debounce timeout ref
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Pending hover position for debounce
  const pendingPositionRef = useRef<{ x: number; y: number } | null>(null);

  /**
   * Build the parent chain from root to the target node
   */
  const buildParentChain = useCallback(
    (target: DesignNode): DesignNode[] => {
      if (!rootNode) return [];

      const chain: DesignNode[] = [];
      let current: DesignNode | null = target;

      // Walk up from target to root
      while (current && current.id !== rootNode.id) {
        const parent = getParent(current, rootNode);
        if (!parent) break;
        chain.unshift(parent);
        current = parent;
      }

      // Add the target at the end
      chain.push(target);

      return chain;
    },
    [rootNode]
  );

  /**
   * Process hover position update (after debounce)
   */
  const processHoverUpdate = useCallback(() => {
    if (!rootNode || !pendingPositionRef.current) return;

    const { x: screenX, y: screenY } = pendingPositionRef.current;

    // We need zoom/scroll to transform, but hover tracking doesn't have access
    // to canvas state. For hover preview, we use a default zoom of 1 and no scroll.
    // The actual cycleAtPosition will use proper coordinates.
    const artboardPos = screenToArtboard(screenX, screenY, 1, 0, 0);

    // Get all nodes at this point
    const hits = getNodesAtPoint(rootNode, artboardPos.x, artboardPos.y);

    // Filter to contextual hits
    const contextualHits = getContextualHits(hits, contextNodeId, rootNode);

    if (contextualHits.length > 0) {
      // Deepest hit is first (sorted by depth)
      const deepest = contextualHits[0];
      setHoverTarget(deepest);
      setParentChain(buildParentChain(deepest));
    } else {
      setHoverTarget(null);
      setParentChain([]);
    }

    setHoverPositionState(pendingPositionRef.current);
  }, [rootNode, contextNodeId, buildParentChain]);

  /**
   * Set hover position with 50ms debounce
   */
  const setHoverPosition = useCallback(
    (screenX: number, screenY: number) => {
      // Cancel any pending debounce
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      // Store the pending position
      pendingPositionRef.current = { x: screenX, y: screenY };

      // Schedule the update
      debounceTimeoutRef.current = setTimeout(() => {
        processHoverUpdate();
      }, HOVER_DEBOUNCE_MS);
    },
    [processHoverUpdate]
  );

  /**
   * Clear hover target
   */
  const clearHover = useCallback(() => {
    // Cancel any pending debounce
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    pendingPositionRef.current = null;
    setHoverPositionState(null);
    setHoverTarget(null);
    setParentChain([]);
  }, []);

  /**
   * Cycle selection at a position (Cmd+Click)
   */
  const cycleAtPosition = useCallback(
    (
      screenX: number,
      screenY: number,
      currentSelectionId: string | null,
      zoom: number,
      scrollX: number,
      scrollY: number
    ): string | null => {
      if (!rootNode) return null;

      // Transform screen coordinates to artboard
      const artboardPos = screenToArtboard(screenX, screenY, zoom, scrollX, scrollY);

      // Get all nodes at this point
      const hits = getNodesAtPoint(rootNode, artboardPos.x, artboardPos.y);

      // Filter to contextual hits
      const contextualHits = getContextualHits(hits, contextNodeId, rootNode);

      if (contextualHits.length === 0) {
        return null;
      }

      // Use cycleSelection to determine the next node
      const nextId = cycleSelection(currentSelectionId, contextualHits);

      // Update cycle tracking
      const newIndex = nextId
        ? contextualHits.findIndex((n) => n.id === nextId)
        : 0;

      setCycleIndex(newIndex);
      setLastHits(contextualHits);
      setCycleInfo({
        currentIndex: newIndex,
        totalHits: contextualHits.length,
      });

      return nextId;
    },
    [rootNode, contextNodeId]
  );

  /**
   * Cycle through siblings (Cmd+Shift+Click)
   */
  const cycleSiblings = useCallback(
    (
      currentSelectionId: string,
      parent: DesignNode,
      direction: "next" | "previous"
    ): string | null => {
      const result = cycleSiblingSelection(currentSelectionId, parent, direction);

      // Reset cycle index when switching siblings
      if (result && result !== currentSelectionId) {
        setCycleIndex(0);
        setCycleInfo(null);
      }

      return result;
    },
    []
  );

  /**
   * Reset the cycle index
   */
  const resetCycle = useCallback(() => {
    setCycleIndex(0);
    setLastHits([]);
    setCycleInfo(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Handle null rootNode gracefully
  if (!rootNode) {
    return {
      hoverTarget: null,
      parentChain: [],
      setHoverPosition: () => {},
      clearHover: () => {},
      cycleAtPosition: () => null,
      cycleSiblings: () => null,
      resetCycle: () => {},
      cycleInfo: null,
    };
  }

  return {
    hoverTarget,
    parentChain,
    setHoverPosition,
    clearHover,
    cycleAtPosition,
    cycleSiblings,
    resetCycle,
    cycleInfo,
  };
}
