"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
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
import { CodeViewer } from "./components/CodeViewer";
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
type ComposeLeftTab = "variants" | "layers" | "assets";

const STAGE_META: Record<CanvasStage, StageMeta> = {
  moodboard: { label: "Moodboard", number: "01", description: "Upload and analyze references" },
  system: { label: "System", number: "02", description: "Generate design tokens" },
  generate: { label: "Generate", number: "03", description: "Create full-page variants" },
  compose: { label: "Compose", number: "04", description: "Refine on an infinite board" },
};

const BREAKPOINT_OPTIONS: Array<{ key: Breakpoint; label: string; short: string }> = [
  { key: "desktop", label: "Desktop", short: "D" },
  { key: "tablet", label: "Tablet", short: "T" },
  { key: "mobile", label: "Mobile", short: "M" },
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

function formatNodeLabel(node: PageNode): string {
  const content = node.content?.text || node.content?.label || node.name;
  return content.length > 42 ? `${content.slice(0, 42)}…` : content;
}

function setVariantFavorite(
  variants: GeneratedVariant[],
  variantId: string
): GeneratedVariant[] {
  return variants.map((variant) =>
    variant.id === variantId
      ? { ...variant, favorite: !variant.favorite }
      : variant
  );
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
}: {
  variant: GeneratedVariant;
  tokens: DesignSystemTokens;
  active: boolean;
  onSelect: () => void;
  onFavorite: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      className={cn(
        "w-full rounded-2xl border bg-bg-primary text-left transition-colors overflow-hidden",
        active
          ? "border-accent shadow-[0_0_0_1px_var(--accent)]"
          : "border-border-primary hover:border-border-hover"
      )}
    >
      <div className="border-b border-border-subtle px-4 py-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-medium text-text-primary">{variant.name}</p>
          <p className="mt-1 text-[11px] text-text-muted leading-relaxed">
            {variant.description}
          </p>
        </div>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onFavorite();
          }}
          className={cn(
            "mt-0.5 rounded-md px-2 py-1 text-[10px] uppercase tracking-[0.12em]",
            variant.favorite
              ? "bg-accent/12 text-accent"
              : "bg-bg-tertiary text-text-muted"
          )}
        >
          {variant.favorite ? "★" : "☆"}
        </button>
      </div>
      <div className="bg-bg-secondary p-4">
        <div
          className="overflow-hidden rounded-xl border border-border-primary bg-black/10"
          style={{ height: 360 }}
        >
          <ComposeDocumentView
            pageTree={variant.pageTree}
            tokens={tokens}
            breakpoint="desktop"
            scale={variantCardScale()}
            className="pointer-events-none"
          />
        </div>
      </div>
    </motion.button>
  );
}

