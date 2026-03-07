"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ImageAnalysis, ReferenceImage } from "@/lib/canvas/analyze-images";
import type { DesignSystemTokens } from "@/lib/canvas/generate-system";
import { analysisToTokens, tokensToMarkdown } from "@/lib/canvas/generate-system";
import { UploadZone } from "./components/UploadZone";
import { ReferenceGrid } from "./components/ReferenceGrid";
import { AnalysisPanel } from "./components/AnalysisPanel";
import { SystemEditor } from "./components/SystemEditor";
import { ComposeDocumentView } from "./components/ComposeDocumentView";
import {
  BREAKPOINT_WIDTHS,
  compilePageTreeToTSX,
  createComposeDocument,
  findNodeById,
  findNodePath,
  flattenNodes,
  getExportArtboard,
  getSelectedArtboard,
  inferSiteName,
  rehydrateComposeDocument,
  updateArtboardTree,
  updateNodeContent,
  updateNodeStyleValue,
  type Breakpoint,
  type CanvasStage,
  type ComposeDocument,
  type GeneratedVariant,
  type InspectorTab,
  type PageNode,
  type PageNodeContent,
  type PageNodeStyle,
} from "@/lib/canvas/compose";
import {
  copyToClipboard,
  deployToVercel,
  downloadHtml,
  downloadNextjsZip,
  downloadTSX,
  generateStandaloneHtml,
  toFramerPasteReady,
  type ExportConfig,
} from "@/lib/canvas/export-formats";
import {
  getProjectById,
  getProjectState,
  listProjectReferences,
  upsertProjectState,
  type StoredProjectFont,
} from "@/lib/project-store";
import { SITE_TYPE_OPTIONS, type SiteType } from "@/lib/canvas/templates";

type StageMeta = { label: string; number: string; description: string };

const STAGE_META: Record<CanvasStage, StageMeta> = {
  moodboard: { label: "Moodboard", number: "01", description: "Upload and analyze references" },
  system: { label: "System", number: "02", description: "Generate design tokens" },
  generate: { label: "Generate", number: "03", description: "Create full-page variants" },
  compose: { label: "Compose", number: "04", description: "Refine on an infinite board" },
};

const BREAKPOINT_OPTIONS: Array<{ key: Breakpoint; label: string; short: string }> = [
  { key: "desktop", label: "Desktop", short: "1440" },
  { key: "tablet", label: "Tablet", short: "768" },
  { key: "mobile", label: "Mobile", short: "375" },
];

const STATIC_PALETTES: Record<string, { name: string; palette: string[] }> = {
  "acme-rebrand": { name: "Acme Rebrand", palette: ["#1b1b1f", "#f97316", "#fed7aa", "#0f172a", "#e4e4e7"] },
  "fintech-dashboard": { name: "FinTech Dashboard", palette: ["#020617", "#0f172a", "#1d4ed8", "#38bdf8", "#e5e7eb"] },
  "editorial-magazine": { name: "Editorial Magazine", palette: ["#f9fafb", "#1f2937", "#111827", "#e5e7eb", "#f97316"] },
  "personal-portfolio": { name: "Personal Portfolio", palette: ["#020617", "#f9fafb", "#64748b", "#e5e7eb", "#0f172a"] },
};

