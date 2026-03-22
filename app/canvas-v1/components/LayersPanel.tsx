"use client";

import * as React from "react";
import {
  Monitor,
  Smartphone,
  ChevronRight,
  Layout,
  Type,
  AlignLeft,
  RectangleHorizontal,
  Grid3X3,
  Star,
  MessageSquare,
  CreditCard,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BREAKPOINT_WIDTHS } from "@/lib/canvas/compose";
import type { ComposeDocument, PageNode } from "@/lib/canvas/compose";

type Artboard = ComposeDocument["artboards"][number];

// ─── Node type → Lucide icon mapping ─────────────────────────────────────────

function NodeIcon({ type }: { type: PageNode["type"] }) {
  const cls = "shrink-0 text-[#A0A0A0]";
  const props = { size: 14, strokeWidth: 1.5, className: cls } as const;

  switch (type) {
    case "page":
      return <Layout {...props} />;
    case "section":
      return <Layers {...props} />;
    case "heading":
      return <Type {...props} />;
    case "paragraph":
      return <AlignLeft {...props} />;
    case "button":
    case "button-row":
      return <RectangleHorizontal {...props} />;
    case "feature-grid":
    case "feature-card":
      return <Grid3X3 {...props} />;
    case "metric-row":
    case "metric-item":
      return <Star {...props} />;
    case "testimonial-grid":
    case "testimonial-card":
      return <MessageSquare {...props} />;
    case "pricing-grid":
    case "pricing-tier":
      return <CreditCard {...props} />;
    default:
      return <RectangleHorizontal {...props} />;
  }
}

function formatNodeLabel(node: PageNode): string {
  const content = node.content?.text || node.content?.label || node.name;
  return content.length > 32 ? `${content.slice(0, 32)}…` : content;
}

// ─── Recursive tree node ─────────────────────────────────────────────────────

function TreeNode({
  node,
  depth,
  selectedNodeId,
  onSelectNode,
  defaultExpanded,
  expandedRef,
}: {
  node: PageNode;
  depth: number;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  defaultExpanded: boolean;
  expandedRef: React.MutableRefObject<Set<string>>;
}) {
  const hasChildren = node.children && node.children.length > 0;
  const [expanded, setExpanded] = React.useState(defaultExpanded);

  React.useEffect(() => {
    if (expandedRef.current.has(node.id)) {
      setExpanded(true);
      return;
    }
    if (expandedRef.current.has(`collapsed:${node.id}`)) {
      setExpanded(false);
      return;
    }
    setExpanded(defaultExpanded);
  }, [defaultExpanded, expandedRef, node.id]);

  const isSelected = selectedNodeId === node.id;

  function toggleExpand(e: React.MouseEvent) {
    e.stopPropagation();
    setExpanded((prev) => {
      const next = !prev;
      if (next) {
        expandedRef.current.add(node.id);
        expandedRef.current.delete(`collapsed:${node.id}`);
      } else {
        expandedRef.current.delete(node.id);
        expandedRef.current.add(`collapsed:${node.id}`);
      }
      return next;
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => onSelectNode(node.id)}
        className={cn(
          "group flex w-full items-center gap-1.5 text-left transition-colors duration-75",
          isSelected
            ? "bg-[#D1E4FC]/50 text-[#1E5DF2] border-l-2 border-[#1E5DF2]"
            : "text-[#1A1A1A] hover:bg-[#F5F5F0] border-l-2 border-transparent"
        )}
        style={{
          height: 28,
          paddingLeft: depth * 16 + (hasChildren ? 4 : 20),
        }}
      >
        {/* Disclosure triangle */}
        {hasChildren && (
          <span
            onClick={toggleExpand}
            className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm hover:bg-[#E5E5E0] transition-colors"
          >
            <ChevronRight
              size={12}
              strokeWidth={1.5}
              className={cn(
                "transition-transform duration-100",
                expanded && "rotate-90"
              )}
            />
          </span>
        )}
        <NodeIcon type={node.type} />
        <span className="min-w-0 flex-1 truncate text-[13px]">
          {formatNodeLabel(node)}
        </span>
      </button>

      {/* Children */}
      {hasChildren && expanded && (
        <>
          {node.children!.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedNodeId={selectedNodeId}
              onSelectNode={onSelectNode}
              defaultExpanded={depth + 1 < 2}
              expandedRef={expandedRef}
            />
          ))}
        </>
      )}
    </>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export type LayersPanelProps = {
  artboards: Artboard[];
  selectedArtboardId: string | null;
  selectedNodeId: string | null;
  primaryArtboardId: string | null;
  breakpoint: ComposeDocument["breakpoint"];
  layers: Array<{ node: PageNode; depth: number }>;
  onSelectArtboard: (artboardId: string, nodeId: string) => void;
  onSelectNode: (nodeId: string) => void;
};

export function LayersPanel({
  artboards,
  selectedArtboardId,
  selectedNodeId,
  primaryArtboardId,
  breakpoint,
  onSelectArtboard,
  onSelectNode,
}: LayersPanelProps) {
  const expandedRef = React.useRef(new Set<string>());

  const activeArtboard = artboards.find((a) => a.id === selectedArtboardId) ?? artboards[0];

  return (
    <div className="flex h-full w-[240px] flex-col overflow-hidden bg-white/95 backdrop-blur-sm border-r border-[#E5E5E0]">
      {/* ── Header ── */}
      <div className="shrink-0 px-4 pt-3 pb-2">
        <span className="mono-kicker">Layers</span>
      </div>

      {/* ── Artboard switcher ── */}
      <div className="shrink-0 px-3 pb-2">
        <div className="flex flex-wrap gap-1">
          {artboards.map((artboard) => {
            const active = selectedArtboardId === artboard.id;
            const bp = artboard.breakpoint ?? breakpoint;
            const Icon = bp === "mobile" ? Smartphone : Monitor;
            return (
              <button
                key={artboard.id}
                type="button"
                onClick={() => onSelectArtboard(artboard.id, artboard.pageTree.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-[4px] px-3 py-1 text-[11px] transition-colors duration-100",
                  active
                    ? "bg-[#D1E4FC]/50 font-medium text-[#1E5DF2]"
                    : "text-[#6B6B6B] hover:bg-[#F5F5F0]"
                )}
              >
                <Icon size={12} strokeWidth={1.5} />
                {BREAKPOINT_WIDTHS[bp]}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="mx-3 border-t border-[#E5E5E0]" />

      {/* ── Node tree ── */}
      <div className="flex-1 overflow-y-auto py-1">
        {activeArtboard ? (
          <TreeNode
            node={activeArtboard.pageTree}
            depth={0}
            selectedNodeId={selectedNodeId}
            onSelectNode={onSelectNode}
            defaultExpanded={true}
            expandedRef={expandedRef}
          />
        ) : (
          <p className="px-4 py-3 text-[11px] text-[#A0A0A0]">
            No artboard selected.
          </p>
        )}
      </div>
    </div>
  );
}
