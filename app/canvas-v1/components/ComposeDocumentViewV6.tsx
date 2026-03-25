// app/canvas-v1/components/ComposeDocumentViewV6.tsx
// V6 renderer — renders DesignNode trees as live HTML/CSS.
// Phase 1a: render. Phase 1b: selection + inline text editing.

"use client";

import React from "react";
import type { DesignNode } from "@/lib/canvas/design-node";
import { designStyleToCSS } from "@/lib/canvas/design-style-to-css";

// ── Types ──────────────────────────────────────────────────────────

type ComposeDocumentViewV6Props = {
  tree: DesignNode;
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string | null) => void;
  onUpdateContent?: (nodeId: string, key: string, value: string) => void;
  onPushHistory?: (description: string) => void;
  interactive?: boolean;
};

// ── Custom event for Enter-to-edit ─────────────────────────────────

const ENTER_TEXT_EDIT_MODE_EVENT = "studio-os:enter-text-edit";

// ── Exit any active text editing (exported for CanvasArtboard) ─────

export function exitAnyActiveTextEditingV6(): void {
  const el = document.querySelector<HTMLElement>(
    "[data-v6-text-editing='true']"
  );
  if (el) {
    el.contentEditable = "false";
    el.removeAttribute("data-v6-text-editing");
    el.blur();
  }
}

// ── Cover Image ────────────────────────────────────────────────────

function CoverImage({ src, size, position }: {
  src: string;
  size?: "cover" | "contain";
  position?: string;
}) {
  return (
    <img
      src={src}
      alt=""
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: size || "cover",
        objectPosition: position || "center",
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}

// ── Scrim ──────────────────────────────────────────────────────────

function CoverScrim({ background }: { background?: string }) {
  const scrimBg = background || "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.45) 100%)";
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: scrimBg,
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}

// ── Light color detection ──────────────────────────────────────────

function isLightColor(hex?: string): boolean {
  if (!hex || !hex.startsWith("#")) return false;
  let c = hex.replace("#", "");
  if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  if (c.length !== 6) return false;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6;
}

// ── Selection outline style ────────────────────────────────────────

function selectionOutlineStyle(isSelected: boolean): React.CSSProperties {
  if (!isSelected) return {};
  return {
    outline: "2px solid #1E5DF2",
    outlineOffset: -2,
  };
}

// ── Text Content Renderer ──────────────────────────────────────────

function TextContent({ node, isEditing, onStartEdit, onCommitEdit }: {
  node: DesignNode;
  isEditing: boolean;
  onStartEdit: () => void;
  onCommitEdit: (newText: string) => void;
}) {
  const textRef = React.useRef<HTMLDivElement>(null);
  const originalTextRef = React.useRef<string>("");
  const content = node.content;

  // Enter edit mode
  React.useEffect(() => {
    if (!isEditing || !textRef.current) return;
    const el = textRef.current;
    originalTextRef.current = el.textContent || "";
    el.contentEditable = "true";
    el.setAttribute("data-v6-text-editing", "true");
    el.style.caretColor = "#1E5DF2";
    el.style.outline = "none";
    el.focus();

    // Place cursor at end
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(el);
    range.collapse(false);
    sel?.removeAllRanges();
    sel?.addRange(range);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        commit();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        el.textContent = originalTextRef.current;
        commit();
      }
    };

    const commit = () => {
      const newText = el.textContent || "";
      el.contentEditable = "false";
      el.removeAttribute("data-v6-text-editing");
      onCommitEdit(newText);
    };

    const handleBlur = () => commit();

    el.addEventListener("keydown", handleKeyDown);
    el.addEventListener("blur", handleBlur);

    return () => {
      el.removeEventListener("keydown", handleKeyDown);
      el.removeEventListener("blur", handleBlur);
    };
  }, [isEditing, onCommitEdit]);

  if (!content) return null;

  // For text nodes with only content.text, render a single editable div
  const hasOnlyText = content.text && !content.kicker && !content.subtext;

  if (hasOnlyText) {
    return (
      <div
        ref={textRef}
        data-text-edit-target="true"
        onDoubleClick={(e) => {
          e.stopPropagation();
          onStartEdit();
        }}
        suppressContentEditableWarning
      >
        {content.text}
      </div>
    );
  }

  // Multi-field text content (kicker + text + subtext)
  return (
    <>
      {content.kicker && (
        <span style={{
          display: "block",
          fontSize: 11,
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          opacity: 0.5,
          marginBottom: 8,
        }}>
          {content.kicker}
        </span>
      )}
      {content.text && (
        <div
          ref={textRef}
          data-text-edit-target="true"
          onDoubleClick={(e) => {
            e.stopPropagation();
            onStartEdit();
          }}
          suppressContentEditableWarning
          style={{ display: "block" }}
        >
          {content.text}
        </div>
      )}
      {content.subtext && (
        <span style={{ display: "block", marginTop: 8, fontSize: "0.85em", opacity: 0.7 }}>
          {content.subtext}
        </span>
      )}
    </>
  );
}

