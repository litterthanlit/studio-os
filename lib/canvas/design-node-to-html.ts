// lib/canvas/design-node-to-html.ts
// Pure conversion: DesignNode tree → clean HTML string with inline styles.

import type { DesignNode, DesignNodeStyle } from "./design-node";
import { designStyleToCSS } from "./design-style-to-css";
import type { CSSProperties } from "react";

// ── Style serialization ────────────────────────────────────────────────────

// CSS properties that take px units when given as numbers
const PX_PROPERTIES = new Set([
  "width", "height", "min-width", "min-height", "max-width", "max-height",
  "top", "left", "right", "bottom",
  "padding-top", "padding-right", "padding-bottom", "padding-left",
  "margin-top", "margin-right", "margin-bottom", "margin-left",
  "gap", "row-gap", "column-gap",
  "font-size", "letter-spacing",
  "border-width", "border-radius",
  "outline-width", "outline-offset",
]);

// CSS properties that stay unitless
const UNITLESS_PROPERTIES = new Set([
  "opacity", "z-index", "flex-grow", "flex-shrink", "line-height",
  "font-weight", "order",
]);

function camelToKebab(str: string): string {
  return str.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

/**
 * Convert React CSSProperties to an HTML inline style string.
 * Handles kebab-case conversion, px unit normalization, and value filtering.
 */
export function serializeInlineStyle(css: CSSProperties): string {
  const parts: string[] = [];

  for (const [key, value] of Object.entries(css)) {
    if (value === undefined || value === null || value === "") continue;

    const kebab = camelToKebab(key);

    let serialized: string;
    if (typeof value === "number") {
      if (UNITLESS_PROPERTIES.has(kebab)) {
        serialized = String(value);
      } else if (PX_PROPERTIES.has(kebab)) {
        serialized = `${value}px`;
      } else {
        // Default: add px for numbers on unknown dimensional properties
        serialized = value === 0 ? "0" : `${value}px`;
      }
    } else {
      serialized = String(value);
    }

    parts.push(`${kebab}: ${serialized}`);
  }

  return parts.join("; ");
}

// ── Element mapping helpers ────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function indent(depth: number): string {
  return "  ".repeat(depth);
}

// ── Responsive override collection ─────────────────────────────────────────
// Walks tree in depth-first order (deterministic), emits one rule per node ID.
// Deduplication: each node.id can only appear once (IDs are unique in the tree).

type OverrideRule = { className: string; css: string };

function collectOverrides(node: DesignNode, rules: OverrideRule[]): void {
  const mobileOverrides = node.responsiveOverrides?.mobile;
  if (mobileOverrides && Object.keys(mobileOverrides).length > 0) {
    const overrideCss = designStyleToCSS(mobileOverrides as DesignNodeStyle);
    const serialized = serializeInlineStyle(overrideCss);
    if (serialized) {
      rules.push({ className: `dn-${node.id}`, css: serialized });
    }
  }
  // Recurse children in order — guarantees tree-order emission
  node.children?.forEach((child) => collectOverrides(child, rules));
}

// ── Light color detection (matches renderer logic) ─────────────────────────

function isLightColor(hex?: string): boolean {
  if (!hex || !hex.startsWith("#")) return false;
  let c = hex.replace("#", "");
  if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}

// ── Tree-to-HTML walk ──────────────────────────────────────────────────────

