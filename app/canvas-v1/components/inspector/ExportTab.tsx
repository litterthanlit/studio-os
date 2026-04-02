"use client";

import * as React from "react";
import { InspectorSegmented } from "./InspectorSegmented";
import { designNodeToHTML } from "@/lib/canvas/design-node-to-html";
import { isDesignNodeTree } from "@/lib/canvas/compose";
import type { ArtboardItem } from "@/lib/canvas/unified-canvas-state";
import type { DesignNode } from "@/lib/canvas/design-node";
import { findDesignNodeById } from "@/lib/canvas/design-node";

type ExportTabProps = {
  artboard: ArtboardItem | null;
  selectedNodeId: string | null;
};

export function ExportTab({ artboard, selectedNodeId }: ExportTabProps) {
  const [scope, setScope] = React.useState<"full" | "selection">("full");
  const [copied, setCopied] = React.useState(false);

  // Resolve the export target
  const tree = artboard && isDesignNodeTree(artboard.pageTree)
    ? (artboard.pageTree as DesignNode)
    : null;

  const selectedNode = tree && selectedNodeId
    ? findDesignNodeById(tree, selectedNodeId)
    : null;

  const exportNode = scope === "selection" && selectedNode
    ? selectedNode
    : tree;

  const htmlString = React.useMemo(
    () => exportNode ? designNodeToHTML(exportNode, { scope: scope === "selection" ? "selection" : "full" }) : "",
    [exportNode, scope]
  );

  const handleCopy = React.useCallback(async () => {
    if (!htmlString) return;
    try {
      await navigator.clipboard.writeText(htmlString);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API may fail in non-secure contexts
    }
  }, [htmlString]);

  // No V6 tree
  if (!tree) {
    return (
      <div className="p-4">
        <p className="text-[11px] text-[#A0A0A0]">
          Export is available for V6 layouts. Generate a new site to use this feature.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col gap-3 h-full min-h-0">
      {/* Scope toggle */}
      <div>
        <span className="text-[10px] uppercase tracking-wide text-[#8A8A8A] font-mono mb-1 block">Scope</span>
        <InspectorSegmented
          value={scope}
          options={[
            { value: "full", label: "Full Page" },
            { value: "selection", label: "Selection" },
          ]}
          onChange={(v) => setScope(v as "full" | "selection")}
        />
      </div>

      {/* Empty state: selection mode but nothing selected */}
      {scope === "selection" && !selectedNode ? (
        <p className="text-[11px] text-[#A0A0A0]">
          Select a node to export
        </p>
      ) : htmlString ? (
        <>
          {/* HTML preview */}
          <pre
            className="text-[11px] text-[#6B6B6B] bg-[#F5F5F0] rounded-[4px] p-3 overflow-x-auto whitespace-pre-wrap break-all overflow-y-auto flex-1 min-h-0"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            {htmlString}
          </pre>

          {/* Copy button */}
          <button
            type="button"
            onClick={handleCopy}
            className="border border-[#E5E5E0] rounded-[4px] px-3 py-1.5 text-[12px] text-[#6B6B6B] hover:border-[#D1E4FC] hover:text-[#1E5DF2] transition-colors w-full shrink-0"
          >
            {copied ? <span className="text-[#1E5DF2]">Copied!</span> : "Copy HTML"}
          </button>
        </>
      ) : null}
    </div>
  );
}
