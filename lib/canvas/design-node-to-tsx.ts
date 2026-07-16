// lib/canvas/design-node-to-tsx.ts
// DesignNode tree → React + Tailwind TSX (inline style escape hatch for exact values).

import type { CSSProperties } from "react";
import type { DesignNode, DesignNodeStyle } from "./design-node";
import { designStyleToCSS } from "./design-style-to-css";
import { BREAKPOINT_WIDTHS } from "./compose";

const MOBILE_MAX = BREAKPOINT_WIDTHS.mobile;

const SPACING_SCALE: Record<number, string> = {
  0: "0",
  1: "px",
  2: "0.5",
  4: "1",
  6: "1.5",
  8: "2",
  10: "2.5",
  12: "3",
  14: "3.5",
  16: "4",
  20: "5",
  24: "6",
  28: "7",
  32: "8",
  36: "9",
  40: "10",
  44: "11",
  48: "12",
  56: "14",
  64: "16",
  80: "20",
  96: "24",
};

function indent(depth: number): string {
  return "  ".repeat(depth);
}

function escapeJsxString(value: string): string {
  return JSON.stringify(value);
}

function sanitizeArbitrary(value: string): string {
  return value.replace(/\s+/g, "_");
}

function spacingClass(prefix: string, px: number, responsivePrefix = ""): string {
  const token = SPACING_SCALE[px];
  if (token !== undefined) return `${responsivePrefix}${prefix}-${token}`;
  return `${responsivePrefix}${prefix}-[${px}px]`;
}

function colorClass(prefix: "bg" | "text" | "border", value: string, responsivePrefix = ""): string {
  if (value.startsWith("#") || value.startsWith("rgb") || value.startsWith("hsl")) {
    return `${responsivePrefix}${prefix}-[${sanitizeArbitrary(value)}]`;
  }
  return `${responsivePrefix}${prefix}-[${sanitizeArbitrary(value)}]`;
}

function isLightColor(hex?: string): boolean {
  if (!hex || !hex.startsWith("#")) return false;
  let c = hex.replace("#", "");
  if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}

