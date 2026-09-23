// lib/canvas/font-links.ts
// Font stylesheet links for rendered/exported DesignNode trees.
// Shared by the screenshot wrapper, document-mode HTML export (ZIP + publish),
// and the editor's runtime font loader (`lib/fonts/load-font.ts`).

import { fontshareFonts } from "@/lib/fonts/fontshare-catalog";
import type { DesignNode } from "./design-node";

export type FontSource = "google" | "fontshare";

export type DesignFontLink = {
  family: string;
  source: FontSource;
  href: string;
};

/** Generic CSS families and OS-installed fonts that need no stylesheet. */
const NON_WEB_FAMILIES = new Set(
  [
    "serif",
    "sans-serif",
    "monospace",
    "cursive",
    "fantasy",
    "system-ui",
    "ui-serif",
    "ui-sans-serif",
    "ui-monospace",
    "ui-rounded",
    "emoji",
    "math",
    "fangsong",
    "inherit",
    "initial",
    "unset",
    "revert",
    "-apple-system",
    "blinkmacsystemfont",
    "segoe ui",
    "helvetica",
    "helvetica neue",
    "arial",
    "georgia",
    "times",
    "times new roman",
    "courier",
    "courier new",
    "menlo",
    "monaco",
    "consolas",
    "sf pro",
    "sf pro display",
    "sf pro text",
    "sf mono",
  ].map((f) => f.toLowerCase()),
);

const FONTSHARE_BY_FAMILY = new Map(
  fontshareFonts
    .filter((font) => font.slug)
    .map((font) => [font.family.toLowerCase(), font.slug as string]),
);

/** Google Fonts css2 URL. Missing weights are tolerated by the API. */
export function googleFontHref(family: string, weights: number[] = [400, 500, 600, 700]): string {
  const name = encodeURIComponent(family).replace(/%20/g, "+");
  return `https://fonts.googleapis.com/css2?family=${name}:wght@${weights.join(";")}&display=swap`;
}

export function fontshareFontHref(slug: string, weights: number[] = [400, 500, 700]): string {
  return `https://api.fontshare.com/v2/css?f[]=${slug}@${weights.join(",")}&display=swap`;
}

/** First family in a CSS font stack, unquoted. `'"Playfair Display", serif'` → `Playfair Display`. */
export function primaryFontFamily(stack: string): string | null {
  const first = stack.split(",")[0]?.trim().replace(/^["']|["']$/g, "").trim();
  return first ? first : null;
}

/** True when the family needs a web font stylesheet (not generic, not a system font). */
export function isWebFontFamily(family: string): boolean {
  return !NON_WEB_FAMILIES.has(family.trim().toLowerCase());
}

/**
 * Unique web-font families used by a tree, in first-seen order.
 * Includes `responsiveOverrides` so mobile-only fonts are loaded too.
 */
export function collectDesignFontFamilies(tree: DesignNode): string[] {
  const seen = new Map<string, string>();
  const add = (stack: unknown) => {
    if (typeof stack !== "string") return;
    const family = primaryFontFamily(stack);
    if (!family || !isWebFontFamily(family)) return;
    const key = family.toLowerCase();
    if (!seen.has(key)) seen.set(key, family);
  };

  const visit = (node: DesignNode) => {
    add(node.style?.fontFamily);
    if (node.responsiveOverrides) {
      for (const override of Object.values(node.responsiveOverrides)) {
        add(override?.fontFamily);
      }
    }
    node.children?.forEach(visit);
  };
  visit(tree);
  return [...seen.values()];
}

/** Fontshare when the family is in the catalog, otherwise Google Fonts. */
export function resolveFontLink(family: string): DesignFontLink {
  const slug = FONTSHARE_BY_FAMILY.get(family.toLowerCase());
  if (slug) {
    return { family, source: "fontshare", href: fontshareFontHref(slug) };
  }
  return { family, source: "google", href: googleFontHref(family) };
}

/** One link per family so an unknown family can't fail the others. */
export function buildDesignFontLinks(families: string[]): DesignFontLink[] {
  return families.map(resolveFontLink);
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/** `<link>` tags (with preconnects) for the given font links; empty string when none. */
export function renderFontLinkTags(links: DesignFontLink[]): string {
  if (links.length === 0) return "";
  const lines: string[] = [];
  if (links.some((l) => l.source === "google")) {
    lines.push(
      `<link rel="preconnect" href="https://fonts.googleapis.com">`,
      `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`,
    );
  }
  if (links.some((l) => l.source === "fontshare")) {
    lines.push(`<link rel="preconnect" href="https://api.fontshare.com">`);
  }
  for (const link of links) {
    lines.push(`<link href="${escapeAttr(link.href)}" rel="stylesheet">`);
  }
  return lines.join("\n");
}

/** Convenience: collect → resolve → render for a tree. */
export function designFontLinkTags(tree: DesignNode, extraFamilies: string[] = []): string {
  const families = collectDesignFontFamilies(tree);
  for (const extra of extraFamilies) {
    if (!families.some((f) => f.toLowerCase() === extra.toLowerCase())) families.push(extra);
  }
  return renderFontLinkTags(buildDesignFontLinks(families));
}
