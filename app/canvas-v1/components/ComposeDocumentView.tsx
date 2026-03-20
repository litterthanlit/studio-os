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
import { BREAKPOINT_WIDTHS, getNodeStyle } from "@/lib/canvas/compose";
import type { DesignSystemTokens } from "@/lib/canvas/generate-system";
import { useCanvas } from "@/lib/canvas/canvas-context";
import { SectionDragHandle } from "./SectionDragHandle";
import { ElementActionMenu } from "./ElementActionMenu";
import { NodeFormatToolbar } from "./NodeFormatToolbar";

type ComposeDocumentViewProps = {
  pageTree: PageNode;
  tokens: DesignSystemTokens;
  breakpoint: Breakpoint;
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string | null) => void;
  onUpdateContent?: (nodeId: string, key: string, value: string) => void;
  onReorderSection?: (nodeId: string, newIndex: number) => void;
  onOpenSectionLibrary?: (afterNodeId: string | null) => void;
  onFocusPromptWithPrefill?: (prefill: string) => void;
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
  onOpenSectionLibrary?: (afterNodeId: string | null) => void;
  onFocusPromptWithPrefill?: (prefill: string) => void;
};

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

function Selectable({
  node,
  selectedNodeId,
  onSelectNode,
  onUpdateContent,
  onOpenSectionLibrary,
  onFocusPromptWithPrefill,
  interactive,
  className,
  children,
}: {
  node: PageNode;
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string | null) => void;
  onUpdateContent?: (nodeId: string, key: string, value: string) => void;
  onOpenSectionLibrary?: (afterNodeId: string | null) => void;
  onFocusPromptWithPrefill?: (prefill: string) => void;
  interactive?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const { state: canvasState, dispatch } = useCanvas();
  const activeArtboardId = canvasState.selection.activeArtboardId;
  const selected = interactive && node.id === selectedNodeId;
  const [hovered, setHovered] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [actionMenuOpen, setActionMenuOpen] = React.useState(false);
  const [showToolbar, setShowToolbar] = React.useState(false);
  const [tooltipPhase, setTooltipPhase] = React.useState<"hidden" | "visible" | "fading">("hidden");
  const nodeRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const isTextNode = node.type === "heading" || node.type === "paragraph";

  // ── Double-click tooltip ──────────────────────────────────────────
  React.useEffect(() => {
    setTooltipPhase("hidden");
    if (!selected || editing || actionMenuOpen) return;
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
  }, [selected, editing, actionMenuOpen]);

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

  // ── Floating format toolbar (text nodes only) ─────────────────────
  React.useEffect(() => {
    if (selected && isTextNode && !editing && !actionMenuOpen) {
      const timer = setTimeout(() => setShowToolbar(true), 200);
      return () => clearTimeout(timer);
    }
    setShowToolbar(false);
  }, [selected, isTextNode, editing, actionMenuOpen]);

  // ── Double-click → action menu ────────────────────────────────────
  function handleDoubleClick(e: React.MouseEvent) {
    if (!interactive) return;
    e.stopPropagation();
    e.preventDefault();
    setActionMenuOpen(true);
    setTooltipPhase("hidden");
  }

  // ── Text edit mode (triggered from action menu) ───────────────────
  function enterTextEditMode() {
    if (!isTextNode || !onUpdateContent) return;
    const el = nodeRef.current;
    if (!el) return;
    const found = el.querySelector("h2, p") as HTMLElement | null;
    if (!found) return;
    const textEl: HTMLElement = found;
    textEl.contentEditable = "true";
    textEl.style.caretColor = "#1E5DF2";
    textEl.style.outline = "none";
    textEl.focus();
    const range = window.document.createRange();
    range.selectNodeContents(textEl);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    setEditing(true);

    const commit = () => {
      textEl.contentEditable = "false";
      textEl.style.caretColor = "";
      textEl.style.outline = "";
      const newText = textEl.textContent ?? "";
      onUpdateContent!(node.id, "text", newText);
      setEditing(false);
      textEl.removeEventListener("blur", commit);
      textEl.removeEventListener("keydown", onKey);
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Enter" && !ev.shiftKey) { ev.preventDefault(); textEl.blur(); }
      if (ev.key === "Escape") { textEl.textContent = node.content?.text ?? ""; textEl.blur(); }
    };
    textEl.addEventListener("blur", commit, { once: true });
    textEl.addEventListener("keydown", onKey);
  }

  // ── File input for image replace ──────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !onUpdateContent) return;
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      onUpdateContent(node.id, "mediaUrl", reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  // ── Outline styles ──────────────────────────────────────────────────
  const outlineStyle = interactive
    ? selected
      ? editing
        ? { outline: "2px solid #4B83F7", outlineOffset: -1, cursor: "text" as const }
        : { outline: "2px solid #1E5DF2", outlineOffset: -1, cursor: "default" as const }
      : hovered
      ? { outline: "1px dashed #D1E4FC", outlineOffset: -1, cursor: "default" as const }
      : { cursor: "default" as const }
    : undefined;

  return (
    <div
      ref={nodeRef}
      data-node-id={node.id}
      className={cn(interactive && "relative", className)}
      style={outlineStyle}
      onMouseDown={(event) => {
        if (!interactive) return;
        event.stopPropagation();
      }}
      onClick={(event) => {
        if (!interactive || !onSelectNode) return;
        event.preventDefault();
        event.stopPropagation();
        onSelectNode(node.id);
      }}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => interactive && setHovered(true)}
      onMouseLeave={() => interactive && setHovered(false)}
    >
      {children}

      {/* Hidden file input for image replace */}
      {Boolean(node.content?.mediaUrl) && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
      )}

      {/* Element action menu */}
      <AnimatePresence>
        {actionMenuOpen && (
          <ElementActionMenu
            node={node}
            anchorRef={nodeRef}
            onEditText={() => { setActionMenuOpen(false); enterTextEditMode(); }}
            onEditWithAI={() => { setActionMenuOpen(false); onFocusPromptWithPrefill?.(getAIPrefill(node)); }}
            onReplaceImage={() => { setActionMenuOpen(false); fileInputRef.current?.click(); }}
            onAddSectionBelow={() => { setActionMenuOpen(false); onOpenSectionLibrary?.(node.id); }}
            onMoveUp={() => {
              setActionMenuOpen(false);
              if (!activeArtboardId) return;
              dispatch({ type: "PUSH_HISTORY", description: "Moved section up" });
              // Find current section index in pageTree — use REORDER_NODE with newIndex - 1
              // The artboard's pageTree sections are managed by top-level reorder
              const artboard = canvasState.items.find((i) => i.kind === "artboard" && i.id === activeArtboardId);
              if (!artboard || artboard.kind !== "artboard") return;
              const sections = (artboard.pageTree.children ?? []).filter((c) => c.type === "section");
              const idx = sections.findIndex((c) => c.id === node.id);
              if (idx > 0) dispatch({ type: "REORDER_NODE", artboardId: activeArtboardId, nodeId: node.id, newIndex: idx - 1 });
            }}
            onMoveDown={() => {
              setActionMenuOpen(false);
              if (!activeArtboardId) return;
              dispatch({ type: "PUSH_HISTORY", description: "Moved section down" });
              const artboard = canvasState.items.find((i) => i.kind === "artboard" && i.id === activeArtboardId);
              if (!artboard || artboard.kind !== "artboard") return;
              const sections = (artboard.pageTree.children ?? []).filter((c) => c.type === "section");
              const idx = sections.findIndex((c) => c.id === node.id);
              if (idx < sections.length - 1) dispatch({ type: "REORDER_NODE", artboardId: activeArtboardId, nodeId: node.id, newIndex: idx + 1 });
            }}
            onDuplicate={() => {
              setActionMenuOpen(false);
              if (activeArtboardId) dispatch({ type: "DUPLICATE_SECTION", artboardId: activeArtboardId, nodeId: node.id });
            }}
            onDelete={() => {
              setActionMenuOpen(false);
              if (activeArtboardId) dispatch({ type: "DELETE_SECTION", artboardId: activeArtboardId, nodeId: node.id });
            }}
            onDismiss={() => setActionMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Floating format toolbar */}
      <AnimatePresence>
        {showToolbar && (
          <NodeFormatToolbar
            node={node}
            anchorRef={nodeRef}
            onAIClick={() => { onFocusPromptWithPrefill?.(getAIPrefill(node)); }}
          />
        )}
      </AnimatePresence>

      {/* Double-click tooltip */}
      {tooltipPhase !== "hidden" && (
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
          Double-click for options
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
  const style = getNodeStyle(node, breakpoint);
  const children = (node.children ?? []).map((child) =>
    renderNode(child, tokens, context)
  );

  switch (node.type) {
    case "page":
      return (
        <Selectable
          key={node.id}
          node={node}
          selectedNodeId={context.selectedNodeId}
          onSelectNode={context.onSelectNode}
          onUpdateContent={context.onUpdateContent}
          onOpenSectionLibrary={context.onOpenSectionLibrary}
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
            {context.interactive && context.onOpenSectionLibrary
              ? (node.children ?? []).flatMap((child, i) => {
                  const rendered = renderNode(child, tokens, context);
                  if (i === 0) return [rendered];
                  const prevId = (node.children ?? [])[i - 1]?.id;
                  return [
                    <div
                      key={`insert-${prevId}`}
                      className="flex justify-center py-1 opacity-0 hover:opacity-100 transition-opacity"
                      style={{ margin: "-4px 0" }}
                    >
                      <button
                        className="w-6 h-6 flex items-center justify-center rounded-full border border-[#E5E5E0] bg-white text-[#A0A0A0] hover:border-[#D1E4FC] hover:text-[#1E5DF2] transition-colors text-[14px]"
                        onClick={(e) => {
                          e.stopPropagation();
                          context.onOpenSectionLibrary!(prevId);
                        }}
                      >
                        +
                      </button>
                    </div>,
                    rendered,
                  ];
                })
              : children}
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
    case "section": {
      const sectionOffsetY = getSectionOffsetY(
        node.id,
        context.sectionOrder,
        context.sectionReorderState
      );
      const isTopLevelReorderableSection =
        context.interactive && context.reorderableSectionIds.has(node.id);
      const isSectionDragging = context.sectionReorderState?.nodeId === node.id;

      const sectionElement = (
        <Selectable
          node={node}
          selectedNodeId={context.selectedNodeId}
          onSelectNode={context.onSelectNode}
          onUpdateContent={context.onUpdateContent}
          onOpenSectionLibrary={context.onOpenSectionLibrary}
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
              ...effectStyles(style),
            }}
          >
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
              }}
            >
              <MediaFrame src={node.content?.mediaUrl} alt={node.content?.mediaAlt} />
              {children}
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
          <SectionDragHandle
            selected={context.selectedNodeId === node.id}
            dragging={isSectionDragging}
            onPointerDown={(event) =>
              context.onSectionHandlePointerDown?.(event, node.id)
            }
          />
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
          onOpenSectionLibrary={context.onOpenSectionLibrary}
          onFocusPromptWithPrefill={context.onFocusPromptWithPrefill}
          interactive={context.interactive}
        >
          <motion.h2
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
          onOpenSectionLibrary={context.onOpenSectionLibrary}
          onFocusPromptWithPrefill={context.onFocusPromptWithPrefill}
          interactive={context.interactive}
        >
          <p
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
          onOpenSectionLibrary={context.onOpenSectionLibrary}
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
            {children}
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
          onOpenSectionLibrary={context.onOpenSectionLibrary}
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
            {node.content?.text}
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
          onOpenSectionLibrary={context.onOpenSectionLibrary}
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
                  : `repeat(${children.length}, minmax(0, 1fr))`,
              ...effectStyles(style),
            }}
          >
            {children}
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
          onOpenSectionLibrary={context.onOpenSectionLibrary}
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
          onOpenSectionLibrary={context.onOpenSectionLibrary}
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
            {children}
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
          onOpenSectionLibrary={context.onOpenSectionLibrary}
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
          onOpenSectionLibrary={context.onOpenSectionLibrary}
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
                  : breakpoint === "tablet"
                  ? "repeat(2, minmax(0, 1fr))"
                  : `repeat(${style.columns || 3}, minmax(0, 1fr))`,
              ...effectStyles(style),
            }}
          >
            {children}
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
          onOpenSectionLibrary={context.onOpenSectionLibrary}
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
  className,
  interactive = false,
  scale = 1,
}: ComposeDocumentViewProps) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  // Stable mutable map for section element registrations (callback refs).
  // Using useMemo instead of useRef avoids React Compiler's ref-during-render tracking,
  // since registerSectionElement is passed through render context for callback ref use.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sectionElements = React.useMemo(() => new Map<string, HTMLDivElement>(), []);
  const [sectionReorderState, setSectionReorderState] =
    React.useState<SectionReorderState | null>(null);
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

  React.useEffect(() => {
    sectionReorderStateRef.current = sectionReorderState;
  }, [sectionReorderState]);

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
    <div
      ref={rootRef}
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
          onSelectNode(null);
        }
      }}
    >
      {renderNode(pageTree, tokens, renderContext)}
    </div>
  );
}
