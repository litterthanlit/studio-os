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

function TastePanel({
  analysis,
  tokens,
  tasteProfile,
  processing,
}: {
  analysis: ImageAnalysis | null;
  tokens: DesignSystemTokens | null;
  tasteProfile: TasteProfile | null;
  processing: boolean;
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
  const avoidList = tasteProfile?.avoid ?? [];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${analysis?.summary ?? "no-analysis"}-${tokens?.typography.fontFamily ?? "no-tokens"}-${processing ? "processing" : "idle"}`}
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
          {tasteProfile ? (
            <div className="space-y-2 border-t border-border-subtle pt-3">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.12em] text-text-muted">
                <span>Confidence</span>
                <span>{Math.round(tasteProfile.confidence * 100)}%</span>
              </div>
              {avoidList.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {avoidList.slice(0, 4).map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-border-primary bg-bg-primary px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] text-text-muted"
                    >
                      Avoid: {item}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </PanelSection>
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
                  <p className="mt-1 text-xs text-text-muted">
                    {processing ? "Refreshing from the latest board changes…" : "Auto-updates from the reference board"}
                  </p>
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
