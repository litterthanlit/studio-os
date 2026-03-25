"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type {
  Breakpoint,
  PageNode,
  PageNodeStyle,
} from "@/lib/canvas/compose";
import {
  BREAKPOINT_WIDTHS,
  cloneNode,
  findNodePath,
  getNodeStyle,
  isNodeHidden,
} from "@/lib/canvas/compose";
import type { DesignSystemTokens } from "@/lib/canvas/generate-system";
import { useCanvas } from "@/lib/canvas/canvas-context";
// NodeFormatToolbar removed — text formatting now handled entirely by inspector panel
import { SectionActionRail } from "./SectionActionRail";
import { ContextMenu } from "./ContextMenu";
import { InsertionBar } from "./InsertionBar";
import {
  ENTER_TEXT_EDIT_MODE_EVENT,
  FLASH_NODE_OUTLINES_EVENT,
} from "../hooks/useCanvasKeyboard";

/**
 * Blur any active contentEditable element — forces the editing Selectable's
 * `commit()` handler to run (via blur event) before a new selection is made.
 * Exported so CanvasArtboard and UnifiedCanvasView can call it too.
 */
export function exitAnyActiveTextEditing() {
  const active = document.activeElement;
  if (
    active instanceof HTMLElement &&
    active.contentEditable === "true" &&
    active.closest("[data-node-id]")
  ) {
    active.blur();
  }
}

type ComposeDocumentViewProps = {
  pageTree: PageNode;
  tokens: DesignSystemTokens;
  breakpoint: Breakpoint;
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string | null) => void;
  onUpdateContent?: (nodeId: string, key: string, value: string) => void;
  onReorderSection?: (nodeId: string, newIndex: number) => void;
  onOpenSectionLibrary?: (insertAtIndex: number) => void;
  onFocusPromptWithPrefill?: (prefill: string) => void;
  onReplaceImage?: (nodeId: string, file: File) => void;
  className?: string;
  interactive?: boolean;
  scale?: number;
};

type SectionMetrics = {
  id: string;
  top: number;
  height: number;
};

type SectionReorderState = {
  nodeId: string;
  startIndex: number;
  currentIndex: number;
  pointerY: number;
  pointerOffsetY: number;
  sections: SectionMetrics[];
};

type RenderContext = {
  breakpoint: Breakpoint;
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string | null) => void;
  onUpdateContent?: (nodeId: string, key: string, value: string) => void;
  interactive: boolean;
  reorderableSectionIds: Set<string>;
  sectionOrder: string[];
  sectionReorderState: SectionReorderState | null;
  registerSectionElement: (nodeId: string, element: HTMLDivElement | null) => void;
  onSectionHandlePointerDown?: (
    event: React.PointerEvent<HTMLButtonElement>,
    nodeId: string
  ) => void;
  onOpenSectionLibrary?: (insertAtIndex: number) => void;
  onFocusPromptWithPrefill?: (prefill: string) => void;
};

type InlineTextEditEventDetail = {
  artboardId: string;
  nodeId: string;
};

type FlashNodeOutlinesEventDetail = {
  artboardId: string;
  nodeIds: string[];
};

type ContextMenuState = {
  nodeId: string;
  position: { x: number; y: number };
};

type ContextMenuController = {
  onOpenContextMenu?: (
    node: PageNode,
    event: React.MouseEvent<HTMLDivElement>
  ) => void;
  onDismissContextMenu?: () => void;
};

const ContextMenuControllerContext = React.createContext<ContextMenuController>({});
const CONTEXT_MENU_OPEN_EVENT = "studio-os:context-menu-open";

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function cloneNodeWithNewIds(node: PageNode): PageNode {
  const cloned = cloneNode(node);
  return {
    ...cloned,
    id: uid(node.type),
    children: cloned.children?.map(cloneNodeWithNewIds),
  };
}

function getNodePathMetadata(pageTree: PageNode, nodeId: string) {
  const path = findNodePath(pageTree, nodeId);
  if (!path) return null;

  const node = path[path.length - 1];
  const parent = path[path.length - 2] ?? null;
  const siblings = parent?.children ?? [pageTree];
  const index = siblings.findIndex((child) => child.id === nodeId);

  return {
    node,
    parent,
    siblings,
    index,
  };
}

function reorderSectionIds(
  sectionOrder: string[],
  draggedId: string,
  newIndex: number
) {
  const reordered = sectionOrder.filter((id) => id !== draggedId);
  reordered.splice(newIndex, 0, draggedId);
  return reordered;
}

function getTargetSectionIndex(
  pointerY: number,
  sections: SectionMetrics[],
  draggedId: string
) {
  const siblings = sections.filter((section) => section.id !== draggedId);
  let targetIndex = siblings.length;

  for (let index = 0; index < siblings.length; index += 1) {
    const midpoint = siblings[index].top + siblings[index].height / 2;
    if (pointerY < midpoint) {
      targetIndex = index;
      break;
    }
  }

  return targetIndex;
}

function getSectionOffsetY(
  nodeId: string,
  sectionOrder: string[],
  sectionReorderState: SectionReorderState | null
) {
  if (!sectionReorderState) return 0;

  const originalIndex = sectionReorderState.sections.findIndex(
    (section) => section.id === nodeId
  );
  if (originalIndex === -1) return 0;

  if (nodeId === sectionReorderState.nodeId) {
    return (
      sectionReorderState.pointerY -
      sectionReorderState.pointerOffsetY -
      sectionReorderState.sections[originalIndex].top
    );
  }

  const reorderedIds = reorderSectionIds(
    sectionOrder,
    sectionReorderState.nodeId,
    sectionReorderState.currentIndex
  );
  const targetIndex = reorderedIds.indexOf(nodeId);
  if (targetIndex === -1 || targetIndex === originalIndex) return 0;

  return (
    sectionReorderState.sections[targetIndex].top -
    sectionReorderState.sections[originalIndex].top
  );
}

function getInsertionLineTop(sectionReorderState: SectionReorderState | null) {
  if (!sectionReorderState) return null;

  const siblings = sectionReorderState.sections.filter(
    (section) => section.id !== sectionReorderState.nodeId
  );

  if (siblings.length === 0) return null;
  if (sectionReorderState.currentIndex <= 0) {
    return Math.max(0, siblings[0].top - 8);
  }
  if (sectionReorderState.currentIndex >= siblings.length) {
    const lastSibling = siblings[siblings.length - 1];
    return lastSibling.top + lastSibling.height + 8;
  }

  const previousSibling = siblings[sectionReorderState.currentIndex - 1];
  const nextSibling = siblings[sectionReorderState.currentIndex];
  return (previousSibling.top + previousSibling.height + nextSibling.top) / 2;
}

function shadowValue(tokens: DesignSystemTokens, shadow: PageNodeStyle["shadow"]) {
  if (shadow === "medium") return tokens.shadows.md;
  if (shadow === "soft") return tokens.shadows.sm;
  return "none";
}

function nodeTextColor(tokens: DesignSystemTokens, style: PageNodeStyle) {
  return style.foreground || tokens.colors.text;
}

function nodeMutedColor(tokens: DesignSystemTokens, style: PageNodeStyle) {
  return style.muted || tokens.colors.textMuted;
}

function textAlignValue(align: PageNodeStyle["align"] = "left") {
  if (align === "center") return "center";
  if (align === "right") return "right";
  return "left";
}