// ── Main Render Function ───────────────────────────────────────────

function RenderDesignNode({ node, selectedNodeId, editingNodeId, interactive, onSelect, onStartEdit, onCommitEdit }: {
  node: DesignNode;
  selectedNodeId: string | null;
  editingNodeId: string | null;
  interactive: boolean;
  onSelect: (nodeId: string) => void;
  onStartEdit: (nodeId: string) => void;
  onCommitEdit: (nodeId: string, newText: string) => void;
}): React.ReactElement | null {
  const cssStyle = designStyleToCSS(node.style);
  const isSelected = node.id === selectedNodeId;
  const isEditing = node.id === editingNodeId;

  const renderChildren = (hasCover: boolean) =>
    node.children?.map((child) => {
      const wrapper = hasCover ? { position: "relative" as const, zIndex: 1 } : {};
      return (
        <div key={child.id} style={wrapper}>
          <RenderDesignNode
            node={child}
            selectedNodeId={selectedNodeId}
            editingNodeId={editingNodeId}
            interactive={interactive}
            onSelect={onSelect}
            onStartEdit={onStartEdit}
            onCommitEdit={onCommitEdit}
          />
        </div>
      );
    });

  switch (node.type) {
    case "frame": {
      const hasCover = Boolean(node.style.coverImage);
      const needsScrim = hasCover && isLightColor(node.style.foreground);

      const frameStyle: React.CSSProperties = {
        ...cssStyle,
        ...(hasCover ? { position: "relative", overflow: "hidden" } : {}),
        boxSizing: "border-box",
        ...selectionOutlineStyle(isSelected && interactive),
      };

      return (
        <div
          key={node.id}
          data-node-id={node.id}
          style={frameStyle}
          onClick={interactive ? (e) => { e.stopPropagation(); onSelect(node.id); } : undefined}
        >
          {hasCover && <CoverImage src={node.style.coverImage!} size={node.style.coverSize} position={node.style.coverPosition} />}
          {needsScrim && <CoverScrim />}
          {renderChildren(hasCover)}
        </div>
      );
    }

    case "text": {
      const textStyle: React.CSSProperties = {
        ...cssStyle,
        boxSizing: "border-box",
        ...selectionOutlineStyle(isSelected && interactive),
      };

      return (
        <div
          key={node.id}
          data-node-id={node.id}
          style={textStyle}
          onClick={interactive ? (e) => { e.stopPropagation(); onSelect(node.id); } : undefined}
        >
          <TextContent
            node={node}
            isEditing={isEditing}
            onStartEdit={() => onStartEdit(node.id)}
            onCommitEdit={(newText) => onCommitEdit(node.id, newText)}
          />
        </div>
      );
    }

    case "image": {
      const src = node.content?.src;
      if (!src) return null;
      return (
        <img
          key={node.id}
          data-node-id={node.id}
          src={src}
          alt={node.content?.alt || ""}
          style={{
            ...cssStyle,
            display: "block",
            boxSizing: "border-box",
            ...selectionOutlineStyle(isSelected && interactive),
          }}
          onClick={interactive ? (e) => { e.stopPropagation(); onSelect(node.id); } : undefined}
        />
      );
    }

    case "button": {
      return (
        <button
          key={node.id}
          data-node-id={node.id}
          style={{
            ...cssStyle,
            cursor: interactive ? "default" : "pointer",
            boxSizing: "border-box",
            ...selectionOutlineStyle(isSelected && interactive),
          }}
          onClick={interactive ? (e) => { e.preventDefault(); e.stopPropagation(); onSelect(node.id); } : undefined}
        >
          {node.content?.text || "Button"}
        </button>
      );
    }

    case "divider": {
      return (
        <hr
          key={node.id}
          data-node-id={node.id}
          style={{
            border: "none",
            borderTop: `1px solid ${node.style.borderColor || "rgba(0,0,0,0.1)"}`,
            width: "100%",
            ...cssStyle,
            ...selectionOutlineStyle(isSelected && interactive),
          }}
          onClick={interactive ? (e) => { e.stopPropagation(); onSelect(node.id); } : undefined}
        />
      );
    }

    default:
      return null;
  }
}

