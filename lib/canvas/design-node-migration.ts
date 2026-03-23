// lib/canvas/design-node-migration.ts
// Converts V5 PageNode trees to V6 DesignNode trees.
// Run at load time for old projects. New generations emit DesignNode directly.

import type { PageNode, PageNodeStyle, PageNodeContent } from "./compose";
import type { DesignSystemTokens } from "./generate-system";
import type { DesignNode, DesignNodeStyle, DesignNodeContent } from "./design-node";
import { nanoid } from "nanoid";

// Default tokens for migration when project tokens aren't available
const FALLBACK_TOKENS: Pick<DesignSystemTokens, "colors" | "shadows"> = {
  colors: {
    primary: "#111111",
    secondary: "#555555",
    accent: "#2563EB",
    background: "#FFFFFF",
    surface: "#F5F5F5",
    text: "#111111",
    textMuted: "#6B7280",
    border: "#E5E7EB",
  },
  shadows: {
    sm: "0 1px 2px rgba(0,0,0,0.05)",
    md: "0 4px 6px rgba(0,0,0,0.1)",
    lg: "0 10px 15px rgba(0,0,0,0.1)",
  },
};

function makeId(): string {
  return nanoid(8);
}

const CONTAINER_TYPES = new Set([
  "page", "section", "button-row", "metric-row", "logo-row",
  "feature-grid", "testimonial-grid", "pricing-grid",
  "feature-card", "testimonial-card", "pricing-tier",
]);

function migrateStyle(
  old: PageNodeStyle | undefined,
  tokens: Pick<DesignSystemTokens, "colors" | "shadows">,
  nodeType?: string
): DesignNodeStyle {
  if (!old) return {};
  const style: DesignNodeStyle = {};
  const isContainer = nodeType ? CONTAINER_TYPES.has(nodeType) : true;

  if (old.minHeight) style.height = old.minHeight;
  if (old.maxWidth) style.maxWidth = old.maxWidth;

  if (isContainer) {
    if (old.columns) {
      style.display = "grid";
      style.gridTemplate = `repeat(${old.columns}, 1fr)`;
    } else if (old.direction === "row") {
      style.display = "flex";
      style.flexDirection = "row";
    } else {
      style.display = "flex";
      style.flexDirection = "column";
    }
  }

  if (old.gap != null) style.gap = old.gap;

  if (old.align === "left") {
    style.alignItems = "flex-start";
    style.textAlign = "left";
  } else if (old.align === "center") {
    style.alignItems = "center";
    style.textAlign = "center";
  } else if (old.align === "right") {
    style.alignItems = "flex-end";
    style.textAlign = "right";
  }

  if (old.justify === "start") style.justifyContent = "flex-start";
  else if (old.justify === "center") style.justifyContent = "center";
  else if (old.justify === "end") style.justifyContent = "flex-end";
  else if (old.justify === "between") style.justifyContent = "space-between";

  if (old.paddingX != null || old.paddingY != null) {
    style.padding = {
      top: old.paddingY,
      right: old.paddingX,
      bottom: old.paddingY,
      left: old.paddingX,
    };
  }

  if (old.fontFamily) style.fontFamily = old.fontFamily;
  if (old.fontSize != null) style.fontSize = old.fontSize;
  if (old.fontWeight != null) style.fontWeight = old.fontWeight;
  if (old.lineHeight != null) style.lineHeight = old.lineHeight;
  if (old.letterSpacing != null) style.letterSpacing = old.letterSpacing;
  if (old.fontStyle) style.fontStyle = old.fontStyle;
  if (old.textDecoration) style.textDecoration = old.textDecoration;

  if (old.background) style.background = old.background;
  if (old.foreground) style.foreground = old.foreground;
  if (old.muted) style.muted = old.muted;
  if (old.accent) style.accent = old.accent;
  if (old.borderColor) style.borderColor = old.borderColor;
  if (old.borderRadius != null) style.borderRadius = old.borderRadius;
  if (old.opacity != null) style.opacity = old.opacity;
  if (old.blur != null) style.blur = old.blur;

  if (old.shadow === "soft") style.shadow = tokens.shadows.sm;
  else if (old.shadow === "medium") style.shadow = tokens.shadows.md;

  if (old.emphasized === true) {
    style.background = tokens.colors.accent;
    style.foreground = "#FFFFFF";
  } else if (old.emphasized === false) {
    style.background = "transparent";
    style.foreground = tokens.colors.text;
    style.borderColor = tokens.colors.border;
  }

  return style;
}