function renderNode(
  node: DesignNode,
  depth: number,
  isExportRoot: boolean,
  hasOverrides: (id: string) => boolean,
): string {
  const pad = indent(depth);
  const css = designStyleToCSS(node.style);
  const styleStr = serializeInlineStyle(css);
  const classAttr = hasOverrides(node.id) ? ` class="dn-${node.id}"` : "";
  const styleAttr = styleStr ? ` style="${escapeHtml(styleStr)}"` : "";

  switch (node.type) {
    case "frame": {
      const tag = isExportRoot ? "section" : "div";
      const hasCover = Boolean(node.style.coverImage);
      const needsScrim = hasCover && (
        node.style.scrimEnabled !== undefined
          ? node.style.scrimEnabled
          : isLightColor(node.style.foreground)
      );

      // Ensure positioned containing block for cover image
      // designStyleToCSS() always sets position, but guard against edge cases
      let finalStyleAttr = styleAttr;
      if (hasCover && !styleStr.includes("position:")) {
        const fixedCss = { ...css, position: "relative" as const };
        const fixedStyleStr = serializeInlineStyle(fixedCss);
        finalStyleAttr = fixedStyleStr ? ` style="${escapeHtml(fixedStyleStr)}"` : "";
      }

      const lines: string[] = [];
      lines.push(`${pad}<${tag}${classAttr}${finalStyleAttr}>`);

      // Cover image — uses explicit top/left/right/bottom (no inset shorthand)
      if (hasCover) {
        const coverStyle = serializeInlineStyle({
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          height: "100%",
          objectFit: node.style.coverSize || "cover",
          objectPosition: node.style.coverPosition || "center",
          zIndex: 0,
          pointerEvents: "none",
        });
        lines.push(`${indent(depth + 1)}<img src="${escapeHtml(node.style.coverImage!)}" alt="" style="${coverStyle}" />`);
      }

      // Scrim
      if (needsScrim) {
        const scrimStyle = serializeInlineStyle({
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.45) 100%)",
          zIndex: 0,
          pointerEvents: "none",
        });
        lines.push(`${indent(depth + 1)}<div style="${scrimStyle}"></div>`);
      }

      // Children — wrap in relative div when cover image present
      if (hasCover && node.children?.length) {
        const wrapStyle = serializeInlineStyle({ position: "relative", zIndex: 1 });
        lines.push(`${indent(depth + 1)}<div style="${wrapStyle}">`);
        for (const child of node.children) {
          lines.push(renderNode(child, depth + 2, false, hasOverrides));
        }
        lines.push(`${indent(depth + 1)}</div>`);
      } else {
        for (const child of node.children ?? []) {
          lines.push(renderNode(child, depth + 1, false, hasOverrides));
        }
      }

      lines.push(`${pad}</${tag}>`);
      return lines.join("\n");
    }

    case "text": {
      const lines: string[] = [];
      const href = node.content?.href;
      const openTag = href
        ? `<a href="${escapeHtml(href)}"${classAttr}${styleAttr}>`
        : `<p${classAttr}${styleAttr}>`;
      const closeTag = href ? "</a>" : "</p>";

      lines.push(`${pad}${openTag}`);

      if (node.content?.kicker) {
        const kickerStyle = serializeInlineStyle({
          display: "block",
          fontSize: 11,
          textTransform: "uppercase" as CSSProperties["textTransform"],
          letterSpacing: "0.05em",
          opacity: 0.5,
          marginBottom: 8,
        });
        lines.push(`${indent(depth + 1)}<span style="${kickerStyle}">${escapeHtml(node.content.kicker)}</span>`);
      }

      if (node.content?.text) {
        lines.push(`${indent(depth + 1)}${escapeHtml(node.content.text)}`);
      }

      if (node.content?.subtext) {
        const subtextStyle = serializeInlineStyle({
          display: "block",
          fontSize: "0.85em",
          opacity: 0.7,
          marginTop: 8,
        });
        lines.push(`${indent(depth + 1)}<span style="${subtextStyle}">${escapeHtml(node.content.subtext)}</span>`);
      }

      lines.push(`${pad}${closeTag}`);
      return lines.join("\n");
    }

    case "image": {
      const src = node.content?.src || "";
      const alt = node.content?.alt || "";
      const href = node.content?.href;

      const imgTag = `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}"${classAttr}${styleAttr} />`;

      if (href) {
        return `${pad}<a href="${escapeHtml(href)}">${imgTag}</a>`;
      }
      return `${pad}${imgTag}`;
    }

    case "button": {
      const label = node.content?.label || node.content?.text || "";
      const href = node.content?.href;

      // href on button → <a role="button"> (valid HTML, no button-in-anchor nesting)
      if (href) {
        return `${pad}<a href="${escapeHtml(href)}" role="button"${classAttr}${styleAttr}>${escapeHtml(label)}</a>`;
      }
      return `${pad}<button${classAttr}${styleAttr}>${escapeHtml(label)}</button>`;
    }

    case "divider": {
      const hrCss = designStyleToCSS(node.style);
      const hrStyle = serializeInlineStyle({
        border: "none",
        borderTop: `${hrCss.borderWidth || 1}px solid ${hrCss.borderColor || "rgba(0,0,0,0.1)"}`,
        width: "100%",
        margin: "0",
      });
      return `${pad}<hr${classAttr} style="${escapeHtml(hrStyle)}" />`;
    }

    default:
      return `${pad}<!-- unknown node type: ${node.type} -->`;
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

export type ExportHTMLOptions = {
  /** "selection" exports the given node as root. "full" exports the entire tree. Default: "full". */
  scope?: "selection" | "full";
};

/**
 * Convert a DesignNode tree to clean HTML with inline styles.
 * Returns an HTML fragment string (no <!DOCTYPE> wrapper).
 */
export function designNodeToHTML(
  node: DesignNode,
  options?: ExportHTMLOptions,
): string {
  // Collect responsive override rules (depth-first, tree order, one per node)
  const overrideRules: OverrideRule[] = [];
  collectOverrides(node, overrideRules);

  const overrideIds = new Set(overrideRules.map((r) => r.className.replace("dn-", "")));
  const hasOverrides = (id: string) => overrideIds.has(id);

  // The passed node is always the export root
  const html = renderNode(node, 0, true, hasOverrides);

  // Prepend responsive style block if any overrides exist
  if (overrideRules.length > 0) {
    const styleLines = [
      "<style>",
      "  @media (max-width: 767px) {",
      ...overrideRules.map((r) => `    .${r.className} { ${r.css} }`),
      "  }",
      "</style>",
      "",
    ];
    return styleLines.join("\n") + html;
  }

  return html;
}
