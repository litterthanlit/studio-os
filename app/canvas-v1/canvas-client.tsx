"use client";

import * as React from "react";
import Link from "next/link";
import { Monitor, Smartphone, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ImageAnalysis, ReferenceImage } from "@/lib/canvas/analyze-images";
import type { DesignSystemTokens } from "@/lib/canvas/generate-system";
import { analysisToTokens, tokensToMarkdown } from "@/lib/canvas/generate-system";
import { useCanvasStage } from "@/lib/canvas-stage-context";
import { CollectView } from "./components/CollectView";
import { LayersPanel } from "./components/LayersPanel";
import { InspectorPanel } from "./components/InspectorPanel";
import { BottomBar } from "./components/BottomBar";
import { ComposeDocumentView } from "./components/ComposeDocumentView";
import { buildIframeHTML } from "./components/ComponentPreview";
import {
  BREAKPOINT_WIDTHS,
  compileSectionNodeToTSX,
  compilePageTreeToTSX,
  createComposeDocument,
  findNodeById,
  findNodePath,
  fitArtboardsToView,
  flattenNodes,
  getExportArtboard,
  getSelectedArtboard,
  inferSiteName,
  normalizeCanvasStage,
  rehydrateComposeDocument,
  updateArtboardTree,
  updateNodeContent,
  updateNodeStyleValue,
  type Breakpoint,
  type CanvasStage,
  type ComposeDocument,
  type GeneratedVariant,
  type PageNode,
  type PageNodeContent,
  type PageNodeStyle,
} from "@/lib/canvas/compose";
import {
  copyToClipboard,
  deployComposeHtmlToVercel,
  deployToVercel,
  downloadComposeHtmlZip,
  downloadHtml,
  downloadNextjsZip,
  downloadTSX,
  generateComposeExportPreview,
  generateStandaloneHtml,
  toFramerPasteReady,
  type ComposeExportFramework,
  type ComposeExportOptions,
  type ExportConfig,
} from "@/lib/canvas/export-formats";
import {
  appendProjectReferences,
  getProjectById,
  getProjectState,
  listProjectReferences,
  setProjectReferences,
  upsertProjectState,
  type StoredProjectFont,
  type StoredReference,
} from "@/lib/project-store";
import type { TasteProfile } from "@/types/taste-profile";
import type { SiteType } from "@/lib/canvas/templates";

type StageMeta = {
  label: string;
  icon: "layers" | "layout";
  description: string;
};

const STAGE_META: Record<CanvasStage, StageMeta> = {
  collect: { label: "Collect", icon: "layers", description: "Gather references and generate variants" },
  compose: { label: "Compose", icon: "layout", description: "Refine on an infinite board" },
};

function StepIcon({ icon }: { icon: StageMeta["icon"] }) {
  if (icon === "layers") {
    return (
      <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="m8 2.5 5.5 3L8 8.5l-5.5-3L8 2.5Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.5 8.25 5.5 3 5.5-3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.5 11 5.5 3 5.5-3" />
      </svg>
    );
  }
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2.5" y="2.5" width="4.5" height="4.5" rx="1" />
      <rect x="9" y="2.5" width="4.5" height="4.5" rx="1" />
      <rect x="2.5" y="9" width="4.5" height="4.5" rx="1" />
      <rect x="9" y="9" width="4.5" height="4.5" rx="1" />
    </svg>
  );
}

const STATIC_PALETTES: Record<string, { name: string; palette: string[] }> = {
  "acme-rebrand": { name: "Acme Rebrand", palette: ["#1b1b1f", "#f97316", "#fed7aa", "#0f172a", "#e4e4e7"] },
  "fintech-dashboard": { name: "FinTech Dashboard", palette: ["#020617", "#0f172a", "#1d4ed8", "#38bdf8", "#e5e7eb"] },
  "editorial-magazine": { name: "Editorial Magazine", palette: ["#f9fafb", "#1f2937", "#111827", "#e5e7eb", "#f97316"] },
  "personal-portfolio": { name: "Personal Portfolio", palette: ["#020617", "#f9fafb", "#64748b", "#e5e7eb", "#0f172a"] },
};

const COMPOSE_UI_PREFERENCES_KEY = "studio-os:compose-ui-preferences";

function toReferenceImage(reference: StoredReference): ReferenceImage {
  return {
    id: reference.id || `ref-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    url: reference.imageUrl,
    thumbnail: reference.imageUrl,
    name: reference.title || "Reference",
  };
}

function loadProjectRefs(projectId: string): ReferenceImage[] {
  return listProjectReferences(projectId).map(toReferenceImage);
}

function loadProjectMeta(
  projectId: string
): {
  name: string;
  palette: string[];
  headingFont?: StoredProjectFont;
  bodyFont?: StoredProjectFont;
} | null {
  const state = getProjectState(projectId);
  const staticMatch = STATIC_PALETTES[projectId];
  const stored = getProjectById(projectId);

  if (!staticMatch && !stored) return null;

  return {
    name: stored?.name ?? staticMatch?.name ?? "Project",
    palette:
      state.palette && state.palette.length > 0
        ? state.palette
        : staticMatch?.palette ??
          [stored?.color ?? "#2430AD", "#111111", "#222222", "#333333", "#999999"],
    headingFont: state.typography?.headingFont,
    bodyFont: state.typography?.bodyFont,
  };
}

function fontFamilyValue(family: string) {
  return `'${family.replace(/'/g, "\\'")}'`;
}

function applyProjectTypography(
  nextTokens: DesignSystemTokens,
  typography?: {
    headingFont?: StoredProjectFont;
    bodyFont?: StoredProjectFont;
  }
): DesignSystemTokens {
  const families = [
    typography?.headingFont?.family,
    typography?.bodyFont?.family,
  ].filter((family): family is string => Boolean(family));

  if (families.length === 0) return nextTokens;

  const uniqueFamilies = Array.from(new Set(families));
  return {
    ...nextTokens,
    typography: {
      ...nextTokens.typography,
      fontFamily: `${uniqueFamilies.map(fontFamilyValue).join(", ")}, 'Inter', 'Helvetica Neue', sans-serif`,
    },
  };
}

