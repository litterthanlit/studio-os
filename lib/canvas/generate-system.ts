import type { ImageAnalysis } from "./analyze-images";

export type DesignSystemTokens = {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
    border: string;
  };
  typography: {
    fontFamily: string;
    scale: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      "2xl": string;
      "3xl": string;
      "4xl": string;
    };
    weights: {
      normal: number;
      medium: number;
      semibold: number;
      bold: number;
    };
    lineHeight: {
      tight: string;
      normal: string;
      relaxed: string;
    };
  };
  spacing: {
    unit: number;
    scale: Record<string, string>;
  };
  radii: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    full: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
  };
  animation: {
    spring: {
      smooth: { stiffness: number; damping: number };
      snappy: { stiffness: number; damping: number };
      gentle: { stiffness: number; damping: number };
      bouncy: { stiffness: number; damping: number };
    };
  };
};

export function analysisToTokens(analysis: ImageAnalysis): DesignSystemTokens {
  const primary = analysis.colors.dominant[0] || "#111111";
  const secondary = analysis.colors.dominant[1] || "#444444";
  const accent = analysis.colors.accents[0] || "#3B82F6";
  const bg = analysis.colors.neutrals[0] || "#FFFFFF";
  const surface = analysis.colors.neutrals[1] || "#F5F5F5";
  const text = isLight(bg) ? "#111111" : "#FFFFFF";
  const textMuted = isLight(bg) ? "#666666" : "#AAAAAA";
  const border = isLight(bg) ? "#E0E0E0" : "#333333";

  const fontMap: Record<string, string> = {
    serif: "'Georgia', 'Times New Roman', serif",
    "sans-serif": "'Inter', 'Helvetica Neue', sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', monospace",
    display: "'Instrument Sans', 'Inter', sans-serif",
    mixed: "'Inter', 'Georgia', sans-serif",
  };

  const spacingUnit = analysis.spacing.density === "tight" ? 4 : analysis.spacing.density === "spacious" ? 8 : 6;

  const radiusMap = {
    minimal: { sm: "2px", md: "4px", lg: "6px", xl: "8px", full: "9999px" },
    balanced: { sm: "4px", md: "8px", lg: "12px", xl: "16px", full: "9999px" },
    maximal: { sm: "6px", md: "12px", lg: "16px", xl: "24px", full: "9999px" },
  };

  return {
    colors: { primary, secondary, accent, background: bg, surface, text, textMuted, border },
    typography: {
      fontFamily: fontMap[analysis.typography.category] || fontMap["sans-serif"],
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
      lineHeight: { tight: "1.25", normal: "1.5", relaxed: "1.75" },
    },
    spacing: {
      unit: spacingUnit,
      scale: {
        "0": "0",
        "1": `${spacingUnit}px`,
        "2": `${spacingUnit * 2}px`,
        "3": `${spacingUnit * 3}px`,
        "4": `${spacingUnit * 4}px`,
        "6": `${spacingUnit * 6}px`,
        "8": `${spacingUnit * 8}px`,
        "12": `${spacingUnit * 12}px`,
        "16": `${spacingUnit * 16}px`,
      },
    },
    radii: radiusMap[analysis.vibe.density] || radiusMap.balanced,
    shadows: {
      sm: "0 1px 2px rgba(0,0,0,0.06)",
      md: "0 4px 6px -1px rgba(0,0,0,0.1)",
      lg: "0 10px 15px -3px rgba(0,0,0,0.1)",
    },
    animation: {
      spring: {
        smooth: { stiffness: 300, damping: 30 },
        snappy: { stiffness: 400, damping: 25 },
        gentle: { stiffness: 200, damping: 20 },
        bouncy: { stiffness: 500, damping: 15 },
      },
    },
  };
}

export function tokensToMarkdown(tokens: DesignSystemTokens): string {
  return `# Design System

## Colors

| Token | Value |
|---|---|
| Primary | \`${tokens.colors.primary}\` |
| Secondary | \`${tokens.colors.secondary}\` |
| Accent | \`${tokens.colors.accent}\` |
| Background | \`${tokens.colors.background}\` |
| Surface | \`${tokens.colors.surface}\` |
| Text | \`${tokens.colors.text}\` |
| Text Muted | \`${tokens.colors.textMuted}\` |
| Border | \`${tokens.colors.border}\` |

## Typography

**Font Family:** \`${tokens.typography.fontFamily}\`

| Scale | Size |
|---|---|
${Object.entries(tokens.typography.scale)
  .map(([k, v]) => `| ${k} | \`${v}\` |`)
  .join("\n")}

**Weights:** ${Object.entries(tokens.typography.weights)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ")}

**Line Heights:** ${Object.entries(tokens.typography.lineHeight)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ")}

## Spacing

**Base Unit:** ${tokens.spacing.unit}px

| Token | Value |
|---|---|
${Object.entries(tokens.spacing.scale)
  .map(([k, v]) => `| ${k} | \`${v}\` |`)
  .join("\n")}

## Border Radius

| Token | Value |
|---|---|
${Object.entries(tokens.radii)
  .map(([k, v]) => `| ${k} | \`${v}\` |`)
  .join("\n")}

## Shadows

| Token | Value |
|---|---|
${Object.entries(tokens.shadows)
  .map(([k, v]) => `| ${k} | \`${v}\` |`)
  .join("\n")}

## Animation (Spring Physics)

| Preset | Stiffness | Damping |
|---|---|---|
${Object.entries(tokens.animation.spring)
  .map(([k, v]) => `| ${k} | ${v.stiffness} | ${v.damping} |`)
  .join("\n")}

## Component Primitives

### Button
\`\`\`
Background: ${tokens.colors.primary}
Text: ${tokens.colors.background}
Padding: ${tokens.spacing.scale["2"]} ${tokens.spacing.scale["4"]}
Radius: ${tokens.radii.md}
Font Weight: ${tokens.typography.weights.medium}
Font Size: ${tokens.typography.scale.sm}
\`\`\`

### Card
\`\`\`
Background: ${tokens.colors.surface}
Border: 1px solid ${tokens.colors.border}
Padding: ${tokens.spacing.scale["4"]}
Radius: ${tokens.radii.lg}
Shadow: ${tokens.shadows.sm}
\`\`\`

### Input
\`\`\`
Background: ${tokens.colors.background}
Border: 1px solid ${tokens.colors.border}
Padding: ${tokens.spacing.scale["2"]} ${tokens.spacing.scale["3"]}
Radius: ${tokens.radii.md}
Font Size: ${tokens.typography.scale.sm}
\`\`\`
`;
}

function isLight(hex: string): boolean {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

export const SYSTEM_GENERATION_PROMPT = `You are a design system architect. Given an analysis of visual references, generate a comprehensive design-system.md document.

The document should include:
1. Color tokens with hex values
2. Typography scale and font recommendations
3. Spacing system with base unit
4. Border radius scale
5. Shadow definitions
6. Animation spring physics configs
7. Component primitive specs (Button, Card, Input, Text)

Use the analysis data to inform every decision. Be specific with values.
Respond with the markdown content only, no code fences.`;
