// app/canvas-v1/components/ComposeDocumentViewV6.tsx
// V6 renderer — renders DesignNode trees as live HTML/CSS.
// Phase 1a: render. Phase 1b: selection + inline text editing.

"use client";

import React from "react";
import type { DesignNode, DesignNodeStyle, ComponentMaster } from "@/lib/canvas/design-node";
import { findDesignNodeById, findDesignNodeParent } from "@/lib/canvas/design-node";
import { getParent } from "@/lib/canvas/nested-selection";
import { resolveTree, computeComponentsResolveEpoch } from "@/lib/canvas/component-resolver";
import { designStyleToCSS } from "@/lib/canvas/design-style-to-css";
import { useDragDesignNode } from "@/app/canvas-v1/hooks/useDragDesignNode";
import { useSnapGuides } from "@/app/canvas-v1/hooks/useSnapGuides";
import { ENTER_TEXT_EDIT_MODE_EVENT } from "@/app/canvas-v1/hooks/useCanvasKeyboard";
import { DesignNodeResizeHandles } from "./DesignNodeResizeHandles";
import { SizingModeToast } from "./SizingModeToast";
import { SnapGuideLines } from "./SnapGuideLines";
import { Plus } from "lucide-react";
import { ComponentQuickPicker } from "./ComponentQuickPicker";
import { useRubberBandSelection } from "@/app/canvas-v1/hooks/useRubberBandSelection";
import { useFrameDraw, type FrameDrawCommitPayload } from "@/app/canvas-v1/hooks/useFrameDraw";
import { useTextPlace, type TextPlaceCommitPayload } from "@/app/canvas-v1/hooks/useTextPlace";
import { resolveInsertTargetForRawTree } from "@/lib/canvas/design-canvas-hit";
import { useCanvasReparentAltDrag } from "@/app/canvas-v1/hooks/useCanvasReparentAltDrag";
import { useNestedSelection } from "../hooks/useNestedSelection";
import { NestedHoverPreview } from "./NestedHoverPreview";
import {
  CANVAS_SEL_CARET,
  CANVAS_SEL_DRAG_DIM,
  CANVAS_SEL_FILL_SOFT,
  CANVAS_SEL_LABEL,
  CANVAS_SEL_LIVE,
  CANVAS_SEL_MARQUEE_BORDER,
  CANVAS_SEL_MARQUEE_FILL,
  CANVAS_SEL_PRIMARY,
  CANVAS_SEL_SECONDARY,
  CANVAS_SEL_TEXT_LIVE,
  CANVAS_SEL_TEXT_PRIMARY,
  CANVAS_SEL_TEXT_SECONDARY,
} from "@/app/canvas-v1/canvas-selection-tokens";

// ── Blank section factory for insertion ────────────────────────────────────
let _insertCounter = 0;
function createBlankDesignSection(): DesignNode {
  const id = `frame-${Date.now()}-${++_insertCounter}`;
  return {
    id,
    type: "frame",
    name: "Section",
    style: {
      width: "fill",
      height: "hug",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 24,
      padding: { top: 80, right: 40, bottom: 80, left: 40 },
    },
    children: [],
  };
}

// ── Insertion Bar ──────────────────────────────────────────────────
function V6InsertionBar({
  onInsert,
  onOpenGallery,
}: {
  onInsert: (node: DesignNode) => void;
  onOpenGallery?: () => void;
}) {
  const [hovered, setHovered] = React.useState(false);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [pickerAnchorRect, setPickerAnchorRect] = React.useState<DOMRect | null>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ height: 8 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Dashed line */}
      <div
        className={`absolute inset-x-0 top-1/2 border-t border-dashed transition-colors transition-opacity duration-100 ${hovered ? "border-[#D1E4FC]" : "border-[#E5E5E0]"}`}
        style={{ opacity: hovered ? 0.8 : 0 }}
      />
      {/* Plus button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setPickerAnchorRect(e.currentTarget.getBoundingClientRect());
          setPickerOpen(true);
        }}
        className={`relative z-10 flex h-5 w-5 items-center justify-center rounded-full bg-white transition-all duration-100 ${hovered ? "border border-[rgb(59,130,250)] text-[rgb(59,130,250)]" : "border border-[#E5E5E0] text-[#A0A0A0] hover:border-[#BFDBFE] hover:text-[rgb(59,130,250)]"}`}
        style={{ opacity: hovered || pickerOpen ? 1 : 0, transform: hovered || pickerOpen ? "scale(1)" : "scale(0.8)" }}
      >
        <Plus size={12} />
      </button>
      {pickerOpen && pickerAnchorRect && (
        <ComponentQuickPicker
          anchorRect={pickerAnchorRect}
          onInsert={(node) => { onInsert(node); setPickerOpen(false); }}
          onBrowseAll={() => { onOpenGallery?.(); setPickerOpen(false); }}
          onDismiss={() => {
            setPickerOpen(false);
            setPickerAnchorRect(null);
          }}
        />
      )}
    </div>
  );
}

// ── Types ──────────────────────────────────────────────────────────

type ComposeDocumentViewV6Props = {
  tree: DesignNode;
  /** Component masters for resolving instance nodes (Track 3). */
  components?: ComponentMaster[];
  selectedNodeId?: string | null;
  /** All selected node IDs (multi-select). Primary = selectedNodeId, rest = secondary. */
  selectedNodeIds?: string[];
  onSelectNode?: (nodeId: string | null) => void;
  /** Toggle a node in/out of multi-selection (Shift+Click). */
  onToggleNodeSelection?: (nodeId: string) => void;
  /** Set the full multi-select set (rubber-band marquee). First ID = primary. */
  onSetSelectedNodes?: (nodeIds: string[]) => void;
  onUpdateContent?: (nodeId: string, key: string, value: string) => void;
  onUpdateNodeStyle?: (nodeId: string, style: Partial<DesignNodeStyle>) => void;
  onPushHistory?: (description: string) => void;
  /**
   * Escape on unchanged placeholder text — remove the text layer (canvas) or delete the node (artboard).
   */
  onDiscardTextEdit?: (nodeId: string) => void;
  interactive?: boolean;
  /** Artboard ID — needed for drag-to-reposition dispatch */
  itemId?: string | null;
  /** Current canvas zoom — needed for zoom-aware drag */
  zoom?: number;
  /** Right-click context menu handler for DesignNodes */
  onContextMenu?: (node: DesignNode, event: React.MouseEvent) => void;
  /** Insert under `parentNodeId` when set (frame/group); else legacy root children. */
  onInsertSection?: (index: number, section: DesignNode, parentNodeId?: string | null) => void;
  /** Matches EditorTransportBar: select | hand | prompt | frame | text */
  canvasTool?: string;
  /**
   * When true, `resolveTree` memo depends on full `components` so live master edits re-resolve.
   * When false, memo uses `computeComponentsResolveEpoch` (id:version:presetKeys) to avoid churn
   * from new array identity (Track 9 Phase E).
   */
  masterEditDirty?: boolean;
  /** Opens the full component library (e.g. from insertion bar “Browse all”). */
  onOpenGallery?: () => void;
};

/** Legacy ADD_TEXT placeholder — Esc still discards if unchanged from this string. */
const LEGACY_TEXT_PLACEHOLDER = "Type something";

function textEditableSurfaceStyle(node: DesignNode, isEditing: boolean): React.CSSProperties {
  const fontSizePx = typeof node.style.fontSize === "number" ? node.style.fontSize : 16;
  const lh = node.style.lineHeight;
  const lineHeightMult =
    typeof lh === "number" && lh > 0 && lh < 8 ? lh : 1.4;
  return {
    minHeight: fontSizePx * lineHeightMult,
    minWidth: "0.6ch",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    outline: "none",
    ...(isEditing ? { caretColor: CANVAS_SEL_CARET } : {}),
  };
}