function alignItemsValue(align: PageNodeStyle["align"] = "left") {
  if (align === "center") return "center";
  if (align === "right") return "flex-end";
  return "flex-start";
}

function justifyContentValue(justify: PageNodeStyle["justify"] = "start") {
  if (justify === "center") return "center";
  if (justify === "end") return "flex-end";
  if (justify === "between") return "space-between";
  return "flex-start";
}

function fontSizeValue(size: number | undefined, fallback: string) {
  return typeof size === "number" ? `${size}px` : fallback;
}

function typographyStyles(style: PageNodeStyle, fallback: {
  fontSize: string;
  fontWeight: number;
  lineHeight: number;
  letterSpacing?: string;
  fontFamily?: string;
}) {
  return {
    fontFamily: style.fontFamily || fallback.fontFamily,
    fontSize: fontSizeValue(style.fontSize, fallback.fontSize),
    fontWeight: style.fontWeight ?? fallback.fontWeight,
    lineHeight: style.lineHeight ?? fallback.lineHeight,
    letterSpacing:
      typeof style.letterSpacing === "number"
        ? `${style.letterSpacing}px`
        : fallback.letterSpacing,
    fontStyle: style.fontStyle ?? "normal",
    textDecoration: style.textDecoration ?? "none",
  };
}

function effectStyles(style: PageNodeStyle) {
  return {
    opacity: style.opacity ?? 1,
    filter: style.blur ? `blur(${style.blur}px)` : undefined,
  };
}

function MediaFrame({
  src,
  alt,
}: {
  src?: string;
  alt?: string;
}) {
  if (!src) return null;
  return (
    <div
      style={{
        overflow: "hidden",
        borderRadius: 22,
        border: "1px solid rgba(255,255,255,0.08)",
        minHeight: 220,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt || "Selected media"}
        style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
      />
    </div>
  );
}

/**
 * Renders a section's mediaUrl as a full-bleed background image.
 * Children of the section render on top of this image.
 * Used for editorial hero sections, atmospheric photo backgrounds, etc.
 */
function SectionBackgroundMedia({ src, alt }: { src?: string; alt?: string }) {
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt || ""}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}

function getAIPrefill(node: PageNode): string {
  const text = node.content?.text ?? "";
  const truncated = text.length > 80 ? text.slice(0, 80) + "..." : text;

  switch (node.type) {
    case "heading":
      return `Rewrite this heading: "${truncated}"`;
    case "paragraph":
      return node.name.toLowerCase().includes("kicker")
        ? `Rewrite this kicker: "${truncated}"`
        : `Rewrite this paragraph: "${truncated}"`;
    case "button":
      return `Rephrase this CTA: "${truncated}"`;
    case "feature-grid":
      return "Improve this features section";
    case "feature-card":
      return `Improve this feature: "${truncated}"`;
    case "testimonial-grid":
      return "Improve these testimonials";
    case "testimonial-card":
      return "Rewrite this testimonial";
    case "pricing-grid":
      return "Redesign this pricing section";
    case "pricing-tier":
      return `Improve this pricing tier: "${truncated}"`;
    case "section":
      if (node.content?.mediaUrl) return "Replace this image with...";
      return "Edit this section";
    default:
      return "Edit this element";
  }
}

function isTextNode(node: PageNode): boolean {
  return (
    node.type === "heading" ||
    node.type === "paragraph" ||
    node.type === "button"
  );
}

function SectionSelectionControls({
  node,
  sectionIndex,
  sectionCount,
  onOpenSectionLibrary,
  onFocusPromptWithPrefill,
  onDragPointerDown,
  dragging = false,
}: {
  node: PageNode;
  sectionIndex: number;
  sectionCount: number;
  onOpenSectionLibrary?: (insertAtIndex: number) => void;
  onFocusPromptWithPrefill?: (prefill: string) => void;
  onDragPointerDown?: (event: React.PointerEvent<HTMLButtonElement>) => void;
  dragging?: boolean;
}) {
  const { state, dispatch } = useCanvas();
  const artboardId = state.selection.activeArtboardId;

  if (!artboardId) return null;

  return (
    <SectionActionRail
      dragging={dragging}
      canMoveUp={sectionIndex > 0}
      canMoveDown={sectionIndex < sectionCount - 1}
      onDragPointerDown={(event) => {
        onDragPointerDown?.(event);
      }}
      onAddBelow={() => onOpenSectionLibrary?.(sectionIndex + 1)}
      onMoveUp={() => {
        if (sectionIndex <= 0) return;
        dispatch({
          type: "REORDER_NODE",
          artboardId,
          nodeId: node.id,
          newIndex: sectionIndex - 1,
        });
      }}
      onMoveDown={() => {
        if (sectionIndex >= sectionCount - 1) return;
        dispatch({
          type: "REORDER_NODE",
          artboardId,
          nodeId: node.id,
          newIndex: sectionIndex + 1,
        });
      }}
      onDuplicate={() => {
        dispatch({ type: "DUPLICATE_SECTION", artboardId, nodeId: node.id });
      }}
      onDelete={() => {
        dispatch({ type: "DELETE_SECTION", artboardId, nodeId: node.id });
      }}
      onAI={() => onFocusPromptWithPrefill?.(getAIPrefill(node))}
    />
  );
}

