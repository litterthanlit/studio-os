"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UploadZone } from "./UploadZone";
import { cn } from "@/lib/utils";
import { fadeIn, springs } from "@/lib/animations";
import type { ImageAnalysis, ReferenceImage } from "@/lib/canvas/analyze-images";
import type { DesignSystemTokens } from "@/lib/canvas/generate-system";
import { ImportReferenceModal, type Reference } from "@/components/modals/import-reference-modal";
import type { TasteProfile } from "@/types/taste-profile";

type ImportMode = "upload" | "arena" | "pinterest" | "url";

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
};

function PanelSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-[24px] border border-border-primary bg-bg-secondary/70 p-4">
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
            <div className="h-12 animate-pulse rounded-2xl bg-bg-tertiary" />
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
      <div className="rounded-[24px] border border-border-primary bg-bg-primary p-4">
        <div className="space-y-2">
          <div className="h-3 w-20 animate-pulse rounded-full bg-bg-tertiary" />
          <div className="h-4 w-full animate-pulse rounded-full bg-bg-tertiary" />
          <div className="h-4 w-[92%] animate-pulse rounded-full bg-bg-tertiary" />
          <div className="h-4 w-[75%] animate-pulse rounded-full bg-bg-tertiary" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-7 w-20 animate-pulse rounded-full bg-bg-tertiary"
            />
          ))}
        </div>
      </div>
      <div className="rounded-[24px] border border-border-primary bg-bg-primary p-4">
        <div className="h-3 w-28 animate-pulse rounded-full bg-bg-tertiary" />
        <div className="mt-4 grid gap-3">
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-16 animate-pulse rounded-[18px] bg-bg-tertiary"
            />
          ))}
        </div>
      </div>
      <div className="rounded-[24px] border border-red-500/15 bg-red-500/[0.04] p-4">
        <div className="h-3 w-24 animate-pulse rounded-full bg-red-500/10" />
        <div className="mt-4 space-y-2">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-10 animate-pulse rounded-[16px] bg-red-500/10"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TasteMetric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[18px] border border-border-primary bg-bg-primary p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.12em] text-text-muted">{label}</p>
          <p className="mt-2 text-sm font-medium leading-snug text-text-primary">{value}</p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border-primary bg-bg-secondary text-text-secondary">
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
  if (loading) {
    return <TasteDetailSkeleton />;
  }

  if (!tasteProfile) {
    return (
      <div className="rounded-[24px] border border-dashed border-border-primary bg-bg-primary/60 px-4 py-6 text-center">
        <p className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">
          Taste profile
        </p>
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
      <div className="rounded-[24px] border border-border-primary bg-[linear-gradient(180deg,rgba(59,94,252,0.08),rgba(59,94,252,0.01))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">
            Taste summary
          </p>
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
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.12em] text-text-muted">
            <span>Confidence</span>
            <span>{Math.round(tasteProfile.confidence * 100)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-bg-secondary">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#3B5EFC,#91a4ff)] transition-all duration-500"
              style={{ width: `${Math.max(8, Math.round(tasteProfile.confidence * 100))}%` }}
            />
          </div>
        </div>
      </div>

      <div className="rounded-[24px] border border-border-primary bg-bg-primary p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">
              Layout preferences
            </p>
            <p className="mt-1 text-xs text-text-muted">
              The AI uses these tendencies to steer structure and pacing.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-3">
          <TasteMetric
            label="Density"
            value={tasteProfile.layoutBias.density}
            icon={<LayoutMetricIcon type="density" />}
          />
          <TasteMetric
            label="Grid style"
            value={tasteProfile.layoutBias.gridStyle}
            icon={<LayoutMetricIcon type="grid" />}
          />
          <TasteMetric
            label="Whitespace"
            value={tasteProfile.layoutBias.whitespacePreference}
            icon={<LayoutMetricIcon type="whitespace" />}
          />
          <TasteMetric
            label="Hero style"
            value={tasteProfile.layoutBias.heroStyle}
            icon={<LayoutMetricIcon type="hero" />}
          />
        </div>
      </div>

      <div className="rounded-[24px] border border-red-500/18 bg-[linear-gradient(180deg,rgba(239,68,68,0.08),rgba(239,68,68,0.02))] p-4">
        <p className="text-[10px] uppercase tracking-[0.16em] text-red-300/90">
          Anti-patterns
        </p>
        <p className="mt-1 text-xs text-red-200/80">
          The AI will avoid these patterns in generation.
        </p>
        {tasteProfile.avoid.length > 0 ? (
          <div className="mt-4 space-y-2">
            {tasteProfile.avoid.map((item) => (
              <div
                key={item}
                className="rounded-[16px] border border-red-500/15 bg-red-500/[0.045] px-3 py-2 text-xs leading-relaxed text-red-100/90"
              >
                {item}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-xs text-red-100/80">
            No major anti-patterns detected yet.
          </p>
        )}
      </div>
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
    if (tasteProfile?.colorBehavior.palette?.length) {
      return tasteProfile.colorBehavior.palette
        .slice(0, 6)
        .map((color, index) => [`taste ${index + 1}`, color] as const);
    }
    if (tokens) {
      return Object.entries(tokens.colors).slice(0, 6);
    }
    if (analysis) {
      const colors = [
        ...analysis.colors.dominant.map((color, index) => [`dominant ${index + 1}`, color] as const),
        ...analysis.colors.accents.map((color, index) => [`accent ${index + 1}`, color] as const),
        ...analysis.colors.neutrals.map((color, index) => [`neutral ${index + 1}`, color] as const),
      ];
      return colors.slice(0, 6);
    }
    return [];
  }, [analysis, tasteProfile, tokens]);

  const typographyLines = React.useMemo(() => {
    if (tasteProfile) {
      return [
        `${tasteProfile.typographyTraits.headingMood} headings`,
        `${tasteProfile.typographyTraits.bodyMood} body`,
        ...tasteProfile.typographyTraits.suggestedPairings,
      ].slice(0, 3);
    }
    const lines: string[] = [];
    if (tokens?.typography.fontFamily) {
      lines.push(tokens.typography.fontFamily.replace(/['"]/g, ""));
    }
    if (analysis?.typography.category) {
      lines.push(`${analysis.typography.category} pairing`);
    }
    if (analysis?.typography.hierarchy) {
      lines.push(analysis.typography.hierarchy);
    }
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
    (tokens
      ? "A project system already exists. Colors and typography are ready to drive generation while new references refine the direction."
      : null);
  const canExtractTaste = referenceCount >= 3;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${analysis?.summary ?? "no-analysis"}-${tokens?.typography.fontFamily ?? "no-tokens"}-${processing ? "processing" : "idle"}-${tasteProfileLoading ? "extracting" : "settled"}`}
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
                    className="h-14 rounded-[18px] border border-border-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                    style={{ backgroundColor: value }}
                  />
                  <div className="space-y-1">
                    <p className="truncate text-[10px] uppercase tracking-[0.12em] text-text-muted">
                      {label}
                    </p>
                    <p className="font-mono text-[10px] text-text-secondary">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs leading-relaxed text-text-muted">
              Add references to extract a usable palette.
            </p>
          )}
        </PanelSection>

        <PanelSection title="Typography">
          {processing && typographyLines.length === 0 ? (
            <TasteSkeletonSection />
          ) : typographyLines.length > 0 ? (
            <div className="space-y-2">
              {typographyLines.map((line, index) => (
                <p
                  key={`${line}-${index}`}
                  className={cn(
                    "leading-relaxed text-text-secondary",
                    index === 0 ? "text-sm font-medium" : "text-xs"
                  )}
                >
                  {line}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-xs leading-relaxed text-text-muted">
              Typography pairings will appear after taste extraction.
            </p>
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
            <p className="text-xs leading-relaxed text-text-muted">
              Tone and adjectives will appear once Studio OS reads the board.
            </p>
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

        <TasteProfileDisplay
          tasteProfile={tasteProfile}
          loading={tasteProfileLoading}
          canExtract={canExtractTaste}
        />
      </motion.div>
    </AnimatePresence>
  );
}

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
}: CollectViewProps) {
  const [panelCollapsed, setPanelCollapsed] = React.useState(false);
  const [lightboxImage, setLightboxImage] = React.useState<ReferenceImage | null>(null);
  const [importOpen, setImportOpen] = React.useState(false);
  const [importMode, setImportMode] = React.useState<ImportMode>("upload");

  function openImport(mode: ImportMode) {
    setImportMode(mode);
    setImportOpen(true);
  }

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-bg-secondary">
      <div className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-6 px-6 py-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
              <div className="flex flex-col gap-4 rounded-[28px] border border-border-primary bg-bg-primary px-5 py-5 shadow-[0_18px_48px_rgba(0,0,0,0.12)]">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div className="space-y-2">
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-text-tertiary">
                      Collect
                    </p>
                    <div className="space-y-1">
                      <h2 className="text-xl font-semibold tracking-tight text-text-primary">
                        Build the board, let Studio OS read the taste.
                      </h2>
                      <p className="max-w-2xl text-sm leading-relaxed text-text-secondary">
                        Drop local images, import Are.na or Pinterest, or paste direct image URLs. The board stays visual while the extracted taste stays visible on the right.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {([
                      ["arena", "Are.na"],
                      ["pinterest", "Pinterest"],
                      ["url", "URL"],
                    ] as const).map(([mode, label]) => (
                      <Button
                        key={mode}
                        type="button"
                        variant="secondary"
                        className="h-9 rounded-full px-4 text-[10px] uppercase tracking-[0.12em]"
                        onClick={() => openImport(mode)}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                  <UploadZone
                    onFilesAdded={(files) => {
                      void onFilesAdded(files);
                    }}
                    disabled={false}
                    className="min-h-[220px] rounded-[26px] border-[1.5px] bg-[radial-gradient(circle_at_top,rgba(59,94,252,0.12),transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))]"
                  />
                  <div className="rounded-[26px] border border-border-primary bg-bg-secondary p-4">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary">
                      Board name
                    </p>
                    <Input
                      value={referenceSetName}
                      onChange={(event) => onReferenceSetNameChange(event.target.value)}
                      placeholder="Reference set name..."
                      className="mt-3 h-10 text-sm"
                    />
                    <div className="mt-4 space-y-3 text-xs text-text-muted">
                      <div className="flex items-center justify-between">
                        <span>References</span>
                        <span className="font-medium text-text-secondary">{images.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Pinned for analysis</span>
                        <span className="font-medium text-text-secondary">{selectedIds.size}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {error ? (
                  <div className="rounded-2xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-[11px] text-red-400">
                    {error}
                  </div>
                ) : null}
              </div>

              {images.length > 0 ? (
                <div className="columns-1 gap-4 md:columns-2 xl:columns-3">
                  {images.map((image) => {
                    const pinned = selectedIds.has(image.id);
                    return (
                      <motion.div
                        key={image.id}
                        layout
                        className="group relative mb-4 break-inside-avoid overflow-hidden rounded-lg border border-border-primary/80 bg-bg-primary shadow-[0_18px_48px_rgba(0,0,0,0.14)]"
                      >
                        <div className="relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={image.thumbnail || image.url}
                            alt={image.name}
                            className="h-auto w-full origin-center object-contain transition-transform duration-200 group-hover:scale-[1.02]"
                          />
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-black/0 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                          <div className="absolute left-3 top-3">
                            {pinned ? (
                              <span className="rounded-full bg-white/88 px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.12em] text-black">
                                Pinned
                              </span>
                            ) : null}
                          </div>
                          <div className="absolute right-3 top-3 flex gap-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => onToggleSelect(image.id)}
                              className="rounded-full border border-white/15 bg-black/65 px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] text-white backdrop-blur"
                            >
                              {pinned ? "Unpin" : "Pin"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setLightboxImage(image)}
                              className="rounded-full border border-white/15 bg-black/65 px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] text-white backdrop-blur"
                            >
                              Zoom
                            </button>
                            <button
                              type="button"
                              onClick={() => onRemove(image.id)}
                              className="rounded-full border border-white/15 bg-black/65 px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] text-white backdrop-blur"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        <div className="space-y-1 px-4 py-3">
                          <p className="truncate text-sm font-medium text-text-primary">
                            {image.name}
                          </p>
                          <p className="text-[11px] text-text-muted">
                            {pinned
                              ? "Included in extraction"
                              : "Visible on the board only until pinned"}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg border-2 border-dashed border-border-primary bg-bg-primary p-10 text-center shadow-[0_18px_48px_rgba(0,0,0,0.08)]">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-border-primary bg-bg-secondary text-text-muted">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 13V4M10 4L7 7M10 4L13 7" />
                      <path d="M3 14v1a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1" />
                    </svg>
                  </div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-text-tertiary">
                    Reference board
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold tracking-tight text-text-primary">
                    Drop references here
                  </h3>
                  <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-text-secondary">
                    Bring in 6 to 20 references that genuinely share a taste direction. Studio OS will extract palette, typography, mood, and a concise creative reading from that cluster.
                  </p>
                </div>
              )}
            </div>

            <motion.aside
              animate={{ width: panelCollapsed ? 64 : 320 }}
              transition={springs.smooth}
              className="sticky top-0 hidden h-fit shrink-0 overflow-hidden rounded-[28px] border border-border-primary bg-bg-primary shadow-[0_18px_48px_rgba(0,0,0,0.12)] xl:block"
            >
              <div className="flex items-center justify-between border-b border-border-subtle px-4 py-4">
                <div className={cn("min-w-0", panelCollapsed && "sr-only")}>
                  <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-text-tertiary">
                    Extracted taste
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-text-muted">
                    {tasteProfileLoading ? (
                      <>
                        <span className="h-1.5 w-1.5 rounded-full bg-[#3B5EFC] animate-pulse" />
                        <span>Extracting the latest taste direction…</span>
                      </>
                    ) : (
                      <span>
                        {processing
                          ? "Refreshing from the latest board changes…"
                          : "Auto-updates from the reference board"}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPanelCollapsed((value) => !value)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border-primary bg-bg-secondary text-text-secondary transition-colors hover:text-text-primary"
                  aria-label={panelCollapsed ? "Expand taste panel" : "Collapse taste panel"}
                >
                  <svg
                    className={cn("h-4 w-4 transition-transform", panelCollapsed && "rotate-180")}
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
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
        </div>
      </div>

      <ImportReferenceModal
        open={importOpen}
        onOpenChange={setImportOpen}
        projectId={projectId}
        onImport={onImport}
        initialMode={importMode}
      />

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
              className="max-w-[1080px] overflow-hidden rounded-[28px] border border-white/10 bg-[#0f0f13] shadow-[0_28px_100px_rgba(0,0,0,0.5)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-white/55">
                    Reference preview
                  </p>
                  <p className="mt-1 text-sm font-medium text-white">{lightboxImage.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setLightboxImage(null)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] text-white"
                >
                  Close
                </button>
              </div>
              <div className="max-h-[80vh] overflow-auto p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={lightboxImage.url}
                  alt={lightboxImage.name}
                  className="max-h-[72vh] w-full object-contain"
                />
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
