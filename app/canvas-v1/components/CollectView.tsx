"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { UploadZone } from "./UploadZone";
import { cn } from "@/lib/utils";
import { fadeIn, springs } from "@/lib/animations";
import type { ImageAnalysis, ReferenceImage } from "@/lib/canvas/analyze-images";
import type { DesignSystemTokens } from "@/lib/canvas/generate-system";
import { ImportReferenceModal, type Reference } from "@/components/modals/import-reference-modal";
import type { TasteProfile } from "@/types/taste-profile";
import { AsciiLoader } from "./AsciiLoader";
import { buildIframeHTML } from "./ComponentPreview";
import { ComposeDocumentView } from "./ComposeDocumentView";
import type { GeneratedVariant } from "@/lib/canvas/compose";
import type { SiteType } from "@/lib/canvas/templates";

type ImportMode = "upload" | "arena" | "pinterest" | "url";

// ─── Prop types ──────────────────────────────────────────────────────────────

type CollectViewProps = {
  projectId: string;
  referenceSetName: string;
  onReferenceSetNameChange: (value: string) => void;
  images: ReferenceImage[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onFilesAdded: (files: File[]) => void | Promise<void>;
  onImport: (payload: { references: Reference[]; notice?: string }) => void;
  analysis: ImageAnalysis | null;
  tokens: DesignSystemTokens | null;
  tasteProfile: TasteProfile | null;
  processing: boolean;
  tasteProfileLoading?: boolean;
  error?: string | null;

  // Generation props (merged from Generate stage)
  siteType: SiteType;
  onSiteTypeChange: (type: SiteType) => void;
  sitePrompt: string;
  onSitePromptChange: (prompt: string) => void;
  onGenerateVariants: () => void;
  canGenerate: boolean;
  generateLoading: boolean;
  generateError: string | null;

  // Variant gallery props
  variants: GeneratedVariant[];
  selectedVariantId: string | null;
  onSelectVariant: (id: string) => void;
  onOpenCompose: (variantId: string) => void;
  onViewCode: (variantId: string) => void;
  onRegenerateVariant: (
    variant: GeneratedVariant,
    options: { intent: "more-like-this" | "different-approach"; promptOverride?: string }
  ) => void;
};

// ─── Taste panel helpers ─────────────────────────────────────────────────────

function PanelSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-lg border border-border-primary bg-bg-secondary/70 p-4">
      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-text-tertiary">
        {title}
      </p>
      {children}
    </section>
  );
}

function TasteSkeletonSection() {
  return (
    <div className="space-y-3">
      <div className="h-3 w-24 animate-pulse rounded-full bg-bg-tertiary" />
      <div className="grid grid-cols-4 gap-2">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="space-y-2">
            <div className="h-12 animate-pulse rounded-lg bg-bg-tertiary" />
            <div className="h-2 w-full animate-pulse rounded-full bg-bg-tertiary" />
          </div>
        ))}
      </div>
    </div>
  );
}

function TasteDetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border-primary bg-bg-primary p-4">
        <div className="space-y-2">
          <div className="h-3 w-20 animate-pulse rounded-full bg-bg-tertiary" />
          <div className="h-4 w-full animate-pulse rounded-full bg-bg-tertiary" />
          <div className="h-4 w-[92%] animate-pulse rounded-full bg-bg-tertiary" />
          <div className="h-4 w-[75%] animate-pulse rounded-full bg-bg-tertiary" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-7 w-20 animate-pulse rounded-full bg-bg-tertiary" />
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-border-primary bg-bg-primary p-4">
        <div className="h-3 w-28 animate-pulse rounded-full bg-bg-tertiary" />
        <div className="mt-4 grid gap-3">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-16 animate-pulse rounded-md bg-bg-tertiary" />
          ))}
        </div>
      </div>
    </div>
  );
}

function TasteMetric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border-primary bg-bg-primary p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.12em] text-text-muted">{label}</p>
          <p className="mt-2 text-sm font-medium leading-snug text-text-primary">{value}</p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border-primary bg-bg-secondary text-text-secondary">
          {icon}
        </div>
      </div>
    </div>
  );
}

function LayoutMetricIcon({ type }: { type: "density" | "grid" | "whitespace" | "hero" }) {
  if (type === "density") {
    return (
      <div className="grid grid-cols-3 gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        <span className="h-1.5 w-1.5 rounded-full bg-current/80" />
        <span className="h-1.5 w-1.5 rounded-full bg-current/60" />
        <span className="h-1.5 w-1.5 rounded-full bg-current/60" />
        <span className="h-1.5 w-1.5 rounded-full bg-current/80" />
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
      </div>
    );
  }
  if (type === "grid") {
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.25">
        <rect x="2.5" y="2.5" width="5" height="5" rx="1.2" />
        <rect x="10.5" y="2.5" width="5" height="5" rx="1.2" />
        <rect x="2.5" y="10.5" width="5" height="5" rx="1.2" />
        <rect x="10.5" y="10.5" width="5" height="5" rx="1.2" />
      </svg>
    );
  }
  if (type === "whitespace") {
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.25">
        <rect x="3.5" y="3.5" width="11" height="11" rx="2" />
        <path d="M6 9h6" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.25">
      <path d="M3 13.5V4.5h12v9" />
      <path d="M6 7h6M6 10h3" />
    </svg>
  );
}