function cssToTailwindAndInline(
  css: CSSProperties,
  responsivePrefix = "",
): { classes: string[]; inline: CSSProperties } {
  const classes: string[] = [];
  const inline: CSSProperties = { ...css };

  const take = (key: keyof CSSProperties, className: string) => {
    if (inline[key] !== undefined) {
      classes.push(`${responsivePrefix}${className}`);
      delete inline[key];
    }
  };

  if (inline.display === "flex") take("display", "flex");
  else if (inline.display === "grid") take("display", "grid");

  if (inline.flexDirection === "column") take("flexDirection", "flex-col");
  else if (inline.flexDirection === "row") take("flexDirection", "flex-row");
  else if (inline.flexDirection === "column-reverse") take("flexDirection", "flex-col-reverse");
  else if (inline.flexDirection === "row-reverse") take("flexDirection", "flex-row-reverse");

  if (inline.flexWrap === "wrap") take("flexWrap", "flex-wrap");
  else if (inline.flexWrap === "nowrap") take("flexWrap", "flex-nowrap");

  const alignMap: Record<string, string> = {
    "flex-start": "items-start",
    center: "items-center",
    "flex-end": "items-end",
    stretch: "items-stretch",
    baseline: "items-baseline",
  };
  if (typeof inline.alignItems === "string" && alignMap[inline.alignItems]) {
    classes.push(`${responsivePrefix}${alignMap[inline.alignItems]}`);
    delete inline.alignItems;
  }

  const justifyMap: Record<string, string> = {
    "flex-start": "justify-start",
    center: "justify-center",
    "flex-end": "justify-end",
    "space-between": "justify-between",
    "space-around": "justify-around",
    "space-evenly": "justify-evenly",
  };
  if (typeof inline.justifyContent === "string" && justifyMap[inline.justifyContent]) {
    classes.push(`${responsivePrefix}${justifyMap[inline.justifyContent]}`);
    delete inline.justifyContent;
  }

  if (typeof inline.gap === "number") {
    classes.push(spacingClass("gap", inline.gap, responsivePrefix));
    delete inline.gap;
  }
  if (typeof inline.rowGap === "number") {
    classes.push(spacingClass("gap-y", inline.rowGap, responsivePrefix));
    delete inline.rowGap;
  }
  if (typeof inline.columnGap === "number") {
    classes.push(spacingClass("gap-x", inline.columnGap, responsivePrefix));
    delete inline.columnGap;
  }

  for (const side of ["Top", "Right", "Bottom", "Left"] as const) {
    const key = `padding${side}` as keyof CSSProperties;
    const value = inline[key];
    if (typeof value === "number") {
      const prefix =
        side === "Top" ? "pt" : side === "Right" ? "pr" : side === "Bottom" ? "pb" : "pl";
      classes.push(spacingClass(prefix, value, responsivePrefix));
      delete inline[key];
    }
  }

  if (inline.width === "100%") take("width", "w-full");
  else if (inline.width === "auto") take("width", "w-auto");
  else if (typeof inline.width === "number") {
    classes.push(spacingClass("w", inline.width, responsivePrefix));
    delete inline.width;
  }

  if (inline.height === "100%") take("height", "h-full");
  else if (inline.height === "auto") take("height", "h-auto");
  else if (typeof inline.height === "number") {
    classes.push(spacingClass("h", inline.height, responsivePrefix));
    delete inline.height;
  }

  if (typeof inline.fontSize === "number") {
    classes.push(`${responsivePrefix}text-[${inline.fontSize}px]`);
    delete inline.fontSize;
  }

  if (typeof inline.fontWeight === "number") {
    classes.push(`${responsivePrefix}font-[${inline.fontWeight}]`);
    delete inline.fontWeight;
  }

  if (typeof inline.lineHeight === "number") {
    classes.push(`${responsivePrefix}leading-[${inline.lineHeight}]`);
    delete inline.lineHeight;
  }

  if (inline.textAlign === "left") take("textAlign", "text-left");
  else if (inline.textAlign === "center") take("textAlign", "text-center");
  else if (inline.textAlign === "right") take("textAlign", "text-right");

  if (typeof inline.color === "string") {
    classes.push(colorClass("text", inline.color, responsivePrefix));
    delete inline.color;
  }

  if (typeof inline.backgroundColor === "string" && !inline.background) {
    classes.push(colorClass("bg", inline.backgroundColor, responsivePrefix));
    delete inline.backgroundColor;
  }

  if (typeof inline.borderColor === "string") {
    classes.push(colorClass("border", inline.borderColor, responsivePrefix));
    delete inline.borderColor;
  }

  if (inline.borderStyle === "solid" && typeof inline.borderWidth === "number") {
    if (inline.borderWidth === 1) classes.push(`${responsivePrefix}border`);
    else classes.push(`${responsivePrefix}border-[${inline.borderWidth}px]`);
    delete inline.borderWidth;
    delete inline.borderStyle;
  }

  if (typeof inline.borderRadius === "number") {
    classes.push(spacingClass("rounded", inline.borderRadius, responsivePrefix));
    delete inline.borderRadius;
  }

  if (typeof inline.opacity === "number") {
    const pct = Math.round(inline.opacity * 100);
    if (pct % 5 === 0 && pct <= 100) {
      classes.push(`${responsivePrefix}opacity-${pct}`);
    } else {
      classes.push(`${responsivePrefix}opacity-[${inline.opacity}]`);
    }
    delete inline.opacity;
  }

  if (inline.position === "absolute") take("position", "absolute");
  else if (inline.position === "relative") take("position", "relative");
  else if (inline.position === "fixed") take("position", "fixed");
  else if (inline.position === "sticky") take("position", "sticky");

  if (typeof inline.top === "number" && inline.top === 0) take("top", "top-0");
  if (typeof inline.left === "number" && inline.left === 0) take("left", "left-0");
  if (typeof inline.right === "number" && inline.right === 0) take("right", "right-0");
  if (typeof inline.bottom === "number" && inline.bottom === 0) take("bottom", "bottom-0");

  if (inline.overflow === "hidden") take("overflow", "overflow-hidden");
  else if (inline.overflow === "auto") take("overflow", "overflow-auto");
  else if (inline.overflow === "scroll") take("overflow", "overflow-scroll");

  if (inline.flexGrow === 1) take("flexGrow", "grow");
  if (inline.flexShrink === 0) take("flexShrink", "shrink-0");

  if (inline.objectFit === "cover") take("objectFit", "object-cover");
  else if (inline.objectFit === "contain") take("objectFit", "object-contain");

  if (typeof inline.maxWidth === "number") {
    classes.push(spacingClass("max-w", inline.maxWidth, responsivePrefix));
    delete inline.maxWidth;
  }

  if (typeof inline.zIndex === "number" && inline.zIndex >= 0 && inline.zIndex <= 50) {
    classes.push(`${responsivePrefix}z-${inline.zIndex}`);
    delete inline.zIndex;
  }

  return { classes, inline };
}