function StageStepper({
  stage,
  onSelect,
  completions,
}: {
  stage: CanvasStage;
  onSelect: (stage: CanvasStage) => void;
  completions: Partial<Record<CanvasStage, boolean>>;
}) {
  return (
    <div className="flex items-center gap-1">
      {(Object.keys(STAGE_META) as CanvasStage[]).map((key, index) => {
        const meta = STAGE_META[key];
        const active = key === stage;
        const complete = Boolean(completions[key]);
        return (
          <React.Fragment key={key}>
            {index > 0 ? (
              <div className="mx-1 h-px w-6 bg-border-primary" />
            ) : null}
            <button
              type="button"
              onClick={() => onSelect(key)}
              className={cn(
                "flex items-center gap-2 border px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] font-medium transition-colors",
                active
                  ? "border-accent bg-accent/10 text-accent"
                  : complete
                  ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
                  : "border-border-primary text-text-muted hover:text-text-secondary"
              )}
            >
              <span className="font-mono opacity-60">{meta.number}</span>
              {meta.label}
              {complete && !active ? <span>✓</span> : null}
            </button>
          </React.Fragment>
        );
      })}
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
  const [leftTab, setLeftTab] = React.useState<ComposeLeftTab>("variants");
  const [aiPrompt, setAiPrompt] = React.useState("");
  const [aiError, setAiError] = React.useState<string | null>(null);
  const [aiLoading, setAiLoading] = React.useState(false);
  const canvasRef = React.useRef<HTMLDivElement>(null);
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
      const nextZoom = Math.max(0.18, Math.min(1.35, curZoom * factor));
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
  }, [document, updateDocument]);

  function onBackgroundMouseDown(event: React.MouseEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("[data-artboard], [data-overlay]")) return;
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
        ? flattenNodes(selectedArtboard.pageTree).filter(({ depth }) => depth > 0)
        : [],
    [selectedArtboard]
  );

  return (
    <div className="flex-1 flex min-h-0">
      <aside className="w-[300px] shrink-0 border-r border-border-primary bg-bg-primary overflow-y-auto">
        <div className="border-b border-border-subtle px-4 py-3">
          <div className="flex gap-1 rounded-lg border border-border-primary bg-bg-secondary p-1">
            {(["variants", "layers", "assets"] as ComposeLeftTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setLeftTab(tab)}
                className={cn(
                  "flex-1 rounded-md px-3 py-1.5 text-[10px] uppercase tracking-[0.12em]",
                  leftTab === tab
                    ? "bg-accent text-white"
                    : "text-text-muted hover:text-text-secondary"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 space-y-4">
          {leftTab === "variants" ? (
            <>
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-[0.15em] font-medium text-text-tertiary">
                  Artboards
                </p>
                {document.artboards.map((artboard) => (
                  <button
                    key={artboard.id}
                    type="button"
                    onClick={() =>
                      updateDocument({
                        selectedArtboardId: artboard.id,
                        selectedNodeId: artboard.pageTree.id,
                      })
                    }
                    className={cn(
                      "w-full rounded-xl border px-3 py-3 text-left",
                      document.selectedArtboardId === artboard.id
                        ? "border-accent bg-accent/8"
                        : "border-border-primary bg-bg-secondary"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[12px] font-medium text-text-primary">{artboard.name}</p>
                        <p className="mt-1 text-[10px] text-text-muted">
                          {Math.round(artboard.x)} / {Math.round(artboard.y)}
                        </p>
                      </div>
                      <button
                        type="button"
                        className={cn(
                          "rounded-md px-2 py-1 text-[10px] uppercase tracking-[0.12em]",
                          document.primaryArtboardId === artboard.id
                            ? "bg-emerald-500/12 text-emerald-400"
                            : "bg-bg-tertiary text-text-muted"
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
              <div className="rounded-2xl border border-border-primary bg-bg-secondary p-3">
                <p className="text-[11px] uppercase tracking-[0.15em] font-medium text-text-tertiary">
                  Export Source
                </p>
                <p className="mt-2 text-[12px] text-text-muted leading-relaxed">
                  The primary artboard is the source of truth for export and deploy.
                </p>
              </div>
            </>
          ) : null}

          {leftTab === "layers" ? (
            <>
              <div>
                <p className="text-[11px] uppercase tracking-[0.15em] font-medium text-text-tertiary">
                  Layers
                </p>
                <p className="mt-1 text-[11px] text-text-muted">
                  Structured website nodes only. Overlays stay separate.
                </p>
              </div>
              <div className="space-y-1">
                {layers.map(({ node, depth }) => (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() =>
                      updateDocument({
                        selectedNodeId: node.id,
                      })
                    }
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[12px]",
                      document.selectedNodeId === node.id
                        ? "bg-accent/10 text-text-primary"
                        : "text-text-muted hover:bg-bg-secondary hover:text-text-secondary"
                    )}
                    style={{ paddingLeft: 12 + depth * 14 }}
                  >
                    <span className="text-[10px] opacity-50">{node.type}</span>
                    <span>{formatNodeLabel(node)}</span>
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {leftTab === "assets" ? (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] uppercase tracking-[0.15em] font-medium text-text-tertiary">
                    References
                  </p>
                  <span className="text-[10px] text-text-muted">{references.length}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {references.slice(0, 8).map((reference) => (
                    <button
                      key={reference.id}
                      type="button"
                      onClick={() =>
                        updateDocument({
                          overlays: [
                            ...document.overlays,
                            {
                              id: `overlay-${reference.id}`,
                              type: "reference",
                              x: (selectedArtboard?.x ?? 0) - 360,
                              y: (selectedArtboard?.y ?? 0) + 40,
                              width: 220,
                              height: 160,
                              imageUrl: reference.url,
                              label: reference.name,
                            },
                          ],
                        })
                      }
                      className="overflow-hidden rounded-xl border border-border-primary bg-bg-secondary"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={reference.thumbnail || reference.url}
                        alt={reference.name}
                        className="h-28 w-full object-cover"
                      />
                      <div className="px-2 py-2 text-[11px] text-text-secondary truncate">
                        {reference.name}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-border-primary bg-bg-secondary p-3 space-y-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.15em] font-medium text-text-tertiary">
                    Freeform Overlays
                  </p>
                  <p className="mt-1 text-[11px] text-text-muted">
                    These live on the board and never enter export.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full h-9 text-[10px] uppercase tracking-[0.12em]"
                  onClick={() =>
                    updateDocument({
                      overlays: [
                        ...document.overlays,
                        {
                          id: `note-${Date.now()}`,
                          type: "note",
                          x: (selectedArtboard?.x ?? 0) - 280,
                          y: (selectedArtboard?.y ?? 0) + 220,
                          width: 240,
                          height: 180,
                          text: "Pin a thought, copy direction, or a change request here.",
                          color: "#FBE67A",
                        },
                      ],
                    })
                  }
                >
                  Add note
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </aside>

      <div className="min-w-0 flex-1 flex flex-col bg-bg-secondary">
        <div className="border-b border-border-primary px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {BREAKPOINT_OPTIONS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => updateDocument({ breakpoint: item.key })}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-[10px] uppercase tracking-[0.12em]",
                    document.breakpoint === item.key
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border-primary text-text-muted hover:text-text-secondary"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="ml-2 flex items-center gap-2 text-[11px] text-text-muted">
              {selectionPath.map((node, index) => (
                <React.Fragment key={node.id}>
                  {index > 0 ? <span className="text-text-muted/40">/</span> : null}
                  <button
                    type="button"
                    className={cn(
                      "hover:text-text-secondary",
                      document.selectedNodeId === node.id && "text-text-primary"
                    )}
                    onClick={() => updateDocument({ selectedNodeId: node.id })}
                  >
                    {node.name}
                  </button>
                </React.Fragment>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                className="h-8 text-[10px] uppercase tracking-[0.12em]"
                onClick={() => updateDocument({ zoom: Math.max(0.18, document.zoom / 1.15) })}
              >
                −
              </Button>
              <span className="w-12 text-center font-mono text-[11px] text-text-muted">
                {Math.round(document.zoom * 100)}%
              </span>
              <Button
                type="button"
                variant="secondary"
                className="h-8 text-[10px] uppercase tracking-[0.12em]"
                onClick={() => updateDocument({ zoom: Math.min(1.35, document.zoom * 1.15) })}
              >
                +
              </Button>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-4">
            <p className="text-[11px] text-text-muted">
              Compose is the source of truth. Overlays are board-only and excluded from export.
            </p>
            <ExportMenu code={exportCode} siteName={siteName} siteType={siteType} />
          </div>
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden">
          <div
            ref={canvasRef}
            className="h-full w-full cursor-grab overflow-hidden"
            style={{
              backgroundImage: "radial-gradient(circle, var(--dot-grid-color) 1px, transparent 1px)",
              backgroundSize: `${Math.max(18, 28 * document.zoom)}px ${Math.max(18, 28 * document.zoom)}px`,
              backgroundPosition: `${document.pan.x % 28}px ${document.pan.y % 28}px`,
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
                    "absolute overflow-hidden rounded-[28px] border bg-bg-primary shadow-2xl",
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
                    className="flex cursor-move items-center justify-between border-b border-border-subtle bg-bg-secondary px-4 py-3"
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
                      <p className="text-[10px] text-text-muted">
                        {BREAKPOINT_OPTIONS.find((item) => item.key === document.breakpoint)?.label}
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
        </div>
      </div>

      <aside className="w-[320px] shrink-0 border-l border-border-primary bg-bg-primary overflow-y-auto">
        <div className="border-b border-border-subtle px-4 py-3">
          <div className="flex gap-1 rounded-lg border border-border-primary bg-bg-secondary p-1">
            {(["content", "style", "layout", "ai"] as InspectorTab[]).map((tab) => (
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

        <div className="p-4 space-y-5">
          {!selectedNode ? (
            <div className="rounded-2xl border border-border-primary bg-bg-secondary p-4 text-[12px] text-text-muted">
              Select a page node to edit its content, style, layout, or AI refinements.
            </div>
          ) : null}

          {selectedNode && document.inspectorTab === "content" ? (
            <div className="space-y-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.15em] font-medium text-text-tertiary">
                  Selection
                </p>
                <p className="mt-2 text-[13px] font-medium text-text-primary">{selectedNode.name}</p>
                <p className="text-[11px] text-text-muted">{selectedNode.type}</p>
              </div>
              {Object.entries(selectedNode.content ?? {})
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
            </div>
          ) : null}

          {selectedNode && document.inspectorTab === "style" ? (
            <div className="space-y-4">
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
                  className="h-10 w-full rounded-xl border border-border-primary bg-bg-secondary px-3 text-sm text-text-primary"
                >
                  <option value="none">None</option>
                  <option value="soft">Soft</option>
                  <option value="medium">Medium</option>
                </select>
              </label>
            </div>
          ) : null}

          {selectedNode && document.inspectorTab === "layout" ? (
            <div className="space-y-4">
              {(
                [
                  ["paddingX", "Padding X"],
                  ["paddingY", "Padding Y"],
                  ["gap", "Gap"],
                  ["columns", "Columns"],
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
                  className="h-10 w-full rounded-xl border border-border-primary bg-bg-secondary px-3 text-sm text-text-primary"
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                </select>
              </label>
              <div className="rounded-2xl border border-border-primary bg-bg-secondary p-3 text-[11px] text-text-muted">
                You are editing <strong className="text-text-secondary">{document.breakpoint}</strong> overrides.
                Desktop writes to base style; Tablet and Mobile write to responsive overrides.
              </div>
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
      </aside>
    </div>
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
    const colorsCount = meta?.palette.length ?? storedState.palette?.length ?? 0;
    const fontsCount = [meta?.headingFont, meta?.bodyFont].filter(Boolean).length;

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
      setGeneratedVariants(storedState.canvas?.generatedVariants ?? []);
      setSelectedVariantId(
        storedState.canvas?.selectedVariantId ??
          storedState.canvas?.generatedVariants?.[0]?.id ??
          null
      );
      setComposeDocument(storedState.canvas?.composeDocument ?? null);

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
    if (!bootstrapToast) return;
    const timeout = window.setTimeout(() => setBootstrapToast(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [bootstrapToast]);

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

      setGeneratedVariants(data.variants ?? []);
      setSelectedVariantId(data.variants?.[0]?.id ?? null);
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

  function handleOpenCompose() {
    if (generatedVariants.length === 0) return;
    setComposeDocument(createComposeDocument(generatedVariants));
    setStage("compose");
  }

  const selectedCount = selectedIds.size;
  const canAnalyze = selectedCount > 0 && !analysisLoading;
  const canGenerateSystem = analysis !== null && !systemLoading;
  const canGenerateVariants =
    tokens !== null && sitePrompt.trim().length > 0 && !generateLoading;

  const completions: Partial<Record<CanvasStage, boolean>> = {
    moodboard: analysis !== null,
    system: tokens !== null,
    generate: generatedVariants.length > 0,
    compose: composeDocument !== null,
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
            <StageStepper stage={stage} onSelect={setStage} completions={completions} />
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

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <motion.aside
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="w-[300px] shrink-0 border-r border-border-primary bg-bg-primary overflow-y-auto"
        >
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <h3 className="text-[11px] uppercase tracking-[0.15em] font-medium text-text-tertiary">
                References
              </h3>
              <Input
                value={setName}
                onChange={(event) => setSetName(event.target.value)}
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

            {images.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-text-muted">
                    {selectedCount} of {images.length} selected
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedIds(
                        selectedCount === images.length
                          ? new Set()
                          : new Set(images.map((image) => image.id))
                      );
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
                  {analysisLoading
                    ? "Analyzing..."
                    : `Analyze ${selectedCount} image${selectedCount !== 1 ? "s" : ""}`}
                </Button>
                {analysisError ? (
                  <div className="border border-red-500/30 bg-red-500/5 px-3 py-2 text-[10px] text-red-400">
                    {analysisError}
                    <p className="mt-1 text-red-400/60">
                      Make sure OPENAI_API_KEY is set in .env.local
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}

            <AnalysisPanel analysis={analysis} loading={analysisLoading} />

            {analysis ? (
              <Button
                onClick={handleGenerateSystem}
                disabled={!canGenerateSystem}
                className="w-full h-9 text-[11px] uppercase tracking-[0.12em]"
              >
                {systemLoading ? "Generating..." : "Generate Design System →"}
              </Button>
            ) : null}

            {stage === "generate" || stage === "compose" ? (
              <div className="space-y-3 border-t border-border-subtle pt-3">
                <div className="space-y-1">
                  <h3 className="text-[11px] uppercase tracking-[0.15em] font-medium text-text-tertiary">
                    Generate
                  </h3>
                  <p className="text-[11px] text-text-muted">
                    Create multiple full-page directions, then move into Compose.
                  </p>
                </div>
                <select
                  value={siteType}
                  onChange={(event) => setSiteType(event.target.value as SiteType)}
                  className="h-10 w-full rounded-xl border border-border-primary bg-bg-secondary px-3 text-sm text-text-primary"
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
                  rows={5}
                  placeholder="Describe the site direction, audience, tone, and what the page should feel like."
                  className="w-full rounded-xl border border-border-primary bg-bg-secondary px-3 py-2 text-sm text-text-primary outline-none"
                />
                <Button
                  onClick={handleGenerateVariants}
                  disabled={!canGenerateVariants}
                  className="w-full h-10 text-[11px] uppercase tracking-[0.12em]"
                >
                  {generateLoading ? "Generating Variants..." : "Generate Variants"}
                </Button>
                {generatedVariants.length > 0 ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full h-9 text-[11px] uppercase tracking-[0.12em]"
                    onClick={handleOpenCompose}
                  >
                    Open in Compose
                  </Button>
                ) : null}
                {generateError ? (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2 text-[11px] text-red-400">
                    {generateError}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </motion.aside>

        <div className="min-w-0 flex-1 flex flex-col overflow-hidden bg-bg-secondary">
          {stage === "moodboard" ? (
            <motion.div
              key="moodboard-center"
              className="flex-1 flex flex-col items-center justify-center p-8"
            >
              <div className="text-center space-y-4 max-w-md">
                <div>
                  <div className="font-mono text-text-muted/20 text-[80px] leading-none select-none mb-4">
                    ◈
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-text-primary tracking-tight">
                    Start with references
                  </h2>
                </div>
                <div>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    Bring in moodboard images, analyze the taste signal, and turn it into a reusable web system.
                  </p>
                </div>
                <div className="pt-2">
                  <div className="flex items-center justify-center gap-6 text-[10px] text-text-muted font-mono">
                    <span>01 References</span>
                    <span className="text-text-muted/30">→</span>
                    <span>02 System</span>
                    <span className="text-text-muted/30">→</span>
                    <span>03 Generate</span>
                    <span className="text-text-muted/30">→</span>
                    <span>04 Compose</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : null}

          {stage === "system" ? (
            <motion.div
              key="system-center"
              className="flex-1 flex flex-col p-6 overflow-y-auto"
            >
              <div className="max-w-2xl mx-auto w-full space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-text-primary tracking-tight">
                    Design System Preview
                  </h3>
                  <p className="text-xs text-text-tertiary mt-1">
                    Tune the extracted system before generating page variants.
                  </p>
                </div>

                {tokens ? (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-[11px] uppercase tracking-[0.15em] font-medium text-text-tertiary mb-3">
                        Palette
                      </h4>
                      <div className="flex gap-1">
                        {Object.entries(tokens.colors).map(([key, value]) => (
                          <div key={key} className="flex-1 group">
                            <div
                              className="h-14 border border-border-primary transition-transform group-hover:scale-105"
                              style={{ backgroundColor: value }}
                            />
                            <p className="mt-1 truncate text-center font-mono text-[9px] text-text-muted">
                              {key}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-[11px] uppercase tracking-[0.15em] font-medium text-text-tertiary mb-3">
                        Typography
                      </h4>
                      <div className="rounded-2xl border border-border-primary bg-bg-primary p-6">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-text-muted">
                          Heading
                        </p>
                        <h2
                          className="mt-3 text-4xl text-text-primary"
                          style={{ fontFamily: tokens.typography.fontFamily }}
                        >
                          From taste to site.
                        </h2>
                        <p
                          className="mt-4 max-w-xl text-sm leading-relaxed text-text-muted"
                          style={{ fontFamily: tokens.typography.fontFamily }}
                        >
                          The same tokens feed generation, compose, preview, and export. Adjust them here and the whole workflow stays coherent.
                        </p>
                      </div>
                    </div>

                    <div>
                      <Button
                        onClick={() => setStage("generate")}
                        className="w-full h-10 text-[11px] uppercase tracking-[0.12em]"
                      >
                        Continue to Generate →
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </motion.div>
          ) : null}

          {stage === "generate" ? (
            <div className="flex-1 min-h-0 overflow-y-auto p-6">
              <div className="mx-auto max-w-[1400px] space-y-6">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary tracking-tight">
                      Generated Variants
                    </h3>
                    <p className="mt-1 text-xs text-text-tertiary">
                      Compare full-page directions, favorite the strongest ones, and open them in Compose.
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

                {generatedVariants.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-border-primary bg-bg-primary p-10 text-center">
                    <p className="text-sm text-text-tertiary">
                      Generate 2–4 full-page variants from the left panel to move into Compose.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_360px]">
                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                      {generatedVariants.map((variant) =>
                        tokens ? (
                          <VariantCard
                            key={variant.id}
                            variant={variant}
                            tokens={tokens}
                            active={selectedVariantId === variant.id}
                            onSelect={() => setSelectedVariantId(variant.id)}
                            onFavorite={() =>
                              setGeneratedVariants((prev) =>
                                setVariantFavorite(prev, variant.id)
                              )
                            }
                          />
                        ) : null
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-3xl border border-border-primary bg-bg-primary p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[12px] font-medium text-text-primary">
                              {selectedVariant?.name || "Variant"}
                            </p>
                            <p className="mt-1 text-[11px] text-text-muted leading-relaxed">
                              {selectedVariant?.description}
                            </p>
                          </div>
                          {selectedVariant?.favorite ? (
                            <span className="rounded-md bg-accent/12 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-accent">
                              Favorite
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button
                            type="button"
                            className="h-9 text-[10px] uppercase tracking-[0.12em]"
                            onClick={handleOpenCompose}
                          >
                            Open in Compose
                          </Button>
                          {selectedVariant?.compiledCode ? (
                            <Button
                              type="button"
                              variant="secondary"
                              className="h-9 text-[10px] uppercase tracking-[0.12em]"
                              onClick={() =>
                                downloadTSX(
                                  selectedVariant.compiledCode!,
                                  selectedVariant.name
                                )
                              }
                            >
                              Download TSX
                            </Button>
                          ) : null}
                        </div>
                      </div>

                      <div className="min-h-[420px] rounded-3xl border border-border-primary bg-bg-primary overflow-hidden">
                        {selectedVariant?.compiledCode ? (
                          <CodeViewer
                            code={selectedVariant.compiledCode}
                            className="h-full"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center p-8 text-center text-sm text-text-muted">
                            Select a variant to inspect its compiled output.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
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
          ) : null}
        </div>

        {stage !== "compose" ? (
          <motion.aside
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="w-[300px] shrink-0 border-l border-border-primary bg-bg-primary overflow-y-auto"
          >
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] uppercase tracking-[0.15em] font-medium text-text-tertiary">
                  Design System
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

              {stage === "generate" && selectedVariant ? (
                <div className="rounded-2xl border border-border-primary bg-bg-secondary p-4 space-y-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.15em] font-medium text-text-tertiary">
                      Variant Focus
                    </p>
                    <p className="mt-2 text-[13px] font-medium text-text-primary">
                      {selectedVariant.name}
                    </p>
                    <p className="mt-1 text-[11px] text-text-muted leading-relaxed">
                      {selectedVariant.description}
                    </p>
                  </div>
                  <div className="space-y-2 text-[11px] text-text-muted">
                    <div className="flex items-center justify-between">
                      <span>Site type</span>
                      <span className="text-text-secondary">
                        {SITE_TYPE_OPTIONS.find((option) => option.value === selectedVariant.siteType)?.label ?? selectedVariant.siteType}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Source</span>
                      <span className="text-text-secondary">Structured page tree</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Export</span>
                      <span className="text-text-secondary">Compose will own final export</span>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </motion.aside>
        ) : null}
      </div>
    </div>
  );
}
