"use client";

/**
 * MasterEditOverlay — full-screen overlay for editing a component master (Track 3).
 *
 * Dims the canvas, renders the master tree in an isolated frame with amber border,
 * and provides Done/Cancel controls.
 */

import React from "react";
import type { MasterEditSession } from "@/lib/canvas/unified-canvas-state";
import type { ComponentMaster } from "@/lib/canvas/design-node";
import type { CanvasAction } from "@/lib/canvas/canvas-reducer";
import { designStyleToCSS } from "@/lib/canvas/design-style-to-css";
import type { DesignNode } from "@/lib/canvas/design-node";

// ── Lightweight master tree renderer ──────────────────────────────────────────
// Renders a DesignNode tree as static HTML/CSS for preview within the overlay.
// This is intentionally non-interactive — editing is done via the inspector.

function RenderMasterNode({ node }: { node: DesignNode }) {
  const cssStyle = designStyleToCSS(node.style);

  // Text leaf nodes
  if (node.type === "text" && node.content?.text) {
    return <div style={cssStyle}>{node.content.text}</div>;
  }

  // Image nodes
  if (node.type === "image" && node.content?.src) {
    return (
      <div style={cssStyle}>
        <img
          src={node.content.src}
          alt={node.content.alt || ""}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
    );
  }

  // Frame / container nodes
  return (
    <div style={cssStyle}>
      {node.children?.map((child) => (
        <RenderMasterNode key={child.id} node={child} />
      ))}
    </div>
  );
}

// ── MasterEditOverlay ─────────────────────────────────────────────────────────

type MasterEditOverlayProps = {
  masterEditSession: MasterEditSession;
  components: ComponentMaster[];
  dispatch: React.Dispatch<CanvasAction>;
};

export function MasterEditOverlay({
  masterEditSession,
  components,
  dispatch,
}: MasterEditOverlayProps) {
  const master = components.find((c) => c.id === masterEditSession.masterId);
  const masterName = master?.name ?? "Component";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white/80 backdrop-blur-[2px]">
      {/* Top banner */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#FEF3C7] border-b border-[#F59E0B]/30">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#F59E0B]" />
          <span className="text-[13px] font-medium text-[#92400E]">
            Editing: {masterName}
          </span>
          {masterEditSession.dirty && (
            <span className="text-[11px] text-[#B45309]">(unsaved changes)</span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => dispatch({ type: "CANCEL_MASTER_EDIT" })}
            className="text-[12px] text-[#6B6B6B] border border-[#E5E5E0] rounded-[4px] px-3 py-1 hover:border-[#D1E4FC] hover:text-[#4B57DB] bg-white"
          >
            Cancel
          </button>
          <button
            onClick={() => dispatch({ type: "COMMIT_MASTER_EDIT" })}
            className="text-[12px] text-white bg-[#4B57DB] rounded-[4px] px-3 py-1 hover:bg-[#3D49C7]"
          >
            Done
          </button>
        </div>
      </div>

      {/* Master tree preview area */}
      <div className="flex-1 overflow-auto flex items-start justify-center p-8">
        <div className="border-2 border-[#F59E0B] rounded-lg bg-white p-4 shadow-sm min-w-[320px]">
          {master ? (
            <RenderMasterNode node={master.tree} />
          ) : (
            <p className="text-[13px] text-[#A0A0A0]">Master not found</p>
          )}
        </div>
      </div>
    </div>
  );
}
