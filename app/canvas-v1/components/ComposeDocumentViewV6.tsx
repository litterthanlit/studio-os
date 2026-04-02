// app/canvas-v1/components/ComposeDocumentViewV6.tsx
// V6 renderer — renders DesignNode trees as live HTML/CSS.
// Phase 1a: render. Phase 1b: selection + inline text editing.

"use client";

import React from "react";
import type { DesignNode, DesignNodeStyle } from "@/lib/canvas/design-node";
import { findDesignNodeById } from "@/lib/canvas/design-node";
import { designStyleToCSS } from "@/lib/canvas/design-style-to-css";
import { useDragDesignNode } from "@/app/canvas-v1/hooks/useDragDesignNode";
import { useSnapGuides } from "@/app/canvas-v1/hooks/useSnapGuides";
import { ENTER_TEXT_EDIT_MODE_EVENT } from "@/app/canvas-v1/hooks/useCanvasKeyboard";
import { DesignNodeResizeHandles } from "./DesignNodeResizeHandles";
import { SnapGuideLines } from "./SnapGuideLines";

// ── Types ──────────────────────────────────────────────────────────

type ComposeDocumentViewV6Props = {
  tree: DesignNode;
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string | null) => void;
  onUpdateContent?: (nodeId: string, key: string, value: string) => void;
  onUpdateNodeStyle?: (nodeId: string, style: Partial<DesignNodeStyle>) => void;
  onPushHistory?: (description: string) => void;
  interactive?: boolean;
  /** Artboard ID — needed for drag-to-reposition dispatch */
  artboardId?: string | null;
  /** Current canvas zoom — needed for zoom-aware drag */
  zoom?: number;
};

type InlineTextEditEventDetail = {
  artboardId: string;
  nodeId: string;
};

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

