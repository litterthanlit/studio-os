"use client";

import type { UnifiedFont } from "./types";

const loadedFonts = new Set<string>();

export function loadGoogleFont(family: string): void {
  const key = `google:${family}`;
  if (loadedFonts.has(key)) return;
  loadedFonts.add(key);
  const link = document.createElement("link");
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;700&display=swap`;
  link.rel = "stylesheet";
  document.head.appendChild(link);
}

export function loadFontshareFont(slug: string): void {
  const key = `fontshare:${slug}`;
  if (loadedFonts.has(key)) return;
  loadedFonts.add(key);
  const link = document.createElement("link");
  link.href = `https://api.fontshare.com/v2/css?f[]=${slug}@400,500,700&display=swap`;
  link.rel = "stylesheet";
  document.head.appendChild(link);
}

export function ensureFontLoaded(font: UnifiedFont): void {
  if (font.source === "google") {
    loadGoogleFont(font.family);
  } else if (font.source === "fontshare" && font.slug) {
    loadFontshareFont(font.slug);
  }
}

export function getFontCssFamily(font: UnifiedFont): string {
  return font.source === "fontshare" ? `"${font.family}", sans-serif` : `"${font.family}", sans-serif`;
}
