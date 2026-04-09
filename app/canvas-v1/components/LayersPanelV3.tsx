"use client";

/**
 * V3 Layers Panel — grouped collapsible tree for the unified canvas.
 * Groups: Site (artboards with page tree), References, Notes.
 */

import * as React from "react";
import {
  Monitor, Smartphone, ChevronRight, Layout, Type,
  AlignLeft, RectangleHorizontal, Grid3X3, Star, MessageSquare,
  CreditCard, Layers, Image as ImageIcon, StickyNote, Minus, Diamond, X, Square,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvas } from "@/lib/canvas/canvas-context";
import { BREAKPOINT_WIDTHS, isDesignNodeTree } from "@/lib/canvas/compose";
import type { PageNode } from "@/lib/canvas/compose";
import type { DesignNode } from "@/lib/canvas/design-node";
import { findDesignNodeParent, findDesignNodeById } from "@/lib/canvas/design-node";
import { DesignNodeContextMenu } from "./DesignNodeContextMenu";
import type { ArtboardItem, ReferenceItem, NoteItem, FrameItem, TextItem } from "@/lib/canvas/unified-canvas-state";
import { canvasItemToDesignNode } from "@/lib/canvas/canvas-item-conversion";
import { useLayersDragReorder, type DropTarget } from "@/app/canvas-v1/hooks/useLayersDragReorder";
import { resolveTree, isInstanceChild, findMaster, splitCompositeId, computeComponentsResolveEpoch } from "@/lib/canvas/component-resolver";
import { isBuiltinMasterId } from "@/lib/canvas/component-builtins";
import type { ComponentMaster } from "@/lib/canvas/design-node";
import {
  getInstanceRootSourceId,
  instanceRefHasAnyOverrides,
  isResolvedInstanceSubtreeRoot,
  resolvedLayerNodeHasOverride,
} from "@/lib/canvas/component-override-utils";

// ─── Helper: Get all ancestor IDs of a node ──────────────────────────────────

function getAncestors(nodeId: string, root: DesignNode): string[] {
  const ancestors: string[] = [];
  
  function findPath(node: DesignNode, targetId: string, path: string[]): boolean {
    if (node.id === targetId) {
      ancestors.push(...path);
      return true;
    }
    
    if (node.children) {
      for (const child of node.children) {
        if (findPath(child, targetId, [...path, node.id])) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  findPath(root, nodeId, []);
  return ancestors;
}

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

// ─── Instance context menu (inline, for instance root / child nodes) ─────────

function InstanceContextMenu({
  node,
  position,
  isInstanceRoot,
  onEditMaster,
  onDetach,
  onResetAll,
  onDelete,
  onResetOverride,
  onCopy,
  onDismiss,
}: {
  node: DesignNode;
  position: { x: number; y: number };
  isInstanceRoot: boolean;
  onEditMaster: () => void;
  onDetach: () => void;
  onResetAll: () => void;
  onDelete: () => void;
  onResetOverride: () => void;
  onCopy: () => void;
  onDismiss: () => void;
}) {
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pad = 8;
    let x = position.x;
    let y = position.y;
    if (rect.right > window.innerWidth - pad) x = window.innerWidth - rect.width - pad;
    if (rect.bottom > window.innerHeight - pad) y = window.innerHeight - rect.height - pad;
    if (x < pad) x = pad;
    if (y < pad) y = pad;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  }, [position]);

  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) { if (e.key === "Escape") onDismiss(); }
    function handleMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onDismiss();
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousedown", handleMouseDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", handleMouseDown, true);
    };
  }, [onDismiss]);

  function Item({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        className={cn(
          "flex w-full items-center px-3 py-1.5 text-[12px] text-left transition-colors",
          danger ? "text-red-500 hover:bg-red-50" : "text-[#1A1A1A] hover:bg-[#F5F5F0]"
        )}
      >
        {label}
      </button>
    );
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] min-w-[180px] rounded-[4px] border border-[#E5E5E0] bg-white py-1 shadow-lg"
      style={{ left: position.x, top: position.y }}
    >
      <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-[#A0A0A0]">
        {isInstanceRoot ? "Instance" : "Instance Child"} · {node.name}
      </div>
      <div className="h-px bg-[#E5E5E0] my-1" />
      {isInstanceRoot ? (
        <>
          <Item label="Edit Master" onClick={() => { onEditMaster(); onDismiss(); }} />
          <Item label="Detach Instance" onClick={() => { onDetach(); onDismiss(); }} />
          <Item label="Reset All Overrides" onClick={() => { onResetAll(); onDismiss(); }} />
          <div className="h-px bg-[#E5E5E0] my-1" />
          <Item label="Delete" onClick={() => { onDelete(); onDismiss(); }} danger />
        </>
      ) : (
        <>
          <Item label="Reset Override" onClick={() => { onResetOverride(); onDismiss(); }} />
          <Item label="Copy" onClick={() => { onCopy(); onDismiss(); }} />
        </>
      )}
    </div>
  );
}

// ─── Recursive DesignNode Tree Node ─────────────────────────────────────────

