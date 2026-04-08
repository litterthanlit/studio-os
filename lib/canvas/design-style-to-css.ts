// lib/canvas/design-style-to-css.ts
// Converts DesignNodeStyle to React CSSProperties.
// This is the ONLY place where DesignNode styles become CSS.

import type { DesignNodeStyle } from "./design-node";
import type { CSSProperties } from "react";
import { blurEffectsToCss, normalizeLegacyEffects, shadowEffectsToCss } from "./design-effects";

export function designStyleToCSS(style: DesignNodeStyle): CSSProperties {
  const css: CSSProperties = {};

  // ── Positioning ──
  if (style.position === "absolute") {
    css.position = "absolute";
    if (style.x != null) css.left = style.x;
    if (style.y != null) css.top = style.y;
  } else {
    css.position = "relative";
  }

  if (style.width != null) {
    if (style.width === "fill") css.width = "100%";
    else if (style.width === "hug") css.width = "auto";
    else css.width = style.width;
  }
  if (style.height != null) {
    if (style.height === "fill") css.height = "100%";
    else if (style.height === "hug") css.height = "auto";
    else css.height = style.height;
  }

  if (style.zIndex != null) css.zIndex = style.zIndex;
  if (style.overflow) css.overflow = style.overflow;

  // ── Layout ──
  // IMPORTANT: Only set display when explicitly defined in style.
  // Leaf nodes (text, image, button, divider) should NOT get display: flex.
  if (style.display === "grid") {
    css.display = "grid";
    if (style.gridTemplate) css.gridTemplateColumns = style.gridTemplate;
  } else if (style.display === "flex" || style.flexDirection) {
    css.display = "flex";
    css.flexDirection = style.flexDirection || "column";
  }

  if (style.gap != null) css.gap = style.gap;
  if (style.alignItems) css.alignItems = style.alignItems;
  if (style.justifyContent) css.justifyContent = style.justifyContent;
  if (style.flexGrow != null) css.flexGrow = style.flexGrow;
  if (style.flexShrink != null) css.flexShrink = style.flexShrink;
  if (style.aspectRatio != null) css.aspectRatio = style.aspectRatio;

  // ── Spacing ──
  if (style.padding) {
    if (style.padding.top != null) css.paddingTop = style.padding.top;
    if (style.padding.right != null) css.paddingRight = style.padding.right;
    if (style.padding.bottom != null) css.paddingBottom = style.padding.bottom;
    if (style.padding.left != null) css.paddingLeft = style.padding.left;
  }

  // ── Typography ──
  if (style.fontFamily) css.fontFamily = style.fontFamily;
  if (style.fontSize != null) css.fontSize = style.fontSize;
  if (style.fontWeight != null) css.fontWeight = style.fontWeight;
  if (style.lineHeight != null) css.lineHeight = style.lineHeight;
  if (style.letterSpacing != null) css.letterSpacing = `${style.letterSpacing}em`;
  if (style.fontStyle) css.fontStyle = style.fontStyle;
  if (style.textDecoration) css.textDecoration = style.textDecoration;
  if (style.textAlign) css.textAlign = style.textAlign;

  // ── Visual ──
  if (style.background) css.backgroundColor = style.background;
  if (style.gradient && style.gradient.stops.length >= 2) {
    const g = style.gradient;
    const interp = g.interpolation === "oklch" ? "in oklch shorter hue, " : "";
    const stops = g.stops
      .map((stop) => `${stop.color} ${stop.position}%`)
      .join(", ");

    if (g.type === "linear") {
      const angle = g.angle ?? 180; // default top-to-bottom
      css.background = `linear-gradient(${interp}${angle}deg, ${stops})`;
    } else if (g.type === "radial") {
      const cx = g.position?.x ?? 50;
      const cy = g.position?.y ?? 50;
      css.background = `radial-gradient(${interp}circle at ${cx}% ${cy}%, ${stops})`;
    }
  }
  if (style.foreground) css.color = style.foreground;
  if (style.borderColor) css.borderColor = style.borderColor;
  if (style.borderWidth != null) {
    css.borderWidth = style.borderWidth;
    css.borderStyle = "solid";
  }
  if (style.borderRadius != null) css.borderRadius = style.borderRadius;
  if (style.opacity != null) css.opacity = style.opacity;
  const normalizedEffects = normalizeLegacyEffects(style);
  if (normalizedEffects && normalizedEffects.length > 0) {
    const boxShadow = shadowEffectsToCss(normalizedEffects);
    const { filter, backdropFilter } = blurEffectsToCss(normalizedEffects);
    if (boxShadow) css.boxShadow = boxShadow;
    if (filter) css.filter = filter;
    if (backdropFilter) {
      css.backdropFilter = backdropFilter;
      // @ts-expect-error webkit prefixed property for Safari compatibility
      css.WebkitBackdropFilter = backdropFilter;
    }
  } else {
    if (style.shadow) css.boxShadow = style.shadow;
    if (style.blur != null) css.filter = `blur(${style.blur}px)`;
  }
  if (style.objectFit) css.objectFit = style.objectFit;
  if (style.maxWidth != null) {
    css.maxWidth = typeof style.maxWidth === "number" ? style.maxWidth : style.maxWidth;
  }

  return css;
}