type InlineTextEditEventDetail = {
  itemId: string;
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

type SelectionLevel = "primary" | "secondary" | "none";

function selectionOutlineStyle(
  level: SelectionLevel,
  isLiveHit?: boolean,
  /** Softer outline + outward offset so type selection is less tight on glyphs */
  variant?: "default" | "text",
): React.CSSProperties {
  const text = variant === "text";
  if (level === "primary") {
    return text
      ? { outline: `1px solid ${CANVAS_SEL_TEXT_PRIMARY}`, outlineOffset: 3 }
      : { outline: `1px solid ${CANVAS_SEL_PRIMARY}`, outlineOffset: -1 };
  }
  if (level === "secondary") {
    return text
      ? { outline: `1px solid ${CANVAS_SEL_TEXT_SECONDARY}`, outlineOffset: 3 }
      : { outline: `1px solid ${CANVAS_SEL_SECONDARY}`, outlineOffset: -1 };
  }
  if (isLiveHit) {
    return text
      ? { outline: `1px solid ${CANVAS_SEL_TEXT_LIVE}`, outlineOffset: 3 }
      : { outline: `1px solid ${CANVAS_SEL_LIVE}`, outlineOffset: -1 };
  }
  return {};
}

/** Determine selection level for a node given primary ID and full multi-select array. */
function getSelectionLevel(
  nodeId: string,
  selectedNodeId: string | null,
  selectedNodeIds: string[],
): SelectionLevel {
  if (nodeId === selectedNodeId) return "primary";
  if (selectedNodeIds.includes(nodeId)) return "secondary";
  return "none";
}

/** One consistent title-style label (avoids "FRAME" vs "Frame" from name vs type). */
function formatDesignNodeLabel(node: DesignNode): string {
  const raw = (node.name || "").trim();
  if (raw) {
    return raw.replace(/\S+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  }
  const t = node.type;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// ── Text Content Renderer ──────────────────────────────────────────

function TextContent({ node, isEditing, isSelected = false, dragProtected = false, onStartEdit, onCommitEdit, onDiscardEdit }: {
  node: DesignNode;
  isEditing: boolean;
  isSelected?: boolean;
  dragProtected?: boolean;
  onStartEdit: () => void;
  onCommitEdit: (newText: string) => void;
  /** When Esc or blur with no typed text — parent removes the layer/node. */
  onDiscardEdit?: () => void;
}) {
  const textRef = React.useRef<HTMLDivElement>(null);
  const originalTextRef = React.useRef<string>("");
  const discardedRef = React.useRef(false);
  const content = node.content;
  const [isHovered, setIsHovered] = React.useState(false);
  const clickCountRef = React.useRef(0);
  const clickTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Enter edit mode
  React.useEffect(() => {
    if (!isEditing || !textRef.current) return;
    const el = textRef.current;
    discardedRef.current = false;
    originalTextRef.current = el.textContent || "";
    el.contentEditable = "true";
    el.setAttribute("data-v6-text-editing", "true");
    el.style.caretColor = CANVAS_SEL_CARET;
    el.style.outline = "none";
    el.focus();

    // Place cursor at end
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(el);
    range.collapse(false);
    sel?.removeAllRanges();
    sel?.addRange(range);

    const commit = () => {
      if (discardedRef.current) return;
      const newText = el.textContent || "";
      el.contentEditable = "false";
      el.removeAttribute("data-v6-text-editing");
      onCommitEdit(newText);
    };

    const shouldDiscardEmptyNewText = () => {
      const origTrim = (originalTextRef.current || "").trim();
      const newTrim = (el.textContent || "").trim();
      const startedEmpty =
        origTrim === "" || origTrim === LEGACY_TEXT_PLACEHOLDER;
      return Boolean(onDiscardEdit) && startedEmpty && newTrim === "";
    };

    const handleBlur = () => {
      if (discardedRef.current) return;
      if (shouldDiscardEmptyNewText() && onDiscardEdit) {
        discardedRef.current = true;
        el.contentEditable = "false";
        el.removeAttribute("data-v6-text-editing");
        el.removeEventListener("keydown", handleKeyDown);
        el.removeEventListener("blur", handleBlur);
        onDiscardEdit();
        return;
      }
      commit();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (shouldDiscardEmptyNewText() && onDiscardEdit) {
          discardedRef.current = true;
          el.contentEditable = "false";
          el.removeAttribute("data-v6-text-editing");
          el.removeEventListener("keydown", handleKeyDown);
          el.removeEventListener("blur", handleBlur);
          onDiscardEdit();
          return;
        }
        commit();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        if (shouldDiscardEmptyNewText() && onDiscardEdit) {
          discardedRef.current = true;
          el.contentEditable = "false";
          el.removeAttribute("data-v6-text-editing");
          el.removeEventListener("keydown", handleKeyDown);
          el.removeEventListener("blur", handleBlur);
          onDiscardEdit();
          return;
        }
        el.textContent = originalTextRef.current;
        commit();
      }
      // Cmd+A in edit mode selects all text (not the layer)
      if (e.key === "a" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        e.stopPropagation();
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    };

    el.addEventListener("keydown", handleKeyDown);
    el.addEventListener("blur", handleBlur);

    return () => {
      el.removeEventListener("keydown", handleKeyDown);
      el.removeEventListener("blur", handleBlur);
    };
  }, [isEditing, onCommitEdit, onDiscardEdit]);

  // Triple-click handler
  const handleClick = React.useCallback((e: React.MouseEvent) => {
    if (isEditing) return;
    
    clickCountRef.current += 1;
    
    if (clickCountRef.current === 3) {
      // Triple-click: select all text
      e.stopPropagation();
      if (textRef.current) {
        const range = document.createRange();
        range.selectNodeContents(textRef.current);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
      clickCountRef.current = 0;
    } else {
      // Single/double click: start edit mode timer
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
      clickTimeoutRef.current = setTimeout(() => {
        clickCountRef.current = 0;
      }, 500);
    }
  }, [isEditing]);

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  if (!content) return null;

  // Single text field (incl. empty string) — do not use `content.text &&` or "" skips this branch
  const hasOnlyText =
    typeof content.text === "string" && !content.kicker && !content.subtext;

  const selectionColorStyles = `
    <style>
      [data-text-edit-target="true"]::selection {
        background: #D1E4FC;
      }
      [data-text-edit-target="true"]::-moz-selection {
        background: #D1E4FC;
      }
    </style>
  `;

  const tooltipText = isSelected ? "Click to edit" : "Double-click to edit";

  if (hasOnlyText) {
    return (
      <div
        style={{ position: "relative" }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          dangerouslySetInnerHTML={{ __html: selectionColorStyles }}
        />
        {/* Hover tooltip */}
        {isHovered && !isEditing && (
          <div
            style={{
              position: "absolute",
              top: -18,
              left: 0,
              zIndex: 10001,
              pointerEvents: "none",
            }}
          >
            <span style={{
              fontSize: 9,
              fontFamily: "'IBM Plex Mono', monospace",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "#A0A0A0",
              background: "rgba(255,255,255,0.9)",
              padding: "1px 4px",
              borderRadius: 2,
              whiteSpace: "nowrap",
            }}>
              {tooltipText}
            </span>
          </div>
        )}
        <div
          ref={textRef}
          data-text-edit-target="true"
          style={textEditableSurfaceStyle(node, isEditing)}
          onPointerDownCapture={
            dragProtected
              ? (e) => {
                  e.stopPropagation();
                }
              : undefined
          }
          onClick={handleClick}
          onDoubleClick={(e) => {
            e.stopPropagation();
            // Already editing — let native double-click-to-select-word work
            if (isEditing) return;
            onStartEdit();
          }}
          suppressContentEditableWarning
        >
          {content.text}
        </div>
      </div>
    );
  }

  // Multi-field text content (kicker + text + subtext)
  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div dangerouslySetInnerHTML={{ __html: selectionColorStyles }} />
      {/* Hover tooltip */}
      {isHovered && !isEditing && (
        <div
          style={{
            position: "absolute",
            top: -18,
            left: 0,
            zIndex: 10001,
            pointerEvents: "none",
          }}
        >
          <span style={{
            fontSize: 9,
            fontFamily: "'IBM Plex Mono', monospace",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "#A0A0A0",
            background: "rgba(255,255,255,0.9)",
            padding: "1px 4px",
            borderRadius: 2,
            whiteSpace: "nowrap",
          }}>
            {tooltipText}
          </span>
        </div>
      )}
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
      {typeof content.text === "string" && (
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
          onClick={handleClick}
          onDoubleClick={(e) => {
            e.stopPropagation();
            // Already editing — let native double-click-to-select-word work
            if (isEditing) return;
            onStartEdit();
          }}
          suppressContentEditableWarning
          style={{ display: "block", ...textEditableSurfaceStyle(node, isEditing) }}
        >
          {content.text}
        </div>
      )}
      {content.subtext && (
        <span style={{ display: "block", marginTop: 8, fontSize: "0.85em", opacity: 0.7 }}>
          {content.subtext}
        </span>
      )}
    </div>
  );
}

// ── Breakout Badge ────────────────────────────────────────────────

function BreakoutBadge() {
  return (
    <div
      style={{
        position: "absolute",
        top: -18,
        right: 0,
        zIndex: 9999,
        fontSize: 9,
        fontFamily: "'IBM Plex Mono', monospace",
        textTransform: "uppercase" as const,
        letterSpacing: "0.05em",
        color: "#A0A0A0",
        background: "#F5F5F0",
        border: "1px solid #E5E5E0",
        padding: "1px 4px",
        borderRadius: 2,
        pointerEvents: "none" as const,
        whiteSpace: "nowrap" as const,
      }}
    >
      Breakout
    </div>
  );
}

// ── Empty Frame Indicator ─────────────────────────────────────────

function EmptyFrameLabel({ style }: { style: DesignNodeStyle }) {
  const w = typeof style.width === "number" ? style.width : 0;
  const h = typeof style.height === "number" ? style.height : 0;
  if (w < 100 || h < 60) return null;
  return (
    <span
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        fontSize: 10,
        color: "#A0A0A0",
        fontStyle: "italic",
        pointerEvents: "none",
        whiteSpace: "nowrap",
      }}
    >
      Empty
    </span>
  );
}

// ── Main Render Function ───────────────────────────────────────────

function RenderDesignNode({ node, selectedNodeId, selectedNodeIds, editingNodeId, interactive, onSelect, onToggleSelect, onStartEdit, onCommitEdit, onDiscardTextEdit, onContextMenu, rootNodeId, onInsertSection, onOpenGallery, liveHits }: {
  node: DesignNode;
  selectedNodeId: string | null;
  /** All selected node IDs for multi-select outline rendering. */
  selectedNodeIds: string[];
  editingNodeId: string | null;
  interactive: boolean;
  onSelect: (nodeId: string) => void;
  /** Shift+Click toggle handler for multi-select. */
  onToggleSelect?: (nodeId: string) => void;
  onStartEdit: (nodeId: string) => void;
  onCommitEdit: (nodeId: string, newText: string) => void;
  onDiscardTextEdit?: (nodeId: string) => void;
  onContextMenu?: (node: DesignNode, event: React.MouseEvent) => void;
  /** ID of the root node — used to detect root frame for insertion bars */
  rootNodeId?: string;
  /** Insert callback — only used at root frame level */
  onInsertSection?: (index: number, section: DesignNode, parentNodeId?: string | null) => void;
  onOpenGallery?: () => void;
  /** Node IDs currently intersecting the rubber-band marquee. */
  liveHits?: Set<string>;
}): React.ReactElement | null {
  const [isHovered, setIsHovered] = React.useState(false);
  const cssStyle = designStyleToCSS(node.style);
  const selLevel = interactive ? getSelectionLevel(node.id, selectedNodeId, selectedNodeIds) : "none";
  const isSelected = selLevel !== "none";
  const isLiveHit = interactive && !isSelected && liveHits?.has(node.id);
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
            selectedNodeIds={selectedNodeIds}
            editingNodeId={editingNodeId}
            interactive={interactive}
            onSelect={onSelect}
            onToggleSelect={onToggleSelect}
            onStartEdit={onStartEdit}
            onCommitEdit={onCommitEdit}
            onDiscardTextEdit={onDiscardTextEdit}
            onContextMenu={onContextMenu}
            onOpenGallery={onOpenGallery}
            liveHits={liveHits}
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
        ...selectionOutlineStyle(selLevel, isLiveHit),
      };

      // Breakout badge needs a positioning context
      if (showBreakoutBadge && !hasCover && frameStyle.position !== "absolute") {
        frameStyle.position = "relative";
      }

      // Check if this is the root frame — interleave insertion bars
      const isRootFrame = rootNodeId != null && node.id === rootNodeId;
      const showInsertionBars = isRootFrame && interactive && onInsertSection;

      const renderedChildren = showInsertionBars
        ? (() => {
            const children = node.children ?? [];
            const elements: React.ReactNode[] = [];
            children.forEach((child, index) => {
              const wrapper = hasCover ? { position: "relative" as const, zIndex: 1 } : {};
              elements.push(
                <V6InsertionBar
                  key={`insert-${index}`}
                  onInsert={(sect) => onInsertSection(index, sect, node.id)}
                  onOpenGallery={onOpenGallery}
                />
              );
              elements.push(
                <div key={child.id} style={wrapper}>
                  <RenderDesignNode
                    node={child}
                    selectedNodeId={selectedNodeId}
                    selectedNodeIds={selectedNodeIds}
                    editingNodeId={editingNodeId}
                    interactive={interactive}
                    onSelect={onSelect}
                    onToggleSelect={onToggleSelect}
                    onStartEdit={onStartEdit}
                    onCommitEdit={onCommitEdit}
                    onDiscardTextEdit={onDiscardTextEdit}
                    onContextMenu={onContextMenu}
                    onOpenGallery={onOpenGallery}
                    liveHits={liveHits}
                  />
                </div>
              );
            });
            elements.push(
              <V6InsertionBar
                key="insert-end"
                onInsert={(sect) => onInsertSection(children.length, sect, node.id)}
                onOpenGallery={onOpenGallery}
              />
            );
            return elements;
          })()
        : renderChildren(hasCover);

      return (
        <div
          key={node.id}
          data-node-id={node.id}
          data-node-type={node.type}
          style={frameStyle}
          onClick={interactive ? (e) => {
            e.stopPropagation();
            if (e.shiftKey && onToggleSelect) { onToggleSelect(node.id); return; }
            onSelect(node.id);
          } : undefined}
          onContextMenu={interactive && onContextMenu ? (e) => { e.preventDefault(); e.stopPropagation(); onContextMenu(node, e); } : undefined}
          {...hoverHandlers}
        >
          {showBreakoutBadge && <BreakoutBadge />}
          {hasCover && <CoverImage src={node.style.coverImage!} size={node.style.coverSize} position={node.style.coverPosition} />}
          {needsScrim && <CoverScrim />}
          {renderedChildren}
          {(!node.children || node.children.length === 0) && (
            <EmptyFrameLabel style={node.style} />
          )}
        </div>
      );
    }

    case "text": {
      const textStyle: React.CSSProperties = {
        ...cssStyle,
        boxSizing: "border-box",
        ...(isEditing ? {} : selectionOutlineStyle(selLevel, isLiveHit, "text")),
      };

      if (showBreakoutBadge && textStyle.position !== "absolute") {
        textStyle.position = "relative";
      }

      return (
        <div
          key={node.id}
          data-node-id={node.id}
          data-node-type={node.type}
          style={textStyle}
          onClick={interactive ? (e) => {
            e.stopPropagation();
            // Don't re-select (which exits edit mode) if clicking inside active contentEditable
            if (isEditing) return;
            if (e.shiftKey && onToggleSelect) { onToggleSelect(node.id); return; }
            // One click → edit with caret only (outline hidden while isEditing); selection syncs in handleStartEdit
            onStartEdit(node.id);
          } : undefined}
          onContextMenu={interactive && onContextMenu ? (e) => { e.preventDefault(); e.stopPropagation(); onContextMenu(node, e); } : undefined}
          {...hoverHandlers}
        >
          {showBreakoutBadge && <BreakoutBadge />}
          <TextContent
            node={node}
            isEditing={isEditing}
            isSelected={isSelected}
            dragProtected={interactive && isSelected && isAbsolute}
            onStartEdit={() => onStartEdit(node.id)}
            onCommitEdit={(newText) => onCommitEdit(node.id, newText)}
            onDiscardEdit={
              onDiscardTextEdit ? () => onDiscardTextEdit(node.id) : undefined
            }
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
        ...selectionOutlineStyle(selLevel, isLiveHit),
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
          data-node-type={node.type}
          style={wrapperStyle}
          onClick={interactive ? (e) => {
            e.stopPropagation();
            if (e.shiftKey && onToggleSelect) { onToggleSelect(node.id); return; }
            onSelect(node.id);
          } : undefined}
          onContextMenu={interactive && onContextMenu ? (e) => { e.preventDefault(); e.stopPropagation(); onContextMenu(node, e); } : undefined}
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
        ...selectionOutlineStyle(selLevel, isLiveHit),
      };

      if (showBreakoutBadge && btnStyle.position !== "absolute") {
        btnStyle.position = "relative";
      }

      return (
        <button
          key={node.id}
          data-node-id={node.id}
          data-node-type={node.type}
          style={btnStyle}
          onClick={interactive ? (e) => {
            e.preventDefault(); e.stopPropagation();
            if (e.shiftKey && onToggleSelect) { onToggleSelect(node.id); return; }
            onSelect(node.id);
          } : undefined}
          onContextMenu={interactive && onContextMenu ? (e) => { e.preventDefault(); e.stopPropagation(); onContextMenu(node, e); } : undefined}
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
        ...selectionOutlineStyle(selLevel, isLiveHit),
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
          data-node-type={node.type}
          style={wrapperStyle}
          onClick={interactive ? (e) => {
            e.stopPropagation();
            if (e.shiftKey && onToggleSelect) { onToggleSelect(node.id); return; }
            onSelect(node.id);
          } : undefined}
          onContextMenu={interactive && onContextMenu ? (e) => { e.preventDefault(); e.stopPropagation(); onContextMenu(node, e); } : undefined}
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
  onResizeStart,
  onResizeDone,
  onSizingModeChanged,
}: {
  selectedNodeId: string | null;
  editingNodeId: string | null;
  tree: DesignNode;
  containerRef: React.RefObject<HTMLDivElement | null>;
  zoom: number;
  onUpdateNodeStyle?: (nodeId: string, style: Partial<DesignNodeStyle>) => void;
  onPushHistory?: (description: string) => void;
  onResizeStart?: () => void;
  onResizeDone?: () => void;
  onSizingModeChanged?: (axes: "width" | "height" | "both") => void;
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

  // Text: selection outline only (no resize handles — size via inspector / hug/fill)
  if (selectedNode.type === "text") return null;

  // Apply the node's rotation to the resize overlay so handles match the element
  const rotation = selectedNode.style.transform?.rotate ?? 0;
  const originX = selectedNode.style.transformOrigin?.x ?? 50;
  const originY = selectedNode.style.transformOrigin?.y ?? 50;

  return (
    <div
      style={{
        position: "absolute",
        top: nodeRect.top,
        left: nodeRect.left,
        width: nodeRect.width,
        height: nodeRect.height,
        pointerEvents: "none",
        zIndex: 30,
        ...(rotation !== 0 ? {
          transform: `rotate(${rotation}deg)`,
          transformOrigin: `${originX}% ${originY}%`,
        } : {}),
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
          onResizeStart={onResizeStart}
          onResizeDone={onResizeDone}
          onSizingModeChanged={onSizingModeChanged}
        />
      </div>
    </div>
  );
}

// ── Public Component ───────────────────────────────────────────────

export function ComposeDocumentViewV6({
  tree,
  components = [],
  selectedNodeId = null,
  selectedNodeIds = [],
  onSelectNode,
  onToggleNodeSelection,
  onSetSelectedNodes,
  onUpdateContent,
  onUpdateNodeStyle,
  onPushHistory,
  onDiscardTextEdit,
  interactive = false,
  itemId = null,
  zoom = 1,
  onContextMenu,
  onInsertSection,
  canvasTool = "select",
  masterEditDirty = false,
  onOpenGallery,
}: ComposeDocumentViewV6Props) {
  const [editingNodeId, setEditingNodeId] = React.useState<string | null>(null);
  const historyPushedRef = React.useRef(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // ── Resize state lifted from DesignNodeResizeHandles ──────────────
  const [isResizing, setIsResizing] = React.useState(false);

  // ── Sizing mode toast state ────────────────────────────────────────
  const [sizingToast, setSizingToast] = React.useState<"width" | "height" | "both" | null>(null);
  const handleSizingModeChanged = React.useCallback((axes: "width" | "height" | "both") => {
    setSizingToast(axes);
  }, []);
  const handleToastDismiss = React.useCallback(() => {
    setSizingToast(null);
  }, []);

  // ── Shared interaction suppression flag ────────────────────────────
  // True when ANY interaction is active: drag, resize, pan, text edit.
  // The hover handler reads this to suppress outlines during interactions.
  const isInteractingRef = React.useRef(false);

  // ── Local space-held tracking (for hover suppression) ─────────────
  const spaceHeldRef = React.useRef(false);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;
        spaceHeldRef.current = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spaceHeldRef.current = false;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // ── Hover outline (direct DOM, zero re-renders) ────────────────────
  const hoverElRef = React.useRef<HTMLElement | null>(null);

  // ── Hover label (direct DOM mutation, same pattern as hover outline) ──
  const hoverLabelRef = React.useRef<HTMLDivElement | null>(null);

  // ── Measurement guides (direct DOM mutation — up to 4 line+pill pairs) ──
  const measureGuidesRef = React.useRef<{
    lines: HTMLDivElement[];
    pills: HTMLDivElement[];
  } | null>(null);

  React.useEffect(() => {
    if (!containerRef.current) return;
    const lines: HTMLDivElement[] = [];
    const pills: HTMLDivElement[] = [];

    for (let i = 0; i < 4; i++) {
      const line = document.createElement("div");
      line.style.cssText = `
        position: absolute; background: rgba(255, 105, 180, 0.7);
        pointer-events: none; z-index: 10000; display: none;
      `;
      containerRef.current.appendChild(line);
      lines.push(line);

      const pill = document.createElement("div");
      pill.style.cssText = `
        position: absolute; z-index: 10001; pointer-events: none; display: none;
        transform: translate(-50%, -50%);
      `;
      pill.innerHTML = `<span style="
        font-size: 9px; font-family: 'IBM Plex Mono', monospace;
        color: white; background: #FF69B4;
        padding: 0 4px; border-radius: 2px; white-space: nowrap;
      ">0</span>`;
      containerRef.current.appendChild(pill);
      pills.push(pill);
    }

    measureGuidesRef.current = { lines, pills };
    return () => {
      lines.forEach(l => l.remove());
      pills.forEach(p => p.remove());
    };
  }, []);

  function hideMeasureGuides() {
    if (!measureGuidesRef.current) return;
    for (const line of measureGuidesRef.current.lines) line.style.display = "none";
    for (const pill of measureGuidesRef.current.pills) pill.style.display = "none";
  }

  React.useEffect(() => {
    if (!containerRef.current) return;
    const label = document.createElement("div");
    label.style.cssText = `
      position: absolute; z-index: 10001; pointer-events: none;
      opacity: 0; transition: opacity 100ms ease;
    `;
    label.innerHTML = `<span style="
      font-size: 10px; font-family: system-ui, -apple-system, sans-serif;
      font-weight: 500;
      color: ${CANVAS_SEL_LABEL};
      background: transparent;
      padding: 0;
      white-space: nowrap;
    "></span>`;
    containerRef.current.appendChild(label);
    hoverLabelRef.current = label;
    return () => { label.remove(); };
  }, []);

  const clearHoverOutline = React.useCallback(() => {
    const el = hoverElRef.current;
    if (el) {
      // Only clear the outline if React hasn't taken ownership (i.e. it's not a selected node)
      const nodeId = el.getAttribute("data-node-id");
      if (nodeId !== selectedNodeId && !(nodeId && selectedNodeIds.includes(nodeId))) {
        el.style.outline = "";
        el.style.outlineOffset = "";
        el.style.cursor = "";
      }
    }
    hoverElRef.current = null;
    if (hoverLabelRef.current) {
      hoverLabelRef.current.style.opacity = "0";
    }
    hideMeasureGuides();
  }, [selectedNodeId, selectedNodeIds]);

  const handleHoverMove = React.useCallback(
    (e: React.MouseEvent) => {
      if (!interactive) return;

      // ── Suppress hover during any active interaction ──────────────
      if (isInteractingRef.current || spaceHeldRef.current) {
        if (hoverElRef.current) {
          hoverElRef.current.style.outline = "";
          hoverElRef.current.style.outlineOffset = "";
          hoverElRef.current.style.cursor = "";
          hoverElRef.current = null;
        }
        if (hoverLabelRef.current) {
          hoverLabelRef.current.style.opacity = "0";
        }
        hideMeasureGuides();
        return;
      }

      const target = (e.target as HTMLElement).closest<HTMLElement>("[data-node-id]");
      if (!target) {
        clearHoverOutline();
        return;
      }
      const nodeId = target.getAttribute("data-node-id");
      // Selected nodes must never keep the hover chip (must run before stale same-target return)
      if (nodeId && (nodeId === selectedNodeId || selectedNodeIds.includes(nodeId))) {
        clearHoverOutline();
        return;
      }
      // Same unselected element — nothing to do
      if (target === hoverElRef.current) return;
      // Swap outline
      clearHoverOutline();
      target.style.outline = "1px solid rgba(59, 130, 246, 0.35)";
      target.style.outlineOffset = "-1px";
      // ── Cursor: pointer for unselected hovered nodes ──────────────
      target.style.cursor = "pointer";
      hoverElRef.current = target;

      // ── Hover label: position and show (same formatter as selection label) ──
      if (hoverLabelRef.current && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const nodeRect = target.getBoundingClientRect();
        const hoveredDesign = nodeId ? findDesignNodeById(tree, nodeId) : null;
        const displayType = hoveredDesign
          ? formatDesignNodeLabel(hoveredDesign)
          : (() => {
              const nodeType = target.getAttribute("data-node-type") || "frame";
              return nodeType.charAt(0).toUpperCase() + nodeType.slice(1);
            })();

        hoverLabelRef.current.style.top = `${(nodeRect.top - containerRect.top) / zoom - 18}px`;
        hoverLabelRef.current.style.left = `${(nodeRect.left - containerRect.left) / zoom}px`;
        hoverLabelRef.current.querySelector("span")!.textContent = displayType;
        hoverLabelRef.current.style.opacity = "1";
      }

      // ── Measurement guides: show spacing to nearest siblings ────────
      const hoveredNodeId = target.getAttribute("data-node-id");
      if (hoveredNodeId && hoveredNodeId !== selectedNodeId && !selectedNodeIds.includes(hoveredNodeId) && measureGuidesRef.current) {
        const parent = findDesignNodeParent(tree, hoveredNodeId);
        if (parent && containerRef.current) {
          const cr = containerRef.current.getBoundingClientRect();
          const hr = target.getBoundingClientRect();

          // Hovered node rect in container-relative coords
          const H = {
            top: (hr.top - cr.top) / zoom,
            left: (hr.left - cr.left) / zoom,
            right: (hr.right - cr.left) / zoom,
            bottom: (hr.bottom - cr.top) / zoom,
          };

          const MAX_GAP = 500;
          let guideIndex = 0;

          // Check each sibling — find closest per direction
          type SiblingGap = { direction: "top" | "bottom" | "left" | "right"; gap: number; sRect: typeof H };
          const closestPerDir: Record<string, SiblingGap> = {};

          for (const sibling of parent.children ?? []) {
            if (sibling.id === hoveredNodeId) continue;
            const sibEl = containerRef.current.querySelector<HTMLElement>(
              `[data-node-id="${sibling.id}"]`
            );
            if (!sibEl) continue;
            const sr = sibEl.getBoundingClientRect();
            const S = {
              top: (sr.top - cr.top) / zoom,
              left: (sr.left - cr.left) / zoom,
              right: (sr.right - cr.left) / zoom,
              bottom: (sr.bottom - cr.top) / zoom,
            };

            // Horizontal overlap check
            const hOverlap = S.right > H.left && S.left < H.right;
            // Vertical overlap check
            const vOverlap = S.bottom > H.top && S.top < H.bottom;

            // Above
            if (hOverlap && S.bottom <= H.top) {
              const gap = H.top - S.bottom;
              if (gap > 0 && gap < MAX_GAP && (!closestPerDir.top || gap < closestPerDir.top.gap)) {
                closestPerDir.top = { direction: "top", gap, sRect: S };
              }
            }
            // Below
            if (hOverlap && S.top >= H.bottom) {
              const gap = S.top - H.bottom;
              if (gap > 0 && gap < MAX_GAP && (!closestPerDir.bottom || gap < closestPerDir.bottom.gap)) {
                closestPerDir.bottom = { direction: "bottom", gap, sRect: S };
              }
            }
            // Left
            if (vOverlap && S.right <= H.left) {
              const gap = H.left - S.right;
              if (gap > 0 && gap < MAX_GAP && (!closestPerDir.left || gap < closestPerDir.left.gap)) {
                closestPerDir.left = { direction: "left", gap, sRect: S };
              }
            }
            // Right
            if (vOverlap && S.left >= H.right) {
              const gap = S.left - H.right;
              if (gap > 0 && gap < MAX_GAP && (!closestPerDir.right || gap < closestPerDir.right.gap)) {
                closestPerDir.right = { direction: "right", gap, sRect: S };
              }
            }
          }

          // Position the guide elements
          const { lines, pills } = measureGuidesRef.current;

          for (const [dir, info] of Object.entries(closestPerDir)) {
            if (guideIndex >= 4) break;
            const line = lines[guideIndex];
            const pill = pills[guideIndex];
            const dist = Math.round(info.gap);

            if (dir === "top" || dir === "bottom") {
              // Vertical line between nodes
              const x = (H.left + H.right) / 2;
              const y1 = dir === "top" ? info.sRect.bottom : H.bottom;
              const y2 = dir === "top" ? H.top : info.sRect.top;
              line.style.cssText = `
                position: absolute; background: rgba(255, 105, 180, 0.7);
                pointer-events: none; z-index: 10000; display: block;
                left: ${x}px; top: ${y1}px; width: 1px; height: ${y2 - y1}px;
              `;
              pill.style.cssText = `
                position: absolute; z-index: 10001; pointer-events: none; display: block;
                transform: translate(-50%, -50%);
                left: ${x}px; top: ${(y1 + y2) / 2}px;
              `;
            } else {
              // Horizontal line between nodes
              const y = (H.top + H.bottom) / 2;
              const x1 = dir === "left" ? info.sRect.right : H.right;
              const x2 = dir === "left" ? H.left : info.sRect.left;
              line.style.cssText = `
                position: absolute; background: rgba(255, 105, 180, 0.7);
                pointer-events: none; z-index: 10000; display: block;
                left: ${x1}px; top: ${y}px; width: ${x2 - x1}px; height: 1px;
              `;
              pill.style.cssText = `
                position: absolute; z-index: 10001; pointer-events: none; display: block;
                transform: translate(-50%, -50%);
                left: ${(x1 + x2) / 2}px; top: ${y}px;
              `;
            }

            pill.querySelector("span")!.textContent = String(dist);
            guideIndex++;
          }

          // Hide unused guides
          for (let i = guideIndex; i < 4; i++) {
            lines[i].style.display = "none";
            pills[i].style.display = "none";
          }
        } else {
          hideMeasureGuides();
        }
      } else {
        hideMeasureGuides();
      }
    },
    [interactive, selectedNodeId, selectedNodeIds, clearHoverOutline, zoom, tree]
  );

  const handleHoverLeave = React.useCallback(() => {
    clearHoverOutline();
    hideMeasureGuides();
  }, [clearHoverOutline]);

  // Clear hover outline when selection changes (it now gets the solid outline)
  React.useEffect(() => {
    if (hoverElRef.current) {
      const hoveredId = hoverElRef.current.getAttribute("data-node-id");
      if (hoveredId === selectedNodeId || (hoveredId && selectedNodeIds.includes(hoveredId))) {
        clearHoverOutline();
      }
    }
  }, [selectedNodeId, selectedNodeIds, clearHoverOutline]);

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
    selectedNodeIds,
    itemId,
    zoom,
    interactive,
    canvasTool,
    containerRef,
    snapPosition: snapGuidesHook.snapPosition,
  });

  // Sync drag state from the drag hook into the snap hook's input
  React.useEffect(() => {
    setDragState({ isDragging, draggedNodeId: draggedNodeId ?? null });
  }, [isDragging, draggedNodeId]);

  const componentsEpoch = computeComponentsResolveEpoch(components);
  const resolvedTree = React.useMemo(
    () => resolveTree(tree, components),
    masterEditDirty ? [tree, components] : [tree, componentsEpoch]
  );

  // ── Rubber-band (marquee) selection ───────────────────────────────
  const rubberBandHandleSetNodes = React.useCallback(
    (nodeIds: string[]) => {
      if (nodeIds.length === 0) return;
      if (nodeIds.length === 1) {
        // Single node — equivalent to single-select
        onSelectNode?.(nodeIds[0]);
        return;
      }
      // Multi-select — use batch setter if available, fall back to single-select on primary
      if (onSetSelectedNodes) {
        onSetSelectedNodes(nodeIds);
      } else {
        onSelectNode?.(nodeIds[0]);
      }
    },
    [onSelectNode, onSetSelectedNodes],
  );

  const rubberBandHandleDeselectAll = React.useCallback(() => {
    onSelectNode?.(null);
  }, [onSelectNode]);

  const rubberBandEnabled = canvasTool === "select";

  const handleFrameCommit = React.useCallback(
    (payload: FrameDrawCommitPayload) => {
      if (!onInsertSection) return;
      const target = resolveInsertTargetForRawTree(
        tree,
        resolvedTree,
        payload.startClientX,
        payload.startClientY,
        containerRef.current
      );
      // #region agent log
      fetch("http://127.0.0.1:7393/ingest/391248b0-24d6-418e-a9f6-e5cbe0f87918", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "f3006b" },
        body: JSON.stringify({
          sessionId: "f3006b",
          id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          hypothesisId: "H2-frame-insert-target",
          runId: "initial-pass",
          location: "ComposeDocumentViewV6:handleFrameCommit",
          message: target ? "frame commit resolved insert target" : "frame commit missing insert target",
          data: {
            ok: Boolean(target),
            parentId: target?.parentId ?? null,
            offsetNodeId: target?.offsetElement.getAttribute("data-node-id") ?? null,
            payload,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      if (!target) return;
      const parentNode = findDesignNodeById(tree, target.parentId);
      if (!parentNode) return;
      const index = parentNode.children?.length ?? 0;

      const cr = containerRef.current?.getBoundingClientRect();
      if (!cr) return;
      const pr = target.offsetElement.getBoundingClientRect();
      const ox = (pr.left - cr.left) / zoom;
      const oy = (pr.top - cr.top) / zoom;

      const id = `frame-${Date.now()}-${++_insertCounter}`;
      const section: DesignNode = {
        id,
        type: "frame",
        name: "Frame",
        style: {
          position: "absolute",
          x: Math.round(payload.x - ox),
          y: Math.round(payload.y - oy),
          width: Math.max(24, Math.round(payload.width)),
          height: Math.max(24, Math.round(payload.height)),
          display: "flex",
          flexDirection: "column",
          padding: { top: 12, right: 12, bottom: 12, left: 12 },
        },
        children: [],
      };
      onInsertSection(index, section, target.parentId);
    },
    [onInsertSection, tree, resolvedTree, zoom]
  );

  const handleTextCommit = React.useCallback(
    (payload: TextPlaceCommitPayload) => {
      if (!onInsertSection) return;
      const target = resolveInsertTargetForRawTree(
        tree,
        resolvedTree,
        payload.startClientX,
        payload.startClientY,
        containerRef.current
      );
      // #region agent log
      fetch("http://127.0.0.1:7393/ingest/391248b0-24d6-418e-a9f6-e5cbe0f87918", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "f3006b" },
        body: JSON.stringify({
          sessionId: "f3006b",
          id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          hypothesisId: "H2-text-insert-target",
          runId: "initial-pass",
          location: "ComposeDocumentViewV6:handleTextCommit",
          message: target ? "text commit resolved insert target" : "text commit missing insert target",
          data: {
            ok: Boolean(target),
            parentId: target?.parentId ?? null,
            offsetNodeId: target?.offsetElement.getAttribute("data-node-id") ?? null,
            payload,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      if (!target) return;
      const parentNode = findDesignNodeById(tree, target.parentId);
      if (!parentNode) return;
      const index = parentNode.children?.length ?? 0;

      const cr = containerRef.current?.getBoundingClientRect();
      if (!cr) return;
      const pr = target.offsetElement.getBoundingClientRect();
      const ox = (pr.left - cr.left) / zoom;
      const oy = (pr.top - cr.top) / zoom;

      const id = `text-${Date.now()}-${++_insertCounter}`;
      const w = Math.max(24, Math.round(payload.width));
      const h =
        payload.mode === "click"
          ? ("hug" as const)
          : Math.max(20, Math.round(payload.height));

      const section: DesignNode = {
        id,
        type: "text",
        name: "Text",
        style: {
          position: "absolute",
          x: Math.round(payload.x - ox),
          y: Math.round(payload.y - oy),
          width: w,
          ...(payload.mode === "drag" ? { height: h } : { height: "hug" }),
          fontSize: 16,
          lineHeight: 1.4,
          foreground: "#1A1A1A",
        },
        content: { text: "" },
      };
      onInsertSection(index, section, target.parentId);
    },
    [onInsertSection, tree, resolvedTree, zoom]
  );

  const frameDraw = useFrameDraw({
    containerRef,
    zoom,
    interactive: interactive ?? false,
    canvasTool,
    spaceHeldRef,
    onCommit: handleFrameCommit,
  });

  const textPlace = useTextPlace({
    containerRef,
    zoom,
    interactive: interactive ?? false,
    canvasTool,
    spaceHeldRef,
    onCommit: handleTextCommit,
  });

  const rubberBand = useRubberBandSelection({
    containerRef,
    tree,
    zoom,
    interactive: interactive ?? false,
    enabled: rubberBandEnabled,
    spaceHeldRef,
    isInteractingRef,
    existingSelection: selectedNodeIds,
    itemId: itemId ?? null,
    onSetSelectedNodes: rubberBandHandleSetNodes,
    onDeselectAll: rubberBandHandleDeselectAll,
  });

  useCanvasReparentAltDrag({
    tree,
    itemId,
    selectedNodeIds,
    interactive: interactive ?? false,
    containerRef,
  });

  const mergedPointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      if (!interactive) return;
      if (canvasTool === "frame") {
        frameDraw.handlePointerDown(e);
        e.stopPropagation();
        const targetNodeId =
          (e.target as HTMLElement).closest("[data-node-id]")?.getAttribute("data-node-id") ?? null;
        // #region agent log
        fetch("http://127.0.0.1:7393/ingest/391248b0-24d6-418e-a9f6-e5cbe0f87918", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "f3006b" },
          body: JSON.stringify({
            sessionId: "f3006b",
            id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            hypothesisId: "H1-tool-pointer-entry",
            runId: "initial-pass",
            location: "ComposeDocumentViewV6:mergedPointerDown",
            message: "frame tool pointerdown reached compose container",
            data: { canvasTool, targetNodeId, clientX: e.clientX, clientY: e.clientY },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
        return;
      }
      if (canvasTool === "text") {
        textPlace.handlePointerDown(e);
        e.stopPropagation();
        const targetNodeId =
          (e.target as HTMLElement).closest("[data-node-id]")?.getAttribute("data-node-id") ?? null;
        // #region agent log
        fetch("http://127.0.0.1:7393/ingest/391248b0-24d6-418e-a9f6-e5cbe0f87918", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "f3006b" },
          body: JSON.stringify({
            sessionId: "f3006b",
            id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            hypothesisId: "H1-tool-pointer-entry",
            runId: "initial-pass",
            location: "ComposeDocumentViewV6:mergedPointerDown",
            message: "text tool pointerdown reached compose container",
            data: { canvasTool, targetNodeId, clientX: e.clientX, clientY: e.clientY },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
        return;
      }
      rubberBand.handlePointerDown(e);
      // Keep document pointer events off CanvasArtboard's useDrag (moves whole artboard).
      e.stopPropagation();
    },
    [interactive, canvasTool, frameDraw, textPlace, rubberBand]
  );

  const mergedPointerMove = React.useCallback(
    (e: React.PointerEvent) => {
      if (!interactive) return;
      if (canvasTool === "frame") {
        frameDraw.handlePointerMove(e);
        e.stopPropagation();
        return;
      }
      if (canvasTool === "text") {
        textPlace.handlePointerMove(e);
        e.stopPropagation();
        return;
      }
      rubberBand.handlePointerMove(e);
      e.stopPropagation();
    },
    [interactive, canvasTool, frameDraw, textPlace, rubberBand]
  );

  const mergedPointerUp = React.useCallback(
    (e: React.PointerEvent) => {
      if (!interactive) return;
      if (canvasTool === "frame") {
        frameDraw.handlePointerUp(e);
        e.stopPropagation();
        return;
      }
      if (canvasTool === "text") {
        textPlace.handlePointerUp(e);
        e.stopPropagation();
        return;
      }
      rubberBand.handlePointerUp(e);
      e.stopPropagation();
    },
    [interactive, canvasTool, frameDraw, textPlace, rubberBand]
  );

  // ── Update interaction suppression flag ────────────────────────────
  // isDragging, isResizing, editingNodeId, marquee are reactive — update ref in effect.
  // spaceHeld is read directly from ref in the hover handler (no effect needed).
  React.useEffect(() => {
    isInteractingRef.current =
      isDragging ||
      isResizing ||
      editingNodeId !== null ||
      rubberBand.marqueeRect !== null ||
      frameDraw.drawRect !== null ||
      textPlace.drawRect !== null;
  }, [isDragging, isResizing, editingNodeId, rubberBand.marqueeRect, frameDraw.drawRect, textPlace.drawRect]);

  // ── Selection label (React-rendered, only changes on selection) ──────
  const selectedNodeInfo = React.useMemo(() => {
    if (!selectedNodeId || editingNodeId) return null;
    const node = findDesignNodeById(tree, selectedNodeId);
    if (!node) return null;
    return {
      text: formatDesignNodeLabel(node),
      nodeId: selectedNodeId,
    };
  }, [selectedNodeId, editingNodeId, tree]);

  const [selLabelPos, setSelLabelPos] = React.useState<{ top: number; left: number } | null>(null);

  React.useEffect(() => {
    if (!selectedNodeInfo || !containerRef.current) { setSelLabelPos(null); return; }
    const el = containerRef.current.querySelector<HTMLElement>(
      `[data-node-id="${selectedNodeInfo.nodeId}"]`
    );
    if (!el) { setSelLabelPos(null); return; }
    const cr = containerRef.current.getBoundingClientRect();
    const nr = el.getBoundingClientRect();
    setSelLabelPos({
      top: (nr.top - cr.top) / zoom - 18,
      left: (nr.left - cr.left) / zoom,
    });
  }, [selectedNodeInfo, zoom, tree]);

  // ── Parent boundary on drill-in (React-rendered) ────────────────────
  const parentBoundaryId = React.useMemo(() => {
    if (!selectedNodeId) return null;
    const parent = findDesignNodeParent(tree, selectedNodeId);
    if (!parent || parent.id === tree.id) return null;
    return parent.id;
  }, [selectedNodeId, tree]);

  const [parentBounds, setParentBounds] = React.useState<{
    top: number; left: number; width: number; height: number;
  } | null>(null);

  React.useEffect(() => {
    if (editingNodeId) {
      setParentBounds(null);
      return;
    }
    if (!parentBoundaryId || !containerRef.current) { setParentBounds(null); return; }
    const el = containerRef.current.querySelector<HTMLElement>(
      `[data-node-id="${parentBoundaryId}"]`
    );
    if (!el) { setParentBounds(null); return; }
    const cr = containerRef.current.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    setParentBounds({
      top: (er.top - cr.top) / zoom,
      left: (er.left - cr.left) / zoom,
      width: er.width / zoom,
      height: er.height / zoom,
    });
  }, [parentBoundaryId, zoom, tree, editingNodeId]);

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

  // Apply move cursor to selected absolute node (not while typing)
  React.useEffect(() => {
    if (!containerRef.current || !selectedNodeId || !selectedNodeIsAbsolute || editingNodeId) return;
    const el = containerRef.current.querySelector<HTMLElement>(
      `[data-node-id="${selectedNodeId}"]`
    );
    if (!el) return;
    el.style.cursor = "move";
    return () => {
      el.style.cursor = "";
    };
  }, [selectedNodeId, selectedNodeIsAbsolute, editingNodeId]);

  // ── Drag opacity: dim selection outline during drag ────────────────
  React.useEffect(() => {
    if (!isDragging || !selectedNodeId || !containerRef.current || editingNodeId) return;
    const el = containerRef.current.querySelector<HTMLElement>(
      `[data-node-id="${selectedNodeId}"]`
    );
    if (!el) return;
    // Drop selection outline to 60% opacity during drag
    el.style.outline = `1px solid ${CANVAS_SEL_DRAG_DIM}`;
    el.style.outlineOffset = "-1px";
    return () => {
      // Restore full selection outline on drag end
      el.style.outline = `1px solid ${CANVAS_SEL_PRIMARY}`;
      el.style.outlineOffset = "-1px";
    };
  }, [isDragging, selectedNodeId, editingNodeId]);

  const handleSelect = React.useCallback(
    (nodeId: string) => {
      exitAnyActiveTextEditingV6();
      setEditingNodeId(null);
      onSelectNode?.(nodeId);
    },
    [onSelectNode]
  );

  const handleToggleSelect = React.useCallback(
    (nodeId: string) => {
      exitAnyActiveTextEditingV6();
      setEditingNodeId(null);
      onToggleNodeSelection?.(nodeId);
    },
    [onToggleNodeSelection]
  );

  const handleStartEdit = React.useCallback(
    (nodeId: string) => {
      if (!interactive) return;
      // Keep selection in sync without handleSelect (that clears editing state).
      if (selectedNodeId !== nodeId) {
        onSelectNode?.(nodeId);
      }
      // Push history before first edit
      if (!historyPushedRef.current) {
        onPushHistory?.("Edit text");
        historyPushedRef.current = true;
      }
      setEditingNodeId(nodeId);
    },
    [interactive, onPushHistory, selectedNodeId, onSelectNode]
  );

  const handleCommitEdit = React.useCallback(
    (nodeId: string, newText: string) => {
      setEditingNodeId(null);
      historyPushedRef.current = false;
      onUpdateContent?.(nodeId, "text", newText);
    },
    [onUpdateContent]
  );

  const handleDiscardTextEditInner = React.useCallback(
    (nodeId: string) => {
      setEditingNodeId(null);
      historyPushedRef.current = false;
      onDiscardTextEdit?.(nodeId);
    },
    [onDiscardTextEdit]
  );

  React.useEffect(() => {
    if (!editingNodeId) return;
    if (!findDesignNodeById(tree, editingNodeId)) {
      setEditingNodeId(null);
      historyPushedRef.current = false;
    }
  }, [tree, editingNodeId]);

  // Listen for keyboard-initiated Enter-to-edit and route through the
  // normal V6 edit path so history/edit state stays coherent.
  React.useEffect(() => {
    if (!interactive || !itemId) return;

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<InlineTextEditEventDetail>).detail;
      if (!detail) return;
      if (detail.itemId !== itemId || detail.nodeId !== selectedNodeId) return;
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
  }, [interactive, itemId, selectedNodeId, handleStartEdit]);

  // ── Double-click to drill into children (Framer-style) ────────────
  const handleDoubleClick = React.useCallback(
    (e: React.MouseEvent) => {
      if (!interactive || !onSelectNode) return;

      // If text is currently being edited, don't interfere — let native
      // word selection / contentEditable behavior handle it
      if (editingNodeId) return;

      // Multi-select collapse: if multiple nodes are selected, double-click
      // collapses to single-select on the clicked node instead of drilling
      if (selectedNodeIds.length > 1) {
        const target = (e.target as HTMLElement).closest<HTMLElement>("[data-node-id]");
        const clickedId = target?.getAttribute("data-node-id");
        if (clickedId) {
          e.preventDefault();
          exitAnyActiveTextEditingV6();
          setEditingNodeId(null);
          onSelectNode(clickedId);
        }
        return;
      }

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
    [interactive, onSelectNode, selectedNodeId, selectedNodeIds, editingNodeId]
  );

  // ── Track 4: Nested selection cycling (Cmd+Click) ─────────────────
  const {
    hoverTarget,
    parentChain,
    setHoverPosition,
    clearHover,
    cycleAtPosition,
    cycleSiblings,
    cycleInfo,
    resetCycle,
  } = useNestedSelection(resolvedTree, selectedNodeId);

  // Track hover position for cycle indicator
  const [hoverPosition, setHoverPositionLocal] = React.useState<{ x: number; y: number } | null>(null);

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
        onPointerDown={interactive ? mergedPointerDown : undefined}
        onPointerMove={interactive ? (e) => {
          // Track hover position for nested selection (Track 4)
          if (!isDragging && !isResizing && !editingNodeId) {
            setHoverPosition(e.clientX, e.clientY);
            setHoverPositionLocal({ x: e.clientX, y: e.clientY });
          }
          mergedPointerMove(e);
        } : undefined}
        onPointerUp={interactive ? mergedPointerUp : undefined}
        onPointerLeave={interactive ? () => {
          clearHover();
          resetCycle();
        } : undefined}
        onClick={interactive ? (e) => {
          const isCmd = e.metaKey || e.ctrlKey;
          const isShift = e.shiftKey;

          // Cmd+Click: cycle through depth levels
          if (isCmd && !isShift) {
            e.preventDefault();
            e.stopPropagation();

            const nextId = cycleAtPosition(
              e.clientX,
              e.clientY,
              selectedNodeId,
              zoom,
              0, // scrollX - artboard is at container origin
              0  // scrollY
            );

            if (nextId) {
              exitAnyActiveTextEditingV6();
              setEditingNodeId(null);
              onSelectNode?.(nextId);
            }
            return;
          }

          // Cmd+Shift+Click: cycle through siblings
          if (isCmd && isShift && selectedNodeId && hoverTarget) {
            e.preventDefault();
            e.stopPropagation();

            const parent = getParent(hoverTarget, resolvedTree);
            if (parent) {
              const siblingId = cycleSiblings(selectedNodeId, parent, "next");
              if (siblingId && siblingId !== selectedNodeId) {
                exitAnyActiveTextEditingV6();
                setEditingNodeId(null);
                onSelectNode?.(siblingId);
              }
            }
            return;
          }

          // Shift+Click for multi-select: let it bubble to node handlers
          // Regular click: also bubbles to node handlers
        } : undefined}
      >
        <RenderDesignNode
          node={resolvedTree}
          selectedNodeId={selectedNodeId}
          selectedNodeIds={selectedNodeIds}
          editingNodeId={editingNodeId}
          interactive={interactive}
          onSelect={handleSelect}
          onToggleSelect={onToggleNodeSelection ? handleToggleSelect : undefined}
          onStartEdit={handleStartEdit}
          onCommitEdit={handleCommitEdit}
          onDiscardTextEdit={handleDiscardTextEditInner}
          onContextMenu={onContextMenu}
          rootNodeId={tree.id}
          onInsertSection={onInsertSection}
          onOpenGallery={onOpenGallery}
          liveHits={rubberBand.liveHits}
        />
        {interactive && dragState.isDragging && snapGuidesHook.activeGuides.length > 0 && (
          <SnapGuideLines
            guides={snapGuidesHook.activeGuides}
            containerWidth={containerWidth || 1200}
            containerHeight={containerHeight || 2000}
          />
        )}
        {/* ── Rubber-band marquee overlay ── */}
        {interactive && rubberBand.marqueeRect && (
          <div
            style={{
              position: "absolute",
              left: rubberBand.marqueeRect.x,
              top: rubberBand.marqueeRect.y,
              width: rubberBand.marqueeRect.width,
              height: rubberBand.marqueeRect.height,
              border: `1px solid ${CANVAS_SEL_MARQUEE_BORDER}`,
              background: CANVAS_SEL_MARQUEE_FILL,
              pointerEvents: "none",
              zIndex: 9999,
            }}
          />
        )}
        {interactive && canvasTool === "frame" && frameDraw.drawRect && (
          <div
            style={{
              position: "absolute",
              left: frameDraw.drawRect.x,
              top: frameDraw.drawRect.y,
              width: frameDraw.drawRect.width,
              height: frameDraw.drawRect.height,
              border: `1px solid ${CANVAS_SEL_PRIMARY}`,
              background: CANVAS_SEL_FILL_SOFT,
              pointerEvents: "none",
              zIndex: 9998,
            }}
          />
        )}
        {interactive && canvasTool === "text" && textPlace.drawRect && (
          <div
            style={{
              position: "absolute",
              left: textPlace.drawRect.x,
              top: textPlace.drawRect.y,
              width: textPlace.drawRect.width,
              height: textPlace.drawRect.height,
              border: `1px solid ${CANVAS_SEL_PRIMARY}`,
              background: "rgba(191, 219, 254, 0.12)",
              pointerEvents: "none",
              zIndex: 9998,
            }}
          />
        )}
      </div>
      {interactive && selectedNodeId && !editingNodeId && selectedNodeIds.length <= 1 && (
        <ResizeOverlay
          selectedNodeId={selectedNodeId}
          editingNodeId={editingNodeId}
          tree={tree}
          containerRef={containerRef}
          zoom={zoom}
          onUpdateNodeStyle={onUpdateNodeStyle}
          onPushHistory={onPushHistory}
          onResizeStart={() => setIsResizing(true)}
          onResizeDone={() => setIsResizing(false)}
          onSizingModeChanged={handleSizingModeChanged}
        />
      )}
      <SizingModeToast axes={sizingToast} onDismiss={handleToastDismiss} />
      {/* ── Selection label ── */}
      {interactive && selectedNodeInfo && selLabelPos && (
        <div style={{
          position: "absolute", top: selLabelPos.top, left: selLabelPos.left,
          zIndex: 10001, pointerEvents: "none",
        }}>
          <span style={{
            fontSize: 10,
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontWeight: 500,
            color: CANVAS_SEL_LABEL,
            background: "transparent",
            padding: 0,
            whiteSpace: "nowrap",
          }}>
            {selectedNodeInfo.text}
          </span>
        </div>
      )}
      {/* ── Parent boundary on drill-in ── */}
      {interactive && parentBounds && !editingNodeId && (
        <div style={{
          position: "absolute",
          top: parentBounds.top, left: parentBounds.left,
          width: parentBounds.width, height: parentBounds.height,
          border: "1px dashed #E5E5E0",
          pointerEvents: "none", zIndex: 9998,
        }} />
      )}
      {/* ── Track 4: Nested hover preview — skip when target is already selected (no duplicate chrome) ── */}
      {interactive &&
        !editingNodeId &&
        hoverTarget &&
        hoverTarget.id !== selectedNodeId &&
        !selectedNodeIds.includes(hoverTarget.id) && (
        <NestedHoverPreview
          targetNode={hoverTarget}
          parentChain={parentChain}
          zoom={zoom}
          scrollX={0}
          scrollY={0}
          artboardX={0}
          artboardY={0}
        />
      )}
      {/* ── Track 4: Cycle indicator ── */}
      {interactive && cycleInfo && cycleInfo.totalHits > 1 && (
        <div
          style={{
            position: "fixed",
            left: hoverPosition?.x ?? 0,
            top: (hoverPosition?.y ?? 0) - 24,
            transform: "translateX(-50%)",
            zIndex: 10002,
            pointerEvents: "none",
          }}
        >
          <span style={{
            fontSize: 10,
            fontFamily: "'IBM Plex Mono', monospace",
            color: CANVAS_SEL_LABEL,
            background: "rgba(255,255,255,0.94)",
            border: "1px solid rgba(59, 130, 250, 0.35)",
            padding: "2px 6px",
            borderRadius: 4,
            whiteSpace: "nowrap",
          }}>
            {cycleInfo.currentIndex + 1} of {cycleInfo.totalHits}
          </span>
        </div>
      )}
    </div>
  );
}
