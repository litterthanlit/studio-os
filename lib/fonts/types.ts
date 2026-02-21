export type FontCategory =
  | "sans-serif"
  | "serif"
  | "display"
  | "handwriting"
  | "monospace";

export type FontSource = "google" | "fontshare";

export interface UnifiedFont {
  family: string;
  category: FontCategory;
  source: FontSource;
  variants: string[];
  popularity?: number;
  slug?: string; // Fontshare slug
}
