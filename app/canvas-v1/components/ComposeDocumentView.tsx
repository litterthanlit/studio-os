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
  onSelectNode?: (nodeId: string) => void;
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
  interactive,
  className,
  children,
}: {
  node: PageNode;
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string) => void;
  interactive?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const selected = interactive && node.id === selectedNodeId;
  return (
    <div
      data-node-id={node.id}
      className={cn(
        interactive && "group relative transition-shadow duration-150",
        selected && "ring-2 ring-accent ring-offset-2 ring-offset-bg-secondary",
        interactive && !selected && "hover:ring-1 hover:ring-border-hover",
        className
      )}
      onClick={(event) => {
        if (!interactive || !onSelectNode) return;
        event.stopPropagation();
        onSelectNode(node.id);
      }}
    >
      {children}
    </div>
  );
}

function renderNode(
  node: PageNode,
  tokens: DesignSystemTokens,
  breakpoint: Breakpoint,
  selectedNodeId?: string | null,
  onSelectNode?: (nodeId: string) => void,
  interactive = false
): React.ReactNode {
  const style = getNodeStyle(node, breakpoint);
  const children = (node.children ?? []).map((child) =>
    renderNode(child, tokens, breakpoint, selectedNodeId, onSelectNode, interactive)
  );

  switch (node.type) {
    case "page":
      return (
        <Selectable
          key={node.id}
          node={node}
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
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
  className,
  interactive = false,
  scale = 1,
}: ComposeDocumentViewProps) {
  return (
    <div
      className={cn("origin-top-left", className)}
      style={{
        width: BREAKPOINT_WIDTHS[breakpoint],
        transform: `scale(${scale})`,
        transformOrigin: "top left",
      }}
    >
      {renderNode(pageTree, tokens, breakpoint, selectedNodeId, onSelectNode, interactive)}
    </div>
  );
}