function Selectable({
  node,
  selectedNodeId,
  onSelectNode,
  onUpdateContent,
  onFocusPromptWithPrefill,
  interactive,
  className,
  children,
}: {
  node: PageNode;
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string | null) => void;
  onUpdateContent?: (nodeId: string, key: string, value: string) => void;
  onFocusPromptWithPrefill?: (prefill: string) => void;
  interactive?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const { state: canvasState, dispatch } = useCanvas();
  const { onOpenContextMenu, onDismissContextMenu } = React.useContext(
    ContextMenuControllerContext
  );
  const activeArtboardId = canvasState.selection.activeArtboardId;
  const selected = interactive && node.id === selectedNodeId;
  const [hovered, setHovered] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [flashOutlineActive, setFlashOutlineActive] = React.useState(false);

  const [tooltipPhase, setTooltipPhase] = React.useState<"hidden" | "visible" | "fading">("hidden");
  const nodeRef = React.useRef<HTMLDivElement>(null);
  const syncTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const originalTextRef = React.useRef(node.content?.text ?? "");
  const lastSyncedTextRef = React.useRef(node.content?.text ?? "");
  const historyPushedRef = React.useRef(false);
  const cancelRequestedRef = React.useRef(false);
  const isTextNodeValue = isTextNode(node);

  React.useEffect(() => {
    if (editing) return;
    originalTextRef.current = node.content?.text ?? "";
    lastSyncedTextRef.current = node.content?.text ?? "";
  }, [editing, node.content?.text]);

  const getTextTarget = React.useCallback(() => {
    const el = nodeRef.current;
    if (!el) return null;
    return el.querySelector("[data-text-edit-target]") as HTMLElement | null;
  }, []);

  const clearPendingSync = React.useCallback(() => {
    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
      syncTimerRef.current = null;
    }
  }, []);

  const syncTextValue = React.useCallback(
    (text: string, immediate = false) => {
      if (!isTextNodeValue || !onUpdateContent) return;

      const send = () => {
        if (text === lastSyncedTextRef.current) return;
        onUpdateContent(node.id, "text", text);
        lastSyncedTextRef.current = text;
      };

      clearPendingSync();
      if (immediate) {
        send();
        return;
      }

      syncTimerRef.current = setTimeout(() => {
        send();
        syncTimerRef.current = null;
      }, 180);
    },
    [clearPendingSync, isTextNodeValue, node.id, onUpdateContent]
  );

  const pushTextHistoryIfNeeded = React.useCallback(
    (nextText: string) => {
      if (historyPushedRef.current || nextText === originalTextRef.current) return;
      dispatch({ type: "PUSH_HISTORY", description: `Edited ${node.type}` });
      historyPushedRef.current = true;
    },
    [dispatch, node.type]
  );

  // ── Double-click tooltip ──────────────────────────────────────────
  React.useEffect(() => {
    setTooltipPhase("hidden");
    if (!selected || editing || !isTextNodeValue) return;
    if (typeof window !== "undefined" && localStorage.getItem("studio-os:edit-hint-seen") === "true") return;

    const showTimer = setTimeout(() => {
      const count = parseInt(localStorage.getItem("studio-os:edit-hint-count") || "0", 10);
      if (count >= 3) {
        localStorage.setItem("studio-os:edit-hint-seen", "true");
        return;
      }
      localStorage.setItem("studio-os:edit-hint-count", String(count + 1));
      setTooltipPhase("visible");
    }, 600);

    return () => clearTimeout(showTimer);
  }, [selected, editing, isTextNodeValue]);

  // Tooltip auto-fade: visible 1.5s → fading 0.5s → hidden
  React.useEffect(() => {
    if (tooltipPhase === "visible") {
      const timer = setTimeout(() => setTooltipPhase("fading"), 1500);
      return () => clearTimeout(timer);
    }
    if (tooltipPhase === "fading") {
      const timer = setTimeout(() => setTooltipPhase("hidden"), 500);
      return () => clearTimeout(timer);
    }
  }, [tooltipPhase]);

  // Floating format toolbar removed — formatting handled by inspector panel

  // ── Double-click → Figma/Framer-style layered text editing ─────────
  // 1st double-click: enter edit mode, highlight word under cursor
  // Later double-clicks while editing should keep native word selection behavior.
  // Triple-click selects the whole text block.
  function handleDoubleClick(e: React.MouseEvent) {
    if (!interactive) return;
    if (isTextNodeValue) {
      e.stopPropagation();
      if (!editing) {
        e.preventDefault();
        // First double-click — enter edit mode, select word at cursor
        enterTextEditMode(e.nativeEvent);
      }
    }
    setTooltipPhase("hidden");
  }

  // ── Text edit mode ─────────────────────────────────────────────────
  function selectAllText(el: HTMLElement) {
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }

  function enterTextEditMode(nativeEvent?: MouseEvent) {
    if (!isTextNodeValue || !onUpdateContent || editing) return;
    const textEl = getTextTarget();
    if (!textEl) return;

    originalTextRef.current = textEl.textContent ?? node.content?.text ?? "";
    lastSyncedTextRef.current = originalTextRef.current;
    historyPushedRef.current = false;
    cancelRequestedRef.current = false;
    textEl.contentEditable = "true";
    textEl.style.caretColor = "#1E5DF2";
    textEl.style.outline = "none";
    textEl.focus({ preventScroll: true });

    if (nativeEvent) {
      let range: Range | null = null;
      const docWithCaretApis = document as Document & {
        caretRangeFromPoint?: (x: number, y: number) => Range | null;
        caretPositionFromPoint?: (
          x: number,
          y: number
        ) => { offsetNode: Node; offset: number } | null;
      };
      if (typeof docWithCaretApis.caretRangeFromPoint === "function") {
        range = docWithCaretApis.caretRangeFromPoint(
          nativeEvent.clientX,
          nativeEvent.clientY
        );
      } else if (typeof docWithCaretApis.caretPositionFromPoint === "function") {
        const caret = docWithCaretApis.caretPositionFromPoint(
          nativeEvent.clientX,
          nativeEvent.clientY
        );
        if (caret) {
          range = document.createRange();
          range.setStart(caret.offsetNode, caret.offset);
          range.setEnd(caret.offsetNode, caret.offset);
        }
      }

      if (range && textEl.contains(range.startContainer)) {
        const expandableRange = range as Range & { expand?: (unit: string) => void };
        if (typeof expandableRange.expand === "function") {
          expandableRange.expand("word");
        }
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      } else {
        const selection = window.getSelection();
        const fallbackRange = document.createRange();
        fallbackRange.selectNodeContents(textEl);
        fallbackRange.collapse(false);
        selection?.removeAllRanges();
        selection?.addRange(fallbackRange);
      }
    } else {
      selectAllText(textEl);
    }

    setEditing(true);

    const onInput = () => {
      const nextText = textEl.textContent ?? "";
      pushTextHistoryIfNeeded(nextText);
      syncTextValue(nextText);
    };

    const commit = () => {
      clearPendingSync();
      textEl.contentEditable = "false";
      textEl.style.caretColor = "";
      textEl.style.outline = "";
      const newText = textEl.textContent ?? "";
      if (cancelRequestedRef.current) {
        if (historyPushedRef.current) {
          dispatch({ type: "UNDO" });
        } else if (newText !== originalTextRef.current) {
          onUpdateContent(node.id, "text", originalTextRef.current);
        }
      } else {
        pushTextHistoryIfNeeded(newText);
        syncTextValue(newText, true);
      }
      setEditing(false);
      textEl.removeEventListener("input", onInput);
      textEl.removeEventListener("blur", commit);
      textEl.removeEventListener("keydown", onKey);
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Enter" && !ev.shiftKey) { ev.preventDefault(); textEl.blur(); }
      if (ev.key === "Escape") {
        ev.preventDefault();
        cancelRequestedRef.current = true;
        textEl.textContent = originalTextRef.current;
        textEl.blur();
      }
    };
    textEl.addEventListener("input", onInput);
    textEl.addEventListener("blur", commit, { once: true });
    textEl.addEventListener("keydown", onKey);
  }

  const handleInlineTextEditRequest = React.useEffectEvent(() => {
    enterTextEditMode();
  });

  React.useEffect(() => {
    if (!interactive || !isTextNodeValue) return;
    const handleInlineTextEdit = (event: Event) => {
      const detail = (event as CustomEvent<InlineTextEditEventDetail>).detail;
      if (!detail) return;
      if (detail.nodeId !== node.id || detail.artboardId !== activeArtboardId) return;
      handleInlineTextEditRequest();
    };

    window.addEventListener(
      ENTER_TEXT_EDIT_MODE_EVENT,
      handleInlineTextEdit as EventListener
    );
    return () => {
      window.removeEventListener(
        ENTER_TEXT_EDIT_MODE_EVENT,
        handleInlineTextEdit as EventListener
      );
      clearPendingSync();
    };
  }, [
    activeArtboardId,
    clearPendingSync,
    handleInlineTextEditRequest,
    interactive,
    isTextNodeValue,
    node.id,
  ]);

  React.useEffect(() => {
    if (!interactive) return;

    const handleOutlineFlash = (event: Event) => {
      const detail = (event as CustomEvent<FlashNodeOutlinesEventDetail>).detail;
      if (!detail) return;
      if (detail.artboardId !== activeArtboardId || !detail.nodeIds.includes(node.id)) {
        return;
      }

      if (flashTimerRef.current) {
        clearTimeout(flashTimerRef.current);
      }

      setFlashOutlineActive(true);
      flashTimerRef.current = setTimeout(() => {
        setFlashOutlineActive(false);
        flashTimerRef.current = null;
      }, 220);
    };

    window.addEventListener(
      FLASH_NODE_OUTLINES_EVENT,
      handleOutlineFlash as EventListener
    );

    return () => {
      window.removeEventListener(
        FLASH_NODE_OUTLINES_EVENT,
        handleOutlineFlash as EventListener
      );
      if (flashTimerRef.current) {
        clearTimeout(flashTimerRef.current);
        flashTimerRef.current = null;
      }
    };
  }, [activeArtboardId, interactive, node.id]);

  const targetIsTextEditingSurface = (target: EventTarget | null) =>
    target instanceof HTMLElement &&
    Boolean(target.closest("[data-text-edit-target]"));

  // ── Outline styles ──────────────────────────────────────────────────
  const outlineStyle = interactive
    ? selected
      ? editing
        ? { outline: "1px solid #D1E4FC", outlineOffset: -1, cursor: "text" as const, background: "rgba(255,255,255,0.6)", borderRadius: "4px" }
        : { outline: "1px solid #1E5DF2", outlineOffset: -1, cursor: "default" as const }
      : flashOutlineActive
      ? { outline: "1px solid #D1E4FC", outlineOffset: -1, cursor: "default" as const }
      : hovered
      ? { outline: "1px solid rgba(30, 93, 242, 0.3)", outlineOffset: -1, cursor: "default" as const }
      : { cursor: "default" as const }
    : undefined;

  return (
    <div
      ref={nodeRef}
      data-node-id={node.id}
      suppressHydrationWarning
      className={cn(interactive && "relative", className)}
      style={outlineStyle}
      onMouseDown={(event) => {
        if (!interactive || event.button !== 0) return;
        if (editing && targetIsTextEditingSurface(event.target)) return;
        // Cmd+Click deep select: don't stopPropagation so all nested Selectables see the event
        if (event.metaKey || event.ctrlKey) return;
        event.stopPropagation();
      }}
      onClick={(event) => {
        if (!interactive || !onSelectNode) return;
        if (editing && targetIsTextEditingSurface(event.target)) {
          if (event.detail === 3) {
            event.preventDefault();
            event.stopPropagation();
            const textEl = getTextTarget();
            if (textEl) selectAllText(textEl);
          }
          return;
        }

        if (event.metaKey || event.ctrlKey) {
          // Deep select: deepest Selectable claims the event via preventDefault
          if (event.defaultPrevented) return;
          event.preventDefault();
          exitAnyActiveTextEditing();
          onDismissContextMenu?.();
          onSelectNode(node.id);
          return;
        }

        // Normal click: stopPropagation so parent Selectables don't also select
        // Exit any active text editing BEFORE selecting the new node
        exitAnyActiveTextEditing();
        event.preventDefault();
        event.stopPropagation();
        onDismissContextMenu?.();
        onSelectNode(node.id);
      }}
      onContextMenu={(event) => {
        if (!interactive) return;
        onOpenContextMenu?.(node, event);
      }}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => interactive && setHovered(true)}
      onMouseLeave={() => interactive && setHovered(false)}
    >
      {children}

      {/* Floating format toolbar removed — formatting handled by inspector panel */}

      {/* Double-click tooltip */}
      {isTextNodeValue && tooltipPhase !== "hidden" && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            bottom: "-24px",
            zIndex: 50,
            whiteSpace: "nowrap",
            fontSize: "10px",
            color: "#A0A0A0",
            background: "rgba(255,255,255,0.9)",
            border: "1px solid #E5E5E0",
            borderRadius: "2px",
            padding: "2px 8px",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            pointerEvents: "none",
            opacity: tooltipPhase === "fading" ? 0 : 1,
            transition: "opacity 0.5s ease-out",
          }}
        >
          Double-click to edit text
        </div>
      )}
    </div>
  );
}