function styleFromNode(style: DesignNodeStyle, responsivePrefix = ""): {
  className: string;
  styleAttr: string;
} {
  const css = designStyleToCSS(style);
  const { classes, inline } = cssToTailwindAndInline(css, responsivePrefix);
  const className = classes.filter(Boolean).join(" ");
  const styleAttr = serializeJsxStyle(inline);
  return { className, styleAttr };
}

function serializeJsxStyle(css: CSSProperties): string {
  const entries = Object.entries(css).filter(
    ([, value]) => value !== undefined && value !== null && value !== "",
  );
  if (entries.length === 0) return "";

  const parts = entries.map(([key, value]) => {
    if (typeof value === "number") {
      const pxProps = new Set([
        "width",
        "height",
        "top",
        "left",
        "right",
        "bottom",
        "paddingTop",
        "paddingRight",
        "paddingBottom",
        "paddingLeft",
        "marginTop",
        "marginRight",
        "marginBottom",
        "marginLeft",
        "fontSize",
        "borderWidth",
        "borderRadius",
        "gap",
        "rowGap",
        "columnGap",
        "letterSpacing",
        "minWidth",
        "minHeight",
        "maxWidth",
        "maxHeight",
      ]);
      const serialized = pxProps.has(key) && value !== 0 ? `${value}px` : String(value);
      return `${key}: ${JSON.stringify(serialized)}`;
    }
    return `${key}: ${JSON.stringify(String(value))}`;
  });

  return ` style={{ ${parts.join(", ")} }}`;
}

function attrs(className: string, styleAttr: string): string {
  const classAttr = className ? ` className="${className}"` : "";
  return `${classAttr}${styleAttr}`;
}

function mobileResponsivePrefix(): string {
  return `max-[${MOBILE_MAX}px]:`;
}

function responsiveClassesForNode(node: DesignNode): string[] {
  const mobile = node.responsiveOverrides?.mobile;
  if (!mobile || Object.keys(mobile).length === 0) return [];
  const css = designStyleToCSS(mobile as DesignNodeStyle);
  return cssToTailwindAndInline(css, mobileResponsivePrefix()).classes;
}