function paletteToTokens(palette: string[]): DesignSystemTokens {
  const p =
    palette.length >= 5
      ? palette
      : [...palette, "#111111", "#222222", "#333333", "#999999", "#eeeeee"].slice(0, 5);
  const bg = p[0];
  const isLight = (() => {
    const c = bg.replace("#", "");
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 128;
  })();

  return {
    colors: {
      primary: p[0],
      secondary: p[1],
      accent: p[2] || "#6366F1",
      background: isLight ? p[0] : p[3] || "#0a0a0a",
      surface: isLight ? p[4] || "#f5f5f5" : p[1],
      text: isLight ? "#111111" : "#ffffff",
      textMuted: isLight ? "#666666" : "#94a3b8",
      border: isLight ? "#e0e0e0" : "#262626",
    },
    typography: {
      fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
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
      unit: 6,
      scale: {
        "0": "0",
        "1": "6px",
        "2": "12px",
        "3": "18px",
        "4": "24px",
        "6": "36px",
        "8": "48px",
        "12": "72px",
        "16": "96px",
      },
    },
    radii: { sm: "4px", md: "8px", lg: "12px", xl: "16px", full: "9999px" },
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clampConfidence(value: unknown, fallback = 0): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(1, value));
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function sanitizeImageAnalysis(value: unknown): ImageAnalysis | null {
  if (!isPlainObject(value)) return null;

  const quality = isPlainObject(value.quality) ? value.quality : null;
  const colors = isPlainObject(value.colors) ? value.colors : null;
  const typography = isPlainObject(value.typography) ? value.typography : null;
  const spacing = isPlainObject(value.spacing) ? value.spacing : null;
  const vibe = isPlainObject(value.vibe) ? value.vibe : null;
  const dominantVibe =
    quality && isPlainObject(quality.dominantVibe) ? quality.dominantVibe : null;

  if (!quality || !colors || !typography || !spacing || !vibe || !dominantVibe) {
    return null;
  }

  const typographyCategory =
    typography.category === "serif" ||
    typography.category === "sans-serif" ||
    typography.category === "mono" ||
    typography.category === "display" ||
    typography.category === "mixed"
      ? typography.category
      : "sans-serif";

  const spacingDensity =
    spacing.density === "tight" ||
    spacing.density === "comfortable" ||
    spacing.density === "spacious"
      ? spacing.density
      : "comfortable";

  const vibeDensity =
    vibe.density === "minimal" ||
    vibe.density === "balanced" ||
    vibe.density === "maximal"
      ? vibe.density
      : "balanced";

  const vibeTone =
    vibe.tone === "playful" ||
    vibe.tone === "neutral" ||
    vibe.tone === "serious"
      ? vibe.tone
      : "neutral";

  const vibeEnergy =
    vibe.energy === "calm" ||
    vibe.energy === "moderate" ||
    vibe.energy === "energetic"
      ? vibe.energy
      : "moderate";

  return {
    quality: {
      scores: Array.isArray(quality.scores)
        ? quality.scores
            .filter(isPlainObject)
            .map((score) => ({
              composition:
                typeof score.composition === "number" && Number.isFinite(score.composition)
                  ? score.composition
                  : 0,
              colorHarmony:
                typeof score.colorHarmony === "number" && Number.isFinite(score.colorHarmony)
                  ? score.colorHarmony
                  : 0,
              visualNoise:
                typeof score.visualNoise === "number" && Number.isFinite(score.visualNoise)
                  ? score.visualNoise
                  : 0,
              designRelevance:
                typeof score.designRelevance === "number" &&
                Number.isFinite(score.designRelevance)
                  ? score.designRelevance
                  : 0,
              overall:
                typeof score.overall === "number" && Number.isFinite(score.overall)
                  ? score.overall
                  : 0,
              usedForExtraction: Boolean(score.usedForExtraction),
            }))
        : [],
      dominantVibe: {
        label:
          typeof dominantVibe.label === "string" ? dominantVibe.label : "Curated direction",
        description:
          typeof dominantVibe.description === "string"
            ? dominantVibe.description
            : "A coherent visual direction has been detected from the project references.",
        matchingImageIndices: Array.isArray(dominantVibe.matchingImageIndices)
          ? dominantVibe.matchingImageIndices.filter(
              (index): index is number =>
                typeof index === "number" && Number.isFinite(index) && index >= 0
            )
          : [],
      },
      usableImageCount:
        typeof quality.usableImageCount === "number" &&
        Number.isFinite(quality.usableImageCount)
          ? quality.usableImageCount
          : 0,
    },
    colors: {
      dominant: toStringArray(colors.dominant),
      accents: toStringArray(colors.accents),
      neutrals: toStringArray(colors.neutrals),
      confidence: {
        dominant: clampConfidence(
          isPlainObject(colors.confidence) ? colors.confidence.dominant : undefined
        ),
        accents: clampConfidence(
          isPlainObject(colors.confidence) ? colors.confidence.accents : undefined
        ),
        neutrals: clampConfidence(
          isPlainObject(colors.confidence) ? colors.confidence.neutrals : undefined
        ),
      },
    },
    typography: {
      category: typographyCategory,
      weights: toStringArray(typography.weights),
      hierarchy:
        typeof typography.hierarchy === "string"
          ? typography.hierarchy
          : "Clear, structured hierarchy",
      confidence: clampConfidence(typography.confidence),
    },
    spacing: {
      density: spacingDensity,
      rhythm:
        typeof spacing.rhythm === "string"
          ? spacing.rhythm
          : "Balanced spacing with a readable content rhythm.",
      confidence: clampConfidence(spacing.confidence),
    },
    vibe: {
      density: vibeDensity,
      tone: vibeTone,
      energy: vibeEnergy,
    },
    designDirection:
      typeof value.designDirection === "string"
        ? value.designDirection
        : "Taste-driven direction",
    summary:
      typeof value.summary === "string"
        ? value.summary
        : "The references suggest a coherent visual direction for generation.",
  };
}

function sanitizeDesignTokens(value: unknown): DesignSystemTokens | null {
  if (!isPlainObject(value)) return null;

  const colors = isPlainObject(value.colors) ? value.colors : null;
  const typography = isPlainObject(value.typography) ? value.typography : null;
  const spacing = isPlainObject(value.spacing) ? value.spacing : null;
  const radii = isPlainObject(value.radii) ? value.radii : null;
  const shadows = isPlainObject(value.shadows) ? value.shadows : null;
  const animation = isPlainObject(value.animation) ? value.animation : null;
  const spring = animation && isPlainObject(animation.spring) ? animation.spring : null;

  if (!colors || !typography || !spacing || !radii || !shadows || !spring) {
    return null;
  }

  const nextTokens = paletteToTokens(
    [
      typeof colors.primary === "string" ? colors.primary : "#2430AD",
      typeof colors.secondary === "string" ? colors.secondary : "#111111",
      typeof colors.accent === "string" ? colors.accent : "#6366F1",
      typeof colors.background === "string" ? colors.background : "#0a0a0a",
      typeof colors.surface === "string" ? colors.surface : "#f5f5f5",
    ].filter(Boolean)
  );

  return {
    colors: {
      primary:
        typeof colors.primary === "string" ? colors.primary : nextTokens.colors.primary,
      secondary:
        typeof colors.secondary === "string"
          ? colors.secondary
          : nextTokens.colors.secondary,
      accent:
        typeof colors.accent === "string" ? colors.accent : nextTokens.colors.accent,
      background:
        typeof colors.background === "string"
          ? colors.background
          : nextTokens.colors.background,
      surface:
        typeof colors.surface === "string" ? colors.surface : nextTokens.colors.surface,
      text: typeof colors.text === "string" ? colors.text : nextTokens.colors.text,
      textMuted:
        typeof colors.textMuted === "string"
          ? colors.textMuted
          : nextTokens.colors.textMuted,
      border:
        typeof colors.border === "string" ? colors.border : nextTokens.colors.border,
    },
    typography: {
      fontFamily:
        typeof typography.fontFamily === "string"
          ? typography.fontFamily
          : nextTokens.typography.fontFamily,
      scale: {
        ...nextTokens.typography.scale,
        ...(isPlainObject(typography.scale)
          ? Object.fromEntries(
              Object.entries(typography.scale).filter(
                ([, scaleValue]) => typeof scaleValue === "string"
              )
            )
          : {}),
      },
      weights: {
        normal:
          isPlainObject(typography.weights) &&
          typeof typography.weights.normal === "number"
            ? typography.weights.normal
            : nextTokens.typography.weights.normal,
        medium:
          isPlainObject(typography.weights) &&
          typeof typography.weights.medium === "number"
            ? typography.weights.medium
            : nextTokens.typography.weights.medium,
        semibold:
          isPlainObject(typography.weights) &&
          typeof typography.weights.semibold === "number"
            ? typography.weights.semibold
            : nextTokens.typography.weights.semibold,
        bold:
          isPlainObject(typography.weights) &&
          typeof typography.weights.bold === "number"
            ? typography.weights.bold
            : nextTokens.typography.weights.bold,
      },
      lineHeight: {
        ...nextTokens.typography.lineHeight,
        ...(isPlainObject(typography.lineHeight)
          ? Object.fromEntries(
              Object.entries(typography.lineHeight).filter(
                ([, lineHeightValue]) => typeof lineHeightValue === "string"
              )
            )
          : {}),
      },
    },
    spacing: {
      unit:
        typeof spacing.unit === "number" && Number.isFinite(spacing.unit)
          ? spacing.unit
          : nextTokens.spacing.unit,
      scale: {
        ...nextTokens.spacing.scale,
        ...(isPlainObject(spacing.scale)
          ? Object.fromEntries(
              Object.entries(spacing.scale).filter(
                ([, spacingValue]) => typeof spacingValue === "string"
              )
            ) as Record<string, string>
          : {}),
      },
    },
    radii: {
      sm: typeof radii.sm === "string" ? radii.sm : nextTokens.radii.sm,
      md: typeof radii.md === "string" ? radii.md : nextTokens.radii.md,
      lg: typeof radii.lg === "string" ? radii.lg : nextTokens.radii.lg,
      xl: typeof radii.xl === "string" ? radii.xl : nextTokens.radii.xl,
      full: typeof radii.full === "string" ? radii.full : nextTokens.radii.full,
    },
    shadows: {
      sm: typeof shadows.sm === "string" ? shadows.sm : nextTokens.shadows.sm,
      md: typeof shadows.md === "string" ? shadows.md : nextTokens.shadows.md,
      lg: typeof shadows.lg === "string" ? shadows.lg : nextTokens.shadows.lg,
    },
    animation: {
      spring: {
        smooth: {
          stiffness:
            isPlainObject(spring.smooth) && typeof spring.smooth.stiffness === "number"
              ? spring.smooth.stiffness
              : nextTokens.animation.spring.smooth.stiffness,
          damping:
            isPlainObject(spring.smooth) && typeof spring.smooth.damping === "number"
              ? spring.smooth.damping
              : nextTokens.animation.spring.smooth.damping,
        },
        snappy: {
          stiffness:
            isPlainObject(spring.snappy) && typeof spring.snappy.stiffness === "number"
              ? spring.snappy.stiffness
              : nextTokens.animation.spring.snappy.stiffness,
          damping:
            isPlainObject(spring.snappy) && typeof spring.snappy.damping === "number"
              ? spring.snappy.damping
              : nextTokens.animation.spring.snappy.damping,
        },
        gentle: {
          stiffness:
            isPlainObject(spring.gentle) && typeof spring.gentle.stiffness === "number"
              ? spring.gentle.stiffness
              : nextTokens.animation.spring.gentle.stiffness,
          damping:
            isPlainObject(spring.gentle) && typeof spring.gentle.damping === "number"
              ? spring.gentle.damping
              : nextTokens.animation.spring.gentle.damping,
        },
        bouncy: {
          stiffness:
            isPlainObject(spring.bouncy) && typeof spring.bouncy.stiffness === "number"
              ? spring.bouncy.stiffness
              : nextTokens.animation.spring.bouncy.stiffness,
          damping:
            isPlainObject(spring.bouncy) && typeof spring.bouncy.damping === "number"
              ? spring.bouncy.damping
              : nextTokens.animation.spring.bouncy.damping,
        },
      },
    },
  };
}

function pickEnum<T extends string>(val: unknown, options: readonly T[], fallback: T): T {
  return typeof val === "string" && (options as readonly string[]).includes(val)
    ? (val as T)
    : fallback;
}

function sanitizeTasteProfile(value: unknown): TasteProfile | null {
  if (!isPlainObject(value)) return null;

  const layoutBias = isPlainObject(value.layoutBias) ? value.layoutBias : null;
  const typographyTraits = isPlainObject(value.typographyTraits)
    ? value.typographyTraits
    : null;
  const colorBehavior = isPlainObject(value.colorBehavior) ? value.colorBehavior : null;
  const imageTreatment = isPlainObject(value.imageTreatment)
    ? value.imageTreatment
    : null;

  if (!layoutBias || !typographyTraits || !colorBehavior || !imageTreatment) {
    return null;
  }

  const suggestedColors = isPlainObject(colorBehavior.suggestedColors)
    ? colorBehavior.suggestedColors
    : null;
  const ctaToneRaw = isPlainObject(value.ctaTone) ? value.ctaTone : null;

  return {
    summary:
      typeof value.summary === "string"
        ? value.summary
        : "The references point toward a clear visual direction.",
    adjectives: toStringArray(value.adjectives),
    archetypeMatch:
      typeof value.archetypeMatch === "string" ? value.archetypeMatch : "premium-saas",
    archetypeConfidence:
      typeof value.archetypeConfidence === "number" ? value.archetypeConfidence : 0.55,
    secondaryArchetype:
      typeof value.secondaryArchetype === "string" ? value.secondaryArchetype : undefined,
    layoutBias: {
      density: pickEnum(layoutBias.density, ["spacious", "balanced", "dense"] as const, "balanced"),
      rhythm: pickEnum(layoutBias.rhythm, ["uniform", "alternating", "progressive", "asymmetric"] as const, "alternating"),
      heroStyle: pickEnum(layoutBias.heroStyle, ["full-bleed", "contained", "split", "text-dominant", "media-dominant"] as const, "contained"),
      sectionFlow: pickEnum(layoutBias.sectionFlow, ["stacked", "overlapping", "interlocking", "editorial-grid"] as const, "stacked"),
      gridBehavior: pickEnum(layoutBias.gridBehavior, ["strict", "fluid", "broken", "editorial"] as const, "strict"),
      whitespaceIntent: pickEnum(layoutBias.whitespaceIntent, ["breathing", "structural", "dramatic", "minimal"] as const, "structural"),
    },
    typographyTraits: {
      scale: pickEnum(typographyTraits.scale, ["compressed", "moderate", "expanded", "dramatic"] as const, "moderate"),
      headingTone: pickEnum(typographyTraits.headingTone, ["display", "editorial", "technical", "humanist", "geometric"] as const, "geometric"),
      bodyTone: pickEnum(typographyTraits.bodyTone, ["neutral", "warm", "technical", "literary"] as const, "neutral"),
      contrast: pickEnum(typographyTraits.contrast, ["low", "medium", "high", "extreme"] as const, "high"),
      casePreference: pickEnum(typographyTraits.casePreference, ["mixed", "uppercase-headings", "all-uppercase", "all-lowercase"] as const, "mixed"),
      recommendedPairings: toStringArray(typographyTraits.recommendedPairings),
    },
    colorBehavior: {
      mode: pickEnum(colorBehavior.mode, ["light", "dark", "mixed", "adaptive"] as const, "light"),
      palette: pickEnum(colorBehavior.palette, ["monochromatic", "analogous", "complementary", "neutral-plus-accent", "restrained"] as const, "neutral-plus-accent"),
      accentStrategy: pickEnum(colorBehavior.accentStrategy, ["single-pop", "gradient-subtle", "gradient-bold", "multi-accent", "no-accent"] as const, "single-pop"),
      saturation: pickEnum(colorBehavior.saturation, ["desaturated", "muted", "moderate", "vivid"] as const, "muted"),
      temperature: pickEnum(colorBehavior.temperature, ["cool", "neutral", "warm"] as const, "neutral"),
      suggestedColors: {
        background: typeof suggestedColors?.background === "string" ? suggestedColors.background : "#FAFAFA",
        surface: typeof suggestedColors?.surface === "string" ? suggestedColors.surface : "#F5F5F5",
        text: typeof suggestedColors?.text === "string" ? suggestedColors.text : "#111111",
        accent: typeof suggestedColors?.accent === "string" ? suggestedColors.accent : "#3B5EFC",
        secondary: typeof suggestedColors?.secondary === "string" ? suggestedColors.secondary : undefined,
      },
    },
    imageTreatment: {
      style: pickEnum(imageTreatment.style, ["editorial", "product", "atmospheric", "abstract", "documentary", "minimal"] as const, "editorial"),
      sizing: pickEnum(imageTreatment.sizing, ["full-bleed", "contained", "mixed", "thumbnail-grid"] as const, "contained"),
      treatment: pickEnum(imageTreatment.treatment, ["raw", "filtered", "duotone", "high-contrast", "desaturated"] as const, "raw"),
      cornerRadius: pickEnum(imageTreatment.cornerRadius, ["none", "subtle", "rounded", "pill"] as const, "subtle"),
      borders: typeof imageTreatment.borders === "boolean" ? imageTreatment.borders : false,
      shadow: pickEnum(imageTreatment.shadow, ["none", "subtle", "medium", "dramatic"] as const, "subtle"),
      aspectPreference: pickEnum(imageTreatment.aspectPreference, ["landscape", "portrait", "square", "mixed"] as const, "landscape"),
    },
    ctaTone: {
      style: pickEnum(ctaToneRaw?.style, ["bold", "understated", "editorial", "technical", "playful"] as const, "understated"),
      shape: pickEnum(ctaToneRaw?.shape, ["sharp", "subtle-radius", "rounded", "pill"] as const, "subtle-radius"),
      hierarchy: pickEnum(ctaToneRaw?.hierarchy, ["primary-dominant", "balanced", "text-link-preferred"] as const, "primary-dominant"),
    },
    avoid: toStringArray(value.avoid),
    confidence: clampConfidence(value.confidence, 0.55),
    referenceCount: typeof value.referenceCount === "number" ? value.referenceCount : 0,
    dominantReferenceType: pickEnum(value.dominantReferenceType, ["ui-screenshot", "photography", "poster", "art", "mixed"] as const, "mixed"),
    warnings: toStringArray(value.warnings),
  };
}

function variantCardScale(width = 280) {
  return width / BREAKPOINT_WIDTHS.desktop;
}

function getExportConfig(
  code: string,
  siteName: string,
  siteType: SiteType
): ExportConfig {
  return {
    siteName: siteName || "Studio OS Site",
    siteType: siteType === "auto" ? "saas-landing" : siteType,
    sourceCode: code,
  };
}

const COMPOSE_WORKSPACE_KEY_PREFIX = "studio-os:compose-workspace:";
const CANVAS_SESSION_KEY_PREFIX = "studio-os:canvas-session:";

type PersistedCanvasSession = {
  stage?: CanvasStage;
  referenceSetName?: string;
  analysis?: ImageAnalysis | null;
  tasteProfile?: TasteProfile | null;
  designTokens?: DesignSystemTokens | null;
  designSystemMarkdown?: string;
  componentPrompt?: string;
  siteType?: SiteType;
  variants?: GeneratedVariant[];
  selectedVariantId?: string | null;
  composeDocument?: ComposeDocument | null;
  generatedSite?: {
    code: string;
    name: string;
    prompt: string;
    siteType?: string;
    updatedAt: string;
  } | null;
  updatedAt?: string;
};

function getComposeWorkspaceKey(projectId: string) {
  return `${COMPOSE_WORKSPACE_KEY_PREFIX}${projectId}`;
}

function getCanvasSessionKey(projectId: string) {
  return `${CANVAS_SESSION_KEY_PREFIX}${projectId}`;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Failed to read file"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function readComposeWorkspace(projectId: string): ComposeDocument | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(getComposeWorkspaceKey(projectId));
    if (!raw) return null;
    return JSON.parse(raw) as ComposeDocument;
  } catch {
    return null;
  }
}

function writeComposeWorkspace(projectId: string, document: ComposeDocument) {
  if (typeof window === "undefined") return;
  try {
    // Strip compiledCode before persisting to avoid localStorage quota issues.
    // compiledCode is large (~30-40KB per artboard) and lives in React state only.
    const stripped = {
      ...document,
      artboards: document.artboards.map((a) =>
        a.compiledCode ? { ...a, compiledCode: null } : a
      ),
    };
    window.localStorage.setItem(getComposeWorkspaceKey(projectId), JSON.stringify(stripped));
  } catch {
    // Ignore quota/storage issues and keep the in-memory session alive.
  }
}

function clearComposeWorkspace(projectId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(getComposeWorkspaceKey(projectId));
  } catch {
    // Ignore storage issues and keep the in-memory session alive.
  }
}

function readCanvasSession(projectId: string): PersistedCanvasSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(getCanvasSessionKey(projectId));
    if (!raw) return null;
    return JSON.parse(raw) as PersistedCanvasSession;
  } catch {
    return null;
  }
}

function writeCanvasSession(projectId: string, session: PersistedCanvasSession) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(getCanvasSessionKey(projectId), JSON.stringify(session));
  } catch {
    // Ignore quota/storage issues and keep the in-memory session alive.
  }
}

function artboardPreviewHeight(breakpoint: Breakpoint) {
  if (breakpoint === "mobile") return 1320;
  return 1780;
}

function ArtboardBreakpointIcon({ breakpoint, size = 14 }: { breakpoint: Breakpoint; size?: number }) {
  if (breakpoint === "mobile") return <Smartphone size={size} strokeWidth={1} />;
  return <Monitor size={size} strokeWidth={1} />;
}

function formatNodeLabel(node: PageNode): string {
  const content = node.content?.text || node.content?.label || node.name;
  return content.length > 42 ? `${content.slice(0, 42)}…` : content;
}

function normalizeVariant(variant: unknown): GeneratedVariant | null {
  if (!variant || typeof variant !== "object") return null;
  const typedVariant = variant as GeneratedVariant;
  if (
    typeof typedVariant.id !== "string" ||
    typeof typedVariant.name !== "string" ||
    !typedVariant.pageTree ||
    typeof typedVariant.pageTree !== "object"
  ) {
    return null;
  }

  const legacyVariant = typedVariant as GeneratedVariant & { favorite?: boolean };
  return {
    ...typedVariant,
    previewImage: typedVariant.previewImage ?? null,
    compiledCode: typedVariant.compiledCode ?? null,
    previewSource:
      typedVariant.previewSource === "ai" || typedVariant.previewSource === "fallback"
        ? typedVariant.previewSource
        : typedVariant.compiledCode
        ? "ai"
        : "fallback",
    previewFallbackReason:
      typeof typedVariant.previewFallbackReason === "string" &&
      typedVariant.previewFallbackReason.length > 0
        ? typedVariant.previewFallbackReason
        : null,
    isFavorite: typedVariant.isFavorite ?? legacyVariant.favorite ?? false,
    strategy:
      typedVariant.strategy === "safe" ||
      typedVariant.strategy === "creative" ||
      typedVariant.strategy === "alternative"
        ? typedVariant.strategy
        : undefined,
    strategyLabel:
      typeof typedVariant.strategyLabel === "string"
        ? typedVariant.strategyLabel
        : undefined,
    tasteEmphasis: Array.isArray(typedVariant.tasteEmphasis)
      ? typedVariant.tasteEmphasis.filter(
          (value): value is string => typeof value === "string" && value.length > 0
        )
      : [],
  };
}

function normalizeVariants(variants: unknown): GeneratedVariant[] {
  if (!Array.isArray(variants)) return [];
  return variants
    .map(normalizeVariant)
    .filter((variant): variant is GeneratedVariant => variant !== null);
}

function setVariantFavorite(
  variants: GeneratedVariant[],
  variantId: string
): GeneratedVariant[] {
  return variants.map((variant) =>
    variant.id === variantId
      ? { ...variant, isFavorite: !variant.isFavorite }
      : variant
  );
}

