"use client";

import * as React from "react";
import type { PageNodeStyle } from "@/lib/canvas/compose";

// ─── Style key → CSS property mapping ────────────────────────────────────────

const STYLE_TO_CSS: Record<string, string | string[]> = {
  background: "background-color",
  foreground: "color",
  fontFamily: "font-family",
  fontSize: "font-size",
  fontWeight: "font-weight",
  lineHeight: "line-height",
  letterSpacing: "letter-spacing",
  borderRadius: "border-radius",
  paddingX: ["padding-left", "padding-right"],
  paddingY: ["padding-top", "padding-bottom"],
  gap: "gap",
  columns: "grid-template-columns",
  maxWidth: "max-width",
  minHeight: "min-height",
  opacity: "opacity",
  blur: "filter",
  borderColor: "border-color",
  fontStyle: "font-style",
  textDecoration: "text-decoration",
};

function formatCSSValue(key: string, value: unknown): string {
  if (value === undefined || value === null) return "";

  switch (key) {
    case "fontSize":
    case "letterSpacing":
    case "borderRadius":
    case "paddingX":
    case "paddingY":
    case "gap":
    case "maxWidth":
    case "minHeight":
      return `${value}px`;
    case "lineHeight":
      return String(value);
    case "blur":
      return `blur(${value}px)`;
    case "columns":
      return `repeat(${value}, 1fr)`;
    case "fontWeight":
      return String(value);
    case "opacity":
      return String(value);
    default:
      return String(value);
  }
}

function styleToCSSString(style: PageNodeStyle): string {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(style)) {
    if (value === undefined || value === null) continue;

    const mapping = STYLE_TO_CSS[key];
    if (!mapping) continue;

    const formatted = formatCSSValue(key, value);
    if (!formatted) continue;

    if (Array.isArray(mapping)) {
      for (const prop of mapping) {
        lines.push(`${prop}: ${formatted};`);
      }
    } else {
      lines.push(`${mapping}: ${formatted};`);
    }
  }

  // Handle align → text-align
  if (style.align) {
    lines.push(`text-align: ${style.align};`);
  }

  // Handle direction → flex-direction
  if (style.direction) {
    lines.push(`flex-direction: ${style.direction};`);
  }

  // Handle justify → justify-content
  if (style.justify) {
    const justifyMap: Record<string, string> = {
      start: "flex-start",
      center: "center",
      end: "flex-end",
      between: "space-between",
    };
    lines.push(`justify-content: ${justifyMap[style.justify] ?? style.justify};`);
  }

  return lines.join("\n");
}

// ─── Component ───────────────────────────────────────────────────────────────

type CSSTabProps = {
  resolvedStyle: PageNodeStyle | null;
};

export function CSSTab({ resolvedStyle }: CSSTabProps) {
  const [copied, setCopied] = React.useState(false);

  const cssString = React.useMemo(
    () => (resolvedStyle ? styleToCSSString(resolvedStyle) : ""),
    [resolvedStyle]
  );

  const handleCopy = React.useCallback(async () => {
    if (!cssString) return;
    try {
      await navigator.clipboard.writeText(cssString);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API may fail in non-secure contexts
    }
  }, [cssString]);

  return (
    <div className="p-4 flex flex-col gap-3">
      <h3 className="text-[12px] font-medium text-[#1A1A1A]">Computed CSS</h3>
      <p className="text-[11px] text-[#A0A0A0]">
        Full CSS inspector coming soon
      </p>

      {resolvedStyle && cssString && (
        <>
          <pre
            className="text-[11px] text-[#6B6B6B] bg-[#F5F5F0] rounded-[4px] p-3 overflow-x-auto whitespace-pre-wrap break-all"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            {cssString}
          </pre>

          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-[4px] bg-[#4B57DB] text-white text-[12px] font-medium hover:bg-[#3D49C7] w-full transition-colors"
          >
            {copied ? "Copied!" : "Copy CSS"}
          </button>
        </>
      )}

      {!resolvedStyle && (
        <p className="text-[11px] text-[#A0A0A0]">
          Select a node to see its CSS properties
        </p>
      )}
    </div>
  );
}
