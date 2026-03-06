"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { springs, staggerContainer, staggerItem, fadeIn } from "@/lib/animations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ImageAnalysis, ReferenceImage } from "@/lib/canvas/analyze-images";
import type { DesignSystemTokens } from "@/lib/canvas/generate-system";
import { tokensToMarkdown, analysisToTokens } from "@/lib/canvas/generate-system";
import { UploadZone } from "./components/UploadZone";
import { ReferenceGrid } from "./components/ReferenceGrid";
import { AnalysisPanel } from "./components/AnalysisPanel";
import { SystemEditor } from "./components/SystemEditor";
import { ComponentPreview } from "./components/ComponentPreview";
import { CodeViewer } from "./components/CodeViewer";
import { ExportActions } from "./components/ExportActions";

type Stage = "moodboard" | "system" | "generate";

const STAGE_META: Record<Stage, { label: string; number: string; description: string }> = {
  moodboard: { label: "Moodboard", number: "01", description: "Upload & analyze references" },
  system: { label: "System", number: "02", description: "Generate design tokens" },
  generate: { label: "Generate", number: "03", description: "Create Framer-ready components" },
};

// ─── Project data helpers ────────────────────────────────────────────────────

type StoredRef = {
  id: string;
  imageUrl: string;
  source?: string;
  title?: string;
};

function loadProjectRefs(projectId: string): ReferenceImage[] {
  try {
    const raw = localStorage.getItem(`studio-os:references:${projectId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredRef[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((r) => r && r.imageUrl)
      .map((r) => ({
        id: r.id || `ref-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        url: r.imageUrl,
        thumbnail: r.imageUrl,
        name: r.title || "Reference",
      }));
  } catch {
    return [];
  }
}

type StoredProject = { id: string; name: string; color: string };

const STATIC_PALETTES: Record<string, { name: string; palette: string[] }> = {
  "acme-rebrand": { name: "Acme Rebrand", palette: ["#1b1b1f", "#f97316", "#fed7aa", "#0f172a", "#e4e4e7"] },
  "fintech-dashboard": { name: "FinTech Dashboard", palette: ["#020617", "#0f172a", "#1d4ed8", "#38bdf8", "#e5e7eb"] },
  "editorial-magazine": { name: "Editorial Magazine", palette: ["#f9fafb", "#1f2937", "#111827", "#e5e7eb", "#f97316"] },
  "personal-portfolio": { name: "Personal Portfolio", palette: ["#020617", "#f9fafb", "#64748b", "#e5e7eb", "#0f172a"] },
};

function loadProjectMeta(projectId: string): { name: string; palette: string[] } | null {
  try {
    const staticMatch = STATIC_PALETTES[projectId];
    if (staticMatch) return staticMatch;

    const raw = localStorage.getItem("studio-os:projects");
    if (!raw) return null;
    const stored = JSON.parse(raw) as StoredProject[];
    const match = stored.find((p) => p.id === projectId);
    if (!match) return null;
    return {
      name: match.name,
      palette: [match.color, "#111111", "#222222", "#333333", "#999999"],
    };
  } catch {
    return null;
  }
}

function paletteToTokens(palette: string[]): DesignSystemTokens {
  const p = palette.length >= 5 ? palette : [...palette, "#111111", "#222222", "#333333", "#999999", "#eeeeee"].slice(0, 5);
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
      scale: { xs: "0.75rem", sm: "0.875rem", base: "1rem", lg: "1.125rem", xl: "1.25rem", "2xl": "1.5rem", "3xl": "1.875rem", "4xl": "2.25rem" },
      weights: { normal: 400, medium: 500, semibold: 600, bold: 700 },
      lineHeight: { tight: "1.25", normal: "1.5", relaxed: "1.75" },
    },
    spacing: {
      unit: 6,
      scale: { "0": "0", "1": "6px", "2": "12px", "3": "18px", "4": "24px", "6": "36px", "8": "48px", "12": "72px", "16": "96px" },
    },
    radii: { sm: "4px", md: "8px", lg: "12px", xl: "16px", full: "9999px" },
    shadows: { sm: "0 1px 2px rgba(0,0,0,0.06)", md: "0 4px 6px -1px rgba(0,0,0,0.1)", lg: "0 10px 15px -3px rgba(0,0,0,0.1)" },
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

// ─── Canvas Page ─────────────────────────────────────────────────────────────