function formatVariantTimestamp(createdAt: string) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "Just now";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function ExportMenu({
  code,
  siteName,
  siteType,
  pageTree,
  tokens,
  sectionCode,
  sectionName,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: {
  code: string | null;
  siteName: string;
  siteType: SiteType;
  pageTree?: PageNode | null;
  tokens?: DesignSystemTokens | null;
  sectionCode?: string | null;
  sectionName?: string | null;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}) {
  const [copied, setCopied] = React.useState<string | null>(null);
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;
  const [exporting, setExporting] = React.useState<string | null>(null);
  const [options, setOptions] = React.useState<ComposeExportOptions>({
    framework: "html",
    includeAnimations: true,
    imageHandling: "external",
  });
  const sourceCode = code ?? "";

  const cfg = getExportConfig(sourceCode, siteName, siteType);
  const htmlPreview = React.useMemo(() => {
    if (!pageTree || !tokens) return null;
    return generateComposeExportPreview(pageTree, tokens, siteName, options);
  }, [options, pageTree, siteName, tokens]);
  const previewCode =
    options.framework === "html"
      ? htmlPreview
      : sourceCode;
  const canExportHtml = Boolean(pageTree && tokens);
  if (!code) return null;

  async function handleCopy(format: "tsx" | "framer") {
    const text = format === "framer" ? toFramerPasteReady(sourceCode) : sourceCode;
    const ok = await copyToClipboard(text);
    if (!ok) return;
    setCopied(format);
    setTimeout(() => setCopied(null), 1800);
  }

  async function handleDownload() {
    setExporting("download");
    try {
      if (options.framework === "html") {
        if (!pageTree || !tokens) return;
        await downloadComposeHtmlZip(pageTree, tokens, siteName, options);
        return;
      }
      if (options.framework === "react") {
        downloadTSX(sourceCode, siteName);
        return;
      }
      downloadNextjsZip(cfg);
    } finally {
      setExporting(null);
    }
  }

  async function handleDeploy() {
    setExporting("deploy");
    try {
      if (options.framework === "html") {
        if (!pageTree || !tokens) return;
        await deployComposeHtmlToVercel(pageTree, tokens, siteName, options);
        return;
      }
      deployToVercel(cfg);
    } finally {
      setExporting(null);
    }
  }

  return (
    <>
      <Button
        type="button"
        className="h-9 rounded-full bg-[#3B5EFC] px-4 text-[10px] uppercase tracking-[0.12em] text-white hover:bg-[#4a69fc]"
        onClick={() => setOpen(true)}
      >
        Export
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[980px] border border-white/10 bg-[#0d1016] px-0 py-0 text-white shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
          <div className="grid min-h-[620px] grid-cols-[320px_minmax(0,1fr)]">
            <div className="border-r border-white/10 px-5 py-5">
              <DialogHeader className="mb-5">
                <DialogTitle className="text-base text-white">Export</DialogTitle>
                <DialogDescription className="text-xs text-white/45">
                  Turn the current compose selection into deployable output.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5">
                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-white/42">
                    Framework
                  </p>
                  <div className="grid gap-2">
                    {(
                      [
                        ["html", "HTML", "Single-page HTML with Tailwind CDN and image folder."],
                        ["react", "React", "Export the composed page as a TSX component."],
                        ["nextjs", "Next.js", "Starter project ZIP for Vercel deployment."],
                      ] as Array<[ComposeExportFramework, string, string]>
                    ).map(([value, label, description]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() =>
                          setOptions((current) => ({ ...current, framework: value }))
                        }
                        className={cn(
                          "rounded-lg border px-4 py-3 text-left transition-colors",
                          options.framework === value
                            ? "border-[#3B5EFC]/40 bg-[#3B5EFC]/12"
                            : "border-white/10 bg-white/5 hover:border-white/20"
                        )}
                      >
                        <p className="text-sm font-medium text-white">{label}</p>
                        <p className="mt-1 text-xs leading-relaxed text-white/45">
                          {description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 rounded-[22px] border border-white/10 bg-white/5 p-4">
                  <label className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-white/42">
                        Include animations
                      </p>
                      <p className="mt-1 text-xs text-white/45">
                        Adds lightweight entrance transitions to HTML export.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={options.includeAnimations}
                      onChange={(event) =>
                        setOptions((current) => ({
                          ...current,
                          includeAnimations: event.target.checked,
                        }))
                      }
                      className="h-4 w-4 accent-[#3B5EFC]"
                    />
                  </label>

                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-white/42">
                      Image handling
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {(["external", "embedded"] as Array<ComposeExportOptions["imageHandling"]>).map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() =>
                            setOptions((current) => ({ ...current, imageHandling: value }))
                          }
                          className={cn(
                            "rounded-xl border px-3 py-2 text-[11px] uppercase tracking-[0.12em] transition-colors",
                            options.imageHandling === value
                              ? "border-[#3B5EFC]/35 bg-[#3B5EFC]/12 text-white"
                              : "border-white/10 bg-white/5 text-white/55 hover:text-white"
                          )}
                        >
                          {value === "external" ? "Image files" : "Base64 embed"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 rounded-[22px] border border-white/10 bg-white/5 p-4">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-white/42">
                    Quick actions
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-8 rounded-full px-3 text-[10px] uppercase tracking-[0.12em]"
                      onClick={() => handleCopy("tsx")}
                    >
                      {copied === "tsx" ? "Copied" : "Copy TSX"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-8 rounded-full px-3 text-[10px] uppercase tracking-[0.12em]"
                      onClick={() => handleCopy("framer")}
                    >
                      {copied === "framer" ? "Copied" : "Copy Framer"}
                    </Button>
                    {sectionCode && sectionName ? (
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-8 rounded-full px-3 text-[10px] uppercase tracking-[0.12em]"
                        onClick={() => downloadTSX(sectionCode, sectionName)}
                      >
                        Export Section
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-[22px] border border-white/10 bg-white/5 p-4 text-xs leading-relaxed text-white/45">
                  {options.framework === "html"
                    ? "HTML export bundles index.html plus an images folder and respects Compose breakpoint overrides."
                    : options.framework === "react"
                    ? "React export uses the compiled TSX structure from the selected artboard."
                    : "Next.js export packages the selected artboard into a deployable starter project ZIP."}
                </div>
              </div>
            </div>

            <div className="flex min-h-0 flex-col">
              <div className="border-b border-white/10 px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-white/42">
                      Preview
                    </p>
                    <p className="mt-1 text-sm text-white/72">
                      {options.framework === "html"
                        ? "Tailwind HTML output"
                        : options.framework === "react"
                        ? "TSX component output"
                        : "Next.js page source"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {options.framework !== "react" ? (
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-9 rounded-full px-4 text-[10px] uppercase tracking-[0.12em]"
                        disabled={exporting !== null || (options.framework === "html" && !canExportHtml)}
                        onClick={handleDeploy}
                      >
                        {exporting === "deploy" ? "Deploying..." : "Deploy to Vercel"}
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      className="h-9 rounded-full bg-[#3B5EFC] px-4 text-[10px] uppercase tracking-[0.12em] text-white hover:bg-[#4a69fc]"
                      disabled={exporting !== null || (options.framework === "html" && !canExportHtml)}
                      onClick={handleDownload}
                    >
                      {exporting === "download"
                        ? "Preparing..."
                        : options.framework === "html"
                        ? "Download .zip"
                        : options.framework === "react"
                        ? "Download TSX"
                        : "Download Next.js"}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 px-5 py-5">
                {options.framework === "html" && !canExportHtml ? (
                  <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.03] px-8 text-center">
                    <div>
                      <p className="text-sm font-medium text-white">HTML export needs a composed artboard.</p>
                      <p className="mt-2 text-xs leading-relaxed text-white/45">
                        Select or create an artboard in Compose to generate semantic HTML and Tailwind output.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="h-full overflow-hidden rounded-lg border border-white/10 bg-[#090b10]">
                    <pre className="h-full overflow-auto whitespace-pre-wrap break-words p-5 text-[12px] leading-6 text-white/78">
                      <code>{previewCode}</code>
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function VariantCard({
  variant,
  tokens,
  active,
  onSelect,
  onFavorite,
  onViewCode,
  onOpenCompose,
  onRegenerateVariant,
  setScrollRef,
  onSyncScroll,
}: {
  variant: GeneratedVariant;
  tokens: DesignSystemTokens;
  active: boolean;
  onSelect: () => void;
  onFavorite: () => void;
  onViewCode: () => void;
  onOpenCompose: () => void;
  onRegenerateVariant: (
    variant: GeneratedVariant,
    options: {
      intent: "more-like-this" | "different-approach";
      promptOverride?: string;
    }
  ) => void;
  setScrollRef: (element: HTMLDivElement | null) => void;
  onSyncScroll: (scrollTop: number) => void;
}) {
  const previewId = React.useId();
  const [showPromptEditor, setShowPromptEditor] = React.useState(false);
  const [promptDraft, setPromptDraft] = React.useState(variant.sourcePrompt);
  const [previewError, setPreviewError] = React.useState<string | null>(null);
  const [previewReady, setPreviewReady] = React.useState(false);

  React.useEffect(() => {
    setPromptDraft(variant.sourcePrompt);
  }, [variant.sourcePrompt]);

  React.useEffect(() => {
    setPreviewError(null);
    setPreviewReady(false);
  }, [variant.compiledCode, previewId]);

  React.useEffect(() => {
    if (!variant.compiledCode) return;

    const clearPreviewTimeout = (timeoutId: number) => {
      window.clearTimeout(timeoutId);
    };

    const timeout = window.setTimeout(() => {
      setPreviewError((current) => current ?? "Preview timed out — CDN libraries may be slow to load. Try refreshing.");
    }, 20000);

    function handleMessage(event: MessageEvent) {
      if (!event.data || typeof event.data !== "object") return;
      if (event.data.previewId !== previewId) return;
      if (event.data.type === "preview-ready") {
        clearPreviewTimeout(timeout);
        setPreviewReady(true);
        setPreviewError(null);
      } else if (event.data.type === "preview-error") {
        clearPreviewTimeout(timeout);
        setPreviewReady(true);
        setPreviewError(typeof event.data.error === "string" ? event.data.error : "Preview failed to render");
      }
    }

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      clearPreviewTimeout(timeout);
    };
  }, [previewId, variant.compiledCode]);

  const previewBlockedReason =
    variant.previewSource === "fallback"
      ? variant.previewFallbackReason ??
        "The model returned preview-incompatible output, so Studio OS withheld the template fallback."
      : previewError;

  return (
    <motion.div
      whileHover={active ? {} : { backgroundColor: "#F4F8FF" }}
      transition={{ duration: 0.15 }}
      className={cn(
        "group w-full overflow-hidden rounded-xl border bg-white text-left transition-all duration-150",
        active
          ? "border-[#2430AD] border-2 shadow-[0_0_0_3px_rgba(209,228,252,0.4)]"
          : "border-[#E2E8F0] hover:border-[#D1E4FC]"
      )}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect();
          }
        }}
        className="block w-full cursor-pointer text-left"
      >
        {/* 16:10 Preview Area */}
        <div className="relative w-full" style={{ paddingBottom: "62.5%" /* 10/16 */ }}>
          {previewBlockedReason ? (
            <div
              ref={setScrollRef}
              className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#F4F8FF] via-[#E8F0FE] to-[#D1E4FC] p-8"
            >
              <div className="max-w-sm space-y-3 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-[#D1E4FC] bg-white text-[#2430AD] text-base font-semibold">
                  !
                </div>
                <p className="text-sm font-medium text-[#0F172A]">Preview unavailable</p>
                <p className="text-[11px] leading-relaxed text-[#64748B]">{previewBlockedReason}</p>
              </div>
            </div>
          ) : variant.compiledCode ? (
            <div
              ref={setScrollRef}
              className="absolute inset-0 overflow-hidden"
            >
              {!previewReady ? (
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-[#FAFBFE]">
                  <div className="flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-4 py-2.5 shadow-sm">
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#E2E8F0] border-t-[#2430AD]" />
                    <span className="text-[11px] text-[#94A3B8]">Rendering…</span>
                  </div>
                </div>
              ) : null}
              <iframe
                srcDoc={buildIframeHTML(variant.compiledCode, tokens, previewId)}
                className="absolute inset-0 w-full border-0 pointer-events-none"
                style={{ height: "100%", width: "100%" }}
                sandbox="allow-scripts allow-same-origin"
                title={`Preview: ${variant.name}`}
              />
            </div>
          ) : (
            <div
              ref={setScrollRef}
              className="absolute inset-0 overflow-y-auto bg-gradient-to-br from-[#F4F8FF] via-[#EBF3FF] to-[#D1E4FC]"
              onScroll={(event) => onSyncScroll(event.currentTarget.scrollTop)}
            >
              <ComposeDocumentView
                pageTree={variant.pageTree}
                tokens={tokens}
                breakpoint="desktop"
                scale={variantCardScale(380)}
                className="pointer-events-none"
              />
            </div>
          )}
        </div>
      </div>
      {/* Card Footer */}
      <div
        className={cn(
          "border-t border-[#E2E8F0] px-4 py-3 transition-colors duration-150",
          active ? "bg-[#F0F7FF]" : "bg-white"
        )}
      >
        <div className="flex items-center justify-between gap-3">
          {/* Variant label */}
          <div>
            <span className="text-[12px] font-medium uppercase tracking-[0.1em] text-[#64748B]">
              {variant.strategyLabel ?? variant.name}
            </span>
            {variant.description ? (
              <p className="mt-0.5 line-clamp-1 text-[11px] text-[#94A3B8]">{variant.description}</p>
            ) : null}
          </div>
          {/* Quick action buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowPromptEditor(c => !c); }}
              className="rounded-md border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-[10px] text-[#64748B] transition-colors hover:border-[#D1E4FC] hover:text-[#2430AD]"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onOpenCompose(); }}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-all duration-150",
                active
                  ? "bg-[#2430AD] text-white shadow-[0_1px_3px_rgba(36,48,173,0.2)]"
                  : "bg-[#D1E4FC] text-[#2430AD] hover:bg-[#C1D8F5]"
              )}
            >
              Select
            </button>
          </div>
        </div>
        {/* Expandable prompt editor */}
        <AnimatePresence initial={false}>
          {showPromptEditor ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="mt-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                <p className="text-[10px] uppercase tracking-[0.12em] text-[#94A3B8]">Taste-derived prompt</p>
                <textarea
                  value={promptDraft}
                  onChange={(event) => setPromptDraft(event.target.value)}
                  rows={6}
                  className="mt-2 min-h-[140px] w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2.5 text-[12px] leading-relaxed text-[#0F172A] outline-none focus:border-[#D1E4FC]"
                />
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => onRegenerateVariant(variant, { intent: "more-like-this", promptOverride: promptDraft })}
                    className="rounded-md border border-[#E2E8F0] bg-white px-3 py-1.5 text-[10px] text-[#64748B] hover:border-[#D1E4FC] hover:text-[#2430AD]"
                  >More Like This</button>
                  <button
                    type="button"
                    onClick={() => onRegenerateVariant(variant, { intent: "different-approach", promptOverride: promptDraft })}
                    className="rounded-md border border-[#E2E8F0] bg-white px-3 py-1.5 text-[10px] text-[#64748B] hover:border-[#D1E4FC] hover:text-[#2430AD]"
                  >Different Approach</button>
                  <button
                    type="button"
                    onClick={onViewCode}
                    className="ml-auto rounded-md border border-[#E2E8F0] bg-white px-3 py-1.5 text-[10px] text-[#64748B] hover:border-[#D1E4FC] hover:text-[#2430AD]"
                  >View Code</button>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function GenerateSkeletonCard() {
  return (
    <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
      {/* 16:10 preview skeleton with shimmer */}
      <div className="relative w-full" style={{ paddingBottom: "62.5%" }}>
        <div
          className="absolute inset-0 overflow-hidden"
          style={{
            background: "linear-gradient(90deg, #F4F8FF 0%, #E8F0FE 40%, #F4F8FF 80%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.4s linear infinite",
          }}
        />
      </div>
      {/* Footer skeleton */}
      <div className="flex items-center justify-between border-t border-[#E2E8F0] px-4 py-3">
        <div className="space-y-1.5">
          <div className="h-3 w-20 animate-pulse rounded-full bg-[#E2E8F0]" />
          <div className="h-2.5 w-32 animate-pulse rounded-full bg-[#E2E8F0]" />
        </div>
        <div className="h-7 w-16 animate-pulse rounded-md bg-[#D1E4FC]" />
      </div>
    </div>
  );
}

function GenerateEmptyState() {
  return (
    <div className="rounded-lg border-2 border-dashed border-[#E2E8F0] bg-white p-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-center">
        <div className="space-y-5">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#94A3B8]">Variant Gallery</p>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-[#0F172A]">
              Generate three directions.
            </h3>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-[#64748B]">
              Studio OS turns your references and taste profile into a safe direction, a creative stretch, and an alternative. Review them side by side, then send the strongest into Compose.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {["3 full-page variants", "synced scroll review", "compose-ready"].map((tag) => (
              <span key={tag} className="rounded-full border border-[#E2E8F0] px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.1em] text-[#94A3B8]">{tag}</span>
            ))}
          </div>
        </div>
        {/* Preview of 3 ghost variant cards */}
        <div className="grid grid-cols-3 gap-3">
          {["A", "B", "C"].map((letter, i) => (
            <div
              key={letter}
              className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white"
              style={{ opacity: 1 - i * 0.15 }}
            >
              {/* 16:10 preview ghost */}
              <div
                className="w-full"
                style={{
                  paddingBottom: "62.5%",
                  background: `linear-gradient(135deg, #F4F8FF, #D1E4FC ${30 + i * 15}%, #E8F0FE)`,
                }}
              />
              <div className="flex items-center justify-between border-t border-[#E2E8F0] px-3 py-2.5">
                <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#94A3B8]">Variant {letter}</span>
                <span className="rounded-md bg-[#D1E4FC] px-2 py-1 text-[10px] font-medium text-[#2430AD]">Select</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function VariantGallery({
  tokens,
  variants,
  selectedVariantId,
  generating,
  onSelect,
  onFavorite,
  onViewCode,
  onOpenCompose,
  onRegenerateVariant,
}: {
  tokens: DesignSystemTokens | null;
  variants: GeneratedVariant[];
  selectedVariantId: string | null;
  generating: boolean;
  onSelect: (variantId: string) => void;
  onFavorite: (variantId: string) => void;
  onViewCode: (variantId: string) => void;
  onOpenCompose: (variantId: string) => void;
  onRegenerateVariant: (
    variant: GeneratedVariant,
    options: {
      intent: "more-like-this" | "different-approach";
      promptOverride?: string;
    }
  ) => void;
}) {
  const scrollRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
  const syncLockRef = React.useRef(false);

  if (generating) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.15em] text-text-tertiary">
              Generating
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              Building multiple directions from your system...
            </p>
          </div>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {[0, 1, 2, 3].map((item) => (
            <GenerateSkeletonCard key={item} />
          ))}
        </div>
      </div>
    );
  }

  if (variants.length === 0 || !tokens) {
    return <GenerateEmptyState />;
  }

  function syncScroll(sourceId: string, top: number) {
    if (syncLockRef.current) return;
    syncLockRef.current = true;
    Object.entries(scrollRefs.current).forEach(([variantId, element]) => {
      if (!element || variantId === sourceId) return;
      element.scrollTop = top;
    });
    window.requestAnimationFrame(() => {
      syncLockRef.current = false;
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#94A3B8]">Variants</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-[#0F172A]">
            Compare directions
          </h2>
          <p className="mt-1 text-sm text-[#64748B]">
            Review side by side — scrolling one column keeps the others in sync.
          </p>
        </div>
        <span className="rounded-full border border-[#E2E8F0] bg-[#F4F8FF] px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.1em] text-[#94A3B8]">
          {variants.length >= 3 ? "3-up" : variants.length === 2 ? "2-up" : "1 variant"}
        </span>
      </div>
      <div className={`grid gap-5 ${variants.length === 1 ? "grid-cols-1 max-w-2xl mx-auto" : "md:grid-cols-2 xl:grid-cols-3"}`}>
      {variants.map((variant) => (
        <VariantCard
          key={variant.id}
          variant={variant}
          tokens={tokens}
          active={selectedVariantId === variant.id}
          onSelect={() => onSelect(variant.id)}
          onFavorite={() => onFavorite(variant.id)}
          onViewCode={() => onViewCode(variant.id)}
          onOpenCompose={() => onOpenCompose(variant.id)}
          onRegenerateVariant={onRegenerateVariant}
          setScrollRef={(element) => {
            scrollRefs.current[variant.id] = element;
          }}
          onSyncScroll={(scrollTop) => syncScroll(variant.id, scrollTop)}
        />
      ))}
      </div>
    </div>
  );
}

function StageStepper({
  stage,
  onSelect,
  completions,
  availability,
  counts,
}: {
  stage: CanvasStage;
  onSelect: (stage: CanvasStage) => void;
  completions: Partial<Record<CanvasStage, boolean>>;
  availability: Record<CanvasStage, { available: boolean; tooltip?: string }>;
  counts: Partial<Record<CanvasStage, string>>;
}) {
  return (
    <div className="flex items-center gap-1">
      {(Object.keys(STAGE_META) as CanvasStage[]).map((key, index) => {
        const meta = STAGE_META[key];
        const active = key === stage;
        const complete = Boolean(completions[key]);
        const { available, tooltip } = availability[key];
        const badge = counts[key];
        return (
          <React.Fragment key={key}>
            {index > 0 ? (
              <div className="mx-1 h-px w-6 bg-border-primary" />
            ) : null}
            <div className="group relative">
              <button
                type="button"
                onClick={available ? () => onSelect(key) : undefined}
                disabled={!available}
                className={cn(
                  "flex items-center gap-2 border px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] font-medium transition-colors",
                  active && available
                    ? "border-accent bg-accent/10 text-accent shadow-[0_0_0_1px_var(--accent)] animate-pulse"
                    : complete
                    ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
                    : available
                    ? "border-border-primary text-text-muted hover:text-text-secondary"
                    : "cursor-not-allowed border-border-primary text-text-muted/55 opacity-70"
                )}
              >
                <span className="inline-flex w-4 items-center justify-center text-[10px] font-mono opacity-70">
                  {complete ? (
                    <svg
                      className="h-3 w-3"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m3.5 8.5 3 3 6-7" />
                    </svg>
                  ) : !available ? (
                    <svg
                      className="h-3 w-3"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.5 7V5.5a2.5 2.5 0 0 1 5 0V7" />
                      <rect x="3.5" y="7" width="9" height="6" rx="1.5" />
                    </svg>
                  ) : (
                    <StepIcon icon={meta.icon} />
                  )}
                </span>
                <span>{meta.label}</span>
                {badge ? (
                  <span className="text-[9px] font-normal normal-case tracking-normal text-current/60">
                    {badge}
                  </span>
                ) : null}
              </button>
              {!available && tooltip ? (
                <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 -translate-x-1/2 whitespace-nowrap rounded-full border border-border-primary bg-bg-primary px-3 py-1.5 text-[10px] normal-case tracking-normal text-text-secondary opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100">
                  {tooltip}
                </div>
              ) : null}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

function PanelSectionLabel({
  label,
  detail,
}: {
  label: string;
  detail?: string;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] uppercase tracking-[0.15em] font-medium text-text-tertiary">
        {label}
      </p>
      {detail ? <p className="text-[11px] text-text-muted">{detail}</p> : null}
    </div>
  );
}

function CanvasStageLayout({
  stage,
  leftPanel,
  centerPanel,
  rightPanel,
  leftWidth = "300px",
  rightWidth = "300px",
}: {
  stage: CanvasStage;
  leftPanel?: React.ReactNode;
  centerPanel: React.ReactNode;
  rightPanel?: React.ReactNode;
  leftWidth?: string;
  rightWidth?: string;
}) {
  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <AnimatePresence initial={false} mode="wait">
        {leftPanel ? (
          <motion.aside
            key={`left-${stage}`}
            initial={{ x: -18, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -18, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="shrink-0 border-r border-border-primary bg-bg-primary overflow-y-auto"
            style={{ width: leftWidth }}
          >
            {leftPanel}
          </motion.aside>
        ) : null}
      </AnimatePresence>

      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={`center-${stage}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.24, ease: "easeOut" }}
          className="min-w-0 flex-1 overflow-hidden bg-bg-secondary"
        >
          {centerPanel}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence initial={false} mode="wait">
        {rightPanel ? (
          <motion.aside
            key={`right-${stage}`}
            initial={{ x: 18, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 18, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="shrink-0 border-l border-border-primary bg-bg-primary overflow-y-auto"
            style={{ width: rightWidth }}
          >
            {rightPanel}
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function SystemSummaryPanel({
  tokens,
  selectedVariant,
}: {
  tokens: DesignSystemTokens | null;
  selectedVariant: GeneratedVariant | null;
}) {
  return (
    <div className="space-y-4 p-4">
      <PanelSectionLabel
        label="System Summary"
        detail="Generation is locked to the current project system."
      />
      {tokens ? (
        <>
          <div className="rounded-lg border border-border-primary bg-bg-secondary p-4">
            <p className="text-[11px] uppercase tracking-[0.15em] text-text-tertiary">
              Palette
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {Object.entries(tokens.colors).map(([key, value]) => (
                <div key={key} className="rounded-xl border border-border-primary bg-bg-primary p-2">
                  <div
                    className="h-10 rounded-lg border border-border-primary"
                    style={{ backgroundColor: value }}
                  />
                  <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-text-muted">
                    {key}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border-primary bg-bg-secondary p-4">
            <p className="text-[11px] uppercase tracking-[0.15em] text-text-tertiary">
              Typography
            </p>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              {tokens.typography.fontFamily}
            </p>
          </div>
        </>
      ) : null}

      {selectedVariant ? (
        <div className="rounded-lg border border-border-primary bg-bg-secondary p-4">
          <p className="text-[11px] uppercase tracking-[0.15em] text-text-tertiary">
            Selected Variant
          </p>
          <p className="mt-3 text-[13px] font-medium text-text-primary">
            {selectedVariant.name}
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-text-muted">
            {selectedVariant.description}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function ComposeStage({
  document,
  tokens,
  references,
  projectId,
  projectName,
  siteName,
  siteType,
  sourceVariant,
  onChange,
}: {
  document: ComposeDocument;
  tokens: DesignSystemTokens;
  references: ReferenceImage[];
  projectId?: string | null;
  projectName: string;
  siteName: string;
  siteType: SiteType;
  sourceVariant: GeneratedVariant | null;
  onChange: (document: ComposeDocument) => void;
}) {
  const [aiPrompt, setAiPrompt] = React.useState("");
  const [aiError, setAiError] = React.useState<string | null>(null);
  const [aiLoading, setAiLoading] = React.useState(false);
  const [showLayers, setShowLayers] = React.useState(false);
  const [showInspector, setShowInspector] = React.useState(true);
  const [showMinimap, setShowMinimap] = React.useState(false);
  const [showShortcuts, setShowShortcuts] = React.useState(false);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [spacePanActive, setSpacePanActive] = React.useState(false);
  const [isPanning, setIsPanning] = React.useState(false);
  const [referencesDockOpen, setReferencesDockOpen] = React.useState(false);
  const [systemDockOpen, setSystemDockOpen] = React.useState(false);
  const canvasRef = React.useRef<HTMLDivElement>(null);
  const [viewportSize, setViewportSize] = React.useState({ width: 1, height: 1 });
  const stateRef = React.useRef({
    pan: document.pan,
    zoom: document.zoom,
  });
  const panStateRef = React.useRef<{
    active: boolean;
    source: "space" | "middle" | null;
    startX: number;
    startY: number;
    panX: number;
    panY: number;
  }>({ active: false, source: null, startX: 0, startY: 0, panX: 0, panY: 0 });
  const dragRef = React.useRef<
    | {
        kind: "artboard";
        id: string;
        startX: number;
        startY: number;
        x: number;
        y: number;
      }
    | {
        kind: "overlay";
        id: string;
        startX: number;
        startY: number;
        x: number;
        y: number;
      }
    | null
  >(null);

  React.useEffect(() => {
    stateRef.current = {
      pan: document.pan,
      zoom: document.zoom,
    };
  }, [document.pan, document.zoom]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(COMPOSE_UI_PREFERENCES_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        showLayers?: boolean;
        showMinimap?: boolean;
        showInspector?: boolean;
      };
      setShowLayers(Boolean(parsed.showLayers));
      setShowMinimap(Boolean(parsed.showMinimap));
      if (parsed.showInspector !== undefined) setShowInspector(Boolean(parsed.showInspector));
    } catch {
      // Ignore malformed UI preference payloads
    }
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      COMPOSE_UI_PREFERENCES_KEY,
      JSON.stringify({ showLayers, showMinimap, showInspector })
    );
  }, [showLayers, showMinimap, showInspector]);

  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTypingTarget =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        Boolean(target?.isContentEditable);

      if ((event.key === "?" || (event.shiftKey && event.key === "/")) && !isTypingTarget) {
        event.preventDefault();
        setShowShortcuts((current) => !current);
        return;
      }

      if (event.key === "Escape") {
        setShowShortcuts(false);
        setSpacePanActive(false);
        clearPointerState();
        return;
      }

      if (event.code === "Space" && !isTypingTarget) {
        event.preventDefault();
        setSpacePanActive(true);
        return;
      }

      if (isTypingTarget) return;

      if (event.key.toLowerCase() === "l") {
        event.preventDefault();
        setShowLayers((current) => !current);
      }

      if (event.key.toLowerCase() === "i") {
        event.preventDefault();
        setShowInspector((current) => !current);
      }

      if (event.key.toLowerCase() === "m") {
        event.preventDefault();
        setShowMinimap((current) => !current);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    function handleKeyUp(event: KeyboardEvent) {
      if (event.code === "Space") {
        setSpacePanActive(false);
        if (panStateRef.current.source === "space") {
          clearPointerState();
        }
      }
    }

    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  React.useEffect(() => {
    const element = canvasRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;

    const updateViewport = () => {
      const rect = element.getBoundingClientRect();
      setViewportSize({
        width: Math.max(1, rect.width),
        height: Math.max(1, rect.height),
      });
    };

    updateViewport();
    const observer = new ResizeObserver(updateViewport);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Fit all artboards into view on initial mount
  const didFitRef = React.useRef(false);
  React.useEffect(() => {
    if (didFitRef.current) return;
    if (document.artboards.length === 0) return;
    if (viewportSize.width <= 1 || viewportSize.height <= 1) return;
    didFitRef.current = true;
    const { pan, zoom } = fitArtboardsToView(
      document.artboards,
      viewportSize.width,
      viewportSize.height,
      60
    );
    onChange({ ...document, pan, zoom });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [document.artboards.length, viewportSize.width, viewportSize.height]);

  const selectedArtboard = React.useMemo(
    () => getSelectedArtboard(document),
    [document]
  );
  const selectedNode = React.useMemo(
    () =>
      selectedArtboard
        ? findNodeById(selectedArtboard.pageTree, document.selectedNodeId)
        : null,
    [document.selectedNodeId, selectedArtboard]
  );
  const selectionPath = React.useMemo(
    () =>
      selectedArtboard
        ? (findNodePath(selectedArtboard.pageTree, document.selectedNodeId) ?? [])
        : [],
    [document.selectedNodeId, selectedArtboard]
  );
  const selectedSection = React.useMemo(
    () =>
      [...selectionPath].reverse().find((node) => node.type === "section") ?? null,
    [selectionPath]
  );
  const exportArtboard = React.useMemo(
    () => getExportArtboard(document),
    [document]
  );
  const exportCode = React.useMemo(
    () =>
      exportArtboard
        ? compilePageTreeToTSX(exportArtboard.pageTree, tokens, exportArtboard.name)
        : null,
    [exportArtboard, tokens]
  );
  const sectionExportCode = React.useMemo(
    () =>
      selectedSection
        ? compileSectionNodeToTSX(selectedSection, tokens, selectedSection.name)
        : null,
    [selectedSection, tokens]
  );
  const boardItems = React.useMemo(() => {
    return [
      ...document.artboards.map((artboard) => {
        const bp = artboard.breakpoint ?? document.breakpoint;
        return {
          id: artboard.id,
          type: "artboard" as const,
          x: artboard.x,
          y: artboard.y,
          width: BREAKPOINT_WIDTHS[bp],
          height: artboardPreviewHeight(bp),
        };
      }),
      ...document.overlays.map((overlay) => ({
        id: overlay.id,
        type: "overlay" as const,
        x: overlay.x,
        y: overlay.y,
        width: overlay.width,
        height: overlay.height,
      })),
    ];
  }, [document.artboards, document.breakpoint, document.overlays]);
  const minimap = React.useMemo(() => {
    if (boardItems.length === 0) return null;

    const padding = 140;
    const minX = Math.min(...boardItems.map((item) => item.x)) - padding;
    const minY = Math.min(...boardItems.map((item) => item.y)) - padding;
    const maxX = Math.max(...boardItems.map((item) => item.x + item.width)) + padding;
    const maxY = Math.max(...boardItems.map((item) => item.y + item.height)) + padding;
    const width = Math.max(1, maxX - minX);
    const height = Math.max(1, maxY - minY);
    const frameWidth = 220;
    const frameHeight = 148;
    const scale = Math.min(frameWidth / width, frameHeight / height);
    const viewportWorldX = -document.pan.x / document.zoom;
    const viewportWorldY = -document.pan.y / document.zoom;

    return {
      frameWidth,
      frameHeight,
      items: boardItems.map((item) => ({
        ...item,
        left: (item.x - minX) * scale,
        top: (item.y - minY) * scale,
        width: Math.max(3, item.width * scale),
        height: Math.max(3, item.height * scale),
      })),
      viewport: {
        left: (viewportWorldX - minX) * scale,
        top: (viewportWorldY - minY) * scale,
        width: Math.max(10, (viewportSize.width / document.zoom) * scale),
        height: Math.max(10, (viewportSize.height / document.zoom) * scale),
      },
    };
  }, [
    boardItems,
    document.pan.x,
    document.pan.y,
    document.zoom,
    viewportSize.height,
    viewportSize.width,
  ]);

  const updateDocument = React.useCallback(
    (next: Partial<ComposeDocument>) => {
      onChange({ ...document, ...next });
    },
    [document, onChange]
  );

  function updateSelectedTree(updater: (tree: PageNode) => PageNode) {
    if (!selectedArtboard) return;
    onChange(updateArtboardTree(document, selectedArtboard.id, updater));
  }

  function updateSelectedContent(key: keyof PageNodeContent, value: string) {
    if (!selectedArtboard || !document.selectedNodeId) return;
    updateSelectedTree((tree) =>
      updateNodeContent(tree, document.selectedNodeId!, key, value)
    );
  }

  function updateSelectedStyle(
    key: keyof PageNodeStyle,
    value: PageNodeStyle[keyof PageNodeStyle]
  ) {
    if (!selectedArtboard || !document.selectedNodeId) return;
    updateSelectedTree((tree) =>
      updateNodeStyleValue(
        tree,
        document.selectedNodeId!,
        document.breakpoint,
        key,
        value
      )
    );
  }

  React.useEffect(() => {
    const element = canvasRef.current;
    if (!element) return;

    function onWheel(event: WheelEvent) {
      event.preventDefault();
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const curPan = stateRef.current.pan;
      const rawDelta =
        event.deltaMode === 1
          ? event.deltaY * 24
          : event.deltaMode === 2
          ? event.deltaY * 400
          : event.deltaY;
      const rawDeltaX =
        event.deltaMode === 1
          ? event.deltaX * 24
          : event.deltaMode === 2
          ? event.deltaX * 400
          : event.deltaX;

      if (event.ctrlKey || event.metaKey) {
        const mx = event.clientX - rect.left;
        const my = event.clientY - rect.top;
        const curZoom = stateRef.current.zoom;
        const factor = Math.pow(0.9984, rawDelta);
        const nextZoom = Math.max(0.1, Math.min(5, curZoom * factor));
        const worldX = (mx - curPan.x) / curZoom;
        const worldY = (my - curPan.y) / curZoom;
        updateDocument({
          zoom: nextZoom,
          pan: {
            x: mx - worldX * nextZoom,
            y: my - worldY * nextZoom,
          },
        });
        return;
      }

      const horizontalDelta = event.shiftKey ? rawDelta + rawDeltaX : rawDeltaX;
      const verticalDelta = event.shiftKey ? 0 : rawDelta;
      updateDocument({
        pan: {
          x: curPan.x - horizontalDelta,
          y: curPan.y - verticalDelta,
        },
      });
    }

    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [updateDocument]);

  React.useEffect(() => {
    function handleWindowMouseUp() {
      clearPointerState();
    }

    window.addEventListener("mouseup", handleWindowMouseUp);
    return () => window.removeEventListener("mouseup", handleWindowMouseUp);
  }, []);

  function beginPan(event: React.MouseEvent, source: "space" | "middle") {
    event.preventDefault();
    event.stopPropagation();
    panStateRef.current = {
      active: true,
      source,
      startX: event.clientX,
      startY: event.clientY,
      panX: document.pan.x,
      panY: document.pan.y,
    };
    setIsPanning(true);
  }

  function onCanvasMouseDownCapture(event: React.MouseEvent<HTMLDivElement>) {
    if (event.button === 1) {
      beginPan(event, "middle");
      return;
    }

    if (spacePanActive && event.button === 0) {
      beginPan(event, "space");
    }
  }

  function onBackgroundMouseDown(event: React.MouseEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    if (spacePanActive) return;
    if ((event.target as HTMLElement).closest("[data-artboard], [data-overlay]")) return;
    updateDocument({ selectedNodeId: null });
  }

  function onMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    if (panStateRef.current.active) {
      const dx = event.clientX - panStateRef.current.startX;
      const dy = event.clientY - panStateRef.current.startY;
      updateDocument({
        pan: {
          x: panStateRef.current.panX + dx,
          y: panStateRef.current.panY + dy,
        },
      });
    }

    if (!dragRef.current) return;

    if (dragRef.current.kind === "artboard") {
      const dx = (event.clientX - dragRef.current.startX) / document.zoom;
      const dy = (event.clientY - dragRef.current.startY) / document.zoom;
      updateDocument({
        artboards: document.artboards.map((artboard) =>
          artboard.id === dragRef.current?.id
            ? { ...artboard, x: dragRef.current.x + dx, y: dragRef.current.y + dy }
            : artboard
        ),
      });
      return;
    }

    const dx = (event.clientX - dragRef.current.startX) / document.zoom;
    const dy = (event.clientY - dragRef.current.startY) / document.zoom;
    updateDocument({
      overlays: document.overlays.map((overlay) =>
        overlay.id === dragRef.current?.id
          ? { ...overlay, x: dragRef.current.x + dx, y: dragRef.current.y + dy }
          : overlay
      ),
    });
  }

  function clearPointerState() {
    panStateRef.current.active = false;
    panStateRef.current.source = null;
    dragRef.current = null;
    setIsPanning(false);
  }

  async function applyAiAction(
    action:
      | "rewrite-copy"
      | "regenerate-section"
      | "restyle-section"
      | "regenerate-page"
      | "change-style"
  ) {
    if (!selectedArtboard || !selectedNode) return;
    setAiError(null);
    setAiLoading(true);

    try {
      const response = await fetch("/api/canvas/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          node: selectedNode,
          prompt: aiPrompt,
          tokens,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Compose action failed");

      if (action === "rewrite-copy") {
        updateSelectedContent("text", String(data.text ?? ""));
        return;
      }

      if (action === "restyle-section" || action === "change-style") {
        const style = data.style as Partial<PageNodeStyle>;
        for (const [key, value] of Object.entries(style)) {
          updateSelectedStyle(
            key as keyof PageNodeStyle,
            value as PageNodeStyle[keyof PageNodeStyle]
          );
        }
        return;
      }

      const targetNode =
        action === "regenerate-page" ? selectedArtboard.pageTree : selectedNode;
      const path = findNodePath(selectedArtboard.pageTree, targetNode.id) ?? [];
      const heading = path.find((item) => item.type === "heading");
      const paragraph = path.find(
        (item) =>
          item.type === "paragraph" && !item.name.toLowerCase().includes("kicker")
      );
      let nextDocument = document;
      if (heading) {
        nextDocument = updateArtboardTree(nextDocument, selectedArtboard.id, (tree) =>
          updateNodeContent(tree, heading.id, "text", String(data.heading ?? ""))
        );
      }
      if (paragraph) {
        nextDocument = updateArtboardTree(nextDocument, selectedArtboard.id, (tree) =>
          updateNodeContent(tree, paragraph.id, "text", String(data.body ?? ""))
        );
      }
      onChange(nextDocument);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "Compose action failed");
    } finally {
      setAiLoading(false);
    }
  }

  const layers = React.useMemo(
    () =>
      selectedArtboard
        ? flattenNodes(selectedArtboard.pageTree)
        : [],
    [selectedArtboard]
  );

  function handlePreview() {
    if (!exportCode) return;
    const html = generateStandaloneHtml(getExportConfig(exportCode, siteName, siteType));
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const popup = window.open(url, "_blank", "noopener,noreferrer");
    if (!popup) {
      downloadHtml(getExportConfig(exportCode, siteName, siteType));
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  function addOverlay(
    overlay:
      | ComposeDocument["overlays"][number]
  ) {
    updateDocument({
      overlays: [...document.overlays, overlay],
    });
  }

  const activeAiActions = React.useMemo(() => {
    if (!selectedNode) return [];
    if (selectedNode.type === "page") {
      return [{ label: "Regenerate Page", action: "regenerate-page" as const }];
    }
    if (selectedNode.type === "section") {
      return [
        { label: "Regenerate Section", action: "regenerate-section" as const },
        { label: "Restyle", action: "restyle-section" as const },
        { label: "Rewrite Copy", action: "rewrite-copy" as const },
      ];
    }
    return [
      { label: "Edit Content", action: "rewrite-copy" as const },
      { label: "Change Style", action: "change-style" as const },
    ];
  }, [selectedNode]);

  const projectHref = projectId ? `/projects/${projectId}` : "/projects";
  const composeSourceMessage =
    sourceVariant?.previewSource === "ai"
      ? "Compose is showing the editable structured version of this variant, not the raw AI preview. The visual result here can differ from the generated preview."
      : sourceVariant?.previewSource === "fallback"
      ? `Compose is using the structured fallback because the AI preview was unavailable: ${sourceVariant.previewFallbackReason ?? "unknown reason"}`
      : null;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(209,228,252,0.42),transparent_24%),linear-gradient(180deg,#FAFAF8_0%,#F6F2E8_100%)] text-[#1A1A1A]">
      
      {/* ── Canvas Toolbar ── */}
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-[#E5E5E0] bg-white px-3 select-none">
        <Link
          href={projectHref}
          className="flex h-7 w-7 items-center justify-center rounded-[4px] text-[#A0A0A0] hover:bg-[#F5F5F0] hover:text-[#1A1A1A] transition-colors"
          aria-label="Back to project"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12.5 8H3.5" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 4 3.5 8l4 4" />
          </svg>
        </Link>

        <div className="flex-1" />

        {/* Preview + Export */}
        <button
          type="button"
          className="h-7 rounded-[4px] bg-[#4B57DB] px-3 text-[11px] font-medium text-white hover:bg-[#3D49C7] transition-colors disabled:opacity-40"
          onClick={handlePreview}
          disabled={!exportCode}
        >
          Preview
        </button>
        {exportCode ? (
          <ExportMenu
            code={exportCode}
            siteName={siteName}
            siteType={siteType}
            pageTree={exportArtboard?.pageTree ?? null}
            tokens={tokens}
            sectionCode={sectionExportCode}
            sectionName={selectedSection?.name ?? null}
            open={exportOpen}
            onOpenChange={setExportOpen}
          />
        ) : null}
      </div>

      {composeSourceMessage ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-[11px] leading-relaxed text-amber-700">
          {composeSourceMessage}
        </div>
      ) : null}

      {/* ── Main content area ── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Layers panel */}
        {showLayers && (
          <div className="w-[240px] shrink-0 overflow-hidden">
            <LayersPanel
              artboards={document.artboards}
              selectedArtboardId={document.selectedArtboardId}
              selectedNodeId={document.selectedNodeId}
              primaryArtboardId={document.primaryArtboardId}
              breakpoint={document.breakpoint}
              layers={layers}
              onSelectArtboard={(artboardId, nodeId) => {
                const target = document.artboards.find((a) => a.id === artboardId);
                updateDocument({
                  selectedArtboardId: artboardId,
                  selectedNodeId: nodeId,
                  breakpoint: target?.breakpoint ?? document.breakpoint,
                });
              }}
              onSelectNode={(nodeId) => updateDocument({ selectedNodeId: nodeId })}
            />
          </div>
        )}

        {/* Canvas */}
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <div
            ref={canvasRef}
            className={cn(
              "h-full w-full overflow-hidden",
              isPanning ? "cursor-grabbing" : spacePanActive ? "cursor-grab" : "cursor-default"
            )}
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(17,17,17,0.12) 0.8px, transparent 0.95px), linear-gradient(180deg, rgba(255,255,255,0.4), rgba(245,245,240,0.2))",
              backgroundSize: `${Math.max(18, 28 * document.zoom)}px ${Math.max(18, 28 * document.zoom)}px`,
              backgroundPosition: `${document.pan.x % 30}px ${document.pan.y % 30}px`,
            }}
            onMouseDownCapture={onCanvasMouseDownCapture}
            onMouseDown={onBackgroundMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={clearPointerState}
            onMouseLeave={clearPointerState}
          >
            {/* ── References slide-over dock ── */}
            <AnimatePresence initial={false}>
              {referencesDockOpen && (
                <>
                  <div
                    className="absolute inset-0 z-30"
                    onClick={() => setReferencesDockOpen(false)}
                  />
                  <motion.aside
                    initial={{ x: 320 }}
                    animate={{ x: 0 }}
                    exit={{ x: 320 }}
                    transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                    className="absolute inset-y-0 right-0 z-30 flex w-[320px] flex-col border-l border-[#E5E5E0] bg-white shadow-lg"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between border-b border-[#E5E5E0] px-4 py-3">
                      <span className="mono-kicker">References</span>
                      <button
                        type="button"
                        onClick={() => setReferencesDockOpen(false)}
                        className="flex h-6 w-6 items-center justify-center rounded-[2px] text-[#A0A0A0] hover:bg-[#F5F5F0] hover:text-[#6B6B6B]"
                      >
                        <X size={14} strokeWidth={1.5} />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3">
                      {/* Overlay actions */}
                      <div className="mb-3 flex gap-2">
                        <button
                          type="button"
                          className="flex-1 rounded-[4px] border border-[#E5E5E0] px-3 py-2 text-[12px] text-[#6B6B6B] hover:border-[#D1E4FC] hover:text-[#4B57DB]"
                          onClick={() =>
                            addOverlay({
                              id: `note-${Date.now()}`,
                              type: "note",
                              x: (selectedArtboard?.x ?? 0) - 280,
                              y: (selectedArtboard?.y ?? 0) + 120,
                              width: 240,
                              height: 180,
                              text: "Pin a thought here.",
                              color: "#FBE67A",
                            })
                          }
                        >
                          Add Note
                        </button>
                        <button
                          type="button"
                          className="flex-1 rounded-[4px] border border-[#E5E5E0] px-3 py-2 text-[12px] text-[#6B6B6B] hover:border-[#D1E4FC] hover:text-[#4B57DB]"
                          onClick={() =>
                            addOverlay({
                              id: `arrow-${Date.now()}`,
                              type: "arrow",
                              x: (selectedArtboard?.x ?? 0) - 160,
                              y: (selectedArtboard?.y ?? 0) + 80,
                              width: 180,
                              height: 80,
                              color: "#F97316",
                            })
                          }
                        >
                          Add Arrow
                        </button>
                      </div>
                      {/* Reference thumbnails — 4 column grid */}
                      {references.length > 0 ? (
                        <div className="grid grid-cols-4 gap-1.5">
                          {references.map((reference) => (
                            <button
                              key={reference.id}
                              type="button"
                              onClick={() =>
                                addOverlay({
                                  id: `overlay-${reference.id}-${Date.now()}`,
                                  type: "reference",
                                  x: (selectedArtboard?.x ?? 0) - 340,
                                  y: (selectedArtboard?.y ?? 0) + 40,
                                  width: 220,
                                  height: 160,
                                  imageUrl: reference.url,
                                  label: reference.name,
                                })
                              }
                              className="overflow-hidden rounded-[2px] border border-[#E5E5E0] hover:border-[#D1E4FC]"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={reference.thumbnail || reference.url}
                                alt={reference.name}
                                className="aspect-square w-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="py-8 text-center text-[11px] text-[#A0A0A0]">
                          No references in this project.
                        </p>
                      )}
                    </div>
                  </motion.aside>
                </>
              )}
            </AnimatePresence>

            {/* ── System tokens slide-over dock ── */}
            <AnimatePresence initial={false}>
              {systemDockOpen && (
                <>
                  <div
                    className="absolute inset-0 z-30"
                    onClick={() => setSystemDockOpen(false)}
                  />
                  <motion.aside
                    initial={{ x: 320 }}
                    animate={{ x: 0 }}
                    exit={{ x: 320 }}
                    transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                    className="absolute inset-y-0 right-0 z-30 flex w-[320px] flex-col border-l border-[#E5E5E0] bg-white shadow-lg"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between border-b border-[#E5E5E0] px-4 py-3">
                      <span className="mono-kicker">Design Tokens</span>
                      <button
                        type="button"
                        onClick={() => setSystemDockOpen(false)}
                        className="flex h-6 w-6 items-center justify-center rounded-[2px] text-[#A0A0A0] hover:bg-[#F5F5F0] hover:text-[#6B6B6B]"
                      >
                        <X size={14} strokeWidth={1.5} />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-5">
                      {/* Color palette */}
                      <div>
                        <p className="mb-2 font-mono text-[10px] uppercase tracking-wide text-[#A0A0A0]">Colors</p>
                        <div className="space-y-1.5">
                          {Object.entries(tokens.colors).map(([key, value]) => (
                            <div key={key} className="flex items-center gap-3">
                              <span
                                className="block h-5 w-5 shrink-0 rounded-[2px] border border-[#E5E5E0]"
                                style={{ background: value }}
                              />
                              <span className="flex-1 text-[12px] text-[#1A1A1A]">{key}</span>
                              <span className="font-mono text-[10px] text-[#A0A0A0]">{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Typography */}
                      <div>
                        <p className="mb-2 font-mono text-[10px] uppercase tracking-wide text-[#A0A0A0]">Typography</p>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[12px] text-[#1A1A1A]">Font Family</span>
                            <span className="font-mono text-[10px] text-[#A0A0A0]">{tokens.typography.fontFamily}</span>
                          </div>
                          {tokens.typography.scale && Object.entries(tokens.typography.scale).map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between">
                              <span className="text-[12px] text-[#1A1A1A]">{key}</span>
                              <span className="font-mono text-[10px] text-[#A0A0A0]">{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Spacing */}
                      {tokens.spacing && (
                        <div>
                          <p className="mb-2 font-mono text-[10px] uppercase tracking-wide text-[#A0A0A0]">Spacing</p>
                          <div className="flex items-center justify-between">
                            <span className="text-[12px] text-[#1A1A1A]">Unit</span>
                            <span className="font-mono text-[10px] text-[#A0A0A0]">{tokens.spacing.unit}px</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.aside>
                </>
              )}
            </AnimatePresence>

            {/* Artboard render area */}
            <div
              className="absolute inset-0 bg-[#FAFAF8]"
              style={{
                cursor: isPanning ? "grabbing" : spacePanActive ? "grab" : "default",
              }}
            >
              {/* Canvas dot grid */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.015) 0.6px, transparent 0.6px)",
                  backgroundSize: "24px 24px",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  transform: `translate(${document.pan.x}px, ${document.pan.y}px) scale(${document.zoom})`,
                  transformOrigin: "0 0",
                  willChange: "transform",
                }}
              >
                {document.artboards.map((artboard) => {
                  const artboardBp = artboard.breakpoint ?? document.breakpoint;
                  const artboardWidth = BREAKPOINT_WIDTHS[artboardBp];
                  const artboardHeight = artboardPreviewHeight(artboardBp);
                  const isSelected = document.selectedArtboardId === artboard.id;
                  return (
                    <React.Fragment key={artboard.id}>
                      {/* Label above artboard */}
                      <div
                        className="absolute flex items-center gap-2 select-none"
                        style={{ left: artboard.x, top: artboard.y - 28 }}
                      >
                        <span className={cn("font-mono text-[10px] uppercase tracking-[1px]", isSelected ? "text-[#4B57DB]" : "text-[#A0A0A0]")}>
                          {artboardBp.toUpperCase()} · {BREAKPOINT_WIDTHS[artboardBp]}PX
                        </span>
                      </div>

                      {/* Artboard */}
                      <div
                        data-artboard
                        className={cn(
                          "absolute overflow-hidden rounded-[4px] border bg-[#FAFAF8]",
                          "shadow-[0_4px_16px_rgba(0,0,0,0.04)]",
                          isSelected ? "border-[#4B57DB]" : "border-[#E5E5E0]",
                          artboardBp === "desktop" ? "border-t-2 border-t-[#4B57DB]" : "border-t border-t-[#E5E5E0]"
                        )}
                        style={{
                          left: artboard.x,
                          top: artboard.y,
                          width: artboardWidth + 2,
                          ...(artboard.compiledCode
                            ? { height: artboardHeight }
                            : { minHeight: artboardHeight }),
                        }}
                        onMouseDown={(event) => {
                          if (event.button !== 0 || spacePanActive) return;
                          // Don't start artboard drag if clicking inside rendered content
                          if ((event.target as HTMLElement).closest("[data-node-id]")) {
                            updateDocument({
                              selectedArtboardId: artboard.id,
                              breakpoint: artboardBp,
                            });
                            return;
                          }
                          dragRef.current = {
                            kind: "artboard",
                            id: artboard.id,
                            startX: event.clientX,
                            startY: event.clientY,
                            x: artboard.x,
                            y: artboard.y,
                          };
                          updateDocument({
                            selectedArtboardId: artboard.id,
                            selectedNodeId:
                              document.selectedArtboardId === artboard.id
                                ? document.selectedNodeId
                                : artboard.pageTree.id,
                            breakpoint: artboardBp,
                          });
                        }}
                      >
                        {artboard.compiledCode ? (
                          <div className="relative" style={{ width: artboardWidth, height: artboardHeight }}>
                            <iframe
                              srcDoc={buildIframeHTML(artboard.compiledCode, tokens, `compose-${artboard.id}`)}
                              className="absolute inset-0 w-full h-full border-0 pointer-events-none"
                              sandbox="allow-scripts"
                              title={`Compose: ${artboard.name}`}
                              style={{ width: artboardWidth, height: artboardHeight }}
                            />
                            {/* Click-blocking overlay — prevents navigation inside iframe */}
                            <div
                              className="absolute inset-0 z-10 cursor-default"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                              onMouseDown={(e) => e.stopPropagation()}
                            />
                          </div>
                        ) : !artboard.pageTree?.children?.length ? (
                          <div className="flex flex-col items-center justify-center gap-4" style={{ minHeight: artboardHeight }}>
                            {/* Skeleton slat bars echoing logo rhythm */}
                            <div className="flex flex-col items-center gap-2 opacity-40">
                              <div className="h-2 w-[60%] rounded-[1px] bg-[#E5E5E0]" />
                              <div className="h-2 w-[40%] rounded-[1px] bg-[#E5E5E0]" />
                              <div className="h-2 w-[75%] rounded-[1px] bg-[#E5E5E0]" />
                              <div className="h-2 w-[35%] rounded-[1px] bg-[#E5E5E0]" />
                              <div className="h-2 w-[55%] rounded-[1px] bg-[#E5E5E0]" />
                            </div>
                            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#A0A0A0]">
                              No content yet
                            </p>
                          </div>
                        ) : (
                          <>
                            <ComposeDocumentView
                              pageTree={artboard.pageTree}
                              tokens={tokens}
                              breakpoint={artboardBp}
                              selectedNodeId={
                                document.selectedArtboardId === artboard.id
                                  ? document.selectedNodeId
                                  : null
                              }
                              onSelectNode={(nodeId) =>
                                updateDocument({
                                  selectedArtboardId: artboard.id,
                                  selectedNodeId: nodeId,
                                  breakpoint: artboardBp,
                                })
                              }
                              onUpdateContent={(nodeId, key, value) => {
                                updateDocument({ selectedArtboardId: artboard.id, selectedNodeId: nodeId, breakpoint: artboardBp });
                                updateSelectedTree((tree) => updateNodeContent(tree, nodeId, key as keyof PageNodeContent, value));
                              }}
                              interactive={document.selectedArtboardId === artboard.id}
                            />
                            {/* AI regenerating overlay */}
                            {aiLoading && document.selectedArtboardId === artboard.id && (
                              <div
                                className="pointer-events-none absolute inset-0 z-10"
                                style={{
                                  backgroundImage: "radial-gradient(circle, rgba(75,87,219,0.06) 0.5px, transparent 0.5px)",
                                  backgroundSize: "3.5px 3.5px",
                                }}
                              >
                                <div className="absolute left-1/2 top-4 z-20 -translate-x-1/2">
                                  <div className="flex items-center gap-2 rounded-[4px] border border-[#D1E4FC] bg-white px-3 py-1.5 shadow-sm">
                                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#4B57DB]" />
                                    <span className="font-mono text-[10px] text-[#4B57DB]">Generating...</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </React.Fragment>
                  );
                })}

                {document.overlays.map((overlay) => (
                  <div
                    key={overlay.id}
                    data-overlay
                    className="absolute overflow-hidden rounded-[6px] border border-[#E5E5E0] shadow-lg"
                    style={{
                      left: overlay.x,
                      top: overlay.y,
                      width: overlay.width,
                      height: overlay.height,
                      background:
                        overlay.type === "note"
                          ? overlay.color || "#FBE67A"
                          : "#FAFAF8",
                    }}
                    onMouseDown={(event) => {
                      if (event.button !== 0 || spacePanActive) return;
                      event.stopPropagation();
                      dragRef.current = {
                        kind: "overlay",
                        id: overlay.id,
                        startX: event.clientX,
                        startY: event.clientY,
                        x: overlay.x,
                        y: overlay.y,
                      };
                    }}
                  >
                    {overlay.type === "note" ? (
                      <textarea
                        value={overlay.text}
                        onChange={(event) =>
                          updateDocument({
                            overlays: document.overlays.map((item) =>
                              item.id === overlay.id
                                ? { ...item, text: event.target.value }
                                : item
                            ),
                          })
                        }
                        className="h-full w-full resize-none bg-transparent px-4 py-3 text-[13px] leading-relaxed text-black outline-none"
                      />
                    ) : overlay.type === "reference" ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={overlay.imageUrl}
                          alt={overlay.label || "Reference"}
                          className="h-[calc(100%-28px)] w-full object-cover"
                        />
                        <div className="px-3 py-2 text-[11px] text-[#6B6B6B] truncate">
                          {overlay.label || "Reference"}
                        </div>
                      </>
                    ) : (
                      <svg
                        viewBox={`0 0 ${overlay.width} ${overlay.height}`}
                        className="h-full w-full"
                      >
                        <defs>
                          <marker
                            id={`arrowhead-${overlay.id}`}
                            markerWidth="10"
                            markerHeight="7"
                            refX="9"
                            refY="3.5"
                            orient="auto"
                          >
                            <polygon
                              points="0 0, 10 3.5, 0 7"
                              fill={overlay.color || "#F97316"}
                            />
                          </marker>
                        </defs>
                        <line
                          x1="8"
                          y1={overlay.height - 8}
                          x2={overlay.width - 12}
                          y2="12"
                          stroke={overlay.color || "#F97316"}
                          strokeWidth="4"
                          markerEnd={`url(#arrowhead-${overlay.id})`}
                          strokeLinecap="round"
                        />
                      </svg>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Minimap */}
            <AnimatePresence initial={false}>
              {showMinimap && minimap ? (
                <motion.div
                  initial={{ y: 16, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 16, opacity: 0 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="pointer-events-none absolute bottom-16 right-5 z-10 w-[244px] rounded-[4px] border border-[#E5E5E0] bg-white p-3 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <p className="mono-kicker">
                      Minimap
                    </p>
                    <span
                      className="text-[10px] text-[#A0A0A0]"
                      style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                    >
                      {Math.round(document.zoom * 100)}%
                    </span>
                  </div>
                  <div
                    className="relative mt-2 overflow-hidden rounded-[4px] border border-[#E5E5E0] bg-[#F5F5F0]"
                    style={{ width: minimap.frameWidth, height: minimap.frameHeight }}
                  >
                    {minimap.items.map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          "absolute rounded-[2px] border",
                          item.type === "artboard"
                            ? item.id === document.selectedArtboardId
                              ? "border-[#4B57DB] bg-[#D1E4FC]/50"
                              : "border-[#A0A0A0] bg-[#E5E5E0]"
                            : "border-amber-300/60 bg-amber-200/40"
                        )}
                        style={{
                          left: item.left,
                          top: item.top,
                          width: item.width,
                          height: item.height,
                        }}
                      />
                    ))}
                    <div
                      className="absolute rounded-[2px] border border-[#4B57DB] bg-[#D1E4FC]/20"
                      style={{
                        left: minimap.viewport.left,
                        top: minimap.viewport.top,
                        width: minimap.viewport.width,
                        height: minimap.viewport.height,
                      }}
                    />
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            {/* Shortcuts overlay */}
            <AnimatePresence>
              {showShortcuts ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 p-6"
                  onClick={() => setShowShortcuts(false)}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.97, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97, y: 8 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="w-full max-w-sm rounded-[4px] border border-[#E5E5E0] bg-white p-5 shadow-lg"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-[13px] font-semibold text-[#1A1A1A]">Keyboard Shortcuts</p>
                      <button
                        type="button"
                        onClick={() => setShowShortcuts(false)}
                        className="flex h-7 w-7 items-center justify-center rounded-[4px] text-[#A0A0A0] hover:bg-[#F5F5F0] hover:text-[#6B6B6B] transition-colors"
                        aria-label="Close shortcuts"
                      >
                        <X size={14} strokeWidth={1.5} />
                      </button>
                    </div>
                    <div className="mt-4 space-y-2">
                      {[
                        ["L", "Toggle layers panel"],
                        ["I", "Toggle inspector panel"],
                        ["M", "Toggle minimap"],
                        ["Space + drag", "Pan canvas"],
                        ["Middle drag", "Pan canvas"],
                        ["Ctrl + scroll", "Zoom in / out"],
                        ["Esc", "Close / deselect"],
                        ["?", "Keyboard shortcuts"],
                      ].map(([shortcut, label]) => (
                        <div
                          key={shortcut}
                          className="flex items-center justify-between rounded-[4px] border border-[#E5E5E0] bg-[#F5F5F0] px-3 py-2"
                        >
                          <span className="text-[12px] text-[#6B6B6B]">{label}</span>
                          <kbd className="rounded-[2px] border border-[#E5E5E0] bg-white px-1.5 py-0.5 font-mono text-[10px] text-[#A0A0A0]">
                            {shortcut}
                          </kbd>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        {/* Inspector panel */}
        {showInspector && (
          <div className="w-[280px] shrink-0 overflow-hidden">
            <InspectorPanel
              document={document}
              tokens={tokens}
              selectedNode={selectedNode}
              breakpoint={document.breakpoint}
              onUpdateDocument={updateDocument}
              onUpdateContent={updateSelectedContent}
              onUpdateStyle={updateSelectedStyle}
              aiPrompt={aiPrompt}
              onAiPromptChange={setAiPrompt}
              aiLoading={aiLoading}
              aiError={aiError}
              activeAiActions={activeAiActions}
              onApplyAiAction={applyAiAction}
              exportCode={exportCode}
              onPreview={handlePreview}
              onViewCode={() => setExportOpen(true)}
              onExport={() => setExportOpen(true)}
            />
          </div>
        )}
      </div>

      {/* ── Bottom bar ── */}
      <BottomBar
        zoom={document.zoom}
        onZoomIn={() => updateDocument({ zoom: Math.min(5, document.zoom * 1.15) })}
        onZoomOut={() => updateDocument({ zoom: Math.max(0.1, document.zoom / 1.15) })}
        onZoomSet={(z) => updateDocument({ zoom: z })}
        showLayers={showLayers}
        onToggleLayers={() => setShowLayers((v) => !v)}
        showInspector={showInspector}
        onToggleInspector={() => setShowInspector((v) => !v)}
        referencesDockOpen={referencesDockOpen}
        onToggleReferences={() => setReferencesDockOpen((v) => !v)}
        systemDockOpen={systemDockOpen}
        onToggleSystem={() => setSystemDockOpen((v) => !v)}
      />
    </div>
  );
}

export function CanvasPage({
  projectId,
  initialStep,
}: {
  projectId?: string;
  initialStep?: CanvasStage;
}) {
  const canvasCtx = useCanvasStage();
  const [stageLocal, setStageLocal] = React.useState<CanvasStage>(initialStep ?? "collect");
  const stage = canvasCtx?.stage ?? stageLocal;
  const setStage = React.useCallback(
    (s: CanvasStage) => {
      setStageLocal(s);
      canvasCtx?.setStage(s);
    },
    [canvasCtx]
  );
  const [images, setImages] = React.useState<ReferenceImage[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [setName, setSetName] = React.useState("");
  const [linkedProjectId] = React.useState(projectId || null);
  const [projectName, setProjectName] = React.useState("Project");
  const [bootstrapToast, setBootstrapToast] = React.useState<string | null>(null);

  const [analysis, setAnalysis] = React.useState<ImageAnalysis | null>(null);
  const [tasteProfile, setTasteProfile] = React.useState<TasteProfile | null>(null);
  const [analysisLoading, setAnalysisLoading] = React.useState(false);
  const [analysisError, setAnalysisError] = React.useState<string | null>(null);
  const [tasteProfileLoading, setTasteProfileLoading] = React.useState(false);

  const [tokens, setTokens] = React.useState<DesignSystemTokens | null>(null);
  const [markdown, setMarkdown] = React.useState("");
  const [systemLoading, setSystemLoading] = React.useState(false);

  const [sitePrompt, setSitePrompt] = React.useState("");
  const [siteType, setSiteType] = React.useState<SiteType>("auto");
  const [generatedVariants, setGeneratedVariants] = React.useState<GeneratedVariant[]>([]);
  const [selectedVariantId, setSelectedVariantId] = React.useState<string | null>(null);
  const [codeViewerVariantId, setCodeViewerVariantId] = React.useState<string | null>(null);
  const [generateLoading, setGenerateLoading] = React.useState(false);
  const [generateError, setGenerateError] = React.useState<string | null>(null);
  const [composeDocument, setComposeDocument] = React.useState<ComposeDocument | null>(null);
  // Guard against race conditions when the user triggers generation multiple times
  const generateRequestIdRef = React.useRef(0);
  const collectRequestIdRef = React.useRef(0);
  const hydratedCanvasRef = React.useRef(false);
  const persistTimeoutRef = React.useRef<number | null>(null);
  const collectDebounceRef = React.useRef<number | null>(null);
  const collectHydrationPrimedRef = React.useRef(false);
  const skipInitialCollectRefreshRef = React.useRef(false);

  React.useEffect(() => {
    if (tokens) setMarkdown(tokensToMarkdown(tokens));
  }, [tokens]);

  React.useEffect(() => {
    if (!linkedProjectId) return;
    hydratedCanvasRef.current = false;
    collectHydrationPrimedRef.current = false;

    const refs = loadProjectRefs(linkedProjectId);
    const storedState = getProjectState(linkedProjectId);
    const meta = loadProjectMeta(linkedProjectId);
    const persistedSession = readCanvasSession(linkedProjectId);
    const persistedComposeWorkspace = readComposeWorkspace(linkedProjectId);
    const colorsCount = meta?.palette.length ?? storedState.palette?.length ?? 0;
    const fontsCount = [meta?.headingFont, meta?.bodyFont].filter(Boolean).length;
    const restoredAnalysis = sanitizeImageAnalysis(
      persistedSession?.analysis ?? storedState.canvas?.analysis ?? null
    );
    const restoredTasteProfile = sanitizeTasteProfile(
      persistedSession?.tasteProfile ?? storedState.canvas?.tasteProfile ?? null
    );
    const restoredDesignTokens = sanitizeDesignTokens(
      persistedSession?.designTokens ?? storedState.canvas?.designTokens ?? null
    );
    const restoredCanvas = {
      ...storedState.canvas,
      stage: normalizeCanvasStage(
        persistedSession?.stage ?? storedState.canvas?.stage ?? initialStep ?? null
      ),
      referenceSetName:
        persistedSession?.referenceSetName ?? storedState.canvas?.referenceSetName,
      analysis: restoredAnalysis,
      tasteProfile: restoredTasteProfile,
      designTokens: restoredDesignTokens,
      designSystemMarkdown:
        persistedSession?.designSystemMarkdown ??
        storedState.canvas?.designSystemMarkdown ??
        "",
      componentPrompt:
        persistedSession?.componentPrompt ?? storedState.canvas?.componentPrompt ?? "",
      siteType: persistedSession?.siteType ?? storedState.canvas?.siteType ?? "auto",
      generatedVariants: normalizeVariants(
        persistedSession?.variants ?? storedState.canvas?.generatedVariants ?? []
      ),
      selectedVariantId:
        persistedSession?.selectedVariantId ?? storedState.canvas?.selectedVariantId ?? null,
      composeDocument:
        persistedSession?.composeDocument ?? storedState.canvas?.composeDocument ?? null,
      generatedSite:
        persistedSession?.generatedSite ?? storedState.canvas?.generatedSite ?? null,
    };
    const restoredVariants = restoredCanvas.generatedVariants;
    const restoredTargetVariant = restoredCanvas.selectedVariantId
      ? (restoredVariants.find((v) => v.id === restoredCanvas.selectedVariantId) ?? restoredVariants[0])
      : restoredVariants[0];
    const restoredComposeDocument =
      restoredTargetVariant &&
      (restoredCanvas.composeDocument || persistedComposeWorkspace)
        ? rehydrateComposeDocument(
            createComposeDocument(restoredTargetVariant),
            restoredCanvas.composeDocument ?? persistedComposeWorkspace
          )
        : null;
    skipInitialCollectRefreshRef.current = Boolean(restoredAnalysis || restoredDesignTokens);

    if (meta) {
      setProjectName(meta.name);
    }

    if (refs.length > 0) {
      setImages(refs);
      setSelectedIds(new Set(refs.map((r) => r.id)));
    }

    if (meta) {
      setSetName(restoredCanvas.referenceSetName ?? meta.name);

      setAnalysis(restoredCanvas.analysis ?? null);
      setTasteProfile(restoredCanvas.tasteProfile ?? null);

      const projectTokens = restoredDesignTokens
        ? applyProjectTypography(restoredDesignTokens, storedState.typography)
        : meta.palette.length > 0
        ? applyProjectTypography(paletteToTokens(meta.palette), storedState.typography)
        : null;

      setTokens(projectTokens);
      setMarkdown(projectTokens ? tokensToMarkdown(projectTokens) : "");

      setSitePrompt(restoredCanvas.componentPrompt ?? inferSiteName(meta.name));
      setSiteType(restoredCanvas.siteType ?? "auto");
      setGeneratedVariants(restoredVariants);
      setSelectedVariantId(
        restoredCanvas.selectedVariantId ?? restoredVariants[0]?.id ?? null
      );
      setComposeDocument(restoredComposeDocument);

      if (restoredComposeDocument) {
        setStage("compose");
      } else {
        // Variants (if any) now show inline in CollectView — always restore to collect
        setStage("collect");
      }
    }

    hydratedCanvasRef.current = true;
    if (persistedSession?.variants?.length || persistedSession?.composeDocument) {
      setBootstrapToast("Session restored");
    } else {
      setBootstrapToast(
        `${refs.length} references, ${colorsCount} colors, ${fontsCount} fonts loaded`
      );
    }
  }, [initialStep, linkedProjectId]);

  React.useEffect(() => {
    if (!bootstrapToast) return;
    const timeout = window.setTimeout(() => setBootstrapToast(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [bootstrapToast]);

  const referenceSignature = React.useMemo(
    () => images.map((image) => `${image.id}:${image.url}`).sort().join("|"),
    [images]
  );

  React.useEffect(() => {
    if (typeof window === "undefined" || !linkedProjectId) return;
    const params = new URLSearchParams(window.location.search);
    params.set("project", linkedProjectId);
    params.set("step", stage);
    const nextUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", nextUrl);
  }, [linkedProjectId, stage]);

  const selectedVariant = React.useMemo(
    () =>
      generatedVariants.find((variant) => variant.id === selectedVariantId) ??
      generatedVariants[0] ??
      null,
    [generatedVariants, selectedVariantId]
  );
  const codeViewerVariant = React.useMemo(
    () =>
      generatedVariants.find((variant) => variant.id === codeViewerVariantId) ??
      null,
    [codeViewerVariantId, generatedVariants]
  );

  const exportArtboard = React.useMemo(
    () => getExportArtboard(composeDocument),
    [composeDocument]
  );

  const exportCode = React.useMemo(
    () =>
      exportArtboard && tokens
        ? compilePageTreeToTSX(exportArtboard.pageTree, tokens, exportArtboard.name)
        : selectedVariant?.compiledCode ?? null,
    [exportArtboard, selectedVariant, tokens]
  );

  React.useEffect(() => {
    if (!linkedProjectId || !hydratedCanvasRef.current) return;

    const persistedComposeDocument =
      composeDocument && exportCode && exportArtboard
        ? {
            ...composeDocument,
            exportArtifact: {
              code: exportCode,
              name: exportArtboard.name,
              updatedAt: new Date().toISOString(),
            },
          }
        : composeDocument;

    const persistedGeneratedSite =
      exportCode && exportArtboard
        ? {
            code: exportCode,
            name: exportArtboard.name,
            prompt: sitePrompt,
            siteType,
            updatedAt: new Date().toISOString(),
          }
        : null;

    if (persistTimeoutRef.current) {
      window.clearTimeout(persistTimeoutRef.current);
    }

    persistTimeoutRef.current = window.setTimeout(() => {
      const session: PersistedCanvasSession = {
        stage,
        referenceSetName: setName,
        analysis,
        tasteProfile,
        designTokens: tokens,
        designSystemMarkdown: markdown,
        componentPrompt: sitePrompt,
        siteType,
        variants: generatedVariants,
        selectedVariantId,
        composeDocument: persistedComposeDocument,
        generatedSite: persistedGeneratedSite,
        updatedAt: new Date().toISOString(),
      };

      writeCanvasSession(linkedProjectId, session);
      if (persistedComposeDocument) {
        writeComposeWorkspace(linkedProjectId, persistedComposeDocument);
      } else {
        clearComposeWorkspace(linkedProjectId);
      }
      upsertProjectState(linkedProjectId, {
        canvas: {
          stage,
          referenceSetName: setName,
          analysis,
          tasteProfile,
          designTokens: tokens,
          designSystemMarkdown: markdown,
          componentPrompt: sitePrompt,
          siteType,
          generatedVariants,
          selectedVariantId,
          composeDocument: persistedComposeDocument,
          generatedSite: persistedGeneratedSite,
        },
      });
    }, 300);

    return () => {
      if (persistTimeoutRef.current) {
        window.clearTimeout(persistTimeoutRef.current);
      }
    };
  }, [
    analysis,
    composeDocument,
    exportArtboard,
    exportCode,
    generatedVariants,
    linkedProjectId,
    markdown,
    selectedVariantId,
    setName,
    sitePrompt,
    siteType,
    stage,
    tasteProfile,
    tokens,
  ]);

  async function handleFilesAdded(files: File[]) {
    if (files.length === 0) return;
    const now = new Date().toISOString();
    const persistedReferences = await Promise.all(
      files.map(async (file, index) => ({
        id: `upload-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
        imageUrl: await fileToDataUrl(file),
        source: "upload" as const,
        title: file.name,
        addedAt: now,
        projectId: linkedProjectId ?? "canvas",
      }))
    );
    const newImages = persistedReferences.map(toReferenceImage);

    if (linkedProjectId) {
      appendProjectReferences(linkedProjectId, persistedReferences);
    }

    setImages((prev) => [...newImages, ...prev]);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      newImages.forEach((img) => next.add(img.id));
      return next;
    });
    setBootstrapToast(
      `Added ${newImages.length} reference${newImages.length === 1 ? "" : "s"}`
    );
  }

  function handleToggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleRemoveImage(id: string) {
    if (linkedProjectId) {
      setProjectReferences(
        linkedProjectId,
        listProjectReferences(linkedProjectId).filter((reference) => reference.id !== id)
      );
    }
    setImages((prev) => {
      const image = prev.find((item) => item.id === id);
      if (image?.file) URL.revokeObjectURL(image.url);
      return prev.filter((item) => item.id !== id);
    });
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function handleImportReferences(payload: {
    references: Array<{
      id: string;
      imageUrl: string;
      source: "upload" | "arena" | "pinterest" | "url";
      sourceUrl?: string;
      title?: string;
      addedAt: string;
      projectId: string;
    }>;
    notice?: string;
  }) {
    if (payload.references.length === 0) return;
    if (linkedProjectId) {
      appendProjectReferences(linkedProjectId, payload.references);
    }
    const nextImages = payload.references.map(toReferenceImage);
    setImages((prev) => [...nextImages, ...prev]);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      nextImages.forEach((image) => next.add(image.id));
      return next;
    });
    if (payload.notice) {
      setBootstrapToast(payload.notice);
    }
  }

  const requestAnalysisForImages = React.useCallback(async (
    selected: ReferenceImage[]
  ): Promise<ImageAnalysis> => {
    const base64Images = await Promise.all(
      selected.slice(0, 6).map(async (img) => {
        if (img.file) return fileToDataUrl(img.file);
        return img.url;
      })
    );

    const response = await fetch("/api/canvas/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images: base64Images }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `Analysis failed (${response.status})`);
    }

    const data = await response.json();
    const analysis = sanitizeImageAnalysis(data.analysis);
    if (!analysis) {
      throw new Error("Analysis returned an invalid payload");
    }
    return analysis;
  }, []);

  const requestSystemForAnalysis = React.useCallback(async (nextAnalysis: ImageAnalysis) => {
    try {
      const response = await fetch("/api/canvas/generate-system", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis: nextAnalysis, mode: "auto" }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "System generation failed");
      }

      const data = await response.json();
      const nextTokens = sanitizeDesignTokens(data.tokens);
      if (!nextTokens) {
        throw new Error("System generation returned an invalid token payload");
      }
      return {
        tokens: nextTokens,
        markdown:
          typeof data.markdown === "string" && data.markdown.length > 0
            ? data.markdown
            : tokensToMarkdown(nextTokens),
      };
    } catch {
      const localTokens = analysisToTokens(nextAnalysis);
      return {
        tokens: localTokens,
        markdown: tokensToMarkdown(localTokens),
      };
    }
  }, []);

  const generateTasteProfile = React.useCallback(async (
    selected: ReferenceImage[],
    nextTokens: DesignSystemTokens | null
  ): Promise<TasteProfile> => {
    const referenceUrls = await Promise.all(
      selected.slice(0, 8).map(async (img) => {
        if (img.file) return fileToDataUrl(img.file);
        return img.url;
      })
    );

    const response = await fetch("/api/taste/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: linkedProjectId,
        referenceUrls,
        existingTokens: nextTokens,
      }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const error =
        data && typeof data === "object" && "error" in data
          ? String((data as { error?: unknown }).error)
          : "Taste profile generation failed";
      throw new Error(error);
    }
    const nextTasteProfile = sanitizeTasteProfile(data);
    if (!nextTasteProfile) {
      throw new Error("Taste profile generation returned an invalid payload");
    }
    return nextTasteProfile;
  }, [linkedProjectId]);

  const refreshCollectTaste = React.useCallback(async () => {
    const selected = images;
    if (selected.length === 0) return;
    const requestId = ++collectRequestIdRef.current;

    setAnalysisLoading(true);
    setSystemLoading(true);
    setTasteProfileLoading(true);
    setAnalysisError(null);

    try {
      const nextAnalysis = await requestAnalysisForImages(selected);
      if (requestId !== collectRequestIdRef.current) return;
      setAnalysis(nextAnalysis);

      const nextSystem = await requestSystemForAnalysis(nextAnalysis);
      if (requestId !== collectRequestIdRef.current) return;
      setTokens(nextSystem.tokens);
      setMarkdown(nextSystem.markdown);

      const nextTasteProfile = await generateTasteProfile(selected, nextSystem.tokens);
      if (requestId !== collectRequestIdRef.current) return;
      setTasteProfile(nextTasteProfile);
    } catch (error) {
      if (requestId !== collectRequestIdRef.current) return;
      setAnalysisError(error instanceof Error ? error.message : "Analysis failed");
    } finally {
      if (requestId === collectRequestIdRef.current) {
        setAnalysisLoading(false);
        setSystemLoading(false);
        setTasteProfileLoading(false);
      }
    }
  }, [
    generateTasteProfile,
    images,
    requestAnalysisForImages,
    requestSystemForAnalysis,
  ]);

  React.useEffect(() => {
    if (!hydratedCanvasRef.current) return;
    if (images.length === 0) return;

    if (!collectHydrationPrimedRef.current) {
      collectHydrationPrimedRef.current = true;
      if (skipInitialCollectRefreshRef.current) {
        skipInitialCollectRefreshRef.current = false;
        return;
      }
    }

    if (collectDebounceRef.current) {
      window.clearTimeout(collectDebounceRef.current);
    }

    collectDebounceRef.current = window.setTimeout(() => {
      void refreshCollectTaste();
    }, 1000);

    return () => {
      if (collectDebounceRef.current) {
        window.clearTimeout(collectDebounceRef.current);
      }
    };
  }, [linkedProjectId, referenceSignature, refreshCollectTaste, images.length]);

  const requestVariantGeneration = React.useCallback(async ({
    promptOverride,
    variantStrategy,
    regenerationIntent,
  }: {
    promptOverride?: string;
    variantStrategy?: "safe" | "creative" | "alternative";
    regenerationIntent?: "more-like-this" | "different-approach";
  }) => {
    if (!tokens) return [];
    const requestId = ++generateRequestIdRef.current;
    setGenerateLoading(true);
    setGenerateError(null);
    const promptValue = (promptOverride ?? sitePrompt).trim();

    if (!promptValue) {
      setGenerateLoading(false);
      setGenerateError("Add a prompt before generating variants.");
      return [];
    }

    try {
      const response = await fetch("/api/canvas/generate-component", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "variants",
          prompt: promptValue,
          tokens,
          tasteProfile,
          referenceUrls: images.slice(0, 8).map((image) => image.url),
          siteType,
          siteName: setName || inferSiteName(promptValue),
          variantStrategy,
          regenerationIntent,
          useDesignNode: true,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Variant generation failed");

      // Discard the response if a newer request has already been issued
      if (requestId !== generateRequestIdRef.current) return [];

      const normalizedVariants = normalizeVariants(data.variants ?? []);
      if (!setName.trim() && data.siteName) {
        setSetName(data.siteName);
      }
      return normalizedVariants;
    } catch (error) {
      if (requestId !== generateRequestIdRef.current) return [];
      setGenerateError(error instanceof Error ? error.message : "Variant generation failed");
      return [];
    } finally {
      if (requestId === generateRequestIdRef.current) {
        setGenerateLoading(false);
      }
    }
  }, [images, setName, sitePrompt, siteType, tasteProfile, tokens]);

  async function handleGenerateVariants() {
    const normalizedVariants = await requestVariantGeneration({});
    if (normalizedVariants.length === 0) return;
    setGeneratedVariants(normalizedVariants);
    setSelectedVariantId(normalizedVariants[0]?.id ?? null);
    // Stay on "collect" — variants now appear at the bottom of CollectView
  }

  async function handleRegenerateVariant(
    variant: GeneratedVariant,
    options: {
      intent: "more-like-this" | "different-approach";
      promptOverride?: string;
    }
  ) {
    const nextVariants = await requestVariantGeneration({
      promptOverride: options.promptOverride,
      variantStrategy: variant.strategy ?? "safe",
      regenerationIntent: options.intent,
    });
    const replacement = nextVariants[0];
    if (!replacement) return;

    setGeneratedVariants((current) =>
      current.map((item) =>
        item.id === variant.id
          ? {
              ...replacement,
              isFavorite: item.isFavorite,
              strategy: item.strategy ?? replacement.strategy,
              strategyLabel: item.strategyLabel ?? replacement.strategyLabel,
            }
          : item
      )
    );
    setSelectedVariantId(replacement.id);
    // Stay on "collect" — variants shown inline in CollectView
  }

  function handleOpenCompose(preferredVariantId?: string) {
    if (generatedVariants.length === 0) return;
    const targetVariant = preferredVariantId
      ? (generatedVariants.find((v) => v.id === preferredVariantId) ?? generatedVariants[0])
      : (selectedVariant ?? generatedVariants[0]);
    if (!targetVariant) return;

    const savedWorkspace = linkedProjectId ? readComposeWorkspace(linkedProjectId) : null;
    const baseDocument = createComposeDocument(targetVariant);
    const nextDocument = rehydrateComposeDocument(baseDocument, savedWorkspace);

    // Auto-fit the single desktop artboard into the visible viewport on first open
    let zoom = nextDocument.zoom;
    let pan = nextDocument.pan;
    if (!savedWorkspace) {
      const totalSpan = BREAKPOINT_WIDTHS["desktop"]; // = 1440
      const usableWidth = typeof window !== "undefined"
        ? Math.max(600, window.innerWidth - 48 - 280) // sidebar + inspector
        : 800;
      zoom = Math.min(0.75, Math.max(0.15, usableWidth / (totalSpan + 400)));
      pan = {
        x: Math.max(40, (usableWidth - totalSpan * zoom) / 2),
        y: 120,
      };
    }

    setComposeDocument({
      ...nextDocument,
      selectedArtboardId: nextDocument.artboards[0]?.id ?? null,
      primaryArtboardId: nextDocument.artboards[0]?.id ?? null,
      selectedNodeId: nextDocument.artboards[0]?.pageTree.id ?? null,
      zoom,
      pan,
    });
    if (preferredVariantId) setSelectedVariantId(preferredVariantId);
    setStage("compose");
  }

  const hasReferences = images.length > 0;
  const hasTokens = tokens !== null;
  const tokenCount = tokens ? Object.keys(tokens.colors).length : 0;
  const canGenerateVariants =
    hasTokens && sitePrompt.trim().length > 0 && !generateLoading;
  const collectCount =
    hasReferences && hasTokens
      ? `${images.length} refs · ${tokenCount} tokens`
      : hasReferences
      ? `${images.length} refs`
      : hasTokens
      ? `${tokenCount} tokens`
      : undefined;

  const completions: Partial<Record<CanvasStage, boolean>> = {
    collect: hasReferences || hasTokens,
    compose: false,
  };

  const availability: Record<
    CanvasStage,
    { available: boolean; tooltip?: string }
  > = {
    collect: { available: true },
    compose: {
      available: generatedVariants.length > 0,
      tooltip: "Generate variants first",
    },
  };

  // Keep context availability in sync so the sidebar reflects current state
  React.useEffect(() => {
    canvasCtx?.setAvailability(availability);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasReferences, hasTokens, generatedVariants.length]);

  const stepCounts: Partial<Record<CanvasStage, string>> = {
    collect: collectCount,
  };
  const composeActive = stage === "compose" && Boolean(composeDocument && tokens);

  return (
    <div className="relative flex h-full flex-col overflow-hidden">

      {bootstrapToast ? (
        <div
          className={cn(
            "pointer-events-none absolute right-6 z-20",
            composeActive ? "top-4" : "top-[5.25rem]"
          )}
        >
          <div className="rounded-lg border border-[#3B5EFC]/30 bg-[#3B5EFC] px-4 py-3 text-[11px] font-medium text-white shadow-[0_18px_48px_rgba(59,94,252,0.28)]">
            {bootstrapToast}
          </div>
        </div>
      ) : null}

      {stage === "compose" && composeDocument && tokens ? (
        <ComposeStage
          document={composeDocument}
          tokens={tokens}
          references={images}
          projectId={linkedProjectId}
          projectName={projectName}
          siteName={setName || inferSiteName(sitePrompt)}
          siteType={siteType}
          sourceVariant={selectedVariant}
          onChange={setComposeDocument}
        />
      ) : (
        <CanvasStageLayout
          stage={stage}
          centerPanel={
            linkedProjectId ? (
              <CollectView
                projectId={linkedProjectId}
                referenceSetName={setName}
                onReferenceSetNameChange={setSetName}
                images={images}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onRemove={handleRemoveImage}
                onFilesAdded={handleFilesAdded}
                onImport={handleImportReferences}
                analysis={analysis}
                tokens={tokens}
                tasteProfile={tasteProfile}
                processing={analysisLoading || systemLoading}
                tasteProfileLoading={tasteProfileLoading}
                error={analysisError}
                siteType={siteType}
                onSiteTypeChange={setSiteType}
                sitePrompt={sitePrompt}
                onSitePromptChange={setSitePrompt}
                onGenerateVariants={handleGenerateVariants}
                canGenerate={canGenerateVariants}
                generateLoading={generateLoading}
                generateError={generateError}
                variants={generatedVariants}
                selectedVariantId={selectedVariantId}
                onSelectVariant={setSelectedVariantId}
                onOpenCompose={handleOpenCompose}
                onViewCode={setCodeViewerVariantId}
                onRegenerateVariant={handleRegenerateVariant}
              />
            ) : (
              <div className="flex h-full items-center justify-center p-6 text-sm text-text-muted">
                Open Canvas from a project to collect references and generate variants.
              </div>
            )
          }
          rightWidth="300px"
        />
      )}

      <Dialog
        open={Boolean(codeViewerVariant)}
        onOpenChange={(open) => {
          if (!open) setCodeViewerVariantId(null);
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-5xl overflow-hidden border border-border-primary bg-bg-primary">
          <DialogHeader>
            <DialogTitle>Generated Code</DialogTitle>
            <DialogDescription>
              Inspect the exact TSX returned for this variant. This helps us tell whether the
              model output itself is generic, or whether the UI is masking it.
            </DialogDescription>
          </DialogHeader>

          {codeViewerVariant ? (
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-text-muted">
                <span className="rounded-full border border-border-primary px-2.5 py-1">
                  {codeViewerVariant.name}
                </span>
                <span className="rounded-full border border-border-primary px-2.5 py-1">
                  {codeViewerVariant.previewSource === "fallback" ? "Fallback" : "AI"}
                </span>
                {codeViewerVariant.previewFallbackReason ? (
                  <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-amber-200">
                    {codeViewerVariant.previewFallbackReason}
                  </span>
                ) : null}
                {codeViewerVariant.compiledCode ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="ml-auto h-8 rounded-full px-3 text-[10px] uppercase tracking-[0.12em]"
                    onClick={() => {
                      void copyToClipboard(codeViewerVariant.compiledCode ?? "");
                    }}
                  >
                    Copy Code
                  </Button>
                ) : null}
              </div>

              <div className="min-h-0 overflow-auto rounded-lg border border-border-primary bg-bg-secondary p-4">
                <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-6 text-text-secondary">
                  {codeViewerVariant.compiledCode ?? "No compiled code is attached to this variant."}
                </pre>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── V3 Unified Canvas Page ──────────────────────────────────────────────────
// New entry point that replaces the Collect/Compose stage split with a single
// unified canvas. Wraps everything in CanvasProvider and renders UnifiedCanvasView.
// The legacy CanvasPage is preserved above for reference/rollback.

import { CanvasProvider } from "@/lib/canvas/canvas-context";
import { UnifiedCanvasView } from "./components/UnifiedCanvasView";

export function UnifiedCanvasPage({
  projectId,
}: {
  projectId: string;
}) {
  return (
    <CanvasProvider projectId={projectId}>
      <div className="relative flex h-full flex-col overflow-hidden">
        <UnifiedCanvasView projectId={projectId} />
      </div>
    </CanvasProvider>
  );
}