function renderNode(
  node: PageNode,
  tokens: DesignSystemTokens,
  context: RenderContext
): React.ReactNode {
  const { breakpoint } = context;

  // Skip hidden nodes on this breakpoint (never hide the page root)
  if (node.type !== "page" && isNodeHidden(node, breakpoint)) {
    return null;
  }

  const style = getNodeStyle(node, breakpoint);
  const renderedChildren = (node.children ?? []).map((child) =>
    renderNode(child, tokens, context)
  );

  switch (node.type) {
    case "page": {
      const pageChildren = node.children ?? [];
      const pageGap = style.gap ?? 18;
      const barOffset = pageGap > 0 ? -pageGap : 0;
      const pageContent: React.ReactNode[] = [];
      const handleInsertSection = context.onOpenSectionLibrary;

      if (context.interactive && handleInsertSection) {
        pageChildren.forEach((child, index) => {
          if (child.type === "section") {
            pageContent.push(
              <InsertionBar
                key={`insert-before-${child.id}`}
                index={index}
                onInsert={handleInsertSection}
                disabled={Boolean(context.sectionReorderState)}
                style={{
                  marginTop: index === 0 ? undefined : barOffset,
                  marginBottom: barOffset,
                }}
              />
            );
          }

          pageContent.push(renderNode(child, tokens, context));
        });

        pageContent.push(
          <InsertionBar
            key={`insert-end-${node.id}`}
            index={pageChildren.length}
            onInsert={handleInsertSection}
            disabled={Boolean(context.sectionReorderState)}
            style={{ marginTop: barOffset }}
          />
        );
      } else {
        pageContent.push(...renderedChildren);
      }

      return (
        <Selectable
          key={node.id}
          node={node}
          selectedNodeId={context.selectedNodeId}
          onSelectNode={context.onSelectNode}
          onUpdateContent={context.onUpdateContent}
          onFocusPromptWithPrefill={context.onFocusPromptWithPrefill}
          interactive={context.interactive}
        >
          <main
            style={{
              background: style.background || tokens.colors.background,
              color: nodeTextColor(tokens, style),
              minHeight: "100%",
              padding: `${style.paddingY ?? 24}px ${style.paddingX ?? 24}px`,
              display: "flex",
              flexDirection: style.direction ?? "column",
              justifyContent: justifyContentValue(style.justify),
              gap: style.gap ?? 18,
              fontFamily: style.fontFamily || tokens.typography.fontFamily,
              textAlign: textAlignValue(style.align),
              position: "relative",
              ...effectStyles(style),
            }}
          >
            <MediaFrame src={node.content?.mediaUrl} alt={node.content?.mediaAlt} />
            {pageContent}
            {context.sectionReorderState ? (
              <div
                style={{
                  position: "absolute",
                  top: getInsertionLineTop(context.sectionReorderState) ?? 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  background: "#1E5DF2",
                  pointerEvents: "none",
                  transform: "translateY(-1px)",
                }}
              />
            ) : null}
          </main>
        </Selectable>
      );
    }
    case "section": {
      const sectionOffsetY = getSectionOffsetY(
        node.id,
        context.sectionOrder,
        context.sectionReorderState
      );
      const isTopLevelReorderableSection =
        context.interactive && context.reorderableSectionIds.has(node.id);
      const topLevelSectionIndex = context.sectionOrder.indexOf(node.id);
      const isSectionDragging = context.sectionReorderState?.nodeId === node.id;
      const showSectionControls =
        isTopLevelReorderableSection && context.selectedNodeId === node.id;

      const hasBackgroundMedia = Boolean(node.content?.mediaUrl);

      const sectionElement = (
        <Selectable
          node={node}
          selectedNodeId={context.selectedNodeId}
          onSelectNode={context.onSelectNode}
          onUpdateContent={context.onUpdateContent}
          onFocusPromptWithPrefill={context.onFocusPromptWithPrefill}
          interactive={context.interactive}
        >
          <section
            id={node.id}
            style={{
              background: style.background || "transparent",
              border: `1px solid ${style.borderColor || tokens.colors.border}`,
              borderRadius: style.borderRadius ?? 22,
              padding: `${style.paddingY ?? 48}px ${style.paddingX ?? 48}px`,
              minHeight: style.minHeight ?? "auto",
              boxShadow: shadowValue(tokens, style.shadow),
              ...(hasBackgroundMedia
                ? { position: "relative" as const, overflow: "hidden" }
                : {}),
              ...effectStyles(style),
            }}
          >
            {hasBackgroundMedia && (
              <>
                <SectionBackgroundMedia src={node.content?.mediaUrl} alt={node.content?.mediaAlt} />
                <div style={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.45) 100%)",
                  zIndex: 0,
                }} />
              </>
            )}
            <div
              style={{
                maxWidth: style.maxWidth ?? 1120,
                margin: "0 auto",
                display: "flex",
                flexDirection: style.direction ?? "column",
                justifyContent: justifyContentValue(style.justify),
                gap: style.gap ?? 18,
                alignItems: alignItemsValue(style.align),
                textAlign: textAlignValue(style.align),
                ...(hasBackgroundMedia
                  ? { position: "relative" as const, zIndex: 1 }
                  : {}),
              }}
            >
              {renderedChildren}
            </div>
          </section>
        </Selectable>
      );

      if (!isTopLevelReorderableSection) {
        return React.cloneElement(sectionElement, { key: node.id });
      }

      return (
        <div
          key={node.id}
          ref={(element) => context.registerSectionElement(node.id, element)}
          className="group relative"
          style={{
            transform:
              sectionOffsetY !== 0
                ? `translateY(${sectionOffsetY}px)${
                    isSectionDragging ? " scale(1.01)" : ""
                  }`
                : isSectionDragging
                ? "scale(1.01)"
                : undefined,
            transition: isSectionDragging
              ? "none"
              : "transform 150ms ease-out, box-shadow 150ms ease-out, opacity 150ms ease-out",
            boxShadow: isSectionDragging
              ? "0 18px 36px rgba(26, 26, 26, 0.16)"
              : undefined,
            opacity: isSectionDragging ? 0.9 : 1,
            zIndex: isSectionDragging ? 40 : 1,
            willChange: context.sectionReorderState ? "transform" : undefined,
          }}
        >
          {showSectionControls ? (
            <SectionSelectionControls
              node={node}
              sectionIndex={topLevelSectionIndex}
              sectionCount={context.sectionOrder.length}
              dragging={isSectionDragging}
              onOpenSectionLibrary={context.onOpenSectionLibrary}
              onFocusPromptWithPrefill={context.onFocusPromptWithPrefill}
              onDragPointerDown={(event) =>
                context.onSectionHandlePointerDown?.(event, node.id)
              }
            />
          ) : null}
          {React.cloneElement(sectionElement, { key: node.id })}
        </div>
      );
    }
    case "heading":
      return (
        <Selectable
          key={node.id}
          node={node}
          selectedNodeId={context.selectedNodeId}
          onSelectNode={context.onSelectNode}
          onUpdateContent={context.onUpdateContent}
          onFocusPromptWithPrefill={context.onFocusPromptWithPrefill}
          interactive={context.interactive}
        >
          <motion.h2
            data-text-edit-target="true"
            suppressContentEditableWarning
            initial={context.interactive ? false : { opacity: 0, y: 18 }}
            whileInView={context.interactive ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            style={{
              margin: 0,
              color: nodeTextColor(tokens, style),
              maxWidth: 900,
              ...typographyStyles(style, {
                fontSize: breakpoint === "mobile" ? "1.9rem" : "clamp(2.3rem, 6vw, 4.75rem)",
                fontWeight: 700,
                lineHeight: 1,
                letterSpacing: "-0.04em",
                fontFamily: tokens.typography.fontFamily,
              }),
              ...effectStyles(style),
            }}
          >
            {node.content?.text}
          </motion.h2>
        </Selectable>
      );
    case "paragraph":
      return (
        <Selectable
          key={node.id}
          node={node}
          selectedNodeId={context.selectedNodeId}
          onSelectNode={context.onSelectNode}
          onUpdateContent={context.onUpdateContent}
          onFocusPromptWithPrefill={context.onFocusPromptWithPrefill}
          interactive={context.interactive}
        >
          <p
            data-text-edit-target="true"
            suppressContentEditableWarning
            style={{
              margin: 0,
              color:
                style.foreground ||
                (node.name.toLowerCase().includes("kicker")
                  ? tokens.colors.accent
                  : nodeMutedColor(tokens, style)),
              maxWidth: 720,
              textTransform: node.name.toLowerCase().includes("kicker") ? "uppercase" : "none",
              ...typographyStyles(style, {
                fontSize: node.name.toLowerCase().includes("kicker") ? "0.8rem" : "1rem",
                fontWeight: node.name.toLowerCase().includes("kicker") ? 600 : 400,
                lineHeight: 1.6,
                letterSpacing: node.name.toLowerCase().includes("kicker") ? "0.12em" : "normal",
                fontFamily: tokens.typography.fontFamily,
              }),
              ...effectStyles(style),
            }}
          >
            {node.content?.text}
          </p>
        </Selectable>
      );
    case "button-row":
      return (
        <Selectable
          key={node.id}
          node={node}
          selectedNodeId={context.selectedNodeId}
          onSelectNode={context.onSelectNode}
          onUpdateContent={context.onUpdateContent}
          onFocusPromptWithPrefill={context.onFocusPromptWithPrefill}
          interactive={context.interactive}
        >
          <div
            style={{
              display: "flex",
              flexDirection: style.direction ?? "row",
              gap: style.gap ?? 12,
              flexWrap: "wrap",
              justifyContent: justifyContentValue(style.justify ?? (style.align === "center" ? "center" : "start")),
              alignItems: alignItemsValue(style.align),
              ...effectStyles(style),
            }}
          >
            {renderedChildren}
          </div>
        </Selectable>
      );
    case "button":
      return (
        <Selectable
          key={node.id}
          node={node}
          selectedNodeId={context.selectedNodeId}
          onSelectNode={context.onSelectNode}
          onUpdateContent={context.onUpdateContent}
          onFocusPromptWithPrefill={context.onFocusPromptWithPrefill}
          interactive={context.interactive}
        >
          <button
            type="button"
            style={{
              background: style.emphasized ? (style.accent || tokens.colors.accent) : "transparent",
              color: style.emphasized ? "#ffffff" : (style.foreground || tokens.colors.text),
              border: `1px solid ${style.borderColor || (style.emphasized ? "transparent" : tokens.colors.border)}`,
              borderRadius: style.borderRadius ?? 999,
              padding: `${style.paddingY ?? 12}px ${style.paddingX ?? 18}px`,
              cursor: "pointer",
              ...typographyStyles(style, {
                fontSize: "0.95rem",
                fontWeight: 500,
                lineHeight: 1.1,
                fontFamily: tokens.typography.fontFamily,
              }),
              ...effectStyles(style),
            }}
          >
            <span data-text-edit-target="true" suppressContentEditableWarning>
              {node.content?.text}
            </span>
          </button>
        </Selectable>
      );
    case "metric-row":
      return (
        <Selectable
          key={node.id}
          node={node}
          selectedNodeId={context.selectedNodeId}
          onSelectNode={context.onSelectNode}
          onUpdateContent={context.onUpdateContent}
          onFocusPromptWithPrefill={context.onFocusPromptWithPrefill}
          interactive={context.interactive}
        >
          <div
            style={{
              display: "grid",
              width: "100%",
              gap: style.gap ?? 12,
              gridTemplateColumns:
                breakpoint === "mobile"
                  ? "1fr"
                  : `repeat(${renderedChildren.length}, minmax(0, 1fr))`,
              ...effectStyles(style),
            }}
          >
            {renderedChildren}
          </div>
        </Selectable>
      );
    case "metric-item":
      return (
        <Selectable
          key={node.id}
          node={node}
          selectedNodeId={context.selectedNodeId}
          onSelectNode={context.onSelectNode}
          onUpdateContent={context.onUpdateContent}
          onFocusPromptWithPrefill={context.onFocusPromptWithPrefill}
          interactive={context.interactive}
        >
          <div
            style={{
              padding: `${style.paddingY ?? 16}px ${style.paddingX ?? 18}px`,
              borderRadius: style.borderRadius ?? 18,
              border: `1px solid ${style.borderColor || tokens.colors.border}`,
              background: style.background || tokens.colors.surface,
              boxShadow: shadowValue(tokens, style.shadow),
              ...effectStyles(style),
            }}
          >
            <MediaFrame src={node.content?.mediaUrl} alt={node.content?.mediaAlt} />
            <div
              style={{
                color: nodeTextColor(tokens, style),
                ...typographyStyles(style, {
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  lineHeight: 1.15,
                  fontFamily: tokens.typography.fontFamily,
                }),
              }}
            >
              {node.content?.text}
            </div>
            <div
              style={{
                marginTop: 6,
                color: nodeMutedColor(tokens, style),
                ...typographyStyles(style, {
                  fontSize: "0.9rem",
                  fontWeight: 400,
                  lineHeight: 1.4,
                  fontFamily: tokens.typography.fontFamily,
                }),
              }}
            >
              {node.content?.subtext}
            </div>
          </div>
        </Selectable>
      );
    case "logo-row":
      return (
        <Selectable
          key={node.id}
          node={node}
          selectedNodeId={context.selectedNodeId}
          onSelectNode={context.onSelectNode}
          onUpdateContent={context.onUpdateContent}
          onFocusPromptWithPrefill={context.onFocusPromptWithPrefill}
          interactive={context.interactive}
        >
          <div
            style={{
              display: "flex",
              gap: style.gap ?? 16,
              flexWrap: "wrap",
              justifyContent: style.align === "center" ? "center" : "flex-start",
            }}
          >
            {renderedChildren}
          </div>
        </Selectable>
      );
    case "logo-item":
      return (
        <Selectable
          key={node.id}
          node={node}
          selectedNodeId={context.selectedNodeId}
          onSelectNode={context.onSelectNode}
          onUpdateContent={context.onUpdateContent}
          onFocusPromptWithPrefill={context.onFocusPromptWithPrefill}
          interactive={context.interactive}
        >
          <div
            style={{
              padding: `${style.paddingY ?? 10}px ${style.paddingX ?? 14}px`,
              borderRadius: 999,
              border: `1px solid ${style.borderColor || tokens.colors.border}`,
              color: style.foreground || tokens.colors.textMuted,
              ...typographyStyles(style, {
                fontSize: "0.875rem",
                fontWeight: 500,
                lineHeight: 1.2,
                fontFamily: tokens.typography.fontFamily,
              }),
              ...effectStyles(style),
            }}
          >
            {node.content?.text}
          </div>
        </Selectable>
      );
    case "feature-grid":
    case "testimonial-grid":
    case "pricing-grid":
      return (
        <Selectable
          key={node.id}
          node={node}
          selectedNodeId={context.selectedNodeId}
          onSelectNode={context.onSelectNode}
          onUpdateContent={context.onUpdateContent}
          onFocusPromptWithPrefill={context.onFocusPromptWithPrefill}
          interactive={context.interactive}
        >
          <div
            style={{
              display: "grid",
              gap: style.gap ?? 18,
              gridTemplateColumns:
                breakpoint === "mobile"
                  ? "1fr"
                  : `repeat(${style.columns || 3}, minmax(0, 1fr))`,
              ...effectStyles(style),
            }}
          >
            {renderedChildren}
          </div>
        </Selectable>
      );
    case "feature-card":
    case "testimonial-card":
    case "pricing-tier":
      return (
        <Selectable
          key={node.id}
          node={node}
          selectedNodeId={context.selectedNodeId}
          onSelectNode={context.onSelectNode}
          onUpdateContent={context.onUpdateContent}
          onFocusPromptWithPrefill={context.onFocusPromptWithPrefill}
          interactive={context.interactive}
        >
          <div
            style={{
              padding: `${style.paddingY ?? 20}px ${style.paddingX ?? 20}px`,
              borderRadius: style.borderRadius || 20,
              border: `1px solid ${style.borderColor || tokens.colors.border}`,
              background:
                style.background ||
                (style.emphasized ? (style.accent || tokens.colors.accent) : tokens.colors.surface),
              color: style.emphasized ? "#ffffff" : nodeTextColor(tokens, style),
              boxShadow: shadowValue(tokens, style.shadow || (style.emphasized ? "medium" : "soft")),
              minHeight: node.type === "pricing-tier" ? 280 : 220,
              display: "flex",
              flexDirection: style.direction ?? "column",
              justifyContent: justifyContentValue(style.justify),
              ...effectStyles(style),
            }}
          >
            <MediaFrame src={node.content?.mediaUrl} alt={node.content?.mediaAlt} />
            {node.content?.icon ? (
              <div style={{ fontSize: "1.1rem", marginBottom: 12 }}>{node.content.icon}</div>
            ) : null}
            {node.content?.badge ? (
              <div
                style={{
                  display: "inline-flex",
                  marginBottom: 12,
                  padding: "6px 10px",
                  borderRadius: 999,
                  background: style.emphasized ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.04)",
                  fontSize: "0.75rem",
                  alignSelf: "flex-start",
                }}
              >
                {node.content.badge}
              </div>
            ) : null}
            <div
              style={{
                ...typographyStyles(style, {
                  fontSize: node.type === "pricing-tier" ? "1.05rem" : "1.1rem",
                  fontWeight: 600,
                  lineHeight: 1.2,
                  fontFamily: tokens.typography.fontFamily,
                }),
              }}
            >
              {node.content?.text}
            </div>
            {node.content?.price ? (
              <div
                style={{
                  marginTop: 14,
                  ...typographyStyles(style, {
                    fontSize: "2.1rem",
                    fontWeight: 700,
                    lineHeight: 1,
                    fontFamily: tokens.typography.fontFamily,
                  }),
                }}
              >
                {node.content.price}
              </div>
            ) : null}
            {node.content?.subtext ? (
              <p
                style={{
                  margin: "12px 0 0",
                  color: style.emphasized ? "rgba(255,255,255,0.78)" : tokens.colors.textMuted,
                  ...typographyStyles(style, {
                    fontSize: "0.95rem",
                    fontWeight: 400,
                    lineHeight: 1.6,
                    fontFamily: tokens.typography.fontFamily,
                  }),
                }}
              >
                {node.content.subtext}
              </p>
            ) : null}
            {node.content?.meta ? (
              <p
                style={{
                  margin: "12px 0 0",
                  color: style.emphasized ? "rgba(255,255,255,0.68)" : tokens.colors.textMuted,
                  ...typographyStyles(style, {
                    fontSize: "0.9rem",
                    fontWeight: 400,
                    lineHeight: 1.6,
                    fontFamily: tokens.typography.fontFamily,
                  }),
                }}
              >
                {node.content.meta}
              </p>
            ) : null}
          </div>
        </Selectable>
      );
    default:
      return null;
  }
}

