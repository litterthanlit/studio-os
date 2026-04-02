// app/(dashboard)/test-v6/page.tsx
// Interactive test harness for the V6 renderer interaction layer.
// Tests: hover outlines, click-to-select, drill-down, text edit, escape hierarchy,
// breakout toggle, drag, snap guides, resize handles, undo.

"use client";

import * as React from "react";
import { ComposeDocumentViewV6 } from "@/app/canvas-v1/components/ComposeDocumentViewV6";
import { EDITORIAL_TEST_TREE } from "@/lib/canvas/test-editorial-tree";
import type { DesignNode, DesignNodeStyle } from "@/lib/canvas/design-node";

// ── Helpers ──────────────────────────────────────────────────────────────────

function updateNodeStyleInTree(
  tree: DesignNode,
  nodeId: string,
  style: Partial<DesignNodeStyle>
): DesignNode {
  if (tree.id === nodeId) {
    return { ...tree, style: { ...tree.style, ...style } };
  }
  if (tree.children) {
    return {
      ...tree,
      children: tree.children.map((c) => updateNodeStyleInTree(c, nodeId, style)),
    };
  }
  return tree;
}

function updateNodeContentInTree(
  tree: DesignNode,
  nodeId: string,
  key: string,
  value: string
): DesignNode {
  if (tree.id === nodeId) {
    return { ...tree, content: { ...tree.content, [key]: value } };
  }
  if (tree.children) {
    return {
      ...tree,
      children: tree.children.map((c) => updateNodeContentInTree(c, nodeId, key, value)),
    };
  }
  return tree;
}

function findNodeById(tree: DesignNode, id: string): DesignNode | null {
  if (tree.id === id) return tree;
  for (const c of tree.children ?? []) {
    const found = findNodeById(c, id);
    if (found) return found;
  }
  return null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TestV6Page() {
  const [tree, setTree] = React.useState<DesignNode>(EDITORIAL_TEST_TREE);
  const [history, setHistory] = React.useState<DesignNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null);

  const selectedNode = selectedNodeId ? findNodeById(tree, selectedNodeId) : null;
  const isBreakout = selectedNode?.style?.position === "absolute";

  const pushHistory = React.useCallback((_desc: string) => {
    setHistory((h) => [...h.slice(-49), tree]);
  }, [tree]);

  const handleUpdateStyle = React.useCallback(
    (nodeId: string, style: Partial<DesignNodeStyle>) => {
      setHistory((h) => [...h.slice(-49), tree]);
      setTree((t) => updateNodeStyleInTree(t, nodeId, style));
    },
    [tree]
  );

  const handleUpdateContent = React.useCallback(
    (nodeId: string, key: string, value: string) => {
      setTree((t) => updateNodeContentInTree(t, nodeId, key, value));
    },
    []
  );

  // Undo via Cmd+Z
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        setHistory((h) => {
          if (h.length === 0) return h;
          const prev = h[h.length - 1];
          setTree(prev);
          return h.slice(0, -1);
        });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleBreakoutToggle = () => {
    if (!selectedNodeId) return;
    const newStyle: Partial<DesignNodeStyle> = isBreakout
      ? { position: "relative", x: undefined, y: undefined }
      : { position: "absolute", x: 100, y: 100, zIndex: 1 };
    handleUpdateStyle(selectedNodeId, newStyle);
  };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#F5F5F0" }}>
      {/* Canvas area */}
      <div style={{ flex: 1, overflow: "auto", background: "#FAF9F6" }}>
        {/* Badge */}
        <div style={{
          position: "fixed", top: 16, right: 296, background: "#1A1A1A",
          color: "#FFFFFF", padding: "8px 16px", borderRadius: 4,
          fontSize: 12, fontFamily: "monospace", zIndex: 9999,
        }}>
          V6 RENDERER PROOF — Phase 1a
        </div>

        <ComposeDocumentViewV6
          tree={tree}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
          onUpdateContent={handleUpdateContent}
          onUpdateNodeStyle={handleUpdateStyle}
          onPushHistory={pushHistory}
          interactive
          zoom={1}
        />
      </div>

      {/* Inspector panel */}
      <div style={{
        width: 272, borderLeft: "1px solid #E5E5E0", background: "white",
        display: "flex", flexDirection: "column", flexShrink: 0, overflow: "auto",
      }}>
        {/* Header */}
        <div style={{
          padding: "12px 16px", borderBottom: "1px solid #E5E5E0",
          fontFamily: "monospace", fontSize: 10, letterSpacing: "0.12em",
          color: "#A0A0A0", textTransform: "uppercase",
        }}>
          Inspector
        </div>

        {selectedNode ? (
          <>
            {/* Selected node info */}
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #E5E5E0" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#1A1A1A", marginBottom: 4 }}>
                {selectedNode.name}
              </div>
              <div style={{ fontSize: 11, color: "#A0A0A0", fontFamily: "monospace" }}>
                {selectedNode.type} · {selectedNode.id}
              </div>
            </div>

            {/* Position section */}
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #E5E5E0" }}>
              <div style={{
                fontSize: 10, fontFamily: "monospace", letterSpacing: "0.12em",
                color: "#A0A0A0", textTransform: "uppercase", marginBottom: 8,
              }}>
                Position
              </div>
              <div style={{ display: "flex", gap: 0 }}>
                <button
                  onClick={() => !isBreakout && handleBreakoutToggle()}
                  style={{
                    flex: 1, padding: "6px 0", fontSize: 12, border: "1px solid #E5E5E0",
                    borderRight: "none", borderRadius: "4px 0 0 4px", cursor: "pointer",
                    background: !isBreakout ? "#1E5DF2" : "white",
                    color: !isBreakout ? "white" : "#6B6B6B",
                    fontWeight: !isBreakout ? 600 : 400,
                  }}
                >
                  Flow
                </button>
                <button
                  onClick={() => isBreakout && handleBreakoutToggle()}
                  style={{
                    flex: 1, padding: "6px 0", fontSize: 12, border: "1px solid #E5E5E0",
                    borderRadius: "0 4px 4px 0", cursor: "pointer",
                    background: isBreakout ? "#1E5DF2" : "white",
                    color: isBreakout ? "white" : "#6B6B6B",
                    fontWeight: isBreakout ? 600 : 400,
                  }}
                >
                  Breakout
                </button>
              </div>
              {isBreakout && (
                <div style={{ marginTop: 8, fontSize: 11, color: "#888", fontFamily: "monospace" }}>
                  x: {selectedNode.style.x ?? 0}  y: {selectedNode.style.y ?? 0}  z: {selectedNode.style.zIndex ?? 1}
                </div>
              )}
            </div>

            {/* Style info */}
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #E5E5E0" }}>
              <div style={{
                fontSize: 10, fontFamily: "monospace", letterSpacing: "0.12em",
                color: "#A0A0A0", textTransform: "uppercase", marginBottom: 8,
              }}>
                Style
              </div>
              <pre style={{ fontSize: 10, color: "#6B6B6B", margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                {JSON.stringify(selectedNode.style, null, 2).slice(0, 300)}
              </pre>
            </div>
          </>
        ) : (
          <div style={{ padding: "24px 16px", fontSize: 12, color: "#A0A0A0", textAlign: "center" }}>
            Click an element to inspect
          </div>
        )}

        {/* Undo status */}
        <div style={{
          marginTop: "auto", padding: "12px 16px", borderTop: "1px solid #E5E5E0",
          fontSize: 11, color: "#A0A0A0", fontFamily: "monospace",
        }}>
          History: {history.length} steps · ⌘Z to undo
        </div>
      </div>
    </div>
  );
}
