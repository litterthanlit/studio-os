// app/canvas-v1/components/ComposeDocumentViewV6.tsx
// V6 renderer — renders DesignNode trees as live HTML/CSS.
// Phase 1a: render only, no interaction. Interaction added in Phase 1b.

"use client";

import React from "react";
import type { DesignNode } from "@/lib/canvas/design-node";
import { designStyleToCSS } from "@/lib/canvas/design-style-to-css";

// ── Cover Image (positioned background image for frames) ────────────

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

// ── Scrim (gradient overlay for text readability over cover images) ──
// TEMPORARY for proof gate. In production this should be:
// - style-driven (a coverScrim property on DesignNodeStyle)
// - or user-configurable in the inspector
// - NOT hardcoded as a universal default on every cover-image frame

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

// ── Text Content Renderer ───────────────────────────────────────────

function TextContent({ content }: { content?: DesignNode["content"] }) {
  if (!content) return null;
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
      {content.text && <span style={{ display: "block" }}>{content.text}</span>}
      {content.subtext && (
        <span style={{ display: "block", marginTop: 8, fontSize: "0.85em", opacity: 0.7 }}>
          {content.subtext}
        </span>
      )}
    </>
  );
}

// ── Main Render Function ────────────────────────────────────────────

function renderDesignNode(node: DesignNode): React.ReactNode {
  const cssStyle = designStyleToCSS(node.style);

  switch (node.type) {
    case "frame": {
      const hasCover = Boolean(node.style.coverImage);
      const needsScrim = hasCover && isLightColor(node.style.foreground);

      const frameStyle: React.CSSProperties = {
        ...cssStyle,
        ...(hasCover ? { position: "relative", overflow: "hidden" } : {}),
        boxSizing: "border-box",
      };

      return (
        <div key={node.id} data-node-id={node.id} style={frameStyle}>
          {hasCover && <CoverImage src={node.style.coverImage!} size={node.style.coverSize} position={node.style.coverPosition} />}
          {needsScrim && <CoverScrim />}
          {node.children?.map((child) => {
            if (hasCover) {
              return (
                <div key={child.id} style={{ position: "relative", zIndex: 1 }}>
                  {renderDesignNode(child)}
                </div>
              );
            }
            return <React.Fragment key={child.id}>{renderDesignNode(child)}</React.Fragment>;
          })}
        </div>
      );
    }

    case "text": {
      return (
        <div key={node.id} data-node-id={node.id} style={{ ...cssStyle, boxSizing: "border-box" }}>
          <TextContent content={node.content} />
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
          style={{ ...cssStyle, display: "block", boxSizing: "border-box" }}
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
            cursor: "pointer",
            boxSizing: "border-box",
          }}
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
          }}
        />
      );
    }

    default:
      return null;
  }
}

// ── Light color detection (for scrim logic) ─────────────────────────

function isLightColor(hex?: string): boolean {
  if (!hex || !hex.startsWith("#")) return false;
  let c = hex.replace("#", "");
  // Expand 3-char hex to 6-char: #FFF → #FFFFFF
  if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  if (c.length !== 6) return false;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6;
}

// ── Public Component ────────────────────────────────────────────────

export function ComposeDocumentViewV6({ tree }: { tree: DesignNode }) {
  return (
    <div style={{ width: "100%", overflow: "hidden" }}>
      {renderDesignNode(tree)}
    </div>
  );
}