function renderNode(
  node: DesignNode,
  depth: number,
  isExportRoot: boolean,
): string {
  const pad = indent(depth);
  const { className, styleAttr } = styleFromNode(node.style);
  const mergedClass = [className, ...responsiveClassesForNode(node)].filter(Boolean).join(" ");

  switch (node.type) {
    case "frame": {
      const tag = isExportRoot ? "section" : "div";
      const hasCover = Boolean(node.style.coverImage);
      const needsScrim =
        hasCover &&
        (node.style.scrimEnabled !== undefined
          ? node.style.scrimEnabled
          : isLightColor(node.style.foreground));

      const lines: string[] = [];
      lines.push(`${pad}<${tag}${attrs(mergedClass, styleAttr)}>`);

      if (hasCover) {
        const coverStyle = serializeJsxStyle({
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
        lines.push(
          `${indent(depth + 1)}<img src=${escapeJsxString(node.style.coverImage!)} alt=""${coverStyle} />`,
        );
      }

      if (needsScrim) {
        const scrimStyle = serializeJsxStyle({
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.45) 100%)",
          zIndex: 0,
          pointerEvents: "none",
        });
        lines.push(`${indent(depth + 1)}<div${scrimStyle} />`);
      }

      if (hasCover && node.children?.length) {
        const wrapStyle = serializeJsxStyle({ position: "relative", zIndex: 1 });
        lines.push(`${indent(depth + 1)}<div className="relative z-[1]"${wrapStyle}>`);
        for (const child of node.children) {
          lines.push(renderNode(child, depth + 2, false));
        }
        lines.push(`${indent(depth + 1)}</div>`);
      } else {
        for (const child of node.children ?? []) {
          lines.push(renderNode(child, depth + 1, false));
        }
      }

      lines.push(`${pad}</${tag}>`);
      return lines.join("\n");
    }

    case "text": {
      const href = node.content?.href;
      const tag = href ? "a" : "p";
      const hrefAttr = href ? ` href=${escapeJsxString(href)}` : "";
      const lines: string[] = [];
      lines.push(`${pad}<${tag}${hrefAttr}${attrs(mergedClass, styleAttr)}>`);

      if (node.content?.kicker) {
        lines.push(
          `${indent(depth + 1)}<span className="block text-[11px] uppercase tracking-[0.05em] opacity-50 mb-2">`,
        );
        lines.push(`${indent(depth + 2)}{${escapeJsxString(node.content.kicker)}}`);
        lines.push(`${indent(depth + 1)}</span>`);
      }

      if (node.content?.text) {
        lines.push(`${indent(depth + 1)}{${escapeJsxString(node.content.text)}}`);
      }

      if (node.content?.subtext) {
        lines.push(`${indent(depth + 1)}<span className="block text-[0.85em] opacity-70 mt-2">`);
        lines.push(`${indent(depth + 2)}{${escapeJsxString(node.content.subtext)}}`);
        lines.push(`${indent(depth + 1)}</span>`);
      }

      lines.push(`${pad}</${tag}>`);
      return lines.join("\n");
    }

    case "image": {
      const src = node.content?.src || "";
      const alt = node.content?.alt || "";
      const href = node.content?.href;
      const img = `<img src=${escapeJsxString(src)} alt=${escapeJsxString(alt)}${attrs(mergedClass, styleAttr)} />`;
      if (href) {
        return `${pad}<a href=${escapeJsxString(href)}>${img}</a>`;
      }
      return `${pad}${img}`;
    }

    case "button": {
      const label = node.content?.label || node.content?.text || "";
      const href = node.content?.href;
      if (href) {
        return `${pad}<a href=${escapeJsxString(href)} role="button"${attrs(mergedClass, styleAttr)}>{${escapeJsxString(label)}}</a>`;
      }
      return `${pad}<button type="button"${attrs(mergedClass, styleAttr)}>{${escapeJsxString(label)}}</button>`;
    }

    case "divider": {
      const hrStyle = serializeJsxStyle({
        border: "none",
        borderTop: `${node.style.borderWidth ?? 1}px solid ${node.style.borderColor ?? "rgba(0,0,0,0.1)"}`,
        width: "100%",
        margin: 0,
      });
      return `${pad}<hr${attrs(mergedClass, "")}${hrStyle} />`;
    }

    default:
      return `${pad}{/* unknown node type: ${node.type} */}`;
  }
}

export type DesignNodeToTSXOptions = {
  componentName?: string;
};

export function designNodeToTSX(
  node: DesignNode,
  options?: DesignNodeToTSXOptions,
): string {
  const componentName = options?.componentName ?? "StudioExport";
  const body = renderNode(node, 2, true);

  return `/** Generated by Studio OS — React + Tailwind export */
export function ${componentName}() {
  return (
${body}
  );
}
`;
}
