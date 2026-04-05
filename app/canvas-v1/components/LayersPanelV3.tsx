"use client";

/**
 * V3 Layers Panel — grouped collapsible tree for the unified canvas.
 * Groups: Site (artboards with page tree), References, Notes.
 */

import * as React from "react";
import {
  Monitor, Smartphone, ChevronRight, Layout, Type,
  AlignLeft, RectangleHorizontal, Grid3X3, Star, MessageSquare,
  CreditCard, Layers, Image as ImageIcon, StickyNote, Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvas } from "@/lib/canvas/canvas-context";
import { BREAKPOINT_WIDTHS, isDesignNodeTree } from "@/lib/canvas/compose";
import type { PageNode } from "@/lib/canvas/compose";
import type { DesignNode } from "@/lib/canvas/design-node";
import { findDesignNodeParent, cloneDesignNode } from "@/lib/canvas/design-node";
import { saveComponent, type DesignComponent } from "@/lib/canvas/design-component-library";
import { DesignNodeContextMenu } from "./DesignNodeContextMenu";
import type { ArtboardItem, ReferenceItem, NoteItem } from "@/lib/canvas/unified-canvas-state";
import { useLayersDragReorder, type DropTarget } from "@/app/canvas-v1/hooks/useLayersDragReorder";

// ─── Node type → icon ────────────────────────────────────────────────────────

function NodeIcon({ type }: { type: PageNode["type"] }) {
  const cls = "shrink-0 text-[#A0A0A0] dark:text-[#666666]";
  const props = { size: 14, strokeWidth: 1.5, className: cls } as const;
  switch (type) {
    case "page": return <Layout {...props} />;
    case "section": return <Layers {...props} />;
    case "heading": return <Type {...props} />;
    case "paragraph": return <AlignLeft {...props} />;
    case "button": case "button-row": return <RectangleHorizontal {...props} />;
    case "feature-grid": case "feature-card": return <Grid3X3 {...props} />;
    case "metric-row": case "metric-item": return <Star {...props} />;
    case "testimonial-grid": case "testimonial-card": return <MessageSquare {...props} />;
    case "pricing-grid": case "pricing-tier": return <CreditCard {...props} />;
    default: return <Layout {...props} />;
  }
}

function formatLabel(node: PageNode): string {
  const content = node.content?.text || node.content?.label || node.name;
  return content.length > 28 ? `${content.slice(0, 28)}…` : content;
}

// ─── DesignNode type → icon ─────────────────────────────────────────────────

function DesignNodeIcon({ type }: { type: DesignNode["type"] }) {
  const cls = "shrink-0 text-[#A0A0A0] dark:text-[#666666]";
  const props = { size: 14, strokeWidth: 1.5, className: cls } as const;
  switch (type) {
    case "frame": return <Layers {...props} />;
    case "text": return <Type {...props} />;
    case "image": return <ImageIcon {...props} />;
    case "button": return <RectangleHorizontal {...props} />;
    case "divider": return <Minus {...props} />;
    default: return <Layout {...props} />;
  }
}

function formatDesignNodeLabel(node: DesignNode): string {
  const label = node.name || node.content?.text || node.type;
  return label.length > 28 ? `${label.slice(0, 28)}…` : label;
}

// ─── Drop Indicator ─────────────────────────────────────────────────────────

function DropIndicatorLine({ depth }: { depth: number }) {
  return (
    <div
      className="pointer-events-none h-[2px] bg-[#4B57DB]"
      style={{ marginLeft: depth * 14 + 16 }}
    />
  );
}

// ─── Recursive DesignNode Tree Node ─────────────────────────────────────────

