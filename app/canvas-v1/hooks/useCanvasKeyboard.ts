"use client";

/**
 * V3 Canvas Keyboard Shortcuts — all keyboard shortcuts for the unified canvas.
 *
 * Shortcuts don't fire when a text input/textarea/contentEditable is focused.
 */

import { useEffect } from "react";
import type { CanvasAction } from "@/lib/canvas/canvas-reducer";
import type { ArtboardItem, UnifiedCanvasState } from "@/lib/canvas/unified-canvas-state";
import {
  isDesignNodeTree,
  findNodeById,
  findNodePath,
  findParentNode,
  type PageNodeStyle,
} from "@/lib/canvas/compose";
import { findDesignNodeById, findDesignNodeParent, type DesignNode } from "@/lib/canvas/design-node";
import { normalizeSelection, allSameParent } from "@/lib/canvas/multi-select-helpers";
import {
  findNodeById as findDesignNodeByIdFromNested,
  getParent,
  cycleSiblingSelection,
} from "@/lib/canvas/nested-selection";

export const ENTER_TEXT_EDIT_MODE_EVENT = "studio:enter-edit-mode";
export const FLASH_NODE_OUTLINES_EVENT = "studio:flash-node-outlines";

type InlineTextEditEventDetail = {
  artboardId: string;
  nodeId: string;
};

type FlashNodeOutlinesEventDetail = {
  artboardId: string;
  nodeIds: string[];
};

const STYLE_COPY_KEYS: Array<keyof PageNodeStyle> = [
  "background",
  "foreground",
  "muted",
  "accent",
  "borderColor",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
  "fontStyle",
  "textDecoration",
  "borderRadius",
  "opacity",
  "blur",
  "shadow",
];

let copiedStyleClipboard: Partial<PageNodeStyle> | null = null;

type KeyboardOptions = {
  state: UnifiedCanvasState;
  dispatch: React.Dispatch<CanvasAction>;
  onToggleLayers: () => void;
  onToggleInspector: () => void;
  onFocusPrompt: () => void;
  onSetActiveTool?: (tool: string) => void;
  zoomToFit?: () => void;
  zoomToSelection?: () => void;
};

