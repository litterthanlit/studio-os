/**
 * Track 10 Phase A — export handoff options (spec: docs/superpowers/specs/2026-04-08-track10-export-handoff-spec.md §4).
 * Lives in local React state (ExportTab); not persisted to project in Phase A.
 */

import type { DesignNode } from "./design-node";

export type ExportScope = "full" | "selection";

/** Fragment: snippet only. Document: HTML5 shell with doctype + viewport. */
export type ExportOutputMode = "fragment" | "document";

/** Which artboard's pageTree feeds export (desktop recommended default). */
export type ExportBreakpointSource = "desktop" | "active";

export type ExportOptions = {
  scope: ExportScope;
  outputMode: ExportOutputMode;
  breakpointSource: ExportBreakpointSource;
};

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  scope: "full",
  outputMode: "fragment",
  breakpointSource: "desktop",
};

/** Count http(s) image URLs in exported subtree (cover images + <img> src). */
export function countExternalImageReferences(root: DesignNode): number {
  let n = 0;

  function visit(node: DesignNode): void {
    const cover = node.style?.coverImage?.trim();
    if (cover && isExternalUrl(cover)) n += 1;

    if (node.type === "image") {
      const src = node.content?.src?.trim();
      if (src && isExternalUrl(src)) n += 1;
    }

    for (const child of node.children ?? []) {
      visit(child);
    }
  }

  visit(root);
  return n;
}

function isExternalUrl(url: string): boolean {
  const t = url.trim().toLowerCase();
  return t.startsWith("http://") || t.startsWith("https://");
}