function migrateContent(old: PageNodeContent | undefined): DesignNodeContent | undefined {
  if (!old) return undefined;
  const content: DesignNodeContent = {};
  if (old.text) content.text = old.text;
  if (old.subtext) content.subtext = old.subtext;
  if (old.kicker) content.kicker = old.kicker;
  if (old.label) content.label = old.label;
  if (old.href) content.href = old.href;
  if (old.icon) content.icon = old.icon;
  if (old.price) content.price = old.price;
  if (old.badge) content.badge = old.badge;
  if (old.meta) content.meta = old.meta;
  return Object.keys(content).length > 0 ? content : undefined;
}

function decomposeCardContent(
  node: PageNode,
  tokens: Pick<DesignSystemTokens, "colors" | "shadows">
): DesignNode[] {
  const children: DesignNode[] = [];
  const c = node.content;
  if (!c) return children;

  if (c.icon) {
    children.push({
      id: `text-${makeId()}`, type: "text", name: "icon",
      style: { fontSize: 24 },
      content: { text: c.icon },
    });
  }
  if (c.badge) {
    const badgeTone = node.style?.badgeTone;
    const badgeStyle: DesignNodeStyle = { fontSize: 12, borderRadius: 4 };
    if (badgeTone === "accent") {
      badgeStyle.background = tokens.colors.accent;
      badgeStyle.foreground = "#FFFFFF";
    } else if (badgeTone === "outline") {
      badgeStyle.borderColor = tokens.colors.border;
      badgeStyle.borderWidth = 1;
      badgeStyle.background = "transparent";
    } else {
      badgeStyle.background = tokens.colors.surface;
    }
    badgeStyle.padding = { top: 4, right: 8, bottom: 4, left: 8 };
    children.push({
      id: `text-${makeId()}`, type: "text", name: "badge",
      style: badgeStyle,
      content: { text: c.badge },
    });
  }
  if (c.price) {
    children.push({
      id: `text-${makeId()}`, type: "text", name: "price",
      style: { fontSize: 36, fontWeight: 700 },
      content: { text: c.price },
    });
  }
  if (c.text) {
    const isQuote = node.type === "testimonial-card";
    children.push({
      id: `text-${makeId()}`, type: "text", name: isQuote ? "quote" : "title",
      style: {
        fontSize: node.style?.fontSize || 18,
        fontWeight: node.style?.fontWeight || 500,
        ...(isQuote ? { fontStyle: "italic" as const } : {}),
      },
      content: { text: c.text },
    });
  }
  if (c.subtext) {
    children.push({
      id: `text-${makeId()}`, type: "text", name: "description",
      style: { fontSize: 14, foreground: node.style?.muted || tokens.colors.textMuted },
      content: { text: c.subtext },
    });
  }
  if (c.meta) {
    children.push({
      id: `text-${makeId()}`, type: "text", name: "meta",
      style: { fontSize: 12, foreground: node.style?.muted || tokens.colors.textMuted },
      content: { text: c.meta },
    });
  }
  if (c.mediaUrl) {
    children.push({
      id: `image-${makeId()}`, type: "image", name: "media",
      style: { objectFit: "cover", borderRadius: node.style?.borderRadius },
      content: { src: c.mediaUrl, alt: c.mediaAlt || "" },
    });
  }

  return children;
}