export function ComposeDocumentView({
  pageTree,
  tokens,
  breakpoint,
  selectedNodeId,
  onSelectNode,
  onUpdateContent,
  onReorderSection,
  onOpenSectionLibrary,
  onFocusPromptWithPrefill,
  onReplaceImage,
  className,
  interactive = false,
  scale = 1,
}: ComposeDocumentViewProps) {
  const { state: canvasState, dispatch } = useCanvas();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  // Stable mutable map for section element registrations (callback refs).
  // Using useMemo instead of useRef avoids React Compiler's ref-during-render tracking,
  // since registerSectionElement is passed through render context for callback ref use.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sectionElements = React.useMemo(() => new Map<string, HTMLDivElement>(), []);
  const [sectionReorderState, setSectionReorderState] =
    React.useState<SectionReorderState | null>(null);
  const [contextMenuState, setContextMenuState] =
    React.useState<ContextMenuState | null>(null);
  const [pendingImageNodeId, setPendingImageNodeId] = React.useState<string | null>(null);
  const sectionReorderStateRef = React.useRef<SectionReorderState | null>(null);
  const topLevelSectionIds = React.useMemo(
    () =>
      (pageTree.children ?? [])
        .filter((child) => child.type === "section")
        .map((child) => child.id),
    [pageTree.children]
  );
  const reorderableSectionIds = React.useMemo(
    () => new Set(topLevelSectionIds),
    [topLevelSectionIds]
  );
  const canReorderSections =
    interactive && Boolean(onReorderSection) && topLevelSectionIds.length > 1;
  const activeArtboardId = canvasState.selection.activeArtboardId;
  const contextMenuMeta = React.useMemo(
    () =>
      contextMenuState
        ? getNodePathMetadata(pageTree, contextMenuState.nodeId)
        : null,
    [contextMenuState, pageTree]
  );
  const contextMenuNode = contextMenuMeta?.node ?? null;

  React.useEffect(() => {
    sectionReorderStateRef.current = sectionReorderState;
  }, [sectionReorderState]);

  const dismissContextMenu = React.useCallback(() => {
    setContextMenuState(null);
  }, []);

  React.useEffect(() => {
    function handleExternalContextMenuOpen() {
      setContextMenuState(null);
    }

    window.addEventListener(CONTEXT_MENU_OPEN_EVENT, handleExternalContextMenuOpen);
    return () => {
      window.removeEventListener(
        CONTEXT_MENU_OPEN_EVENT,
        handleExternalContextMenuOpen
      );
    };
  }, []);

  const clearSectionReorderState = React.useCallback(() => {
    sectionReorderStateRef.current = null;
    setSectionReorderState(null);
  }, []);

  const registerSectionElement = React.useCallback(
    (nodeId: string, element: HTMLDivElement | null) => {
      if (element) {
        sectionElements.set(nodeId, element);
      } else {
        sectionElements.delete(nodeId);
      }
    },
    []
  );

  const handleSectionHandlePointerDown = React.useCallback(
    (event: React.PointerEvent<HTMLButtonElement>, nodeId: string) => {
      if (!canReorderSections || !rootRef.current) return;

      event.preventDefault();
      event.stopPropagation();

      const startIndex = topLevelSectionIds.indexOf(nodeId);
      if (startIndex === -1) return;

      const rootRect = rootRef.current.getBoundingClientRect();
      const sections = topLevelSectionIds
        .map((sectionId) => {
          const element = sectionElements.get(sectionId);
          if (!element) return null;

          const rect = element.getBoundingClientRect();
          return {
            id: sectionId,
            top: rect.top - rootRect.top,
            height: rect.height,
          };
        })
        .filter((section): section is SectionMetrics => Boolean(section));

      if (sections.length !== topLevelSectionIds.length) return;

      const draggedSection = sections.find((section) => section.id === nodeId);
      if (!draggedSection) return;

      const pointerY = event.clientY - rootRect.top;

      const nextState = {
        nodeId,
        startIndex,
        currentIndex: startIndex,
        pointerY,
        pointerOffsetY: pointerY - draggedSection.top,
        sections,
      };

      sectionReorderStateRef.current = nextState;
      setSectionReorderState(nextState);
    },
    [canReorderSections, topLevelSectionIds]
  );

  React.useEffect(() => {
    if (!sectionReorderState) return;

    const handlePointerMove = (event: PointerEvent) => {
      const currentState = sectionReorderStateRef.current;
      const rootElement = rootRef.current;
      if (!currentState || !rootElement) return;

      const rootRect = rootElement.getBoundingClientRect();
      const pointerY = event.clientY - rootRect.top;
      const nextIndex = getTargetSectionIndex(
        pointerY,
        currentState.sections,
        currentState.nodeId
      );

      setSectionReorderState((previousState) => {
        if (!previousState) return previousState;
        if (
          previousState.pointerY === pointerY &&
          previousState.currentIndex === nextIndex
        ) {
          return previousState;
        }

        return {
          ...previousState,
          pointerY,
          currentIndex: nextIndex,
        };
      });
    };

    const handlePointerUp = () => {
      const currentState = sectionReorderStateRef.current;
      if (
        currentState &&
        onReorderSection &&
        currentState.currentIndex !== currentState.startIndex
      ) {
        onReorderSection(currentState.nodeId, currentState.currentIndex);
      }
      clearSectionReorderState();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        clearSectionReorderState();
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [clearSectionReorderState, onReorderSection, sectionReorderState]);

  const openContextMenu = React.useCallback(
    (node: PageNode, event: React.MouseEvent<HTMLDivElement>) => {
      if (!interactive) return;

      event.preventDefault();
      event.stopPropagation();
      window.dispatchEvent(new Event(CONTEXT_MENU_OPEN_EVENT));
      onSelectNode?.(node.id);
      setContextMenuState({
        nodeId: node.id,
        position: { x: event.clientX, y: event.clientY },
      });
    },
    [interactive, onSelectNode]
  );

  const handleEditText = React.useCallback(
    (nodeId: string) => {
      if (!activeArtboardId || typeof window === "undefined") return;

      window.dispatchEvent(
        new CustomEvent<InlineTextEditEventDetail>(ENTER_TEXT_EDIT_MODE_EVENT, {
          detail: { artboardId: activeArtboardId, nodeId },
        })
      );
    },
    [activeArtboardId]
  );

  const handleDuplicateNode = React.useCallback(
    (nodeId: string) => {
      if (!activeArtboardId) return;

      const metadata = getNodePathMetadata(pageTree, nodeId);
      if (!metadata) return;

      const { node, parent, siblings, index } = metadata;
      if (index === -1) return;

      if (node.type === "section" && parent?.id === pageTree.id) {
        dispatch({ type: "DUPLICATE_SECTION", artboardId: activeArtboardId, nodeId });
        return;
      }

      if (!parent?.children) return;

      const duplicate = cloneNodeWithNewIds(node);
      const nextChildren = [...siblings];
      nextChildren.splice(index + 1, 0, duplicate);
      const sourceArtboard = canvasState.items.find(
        (item): item is typeof canvasState.items[number] & { kind: "artboard"; siteId: string } =>
          item.kind === "artboard" && item.id === activeArtboardId
      );
      const syncedArtboardIds = sourceArtboard
        ? canvasState.items
            .filter(
              (item): item is typeof canvasState.items[number] & { kind: "artboard"; id: string; siteId: string } =>
                item.kind === "artboard" && item.siteId === sourceArtboard.siteId
            )
            .map((item) => item.id)
        : [activeArtboardId];

      dispatch({ type: "PUSH_HISTORY", description: "Duplicated element" });
      syncedArtboardIds.forEach((artboardId) => {
        dispatch({
          type: "UPDATE_NODE",
          artboardId,
          nodeId: parent.id,
          changes: { children: nextChildren },
        });
      });
      dispatch({ type: "SELECT_NODE", artboardId: activeArtboardId, nodeId: duplicate.id });
    },
    [activeArtboardId, canvasState.items, dispatch, pageTree]
  );

  const handleDeleteNode = React.useCallback(
    (nodeId: string) => {
      if (!activeArtboardId) return;

      const metadata = getNodePathMetadata(pageTree, nodeId);
      if (!metadata) return;

      const { node, parent, siblings } = metadata;

      if (node.type === "section" && parent?.id === pageTree.id) {
        dispatch({ type: "DELETE_SECTION", artboardId: activeArtboardId, nodeId });
        return;
      }

      if (!parent?.children) return;
      const sourceArtboard = canvasState.items.find(
        (item): item is typeof canvasState.items[number] & { kind: "artboard"; siteId: string } =>
          item.kind === "artboard" && item.id === activeArtboardId
      );
      const syncedArtboardIds = sourceArtboard
        ? canvasState.items
            .filter(
              (item): item is typeof canvasState.items[number] & { kind: "artboard"; id: string; siteId: string } =>
                item.kind === "artboard" && item.siteId === sourceArtboard.siteId
            )
            .map((item) => item.id)
        : [activeArtboardId];

      dispatch({ type: "PUSH_HISTORY", description: "Removed element" });
      syncedArtboardIds.forEach((artboardId) => {
        dispatch({
          type: "UPDATE_NODE",
          artboardId,
          nodeId: parent.id,
          changes: {
            children: siblings.filter((child) => child.id !== nodeId),
          },
        });
      });
      dispatch({ type: "SELECT_NODE", artboardId: activeArtboardId, nodeId: parent.id });
    },
    [activeArtboardId, canvasState.items, dispatch, pageTree]
  );

  const handleMoveNode = React.useCallback(
    (nodeId: string, direction: "up" | "down") => {
      if (!activeArtboardId) return;

      const metadata = getNodePathMetadata(pageTree, nodeId);
      if (!metadata) return;

      const { parent, siblings, index } = metadata;
      if (index === -1) return;

      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= siblings.length) return;

      dispatch({
        type: "REORDER_NODE",
        artboardId: activeArtboardId,
        nodeId,
        newIndex,
        parentNodeId:
          parent && parent.id !== pageTree.id ? parent.id : undefined,
      });
    },
    [activeArtboardId, dispatch, pageTree]
  );

  const handleReplaceImage = React.useCallback((nodeId: string) => {
    setPendingImageNodeId(nodeId);
    fileInputRef.current?.click();
  }, []);

  const contextMenuController = React.useMemo<ContextMenuController>(
    () => ({
      onOpenContextMenu: openContextMenu,
      onDismissContextMenu: dismissContextMenu,
    }),
    [dismissContextMenu, openContextMenu]
  );

  const renderContext = React.useMemo<RenderContext>(
    () => ({
      breakpoint,
      selectedNodeId,
      onSelectNode,
      onUpdateContent,
      interactive,
      reorderableSectionIds: canReorderSections
        ? reorderableSectionIds
        : new Set<string>(),
      sectionOrder: topLevelSectionIds,
      sectionReorderState,
      registerSectionElement,
      onSectionHandlePointerDown: canReorderSections
        ? handleSectionHandlePointerDown
        : undefined,
      onOpenSectionLibrary,
      onFocusPromptWithPrefill,
    }),
    [
      breakpoint,
      canReorderSections,
      handleSectionHandlePointerDown,
      interactive,
      onFocusPromptWithPrefill,
      onOpenSectionLibrary,
      onSelectNode,
      onUpdateContent,
      registerSectionElement,
      reorderableSectionIds,
      sectionReorderState,
      selectedNodeId,
      topLevelSectionIds,
    ]
  );

  return (
    <ContextMenuControllerContext.Provider value={contextMenuController}>
      <div
        ref={rootRef}
        data-studio-context-menu-open={contextMenuState ? "true" : undefined}
        className={cn("origin-top-left", className)}
        style={{
          width: BREAKPOINT_WIDTHS[breakpoint],
          transform: scale !== 1 ? `scale(${scale})` : undefined,
          transformOrigin: "top left",
        }}
        onClick={(e) => {
          if (!interactive || !onSelectNode) return;
          // Click on empty area within the document → deselect
          if (!(e.target as HTMLElement).closest("[data-node-id]")) {
            dismissContextMenu();
            onSelectNode(null);
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file && pendingImageNodeId) {
              onReplaceImage?.(pendingImageNodeId, file);
            }
            event.target.value = "";
            setPendingImageNodeId(null);
          }}
        />
        {renderNode(pageTree, tokens, renderContext)}
        <AnimatePresence>
          {contextMenuState && contextMenuNode && contextMenuMeta ? (
            <ContextMenu
              node={contextMenuNode}
              position={contextMenuState.position}
              onEditText={
                isTextNode(contextMenuNode)
                  ? () => handleEditText(contextMenuNode.id)
                  : undefined
              }
              onEditWithAI={() =>
                onFocusPromptWithPrefill?.(getAIPrefill(contextMenuNode))
              }
              onReplaceImage={
                contextMenuNode.content?.mediaUrl
                  ? () => handleReplaceImage(contextMenuNode.id)
                  : undefined
              }
              onDuplicate={() => handleDuplicateNode(contextMenuNode.id)}
              onMoveUp={
                contextMenuMeta.index > 0 &&
                !isTextNode(contextMenuNode) &&
                !contextMenuNode.content?.mediaUrl
                  ? () => handleMoveNode(contextMenuNode.id, "up")
                  : undefined
              }
              onMoveDown={
                contextMenuMeta.index > -1 &&
                contextMenuMeta.index < contextMenuMeta.siblings.length - 1 &&
                !isTextNode(contextMenuNode) &&
                !contextMenuNode.content?.mediaUrl
                  ? () => handleMoveNode(contextMenuNode.id, "down")
                  : undefined
              }
              onCopyStyle={() => {}}
              onPasteStyle={() => {}}
              onDelete={() => handleDeleteNode(contextMenuNode.id)}
              onDismiss={dismissContextMenu}
              isFirstSection={contextMenuMeta.index <= 0}
              isLastSection={
                contextMenuMeta.index >= contextMenuMeta.siblings.length - 1
              }
            />
          ) : null}
        </AnimatePresence>
      </div>
    </ContextMenuControllerContext.Provider>
  );
}
