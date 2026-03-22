/**
 * FONT_LIBRARY — curated web font list for the inspector font selector.
 *
 * Fonts are grouped by category. Values use the CSS font-family stack
 * format used by InspectorSkeleton and InspectorPanelV3 (e.g. "'Inter', sans-serif").
 * NodeFormatToolbar uses bare family names — use FONT_LIBRARY_BARE for that.
 */

export type FontEntry = {
  family: string;
  /** CSS font-family value (with fallback stack) */
  value: string;
  category: "sans-serif" | "serif" | "mono" | "display";
};

export const FONT_LIBRARY: FontEntry[] = [
  // ── Sans-serif ──────────────────────────────────────────────────────────
  { family: "Inter",             value: "'Inter', sans-serif",             category: "sans-serif" },
  { family: "Geist Sans",        value: "'Geist Sans', sans-serif",        category: "sans-serif" },
  { family: "Space Grotesk",     value: "'Space Grotesk', sans-serif",     category: "sans-serif" },
  { family: "DM Sans",           value: "'DM Sans', sans-serif",           category: "sans-serif" },
  { family: "Plus Jakarta Sans", value: "'Plus Jakarta Sans', sans-serif", category: "sans-serif" },
  { family: "Outfit",            value: "'Outfit', sans-serif",            category: "sans-serif" },
  { family: "Sora",              value: "'Sora', sans-serif",              category: "sans-serif" },
  { family: "Manrope",           value: "'Manrope', sans-serif",           category: "sans-serif" },
  { family: "Satoshi",           value: "'Satoshi', sans-serif",           category: "sans-serif" },
  { family: "General Sans",      value: "'General Sans', sans-serif",      category: "sans-serif" },
  { family: "Switzer",           value: "'Switzer', sans-serif",           category: "sans-serif" },
  { family: "Neue Montreal",     value: "'Neue Montreal', sans-serif",     category: "sans-serif" },

  // ── Display ─────────────────────────────────────────────────────────────
  { family: "Clash Display",     value: "'Clash Display', sans-serif",     category: "display" },
  { family: "Cabinet Grotesk",   value: "'Cabinet Grotesk', sans-serif",   category: "display" },

  // ── Serif ────────────────────────────────────────────────────────────────
  { family: "Instrument Serif",  value: "'Instrument Serif', serif",       category: "serif" },
  { family: "Playfair Display",  value: "'Playfair Display', serif",       category: "serif" },
  { family: "Fraunces",          value: "'Fraunces', serif",               category: "serif" },
  { family: "Libre Baskerville", value: "'Libre Baskerville', serif",      category: "serif" },
  { family: "Lora",              value: "'Lora', serif",                   category: "serif" },
  { family: "Source Serif 4",    value: "'Source Serif 4', serif",         category: "serif" },
  { family: "DM Serif Display",  value: "'DM Serif Display', serif",       category: "serif" },

  // ── Mono ─────────────────────────────────────────────────────────────────
  { family: "IBM Plex Mono",     value: "'IBM Plex Mono', monospace",      category: "mono" },
  { family: "JetBrains Mono",    value: "'JetBrains Mono', monospace",     category: "mono" },
  { family: "Fira Code",         value: "'Fira Code', monospace",          category: "mono" },
  { family: "Space Mono",        value: "'Space Mono', monospace",         category: "mono" },
  { family: "Geist Mono",        value: "'Geist Mono', monospace",         category: "mono" },
];

/** Category labels shown as <optgroup> headers */
export const FONT_CATEGORY_LABELS: Record<FontEntry["category"], string> = {
  "sans-serif": "Sans-Serif",
  "display":    "Display",
  "serif":      "Serif",
  "mono":       "Mono",
};

/** Ordered category sequence for the selector */
export const FONT_CATEGORY_ORDER: FontEntry["category"][] = [
  "sans-serif",
  "display",
  "serif",
  "mono",
];

/**
 * Returns fonts grouped in display order.
 * Use with <optgroup> elements in a <select>.
 */
export function getFontsByCategory(): Array<{
  category: FontEntry["category"];
  label: string;
  fonts: FontEntry[];
}> {
  return FONT_CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: FONT_CATEGORY_LABELS[cat],
    fonts: FONT_LIBRARY.filter((f) => f.category === cat),
  }));
}