function TasteProfileDisplay({
  tasteProfile,
  loading,
  canExtract,
}: {
  tasteProfile: TasteProfile | null;
  loading: boolean;
  canExtract: boolean;
}) {
  if (loading) return <TasteDetailSkeleton />;

  if (!tasteProfile) {
    return (
      <div className="rounded-lg border border-dashed border-border-primary bg-bg-primary/60 px-4 py-6 text-center">
        <p className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">Taste profile</p>
        <p className="mt-3 text-sm font-medium text-text-primary">
          {canExtract ? "Studio OS is ready to extract direction." : "Add 3+ references for taste extraction"}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-text-muted">
          {canExtract
            ? "Keep refining the board and the extracted direction will update live."
            : "A stronger cluster of references gives the AI enough signal to describe layout, type, and mood with confidence."}
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springs.smooth}
      className="space-y-4"
    >
      <div className="rounded-lg border border-border-primary bg-[linear-gradient(180deg,rgba(59,94,252,0.08),rgba(59,94,252,0.01))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">Taste summary</p>
          <div className="rounded-full border border-[#3B5EFC]/20 bg-[#3B5EFC]/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-[#6e86ff]">
            {Math.round(tasteProfile.confidence * 100)}%
          </div>
        </div>
        <blockquote className="mt-4 border-l-2 border-[#3B5EFC]/40 pl-4 text-sm leading-relaxed text-text-primary">
          {tasteProfile.summary}
        </blockquote>
        <div className="mt-4 flex flex-wrap gap-2">
          {tasteProfile.adjectives.map((adjective) => (
            <span
              key={adjective}
              className="rounded-full border border-[#3B5EFC]/18 bg-[#3B5EFC]/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] text-[#6e86ff]"
            >
              {adjective}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border-primary bg-bg-primary p-4">
        <p className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">Layout preferences</p>
        <p className="mt-1 text-xs text-text-muted">The AI uses these tendencies to steer structure and pacing.</p>
        <div className="mt-4 grid gap-3">
          <TasteMetric label="Density" value={tasteProfile.layoutBias.density} icon={<LayoutMetricIcon type="density" />} />
          <TasteMetric label="Grid behavior" value={tasteProfile.layoutBias.gridBehavior} icon={<LayoutMetricIcon type="grid" />} />
          <TasteMetric label="Whitespace" value={tasteProfile.layoutBias.whitespaceIntent} icon={<LayoutMetricIcon type="whitespace" />} />
          <TasteMetric label="Hero style" value={tasteProfile.layoutBias.heroStyle} icon={<LayoutMetricIcon type="hero" />} />
        </div>
      </div>

      {tasteProfile.avoid.length > 0 && (
        <div className="rounded-lg border border-red-500/18 bg-[linear-gradient(180deg,rgba(239,68,68,0.08),rgba(239,68,68,0.02))] p-4">
          <p className="text-[10px] uppercase tracking-[0.16em] text-red-300/90">Anti-patterns</p>
          <p className="mt-1 text-xs text-red-200/80">The AI will avoid these patterns in generation.</p>
          <div className="mt-4 space-y-2">
            {tasteProfile.avoid.map((item) => (
              <div key={item} className="rounded-md border border-red-500/15 bg-red-500/[0.045] px-3 py-2 text-xs leading-relaxed text-red-100/90">
                {item}
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function TastePanel({
  analysis,
  tokens,
  tasteProfile,
  processing,
  tasteProfileLoading = false,
  referenceCount,
}: {
  analysis: ImageAnalysis | null;
  tokens: DesignSystemTokens | null;
  tasteProfile: TasteProfile | null;
  processing: boolean;
  tasteProfileLoading?: boolean;
  referenceCount: number;
}) {
  const paletteEntries = React.useMemo(() => {
    if (tasteProfile?.colorBehavior.suggestedColors) {
      return Object.entries(tasteProfile.colorBehavior.suggestedColors)
        .filter(([, color]) => Boolean(color))
        .slice(0, 6)
        .map(([key, color]) => [key, color as string] as const);
    }
    if (tokens) return Object.entries(tokens.colors).slice(0, 6);
    if (analysis) {
      return [
        ...analysis.colors.dominant.map((c, i) => [`dominant ${i + 1}`, c] as const),
        ...analysis.colors.accents.map((c, i) => [`accent ${i + 1}`, c] as const),
        ...analysis.colors.neutrals.map((c, i) => [`neutral ${i + 1}`, c] as const),
      ].slice(0, 6);
    }
    return [];
  }, [analysis, tasteProfile, tokens]);

  const typographyLines = React.useMemo(() => {
    if (tasteProfile) {
      return [
        `${tasteProfile.typographyTraits.headingTone} headings`,
        `${tasteProfile.typographyTraits.bodyTone} body`,
        ...tasteProfile.typographyTraits.recommendedPairings,
      ].slice(0, 3);
    }
    const lines: string[] = [];
    if (tokens?.typography.fontFamily) lines.push(tokens.typography.fontFamily.replace(/['"]/g, ""));
    if (analysis?.typography.category) lines.push(`${analysis.typography.category} pairing`);
    if (analysis?.typography.hierarchy) lines.push(analysis.typography.hierarchy);
    return lines.slice(0, 3);
  }, [analysis, tasteProfile, tokens]);

  const moodKeywords = React.useMemo(() => {
    if (tasteProfile) return tasteProfile.adjectives;
    if (!analysis) return [];
    return [
      analysis.quality.dominantVibe.label,
      analysis.vibe.tone,
      analysis.vibe.energy,
      analysis.vibe.density,
      analysis.spacing.density,
      analysis.typography.category,
    ].filter(Boolean);
  }, [analysis, tasteProfile]);

  const summary =
    tasteProfile?.summary ??
    analysis?.summary ??
    (tokens ? "A project system already exists. Colors and typography are ready to drive generation while new references refine the direction." : null);
  const canExtractTaste = referenceCount >= 3;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${analysis?.summary ?? "no-analysis"}-${tokens?.typography.fontFamily ?? "no-tokens"}-${processing ? "p" : "i"}-${tasteProfileLoading ? "e" : "s"}`}
        {...fadeIn}
        transition={springs.smooth}
        className="space-y-4"
      >
        <PanelSection title="Color palette">
          {processing && paletteEntries.length === 0 ? (
            <TasteSkeletonSection />
          ) : paletteEntries.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {paletteEntries.map(([label, value]) => (
                <div key={label} className="space-y-2">
                  <div
                    className="h-14 rounded-md border border-border-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                    style={{ backgroundColor: value }}
                  />
                  <div className="space-y-1">
                    <p className="truncate text-[10px] uppercase tracking-[0.12em] text-text-muted">{label}</p>
                    <p className="font-mono text-[10px] text-text-secondary">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs leading-relaxed text-text-muted">Add references to extract a usable palette.</p>
          )}
        </PanelSection>

        <PanelSection title="Typography">
          {processing && typographyLines.length === 0 ? (
            <TasteSkeletonSection />
          ) : typographyLines.length > 0 ? (
            <div className="space-y-2">
              {typographyLines.map((line, i) => (
                <p
                  key={`${line}-${i}`}
                  className={cn("leading-relaxed text-text-secondary", i === 0 ? "text-sm font-medium" : "text-xs")}
                >
                  {line}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-xs leading-relaxed text-text-muted">Typography pairings will appear after taste extraction.</p>
          )}
        </PanelSection>

        <PanelSection title="Mood keywords">
          {processing && moodKeywords.length === 0 ? (
            <TasteSkeletonSection />
          ) : moodKeywords.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {moodKeywords.map((keyword) => (
                <span
                  key={keyword}
                  className="rounded-full border border-border-primary bg-bg-primary px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] text-text-secondary"
                >
                  {keyword}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs leading-relaxed text-text-muted">Tone and adjectives will appear once Studio OS reads the board.</p>
          )}
        </PanelSection>

        <PanelSection title="Taste summary">
          {processing && !summary ? (
            <div className="space-y-2">
              <div className="h-3 w-full animate-pulse rounded-full bg-bg-tertiary" />
              <div className="h-3 w-[92%] animate-pulse rounded-full bg-bg-tertiary" />
              <div className="h-3 w-[68%] animate-pulse rounded-full bg-bg-tertiary" />
            </div>
          ) : summary ? (
            <p className="text-xs leading-relaxed text-text-secondary">{summary}</p>
          ) : (
            <p className="text-xs leading-relaxed text-text-muted">
              Studio OS will summarize the visual direction after analyzing your references.
            </p>
          )}
        </PanelSection>

        <TasteProfileDisplay tasteProfile={tasteProfile} loading={tasteProfileLoading} canExtract={canExtractTaste} />
      </motion.div>
    </AnimatePresence>
  );
}

// ─── TasteStrip: compact horizontal ribbon ────────────────────────────────────

function TasteStrip({
  tasteProfile,
  analysis,
  tokens,
}: {
  tasteProfile: TasteProfile | null;
  analysis: ImageAnalysis | null;
  tokens: DesignSystemTokens | null;
}) {
  const [expanded, setExpanded] = React.useState(false);

  const colors: string[] = React.useMemo(() => {
    if (tasteProfile?.colorBehavior.suggestedColors) {
      return Object.values(tasteProfile.colorBehavior.suggestedColors).filter(Boolean) as string[];
    }
    if (tokens) return Object.values(tokens.colors).slice(0, 5);
    if (analysis) return [...analysis.colors.dominant, ...analysis.colors.accents].slice(0, 5);
    return [];
  }, [tasteProfile, tokens, analysis]);

  const fontNames: string[] = React.useMemo(() => {
    if (tasteProfile) {
      return [`${tasteProfile.typographyTraits.headingTone} headings`, `${tasteProfile.typographyTraits.bodyTone} body`];
    }
    if (tokens?.typography.fontFamily) return [tokens.typography.fontFamily.replace(/['"]/g, "").split(",")[0].trim()];
    return [];
  }, [tasteProfile, tokens]);

  const moodTags: string[] = React.useMemo(() => {
    if (tasteProfile) return tasteProfile.adjectives.slice(0, 4);
    if (analysis) return [analysis.quality.dominantVibe.label, analysis.vibe.tone, analysis.vibe.energy].filter(Boolean).slice(0, 3);
    return [];
  }, [tasteProfile, analysis]);

  if (colors.length === 0 && fontNames.length === 0 && moodTags.length === 0) return null;

  return (
    <div className="border-y border-[#E5E5E0]">
      {/* Collapsed strip */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-4 px-6 py-3.5 hover:bg-[#F5F5F0] transition-colors"
        style={{ minHeight: 64 }}
      >
        {/* Color swatches */}
        {colors.length > 0 && (
          <div className="flex items-center gap-1.5">
            {colors.slice(0, 5).map((color, i) => (
              <span
                key={i}
                style={{ backgroundColor: color, width: 20, height: 20, borderRadius: "50%", border: "1px solid rgba(0,0,0,0.08)", flexShrink: 0 }}
              />
            ))}
          </div>
        )}

        {/* Divider dot */}
        {colors.length > 0 && fontNames.length > 0 && (
          <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#D1D1CC", flexShrink: 0 }} />
        )}

        {/* Font names */}
        {fontNames.length > 0 && (
          <span className="text-[12px] text-[#6B6B6B] truncate max-w-[160px]">{fontNames.join(" · ")}</span>
        )}

        {/* Mood tags */}
        {moodTags.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-hidden">
            {moodTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex shrink-0 items-center rounded-sm px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em]"
                style={{ background: "#F5F5F0", color: "#6B6B6B" }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <span className="ml-auto flex-shrink-0 text-[11px] text-[#A0A0A0]">
          {expanded ? "↑ Collapse" : "↓ Full profile"}
        </span>
      </button>

      {/* Expanded detail */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-[#E5E5E0] px-6 py-5">
              <TasteProfileDisplay tasteProfile={tasteProfile} loading={false} canExtract={true} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Minimal variant card (in-collect view) ───────────────────────────────────

function CollectVariantCard({
  variant,
  tokens,
  active,
  onSelect,
  onOpenCompose,
}: {
  variant: GeneratedVariant;
  tokens: DesignSystemTokens;
  active: boolean;
  onSelect: () => void;
  onOpenCompose: () => void;
}) {
  const previewId = React.useId();
  const [previewReady, setPreviewReady] = React.useState(false);

  React.useEffect(() => {
    setPreviewReady(false);
    if (!variant.compiledCode) return;
    const timeout = window.setTimeout(() => setPreviewReady(true), 12000);
    function handleMessage(event: MessageEvent) {
      if (!event.data || typeof event.data !== "object") return;
      if (event.data.previewId !== previewId) return;
      if (event.data.type === "preview-ready" || event.data.type === "preview-error") {
        window.clearTimeout(timeout);
        setPreviewReady(true);
      }
    }
    window.addEventListener("message", handleMessage);
    return () => { window.removeEventListener("message", handleMessage); window.clearTimeout(timeout); };
  }, [previewId, variant.compiledCode]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "overflow-hidden rounded-[4px] border bg-white transition-all duration-150",
        active
          ? "border-[#1E5DF2] border-2 shadow-[0_0_0_3px_rgba(209,228,252,0.3)]"
          : "border-[#E5E5E0] hover:border-[#D1E4FC] hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:-translate-y-px"
      )}
    >
      {/* 16:10 Preview */}
      <div
        role="button"
        tabIndex={0}
        className="relative w-full cursor-pointer"
        style={{ paddingBottom: "62.5%" }}
        onClick={onSelect}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(); } }}
      >
        {variant.compiledCode ? (
          <div className="absolute inset-0 overflow-hidden">
            {!previewReady && (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-[#FAFAF8]">
                <div className="flex items-center gap-2 rounded-sm border border-[#E5E5E0] bg-white px-4 py-2.5 shadow-sm">
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#E5E5E0] border-t-[#1E5DF2]" />
                  <span className="text-[11px] text-[#A0A0A0]">Rendering…</span>
                </div>
              </div>
            )}
            <iframe
              srcDoc={buildIframeHTML(variant.compiledCode, tokens, previewId)}
              className="absolute inset-0 w-full border-0 pointer-events-none"
              style={{ height: "100%", width: "100%" }}
              sandbox="allow-scripts allow-same-origin"
              title={`Preview: ${variant.name}`}
            />
          </div>
        ) : (
          <div className="absolute inset-0 overflow-y-auto bg-gradient-to-br from-[#F4F8FF] via-[#EBF3FF] to-[#D1E4FC]">
            <ComposeDocumentView
              pageTree={variant.pageTree}
              tokens={tokens}
              breakpoint="desktop"
              scale={380 / 1440}
              className="pointer-events-none"
            />
          </div>
        )}

        {/* Selected indicator — blue dot */}
        {active && (
          <div className="absolute right-2 top-2 z-20">
            <span className="block h-2 w-2 rounded-full bg-[#1E5DF2] shadow-sm" />
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className={cn(
          "border-t border-[#E5E5E0] px-4 py-3 transition-colors",
          active ? "bg-[rgba(209,228,252,0.1)]" : "bg-white"
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[10px] font-medium uppercase tracking-[0.1em] text-[#A0A0A0]">
              {variant.strategyLabel ?? variant.name}
            </p>
            {variant.description && (
              <p className="mt-0.5 line-clamp-1 text-[11px] text-[#6B6B6B]">{variant.description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpenCompose(); }}
            className={cn(
              "shrink-0 rounded-sm px-3 py-1.5 text-[12px] font-medium transition-all duration-150",
              active
                ? "bg-[#1E5DF2] text-white"
                : "bg-[#D1E4FC] text-[#1E5DF2] hover:bg-[#BDD5FC]"
            )}
          >
            Select
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Generation controls + variant gallery section ─────────────────────────

const SITE_TYPE_LABELS: Record<string, string> = {
  auto: "Auto",
  "saas-landing": "Landing",
  portfolio: "Portfolio",
  blog: "Blog",
  docs: "Docs",
};
const QUICK_SITE_TYPES = ["auto", "saas-landing", "portfolio", "blog", "docs"] as const;

function GenerationSection({
  tokens,
  siteType,
  onSiteTypeChange,
  sitePrompt,
  onSitePromptChange,
  onGenerate,
  canGenerate,
  generateLoading,
  generateError,
  variants,
  selectedVariantId,
  onSelectVariant,
  onOpenCompose,
}: {
  tokens: DesignSystemTokens | null;
  siteType: SiteType;
  onSiteTypeChange: (type: SiteType) => void;
  sitePrompt: string;
  onSitePromptChange: (prompt: string) => void;
  onGenerate: () => void;
  canGenerate: boolean;
  generateLoading: boolean;
  generateError: string | null;
  variants: GeneratedVariant[];
  selectedVariantId: string | null;
  onSelectVariant: (id: string) => void;
  onOpenCompose: (variantId: string) => void;
}) {
  const [dissolving, setDissolving] = React.useState(false);
  const [showVariants, setShowVariants] = React.useState(variants.length > 0);
  const [loaderPhase, setLoaderPhase] = React.useState<"analyzing" | "composing" | "rendering">("analyzing");
  const [loaderProgress, setLoaderProgress] = React.useState(0);

  // Compute loader phase from elapsed time when loading
  const loaderStartRef = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (!generateLoading) {
      loaderStartRef.current = null;
      return;
    }
    loaderStartRef.current = Date.now();
    let raf: number;
    function tick() {
      if (!loaderStartRef.current) return;
      const elapsed = (Date.now() - loaderStartRef.current) / 1000;
      const phaseProg = elapsed < 3 ? elapsed / 3 : elapsed < 8 ? (elapsed - 3) / 5 : Math.min((elapsed - 8) / 4, 0.98);
      const overallProgress = elapsed < 3 ? phaseProg * 0.3 : elapsed < 8 ? 0.3 + phaseProg * 0.5 : 0.8 + phaseProg * 0.18;
      setLoaderProgress(Math.min(overallProgress, 0.98));
      setLoaderPhase(elapsed < 3 ? "analyzing" : elapsed < 8 ? "composing" : "rendering");
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [generateLoading]);

  // When loading finishes and variants appear: start dissolve, then reveal cards
  const prevLoadingRef = React.useRef(generateLoading);
  React.useEffect(() => {
    const wasLoading = prevLoadingRef.current;
    prevLoadingRef.current = generateLoading;
    if (wasLoading && !generateLoading && variants.length > 0) {
      setLoaderProgress(1);
      setTimeout(() => {
        setDissolving(true);
      }, 200);
    }
  }, [generateLoading, variants.length]);

  // Sync variant visibility after dissolve
  React.useEffect(() => {
    if (variants.length > 0 && !generateLoading) {
      setShowVariants(true);
    }
  }, [variants.length, generateLoading]);

  const handleDissolveComplete = React.useCallback(() => {
    setDissolving(false);
  }, []);

  const isGenerating = generateLoading;

  return (
    <div style={{ borderTop: "1px solid #E5E5E0" }}>
      {/* Generation controls */}
      <div className="px-6 py-5">
        <p className="mb-4 text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: "#A0A0A0" }}>
          Generate
        </p>

        <AnimatePresence mode="wait">
          {isGenerating ? (
            /* ASCII Loader replaces controls during generation */
            <motion.div
              key="loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="py-2"
            >
              <AsciiLoader
                progress={loaderProgress}
                phase={loaderPhase}
                dissolving={dissolving}
                onComplete={handleDissolveComplete}
              />
            </motion.div>
          ) : (
            <motion.div
              key="controls"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-3"
            >
              {/* Site type pills */}
              <div className="flex flex-wrap gap-2">
                {QUICK_SITE_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => onSiteTypeChange(type as SiteType)}
                    className={cn(
                      "rounded-sm px-3 py-1.5 text-[11px] font-medium transition-colors",
                      siteType === type
                        ? "bg-[#1E5DF2] text-white"
                        : "border border-[#E5E5E0] bg-white text-[#6B6B6B] hover:border-[#D1E4FC] hover:text-[#1E5DF2]"
                    )}
                  >
                    {SITE_TYPE_LABELS[type] ?? type}
                  </button>
                ))}
              </div>

              {/* Prompt + Generate in one row */}
              <div className="flex gap-3">
                <textarea
                  value={sitePrompt}
                  onChange={(e) => onSitePromptChange(e.target.value)}
                  rows={2}
                  placeholder="describe the direction, audience, tone..."
                  style={{
                    flex: 1,
                    fontSize: 14,
                    fontFamily: "'Geist Sans', ui-sans-serif, system-ui, sans-serif",
                    border: "1px solid #E5E5E0",
                    borderRadius: 2,
                    padding: "10px 12px",
                    outline: "none",
                    resize: "none",
                    lineHeight: 1.5,
                    color: "#1A1A1A",
                    background: "#fff",
                    transition: "border-color 0.15s",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#D1E4FC"; e.currentTarget.style.boxShadow = "0 0 0 2px rgba(209,228,252,0.4)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E5E0"; e.currentTarget.style.boxShadow = "none"; }}
                />
                <button
                  type="button"
                  disabled={!canGenerate}
                  onClick={onGenerate}
                  style={{
                    background: canGenerate ? "#1E5DF2" : "#D1D1CC",
                    color: "#fff",
                    borderRadius: 2,
                    border: "none",
                    padding: "0 20px",
                    fontSize: 13,
                    fontWeight: 500,
                    fontFamily: "'Geist Sans', ui-sans-serif, system-ui, sans-serif",
                    cursor: canGenerate ? "pointer" : "not-allowed",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    transition: "background 0.15s",
                    minHeight: 44,
                  }}
                  onMouseEnter={(e) => { if (canGenerate) e.currentTarget.style.background = "#1A4FD6"; }}
                  onMouseLeave={(e) => { if (canGenerate) e.currentTarget.style.background = "#1E5DF2"; }}
                >
                  Generate
                </button>
              </div>

              {generateError && (
                <div className="rounded-sm border border-red-500/30 bg-red-500/5 px-4 py-2.5 text-[11px] text-red-400">
                  {generateError}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Variant Gallery */}
      <AnimatePresence>
        {showVariants && variants.length > 0 && tokens && !isGenerating && (
          <motion.div
            key="variants"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="px-6 pb-8"
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: "#A0A0A0" }}>
                Variants — {variants.length >= 3 ? "3-up" : variants.length === 2 ? "2-up" : "1 variant"}
              </p>
              <p className="text-[11px]" style={{ color: "#6B6B6B" }}>
                Select one to enter Compose
              </p>
            </div>
            <div
              className={cn(
                "grid gap-4",
                variants.length >= 3 ? "grid-cols-3" : variants.length === 2 ? "grid-cols-2" : "grid-cols-1 max-w-sm"
              )}
            >
              {variants.map((variant, i) => (
                <motion.div
                  key={variant.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut", delay: i * 0.1 }}
                >
                  <CollectVariantCard
                    variant={variant}
                    tokens={tokens}
                    active={selectedVariantId === variant.id}
                    onSelect={() => onSelectVariant(variant.id)}
                    onOpenCompose={() => onOpenCompose(variant.id)}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main CollectView ─────────────────────────────────────────────────────────

export function CollectView({
  projectId,
  referenceSetName,
  onReferenceSetNameChange,
  images,
  selectedIds,
  onToggleSelect,
  onRemove,
  onFilesAdded,
  onImport,
  analysis,
  tokens,
  tasteProfile,
  processing,
  tasteProfileLoading = false,
  error,
  siteType,
  onSiteTypeChange,
  sitePrompt,
  onSitePromptChange,
  onGenerateVariants,
  canGenerate,
  generateLoading,
  generateError,
  variants,
  selectedVariantId,
  onSelectVariant,
  onOpenCompose,
}: CollectViewProps) {
  const [panelCollapsed, setPanelCollapsed] = React.useState(false);
  const [lightboxImage, setLightboxImage] = React.useState<ReferenceImage | null>(null);
  const [importOpen, setImportOpen] = React.useState(false);
  const [importMode, setImportMode] = React.useState<ImportMode>("upload");

  function openImport(mode: ImportMode) {
    setImportMode(mode);
    setImportOpen(true);
  }

  const hasAnalysis = Boolean(analysis || tasteProfile || tokens);

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-[radial-gradient(120%_120%_at_0%_0%,rgba(249,241,224,0.6),transparent_44%),linear-gradient(180deg,#FAFAF8_0%,#F7F3EA_100%)]">
      <div className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-0 px-6 py-6">

          {/* ── Reference Grid + Side Panel ── */}
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
              {/* Header card */}
              <div className="flex flex-col gap-4 rounded-[4px] border border-[#E5E5E0] bg-white px-5 py-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div className="space-y-2">
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#A0A0A0]">Collect</p>
                    <div className="space-y-1">
                      {/* Editable board name */}
                      <h2
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => onReferenceSetNameChange(e.currentTarget.textContent ?? "")}
                        className="text-[17px] font-semibold tracking-tight text-[#1A1A1A] outline-none focus:underline decoration-[#D1E4FC]"
                        style={{ cursor: "text" }}
                      >
                        {referenceSetName || "Reference Board"}
                      </h2>
                      <p className="max-w-2xl text-sm leading-relaxed text-[#6B6B6B]">
                        Drop local images, import Are.na or Pinterest, or paste direct image URLs.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(["arena", "pinterest", "url"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        className="inline-flex h-8 items-center text-[11px] font-medium text-[#6B6B6B] underline-offset-2 hover:underline transition-colors"
                        onClick={() => openImport(mode)}
                      >
                        {mode === "arena" ? "Are.na" : mode.charAt(0).toUpperCase() + mode.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                  <UploadZone
                    onFilesAdded={(files) => { void onFilesAdded(files); }}
                    disabled={false}
                    className="min-h-[220px] rounded-[4px] border border-dashed border-[#E5E5E0]"
                  />
                  <div className="rounded-[4px] border border-[#E5E5E0] bg-[#F5F5F0] p-4">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-[#A0A0A0]">Stats</p>
                    <div className="mt-3 space-y-3 text-xs text-[#6B6B6B]">
                      <div className="flex items-center justify-between">
                        <span>References</span>
                        <span className="font-medium text-[#1A1A1A]">{images.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Pinned for analysis</span>
                        <span className="font-medium text-[#1A1A1A]">{selectedIds.size}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="rounded-[4px] border border-red-500/30 bg-red-500/5 px-4 py-3 text-[11px] text-red-400">
                    {error}
                  </div>
                )}
              </div>

              {/* Reference grid (masonry) */}
              {images.length > 0 ? (
                <div className="columns-1 gap-4 md:columns-2 xl:columns-3">
                  {images.map((image) => {
                    const pinned = selectedIds.has(image.id);
                    return (
                      <motion.div
                        key={image.id}
                        layout
                        className="group relative mb-4 break-inside-avoid overflow-hidden rounded-[4px] border bg-white cursor-pointer"
                        style={{ borderColor: "#E5E5E0" }}
                        whileHover={{
                          y: -1,
                          boxShadow: "0 2px 8px rgba(0,0,0,0.04), 0 0 0 1px #D1E4FC",
                          borderColor: "#D1E4FC",
                        }}
                      >
                        <div className="relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={image.thumbnail || image.url}
                            alt={image.name}
                            className="h-auto w-full origin-center object-contain"
                          />
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-black/0 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

                          {/* Pin indicator — 6px blue dot in top-right */}
                          {pinned && (
                            <div className="absolute right-2.5 top-2.5 z-10">
                              <span className="block h-1.5 w-1.5 rounded-full bg-[#1E5DF2] shadow-sm" />
                            </div>
                          )}

                          {/* Action buttons */}
                          <div className="absolute right-2.5 top-2.5 flex gap-1.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => onToggleSelect(image.id)}
                              className="rounded-sm border border-white/20 bg-black/55 px-2.5 py-1.5 text-[10px] uppercase tracking-[0.1em] text-white backdrop-blur-sm transition-colors hover:bg-black/75"
                            >
                              {pinned ? "Unpin" : "Pin"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setLightboxImage(image)}
                              className="rounded-sm border border-white/20 bg-black/55 px-2.5 py-1.5 text-[10px] uppercase tracking-[0.1em] text-white backdrop-blur-sm transition-colors hover:bg-black/75"
                            >
                              Zoom
                            </button>
                            <button
                              type="button"
                              onClick={() => onRemove(image.id)}
                              className="rounded-sm border border-white/20 bg-black/55 px-2.5 py-1.5 text-[10px] uppercase tracking-[0.1em] text-white backdrop-blur-sm transition-colors hover:bg-black/75"
                            >
                              Remove
                            </button>
                          </div>
                        </div>

                        {/* Card footer */}
                        <div className="border-t border-[#E5E5E0] px-4 py-3">
                          <p className="truncate text-[13px] font-medium text-[#1A1A1A]">{image.name}</p>
                          <p className="mt-0.5 text-[11px] text-[#A0A0A0]">
                            {pinned ? "Included in extraction" : "Visible on the board — pin to analyze"}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-[4px] border-2 border-dashed border-[#E5E5E0] bg-white p-10 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[4px] border border-[#D1E4FC] bg-[#F4F8FF] text-[#1E5DF2]">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 13V4M10 4L7 7M10 4L13 7" />
                      <path d="M3 14v1a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1" />
                    </svg>
                  </div>
                  <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.16em] text-[#A0A0A0]">Reference Board</p>
                  <h3 className="mt-3 text-2xl font-semibold tracking-tight text-[#1A1A1A]">Drop references here</h3>
                  <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[#6B6B6B]">
                    Bring in 6–20 references that share a visual direction. Studio OS will extract palette, typography, mood, and a concise creative reading from that cluster.
                  </p>
                </div>
              )}
            </div>

            {/* Right: Taste panel */}
            <motion.aside
              animate={{ width: panelCollapsed ? 64 : 320 }}
              transition={springs.smooth}
              className="sticky top-0 hidden h-fit shrink-0 overflow-hidden rounded-[4px] border border-border-primary bg-bg-primary shadow-[0_18px_48px_rgba(0,0,0,0.12)] xl:block"
            >
              <div className="flex items-center justify-between border-b border-border-subtle px-4 py-4">
                <div className={cn("min-w-0", panelCollapsed && "sr-only")}>
                  <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-text-tertiary">Extracted taste</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-text-muted">
                    {tasteProfileLoading ? (
                      <>
                        <span className="h-1.5 w-1.5 rounded-full bg-[#1E5DF2] animate-pulse" />
                        <span>Extracting the latest taste direction…</span>
                      </>
                    ) : (
                      <span>{processing ? "Refreshing from the latest board changes…" : "Auto-updates from the reference board"}</span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPanelCollapsed((v) => !v)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border-primary bg-bg-secondary text-text-secondary transition-colors hover:text-text-primary"
                  aria-label={panelCollapsed ? "Expand taste panel" : "Collapse taste panel"}
                >
                  <svg
                    className={cn("h-4 w-4 transition-transform", panelCollapsed && "rotate-180")}
                    viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 3.5 6 8l4.5 4.5" />
                  </svg>
                </button>
              </div>

              {panelCollapsed ? (
                <div className="flex min-h-[360px] items-center justify-center">
                  <span className="rotate-180 text-[10px] uppercase tracking-[0.22em] text-text-muted [writing-mode:vertical-rl]">
                    Taste panel
                  </span>
                </div>
              ) : (
                <div className="max-h-[calc(100vh-12rem)] overflow-y-auto p-4">
                  <TastePanel
                    analysis={analysis}
                    tokens={tokens}
                    tasteProfile={tasteProfile}
                    processing={processing}
                    tasteProfileLoading={tasteProfileLoading}
                    referenceCount={images.length}
                  />
                </div>
              )}
            </motion.aside>
          </div>

          {/* ── TasteStrip (ribbon between references and generation) */}
          {hasAnalysis && (
            <div className="mt-6 -mx-6">
              <TasteStrip tasteProfile={tasteProfile} analysis={analysis} tokens={tokens} />
            </div>
          )}

          {/* ── Generation controls + Variant gallery */}
          <div className="-mx-6">
            <GenerationSection
              tokens={tokens}
              siteType={siteType}
              onSiteTypeChange={onSiteTypeChange}
              sitePrompt={sitePrompt}
              onSitePromptChange={onSitePromptChange}
              onGenerate={onGenerateVariants}
              canGenerate={canGenerate}
              generateLoading={generateLoading}
              generateError={generateError}
              variants={variants}
              selectedVariantId={selectedVariantId}
              onSelectVariant={onSelectVariant}
              onOpenCompose={onOpenCompose}
            />
          </div>
        </div>
      </div>

      {/* Import modal */}
      <ImportReferenceModal
        open={importOpen}
        onOpenChange={setImportOpen}
        projectId={projectId}
        onImport={onImport}
        initialMode={importMode}
      />

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxImage ? (
          <motion.div
            {...fadeIn}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-8 backdrop-blur-sm"
            onClick={() => setLightboxImage(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={springs.smooth}
              className="max-w-[1080px] overflow-hidden rounded-[4px] border border-white/10 bg-[#0f0f13] shadow-[0_28px_100px_rgba(0,0,0,0.5)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-white/55">Reference preview</p>
                  <p className="mt-1 text-sm font-medium text-white">{lightboxImage.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setLightboxImage(null)}
                  className="rounded-sm border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] text-white"
                >
                  Close
                </button>
              </div>
              <div className="max-h-[80vh] overflow-auto p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={lightboxImage.url} alt={lightboxImage.name} className="max-h-[72vh] w-full object-contain" />
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