function migrateStyleOverride(
  old: Partial<PageNodeStyle>,
  tokens: Pick<DesignSystemTokens, "colors" | "shadows">
): Partial<DesignNodeStyle> {
  const style: Partial<DesignNodeStyle> = {};

  if (old.minHeight != null) style.height = old.minHeight;
  if (old.maxWidth != null) style.maxWidth = old.maxWidth;
  if (old.columns != null) {
    style.display = "grid";
    style.gridTemplate = `repeat(${old.columns}, 1fr)`;
  }
  if (old.direction != null) {
    style.display = "flex";
    style.flexDirection = old.direction;
  }
  if (old.gap != null) style.gap = old.gap;
  if (old.align != null) {
    if (old.align === "left") { style.alignItems = "flex-start"; style.textAlign = "left"; }
    else if (old.align === "center") { style.alignItems = "center"; style.textAlign = "center"; }
    else if (old.align === "right") { style.alignItems = "flex-end"; style.textAlign = "right"; }
  }
  if (old.justify != null) {
    if (old.justify === "start") style.justifyContent = "flex-start";
    else if (old.justify === "center") style.justifyContent = "center";
    else if (old.justify === "end") style.justifyContent = "flex-end";
    else if (old.justify === "between") style.justifyContent = "space-between";
  }
  if (old.paddingX != null || old.paddingY != null) {
    style.padding = {};
    if (old.paddingX != null) { style.padding.left = old.paddingX; style.padding.right = old.paddingX; }
    if (old.paddingY != null) { style.padding.top = old.paddingY; style.padding.bottom = old.paddingY; }
  }

  if (old.fontFamily != null) style.fontFamily = old.fontFamily;
  if (old.fontSize != null) style.fontSize = old.fontSize;
  if (old.fontWeight != null) style.fontWeight = old.fontWeight;
  if (old.lineHeight != null) style.lineHeight = old.lineHeight;
  if (old.letterSpacing != null) style.letterSpacing = old.letterSpacing;
  if (old.fontStyle != null) style.fontStyle = old.fontStyle;
  if (old.textDecoration != null) style.textDecoration = old.textDecoration;

  if (old.background != null) style.background = old.background;
  if (old.foreground != null) style.foreground = old.foreground;
  if (old.muted != null) style.muted = old.muted;
  if (old.accent != null) style.accent = old.accent;
  if (old.borderColor != null) style.borderColor = old.borderColor;
  if (old.borderRadius != null) style.borderRadius = old.borderRadius;
  if (old.opacity != null) style.opacity = old.opacity;
  if (old.blur != null) style.blur = old.blur;
  if (old.shadow === "soft") style.shadow = tokens.shadows.sm;
  else if (old.shadow === "medium") style.shadow = tokens.shadows.md;

  return style;
}

export function pageNodeToDesignNode(
  node: PageNode,
  tokens?: Pick<DesignSystemTokens, "colors" | "shadows">
): DesignNode {
  const t = tokens || FALLBACK_TOKENS;
  const style = migrateStyle(node.style, t, node.type);
  const content = migrateContent(node.content);

  const isSectionLevel = node.type === "page" || node.type === "section";
  if (isSectionLevel && node.content?.mediaUrl) {
    style.coverImage = node.content.mediaUrl;
    style.coverSize = "cover";
  }

  let type: DesignNode["type"];
  let extraChildren: DesignNode[] = [];

  switch (node.type) {
    case "page":
    case "section":
    case "button-row":
    case "metric-row":
    case "logo-row":
    case "feature-grid":
    case "testimonial-grid":
    case "pricing-grid":
      type = "frame";
      break;

    case "heading":
    case "paragraph":
    case "metric-item":
      type = "text";
      break;

    case "button":
      type = "button";
      break;

    case "logo-item":
      type = "image";
      if (node.content?.mediaUrl) {
        if (!content) break;
        content.src = node.content.mediaUrl;
        content.alt = node.content.mediaAlt || "";
      }
      break;

    case "feature-card":
    case "testimonial-card":
    case "pricing-tier":
      type = "frame";
      extraChildren = decomposeCardContent(node, t);
      break;

    default:
      type = "frame";
  }

  const migratedChildren = node.children?.map((child) => pageNodeToDesignNode(child, t)) || [];
  const allChildren = [...extraChildren, ...migratedChildren];

  // For decomposed card types, content is now in child nodes — don't duplicate on parent.
  const isDecomposedCard = extraChildren.length > 0;
  const resolvedContent = isDecomposedCard
    ? (content?.href ? { href: content.href } : undefined)
    : (type === "frame" ? undefined : content);

  return {
    id: node.id,
    type,
    name: node.name || node.type,
    style,
    content: resolvedContent,
    children: allChildren.length > 0 ? allChildren : undefined,
    responsiveOverrides: node.responsiveOverrides
      ? (Object.fromEntries(
          Object.entries(node.responsiveOverrides).map(([bp, overrideStyle]) => [
            bp,
            migrateStyleOverride(overrideStyle as PageNodeStyle, t),
          ])
        ) as DesignNode["responsiveOverrides"])
      : undefined,
    hidden: node.hidden,
  };
}