export function useCanvasKeyboard({
  state,
  dispatch,
  onToggleLayers,
  onToggleInspector,
  onFocusPrompt,
  onSetActiveTool,
  zoomToFit,
  zoomToSelection,
}: KeyboardOptions) {
  useEffect(() => {
    const getActiveArtboard = () =>
      state.selection.activeArtboardId
        ? state.items.find(
            (item): item is ArtboardItem =>
              item.kind === "artboard" && item.id === state.selection.activeArtboardId
          ) ?? null
        : null;

    const getSelectedNodeMetadata = () => {
      const activeArtboard = getActiveArtboard();
      const selectedNodeId = state.selection.selectedNodeId;
      if (!activeArtboard || !selectedNodeId) return null;

      const path = findNodePath(activeArtboard.pageTree, selectedNodeId);
      if (!path) return null;

      const node = path[path.length - 1];
      const parent = path[path.length - 2] ?? null;
      const siblings = parent?.children ?? [activeArtboard.pageTree];
      const index = siblings.findIndex((child) => child.id === selectedNodeId);

      if (index === -1) return null;

      return {
        activeArtboard,
        node,
        parent,
        siblings,
        index,
      };
    };

    const copySelectedNodeStyle = () => {
      const metadata = getSelectedNodeMetadata();
      if (!metadata) return;

      const nextClipboard: Partial<PageNodeStyle> = {};
      for (const key of STYLE_COPY_KEYS) {
        const value = metadata.node.style?.[key];
        if (value !== undefined) {
          (
            nextClipboard as Record<
              keyof PageNodeStyle,
              PageNodeStyle[keyof PageNodeStyle]
            >
          )[key] = value as PageNodeStyle[keyof PageNodeStyle];
        }
      }

      copiedStyleClipboard = Object.keys(nextClipboard).length > 0 ? nextClipboard : null;
    };

    const pasteSelectedNodeStyle = () => {
      const metadata = getSelectedNodeMetadata();
      if (!metadata || !copiedStyleClipboard) return;

      dispatch({ type: "PUSH_HISTORY", description: "Pasted style" });
      dispatch({
        type: "UPDATE_NODE_STYLE",
        artboardId: metadata.activeArtboard.id,
        nodeId: metadata.node.id,
        style: copiedStyleClipboard,
      });
    };

    const flashTopLevelSections = (artboardId: string, nodeIds: string[]) => {
      if (typeof window === "undefined" || nodeIds.length === 0) return;

      window.dispatchEvent(
        new CustomEvent<FlashNodeOutlinesEventDetail>(FLASH_NODE_OUTLINES_EVENT, {
          detail: {
            artboardId,
            nodeIds,
          },
        })
      );
    };

    const isEditingText = () => {
      const activeElement = document.activeElement as HTMLElement | null;
      return (
        activeElement?.getAttribute("contenteditable") === "true" ||
        activeElement?.tagName === "INPUT" ||
        activeElement?.tagName === "TEXTAREA"
      );
    };

    const hasBlockingPopoverOpen = () =>
      Boolean(document.querySelector("[data-studio-context-menu-open='true']"));

    const handler = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey;
      const isEditing = isEditingText();

      if (isEditing) {
        return;
      }

      // Cmd+0 — Zoom to fit all artboards
      if (isMeta && e.key === "0") {
        e.preventDefault();
        zoomToFit?.();
        return;
      }

      // Cmd+1 — Zoom to selection (falls back to zoom-to-fit if nothing selected)
      if (isMeta && e.key === "1") {
        e.preventDefault();
        zoomToSelection?.();
        return;
      }

      // Cmd+Z / Cmd+Shift+Z — Undo / Redo
      if (isMeta && (e.key === "z" || e.key === "Z") && e.shiftKey) {
        e.preventDefault();
        dispatch({ type: "REDO" });
        return;
      }
      if (isMeta && e.key === "z") {
        e.preventDefault();
        dispatch({ type: "UNDO" });
        return;
      }

      // Cmd+D — Duplicate selected section node or canvas items
      if (isMeta && (e.key === "d" || e.key === "D")) {
        e.preventDefault();
        if (state.selection.selectedNodeId && state.selection.activeArtboardId) {
          dispatch({ type: "DUPLICATE_SECTION", artboardId: state.selection.activeArtboardId, nodeId: state.selection.selectedNodeId });
        } else {
          for (const itemId of state.selection.selectedItemIds) {
            dispatch({ type: "PUSH_HISTORY", description: "Duplicated item" });
            dispatch({ type: "DUPLICATE_ITEM", itemId });
          }
        }
        return;
      }

      // Cmd+Shift+G — Ungroup selected node (must come before Cmd+G to avoid false match)
      if ((e.metaKey || e.ctrlKey) && (e.key === "G" || (e.key === "g" && e.shiftKey))) {
        e.preventDefault();
        if (state.selection.selectedNodeId && state.selection.activeArtboardId) {
          dispatch({
            type: "UNGROUP_NODES",
            artboardId: state.selection.activeArtboardId,
            nodeId: state.selection.selectedNodeId,
          });
        }
        return;
      }

      // Cmd+G — Group selected nodes
      if ((e.metaKey || e.ctrlKey) && e.key === "g" && !e.shiftKey) {
        e.preventDefault();
        if (state.selection.selectedNodeIds.length >= 2 && state.selection.activeArtboardId) {
          dispatch({ type: "GROUP_NODES", artboardId: state.selection.activeArtboardId });
        }
        return;
      }

      if (isMeta && e.altKey && (e.key === "c" || e.key === "C")) {
        e.preventDefault();
        copySelectedNodeStyle();
        return;
      }

      if (isMeta && e.altKey && (e.key === "v" || e.key === "V")) {
        e.preventDefault();
        pasteSelectedNodeStyle();
        return;
      }

      // Cmd+[ / Cmd+] / Cmd+Shift+[ / Cmd+Shift+] — Reorder selected node(s) among siblings
      if (isMeta && (e.key === "[" || e.key === "]" || e.key === "{" || e.key === "}")) {
        e.preventDefault();

        const activeArtboard = getActiveArtboard();
        if (!activeArtboard) return;

        const isForward = e.key === "]" || e.key === "}";
        const isExtreme = e.shiftKey || e.key === "{" || e.key === "}";

        // Multi-select z-order (DesignNode trees only)
        if (
          state.selection.selectedNodeIds.length > 1 &&
          state.selection.activeArtboardId &&
          isDesignNodeTree(activeArtboard.pageTree)
        ) {
          const tree = activeArtboard.pageTree as DesignNode;
          const normalized = normalizeSelection(state.selection.selectedNodeIds, tree);
          if (normalized.length === 0) return;

          const parent = allSameParent(normalized, tree);
          if (!parent) return; // cross-parent — z-order disabled

          const siblings = parent.children ?? [];
          const selectedSet = new Set(normalized);
          const selectedIndices = siblings
            .map((child, idx) => ({ id: child.id, idx }))
            .filter((entry) => selectedSet.has(entry.id));

          if (selectedIndices.length === 0) return;

          dispatch({ type: "PUSH_HISTORY", description: "Reordered elements" });

          const parentNodeId = parent.id !== tree.id ? parent.id : undefined;

          if (isExtreme) {
            // Bring to Front / Send to Back
            if (isForward) {
              // Move all selected to end, preserving relative order (process from lowest index)
              const sorted = [...selectedIndices].sort((a, b) => a.idx - b.idx);
              for (const entry of sorted) {
                dispatch({
                  type: "REORDER_NODE",
                  artboardId: activeArtboard.id,
                  nodeId: entry.id,
                  newIndex: siblings.length - 1,
                  parentNodeId,
                });
              }
            } else {
              // Move all selected to start, preserving relative order (process from highest index)
              const sorted = [...selectedIndices].sort((a, b) => b.idx - a.idx);
              for (const entry of sorted) {
                dispatch({
                  type: "REORDER_NODE",
                  artboardId: activeArtboard.id,
                  nodeId: entry.id,
                  newIndex: 0,
                  parentNodeId,
                });
              }
            }
          } else {
            // Bring Forward / Send Backward by one position
            if (isForward) {
              // Process from highest index first to avoid collisions
              const sorted = [...selectedIndices].sort((a, b) => b.idx - a.idx);
              for (const entry of sorted) {
                const newIndex = entry.idx + 1;
                if (newIndex >= siblings.length) continue;
                dispatch({
                  type: "REORDER_NODE",
                  artboardId: activeArtboard.id,
                  nodeId: entry.id,
                  newIndex,
                  parentNodeId,
                });
              }
            } else {
              // Process from lowest index first to avoid collisions
              const sorted = [...selectedIndices].sort((a, b) => a.idx - b.idx);
              for (const entry of sorted) {
                const newIndex = entry.idx - 1;
                if (newIndex < 0) continue;
                dispatch({
                  type: "REORDER_NODE",
                  artboardId: activeArtboard.id,
                  nodeId: entry.id,
                  newIndex,
                  parentNodeId,
                });
              }
            }
          }
          return;
        }

        // Single-select z-order (original behavior)
        const metadata = getSelectedNodeMetadata();
        if (!metadata) return;

        if (isExtreme) {
          // Bring to Front / Send to Back
          const newIndex = isForward ? metadata.siblings.length - 1 : 0;
          if (newIndex === metadata.index) return;
          dispatch({
            type: "REORDER_NODE",
            artboardId: metadata.activeArtboard.id,
            nodeId: metadata.node.id,
            newIndex,
            parentNodeId:
              metadata.parent && metadata.parent.id !== metadata.activeArtboard.pageTree.id
                ? metadata.parent.id
                : undefined,
          });
        } else {
          // Bring Forward / Send Backward by one
          const direction = isForward ? 1 : -1;
          const newIndex = metadata.index + direction;
          if (newIndex < 0 || newIndex >= metadata.siblings.length) return;
          dispatch({
            type: "REORDER_NODE",
            artboardId: metadata.activeArtboard.id,
            nodeId: metadata.node.id,
            newIndex,
            parentNodeId:
              metadata.parent && metadata.parent.id !== metadata.activeArtboard.pageTree.id
                ? metadata.parent.id
                : undefined,
          });
        }
        return;
      }

      // Cmd+A — Select all top-level children on the active artboard, or all canvas items otherwise
      if (isMeta && (e.key === "a" || e.key === "A")) {
        e.preventDefault();

        const activeArtboard = getActiveArtboard();
        if (activeArtboard) {
          const children = activeArtboard.pageTree.children ?? [];
          const childIds = children.map((c) => c.id);
          if (childIds.length > 0) {
            dispatch({
              type: "SET_SELECTED_NODES",
              artboardId: activeArtboard.id,
              nodeIds: childIds,
            });
          }
          return;
        }

        dispatch({ type: "DESELECT_ALL" });
        for (const item of state.items) {
          dispatch({ type: "SELECT_ITEM", itemId: item.id, addToSelection: true });
        }
        return;
      }

      // Delete / Backspace — Remove selected section node or canvas items
      if (e.key === "Delete" || e.key === "Backspace") {
        if (state.selection.selectedNodeId && state.selection.activeArtboardId) {
          e.preventDefault();
          dispatch({ type: "DELETE_SECTION", artboardId: state.selection.activeArtboardId, nodeId: state.selection.selectedNodeId });
        } else if (state.selection.selectedItemIds.length > 0) {
          e.preventDefault();
          dispatch({ type: "PUSH_HISTORY", description: "Deleted items" });
          for (const itemId of state.selection.selectedItemIds) {
            dispatch({ type: "REMOVE_ITEM", itemId });
          }
        }
        return;
      }

      // Escape — Walk up the node hierarchy (Figma behavior)
      // Multi-select → primary only → parent node → grandparent → ... → top-level section → deselect node → deselect all
      if (e.key === "Escape") {
        // If another handler already handled this Escape (popover, menu, etc.), skip
        if (e.defaultPrevented) return;
        e.preventDefault();

        // Layer 1: Multi-select → collapse to primary only
        if (state.selection.selectedNodeIds.length > 1) {
          dispatch({ type: "CLEAR_MULTI_SELECTION" });
          return;
        }

        if (state.selection.selectedNodeId && state.selection.activeArtboardId) {
          const artboard = state.items.find(
            (item): item is ArtboardItem =>
              item.kind === "artboard" && item.id === state.selection.activeArtboardId
          );
          if (artboard) {
            if (isDesignNodeTree(artboard.pageTree)) {
              const parent = findDesignNodeParent(
                artboard.pageTree,
                state.selection.selectedNodeId
              );
              if (parent && parent.id !== artboard.pageTree.id) {
                dispatch({
                  type: "SELECT_NODE",
                  artboardId: state.selection.activeArtboardId,
                  nodeId: parent.id,
                });
                return;
              }
            } else {
              const parent = findParentNode(
                artboard.pageTree,
                state.selection.selectedNodeId
              );
              if (parent && parent.type !== "page") {
                // Walk up to parent node
                dispatch({
                  type: "SELECT_NODE",
                  artboardId: state.selection.activeArtboardId,
                  nodeId: parent.id,
                });
                return;
              }
            }
          }
        }

        // Fall through: clear node selection, then deselect all
        dispatch({ type: "ESCAPE" });
        return;
      }

      // Tab / Shift+Tab — Navigate between siblings at the same tree level
      if (e.key === "Tab" && state.selection.selectedNodeId && state.selection.activeArtboardId) {
        e.preventDefault();
        const metadata = getSelectedNodeMetadata();
        if (!metadata || metadata.siblings.length <= 1) return;

        let nextIndex: number;
        if (e.shiftKey) {
          nextIndex = metadata.index === 0 ? metadata.siblings.length - 1 : metadata.index - 1;
        } else {
          nextIndex = metadata.index === metadata.siblings.length - 1 ? 0 : metadata.index + 1;
        }

        dispatch({
          type: "SELECT_NODE",
          artboardId: metadata.activeArtboard.id,
          nodeId: metadata.siblings[nextIndex].id,
        });
        return;
      }

      // Cmd+[ - Previous sibling
      if (isMeta && e.key === "[") {
        e.preventDefault();
        const activeArtboard = getActiveArtboard();
        if (state.selection.selectedNodeId && activeArtboard?.pageTree) {
          const parent = getParent(
            { id: state.selection.selectedNodeId } as DesignNode,
            activeArtboard.pageTree as DesignNode
          );
          if (parent) {
            const prevSiblingId = cycleSiblingSelection(state.selection.selectedNodeId, parent, "previous");
            if (prevSiblingId) {
              dispatch({
                type: "SELECT_NODE",
                artboardId: activeArtboard.id,
                nodeId: prevSiblingId,
              });
            }
          }
        }
        return;
      }

      // Cmd+] - Next sibling
      if (isMeta && e.key === "]") {
        e.preventDefault();
        const activeArtboard = getActiveArtboard();
        if (state.selection.selectedNodeId && activeArtboard?.pageTree) {
          const parent = getParent(
            { id: state.selection.selectedNodeId } as DesignNode,
            activeArtboard.pageTree as DesignNode
          );
          if (parent) {
            const nextSiblingId = cycleSiblingSelection(state.selection.selectedNodeId, parent, "next");
            if (nextSiblingId) {
              dispatch({
                type: "SELECT_NODE",
                artboardId: activeArtboard.id,
                nodeId: nextSiblingId,
              });
            }
          }
        }
        return;
      }

      // Shift+Escape - Jump to root artboard
      if (e.shiftKey && e.key === "Escape") {
        e.preventDefault();
        const activeArtboard = getActiveArtboard();
        if (activeArtboard?.pageTree) {
          dispatch({
            type: "SELECT_NODE",
            artboardId: activeArtboard.id,
            nodeId: activeArtboard.pageTree.id,
          });
        }
        return;
      }

      // Cmd+Enter - Enter frame (drill into group, select first child)
      if (isMeta && e.key === "Enter") {
        e.preventDefault();
        const activeArtboard = getActiveArtboard();
        if (state.selection.selectedNodeId && activeArtboard?.pageTree) {
          const rootNode = activeArtboard.pageTree as DesignNode;
          const node = findDesignNodeByIdFromNested(rootNode, state.selection.selectedNodeId);
          if (node?.children && node.children.length > 0) {
            dispatch({
              type: "SELECT_NODE",
              artboardId: activeArtboard.id,
              nodeId: node.children[0].id,
            });
          }
        }
        return;
      }

      // Cmd+Arrow navigation (parent/first child/previous sibling/next sibling)
      if (isMeta && (e.key.startsWith("Arrow") || ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key))) {
        const activeArtboard = getActiveArtboard();
        if (!state.selection.selectedNodeId || !activeArtboard?.pageTree) {
          return;
        }

        const rootNode = activeArtboard.pageTree as DesignNode;
        const selectedNodeId = state.selection.selectedNodeId;

        switch (e.key) {
          case "ArrowUp":
            e.preventDefault();
            // Select parent
            {
              const parent = getParent({ id: selectedNodeId } as DesignNode, rootNode);
              if (parent && parent.id !== rootNode.id) {
                dispatch({
                  type: "SELECT_NODE",
                  artboardId: activeArtboard.id,
                  nodeId: parent.id,
                });
              }
            }
            break;

          case "ArrowDown":
            e.preventDefault();
            // Select first child
            {
              const node = findDesignNodeByIdFromNested(rootNode, selectedNodeId);
              if (node?.children && node.children.length > 0) {
                dispatch({
                  type: "SELECT_NODE",
                  artboardId: activeArtboard.id,
                  nodeId: node.children[0].id,
                });
              }
            }
            break;

          case "ArrowLeft":
            e.preventDefault();
            // Previous sibling
            {
              const parent = getParent({ id: selectedNodeId } as DesignNode, rootNode);
              if (parent) {
                const prevSiblingId = cycleSiblingSelection(selectedNodeId, parent, "previous");
                if (prevSiblingId) {
                  dispatch({
                    type: "SELECT_NODE",
                    artboardId: activeArtboard.id,
                    nodeId: prevSiblingId,
                  });
                }
              }
            }
            break;

          case "ArrowRight":
            e.preventDefault();
            // Next sibling
            {
              const parent = getParent({ id: selectedNodeId } as DesignNode, rootNode);
              if (parent) {
                const nextSiblingId = cycleSiblingSelection(selectedNodeId, parent, "next");
                if (nextSiblingId) {
                  dispatch({
                    type: "SELECT_NODE",
                    artboardId: activeArtboard.id,
                    nodeId: nextSiblingId,
                  });
                }
              }
            }
            break;
        }
        return;
      }

      // Cmd+B / Cmd+I / Cmd+U — Toggle bold/italic/underline formatting for text nodes
      if (isMeta && (e.key === "b" || e.key === "B" || e.key === "i" || e.key === "I" || e.key === "u" || e.key === "U")) {
        const activeArtboard = getActiveArtboard();
        if (state.selection.selectedNodeId && activeArtboard?.pageTree && isDesignNodeTree(activeArtboard.pageTree)) {
          const node = findDesignNodeById(
            activeArtboard.pageTree as DesignNode,
            state.selection.selectedNodeId
          );
          if (node && node.type === "text") {
            e.preventDefault();
            const currentStyle = node.style || {};

            if (e.key === "b" || e.key === "B") {
              // Toggle bold: 400 ↔ 700
              const currentWeight = currentStyle.fontWeight ?? 400;
              const newWeight = currentWeight === 700 ? 400 : 700;
              dispatch({ type: "PUSH_HISTORY", description: "Applied bold" });
              dispatch({
                type: "UPDATE_NODE_STYLE",
                artboardId: activeArtboard.id,
                nodeId: node.id,
                style: { fontWeight: newWeight } as Record<string, unknown>,
              });
            } else if (e.key === "i" || e.key === "I") {
              // Toggle italic: normal ↔ italic
              const currentStyle_value = currentStyle.fontStyle ?? "normal";
              const newStyle = currentStyle_value === "italic" ? "normal" : "italic";
              dispatch({ type: "PUSH_HISTORY", description: "Applied italic" });
              dispatch({
                type: "UPDATE_NODE_STYLE",
                artboardId: activeArtboard.id,
                nodeId: node.id,
                style: { fontStyle: newStyle } as Record<string, unknown>,
              });
            } else if (e.key === "u" || e.key === "U") {
              // Toggle underline: none ↔ underline
              const currentDecoration = currentStyle.textDecoration ?? "none";
              const newDecoration = currentDecoration === "underline" ? "none" : "underline";
              dispatch({ type: "PUSH_HISTORY", description: "Applied underline" });
              dispatch({
                type: "UPDATE_NODE_STYLE",
                artboardId: activeArtboard.id,
                nodeId: node.id,
                style: { textDecoration: newDecoration } as Record<string, unknown>,
              });
            }
          }
        }
        return;
      }

      // Single key shortcuts (no modifier)
      if (!isMeta && !e.altKey) {
        if (e.key === "Enter") {
          if (hasBlockingPopoverOpen()) return;

          const activeArtboard = getActiveArtboard();
          if (!activeArtboard) return;

          if (state.selection.selectedNodeId) {
            if (isDesignNodeTree(activeArtboard.pageTree)) {
              const selectedNode = findDesignNodeById(
                activeArtboard.pageTree,
                state.selection.selectedNodeId
              );

              if (
                selectedNode &&
                (selectedNode.type === "text" || selectedNode.type === "button")
              ) {
                e.preventDefault();
                window.dispatchEvent(
                  new CustomEvent<InlineTextEditEventDetail>(
                    ENTER_TEXT_EDIT_MODE_EVENT,
                    {
                      detail: {
                        artboardId: activeArtboard.id,
                        nodeId: selectedNode.id,
                      },
                    }
                  )
                );
                return;
              }
            } else {
              const selectedNode = findNodeById(
                activeArtboard.pageTree,
                state.selection.selectedNodeId
              );

              if (
                selectedNode &&
                (selectedNode.type === "heading" ||
                  selectedNode.type === "paragraph" ||
                  selectedNode.type === "button")
              ) {
                e.preventDefault();
                window.dispatchEvent(
                  new CustomEvent<InlineTextEditEventDetail>(
                    ENTER_TEXT_EDIT_MODE_EVENT,
                    {
                      detail: {
                        artboardId: activeArtboard.id,
                        nodeId: selectedNode.id,
                      },
                    }
                  )
                );
                return;
              }
            }
          }
        }

        // V/H/M/K — Tool palette shortcuts
        if (onSetActiveTool) {
          const toolMap: Record<string, string> = {
            v: "select", V: "select",
            h: "hand", H: "hand",
            m: "marquee", M: "marquee",
            k: "prompt", K: "prompt",
          };
          const tool = toolMap[e.key];
          if (tool) {
            e.preventDefault();
            onSetActiveTool(tool);
            return;
          }
        }

        // P — Focus prompt (opens inspector if hidden, expands prompt section, focuses textarea)
        if (e.key === "p" || e.key === "P") {
          e.preventDefault();
          onFocusPrompt();
          return;
        }

        // L — Toggle layers panel
        if (e.key === "l" || e.key === "L") {
          e.preventDefault();
          onToggleLayers();
          return;
        }

        // I — Toggle inspector panel
        if (e.key === "i" || e.key === "I") {
          e.preventDefault();
          onToggleInspector();
          return;
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [state, dispatch, onToggleLayers, onToggleInspector, onFocusPrompt, onSetActiveTool, zoomToFit, zoomToSelection]);
}