function TextContent({ node, isEditing, dragProtected = false, onStartEdit, onCommitEdit }: {
  node: DesignNode;
  isEditing: boolean;
  dragProtected?: boolean;
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
        onPointerDownCapture={
          dragProtected
            ? (e) => {
                e.stopPropagation();
              }
            : undefined
        }
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
          onPointerDownCapture={
            dragProtected
              ? (e) => {
                  e.stopPropagation();
                }
              : undefined
          }
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

// ── Breakout Badge ────────────────────────────────────────────────

function BreakoutBadge() {
  return (
    <div
      style={{
        position: "absolute",
        top: 4,
        left: 4,
        display: "flex",
        alignItems: "center",
        gap: 3,
        padding: "1px 5px 1px 4px",
        borderRadius: 3,
        background: "rgba(30, 93, 242, 0.12)",
        border: "1px solid rgba(30, 93, 242, 0.25)",
        fontSize: 9,
        fontFamily: "var(--font-mono, monospace)",
        fontWeight: 500,
        color: "#1E5DF2",
        letterSpacing: "0.04em",
        textTransform: "uppercase" as const,
        lineHeight: 1,
        pointerEvents: "none" as const,
        zIndex: 9999,
        userSelect: "none" as const,
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: "#1E5DF2",
          flexShrink: 0,
        }}
      />
      Breakout
    </div>
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
  const [isHovered, setIsHovered] = React.useState(false);
  const cssStyle = designStyleToCSS(node.style);
  const isSelected = node.id === selectedNodeId;
  const isEditing = node.id === editingNodeId;
  const isAbsolute = node.style.position === "absolute";
  const showBreakoutBadge = interactive && isAbsolute && (isSelected || isHovered);

  const hoverHandlers = interactive && isAbsolute
    ? {
        onMouseEnter: () => setIsHovered(true),
        onMouseLeave: () => setIsHovered(false),
      }
    : {};

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
      const needsScrim = hasCover && (
        node.style.scrimEnabled !== undefined
          ? node.style.scrimEnabled
          : isLightColor(node.style.foreground)
      );

      const frameStyle: React.CSSProperties = {
        ...cssStyle,
        ...(hasCover ? { position: "relative", overflow: "hidden" } : {}),
        boxSizing: "border-box",
        ...selectionOutlineStyle(isSelected && interactive),
      };

      // Breakout badge needs a positioning context
      if (showBreakoutBadge && !hasCover && frameStyle.position !== "absolute") {
        frameStyle.position = "relative";
      }

      return (
        <div
          key={node.id}
          data-node-id={node.id}
          style={frameStyle}
          onClick={interactive ? (e) => { e.stopPropagation(); onSelect(node.id); } : undefined}
          {...hoverHandlers}
        >
          {showBreakoutBadge && <BreakoutBadge />}
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

      if (showBreakoutBadge && textStyle.position !== "absolute") {
        textStyle.position = "relative";
      }

      return (
        <div
          key={node.id}
          data-node-id={node.id}
          style={textStyle}
          onClick={interactive ? (e) => { e.stopPropagation(); onSelect(node.id); } : undefined}
          {...hoverHandlers}
        >
          {showBreakoutBadge && <BreakoutBadge />}
          <TextContent
            node={node}
            isEditing={isEditing}
            dragProtected={interactive && isSelected && isAbsolute}
            onStartEdit={() => onStartEdit(node.id)}
            onCommitEdit={(newText) => onCommitEdit(node.id, newText)}
          />
        </div>
      );
    }

    case "image": {
      const src = node.content?.src;
      if (!src) return null;

      const wrapperStyle: React.CSSProperties = {
        ...cssStyle,
        display: "block",
        boxSizing: "border-box",
        overflow: cssStyle.overflow ?? "hidden",
        ...selectionOutlineStyle(isSelected && interactive),
      };

      if (showBreakoutBadge && wrapperStyle.position !== "absolute") {
        wrapperStyle.position = "relative";
      }

      const imgStyle: React.CSSProperties = {
        display: "block",
        width: "100%",
        height: cssStyle.height != null ? "100%" : "auto",
        objectFit: node.style.objectFit || "cover",
        pointerEvents: "none",
      };

      return (
        <div
          key={node.id}
          data-node-id={node.id}
          style={wrapperStyle}
          onClick={interactive ? (e) => { e.stopPropagation(); onSelect(node.id); } : undefined}
          {...hoverHandlers}
        >
          {showBreakoutBadge && <BreakoutBadge />}
          <img
            src={src}
            alt={node.content?.alt || ""}
            style={imgStyle}
          />
        </div>
      );
    }

    case "button": {
      const btnStyle: React.CSSProperties = {
        ...cssStyle,
        cursor: interactive ? "default" : "pointer",
        boxSizing: "border-box",
        ...selectionOutlineStyle(isSelected && interactive),
      };

      if (showBreakoutBadge && btnStyle.position !== "absolute") {
        btnStyle.position = "relative";
      }

      return (
        <button
          key={node.id}
          data-node-id={node.id}
          style={btnStyle}
          onClick={interactive ? (e) => { e.preventDefault(); e.stopPropagation(); onSelect(node.id); } : undefined}
          {...hoverHandlers}
        >
          {showBreakoutBadge && <BreakoutBadge />}
          {node.content?.text || "Button"}
        </button>
      );
    }

    case "divider": {
      const wrapperStyle: React.CSSProperties = {
        ...cssStyle,
        boxSizing: "border-box",
        ...selectionOutlineStyle(isSelected && interactive),
      };

      if (showBreakoutBadge && wrapperStyle.position !== "absolute") {
        wrapperStyle.position = "relative";
      }

      const hrStyle: React.CSSProperties = {
        border: "none",
        borderTop: `${node.style.borderWidth ?? 1}px solid ${node.style.borderColor || "rgba(0,0,0,0.1)"}`,
        width: "100%",
        margin: 0,
        pointerEvents: "none",
      };

      return (
        <div
          key={node.id}
          data-node-id={node.id}
          style={wrapperStyle}
          onClick={interactive ? (e) => { e.stopPropagation(); onSelect(node.id); } : undefined}
          {...hoverHandlers}
        >
          {showBreakoutBadge && <BreakoutBadge />}
          <hr style={hrStyle} />
        </div>
      );
    }

    default:
      return null;
  }
}

// ── Resize Overlay ────────────────────────────────────────────────
// Measures the selected node's DOM element and positions resize handles over it.

function ResizeOverlay({
  selectedNodeId,
  editingNodeId,
  tree,
  containerRef,
  zoom,
  onUpdateNodeStyle,
  onPushHistory,
}: {
  selectedNodeId: string | null;
  editingNodeId: string | null;
  tree: DesignNode;
  containerRef: React.RefObject<HTMLDivElement | null>;
  zoom: number;
  onUpdateNodeStyle?: (nodeId: string, style: Partial<DesignNodeStyle>) => void;
  onPushHistory?: (description: string) => void;
}) {
  const [nodeRect, setNodeRect] = React.useState<{ top: number; left: number; width: number; height: number } | null>(null);

  // Measure the selected node's bounding box relative to the container
  React.useEffect(() => {
    if (!selectedNodeId || editingNodeId || !containerRef.current) {
      setNodeRect(null);
      return;
    }

    const container = containerRef.current;
    const nodeEl = container.querySelector<HTMLElement>(`[data-node-id="${selectedNodeId}"]`);
    if (!nodeEl) {
      setNodeRect(null);
      return;
    }

    const measure = () => {
      const containerRect = container.getBoundingClientRect();
      const elRect = nodeEl.getBoundingClientRect();
      setNodeRect({
        top: (elRect.top - containerRect.top) / zoom,
        left: (elRect.left - containerRect.left) / zoom,
        width: elRect.width / zoom,
        height: elRect.height / zoom,
      });
    };

    measure();

    // Re-measure on resize/mutation (handles layout changes during resize)
    const observer = new ResizeObserver(measure);
    observer.observe(nodeEl);

    // Also observe mutations on the container in case DOM structure changes
    const mutationObserver = new MutationObserver(measure);
    mutationObserver.observe(container, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, [selectedNodeId, editingNodeId, containerRef, zoom, tree]);

  const selectedNode = selectedNodeId ? findDesignNodeById(tree, selectedNodeId) : null;

  if (!nodeRect || !selectedNode || !onUpdateNodeStyle || editingNodeId) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: nodeRect.top,
        left: nodeRect.left,
        width: nodeRect.width,
        height: nodeRect.height,
        pointerEvents: "none",
        zIndex: 10,
      }}
    >
      <div style={{ pointerEvents: "auto" }}>
        <DesignNodeResizeHandles
          node={selectedNode}
          nodeRect={{ width: nodeRect.width, height: nodeRect.height }}
          zoom={zoom}
          onResize={(styleUpdate) => {
            onUpdateNodeStyle(selectedNode.id, styleUpdate);
          }}
          onResizeEnd={(styleUpdate) => {
            onUpdateNodeStyle(selectedNode.id, styleUpdate);
            onPushHistory?.("Resize element");
          }}
        />
      </div>
    </div>
  );
}

// ── Public Component ───────────────────────────────────────────────

export function ComposeDocumentViewV6({
  tree,
  selectedNodeId = null,
  onSelectNode,
  onUpdateContent,
  onUpdateNodeStyle,
  onPushHistory,
  interactive = false,
  artboardId = null,
  zoom = 1,
}: ComposeDocumentViewV6Props) {
  const [editingNodeId, setEditingNodeId] = React.useState<string | null>(null);
  const historyPushedRef = React.useRef(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // ── Hover outline (direct DOM, zero re-renders) ────────────────────
  const hoverElRef = React.useRef<HTMLElement | null>(null);

  const clearHoverOutline = React.useCallback(() => {
    const el = hoverElRef.current;
    if (el) {
      // Only clear the outline if React hasn't taken ownership (i.e. it's not the selected node)
      const nodeId = el.getAttribute("data-node-id");
      if (nodeId !== selectedNodeId) {
        el.style.outline = "";
        el.style.outlineOffset = "";
      }
    }
    hoverElRef.current = null;
  }, [selectedNodeId]);

  const handleHoverMove = React.useCallback(
    (e: React.MouseEvent) => {
      if (!interactive) return;
      const target = (e.target as HTMLElement).closest<HTMLElement>("[data-node-id]");
      if (!target) {
        clearHoverOutline();
        return;
      }
      // Same element — nothing to do
      if (target === hoverElRef.current) return;
      // Don't hover-outline the selected node
      const nodeId = target.getAttribute("data-node-id");
      if (nodeId && nodeId === selectedNodeId) {
        clearHoverOutline();
        return;
      }
      // Swap outline
      clearHoverOutline();
      target.style.outline = "1px dashed rgba(30, 93, 242, 0.4)";
      target.style.outlineOffset = "-1px";
      hoverElRef.current = target;
    },
    [interactive, selectedNodeId, clearHoverOutline]
  );

  const handleHoverLeave = React.useCallback(() => {
    clearHoverOutline();
  }, [clearHoverOutline]);

  // Clear hover outline when selected node changes (it now gets the solid outline)
  React.useEffect(() => {
    if (
      hoverElRef.current &&
      hoverElRef.current.getAttribute("data-node-id") === selectedNodeId
    ) {
      clearHoverOutline();
    }
  }, [selectedNodeId, clearHoverOutline]);

  // ── Snap guides for drag alignment ──────────────────────────────
  // Track drag state at the component level so snap hook can react
  const [dragState, setDragState] = React.useState<{ isDragging: boolean; draggedNodeId: string | null }>({
    isDragging: false,
    draggedNodeId: null,
  });

  const snapGuidesHook = useSnapGuides({
    tree,
    draggedNodeId: dragState.draggedNodeId,
    isDragging: dragState.isDragging,
  });

  // ── Drag-to-reposition for absolute-positioned nodes ────────────
  const { isDragging, draggedNodeId } = useDragDesignNode({
    tree,
    selectedNodeId,
    artboardId,
    zoom,
    interactive,
    containerRef,
    snapPosition: snapGuidesHook.snapPosition,
  });

  // Sync drag state from the drag hook into the snap hook's input
  React.useEffect(() => {
    setDragState({ isDragging, draggedNodeId: draggedNodeId ?? null });
  }, [isDragging, draggedNodeId]);

  // Determine if selected node is absolute (for move cursor)
  const selectedNodeIsAbsolute = React.useMemo(() => {
    if (!selectedNodeId || !interactive) return false;
    const node = findDesignNodeById(tree, selectedNodeId);
    return node?.style.position === "absolute";
  }, [selectedNodeId, interactive, tree]);

  // Clear editing state when selection changes
  React.useEffect(() => {
    if (selectedNodeId !== editingNodeId) {
      setEditingNodeId(null);
    }
  }, [selectedNodeId, editingNodeId]);

  // Apply move cursor to selected absolute node
  React.useEffect(() => {
    if (!containerRef.current || !selectedNodeId || !selectedNodeIsAbsolute) return;
    const el = containerRef.current.querySelector<HTMLElement>(
      `[data-node-id="${selectedNodeId}"]`
    );
    if (!el) return;
    el.style.cursor = "move";
    return () => {
      el.style.cursor = "";
    };
  }, [selectedNodeId, selectedNodeIsAbsolute]);

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

  // Listen for keyboard-initiated Enter-to-edit and route through the
  // normal V6 edit path so history/edit state stays coherent.
  React.useEffect(() => {
    if (!interactive || !artboardId) return;

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<InlineTextEditEventDetail>).detail;
      if (!detail) return;
      if (detail.artboardId !== artboardId || detail.nodeId !== selectedNodeId) return;
      handleStartEdit(detail.nodeId);
    };

    window.addEventListener(
      ENTER_TEXT_EDIT_MODE_EVENT,
      handler as EventListener
    );
    return () => {
      window.removeEventListener(
        ENTER_TEXT_EDIT_MODE_EVENT,
        handler as EventListener
      );
    };
  }, [interactive, artboardId, selectedNodeId, handleStartEdit]);

  // ── Double-click to drill into children (Framer-style) ────────────
  const handleDoubleClick = React.useCallback(
    (e: React.MouseEvent) => {
      if (!interactive || !onSelectNode) return;

      // If text is currently being edited, don't interfere — let native
      // word selection / contentEditable behavior handle it
      if (editingNodeId) return;

      // Find all elements at the click point with data-node-id
      const elementsAtPoint = document.elementsFromPoint(e.clientX, e.clientY);
      const nodeElements = elementsAtPoint.filter(
        (el) => el.hasAttribute("data-node-id")
      );

      if (nodeElements.length === 0) return;

      // The deepest node in the DOM tree is the first element returned by
      // elementsFromPoint (topmost in stacking order = deepest in tree)
      const deepestEl = nodeElements[0];
      const deepestId = deepestEl.getAttribute("data-node-id");
      if (!deepestId) return;

      // If the deepest node is already selected, this is a text node
      // double-click — let existing contentEditable behavior handle it
      if (deepestId === selectedNodeId) return;

      // Select the deepest node
      e.preventDefault();
      exitAnyActiveTextEditingV6();
      setEditingNodeId(null);
      onSelectNode(deepestId);
    },
    [interactive, onSelectNode, selectedNodeId, editingNodeId]
  );

  // ── Container dimensions for snap guide lines ──────────────────
  const containerWidth = typeof tree.style.width === "number" ? tree.style.width : 0;
  const containerHeight = typeof tree.style.height === "number" ? tree.style.height : 0;

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <div
        ref={containerRef}
        tabIndex={-1}
        style={{ width: "100%", overflow: "hidden", outline: "none", position: "relative" }}
        onMouseMove={interactive ? handleHoverMove : undefined}
        onMouseLeave={interactive ? handleHoverLeave : undefined}
        onDoubleClick={interactive ? handleDoubleClick : undefined}
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
        {interactive && dragState.isDragging && snapGuidesHook.activeGuides.length > 0 && (
          <SnapGuideLines
            guides={snapGuidesHook.activeGuides}
            containerWidth={containerWidth || 1200}
            containerHeight={containerHeight || 2000}
          />
        )}
      </div>
      {interactive && selectedNodeId && !editingNodeId && (
        <ResizeOverlay
          selectedNodeId={selectedNodeId}
          editingNodeId={editingNodeId}
          tree={tree}
          containerRef={containerRef}
          zoom={zoom}
          onUpdateNodeStyle={onUpdateNodeStyle}
          onPushHistory={onPushHistory}
        />
      )}
    </div>
  );
}