function DesignTreeNode({
  node, depth, selectedNodeId, selectedNodeIds, artboardId, parentId, index,
  onSelectNode, onContextMenu, dispatch,
  draggedId, dropTarget, onDragPointerDown,
}: {
  node: DesignNode; depth: number; selectedNodeId: string | null;
  selectedNodeIds: string[]; artboardId: string;
  parentId: string; index: number;
  onSelectNode: (artboardId: string, nodeId: string) => void;
  onContextMenu?: (node: DesignNode, artboardId: string, event: React.MouseEvent) => void;
  dispatch: React.Dispatch<{ type: "TOGGLE_NODE_SELECTION"; artboardId: string; nodeId: string }>;
  draggedId: string | null;
  dropTarget: DropTarget | null;
  onDragPointerDown: (e: React.PointerEvent, nodeId: string, parentId: string) => void;
}) {
  const hasChildren = node.children && node.children.length > 0;
  const [expanded, setExpanded] = React.useState(depth < 2);
  const isPrimary = selectedNodeId === node.id;
  const isSecondary = !isPrimary && selectedNodeIds.includes(node.id);
  const isDragged = draggedId === node.id;

  // Show drop indicator above this row when drop target index matches this row's index
  const showDropAbove =
    dropTarget !== null &&
    dropTarget.parentId === parentId &&
    dropTarget.index === index;

  return (
    <>
      {showDropAbove && <DropIndicatorLine depth={depth} />}
      <button
        type="button"
        data-layer-node-id={node.id}
        data-layer-parent-id={parentId}
        data-layer-index={index}
        onClick={(e) => {
          // Don't fire click if we were just dragging
          if (draggedId) return;
          if (e.shiftKey) {
            dispatch({ type: "TOGGLE_NODE_SELECTION", artboardId, nodeId: node.id });
          } else {
            onSelectNode(artboardId, node.id);
          }
        }}
        onPointerDown={(e) => onDragPointerDown(e, node.id, parentId)}
        onContextMenu={(e) => onContextMenu?.(node, artboardId, e)}
        className={cn(
          "group flex w-full items-center gap-1.5 text-left transition-colors duration-75",
          isPrimary
            ? "bg-[#D1E4FC]/50 text-[#4B57DB] border-l-[1.5px] border-[#4B57DB] dark:bg-[#222244]/50"
            : isSecondary
              ? "bg-[#D1E4FC]/25 text-[#4B57DB]/70 border-l-[1.5px] border-[#4B57DB]/45 dark:bg-[#222244]/25"
              : "text-[#1A1A1A] hover:bg-[#F5F5F0] border-l-[1.5px] border-transparent dark:text-[#D0D0D0] dark:hover:bg-[#2A2A2A]"
        )}
        style={{
          height: 28,
          paddingLeft: depth * 14 + (hasChildren ? 4 : 16),
          opacity: isDragged ? 0.4 : 1,
        }}
      >
        {hasChildren && (
          <span
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm hover:bg-[#E5E5E0] dark:hover:bg-[#333333]"
          >
            <ChevronRight size={10} strokeWidth={1.5} className={cn("transition-transform duration-100", expanded && "rotate-90")} />
          </span>
        )}
        <DesignNodeIcon type={node.type} />
        <span className="min-w-0 flex-1 truncate text-[12px] dark:text-[#D0D0D0]">{formatDesignNodeLabel(node)}</span>
        {node.isGroup && (
          <span className="text-[10px] text-[#A0A0A0] ml-auto mr-1 dark:text-[#666666]">Group</span>
        )}
        {isPrimary && selectedNodeIds.length > 1 && (
          <span className="ml-auto mr-2 text-[9px] text-[#4B57DB] bg-[#D1E4FC]/50 px-1 rounded-[2px] dark:bg-[#222244]/50">primary</span>
        )}
      </button>
      {expanded && hasChildren && node.children!.map((child, childIdx) => (
        <DesignTreeNode
          key={child.id} node={child} depth={depth + 1}
          selectedNodeId={selectedNodeId} selectedNodeIds={selectedNodeIds}
          artboardId={artboardId} parentId={node.id} index={childIdx}
          onSelectNode={onSelectNode} onContextMenu={onContextMenu} dispatch={dispatch}
          draggedId={draggedId} dropTarget={dropTarget} onDragPointerDown={onDragPointerDown}
        />
      ))}
      {/* Drop indicator after last sibling */}
      {dropTarget !== null &&
        dropTarget.parentId === parentId &&
        dropTarget.index === index + 1 && (
          <DropIndicatorLine depth={depth} />
        )}
    </>
  );
}

function BreakpointIcon({ bp }: { bp: string }) {
  const props = { size: 14, strokeWidth: 1, className: "shrink-0 text-[#A0A0A0] dark:text-[#666666]" } as const;
  if (bp === "mobile") return <Smartphone {...props} />;
  return <Monitor {...props} />;
}

// ─── Recursive Tree Node ─────────────────────────────────────────────────────

function TreeNode({
  node, depth, selectedNodeId, artboardId, onSelectNode,
}: {
  node: PageNode; depth: number; selectedNodeId: string | null;
  artboardId: string; onSelectNode: (artboardId: string, nodeId: string) => void;
}) {
  const hasChildren = node.children && node.children.length > 0;
  const [expanded, setExpanded] = React.useState(depth < 2);
  const isSelected = selectedNodeId === node.id;

  return (
    <>
      <button
        type="button"
        onClick={() => onSelectNode(artboardId, node.id)}
        className={cn(
          "group flex w-full items-center gap-1.5 text-left transition-colors duration-75",
          isSelected
            ? "bg-[#D1E4FC]/50 text-[#4B57DB] border-l-[1.5px] border-[#4B57DB] dark:bg-[#222244]/50"
            : "text-[#1A1A1A] hover:bg-[#F5F5F0] border-l-[1.5px] border-transparent dark:text-[#D0D0D0] dark:hover:bg-[#2A2A2A]"
        )}
        style={{ height: 28, paddingLeft: depth * 14 + (hasChildren ? 4 : 16) }}
      >
        {hasChildren && (
          <span
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm hover:bg-[#E5E5E0] dark:hover:bg-[#333333]"
          >
            <ChevronRight size={10} strokeWidth={1.5} className={cn("transition-transform duration-100", expanded && "rotate-90")} />
          </span>
        )}
        <NodeIcon type={node.type} />
        <span className="min-w-0 flex-1 truncate text-[12px] dark:text-[#D0D0D0]">{formatLabel(node)}</span>
      </button>
      {expanded && hasChildren && node.children!.map((child) => (
        <TreeNode key={child.id} node={child} depth={depth + 1} selectedNodeId={selectedNodeId} artboardId={artboardId} onSelectNode={onSelectNode} />
      ))}
    </>
  );
}

// ─── Collapsible Group ───────────────────────────────────────────────────────

function Group({ label, count, defaultOpen, children }: {
  label: string; count?: number; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen ?? true);
  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[1px] text-[#A0A0A0] hover:text-[#6B6B6B] dark:text-[#666666] dark:hover:text-[#D0D0D0]"
      >
        <ChevronRight size={10} strokeWidth={1.5} className={cn("transition-transform duration-100", open && "rotate-90")} />
        {label}
        {typeof count === "number" && <span className="ml-auto text-[9px]">({count})</span>}
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

// ─── Main Panel ──────────────────────────────────────────────────────────────

export function LayersPanelV3() {
  const { state, dispatch } = useCanvas();
  const { items, selection } = state;

  const artboards = items.filter((i): i is ArtboardItem => i.kind === "artboard");
  const references = items.filter((i): i is ReferenceItem => i.kind === "reference");
  const notes = items.filter((i): i is NoteItem => i.kind === "note");

  // Fixed breakpoint order
  const orderedArtboards = ["desktop", "mobile"]
    .map((bp) => artboards.find((a) => a.breakpoint === bp))
    .filter((a): a is ArtboardItem => Boolean(a));

  const handleSelectItem = (itemId: string) => {
    dispatch({ type: "SELECT_ITEM", itemId });
  };

  const handleSelectNode = (artboardId: string, nodeId: string) => {
    dispatch({ type: "SELECT_NODE", artboardId, nodeId });
  };

  // ── DesignNode context menu ──
  const [dnContextMenu, setDnContextMenu] = React.useState<{
    node: DesignNode;
    artboardId: string;
    position: { x: number; y: number };
  } | null>(null);

  const handleDesignNodeContextMenu = React.useCallback(
    (node: DesignNode, artboardId: string, event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      dispatch({ type: "SELECT_NODE", artboardId, nodeId: node.id });
      setDnContextMenu({ node, artboardId, position: { x: event.clientX, y: event.clientY } });
    },
    [dispatch]
  );

  // ── Drag reorder hook ──
  const { draggedId, dropTarget, handlePointerDown: dragPointerDown, handlePointerMove, handlePointerUp, handlePointerCancel } = useLayersDragReorder({
    onReorder: React.useCallback((nodeId: string, parentId: string | undefined, newIndex: number) => {
      const activeArtboardId = selection.activeArtboardId;
      if (!activeArtboardId) return;

      dispatch({
        type: "REORDER_NODE",
        artboardId: activeArtboardId,
        nodeId,
        newIndex,
        parentNodeId: parentId,
      });
    }, [selection.activeArtboardId, dispatch]),
    selectedNodeIds: selection.selectedNodeIds,
    onCollapseToSingle: React.useCallback((artboardId: string, nodeId: string) => {
      dispatch({ type: "SELECT_NODE", artboardId, nodeId });
    }, [dispatch]),
  });

  return (
    <div
      className="absolute left-0 top-0 bottom-0 z-20 flex flex-col w-[200px] min-w-[200px] max-w-[200px] border-r-[0.5px] border-[#EFEFEC] bg-white dark:bg-[#1A1A1A] dark:border-[#333333]"
      style={{ contain: "strict" }}
    >
      {/* Scrollable content — isolated from the positioning shell above so
          scroll position can never shift the panel's top edge. */}
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden min-h-0"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        <div className="pt-3 pb-2">
          {/* Site group */}
          {orderedArtboards.length > 0 && (
            <Group label="Site" defaultOpen>
              {orderedArtboards.map((artboard) => (
                <div key={artboard.id}>
                  <button
                    onClick={() => handleSelectItem(artboard.id)}
                    className={cn(
                      "flex w-full items-center gap-1.5 px-3 py-1 text-left transition-colors",
                      selection.selectedItemIds.includes(artboard.id)
                        ? "bg-[#D1E4FC]/50 text-[#4B57DB] dark:bg-[#222244]/50"
                        : "text-[#1A1A1A] hover:bg-[#F5F5F0] dark:text-[#D0D0D0] dark:hover:bg-[#2A2A2A]"
                    )}
                    style={{ height: 28, paddingLeft: 24 }}
                  >
                    <BreakpointIcon bp={artboard.breakpoint} />
                    <span className="truncate text-[12px] dark:text-[#D0D0D0]">
                      {artboard.breakpoint.charAt(0).toUpperCase() + artboard.breakpoint.slice(1)} · {BREAKPOINT_WIDTHS[artboard.breakpoint]}px
                    </span>
                  </button>
                  {/* Page tree — DesignNode or PageNode */}
                  {isDesignNodeTree(artboard.pageTree)
                    ? (artboard.pageTree as DesignNode).children?.map((child, childIdx) => (
                        <DesignTreeNode
                          key={child.id}
                          node={child}
                          depth={2}
                          selectedNodeId={selection.activeArtboardId === artboard.id ? selection.selectedNodeId : null}
                          selectedNodeIds={selection.activeArtboardId === artboard.id ? selection.selectedNodeIds : []}
                          artboardId={artboard.id}
                          parentId={(artboard.pageTree as DesignNode).id}
                          index={childIdx}
                          onSelectNode={handleSelectNode}
                          onContextMenu={handleDesignNodeContextMenu}
                          dispatch={dispatch}
                          draggedId={draggedId}
                          dropTarget={dropTarget}
                          onDragPointerDown={dragPointerDown}
                        />
                      ))
                    : artboard.pageTree.children?.map((child) => (
                        <TreeNode
                          key={child.id}
                          node={child}
                          depth={2}
                          selectedNodeId={selection.activeArtboardId === artboard.id ? selection.selectedNodeId : null}
                          artboardId={artboard.id}
                          onSelectNode={handleSelectNode}
                        />
                      ))
                  }
                </div>
              ))}
            </Group>
          )}

          {/* References group */}
          {references.length > 0 && (
            <Group label="References" count={references.length}>
              {references.map((ref) => (
                <button
                  key={ref.id}
                  onClick={() => handleSelectItem(ref.id)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-1 text-left transition-colors",
                    selection.selectedItemIds.includes(ref.id)
                      ? "bg-[#D1E4FC]/50 text-[#4B57DB] dark:bg-[#222244]/50"
                      : "text-[#1A1A1A] hover:bg-[#F5F5F0] dark:text-[#D0D0D0] dark:hover:bg-[#2A2A2A]"
                  )}
                  style={{ height: 28, paddingLeft: 24 }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ref.imageUrl} alt="" className="h-6 w-6 shrink-0 rounded-[2px] object-cover" />
                  <span className="min-w-0 flex-1 truncate text-[12px] dark:text-[#D0D0D0]">
                    {ref.title || "Reference"}
                  </span>
                </button>
              ))}
            </Group>
          )}

          {/* Notes group */}
          {notes.length > 0 && (
            <Group label="Notes" count={notes.length}>
              {notes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => handleSelectItem(note.id)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-1 text-left transition-colors",
                    selection.selectedItemIds.includes(note.id)
                      ? "bg-[#D1E4FC]/50 text-[#4B57DB] dark:bg-[#222244]/50"
                      : "text-[#1A1A1A] hover:bg-[#F5F5F0] dark:text-[#D0D0D0] dark:hover:bg-[#2A2A2A]"
                  )}
                  style={{ height: 28, paddingLeft: 24 }}
                >
                  <StickyNote size={14} strokeWidth={1.5} className="shrink-0 text-[#A0A0A0] dark:text-[#666666]" />
                  <span className="min-w-0 flex-1 truncate text-[12px] dark:text-[#D0D0D0]">
                    &ldquo;{note.text.length > 24 ? note.text.slice(0, 24) + "…" : note.text}&rdquo;
                  </span>
                </button>
              ))}
            </Group>
          )}
        </div>
      </div>

      {/* DesignNode context menu */}
      {dnContextMenu && (() => {
        const artboard = artboards.find((a) => a.id === dnContextMenu.artboardId);
        if (!artboard || !isDesignNodeTree(artboard.pageTree)) return null;
        const tree = artboard.pageTree as DesignNode;
        const parent = findDesignNodeParent(tree, dnContextMenu.node.id);
        const siblings = parent?.children ?? tree.children ?? [];
        const idx = siblings.findIndex((c) => c.id === dnContextMenu.node.id);
        const bp = artboard.breakpoint;
        const isNonRootFrame = dnContextMenu.node.type === "frame" && dnContextMenu.node.id !== tree.id;

        return (
          <DesignNodeContextMenu
            node={dnContextMenu.node}
            position={dnContextMenu.position}
            breakpoint={bp}
            isFirst={idx === 0}
            isLast={idx === siblings.length - 1}
            isHidden={Boolean(dnContextMenu.node.hidden?.[bp])}
            onDuplicate={() => { dispatch({ type: "DUPLICATE_SECTION", artboardId: dnContextMenu.artboardId, nodeId: dnContextMenu.node.id }); setDnContextMenu(null); }}
            onDelete={() => { dispatch({ type: "DELETE_SECTION", artboardId: dnContextMenu.artboardId, nodeId: dnContextMenu.node.id }); setDnContextMenu(null); }}
            onMoveUp={() => {
              if (idx > 0 && parent) {
                dispatch({ type: "REORDER_NODE", artboardId: dnContextMenu.artboardId, nodeId: dnContextMenu.node.id, newIndex: idx - 1, parentNodeId: parent.id });
              } else if (idx > 0) {
                dispatch({ type: "REORDER_NODE", artboardId: dnContextMenu.artboardId, nodeId: dnContextMenu.node.id, newIndex: idx - 1 });
              }
              setDnContextMenu(null);
            }}
            onMoveDown={() => {
              if (idx < siblings.length - 1 && parent) {
                dispatch({ type: "REORDER_NODE", artboardId: dnContextMenu.artboardId, nodeId: dnContextMenu.node.id, newIndex: idx + 1, parentNodeId: parent.id });
              } else if (idx < siblings.length - 1) {
                dispatch({ type: "REORDER_NODE", artboardId: dnContextMenu.artboardId, nodeId: dnContextMenu.node.id, newIndex: idx + 1 });
              }
              setDnContextMenu(null);
            }}
            onToggleVisibility={() => { dispatch({ type: "TOGGLE_NODE_HIDDEN", artboardId: dnContextMenu.artboardId, nodeId: dnContextMenu.node.id, breakpoint: bp }); setDnContextMenu(null); }}
            onSaveToLibrary={isNonRootFrame ? (name: string) => {
              const clonedNode = cloneDesignNode(dnContextMenu.node);
              const projectId = artboard?.siteId ?? "unknown";
              const now = new Date().toISOString();
              const entry: DesignComponent = {
                id: `saved-${Math.random().toString(36).slice(2, 10)}`,
                name,
                category: "Saved",
                source: "saved",
                version: 1,
                projectId,
                projectName: projectId,
                createdAt: now,
                updatedAt: now,
                node: clonedNode,
              };
              saveComponent(entry);
              setDnContextMenu(null);
            } : undefined}
            onGroup={() => { dispatch({ type: "GROUP_NODES", artboardId: dnContextMenu.artboardId }); setDnContextMenu(null); }}
            onUngroup={() => { dispatch({ type: "UNGROUP_NODES", artboardId: dnContextMenu.artboardId, nodeId: dnContextMenu.node.id }); setDnContextMenu(null); }}
            isGroupNode={Boolean(dnContextMenu.node.isGroup)}
            multiSelectCount={selection.selectedNodeIds.length}
            onDismiss={() => setDnContextMenu(null)}
          />
        );
      })()}
    </div>
  );
}
