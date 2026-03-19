"use client";

/**
 * V3 Layers Panel — grouped collapsible tree for the unified canvas.
 * Groups: Site (artboards with page tree), References, Notes.
 */

import * as React from "react";
import {
  Monitor, Tablet, Smartphone, ChevronRight, Layout, Type,
  AlignLeft, RectangleHorizontal, Grid3X3, Star, MessageSquare,
  CreditCard, Layers, Image as ImageIcon, StickyNote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvas } from "@/lib/canvas/canvas-context";
import { BREAKPOINT_WIDTHS } from "@/lib/canvas/compose";
import type { PageNode } from "@/lib/canvas/compose";
import type { ArtboardItem, ReferenceItem, NoteItem } from "@/lib/canvas/unified-canvas-state";

// ─── Node type → icon ────────────────────────────────────────────────────────

function NodeIcon({ type }: { type: PageNode["type"] }) {
  const cls = "shrink-0 text-[#A0A0A0]";
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

function BreakpointIcon({ bp }: { bp: string }) {
  const props = { size: 14, strokeWidth: 1, className: "shrink-0 text-[#A0A0A0]" } as const;
  if (bp === "mobile") return <Smartphone {...props} />;
  if (bp === "tablet") return <Tablet {...props} />;
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
            ? "bg-[#D1E4FC]/50 text-[#1E5DF2] border-l-2 border-[#1E5DF2]"
            : "text-[#1A1A1A] hover:bg-[#F5F5F0] border-l-2 border-transparent"
        )}
        style={{ height: 26, paddingLeft: depth * 14 + (hasChildren ? 4 : 18) }}
      >
        {hasChildren && (
          <span
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm hover:bg-[#E5E5E0]"
          >
            <ChevronRight size={10} strokeWidth={1.5} className={cn("transition-transform duration-100", expanded && "rotate-90")} />
          </span>
        )}
        <NodeIcon type={node.type} />
        <span className="min-w-0 flex-1 truncate text-[12px]">{formatLabel(node)}</span>
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
        className="flex w-full items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-[#A0A0A0] hover:text-[#6B6B6B]"
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
  const orderedArtboards = ["desktop", "tablet", "mobile"]
    .map((bp) => artboards.find((a) => a.breakpoint === bp))
    .filter((a): a is ArtboardItem => Boolean(a));

  const handleSelectItem = (itemId: string) => {
    dispatch({ type: "SELECT_ITEM", itemId });
  };

  const handleSelectNode = (artboardId: string, nodeId: string) => {
    dispatch({ type: "SELECT_NODE", artboardId, nodeId });
  };

  return (
    <div className="absolute left-0 top-0 bottom-0 z-20 w-[240px] overflow-y-auto border-r border-[#E5E5E0] bg-white/95 backdrop-blur-sm">
      <div className="py-2">
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
                      ? "bg-[#D1E4FC]/50 text-[#1E5DF2]"
                      : "text-[#1A1A1A] hover:bg-[#F5F5F0]"
                  )}
                  style={{ height: 28, paddingLeft: 24 }}
                >
                  <BreakpointIcon bp={artboard.breakpoint} />
                  <span className="truncate text-[12px]">
                    {artboard.breakpoint.charAt(0).toUpperCase() + artboard.breakpoint.slice(1)} · {BREAKPOINT_WIDTHS[artboard.breakpoint]}px
                  </span>
                </button>
                {/* Page tree */}
                {artboard.pageTree.children?.map((child) => (
                  <TreeNode
                    key={child.id}
                    node={child}
                    depth={2}
                    selectedNodeId={selection.activeArtboardId === artboard.id ? selection.selectedNodeId : null}
                    artboardId={artboard.id}
                    onSelectNode={handleSelectNode}
                  />
                ))}
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
                    ? "bg-[#D1E4FC]/50 text-[#1E5DF2]"
                    : "text-[#1A1A1A] hover:bg-[#F5F5F0]"
                )}
                style={{ height: 28, paddingLeft: 24 }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ref.imageUrl} alt="" className="h-6 w-6 shrink-0 rounded-[2px] object-cover" />
                <span className="min-w-0 flex-1 truncate text-[12px]">
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
                    ? "bg-[#D1E4FC]/50 text-[#1E5DF2]"
                    : "text-[#1A1A1A] hover:bg-[#F5F5F0]"
                )}
                style={{ height: 28, paddingLeft: 24 }}
              >
                <StickyNote size={14} strokeWidth={1.5} className="shrink-0 text-[#A0A0A0]" />
                <span className="min-w-0 flex-1 truncate text-[12px]">
                  &ldquo;{note.text.length > 24 ? note.text.slice(0, 24) + "…" : note.text}&rdquo;
                </span>
              </button>
            ))}
          </Group>
        )}
      </div>
    </div>
  );
}
