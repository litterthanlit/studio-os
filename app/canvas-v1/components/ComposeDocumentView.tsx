"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type {
  Breakpoint,
  PageNode,
  PageNodeStyle,
} from "@/lib/canvas/compose";
import { BREAKPOINT_WIDTHS, getNodeStyle } from "@/lib/canvas/compose";
import type { DesignSystemTokens } from "@/lib/canvas/generate-system";

type ComposeDocumentViewProps = {
  pageTree: PageNode;
  tokens: DesignSystemTokens;
  breakpoint: Breakpoint;
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string | null) => void;
  onUpdateContent?: (nodeId: string, key: string, value: string) => void;
  className?: string;
  interactive?: boolean;
  scale?: number;
};

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

function Selectable({
  node,
  selectedNodeId,
  onSelectNode,
  onUpdateContent,
  interactive,
  className,
  children,
}: {
  node: PageNode;
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string | null) => void;
  onUpdateContent?: (nodeId: string, key: string, value: string) => void;
  interactive?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const selected = interactive && node.id === selectedNodeId;
  const [hovered, setHovered] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [tooltipPhase, setTooltipPhase] = React.useState<"hidden" | "visible" | "fading">("hidden");
  const isTextNode = node.type === "heading" || node.type === "paragraph";

  // ── Double-click to edit tooltip ────────────────────────────────────
  React.useEffect(() => {
    setTooltipPhase("hidden");
    if (!selected || !isTextNode || editing) return;
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
  }, [selected, isTextNode, editing]);

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

  // ── Double-click to enter edit mode ─────────────────────────────────
  function handleDoubleClick(e: React.MouseEvent) {
    if (!interactive || !isTextNode || !onUpdateContent) return;
    e.stopPropagation();
    e.preventDefault();
    const el = e.currentTarget as HTMLElement;
    const found = el.querySelector("h2, p") as HTMLElement | null;
    if (!found) return;
    const textEl: HTMLElement = found;
    textEl.contentEditable = "true";
    // Edit mode styling — inline styles to avoid conflicts with generated site styles
    textEl.style.caretColor = "#1E5DF2";
    textEl.style.outline = "none";

    textEl.focus();
    const range = window.document.createRange();
    range.selectNodeContents(textEl);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);

    setEditing(true);
    setTooltipPhase("hidden");

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
      if (ev.key === "Enter" && !ev.shiftKey) {
        ev.preventDefault();
        textEl.blur();
      }
      if (ev.key === "Escape") {
        textEl.textContent = node.content?.text ?? "";
        textEl.blur();
      }
    };
    textEl.addEventListener("blur", commit, { once: true });
    textEl.addEventListener("keydown", onKey);
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
      {/* Double-click to edit tooltip */}
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
          Double-click to edit
        </div>
      )}
    </div>
  );
}

function renderNode(
  node: PageNode,
  tokens: DesignSystemTokens,
  breakpoint: Breakpoint,
  selectedNodeId?: string | null,
  onSelectNode?: (nodeId: string | null) => void,
  interactive = false,
  onUpdateContent?: (nodeId: string, key: string, value: string) => void
): React.ReactNode {
  const style = getNodeStyle(node, breakpoint);
  const children = (node.children ?? []).map((child) =>
    renderNode(child, tokens, breakpoint, selectedNodeId, onSelectNode, interactive, onUpdateContent)
  );

  switch (node.type) {
    case "page":
      return (
        <Selectable
          key={node.id}
          node={node}
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
          onUpdateContent={onUpdateContent}
          interactive={interactive}
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
              ...effectStyles(style),
            }}
          >
            <MediaFrame src={node.content?.mediaUrl} alt={node.content?.mediaAlt} />
            {children}
          </main>
        </Selectable>
      );
    case "section":
      return (
        <Selectable
          key={node.id}
          node={node}
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
          onUpdateContent={onUpdateContent}
          interactive={interactive}
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
    case "heading":
      return (
        <Selectable
          key={node.id}
          node={node}
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
          onUpdateContent={onUpdateContent}
          interactive={interactive}
        >
          <motion.h2
            initial={interactive ? false : { opacity: 0, y: 18 }}
            whileInView={interactive ? undefined : { opacity: 1, y: 0 }}
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
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
          onUpdateContent={onUpdateContent}
          interactive={interactive}
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
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
          onUpdateContent={onUpdateContent}
          interactive={interactive}
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
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
          onUpdateContent={onUpdateContent}
          interactive={interactive}
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
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
          onUpdateContent={onUpdateContent}
          interactive={interactive}
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
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
          onUpdateContent={onUpdateContent}
          interactive={interactive}
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
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
          onUpdateContent={onUpdateContent}
          interactive={interactive}
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
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
          onUpdateContent={onUpdateContent}
          interactive={interactive}
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
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
          onUpdateContent={onUpdateContent}
          interactive={interactive}
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
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
          onUpdateContent={onUpdateContent}
          interactive={interactive}
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
  className,
  interactive = false,
  scale = 1,
}: ComposeDocumentViewProps) {
  return (
    <div
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
      {renderNode(pageTree, tokens, breakpoint, selectedNodeId, onSelectNode, interactive, onUpdateContent)}
    </div>
  );
}
