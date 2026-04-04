"use client";

/**
 * V3 Canvas Context — React provider that wires the canvas reducer to
 * persistence, keyboard shortcuts, and the component tree.
 *
 * Not wired into the canvas UI yet — that happens in Phase 1 Prompt 4.
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
} from "react";
import {
  canvasReducer,
  createInitialReducerState,
  canUndoState,
  canRedoState,
  type CanvasAction,
  type CanvasReducerState,
} from "./canvas-reducer";
import type { UnifiedCanvasState } from "./unified-canvas-state";
import {
  loadUnifiedCanvas,
  saveUnifiedCanvas,
  createEmptyCanvas,
} from "./unified-canvas-state";

// ─── Context ─────────────────────────────────────────────────────────────────

type CanvasContextValue = {
  state: UnifiedCanvasState;
  dispatch: React.Dispatch<CanvasAction>;
  canUndo: boolean;
  canRedo: boolean;
};

export const CanvasContext = createContext<CanvasContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function CanvasProvider({
  projectId,
  children,
}: {
  projectId: string;
  children: React.ReactNode;
}) {
  const [reducerState, dispatch] = useReducer(
    canvasReducer,
    createEmptyCanvas(),
    (initial) => createInitialReducerState(initial)
  );

  const hydratedRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // On mount: load persisted state
  useEffect(() => {
    const loaded = loadUnifiedCanvas(projectId);
    dispatch({ type: "LOAD_STATE", state: loaded });
    hydratedRef.current = true;
  }, [projectId]);

  // Keep a ref to the latest state so the unmount flush can access it
  const latestStateRef = useRef(reducerState);
  latestStateRef.current = reducerState;

  // On state change (debounced 500ms): persist
  useEffect(() => {
    if (!hydratedRef.current) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      saveUnifiedCanvas(projectId, extractCanvasState(reducerState));
    }, 500);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [projectId, reducerState]);

  // Flush pending save on unmount (HMR, navigation) so state is never lost
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      // Only flush if hydration completed — never write empty initial state
      if (hydratedRef.current) {
        saveUnifiedCanvas(projectId, extractCanvasState(latestStateRef.current));
      }
    };
  }, [projectId]);

  // NOTE: Keyboard shortcuts (Cmd+Z, etc.) are handled by useCanvasKeyboard
  // hook in UnifiedCanvasView — removed duplicate listener here to prevent
  // double-dispatch of UNDO/REDO actions.

  // Expose UnifiedCanvasState (without the in-memory history stack)
  const contextValue: CanvasContextValue = {
    state: extractCanvasState(reducerState),
    dispatch,
    canUndo: canUndoState(reducerState),
    canRedo: canRedoState(reducerState),
  };

  return (
    <CanvasContext.Provider value={contextValue}>
      {children}
    </CanvasContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useCanvas(): CanvasContextValue {
  const context = useContext(CanvasContext);
  if (!context) {
    throw new Error("useCanvas must be used within a CanvasProvider");
  }
  return context;
}

// ─── Internal ────────────────────────────────────────────────────────────────

/**
 * Strip the in-memory history stack from the reducer state,
 * returning a clean UnifiedCanvasState for persistence and context consumers.
 */
function extractCanvasState(state: CanvasReducerState): UnifiedCanvasState {
  const { history: _, ...canvasState } = state;
  return canvasState;
}