function DesignTreeNode({
  node, depth, selectedNodeId, selectedNodeIds, itemId, parentId, index,
  onSelectNode, onContextMenu, dispatch,
  draggedId, dropTarget, isValidDrop, onDragPointerDown,
  sourceTree, components,
  expandedNodeIds, onToggleExpanded,
  getNodeDepth,
}: {
  node: DesignNode; depth: number; selectedNodeId: string | null;
  selectedNodeIds: string[]; itemId: string;
  parentId: string; index: number;
  onSelectNode: (itemId: string, nodeId: string) => void;
  onContextMenu?: (node: DesignNode, itemId: string, event: React.MouseEvent) => void;
  dispatch: React.Dispatch<{ type: "TOGGLE_NODE_SELECTION"; itemId: string; nodeId: string }>;
  draggedId: string | null;
  dropTarget: DropTarget | null;
  isValidDrop: boolean;
  onDragPointerDown: (e: React.PointerEvent, nodeId: string, parentId: string) => void;
  sourceTree: DesignNode;
  components: ComponentMaster[];
  expandedNodeIds: Set<string>;
  onToggleExpanded: (nodeId: string) => void;
  getNodeDepth: (nodeId: string) => number;
}) {
  const hasChildren = node.children && node.children.length > 0;
  const expanded = expandedNodeIds.has(node.id);
  const isPrimary = selectedNodeId === node.id;
  const isSecondary = !isPrimary && selectedNodeIds.includes(node.id);
  const isDragged = draggedId === node.id;

  // ── Instance detection ──
  // For resolved nodes, composite IDs (with "::") indicate instance children.
  // Instance roots are detected by looking up the source tree.
  const isInsideInstance = isInstanceChild(node.id);
  const sourceNodeId = isInsideInstance ? splitCompositeId(node.id)[0] : node.id;
  const sourceNode = React.useMemo(
    () => findDesignNodeById(sourceTree, sourceNodeId),
    [sourceTree, sourceNodeId]
  );
  const isResolvedInstanceRoot = isResolvedInstanceSubtreeRoot(node.id, sourceTree, components);
  const isInstanceRoot =
    (!isInsideInstance && !!sourceNode?.componentRef) || isResolvedInstanceRoot;
  const dimAsInstanceChild = isInsideInstance && !isResolvedInstanceRoot;
  const master = sourceNode?.componentRef
    ? findMaster(components, sourceNode.componentRef.masterId)
    : null;
  const masterName = master?.name ?? null;
  const isStale =
    isInstanceRoot && sourceNode?.componentRef && master
      ? sourceNode.componentRef.masterVersion < master.version
      : false;
  const showOverrideDot =
    (isInstanceRoot &&
      !!sourceNode?.componentRef &&
      instanceRefHasAnyOverrides(sourceNode.componentRef)) ||
    resolvedLayerNodeHasOverride(node.id, sourceTree);

  // Show drop indicator above this row when drop target index matches this row's index
  const showDropAbove =
    dropTarget !== null &&
    dropTarget.parentId === parentId &&
    dropTarget.index === index;

  // Check if this row is the drop target's parent target (middle zone on valid frame)
  const isParentTarget =
    draggedId !== null &&
    dropTarget !== null &&
    dropTarget.parentId === node.id &&
    node.id !== draggedId;

  // Check if this row is being hovered as an invalid parent target
  const isInvalidParentTarget =
    draggedId !== null &&
    dropTarget !== null &&
    dropTarget.parentId === node.id &&
    !isValidDrop &&
    node.id !== draggedId;

  // Container types that can accept children
  const isContainer = node.type === "frame" || node.isGroup === true;

  const rowOpacity = isDragged ? 0.4 : dimAsInstanceChild ? 0.6 : isInvalidParentTarget ? 0.5 : 1;

  return (
    <>
      {showDropAbove && <DropIndicatorLine depth={depth} />}
      <button
        type="button"
        data-layer-id={node.id}
        data-layer-node-id={node.id}
        data-layer-parent-id={parentId}
        data-layer-index={index}
        onClick={(e) => {
          // Don't fire click if we were just dragging
          if (draggedId) return;
          if (e.shiftKey) {
            dispatch({ type: "TOGGLE_NODE_SELECTION", itemId, nodeId: node.id });
          } else {
            onSelectNode(itemId, node.id);
          }
        }}
        onPointerDown={(e) => {
          // Suppress drag for any resolved instance subtree row (ids are composite)
          if (isInsideInstance) return;
          onDragPointerDown(e, node.id, parentId);
        }}
        onContextMenu={(e) => onContextMenu?.(node, itemId, e)}
        className={cn(
          "group flex w-full items-center gap-1.5 text-left transition-colors duration-75",
          isPrimary
            ? "bg-[#D1E4FC]/50 text-[#4B57DB] border-l-[1.5px] border-[#4B57DB] dark:bg-[#222244]/50"
            : isSecondary
              ? "bg-[#D1E4FC]/25 text-[#4B57DB]/70 border-l-[1.5px] border-[#4B57DB]/45 dark:bg-[#222244]/25"
              : isParentTarget && isContainer && isValidDrop
                ? "bg-[#D1E4FC]/20 text-[#1A1A1A] border-l-[1.5px] border-[#4B57DB] dark:text-[#D0D0D0]"
                : "text-[#1A1A1A] hover:bg-[#F5F5F0] border-l-[1.5px] border-transparent dark:text-[#D0D0D0] dark:hover:bg-[#2A2A2A]"
        )}
        style={{
          height: 28,
          paddingLeft: depth * 14 + (hasChildren ? 4 : 16),
          opacity: rowOpacity,
        }}
      >
        {hasChildren && (
          <span
            onClick={(e) => { e.stopPropagation(); onToggleExpanded(node.id); }}
            className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm hover:bg-[#E5E5E0] dark:hover:bg-[#333333]"
          >
            <ChevronRight size={10} strokeWidth={1.5} className={cn("transition-transform duration-100", expanded && "rotate-90")} />
          </span>
        )}
        {isInstanceRoot
          ? <Diamond className="shrink-0 text-[#A0A0A0] dark:text-[#666666]" size={14} strokeWidth={1.5} />
          : <DesignNodeIcon type={node.type} />
        }
        <span className="min-w-0 flex-1 truncate text-[12px] dark:text-[#D0D0D0]">
          {formatDesignNodeLabel(node)}
          {isInstanceRoot && masterName && (
            <span className="text-[#A0A0A0] dark:text-[#666666]"> · {masterName}</span>
          )}
        </span>
        {showOverrideDot && (
          <span
            className="shrink-0 w-1.5 h-1.5 rounded-full bg-[#4B57DB] mr-0.5"
            title="Local overrides"
          />
        )}
        {isStale && (
          <span
            className="shrink-0 w-1.5 h-1.5 rounded-full bg-[#F59E0B] mr-1"
            title="Component is stale — master has been updated"
          />
        )}
        {node.isGroup && (
          <span className="text-[10px] text-[#A0A0A0] ml-auto mr-1 dark:text-[#666666]">Group</span>
        )}
        {isPrimary && selectedNodeIds.length > 1 && (
          <span className="ml-auto mr-2 text-[9px] text-[#4B57DB] bg-[#D1E4FC]/50 px-1 rounded-[2px] dark:bg-[#222244]/50">primary</span>
        )}
        {/* Invalid parent target indicator */}
        {isInvalidParentTarget && !isContainer && (
          <X className="shrink-0 mr-2" size={14} color="#EF4444" />
        )}
      </button>
      {expanded && hasChildren && node.children!.map((child, childIdx) => (
        <DesignTreeNode
          key={child.id} node={child} depth={depth + 1}
          selectedNodeId={selectedNodeId} selectedNodeIds={selectedNodeIds}
          itemId={itemId} parentId={node.id} index={childIdx}
          onSelectNode={onSelectNode} onContextMenu={onContextMenu} dispatch={dispatch}
          draggedId={draggedId} dropTarget={dropTarget} isValidDrop={isValidDrop} onDragPointerDown={onDragPointerDown}
          sourceTree={sourceTree} components={components}
          expandedNodeIds={expandedNodeIds} onToggleExpanded={onToggleExpanded}
          getNodeDepth={getNodeDepth}
        />
      ))}
      {/* Drop indicator after last sibling */}
      {dropTarget !== null &&
        dropTarget.parentId === parentId &&
        dropTarget.index === index + 1 && (
          <DropIndicatorLine depth={depth} />
        )}
      {/* Drop indicator when this row's parent is the drop target and drop is after last sibling */}
      {dropTarget !== null &&
        parentId === dropTarget.parentId &&
        dropTarget.index === index + 1 &&
        !node.children?.length && (
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
  node, depth, selectedNodeId, itemId, onSelectNode,
}: {
  node: PageNode; depth: number; selectedNodeId: string | null;
  itemId: string; onSelectNode: (itemId: string, nodeId: string) => void;
}) {
  const hasChildren = node.children && node.children.length > 0;
  const [expanded, setExpanded] = React.useState(depth < 2);
  const isSelected = selectedNodeId === node.id;

  return (
    <>
      <button
        type="button"
        onClick={() => onSelectNode(itemId, node.id)}
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
        <TreeNode key={child.id} node={child} depth={depth + 1} selectedNodeId={selectedNodeId} itemId={itemId} onSelectNode={onSelectNode} />
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

// ─── Artboard Design Tree (sub-component so useMemo is valid) ────────────────

function ArtboardDesignTree({
  artboard,
  components,
  selectedNodeId,
  selectedNodeIds,
  onSelectNode,
  onContextMenu,
  dispatch,
  draggedId,
  dropTarget,
  isValidDrop,
  onDragPointerDown,
  expandedNodeIds,
  onToggleExpanded,
  getNodeDepth,
  masterEditDirty,
}: {
  artboard: ArtboardItem;
  components: ComponentMaster[];
  masterEditDirty: boolean;
  selectedNodeId: string | null;
  selectedNodeIds: string[];
  onSelectNode: (itemId: string, nodeId: string) => void;
  onContextMenu?: (node: DesignNode, itemId: string, event: React.MouseEvent) => void;
  dispatch: React.Dispatch<{ type: "TOGGLE_NODE_SELECTION"; itemId: string; nodeId: string }>;
  draggedId: string | null;
  dropTarget: DropTarget | null;
  isValidDrop: boolean;
  onDragPointerDown: (e: React.PointerEvent, nodeId: string, parentId: string) => void;
  expandedNodeIds: Set<string>;
  onToggleExpanded: (nodeId: string) => void;
  getNodeDepth: (nodeId: string) => number;
}) {
  const sourceTree = artboard.pageTree as DesignNode;
  const componentsEpoch = computeComponentsResolveEpoch(components);
  const resolvedTree = React.useMemo(
    () => resolveTree(sourceTree, components),
    masterEditDirty ? [sourceTree, components] : [sourceTree, componentsEpoch]
  );

  return (
    <>
      {resolvedTree.children?.map((child, childIdx) => (
        <DesignTreeNode
          key={child.id}
          node={child}
          depth={2}
          selectedNodeId={selectedNodeId}
          selectedNodeIds={selectedNodeIds}
          itemId={artboard.id}
          parentId={resolvedTree.id}
          index={childIdx}
          onSelectNode={onSelectNode}
          onContextMenu={onContextMenu}
          dispatch={dispatch}
          draggedId={draggedId}
          dropTarget={dropTarget}
          isValidDrop={isValidDrop}
          onDragPointerDown={onDragPointerDown}
          sourceTree={sourceTree}
          components={components}
          expandedNodeIds={expandedNodeIds}
          onToggleExpanded={onToggleExpanded}
          getNodeDepth={getNodeDepth}
        />
      ))}
    </>
  );
}

// ─── Canvas Item Design Tree (for FrameItems with children) ─────────────────

function CanvasItemDesignTree({
  item,
  components,
  selectedNodeId,
  selectedNodeIds,
  onSelectNode,
  onContextMenu,
  dispatch,
  draggedId,
  dropTarget,
  isValidDrop,
  onDragPointerDown,
  expandedNodeIds,
  onToggleExpanded,
  getNodeDepth,
  masterEditDirty,
}: {
  item: FrameItem;
  components: ComponentMaster[];
  masterEditDirty: boolean;
  selectedNodeId: string | null;
  selectedNodeIds: string[];
  onSelectNode: (itemId: string, nodeId: string) => void;
  onContextMenu?: (node: DesignNode, itemId: string, event: React.MouseEvent) => void;
  dispatch: React.Dispatch<{ type: "TOGGLE_NODE_SELECTION"; itemId: string; nodeId: string }>;
  draggedId: string | null;
  dropTarget: DropTarget | null;
  isValidDrop: boolean;
  onDragPointerDown: (e: React.PointerEvent, nodeId: string, parentId: string) => void;
  expandedNodeIds: Set<string>;
  onToggleExpanded: (nodeId: string) => void;
  getNodeDepth: (nodeId: string) => number;
}) {
  const sourceTree = canvasItemToDesignNode(item);
  const componentsEpoch = computeComponentsResolveEpoch(components);
  const resolvedTree = React.useMemo(
    () => resolveTree(sourceTree, components),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    masterEditDirty ? [sourceTree, components] : [sourceTree, componentsEpoch]
  );

  return (
    <>
      {resolvedTree.children?.map((child, childIdx) => (
        <DesignTreeNode
          key={child.id}
          node={child}
          depth={2}
          selectedNodeId={selectedNodeId}
          selectedNodeIds={selectedNodeIds}
          itemId={item.id}
          parentId={resolvedTree.id}
          index={childIdx}
          onSelectNode={onSelectNode}
          onContextMenu={onContextMenu}
          dispatch={dispatch}
          draggedId={draggedId}
          dropTarget={dropTarget}
          isValidDrop={isValidDrop}
          onDragPointerDown={onDragPointerDown}
          sourceTree={sourceTree}
          components={components}
          expandedNodeIds={expandedNodeIds}
          onToggleExpanded={onToggleExpanded}
          getNodeDepth={getNodeDepth}
        />
      ))}
    </>
  );
}

// ─── Main Panel ──────────────────────────────────────────────────────────────

export function LayersPanelV3() {
  const { state, dispatch } = useCanvas();
  const { items, selection, components } = state;
  const masterEditDirty = Boolean(state.masterEditSession?.dirty);

  // ── Track expanded node IDs for auto-expand on deep selection ───────────────
  const [expandedNodeIds, setExpandedNodeIds] = React.useState<Set<string>>(new Set());
  
  const selectedNodeId = selection.selectedNodeId;
  
  // ── Active artboard for ancestor lookup ─────────────────────────────────────
  const activeArtboard = React.useMemo(() => {
    if (!selection.activeItemId) return null;
    return items.find((i): i is ArtboardItem => 
      i.kind === "artboard" && i.id === selection.activeItemId
    ) || null;
  }, [items, selection.activeItemId]);

  // ── Auto-expand ancestors and scroll to selected node ───────────────────────
  React.useEffect(() => {
    if (selectedNodeId && activeArtboard && isDesignNodeTree(activeArtboard.pageTree)) {
      const root = activeArtboard.pageTree as DesignNode;
      
      // Find all ancestors of selected node
      const ancestors = getAncestors(selectedNodeId, root);
      
      // Add them to expanded set (only if not already expanded)
      setExpandedNodeIds(prev => {
        const next = new Set(prev);
        let changed = false;
        ancestors.forEach(id => {
          if (!next.has(id)) {
            next.add(id);
            changed = true;
          }
        });
        return changed ? next : prev;
      });
      
      // Scroll into view after expansion renders
      setTimeout(() => {
        const rowElement = document.querySelector(`[data-layer-id="${selectedNodeId}"]`);
        if (rowElement) {
          rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // Add highlight pulse class
          rowElement.classList.add('highlight-pulse');
          setTimeout(() => {
            rowElement.classList.remove('highlight-pulse');
          }, 300);
        }
      }, 50);
    }
  }, [selectedNodeId, activeArtboard]);

  const handleToggleExpanded = React.useCallback((nodeId: string) => {
    setExpandedNodeIds(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const artboards = items.filter((i): i is ArtboardItem => i.kind === "artboard");
  const references = items.filter((i): i is ReferenceItem => i.kind === "reference");
  const notes = items.filter((i): i is NoteItem => i.kind === "note");
  const canvasDesignItems = items.filter(
    (i): i is FrameItem | TextItem => i.kind === "frame" || i.kind === "text"
  );

  // Fixed breakpoint order
  const orderedArtboards = ["desktop", "mobile"]
    .map((bp) => artboards.find((a) => a.breakpoint === bp))
    .filter((a): a is ArtboardItem => Boolean(a));

  const handleSelectItem = (itemId: string) => {
    dispatch({ type: "SELECT_ITEM", itemId });
  };

  const handleSelectNode = (itemId: string, nodeId: string) => {
    dispatch({ type: "SELECT_NODE", itemId, nodeId });
  };

  // ── DesignNode context menu ──
  const [dnContextMenu, setDnContextMenu] = React.useState<{
    node: DesignNode;
    itemId: string;
    position: { x: number; y: number };
  } | null>(null);

  // ── Instance context menu ──
  const [instanceContextMenu, setInstanceContextMenu] = React.useState<{
    node: DesignNode;
    itemId: string;
    position: { x: number; y: number };
    isInstanceRoot: boolean;
  } | null>(null);

  const handleDesignNodeContextMenu = React.useCallback(
    (node: DesignNode, itemId: string, event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      dispatch({ type: "SELECT_NODE", itemId, nodeId: node.id });

      // Route to instance context menu for instance roots and children.
      // Resolve the source tree from either an artboard or a canvas FrameItem.
      const artboard = artboards.find((a) => a.id === itemId);
      const canvasFrameItem = canvasDesignItems.find(
        (ci): ci is FrameItem => ci.kind === "frame" && ci.id === itemId
      );
      const sourceTree: DesignNode | null = artboard && isDesignNodeTree(artboard.pageTree)
        ? (artboard.pageTree as DesignNode)
        : canvasFrameItem
          ? canvasItemToDesignNode(canvasFrameItem)
          : null;
      const isInsideInst = isInstanceChild(node.id);
      const sourceNodeId = isInsideInst ? splitCompositeId(node.id)[0] : node.id;
      const sourceNode = sourceTree ? findDesignNodeById(sourceTree, sourceNodeId) : null;
      const master =
        sourceNode?.componentRef && sourceTree
          ? findMaster(components, sourceNode.componentRef.masterId)
          : null;
      const isResolvedInstanceRoot =
        isInsideInst &&
        !!sourceNode?.componentRef &&
        !!master &&
        splitCompositeId(node.id)[1] === master.tree.id;
      const isInstanceRootForMenu =
        (!isInsideInst && !!sourceNode?.componentRef) || isResolvedInstanceRoot;

      if (isInstanceRootForMenu || (isInsideInst && !isResolvedInstanceRoot)) {
        setInstanceContextMenu({
          node,
          itemId,
          position: { x: event.clientX, y: event.clientY },
          isInstanceRoot: isInstanceRootForMenu,
        });
      } else {
        setDnContextMenu({ node, itemId, position: { x: event.clientX, y: event.clientY } });
      }
    },
    [dispatch, artboards, canvasDesignItems, components]
  );

  // ── Scroll container ref for auto-scroll during drag ──
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // ── Helper: Get node type for valid parent checking ──
  const getNodeType = React.useCallback((nodeId: string): { type: string; isGroup?: boolean } | null => {
    if (!activeArtboard || !isDesignNodeTree(activeArtboard.pageTree)) return null;
    const node = findDesignNodeById(activeArtboard.pageTree as DesignNode, nodeId);
    if (!node) return null;
    return { type: node.type, isGroup: node.isGroup };
  }, [activeArtboard]);

  // ── Helper: Get root children count ──
  const getRootChildCount = React.useCallback((): number => {
    if (!activeArtboard || !isDesignNodeTree(activeArtboard.pageTree)) return 0;
    return (activeArtboard.pageTree as DesignNode).children?.length ?? 0;
  }, [activeArtboard]);

  // ── Helper: Get depth of a node by id ──
  const getNodeDepth = React.useCallback((nodeId: string): number => {
    if (!activeArtboard || !isDesignNodeTree(activeArtboard.pageTree)) return 0;
    const ancestors = getAncestors(nodeId, activeArtboard.pageTree as DesignNode);
    return ancestors.length;
  }, [activeArtboard]);

  // ── Drag reorder hook ──
  const dragHook = useLayersDragReorder({
    onReparent: React.useCallback((nodeId: string, sourceParentId: string | undefined, targetParentId: string | undefined, targetIndex: number) => {
      const activeItemId = selection.activeItemId;
      if (!activeItemId) return;
      dispatch({
        type: "REPARENT_NODE",
        itemId: activeItemId,
        nodeId,
        sourceParentId,
        targetParentId,
        targetIndex,
      });
    }, [selection.activeItemId, dispatch]),
    selectedNodeIds: selection.selectedNodeIds,
    onCollapseToSingle: React.useCallback((itemId: string, nodeId: string) => {
      dispatch({ type: "SELECT_NODE", itemId, nodeId });
    }, [dispatch]),
    getNodeType,
    getRootChildCount,
  });

  const { draggedId, dropTarget, isValidDrop } = dragHook;

  // ── Auto-scroll during drag ──
  React.useEffect(() => {
    if (!draggedId || !scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    let animationFrameId: number;
    let lastPointerY = 0;
    
    const handlePointerMove = (e: PointerEvent) => {
      lastPointerY = e.clientY;
    };
    
    window.addEventListener("pointermove", handlePointerMove);
    
    const checkAndScroll = () => {
      if (!container || !draggedId) return;
      
      const rect = container.getBoundingClientRect();
      const edgeThreshold = 40; // px from edge
      const scrollSpeed = 100; // px per 150ms
      
      const distanceFromTop = lastPointerY - rect.top;
      const distanceFromBottom = rect.bottom - lastPointerY;
      
      if (distanceFromTop < edgeThreshold && distanceFromTop > 0) {
        // Near top edge - scroll up
        container.scrollTop -= scrollSpeed;
      } else if (distanceFromBottom < edgeThreshold && distanceFromBottom > 0) {
        // Near bottom edge - scroll down
        container.scrollTop += scrollSpeed;
      }
      
      animationFrameId = window.setTimeout(checkAndScroll, 150);
    };
    
    checkAndScroll();
    
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.clearTimeout(animationFrameId);
    };
  }, [draggedId]);

  // ── Escape key to cancel drag ──
  React.useEffect(() => {
    if (!draggedId) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        dragHook.handlePointerCancel();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [draggedId, dragHook]);

  return (
    <div
      className="absolute left-0 top-0 bottom-0 z-20 flex flex-col w-[200px] min-w-[200px] max-w-[200px] border-r-[0.5px] border-sidebar-border bg-sidebar-bg"
      style={{ contain: "strict" }}
    >
      <div className="shrink-0 border-b-[0.5px] border-sidebar-border px-3 py-2">
        <div className="font-mono text-[10px] uppercase tracking-[1px] text-[var(--section-label)]">
          Layers
        </div>
        <p className="mt-0.5 text-[9px] leading-snug text-[var(--text-muted)]">
          Drag a row to move or reparent in the tree. Esc cancels drag.
        </p>
      </div>
      {/* Scrollable content — isolated from the positioning shell above so
          scroll position can never shift the panel's top edge. */}
      <div
        ref={scrollContainerRef}
        data-layers-panel
        className="flex-1 overflow-y-auto overflow-x-hidden min-h-0"
        onPointerMove={dragHook.handlePointerMove}
        onPointerUp={dragHook.handlePointerUp}
        onPointerCancel={dragHook.handlePointerCancel}
      >
        <div className="pt-3 pb-2">
          {/* Canvas group — loose frame/text items on the canvas surface */}
          {canvasDesignItems.length > 0 && (
            <Group label="Canvas" count={canvasDesignItems.length} defaultOpen>
              {canvasDesignItems.map((item) => (
                <div key={item.id}>
                  <button
                    onClick={() => handleSelectItem(item.id)}
                    className={cn(
                      "flex w-full items-center gap-1.5 px-3 py-1 text-left transition-colors",
                      selection.selectedItemIds.includes(item.id)
                        ? "bg-[#D1E4FC]/50 text-[#4B57DB] dark:bg-[#222244]/50"
                        : "text-[#1A1A1A] hover:bg-[#F5F5F0] dark:text-[#D0D0D0] dark:hover:bg-[#2A2A2A]"
                    )}
                    style={{ height: 28, paddingLeft: 24 }}
                  >
                    {item.kind === "frame"
                      ? <Square size={14} strokeWidth={1.5} className="shrink-0 text-[#A0A0A0] dark:text-[#666666]" />
                      : <Type size={14} strokeWidth={1.5} className="shrink-0 text-[#A0A0A0] dark:text-[#666666]" />
                    }
                    <span className="min-w-0 flex-1 truncate text-[12px] dark:text-[#D0D0D0]">
                      {item.name || (item.kind === "frame" ? "Frame" : "Text")}
                    </span>
                  </button>
                  {/* Children tree for FrameItems */}
                  {item.kind === "frame" && (item as FrameItem).children.length > 0 && (
                    <CanvasItemDesignTree
                      item={item as FrameItem}
                      components={state.components}
                      masterEditDirty={masterEditDirty}
                      selectedNodeId={selection.activeItemId === item.id ? selection.selectedNodeId : null}
                      selectedNodeIds={selection.activeItemId === item.id ? selection.selectedNodeIds : []}
                      onSelectNode={handleSelectNode}
                      onContextMenu={handleDesignNodeContextMenu}
                      dispatch={dispatch}
                      draggedId={draggedId}
                      dropTarget={dropTarget}
                      isValidDrop={isValidDrop}
                      onDragPointerDown={dragHook.handlePointerDown}
                      expandedNodeIds={expandedNodeIds}
                      onToggleExpanded={handleToggleExpanded}
                      getNodeDepth={getNodeDepth}
                    />
                  )}
                </div>
              ))}
            </Group>
          )}

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
                    ? (
                        <ArtboardDesignTree
                          artboard={artboard}
                          components={state.components}
                          masterEditDirty={masterEditDirty}
                          selectedNodeId={selection.activeItemId === artboard.id ? selection.selectedNodeId : null}
                          selectedNodeIds={selection.activeItemId === artboard.id ? selection.selectedNodeIds : []}
                          onSelectNode={handleSelectNode}
                          onContextMenu={handleDesignNodeContextMenu}
                          dispatch={dispatch}
                          draggedId={draggedId}
                          dropTarget={dropTarget}
                          isValidDrop={isValidDrop}
                          onDragPointerDown={dragHook.handlePointerDown}
                          expandedNodeIds={expandedNodeIds}
                          onToggleExpanded={handleToggleExpanded}
                          getNodeDepth={getNodeDepth}
                        />
                      )
                    : artboard.pageTree.children?.map((child) => (
                        <TreeNode
                          key={child.id}
                          node={child}
                          depth={2}
                          selectedNodeId={selection.activeItemId === artboard.id ? selection.selectedNodeId : null}
                          itemId={artboard.id}
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

      {/* Highlight pulse animation styles */}
      <style jsx>{`
        @keyframes highlight-pulse {
          0% { background-color: rgba(75, 87, 219, 0.2); }
          100% { background-color: transparent; }
        }
        .highlight-pulse {
          animation: highlight-pulse 300ms ease-out;
        }
      `}</style>

      {/* DesignNode context menu */}
      {dnContextMenu && (() => {
        const artboard = artboards.find((a) => a.id === dnContextMenu.itemId);
        const canvasFrameForMenu = canvasDesignItems.find(
          (ci): ci is FrameItem => ci.kind === "frame" && ci.id === dnContextMenu.itemId
        );
        const tree: DesignNode | null = artboard && isDesignNodeTree(artboard.pageTree)
          ? (artboard.pageTree as DesignNode)
          : canvasFrameForMenu
            ? canvasItemToDesignNode(canvasFrameForMenu)
            : null;
        if (!tree) return null;
        const parent = findDesignNodeParent(tree, dnContextMenu.node.id);
        const siblings = parent?.children ?? tree.children ?? [];
        const idx = siblings.findIndex((c) => c.id === dnContextMenu.node.id);
        const bp = artboard?.breakpoint ?? "desktop";
        const isNonRootFrame = dnContextMenu.node.type === "frame" && dnContextMenu.node.id !== tree.id;

        return (
          <DesignNodeContextMenu
            node={dnContextMenu.node}
            rootNode={tree}
            selectedNodeId={selection.selectedNodeId}
            position={dnContextMenu.position}
            breakpoint={bp}
            isFirst={idx === 0}
            isLast={idx === siblings.length - 1}
            isHidden={Boolean(dnContextMenu.node.hidden?.[bp])}
            onDuplicate={() => { dispatch({ type: "DUPLICATE_SECTION", itemId: dnContextMenu.itemId, nodeId: dnContextMenu.node.id }); setDnContextMenu(null); }}
            onDelete={() => { dispatch({ type: "DELETE_SECTION", itemId: dnContextMenu.itemId, nodeId: dnContextMenu.node.id }); setDnContextMenu(null); }}
            onMoveUp={() => {
              if (idx > 0 && parent) {
                dispatch({ type: "REORDER_NODE", itemId: dnContextMenu.itemId, nodeId: dnContextMenu.node.id, newIndex: idx - 1, parentNodeId: parent.id });
              } else if (idx > 0) {
                dispatch({ type: "REORDER_NODE", itemId: dnContextMenu.itemId, nodeId: dnContextMenu.node.id, newIndex: idx - 1 });
              }
              setDnContextMenu(null);
            }}
            onMoveDown={() => {
              if (idx < siblings.length - 1 && parent) {
                dispatch({ type: "REORDER_NODE", itemId: dnContextMenu.itemId, nodeId: dnContextMenu.node.id, newIndex: idx + 1, parentNodeId: parent.id });
              } else if (idx < siblings.length - 1) {
                dispatch({ type: "REORDER_NODE", itemId: dnContextMenu.itemId, nodeId: dnContextMenu.node.id, newIndex: idx + 1 });
              }
              setDnContextMenu(null);
            }}
            onToggleVisibility={() => { dispatch({ type: "TOGGLE_NODE_HIDDEN", itemId: dnContextMenu.itemId, nodeId: dnContextMenu.node.id, breakpoint: bp }); setDnContextMenu(null); }}
            onSaveToLibrary={isNonRootFrame ? (name: string) => {
              dispatch({
                type: "CREATE_MASTER",
                itemId: dnContextMenu.itemId,
                nodeId: dnContextMenu.node.id,
                name: name || dnContextMenu.node.name || "Component",
                category: "Custom",
              });
              setDnContextMenu(null);
            } : undefined}
            onGroup={() => { dispatch({ type: "GROUP_NODES", itemId: dnContextMenu.itemId }); setDnContextMenu(null); }}
            onUngroup={() => { dispatch({ type: "UNGROUP_NODES", itemId: dnContextMenu.itemId, nodeId: dnContextMenu.node.id }); setDnContextMenu(null); }}
            isGroupNode={Boolean(dnContextMenu.node.isGroup)}
            multiSelectCount={selection.selectedNodeIds.length}
            onDismiss={() => setDnContextMenu(null)}
            onSelectNode={(nodeId) => { dispatch({ type: "SELECT_NODE", itemId: dnContextMenu.itemId, nodeId }); setDnContextMenu(null); }}
          />
        );
      })()}

      {/* Instance context menu */}
      {instanceContextMenu && (
        <InstanceContextMenu
          node={instanceContextMenu.node}
          position={instanceContextMenu.position}
          isInstanceRoot={instanceContextMenu.isInstanceRoot}
          onEditMaster={() => {
            const instanceSourceId = getInstanceRootSourceId(instanceContextMenu.node.id);
            const ab = artboards.find((a) => a.id === instanceContextMenu.itemId);
            if (!ab || !isDesignNodeTree(ab.pageTree)) return;
            const st = ab.pageTree as DesignNode;
            const inst = findDesignNodeById(st, instanceSourceId);
            if (!inst?.componentRef) return;
            const masterId = inst.componentRef.masterId;
            if (isBuiltinMasterId(masterId)) {
              dispatch({
                type: "PROMOTE_BUILTIN_TO_USER",
                itemId: instanceContextMenu.itemId,
                instanceNodeId: instanceSourceId,
              });
            } else {
              const instanceSourceId = getInstanceRootSourceId(instanceContextMenu.node.id);
              dispatch({
                type: "ENTER_MASTER_EDIT",
                masterId,
                returnTo: {
                  itemId: instanceContextMenu.itemId,
                  instanceRootSourceId: instanceSourceId,
                  preferredNodeId: selection.selectedNodeId,
                },
              });
            }
          }}
          onDetach={() => {
            const instanceSourceId = getInstanceRootSourceId(instanceContextMenu.node.id);
            dispatch({
              type: "DETACH_INSTANCE",
              itemId: instanceContextMenu.itemId,
              nodeId: instanceSourceId,
            });
          }}
          onResetAll={() => {
            const instanceSourceId = getInstanceRootSourceId(instanceContextMenu.node.id);
            dispatch({
              type: "RESET_ALL_OVERRIDES",
              itemId: instanceContextMenu.itemId,
              nodeId: instanceSourceId,
            });
          }}
          onDelete={() => {
            const instanceSourceId = getInstanceRootSourceId(instanceContextMenu.node.id);
            dispatch({
              type: "DELETE_SECTION",
              itemId: instanceContextMenu.itemId,
              nodeId: instanceSourceId,
            });
            setInstanceContextMenu(null);
          }}
          onResetOverride={() => {
            const [instanceId, masterNodeId] = splitCompositeId(instanceContextMenu.node.id);
            dispatch({
              type: "RESET_INSTANCE_OVERRIDE_FIELD",
              itemId: instanceContextMenu.itemId,
              instanceId,
              masterNodeId,
              category: "all",
              field: "",
            });
          }}
          onCopy={() => {
            // Copy is not wired yet — stub
            console.warn("[Track3] Copy instance child — not yet implemented");
          }}
          onDismiss={() => setInstanceContextMenu(null)}
        />
      )}
    </div>
  );
}