export function CanvasPage({ projectId }: { projectId?: string }) {
  const [stage, setStage] = React.useState<Stage>("moodboard");
  const [images, setImages] = React.useState<ReferenceImage[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [setName, setSetName] = React.useState("");
  const [linkedProjectId] = React.useState(projectId || null);

  const [analysis, setAnalysis] = React.useState<ImageAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = React.useState(false);
  const [analysisError, setAnalysisError] = React.useState<string | null>(null);

  const [tokens, setTokens] = React.useState<DesignSystemTokens | null>(null);
  const [markdown, setMarkdown] = React.useState("");
  const [systemLoading, setSystemLoading] = React.useState(false);

  const [componentPrompt, setComponentPrompt] = React.useState("");
  const [generatedCode, setGeneratedCode] = React.useState<string | null>(null);
  const [componentName, setComponentName] = React.useState("Component");
  const [generateLoading, setGenerateLoading] = React.useState(false);
  const [generateError, setGenerateError] = React.useState<string | null>(null);

  const [viewMode, setViewMode] = React.useState<"preview" | "code">("preview");

  React.useEffect(() => {
    if (tokens) setMarkdown(tokensToMarkdown(tokens));
  }, [tokens]);

  // Load project data on mount when a projectId is present
  React.useEffect(() => {
    if (!linkedProjectId) return;

    const refs = loadProjectRefs(linkedProjectId);
    if (refs.length > 0) {
      setImages(refs);
      setSelectedIds(new Set(refs.map((r) => r.id)));
    }

    const meta = loadProjectMeta(linkedProjectId);
    if (meta) {
      setSetName(meta.name);
      if (meta.palette.length > 0) {
        const projectTokens = paletteToTokens(meta.palette);
        setTokens(projectTokens);
        if (refs.length > 0) {
          setStage("system");
        }
      }
    }
  }, [linkedProjectId]);

  function handleFilesAdded(files: File[]) {
    const newImages: ReferenceImage[] = files.map((file, i) => {
      const url = URL.createObjectURL(file);
      return {
        id: `img-${Date.now()}-${i}`,
        file,
        url,
        thumbnail: url,
        name: file.name,
      };
    });
    setImages((prev) => [...prev, ...newImages]);
    const newIds = new Set(selectedIds);
    newImages.forEach((img) => newIds.add(img.id));
    setSelectedIds(newIds);
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
      const img = prev.find((i) => i.id === id);
      if (img) URL.revokeObjectURL(img.url);
      return prev.filter((i) => i.id !== id);
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

      const res = await fetch("/api/canvas/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: base64Images }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Analysis failed (${res.status})`);
      }

      const data = await res.json();
      setAnalysis(data.analysis);
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalysisLoading(false);
    }
  }

  async function handleGenerateSystem() {
    if (!analysis) return;
    setSystemLoading(true);

    try {
      const res = await fetch("/api/canvas/generate-system", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis, mode: "auto" }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "System generation failed");
      }

      const data = await res.json();
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

  async function handleGenerateComponent() {
    if (!tokens || !componentPrompt.trim()) return;
    setGenerateLoading(true);
    setGenerateError(null);

    try {
      const res = await fetch("/api/canvas/generate-component", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: componentPrompt, tokens }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Component generation failed");
      }

      const data = await res.json();
      setGeneratedCode(data.code);
      setComponentName(data.name || "Component");
      setViewMode("preview");
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerateLoading(false);
    }
  }

  const selectedCount = selectedIds.size;
  const canAnalyze = selectedCount > 0 && !analysisLoading;
  const canGenerateSystem = analysis !== null && !systemLoading;
  const canGenerate = tokens !== null && componentPrompt.trim().length > 0 && !generateLoading;

  return (
    <div className="flex flex-col h-full">
      {/* Stage header */}
      <div className="shrink-0 border-b border-border-primary bg-bg-primary px-6 py-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-[8px] leading-none text-text-tertiary">■</span>
            <span className="text-[11px] uppercase tracking-[0.15em] font-medium text-text-tertiary">
              Canvas
            </span>
          </div>

          <div className="flex items-center gap-1">
            {(["moodboard", "system", "generate"] as Stage[]).map((s, i) => {
              const meta = STAGE_META[s];
              const active = stage === s;
              const completed =
                (s === "moodboard" && analysis !== null) ||
                (s === "system" && tokens !== null);
              return (
                <React.Fragment key={s}>
                  {i > 0 && (
                    <div className="w-6 h-px bg-border-primary mx-1" />
                  )}
                  <motion.button
                    type="button"
                    onClick={() => setStage(s)}
                    whileHover={{ scale: 1.02, transition: springs.smooth }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] font-medium transition-colors border",
                      active
                        ? "border-accent text-accent bg-accent-subtle"
                        : completed
                        ? "border-green-500/30 text-green-400/80 bg-green-500/5"
                        : "border-border-primary text-text-muted hover:text-text-secondary hover:border-border-hover"
                    )}
                  >
                    <span className="font-mono text-[9px] opacity-60">{meta.number}</span>
                    {meta.label}
                    {completed && !active && (
                      <span className="text-green-400 text-[9px]">✓</span>
                    )}
                  </motion.button>
                </React.Fragment>
              );
            })}
          </div>

          {(setName || linkedProjectId) && (
            <div className="ml-auto flex items-center gap-2 truncate">
              {linkedProjectId && (
                <a
                  href={`/projects/${linkedProjectId}`}
                  className="flex items-center gap-1 text-[10px] text-accent hover:underline font-mono"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  Project
                </a>
              )}
              {setName && (
                <span className="text-[11px] text-text-muted font-mono truncate">
                  {setName}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main content — 3 panel layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* ─── Left Panel: References ─── */}
        <motion.aside
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={springs.smooth}
          className="w-[280px] shrink-0 border-r border-border-primary bg-bg-primary overflow-y-auto"
        >
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <h3 className="text-[11px] uppercase tracking-[0.15em] font-medium text-text-tertiary">
                References
              </h3>
              <Input
                value={setName}
                onChange={(e) => setSetName(e.target.value)}
                placeholder="Reference set name..."
                className="h-8 text-xs"
              />
            </div>

            <UploadZone onFilesAdded={handleFilesAdded} disabled={analysisLoading} />

            <ReferenceGrid
              images={images}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onRemove={handleRemoveImage}
            />

            {images.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-text-muted">
                    {selectedCount} of {images.length} selected
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedCount === images.length) setSelectedIds(new Set());
                      else setSelectedIds(new Set(images.map((img) => img.id)));
                    }}
                    className="text-[10px] text-accent hover:underline"
                  >
                    {selectedCount === images.length ? "Deselect all" : "Select all"}
                  </button>
                </div>

                <Button
                  onClick={handleAnalyze}
                  disabled={!canAnalyze}
                  className="w-full h-9 text-[11px] uppercase tracking-[0.12em]"
                >
                  {analysisLoading ? "Analyzing..." : `Analyze ${selectedCount} image${selectedCount !== 1 ? "s" : ""}`}
                </Button>

                {analysisError && (
                  <div className="border border-red-500/30 bg-red-500/5 px-3 py-2 text-[10px] text-red-400">
                    {analysisError}
                    <p className="mt-1 text-red-400/60">
                      Make sure OPENAI_API_KEY is set in .env.local
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Analysis results */}
            <AnalysisPanel analysis={analysis} loading={analysisLoading} />

            {analysis && (
              <Button
                onClick={handleGenerateSystem}
                disabled={!canGenerateSystem}
                className="w-full h-9 text-[11px] uppercase tracking-[0.12em]"
              >
                {systemLoading ? "Generating..." : "Generate Design System →"}
              </Button>
            )}
          </div>
        </motion.aside>

        {/* ─── Center Panel: Preview ─── */}
        <div className="flex-1 flex flex-col overflow-hidden bg-bg-secondary">
          <AnimatePresence mode="wait">
            {stage === "moodboard" && (
              <motion.div
                key="moodboard-center"
                {...fadeIn}
                transition={springs.smooth}
                className="flex-1 flex flex-col items-center justify-center p-8"
              >
                <motion.div
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                  className="text-center space-y-4 max-w-md"
                >
                  <motion.div variants={staggerItem}>
                    <div className="font-mono text-text-muted/20 text-[80px] leading-none select-none mb-4">
                      ◈
                    </div>
                  </motion.div>
                  <motion.div variants={staggerItem}>
                    <h2 className="text-2xl font-semibold text-text-primary tracking-tight">
                      Start with references
                    </h2>
                  </motion.div>
                  <motion.div variants={staggerItem}>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      Upload moodboard images from Pinterest, Are.na, or your local files.
                      The AI will analyze patterns in color, typography, layout, and vibe
                      to generate a complete design system.
                    </p>
                  </motion.div>
                  <motion.div variants={staggerItem} className="pt-2">
                    <div className="flex items-center justify-center gap-6 text-[10px] text-text-muted font-mono">
                      <span>01 Upload</span>
                      <span className="text-text-muted/30">→</span>
                      <span>02 Analyze</span>
                      <span className="text-text-muted/30">→</span>
                      <span>03 Generate</span>
                    </div>
                  </motion.div>
                </motion.div>
              </motion.div>
            )}

            {stage === "system" && (
              <motion.div
                key="system-center"
                {...fadeIn}
                transition={springs.smooth}
                className="flex-1 flex flex-col p-6 overflow-y-auto"
              >
                <div className="max-w-2xl mx-auto w-full space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary tracking-tight">
                      Design System Preview
                    </h3>
                    <p className="text-xs text-text-tertiary mt-1">
                      Live preview of components using your generated tokens
                    </p>
                  </div>

                  {tokens && (
                    <motion.div
                      variants={staggerContainer}
                      initial="initial"
                      animate="animate"
                      className="space-y-6"
                    >
                      {/* Color palette row */}
                      <motion.div variants={staggerItem}>
                        <h4 className="text-[11px] uppercase tracking-[0.15em] font-medium text-text-tertiary mb-3">
                          Palette
                        </h4>
                        <div className="flex gap-1">
                          {Object.entries(tokens.colors).map(([key, value]) => (
                            <div key={key} className="flex-1 group">
                              <div
                                className="h-12 border border-border-primary transition-transform group-hover:scale-105"
                                style={{ backgroundColor: value }}
                              />
                              <p className="text-[9px] font-mono text-text-muted mt-1 truncate text-center">
                                {key}
                              </p>
                            </div>
                          ))}
                        </div>
                      </motion.div>

                      {/* Live component demos */}
                      <motion.div variants={staggerItem}>
                        <h4 className="text-[11px] uppercase tracking-[0.15em] font-medium text-text-tertiary mb-3">
                          Components
                        </h4>
                        <div
                          className="border border-border-primary p-6 space-y-4"
                          style={{ backgroundColor: tokens.colors.background }}
                        >
                          <div className="flex gap-2">
                            <button
                              type="button"
                              style={{
                                backgroundColor: tokens.colors.primary,
                                color: tokens.colors.background,
                                padding: `${tokens.spacing.scale["2"]} ${tokens.spacing.scale["4"]}`,
                                borderRadius: tokens.radii.md,
                                fontWeight: tokens.typography.weights.medium,
                                fontSize: tokens.typography.scale.sm,
                                border: "none",
                              }}
                            >
                              Primary
                            </button>
                            <button
                              type="button"
                              style={{
                                backgroundColor: "transparent",
                                color: tokens.colors.text,
                                padding: `${tokens.spacing.scale["2"]} ${tokens.spacing.scale["4"]}`,
                                borderRadius: tokens.radii.md,
                                fontWeight: tokens.typography.weights.medium,
                                fontSize: tokens.typography.scale.sm,
                                border: `1px solid ${tokens.colors.border}`,
                              }}
                            >
                              Secondary
                            </button>
                            <button
                              type="button"
                              style={{
                                backgroundColor: tokens.colors.accent,
                                color: "#FFFFFF",
                                padding: `${tokens.spacing.scale["2"]} ${tokens.spacing.scale["4"]}`,
                                borderRadius: tokens.radii.md,
                                fontWeight: tokens.typography.weights.medium,
                                fontSize: tokens.typography.scale.sm,
                                border: "none",
                              }}
                            >
                              Accent
                            </button>
                          </div>

                          <div
                            style={{
                              backgroundColor: tokens.colors.surface,
                              border: `1px solid ${tokens.colors.border}`,
                              borderRadius: tokens.radii.lg,
                              padding: tokens.spacing.scale["4"],
                              boxShadow: tokens.shadows.sm,
                            }}
                          >
                            <h3
                              style={{
                                color: tokens.colors.text,
                                fontSize: tokens.typography.scale.lg,
                                fontWeight: tokens.typography.weights.semibold,
                                fontFamily: tokens.typography.fontFamily,
                                marginBottom: tokens.spacing.scale["2"],
                              }}
                            >
                              Card Title
                            </h3>
                            <p
                              style={{
                                color: tokens.colors.textMuted,
                                fontSize: tokens.typography.scale.sm,
                                fontFamily: tokens.typography.fontFamily,
                                lineHeight: tokens.typography.lineHeight.relaxed,
                              }}
                            >
                              A preview card component rendered with your extracted design tokens.
                              Edit any token in the right panel to see changes live.
                            </p>
                          </div>

                          <input
                            type="text"
                            placeholder="Input preview..."
                            style={{
                              width: "100%",
                              backgroundColor: tokens.colors.background,
                              border: `1px solid ${tokens.colors.border}`,
                              padding: `${tokens.spacing.scale["2"]} ${tokens.spacing.scale["3"]}`,
                              borderRadius: tokens.radii.md,
                              fontSize: tokens.typography.scale.sm,
                              color: tokens.colors.text,
                              fontFamily: tokens.typography.fontFamily,
                              outline: "none",
                            }}
                          />
                        </div>
                      </motion.div>

                      {/* Ready to generate */}
                      <motion.div variants={staggerItem}>
                        <Button
                          onClick={() => setStage("generate")}
                          className="w-full h-10 text-[11px] uppercase tracking-[0.12em]"
                        >
                          Continue to Generate →
                        </Button>
                      </motion.div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}

            {stage === "generate" && (
              <motion.div
                key="generate-center"
                {...fadeIn}
                transition={springs.smooth}
                className="flex-1 flex flex-col overflow-hidden"
              >
                {/* Prompt bar */}
                <div className="shrink-0 border-b border-border-primary p-4">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleGenerateComponent();
                    }}
                    className="flex gap-2"
                  >
                    <Input
                      value={componentPrompt}
                      onChange={(e) => setComponentPrompt(e.target.value)}
                      placeholder='Describe a component: "Hero section for SaaS", "Pricing table", "Feature grid"...'
                      className="flex-1 h-10 text-sm"
                    />
                    <Button
                      type="submit"
                      disabled={!canGenerate}
                      className="h-10 px-6 text-[11px] uppercase tracking-[0.12em]"
                    >
                      {generateLoading ? "Generating..." : "Generate"}
                    </Button>
                  </form>
                  {generateError && (
                    <div className="mt-2 border border-red-500/30 bg-red-500/5 px-3 py-2 text-[10px] text-red-400">
                      {generateError}
                    </div>
                  )}
                </div>

                {/* View toggle */}
                {generatedCode && (
                  <div className="shrink-0 flex items-center justify-between border-b border-border-subtle px-4 py-2">
                    <div className="flex border border-border-primary rounded-sm overflow-hidden">
                      {(["preview", "code"] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setViewMode(m)}
                          className={cn(
                            "px-4 py-1.5 text-[10px] uppercase tracking-[0.12em] font-medium transition-colors",
                            viewMode === m
                              ? "bg-bg-tertiary text-text-primary"
                              : "text-text-muted hover:text-text-secondary"
                          )}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                    <ExportActions code={generatedCode} componentName={componentName} />
                  </div>
                )}

                {/* Preview / Code area */}
                <div className="flex-1 flex flex-col min-h-0">
                  <AnimatePresence mode="wait">
                    {viewMode === "preview" ? (
                      <motion.div key="preview" {...fadeIn} transition={springs.smooth} className="flex-1 flex flex-col min-h-0">
                        <ComponentPreview code={generatedCode} tokens={tokens} loading={generateLoading} />
                      </motion.div>
                    ) : (
                      <motion.div key="code" {...fadeIn} transition={springs.smooth} className="flex-1 overflow-auto p-4">
                        <CodeViewer code={generatedCode} className="h-full border border-border-primary rounded-lg overflow-hidden" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ─── Right Panel: System ─── */}
        <motion.aside
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={springs.smooth}
          className="w-[280px] shrink-0 border-l border-border-primary bg-bg-primary overflow-y-auto"
        >
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] uppercase tracking-[0.15em] font-medium text-text-tertiary">
                Design System
              </h3>
              {tokens && (
                <span className="text-[9px] text-green-400 font-mono">Active</span>
              )}
            </div>

            <SystemEditor
              markdown={markdown}
              tokens={tokens}
              onMarkdownChange={setMarkdown}
              onTokensChange={setTokens}
              loading={systemLoading}
            />

            {linkedProjectId && tokens && (
              <SyncToProjectButton projectId={linkedProjectId} tokens={tokens} />
            )}
          </div>
        </motion.aside>
      </div>
    </div>
  );
}

// ─── Sync to Project ─────────────────────────────────────────────────────────

function SyncToProjectButton({
  projectId,
  tokens,
}: {
  projectId: string;
  tokens: DesignSystemTokens;
}) {
  const [synced, setSynced] = React.useState(false);

  function handleSync() {
    try {
      const key = `studio-os:canvas-system:${projectId}`;
      localStorage.setItem(key, JSON.stringify(tokens));
      window.dispatchEvent(new Event("canvas-system-synced"));
      setSynced(true);
      setTimeout(() => setSynced(false), 2500);
    } catch {
      // storage full or unavailable
    }
  }

  return (
    <div className="border-t border-border-subtle pt-3">
      <Button
        onClick={handleSync}
        variant="secondary"
        className={cn(
          "w-full h-8 text-[10px] uppercase tracking-[0.12em] transition-colors",
          synced && "border-green-500/40 text-green-400"
        )}
      >
        {synced ? "✓ Synced to Project" : "Sync System → Project"}
      </Button>
      <p className="text-[9px] text-text-muted mt-1.5 text-center">
        Save design tokens back to the project room
      </p>
    </div>
  );
}
