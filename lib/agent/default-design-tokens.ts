import type { DesignSystemTokens } from "@/lib/canvas/generate-system";

export function defaultDesignTokens(): DesignSystemTokens {
  return {
    colors: {
      primary: "#111111",
      secondary: "#2A2A2A",
      accent: "#4B57DB",
      background: "#FAFAF8",
      surface: "#FFFFFF",
      text: "#111111",
      textMuted: "#6B6B6B",
      border: "#E5E5E0",
    },
    typography: {
      fontFamily: "Geist Sans",
      scale: {
        xs: "0.75rem",
        sm: "0.875rem",
        base: "1rem",
        lg: "1.125rem",
        xl: "1.25rem",
        "2xl": "1.5rem",
        "3xl": "1.875rem",
        "4xl": "2.25rem",
      },
      weights: { normal: 400, medium: 500, semibold: 600, bold: 700 },
      lineHeight: { tight: "1.1", normal: "1.45", relaxed: "1.7" },
    },
    spacing: { unit: 8, scale: { "1": "8px", "2": "16px", "4": "32px", "8": "64px" } },
    radii: { sm: "2px", md: "4px", lg: "6px", xl: "8px", full: "9999px" },
    shadows: { sm: "none", md: "0 8px 24px rgba(0,0,0,.08)", lg: "0 16px 48px rgba(0,0,0,.12)" },
    animation: {
      spring: {
        smooth: { stiffness: 180, damping: 24 },
        snappy: { stiffness: 280, damping: 20 },
        gentle: { stiffness: 120, damping: 28 },
        bouncy: { stiffness: 320, damping: 16 },
      },
    },
  };
}