// ── Public Component ───────────────────────────────────────────────

export function ComposeDocumentViewV6({
  tree,
  selectedNodeId = null,
  onSelectNode,
  onUpdateContent,
  onPushHistory,
  interactive = false,
}: ComposeDocumentViewV6Props) {
  const [editingNodeId, setEditingNodeId] = React.useState<string | null>(null);
  const historyPushedRef = React.useRef(false);

  // Clear editing state when selection changes
  React.useEffect(() => {
    if (selectedNodeId !== editingNodeId) {
      setEditingNodeId(null);
    }
  }, [selectedNodeId, editingNodeId]);

  // Listen for Enter key to start text editing
  React.useEffect(() => {
    if (!interactive) return;
    const handler = () => {
      if (selectedNodeId) {
        setEditingNodeId(selectedNodeId);
      }
    };
    window.addEventListener(ENTER_TEXT_EDIT_MODE_EVENT, handler);
    return () => window.removeEventListener(ENTER_TEXT_EDIT_MODE_EVENT, handler);
  }, [interactive, selectedNodeId]);

  const handleSelect = React.useCallback(
    (nodeId: string) => {
      exitAnyActiveTextEditingV6();
      setEditingNodeId(null);
      onSelectNode?.(nodeId);
    },
    [onSelectNode]
  );

  const handleStartEdit = React.useCallback(
    (nodeId: string) => {
      if (!interactive) return;
      // Push history before first edit
      if (!historyPushedRef.current) {
        onPushHistory?.("Edit text");
        historyPushedRef.current = true;
      }
      setEditingNodeId(nodeId);
    },
    [interactive, onPushHistory]
  );

  const handleCommitEdit = React.useCallback(
    (nodeId: string, newText: string) => {
      setEditingNodeId(null);
      historyPushedRef.current = false;
      onUpdateContent?.(nodeId, "text", newText);
    },
    [onUpdateContent]
  );

  return (
    <div
      style={{ width: "100%", overflow: "hidden" }}
      onClick={interactive ? (e) => {
        // Click on empty space — deselect
        if (!(e.target as HTMLElement).closest("[data-node-id]")) {
          onSelectNode?.(null);
        }
      } : undefined}
    >
      <RenderDesignNode
        node={tree}
        selectedNodeId={selectedNodeId}
        editingNodeId={editingNodeId}
        interactive={interactive}
        onSelect={handleSelect}
        onStartEdit={handleStartEdit}
        onCommitEdit={handleCommitEdit}
      />
    </div>
  );
}