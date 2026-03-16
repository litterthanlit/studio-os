"use client";

import * as React from "react";
import { Monitor, Tablet, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { BREAKPOINT_WIDTHS } from "@/lib/canvas/compose";
import type { ComposeDocument, PageNode } from "@/lib/canvas/compose";

type Artboard = ComposeDocument["artboards"][number];
type LayerItem = { node: PageNode; depth: number };

export type LayersPanelProps = {
  artboards: Artboard[];
  selectedArtboardId: string | null;
  selectedNodeId: string | null;
  primaryArtboardId: string | null;
  breakpoint: ComposeDocument["breakpoint"];
  layers: LayerItem[];
  onSelectArtboard: (artboardId: string, nodeId: string) => void;
  onSelectNode: (nodeId: string) => void;
};

// ─── Node type icons (12px) ───────────────────────────────────────────────────

function NodeTypeIcon({ type }: { type: PageNode["type"] }) {
  if (type === "page") {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.25" className="shrink-0 opacity-50">
        <rect x="1.5" y="1.5" width="9" height="9" rx="1" />
      </svg>
    );
  }
  if (type === "section") {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.25" className="shrink-0 opacity-50">
        <rect x="1" y="3" width="10" height="6" rx="1" />
        <line x1="1" y1="1.5" x2="11" y2="1.5" />
      </svg>
    );
  }
  if (type === "heading") {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.25" className="shrink-0 opacity-50">
        <path d="M2 2.5v7M10 2.5v7M2 6h8" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "paragraph") {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.25" className="shrink-0 opacity-50">
        <line x1="2" y1="3.5" x2="10" y2="3.5" strokeLinecap="round" />
        <line x1="2" y1="6" x2="10" y2="6" strokeLinecap="round" />
        <line x1="2" y1="8.5" x2="7" y2="8.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "button" || type === "button-row") {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.25" className="shrink-0 opacity-50">
        <rect x="1.5" y="3.5" width="9" height="5" rx="1.5" />
      </svg>
    );
  }
  // default: generic block
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.25" className="shrink-0 opacity-50">
      <rect x="2" y="2" width="8" height="8" rx="1" />
    </svg>
  );
}

function formatNodeLabel(node: PageNode): string {
  const content = node.content?.text || node.content?.label || node.name;
  return content.length > 28 ? `${content.slice(0, 28)}…` : content;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function LayersPanel({
  artboards,
  selectedArtboardId,
  selectedNodeId,
  primaryArtboardId,
  breakpoint,
  layers,
  onSelectArtboard,
  onSelectNode,
}: LayersPanelProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#FAFAF8]">

      {/* ── Artboards ── */}
      <div className="shrink-0 border-b border-[#E5E5E0] px-2 py-2">
        <p className="mb-1.5 px-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[#A0A0A0]">
          Artboards
        </p>
        {artboards.map((artboard) => {
          const active = selectedArtboardId === artboard.id;
          const BreakpointIcon =
            breakpoint === "mobile"
              ? Smartphone
              : breakpoint === "tablet"
              ? Tablet
              : Monitor;
          return (
            <button
              key={artboard.id}
              type="button"
              onClick={() => onSelectArtboard(artboard.id, artboard.pageTree.id)}
              className={cn(
                "flex h-8 w-full items-center gap-2 rounded-[4px] px-2 text-left transition-colors duration-100",
                active ? "bg-[#D1E4FC]" : "hover:bg-[#F5F5F0]"
              )}
            >
              <BreakpointIcon
                size={14}
                strokeWidth={1}
                className={cn(
                  "shrink-0 transition-colors",
                  active ? "text-[#1E5DF2]" : "text-[#A0A0A0]"
                )}
              />
              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-[12px]",
                  active ? "font-medium text-[#1E5DF2]" : "text-[#1A1A1A]"
                )}
              >
                {artboard.name}
              </span>
              {primaryArtboardId === artboard.id && (
                <span className="shrink-0 text-[9px] font-medium uppercase tracking-[0.1em] text-[#1E5DF2] opacity-70">
                  Primary
                </span>
              )}
              <span
                className="shrink-0 font-mono text-[10px] text-[#A0A0A0]"
                style={{ fontFamily: "'Geist Mono', monospace" }}
              >
                {BREAKPOINT_WIDTHS[breakpoint]}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Node Tree ── */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        <p className="mb-1.5 px-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[#A0A0A0]">
          Layers
        </p>
        {layers.length === 0 ? (
          <p className="px-1 text-[11px] text-[#A0A0A0]">
            Select an artboard to see its layers.
          </p>
        ) : (
          <div className="relative space-y-px">
            {layers.map(({ node, depth }) => {
              const active = selectedNodeId === node.id;
              const indent = Math.min(depth, 5) * 12;
              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => onSelectNode(node.id)}
                  className={cn(
                    "flex h-7 w-full items-center gap-1.5 rounded-[4px] px-2 text-left text-[12px] transition-colors duration-100",
                    active
                      ? "bg-[#D1E4FC] text-[#1E5DF2]"
                      : "text-[#1A1A1A] hover:bg-[#F5F5F0]"
                  )}
                  style={{ paddingLeft: 8 + indent }}
                >
                  {/* Connecting line for hierarchy */}
                  {depth > 0 && (
                    <span
                      className="absolute"
                      style={{
                        left: 8 + (depth - 1) * 12 + 5,
                        width: 7,
                        borderLeft: "1px solid #E5E5E0",
                        borderBottom: "1px solid #E5E5E0",
                        height: "50%",
                        top: 0,
                        pointerEvents: "none",
                      }}
                    />
                  )}
                  <NodeTypeIcon type={node.type} />
                  <span className="min-w-0 flex-1 truncate">
                    {formatNodeLabel(node)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