function loadProjectRefs(projectId: string): ReferenceImage[] {
  return listProjectReferences(projectId).map((reference) => ({
    id: reference.id || `ref-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    url: reference.imageUrl,
    thumbnail: reference.imageUrl,
    name: reference.title || "Reference",
  }));
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

function getComposeWorkspaceKey(projectId: string) {
  return `${COMPOSE_WORKSPACE_KEY_PREFIX}${projectId}`;
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
    window.localStorage.setItem(getComposeWorkspaceKey(projectId), JSON.stringify(document));
  } catch {
    // Ignore quota/storage issues and keep the in-memory session alive.
  }
}

function artboardPreviewHeight(breakpoint: Breakpoint) {
  if (breakpoint === "mobile") return 1320;
  if (breakpoint === "tablet") return 1540;
  return 1780;
}

function formatNodeLabel(node: PageNode): string {
  const content = node.content?.text || node.content?.label || node.name;
  return content.length > 42 ? `${content.slice(0, 42)}…` : content;
}

function normalizeVariant(variant: GeneratedVariant): GeneratedVariant {
  const legacyVariant = variant as GeneratedVariant & { favorite?: boolean };
  return {
    ...variant,
    previewImage: variant.previewImage ?? null,
    compiledCode: variant.compiledCode ?? null,
    isFavorite: variant.isFavorite ?? legacyVariant.favorite ?? false,
  };
}

function normalizeVariants(variants: GeneratedVariant[]): GeneratedVariant[] {
  return variants.map(normalizeVariant);
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

function toggleVariantCompare(
  variantIds: string[],
  targetId: string
): string[] {
  if (variantIds.includes(targetId)) {
    return variantIds.filter((id) => id !== targetId);
  }
  if (variantIds.length >= 2) {
    return [variantIds[1], targetId];
  }
  return [...variantIds, targetId];
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
}: {
  code: string | null;
  siteName: string;
  siteType: SiteType;
}) {
  const [copied, setCopied] = React.useState<string | null>(null);
  if (!code) return null;
  const sourceCode = code;

  const cfg = getExportConfig(sourceCode, siteName, siteType);

  async function handleCopy(format: "tsx" | "framer") {
    const text = format === "framer" ? toFramerPasteReady(sourceCode) : sourceCode;
    const ok = await copyToClipboard(text);
    if (!ok) return;
    setCopied(format);
    setTimeout(() => setCopied(null), 1800);
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      <Button
        type="button"
        variant="secondary"
        className="h-8 text-[10px] uppercase tracking-[0.12em]"
        onClick={() => handleCopy("tsx")}
      >
        {copied === "tsx" ? "Copied" : "Copy TSX"}
      </Button>
      <Button
        type="button"
        variant="secondary"
        className="h-8 text-[10px] uppercase tracking-[0.12em]"
        onClick={() => handleCopy("framer")}
      >
        {copied === "framer" ? "Copied" : "Framer"}
      </Button>
      <Button
        type="button"
        variant="secondary"
        className="h-8 text-[10px] uppercase tracking-[0.12em]"
        onClick={() => downloadTSX(sourceCode, siteName)}
      >
        Download TSX
      </Button>
      <Button
        type="button"
        variant="secondary"
        className="h-8 text-[10px] uppercase tracking-[0.12em]"
        onClick={() => downloadHtml(cfg)}
      >
        HTML
      </Button>
      <Button
        type="button"
        variant="secondary"
        className="h-8 text-[10px] uppercase tracking-[0.12em]"
        onClick={() => downloadNextjsZip(cfg)}
      >
        Next.js ZIP
      </Button>
      <Button
        type="button"
        className="h-8 text-[10px] uppercase tracking-[0.12em]"
        onClick={() => deployToVercel(cfg)}
      >
        Deploy
      </Button>
    </div>
  );
}

function VariantCard({
  variant,
  tokens,
  active,
  onSelect,
  onFavorite,
  onCompare,
  onOpenCompose,
  compareActive,
  compareDisabled,
}: {
  variant: GeneratedVariant;
  tokens: DesignSystemTokens;
  active: boolean;
  onSelect: () => void;
  onFavorite: () => void;
  onCompare: () => void;
  onOpenCompose: () => void;
  compareActive: boolean;
  compareDisabled: boolean;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={cn(
        "w-full overflow-hidden rounded-[28px] border bg-bg-primary text-left transition-colors",
        active
          ? "border-accent shadow-[0_0_0_1px_var(--accent)]"
          : "border-border-primary hover:border-border-hover"
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="block w-full text-left"
      >
        <div className="border-b border-border-subtle px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[13px] font-medium text-text-primary">{variant.name}</p>
              <p className="mt-1 text-[11px] text-text-muted">
                {formatVariantTimestamp(variant.createdAt)}
              </p>
            </div>
            {variant.isFavorite ? (
              <span className="rounded-full bg-accent/12 px-2.5 py-1 text-[9px] uppercase tracking-[0.12em] text-accent">
                Favorite
              </span>
            ) : null}
          </div>
          {variant.description ? (
            <p className="mt-3 text-[11px] leading-relaxed text-text-muted">
              {variant.description}
            </p>
          ) : null}
        </div>
        <div className="bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent)] p-4">
          <div className="overflow-hidden rounded-[22px] border border-border-primary bg-black/10">
            <div className="h-[380px] overflow-y-auto">
              <ComposeDocumentView
                pageTree={variant.pageTree}
                tokens={tokens}
                breakpoint="desktop"
                scale={variantCardScale(320)}
                className="pointer-events-none"
              />
            </div>
          </div>
        </div>
      </button>
      <div className="flex flex-wrap items-center gap-2 border-t border-border-subtle px-4 py-3">
        <button
          type="button"
          onClick={onFavorite}
          className={cn(
            "rounded-full px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] transition-colors",
            variant.isFavorite
              ? "bg-accent text-white"
              : "bg-bg-secondary text-text-muted hover:text-text-secondary"
          )}
        >
          {variant.isFavorite ? "★ Starred" : "☆ Star"}
        </button>
        <button
          type="button"
          onClick={onCompare}
          disabled={compareDisabled}
          className={cn(
            "rounded-full px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] transition-colors",
            compareActive
              ? "bg-white text-black"
              : "bg-bg-secondary text-text-muted hover:text-text-secondary",
            compareDisabled && "cursor-not-allowed opacity-45"
          )}
        >
          {compareActive ? "Comparing" : "Compare"}
        </button>
        <Button
          type="button"
          className="ml-auto h-8 rounded-full bg-[#3B5EFC] px-4 text-[10px] uppercase tracking-[0.12em] text-white hover:bg-[#2f4fe3]"
          onClick={onOpenCompose}
        >
          Open in Compose
        </Button>
      </div>
    </motion.div>
  );
}

function GenerateSkeletonCard() {
  return (
    <div className="overflow-hidden rounded-[28px] border border-border-primary bg-bg-primary">
      <div className="border-b border-border-subtle px-5 py-4">
        <div className="h-4 w-32 animate-pulse rounded-full bg-bg-secondary" />
        <div className="mt-2 h-3 w-24 animate-pulse rounded-full bg-bg-secondary" />
      </div>
      <div className="p-4">
        <div className="h-[380px] animate-pulse rounded-[22px] border border-border-primary bg-bg-secondary" />
      </div>
      <div className="flex gap-2 border-t border-border-subtle px-4 py-3">
        <div className="h-8 w-20 animate-pulse rounded-full bg-bg-secondary" />
        <div className="h-8 w-24 animate-pulse rounded-full bg-bg-secondary" />
        <div className="ml-auto h-8 w-32 animate-pulse rounded-full bg-bg-secondary" />
      </div>
    </div>
  );
}

function GenerateEmptyState() {
  return (
    <div className="rounded-[32px] border border-dashed border-border-primary bg-bg-primary p-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_420px] lg:items-center">
        <div className="space-y-4">
          <PanelSectionLabel
            label="Variant Gallery"
            detail="Generate 2 to 4 site directions from the current system. Each card becomes a scrollable, comparable candidate for Compose."
          />
          <p className="max-w-xl text-sm leading-relaxed text-text-secondary">
            Studio OS will turn your prompt and design system into several full-page options. Star the strongest ones, compare two side-by-side, then send the best direction into Compose.
          </p>
          <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.12em] text-text-muted">
            <span className="rounded-full border border-border-primary px-3 py-1.5">2-4 full-page variants</span>
            <span className="rounded-full border border-border-primary px-3 py-1.5">compare mode</span>
            <span className="rounded-full border border-border-primary px-3 py-1.5">compose-ready</span>
          </div>
        </div>
        <div className="rounded-[28px] border border-border-primary bg-[linear-gradient(180deg,rgba(59,94,252,0.14),rgba(255,255,255,0.02))] p-5">
          <div className="grid gap-4 md:grid-cols-2">
            {[0, 1].map((index) => (
              <div
                key={index}
                className="overflow-hidden rounded-[22px] border border-white/10 bg-black/20"
              >
                <div className="border-b border-white/10 px-4 py-3">
                  <div className="h-3.5 w-24 rounded-full bg-white/20" />
                  <div className="mt-2 h-3 w-16 rounded-full bg-white/10" />
                </div>
                <div className="p-3">
                  <div className="space-y-2 rounded-[18px] border border-white/10 bg-white/5 p-3">
                    <div className="h-20 rounded-[14px] bg-white/10" />
                    <div className="h-10 rounded-[12px] bg-white/10" />
                    <div className="grid grid-cols-2 gap-2">
                      <div className="h-16 rounded-[12px] bg-white/10" />
                      <div className="h-16 rounded-[12px] bg-white/10" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function VariantCompareView({
  variants,
  tokens,
  onSelectWinner,
}: {
  variants: GeneratedVariant[];
  tokens: DesignSystemTokens;
  onSelectWinner: (variantId: string) => void;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {variants.map((variant) => (
        <div
          key={variant.id}
          className="overflow-hidden rounded-[30px] border border-border-primary bg-bg-primary"
        >
          <div className="flex items-center justify-between gap-4 border-b border-border-subtle px-5 py-4">
            <div>
              <p className="text-[13px] font-medium text-text-primary">{variant.name}</p>
              <p className="mt-1 text-[11px] text-text-muted">
                {formatVariantTimestamp(variant.createdAt)}
              </p>
            </div>
            <Button
              type="button"
              className="h-9 rounded-full bg-[#3B5EFC] px-4 text-[10px] uppercase tracking-[0.12em] text-white hover:bg-[#2f4fe3]"
              onClick={() => onSelectWinner(variant.id)}
            >
              Use this one
            </Button>
          </div>
          <div className="h-[760px] overflow-y-auto bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent)] p-4">
            <div className="overflow-hidden rounded-[22px] border border-border-primary bg-black/10">
              <ComposeDocumentView
                pageTree={variant.pageTree}
                tokens={tokens}
                breakpoint="desktop"
                scale={variantCardScale(560)}
                className="pointer-events-none"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function VariantGallery({
  tokens,
  variants,
  selectedVariantId,
  compareVariantIds,
  generating,
  onSelect,
  onFavorite,
  onToggleCompare,
  onClearCompare,
  onOpenCompose,
}: {
  tokens: DesignSystemTokens | null;
  variants: GeneratedVariant[];
  selectedVariantId: string | null;
  compareVariantIds: string[];
  generating: boolean;
  onSelect: (variantId: string) => void;
  onFavorite: (variantId: string) => void;
  onToggleCompare: (variantId: string) => void;
  onClearCompare: () => void;
  onOpenCompose: (variantId: string) => void;
}) {
  const compareVariants = React.useMemo(
    () => variants.filter((variant) => compareVariantIds.includes(variant.id)),
    [compareVariantIds, variants]
  );

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

  if (compareVariants.length === 2) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-4 rounded-[24px] border border-border-primary bg-bg-primary px-5 py-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.15em] text-text-tertiary">
              Compare Mode
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              Review both directions side by side, then pick the one to carry into Compose.
            </p>
          </div>
          <button
            type="button"
            onClick={onClearCompare}
            className="rounded-full border border-border-primary px-4 py-2 text-[10px] uppercase tracking-[0.12em] text-text-muted transition-colors hover:text-text-secondary"
          >
            Exit compare
          </button>
        </div>
        <VariantCompareView
          variants={compareVariants}
          tokens={tokens}
          onSelectWinner={onOpenCompose}
        />
      </div>
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-2">
      {variants.map((variant) => (
        <VariantCard
          key={variant.id}
          variant={variant}
          tokens={tokens}
          active={selectedVariantId === variant.id}
          compareActive={compareVariantIds.includes(variant.id)}
          compareDisabled={
            compareVariantIds.length >= 2 && !compareVariantIds.includes(variant.id)
          }
          onSelect={() => onSelect(variant.id)}
          onFavorite={() => onFavorite(variant.id)}
          onCompare={() => onToggleCompare(variant.id)}
          onOpenCompose={() => onOpenCompose(variant.id)}
        />
      ))}
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
                    meta.number
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

function ReferenceThumbnailStrip({
  images,
  selectedIds,
  onToggleSelect,
  onRemove,
  readOnly = false,
}: {
  images: ReferenceImage[];
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onRemove?: (id: string) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border-subtle px-4 py-4">
        <PanelSectionLabel
          label="References"
          detail={
            readOnly
              ? "Locked from project board for this stage."
              : "Compact thumbnail strip. Use the main board to add more."
          }
        />
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {images.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border-primary bg-bg-secondary px-4 py-6 text-center text-[11px] text-text-muted">
            Drop references into the board to start building the moodboard.
          </div>
        ) : (
          images.map((image) => {
            const active = selectedIds?.has(image.id) ?? false;
            return (
              <div
                key={image.id}
                className={cn(
                  "group overflow-hidden rounded-2xl border bg-bg-secondary transition-colors",
                  active ? "border-accent" : "border-border-primary"
                )}
              >
                <button
                  type="button"
                  onClick={() => onToggleSelect?.(image.id)}
                  disabled={readOnly || !onToggleSelect}
                  className={cn(
                    "block w-full text-left",
                    readOnly || !onToggleSelect ? "cursor-default" : "cursor-pointer"
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.thumbnail || image.url}
                    alt={image.name}
                    className="h-28 w-full object-cover"
                  />
                  <div className="flex items-center justify-between gap-2 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-medium text-text-primary">
                        {image.name}
                      </p>
                      <p className="text-[10px] text-text-muted">
                        {active ? "Selected for analysis" : readOnly ? "Reference" : "Tap to select"}
                      </p>
                    </div>
                    {!readOnly && active ? (
                      <span className="rounded-full bg-accent/12 px-2 py-1 text-[9px] uppercase tracking-[0.12em] text-accent">
                        Active
                      </span>
                    ) : null}
                  </div>
                </button>
                {!readOnly && onRemove ? (
                  <div className="border-t border-border-subtle px-3 py-2">
                    <button
                      type="button"
                      onClick={() => onRemove(image.id)}
                      className="text-[10px] uppercase tracking-[0.12em] text-text-muted transition-colors hover:text-red-400"
                    >
                      Remove
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function SystemPreviewPanel({
  tokens,
  analysis,
}: {
  tokens: DesignSystemTokens | null;
  analysis: ImageAnalysis | null;
}) {
  return (
    <div className="flex h-full flex-col overflow-y-auto p-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="space-y-2">
          <PanelSectionLabel
            label="System Preview"
            detail="Your project references are now distilled into a working web system."
          />
          {analysis ? (
            <p className="max-w-2xl text-sm leading-relaxed text-text-secondary">
              {analysis.designDirection}
            </p>
          ) : null}
        </div>

        {tokens ? (
          <div className="space-y-6">
            <div className="rounded-[28px] border border-border-primary bg-bg-primary p-6">
              <p className="text-[11px] uppercase tracking-[0.15em] text-text-tertiary">
                Palette
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {Object.entries(tokens.colors).map(([key, value]) => (
                  <div
                    key={key}
                    className="overflow-hidden rounded-2xl border border-border-primary bg-bg-secondary"
                  >
                    <div className="h-24" style={{ backgroundColor: value }} />
                    <div className="px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-text-muted">
                        {key}
                      </p>
                      <p className="mt-1 font-mono text-[12px] text-text-primary">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-border-primary bg-bg-primary p-8">
              <p className="text-[11px] uppercase tracking-[0.15em] text-text-tertiary">
                Typography
              </p>
              <div className="mt-5 rounded-[24px] border border-border-primary bg-bg-secondary p-8">
                <p className="text-[10px] uppercase tracking-[0.18em] text-text-muted">
                  Heading / Body Stack
                </p>
                <h2
                  className="mt-4 text-5xl tracking-tight text-text-primary"
                  style={{ fontFamily: tokens.typography.fontFamily }}
                >
                  Taste becomes structure.
                </h2>
                <p
                  className="mt-5 max-w-2xl text-base leading-relaxed text-text-secondary"
                  style={{ fontFamily: tokens.typography.fontFamily }}
                >
                  Adjust the tokens on the right. The variants and final compose canvas will inherit the same system.
                </p>
              </div>
            </div>

            {analysis ? <AnalysisPanel analysis={analysis} loading={false} /> : null}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-border-primary bg-bg-primary p-10 text-center text-sm text-text-muted">
            Generate a system from the current references to preview tokens here.
          </div>
        )}
      </div>
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
          <div className="rounded-2xl border border-border-primary bg-bg-secondary p-4">
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

          <div className="rounded-2xl border border-border-primary bg-bg-secondary p-4">
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
        <div className="rounded-2xl border border-border-primary bg-bg-secondary p-4">
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
  siteName,
  siteType,
  onChange,
}: {
  document: ComposeDocument;
  tokens: DesignSystemTokens;
  references: ReferenceImage[];
  siteName: string;
  siteType: SiteType;
  onChange: (document: ComposeDocument) => void;
}) {
  const [aiPrompt, setAiPrompt] = React.useState("");
  const [aiError, setAiError] = React.useState<string | null>(null);
  const [aiLoading, setAiLoading] = React.useState(false);
  const canvasRef = React.useRef<HTMLDivElement>(null);
  const [viewportSize, setViewportSize] = React.useState({ width: 1, height: 1 });
  const stateRef = React.useRef({
    pan: document.pan,
    zoom: document.zoom,
  });
  const panStateRef = React.useRef<{
    active: boolean;
    startX: number;
    startY: number;
    panX: number;
    panY: number;
  }>({ active: false, startX: 0, startY: 0, panX: 0, panY: 0 });
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
  const boardItems = React.useMemo(() => {
    const artboardWidth = BREAKPOINT_WIDTHS[document.breakpoint];
    const artboardHeight = artboardPreviewHeight(document.breakpoint);
    return [
      ...document.artboards.map((artboard) => ({
        id: artboard.id,
        type: "artboard" as const,
        x: artboard.x,
        y: artboard.y,
        width: artboardWidth,
        height: artboardHeight,
      })),
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
      const mx = event.clientX - rect.left;
      const my = event.clientY - rect.top;
      const curPan = stateRef.current.pan;
      const curZoom = stateRef.current.zoom;
      const rawDelta =
        event.deltaMode === 1
          ? event.deltaY * 24
          : event.deltaMode === 2
          ? event.deltaY * 400
          : event.deltaY;
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
    }

    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [updateDocument]);

  function onBackgroundMouseDown(event: React.MouseEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("[data-artboard], [data-overlay]")) return;
    updateDocument({ selectedNodeId: null });
    panStateRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      panX: document.pan.x,
      panY: document.pan.y,
    };
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
    dragRef.current = null;
  }

  async function applyAiAction(action: "rewrite-copy" | "regenerate-section" | "restyle-section") {
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

      if (action === "restyle-section") {
        const style = data.style as Partial<PageNodeStyle>;
        for (const [key, value] of Object.entries(style)) {
          updateSelectedStyle(
            key as keyof PageNodeStyle,
            value as PageNodeStyle[keyof PageNodeStyle]
          );
        }
        return;
      }

      const path = findNodePath(selectedArtboard.pageTree, selectedNode.id) ?? [];
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

  return (
    <CanvasStageLayout
      stage="compose"
      leftWidth="320px"
      rightWidth="340px"
      leftPanel={
        <div className="flex h-full flex-col">
          <div className="border-b border-border-subtle px-4 py-4">
            <PanelSectionLabel
              label="Layers Panel"
              detail="Artboards and structured page layers for the current compose document."
            />
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-[0.15em] font-medium text-text-tertiary">
                  Artboards
                </p>
                <span className="text-[10px] text-text-muted">{document.artboards.length}</span>
              </div>
              {document.artboards.map((artboard) => (
                <button
                  key={artboard.id}
                  type="button"
                  onClick={() =>
                    updateDocument({
                      selectedArtboardId: artboard.id,
                      selectedNodeId:
                        document.selectedArtboardId === artboard.id
                          ? document.selectedNodeId ?? artboard.pageTree.id
                          : artboard.pageTree.id,
                    })
                  }
                  className={cn(
                    "w-full rounded-2xl border px-3 py-3 text-left transition-colors",
                    document.selectedArtboardId === artboard.id
                      ? "border-accent bg-accent/8"
                      : "border-border-primary bg-bg-secondary hover:border-border-hover"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[12px] font-medium text-text-primary">{artboard.name}</p>
                      <p className="mt-1 text-[10px] text-text-muted">
                        {Math.round(artboard.x)} / {Math.round(artboard.y)}
                      </p>
                    </div>
                    <button
                      type="button"
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[9px] uppercase tracking-[0.12em]",
                        document.primaryArtboardId === artboard.id
                          ? "bg-emerald-500/12 text-emerald-400"
                          : "bg-bg-primary text-text-muted"
                      )}
                      onClick={(event) => {
                        event.stopPropagation();
                        updateDocument({ primaryArtboardId: artboard.id });
                      }}
                    >
                      {document.primaryArtboardId === artboard.id ? "Primary" : "Set primary"}
                    </button>
                  </div>
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-[0.15em] font-medium text-text-tertiary">
                  Tree
                </p>
                {selectedArtboard ? (
                  <span className="truncate text-[10px] text-text-muted">
                    {selectedArtboard.name}
                  </span>
                ) : null}
              </div>
              <div className="space-y-1 rounded-[24px] border border-border-primary bg-bg-secondary p-2">
                {layers.map(({ node, depth }) => (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => updateDocument({ selectedNodeId: node.id })}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[12px] transition-colors",
                      document.selectedNodeId === node.id
                        ? "bg-accent/10 text-text-primary"
                        : "text-text-muted hover:bg-bg-primary hover:text-text-secondary"
                    )}
                    style={{ paddingLeft: 12 + depth * 14 }}
                  >
                    <span className="text-[10px] uppercase tracking-[0.08em] opacity-50">
                      {node.type}
                    </span>
                    <span className="truncate">{formatNodeLabel(node)}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-border-primary bg-bg-secondary p-4">
              <p className="text-[11px] uppercase tracking-[0.15em] font-medium text-text-tertiary">
                Canvas Status
              </p>
              <p className="mt-2 text-[12px] leading-relaxed text-text-muted">
                {references.length} project references are still attached to this canvas. Overlays and docked references arrive in Session 3.
              </p>
            </div>
          </div>
        </div>
      }
      centerPanel={
        <div className="min-w-0 flex h-full flex-col bg-[#090b10]">
          <div className="border-b border-border-primary bg-bg-primary px-5 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1 rounded-full border border-border-primary bg-bg-secondary p-1">
                {BREAKPOINT_OPTIONS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => updateDocument({ breakpoint: item.key })}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-[10px] uppercase tracking-[0.12em]",
                      document.breakpoint === item.key
                        ? "bg-accent text-white"
                        : "text-text-muted hover:text-text-secondary"
                    )}
                  >
                    {item.label} <span className="opacity-60">{item.short}</span>
                  </button>
                ))}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2 overflow-x-auto text-[11px] text-text-muted">
                  {selectionPath.length > 0 ? (
                    selectionPath.map((node, index) => (
                      <React.Fragment key={node.id}>
                        {index > 0 ? <span className="text-text-muted/40">/</span> : null}
                        <button
                          type="button"
                          className={cn(
                            "truncate whitespace-nowrap hover:text-text-secondary",
                            document.selectedNodeId === node.id && "text-text-primary"
                          )}
                          onClick={() => updateDocument({ selectedNodeId: node.id })}
                        >
                          {node.name}
                        </button>
                      </React.Fragment>
                    ))
                  ) : (
                    <span>No selection yet. Pick an artboard or block to inspect it.</span>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-text-muted">
                  Side-by-side generated variants are now artboards on a single infinite board.
                </p>
              </div>

              <div className="ml-auto flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="h-8 rounded-full px-4 text-[10px] uppercase tracking-[0.12em]"
                  onClick={handlePreview}
                  disabled={!exportCode}
                >
                  Preview
                </Button>
                {exportCode ? (
                  <ExportMenu code={exportCode} siteName={siteName} siteType={siteType} />
                ) : null}
                <Button
                  type="button"
                  variant="secondary"
                  className="h-8 rounded-full text-[10px] uppercase tracking-[0.12em]"
                  onClick={() => updateDocument({ zoom: Math.max(0.1, document.zoom / 1.15) })}
                >
                  −
                </Button>
                <span className="w-12 text-center font-mono text-[11px] text-text-muted">
                  {Math.round(document.zoom * 100)}%
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-8 rounded-full text-[10px] uppercase tracking-[0.12em]"
                  onClick={() => updateDocument({ zoom: Math.min(5, document.zoom * 1.15) })}
                >
                  +
                </Button>
              </div>
            </div>
          </div>

          <div className="relative min-h-0 flex-1 overflow-hidden">
            <div
              ref={canvasRef}
              className="h-full w-full cursor-grab overflow-hidden"
              style={{
                backgroundImage:
                  "radial-gradient(circle, rgba(126,141,170,0.22) 1px, transparent 1px), linear-gradient(180deg,rgba(255,255,255,0.02),transparent)",
                backgroundSize: `${Math.max(18, 30 * document.zoom)}px ${Math.max(18, 30 * document.zoom)}px, 100% 100%`,
                backgroundPosition: `${document.pan.x % 30}px ${document.pan.y % 30}px, 0 0`,
              }}
              onMouseDown={onBackgroundMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={clearPointerState}
              onMouseLeave={clearPointerState}
            >
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
                {document.artboards.map((artboard) => (
                  <div
                    key={artboard.id}
                    data-artboard
                    className={cn(
                      "absolute overflow-hidden rounded-[30px] border bg-bg-primary shadow-[0_32px_120px_rgba(0,0,0,0.48)]",
                      document.selectedArtboardId === artboard.id
                        ? "border-accent"
                        : "border-border-primary"
                    )}
                    style={{
                      left: artboard.x,
                      top: artboard.y,
                      width: BREAKPOINT_WIDTHS[document.breakpoint] + 2,
                    }}
                    >
                      <div
                        className="flex cursor-move items-center justify-between border-b border-border-subtle bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] px-4 py-3"
                        onMouseDown={(event) => {
                          event.stopPropagation();
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
                        });
                      }}
                      >
                        <div>
                          <p className="text-[12px] font-medium text-text-primary">{artboard.name}</p>
                          <p className="text-[10px] uppercase tracking-[0.12em] text-text-muted">
                            {BREAKPOINT_OPTIONS.find((item) => item.key === document.breakpoint)?.label} {BREAKPOINT_OPTIONS.find((item) => item.key === document.breakpoint)?.short}
                          </p>
                        </div>
                        {document.primaryArtboardId === artboard.id ? (
                        <span className="rounded-md bg-emerald-500/12 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-emerald-400">
                          Primary
                        </span>
                      ) : null}
                    </div>
                    <ComposeDocumentView
                      pageTree={artboard.pageTree}
                      tokens={tokens}
                      breakpoint={document.breakpoint}
                      selectedNodeId={
                        document.selectedArtboardId === artboard.id
                          ? document.selectedNodeId
                          : null
                      }
                      onSelectNode={(nodeId) =>
                        updateDocument({
                          selectedArtboardId: artboard.id,
                          selectedNodeId: nodeId,
                        })
                      }
                      interactive={document.selectedArtboardId === artboard.id}
                    />
                  </div>
                ))}

                {document.overlays.map((overlay) => (
                  <div
                    key={overlay.id}
                    data-overlay
                    className="absolute overflow-hidden rounded-2xl border border-border-primary shadow-lg"
                    style={{
                      left: overlay.x,
                      top: overlay.y,
                      width: overlay.width,
                      height: overlay.height,
                      background:
                        overlay.type === "note"
                          ? overlay.color || "#FBE67A"
                          : "var(--bg-primary)",
                    }}
                    onMouseDown={(event) => {
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
                    ) : (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={overlay.imageUrl}
                          alt={overlay.label || "Reference"}
                          className="h-[calc(100%-28px)] w-full object-cover"
                        />
                        <div className="px-3 py-2 text-[11px] text-text-secondary truncate">
                          {overlay.label || "Reference"}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {minimap ? (
              <div className="pointer-events-none absolute bottom-5 right-5 z-10 w-[244px] rounded-[22px] border border-white/10 bg-[#0d1016]/92 p-3 shadow-[0_24px_64px_rgba(0,0,0,0.45)] backdrop-blur">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-white/70">
                    Minimap
                  </p>
                  <span className="text-[10px] font-mono text-white/45">
                    {Math.round(document.zoom * 100)}%
                  </span>
                </div>
                <div
                  className="relative mt-3 overflow-hidden rounded-[16px] border border-white/10 bg-[#05070b]"
                  style={{ width: minimap.frameWidth, height: minimap.frameHeight }}
                >
                  {minimap.items.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        "absolute rounded-sm border",
                        item.type === "artboard"
                          ? item.id === document.selectedArtboardId
                            ? "border-[#3B5EFC] bg-[#3B5EFC]/25"
                            : "border-white/30 bg-white/10"
                          : "border-amber-300/40 bg-amber-300/20"
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
                    className="absolute rounded border border-emerald-300/70 bg-emerald-300/10"
                    style={{
                      left: minimap.viewport.left,
                      top: minimap.viewport.top,
                      width: minimap.viewport.width,
                      height: minimap.viewport.height,
                    }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      }
      rightPanel={
        <div className="flex h-full flex-col">
          <div className="border-b border-border-subtle px-4 py-4">
            <PanelSectionLabel
              label="Inspector"
              detail="Context-aware editing shell for the current selection."
            />
            <div className="mt-3 flex gap-1 rounded-lg border border-border-primary bg-bg-secondary p-1">
              {(["content", "style", "layout", "effects", "ai"] as InspectorTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => updateDocument({ inspectorTab: tab })}
                  className={cn(
                    "flex-1 rounded-md px-2 py-1.5 text-[10px] uppercase tracking-[0.12em]",
                    document.inspectorTab === tab
                      ? "bg-accent text-white"
                      : "text-text-muted hover:text-text-secondary"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {!selectedNode ? (
              <div className="rounded-2xl border border-border-primary bg-bg-secondary p-4 text-[12px] text-text-muted">
                Select an artboard, section, or block to populate the inspector.
              </div>
            ) : null}

            {selectedNode ? (
              <div className="rounded-2xl border border-border-primary bg-bg-secondary p-4">
                <p className="text-[11px] uppercase tracking-[0.15em] font-medium text-text-tertiary">
                  Selection
                </p>
                <p className="mt-2 text-[13px] font-medium text-text-primary">{selectedNode.name}</p>
                <p className="mt-1 text-[11px] text-text-muted">{selectedNode.type}</p>
              </div>
            ) : null}

            {selectedNode && document.inspectorTab === "content" ? (
              <div className="space-y-4">
                {Object.entries(selectedNode.content ?? {})
                  .filter(([key]) => !["mediaUrl", "mediaAlt"].includes(key))
                  .filter(([, value]) => typeof value === "string")
                  .map(([key, value]) => (
                    <label key={key} className="block space-y-1.5">
                      <span className="text-[11px] uppercase tracking-[0.12em] text-text-muted">
                        {key}
                      </span>
                      {String(value).length > 80 ? (
                        <textarea
                          value={String(value)}
                          onChange={(event) =>
                            updateSelectedContent(
                              key as keyof PageNodeContent,
                              event.target.value
                            )
                          }
                          rows={4}
                          className="w-full rounded-xl border border-border-primary bg-bg-secondary px-3 py-2 text-sm text-text-primary outline-none"
                        />
                      ) : (
                        <Input
                          value={String(value)}
                          onChange={(event) =>
                            updateSelectedContent(
                              key as keyof PageNodeContent,
                              event.target.value
                            )
                          }
                          className="h-10 text-sm"
                        />
                      )}
                    </label>
                  ))}
                <div className="rounded-2xl border border-border-primary bg-bg-secondary p-4">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-text-muted">
                    Media
                  </p>
                  <div className="mt-3 space-y-3">
                    <label className="block space-y-1.5">
                      <span className="text-[11px] uppercase tracking-[0.12em] text-text-muted">
                        Media URL
                      </span>
                      <Input
                        value={selectedNode.content?.mediaUrl ?? ""}
                        onChange={(event) =>
                          updateSelectedContent("mediaUrl", event.target.value)
                        }
                        placeholder="https://..."
                        className="h-10 text-sm"
                      />
                    </label>
                    <label className="block space-y-1.5">
                      <span className="text-[11px] uppercase tracking-[0.12em] text-text-muted">
                        Alt Text
                      </span>
                      <Input
                        value={selectedNode.content?.mediaAlt ?? ""}
                        onChange={(event) =>
                          updateSelectedContent("mediaAlt", event.target.value)
                        }
                        placeholder="Describe the image"
                        className="h-10 text-sm"
                      />
                    </label>
                  </div>
                </div>
              </div>
            ) : null}

            {selectedNode && document.inspectorTab === "style" ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-border-primary bg-bg-secondary p-4">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-text-muted">
                    Typography
                  </p>
                  <div className="mt-3 space-y-3">
                    <label className="block space-y-1.5">
                      <span className="text-[11px] uppercase tracking-[0.12em] text-text-muted">
                        Font Family
                      </span>
                      <Input
                        value={selectedNode.style?.fontFamily ?? ""}
                        onChange={(event) =>
                          updateSelectedStyle("fontFamily", event.target.value)
                        }
                        placeholder="inherit"
                        className="h-10 text-sm"
                      />
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="block space-y-1.5">
                        <span className="text-[11px] uppercase tracking-[0.12em] text-text-muted">
                          Font Size
                        </span>
                        <Input
                          type="number"
                          value={String(selectedNode.style?.fontSize ?? "")}
                          onChange={(event) =>
                            updateSelectedStyle(
                              "fontSize",
                              Number(event.target.value || 0)
                            )
                          }
                          className="h-10 text-sm"
                        />
                      </label>
                      <label className="block space-y-1.5">
                        <span className="text-[11px] uppercase tracking-[0.12em] text-text-muted">
                          Weight
                        </span>
                        <Input
                          type="number"
                          value={String(selectedNode.style?.fontWeight ?? "")}
                          onChange={(event) =>
                            updateSelectedStyle(
                              "fontWeight",
                              Number(event.target.value || 0)
                            )
                          }
                          className="h-10 text-sm"
                        />
                      </label>
                      <label className="block space-y-1.5">
                        <span className="text-[11px] uppercase tracking-[0.12em] text-text-muted">
                          Line Height
                        </span>
                        <Input
                          type="number"
                          step="0.05"
                          value={String(selectedNode.style?.lineHeight ?? "")}
                          onChange={(event) =>
                            updateSelectedStyle(
                              "lineHeight",
                              Number(event.target.value || 0)
                            )
                          }
                          className="h-10 text-sm"
                        />
                      </label>
                      <label className="block space-y-1.5">
                        <span className="text-[11px] uppercase tracking-[0.12em] text-text-muted">
                          Letter Spacing
                        </span>
                        <Input
                          type="number"
                          step="0.1"
                          value={String(selectedNode.style?.letterSpacing ?? "")}
                          onChange={(event) =>
                            updateSelectedStyle(
                              "letterSpacing",
                              Number(event.target.value || 0)
                            )
                          }
                          className="h-10 text-sm"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border-primary bg-bg-secondary p-4">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-text-muted">
                    Surface
                  </p>
                  <div className="mt-3 space-y-3">
                    {(
                      [
                        ["background", "Background"],
                        ["foreground", "Foreground"],
                        ["borderColor", "Border"],
                        ["accent", "Accent"],
                      ] as Array<[keyof PageNodeStyle, string]>
                    ).map(([key, label]) => (
                      <label key={String(key)} className="block space-y-1.5">
                        <span className="text-[11px] uppercase tracking-[0.12em] text-text-muted">
                          {label}
                        </span>
                        <Input
                          value={String((selectedNode.style ?? {})[key] ?? "")}
                          onChange={(event) =>
                            updateSelectedStyle(key, event.target.value)
                          }
                          className="h-10 text-sm"
                        />
                      </label>
                    ))}
                    <label className="block space-y-1.5">
                      <span className="text-[11px] uppercase tracking-[0.12em] text-text-muted">
                        Radius
                      </span>
                      <Input
                        type="number"
                        value={String(selectedNode.style?.borderRadius ?? "")}
                        onChange={(event) =>
                          updateSelectedStyle(
                            "borderRadius",
                            Number(event.target.value || 0)
                          )
                        }
                        className="h-10 text-sm"
                      />
                    </label>
                  </div>
                </div>
              </div>
            ) : null}

            {selectedNode && document.inspectorTab === "layout" ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-border-primary bg-bg-secondary p-4">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-text-muted">
                    Structure
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <label className="block space-y-1.5">
                      <span className="text-[11px] uppercase tracking-[0.12em] text-text-muted">
                        Direction
                      </span>
                      <select
                        value={selectedNode.style?.direction ?? "column"}
                        onChange={(event) =>
                          updateSelectedStyle(
                            "direction",
                            event.target.value as PageNodeStyle["direction"]
                          )
                        }
                        className="h-10 w-full rounded-xl border border-border-primary bg-bg-primary px-3 text-sm text-text-primary"
                      >
                        <option value="column">Column</option>
                        <option value="row">Row</option>
                      </select>
                    </label>
                    <label className="block space-y-1.5">
                      <span className="text-[11px] uppercase tracking-[0.12em] text-text-muted">
                        Justify
                      </span>
                      <select
                        value={selectedNode.style?.justify ?? "start"}
                        onChange={(event) =>
                          updateSelectedStyle(
                            "justify",
                            event.target.value as PageNodeStyle["justify"]
                          )
                        }
                        className="h-10 w-full rounded-xl border border-border-primary bg-bg-primary px-3 text-sm text-text-primary"
                      >
                        <option value="start">Start</option>
                        <option value="center">Center</option>
                        <option value="end">End</option>
                        <option value="between">Space Between</option>
                      </select>
                    </label>
                    <label className="block space-y-1.5">
                      <span className="text-[11px] uppercase tracking-[0.12em] text-text-muted">
                        Align
                      </span>
                      <select
                        value={selectedNode.style?.align ?? "left"}
                        onChange={(event) =>
                          updateSelectedStyle(
                            "align",
                            event.target.value as PageNodeStyle["align"]
                          )
                        }
                        className="h-10 w-full rounded-xl border border-border-primary bg-bg-primary px-3 text-sm text-text-primary"
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </label>
                    <label className="block space-y-1.5">
                      <span className="text-[11px] uppercase tracking-[0.12em] text-text-muted">
                        Columns
                      </span>
                      <Input
                        type="number"
                        value={String(selectedNode.style?.columns ?? "")}
                        onChange={(event) =>
                          updateSelectedStyle("columns", Number(event.target.value || 0))
                        }
                        className="h-10 text-sm"
                      />
                    </label>
                  </div>
                </div>

                <div className="rounded-2xl border border-border-primary bg-bg-secondary p-4">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-text-muted">
                    Spacing
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {(
                      [
                        ["paddingX", "Padding X"],
                        ["paddingY", "Padding Y"],
                        ["gap", "Gap"],
                        ["maxWidth", "Max Width"],
                        ["minHeight", "Min Height"],
                      ] as Array<[keyof PageNodeStyle, string]>
                    ).map(([key, label]) => (
                      <label key={String(key)} className="block space-y-1.5">
                        <span className="text-[11px] uppercase tracking-[0.12em] text-text-muted">
                          {label}
                        </span>
                        <Input
                          type="number"
                          value={String(selectedNode.style?.[key] ?? "")}
                          onChange={(event) =>
                            updateSelectedStyle(key, Number(event.target.value || 0))
                          }
                          className="h-10 text-sm"
                        />
                      </label>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-border-primary bg-bg-secondary p-3 text-[11px] text-text-muted">
                  You are editing <strong className="text-text-secondary">{document.breakpoint}</strong> overrides. Desktop writes to base style; Tablet and Mobile write to responsive overrides.
                </div>
              </div>
            ) : null}

            {selectedNode && document.inspectorTab === "effects" ? (
              <div className="space-y-4 rounded-2xl border border-border-primary bg-bg-secondary p-4">
                <p className="text-[11px] uppercase tracking-[0.15em] font-medium text-text-tertiary">
                  Effects
                </p>
                <label className="block space-y-1.5">
                  <span className="text-[11px] uppercase tracking-[0.12em] text-text-muted">
                    Opacity
                  </span>
                  <Input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    value={String(selectedNode.style?.opacity ?? "")}
                    onChange={(event) =>
                      updateSelectedStyle(
                        "opacity",
                        Number(event.target.value || 0)
                      )
                    }
                    className="h-10 text-sm"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-[11px] uppercase tracking-[0.12em] text-text-muted">
                    Blur
                  </span>
                  <Input
                    type="number"
                    value={String(selectedNode.style?.blur ?? "")}
                    onChange={(event) =>
                      updateSelectedStyle("blur", Number(event.target.value || 0))
                    }
                    className="h-10 text-sm"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-[11px] uppercase tracking-[0.12em] text-text-muted">
                    Shadow
                  </span>
                  <select
                    value={selectedNode.style?.shadow ?? "none"}
                    onChange={(event) =>
                      updateSelectedStyle(
                        "shadow",
                        event.target.value as PageNodeStyle["shadow"]
                      )
                    }
                    className="h-10 w-full rounded-xl border border-border-primary bg-bg-primary px-3 text-sm text-text-primary"
                  >
                    <option value="none">None</option>
                    <option value="soft">Soft</option>
                    <option value="medium">Medium</option>
                  </select>
                </label>
              </div>
            ) : null}

            {selectedNode && document.inspectorTab === "ai" ? (
              <div className="space-y-4">
                <label className="block space-y-1.5">
                  <span className="text-[11px] uppercase tracking-[0.12em] text-text-muted">
                    AI Prompt
                  </span>
                  <textarea
                    value={aiPrompt}
                    onChange={(event) => setAiPrompt(event.target.value)}
                    rows={4}
                    placeholder="Sharpen the message, make this section more confident, restyle it for a stronger editorial feel…"
                    className="w-full rounded-xl border border-border-primary bg-bg-secondary px-3 py-2 text-sm text-text-primary outline-none"
                  />
                </label>
                <div className="grid grid-cols-1 gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-10 justify-start text-[10px] uppercase tracking-[0.12em]"
                    onClick={() => applyAiAction("rewrite-copy")}
                    disabled={aiLoading}
                  >
                    Rewrite selected copy
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-10 justify-start text-[10px] uppercase tracking-[0.12em]"
                    onClick={() => applyAiAction("regenerate-section")}
                    disabled={aiLoading}
                  >
                    Regenerate section direction
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-10 justify-start text-[10px] uppercase tracking-[0.12em]"
                    onClick={() => applyAiAction("restyle-section")}
                    disabled={aiLoading}
                  >
                    Restyle from system
                  </Button>
                </div>
                {aiError ? (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2 text-[11px] text-red-400">
                    {aiError}
                  </div>
                ) : null}
                <div className="rounded-2xl border border-border-primary bg-bg-secondary p-3">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-text-muted">
                    System Context
                  </p>
                  <div className="mt-3 flex gap-2">
                    {[
                      tokens.colors.primary,
                      tokens.colors.secondary,
                      tokens.colors.accent,
                      tokens.colors.background,
                      tokens.colors.surface,
                    ].map((color) => (
                      <div
                        key={color}
                        className="h-8 w-8 rounded-lg border border-border-primary"
                        style={{ background: color }}
                      />
                    ))}
                  </div>
                  <p className="mt-3 text-[11px] text-text-muted">
                    {tokens.typography.fontFamily}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      }
    />
  );
}

export function CanvasPage({ projectId }: { projectId?: string }) {
  const [stage, setStage] = React.useState<CanvasStage>("moodboard");
  const [images, setImages] = React.useState<ReferenceImage[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [setName, setSetName] = React.useState("");
  const [linkedProjectId] = React.useState(projectId || null);
  const [projectName, setProjectName] = React.useState("Project");
  const [bootstrapToast, setBootstrapToast] = React.useState<string | null>(null);

  const [analysis, setAnalysis] = React.useState<ImageAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = React.useState(false);
  const [analysisError, setAnalysisError] = React.useState<string | null>(null);

  const [tokens, setTokens] = React.useState<DesignSystemTokens | null>(null);
  const [markdown, setMarkdown] = React.useState("");
  const [systemLoading, setSystemLoading] = React.useState(false);

  const [sitePrompt, setSitePrompt] = React.useState("");
  const [siteType, setSiteType] = React.useState<SiteType>("auto");
  const [generatedVariants, setGeneratedVariants] = React.useState<GeneratedVariant[]>([]);
  const [selectedVariantId, setSelectedVariantId] = React.useState<string | null>(null);
  const [compareVariantIds, setCompareVariantIds] = React.useState<string[]>([]);
  const [generateLoading, setGenerateLoading] = React.useState(false);
  const [generateError, setGenerateError] = React.useState<string | null>(null);
  const [composeDocument, setComposeDocument] = React.useState<ComposeDocument | null>(null);
  // Guard against race conditions when the user triggers generation multiple times
  const generateRequestIdRef = React.useRef(0);

  React.useEffect(() => {
    if (tokens) setMarkdown(tokensToMarkdown(tokens));
  }, [tokens]);

  React.useEffect(() => {
    if (!linkedProjectId) return;

    const refs = loadProjectRefs(linkedProjectId);
    const storedState = getProjectState(linkedProjectId);
    const meta = loadProjectMeta(linkedProjectId);
    const persistedComposeWorkspace = readComposeWorkspace(linkedProjectId);
    const colorsCount = meta?.palette.length ?? storedState.palette?.length ?? 0;
    const fontsCount = [meta?.headingFont, meta?.bodyFont].filter(Boolean).length;
    const storedVariants = normalizeVariants(storedState.canvas?.generatedVariants ?? []);

    if (meta) {
      setProjectName(meta.name);
    }

    if (refs.length > 0) {
      setImages(refs);
      setSelectedIds(new Set(refs.map((r) => r.id)));
    }

    if (meta) {
      setSetName(storedState.canvas?.referenceSetName ?? meta.name);

      if (storedState.canvas?.analysis) setAnalysis(storedState.canvas.analysis);

      const projectTokens = storedState.canvas?.designTokens
        ? applyProjectTypography(storedState.canvas.designTokens, storedState.typography)
        : meta.palette.length > 0
        ? applyProjectTypography(paletteToTokens(meta.palette), storedState.typography)
        : null;

      if (storedState.canvas?.designTokens && projectTokens) {
        setTokens(projectTokens);
        setMarkdown(tokensToMarkdown(projectTokens));
      } else if (projectTokens) {
        setTokens(projectTokens);
        setMarkdown(tokensToMarkdown(projectTokens));
      }

      setSitePrompt(storedState.canvas?.componentPrompt ?? inferSiteName(meta.name));
      setSiteType(storedState.canvas?.siteType ?? "auto");
      setGeneratedVariants(storedVariants);
      setSelectedVariantId(
        storedState.canvas?.selectedVariantId ??
          storedState.canvas?.generatedVariants?.[0]?.id ??
          null
      );
      setComposeDocument(
        storedState.canvas?.composeDocument
          ? rehydrateComposeDocument(
              storedState.canvas.composeDocument,
              persistedComposeWorkspace
            )
          : null
      );

      if (storedState.canvas?.composeDocument) {
        setStage(storedState.canvas.stage ?? "compose");
      } else if ((storedState.canvas?.generatedVariants?.length ?? 0) > 0) {
        setStage(storedState.canvas?.stage ?? "generate");
      } else if (refs.length > 0) {
        setStage(storedState.canvas?.stage ?? "system");
      }
    }

    setBootstrapToast(
      `${refs.length} references, ${colorsCount} colors, ${fontsCount} fonts loaded`
    );
  }, [linkedProjectId]);

  React.useEffect(() => {
    if (!linkedProjectId || !composeDocument) return;
    writeComposeWorkspace(linkedProjectId, composeDocument);
  }, [composeDocument, linkedProjectId]);

  React.useEffect(() => {
    if (!bootstrapToast) return;
    const timeout = window.setTimeout(() => setBootstrapToast(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [bootstrapToast]);

  React.useEffect(() => {
    setCompareVariantIds((current) =>
      current.filter((variantId) =>
        generatedVariants.some((variant) => variant.id === variantId)
      )
    );
  }, [generatedVariants]);

  const selectedVariant = React.useMemo(
    () =>
      generatedVariants.find((variant) => variant.id === selectedVariantId) ??
      generatedVariants[0] ??
      null,
    [generatedVariants, selectedVariantId]
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
    if (!linkedProjectId) return;

    upsertProjectState(linkedProjectId, {
      canvas: {
        stage,
        referenceSetName: setName,
        analysis,
        designTokens: tokens,
        designSystemMarkdown: markdown,
        componentPrompt: sitePrompt,
        siteType,
        generatedVariants,
        selectedVariantId,
        composeDocument:
          composeDocument && exportCode && exportArtboard
            ? {
                ...composeDocument,
                exportArtifact: {
                  code: exportCode,
                  name: exportArtboard.name,
                  updatedAt: new Date().toISOString(),
                },
              }
            : composeDocument,
        generatedSite:
          exportCode && exportArtboard
            ? {
                code: exportCode,
                name: exportArtboard.name,
                prompt: sitePrompt,
                siteType,
                updatedAt: new Date().toISOString(),
              }
            : null,
      },
    });
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
    tokens,
  ]);

  function handleFilesAdded(files: File[]) {
    const newImages: ReferenceImage[] = files.map((file, index) => {
      const url = URL.createObjectURL(file);
      return {
        id: `img-${Date.now()}-${index}`,
        file,
        url,
        thumbnail: url,
        name: file.name,
      };
    });

    setImages((prev) => [...prev, ...newImages]);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      newImages.forEach((img) => next.add(img.id));
      return next;
    });
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

  async function handleAnalyze() {
    const selected = images.filter((img) => selectedIds.has(img.id));
    if (selected.length === 0) return;

    setAnalysisLoading(true);
    setAnalysisError(null);

    try {
      const base64Images = await Promise.all(
        selected.slice(0, 6).map(async (img) => {
          if (img.file) {
            return new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(img.file!);
            });
          }
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
      setAnalysis(data.analysis);
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : "Analysis failed");
    } finally {
      setAnalysisLoading(false);
    }
  }

  async function handleGenerateSystem() {
    if (!analysis) return;
    setSystemLoading(true);
    try {
      const response = await fetch("/api/canvas/generate-system", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis, mode: "auto" }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "System generation failed");
      }

      const data = await response.json();
      setTokens(data.tokens);
      setMarkdown(data.markdown);
      setStage("system");
    } catch {
      const localTokens = analysisToTokens(analysis);
      setTokens(localTokens);
      setMarkdown(tokensToMarkdown(localTokens));
      setStage("system");
    } finally {
      setSystemLoading(false);
    }
  }

  async function handleGenerateVariants() {
    if (!tokens || !sitePrompt.trim()) return;
    const requestId = ++generateRequestIdRef.current;
    setGenerateLoading(true);
    setGenerateError(null);

    try {
      const response = await fetch("/api/canvas/generate-component", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "variants",
          prompt: sitePrompt,
          tokens,
          siteType,
          siteName: setName || inferSiteName(sitePrompt),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Variant generation failed");

      // Discard the response if a newer request has already been issued
      if (requestId !== generateRequestIdRef.current) return;

      const normalizedVariants = normalizeVariants(data.variants ?? []);
      setGeneratedVariants(normalizedVariants);
      setSelectedVariantId(normalizedVariants[0]?.id ?? null);
      setCompareVariantIds([]);
      if (!setName.trim() && data.siteName) {
        setSetName(data.siteName);
      }
      setStage("generate");
    } catch (error) {
      if (requestId !== generateRequestIdRef.current) return;
      setGenerateError(error instanceof Error ? error.message : "Variant generation failed");
    } finally {
      if (requestId === generateRequestIdRef.current) {
        setGenerateLoading(false);
      }
    }
  }

  function handleOpenCompose(preferredVariantId?: string) {
    if (generatedVariants.length === 0) return;
    const nextDocument = rehydrateComposeDocument(
      createComposeDocument(generatedVariants),
      linkedProjectId ? readComposeWorkspace(linkedProjectId) : null
    );
    const preferredArtboard = preferredVariantId
      ? nextDocument.artboards.find((artboard) => {
          if (artboard.variantId === preferredVariantId) return true;
          const preferredVariant = generatedVariants.find(
            (variant) => variant.id === preferredVariantId
          );
          return preferredVariant ? artboard.name === preferredVariant.name : false;
        })
      : nextDocument.artboards[0];

    setComposeDocument(
      preferredArtboard
        ? {
            ...nextDocument,
            selectedArtboardId: preferredArtboard.id,
            primaryArtboardId: preferredArtboard.id,
            selectedNodeId: preferredArtboard.pageTree.id,
          }
        : nextDocument
    );
    if (preferredVariantId) {
      setSelectedVariantId(preferredVariantId);
    }
    setStage("compose");
  }

  const selectedCount = selectedIds.size;
  const canAnalyze = selectedCount > 0 && !analysisLoading;
  const canGenerateSystem = analysis !== null && !systemLoading;
  const canGenerateVariants =
    tokens !== null && sitePrompt.trim().length > 0 && !generateLoading;

  const completions: Partial<Record<CanvasStage, boolean>> = {
    moodboard: images.length > 0,
    system: tokens !== null,
    generate: generatedVariants.length > 0,
    compose: false,
  };

  const availability: Record<
    CanvasStage,
    { available: boolean; tooltip?: string }
  > = {
    moodboard: { available: true },
    system: {
      available: images.length > 0,
      tooltip: "Upload references first",
    },
    generate: {
      available: tokens !== null,
      tooltip: "Generate a design system first",
    },
    compose: {
      available: generatedVariants.length > 0,
      tooltip: "Generate variants first",
    },
  };

  const stepCounts: Partial<Record<CanvasStage, string>> = {
    moodboard: `${images.length} refs`,
    system: `${tokens ? Object.keys(tokens.colors).length : 0} tokens`,
    generate: `${generatedVariants.length} variant${generatedVariants.length === 1 ? "" : "s"}`,
  };

  return (
    <div className="relative flex h-full flex-col">
      <div className="shrink-0 border-b border-border-primary bg-bg-primary px-6 py-4">
        <div className="flex items-center gap-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href={linkedProjectId ? `/projects/${linkedProjectId}` : "/projects"}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border-primary bg-bg-secondary text-text-secondary transition-colors duration-200 hover:border-border-hover hover:text-text-primary"
              aria-label="Back to project"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12.5 8H3.5" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 4 3.5 8l4 4" />
              </svg>
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[8px] leading-none text-text-tertiary">■</span>
                <span className="truncate text-[11px] uppercase tracking-[0.15em] font-medium text-text-tertiary">
                  {`CANVAS - ${projectName}`}
                </span>
              </div>
              <p className="mt-1 truncate text-[11px] text-text-muted">
                {setName || "Project-linked canvas workflow"}
              </p>
            </div>
          </div>

          <div className="ml-auto">
            <StageStepper
              stage={stage}
              onSelect={setStage}
              completions={completions}
              availability={availability}
              counts={stepCounts}
            />
          </div>
        </div>
      </div>

      {bootstrapToast ? (
        <div className="pointer-events-none absolute right-6 top-[5.25rem] z-20">
          <div className="rounded-2xl border border-[#3B5EFC]/30 bg-[#3B5EFC] px-4 py-3 text-[11px] font-medium text-white shadow-[0_18px_48px_rgba(59,94,252,0.28)]">
            {bootstrapToast}
          </div>
        </div>
      ) : null}

      {stage === "compose" && composeDocument && tokens ? (
        <ComposeStage
          document={composeDocument}
          tokens={tokens}
          references={images}
          siteName={setName || inferSiteName(sitePrompt)}
          siteType={siteType}
          onChange={setComposeDocument}
        />
      ) : (
        <CanvasStageLayout
          stage={stage}
          leftPanel={
            stage === "moodboard" ? (
              <ReferenceThumbnailStrip
                images={images}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onRemove={handleRemoveImage}
              />
            ) : stage === "system" ? (
              <ReferenceThumbnailStrip images={images} selectedIds={selectedIds} readOnly />
            ) : undefined
          }
          centerPanel={
            stage === "moodboard" ? (
              <div className="flex h-full flex-col overflow-y-auto p-6">
                <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div className="space-y-2">
                      <PanelSectionLabel
                        label="Moodboard"
                        detail="Drop a full reference set into the board. This is the primary ingest surface for Canvas."
                      />
                      <Input
                        value={setName}
                        onChange={(event) => setSetName(event.target.value)}
                        placeholder="Reference set name..."
                        className="h-10 max-w-sm text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-text-muted">
                      <span>{images.length} references</span>
                      <span>•</span>
                      <span>{selectedCount} selected</span>
                    </div>
                  </div>

                  <UploadZone
                    onFilesAdded={handleFilesAdded}
                    disabled={analysisLoading}
                    className="min-h-[320px] rounded-[32px] border-[1.5px] bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))]"
                  />

                  {images.length > 0 ? (
                    <div className="rounded-[28px] border border-border-primary bg-bg-primary p-5">
                      <div className="flex flex-col gap-3 border-b border-border-subtle pb-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-3 text-[11px] text-text-muted">
                          <span>{selectedCount} of {images.length} selected</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedIds(
                                selectedCount === images.length
                                  ? new Set()
                                  : new Set(images.map((image) => image.id))
                              );
                            }}
                            className="text-accent hover:underline"
                          >
                            {selectedCount === images.length ? "Deselect all" : "Select all"}
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={handleAnalyze}
                            disabled={!canAnalyze}
                            className="h-10 text-[11px] uppercase tracking-[0.12em]"
                          >
                            {analysisLoading
                              ? "Analyzing..."
                              : `Analyze ${selectedCount} image${selectedCount !== 1 ? "s" : ""}`}
                          </Button>
                          {analysis ? (
                            <Button
                              onClick={handleGenerateSystem}
                              disabled={!canGenerateSystem}
                              variant="secondary"
                              className="h-10 text-[11px] uppercase tracking-[0.12em]"
                            >
                              {systemLoading ? "Generating..." : "Generate System"}
                            </Button>
                          ) : null}
                        </div>
                      </div>

                      {analysisError ? (
                        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2 text-[10px] text-red-400">
                          {analysisError}
                          <p className="mt-1 text-red-400/60">
                            Make sure OPENAI_API_KEY is set in .env.local
                          </p>
                        </div>
                      ) : null}

                      <div className="mt-5">
                        <ReferenceGrid
                          images={images}
                          selectedIds={selectedIds}
                          onToggleSelect={handleToggleSelect}
                          onRemove={handleRemoveImage}
                        />
                      </div>
                    </div>
                  ) : null}

                  <AnalysisPanel analysis={analysis} loading={analysisLoading} />
                </div>
              </div>
            ) : stage === "system" ? (
              <SystemPreviewPanel tokens={tokens} analysis={analysis} />
            ) : (
              <div className="flex h-full flex-col overflow-y-auto p-6">
                <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-6">
                  <div className="rounded-[30px] border border-border-primary bg-bg-primary px-6 py-5">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                        <div>
                          <h3 className="text-lg font-semibold tracking-tight text-text-primary">
                            Generated Variants
                          </h3>
                          <p className="mt-1 text-xs text-text-tertiary">
                            Describe the direction once, generate multiple candidates, then compare or move one into Compose.
                          </p>
                        </div>
                        {selectedVariant?.compiledCode ? (
                          <ExportMenu
                            code={selectedVariant.compiledCode}
                            siteName={setName || inferSiteName(sitePrompt)}
                            siteType={siteType}
                          />
                        ) : null}
                      </div>

                      <div className="grid gap-3 xl:grid-cols-[180px_minmax(0,1fr)_190px]">
                        <select
                          value={siteType}
                          onChange={(event) => setSiteType(event.target.value as SiteType)}
                          className="h-11 w-full rounded-2xl border border-border-primary bg-bg-secondary px-3 text-sm text-text-primary"
                        >
                          {SITE_TYPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <textarea
                          value={sitePrompt}
                          onChange={(event) => setSitePrompt(event.target.value)}
                          rows={3}
                          placeholder="Describe the site direction, audience, tone, and what the page should feel like."
                          className="min-h-[84px] w-full rounded-2xl border border-border-primary bg-bg-secondary px-4 py-3 text-sm text-text-primary outline-none"
                        />
                        <div className="flex flex-col gap-2">
                          <Button
                            onClick={handleGenerateVariants}
                            disabled={!canGenerateVariants}
                            className="h-11 bg-[#3B5EFC] text-[11px] uppercase tracking-[0.12em] text-white hover:bg-[#2f4fe3]"
                          >
                            {generateLoading ? "Generating..." : "Generate Variants"}
                          </Button>
                        </div>
                      </div>

                      {generateError ? (
                        <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2 text-[11px] text-red-400">
                          {generateError}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <VariantGallery
                    tokens={tokens}
                    variants={generatedVariants}
                    selectedVariantId={selectedVariantId}
                    compareVariantIds={compareVariantIds}
                    generating={generateLoading}
                    onSelect={setSelectedVariantId}
                    onFavorite={(variantId) =>
                      setGeneratedVariants((prev) =>
                        setVariantFavorite(prev, variantId)
                      )
                    }
                    onToggleCompare={(variantId) =>
                      setCompareVariantIds((prev) =>
                        toggleVariantCompare(prev, variantId)
                      )
                    }
                    onClearCompare={() => setCompareVariantIds([])}
                    onOpenCompose={handleOpenCompose}
                  />
                </div>
              </div>
            )
          }
          rightPanel={
            stage === "system" ? (
              <div className="space-y-4 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] uppercase tracking-[0.15em] font-medium text-text-tertiary">
                    Token Editor
                  </h3>
                  {tokens ? (
                    <span className="text-[9px] text-emerald-400 font-mono">Active</span>
                  ) : null}
                </div>

                <SystemEditor
                  markdown={markdown}
                  tokens={tokens}
                  onMarkdownChange={setMarkdown}
                  onTokensChange={setTokens}
                  loading={systemLoading}
                />

                <Button
                  onClick={() => setStage("generate")}
                  disabled={!tokens}
                  className="w-full h-10 text-[11px] uppercase tracking-[0.12em]"
                >
                  Continue to Generate →
                </Button>
              </div>
            ) : stage === "generate" ? (
              <SystemSummaryPanel tokens={tokens} selectedVariant={selectedVariant} />
            ) : undefined
          }
          leftWidth={stage === "system" ? "260px" : "240px"}
          rightWidth={stage === "system" ? "320px" : "300px"}
        />
      )}
    </div>
  );
}
