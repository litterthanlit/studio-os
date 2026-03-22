"use client";

/**
 * V3 Prompt Panel — floating bottom-right panel for generation and history.
 *
 * Replaces CollectView's generation controls. Calls the same API routes:
 *   1. /api/canvas/analyze
 *   2. /api/canvas/generate-system
 *   3. /api/canvas/generate-component
 *
 * Single-variant normalization: if API returns multiple variants, choose
 * `safe` when present, otherwise take the first.
 */

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useCanvas } from "@/lib/canvas/canvas-context";
import { BREAKPOINT_WIDTHS } from "@/lib/canvas/compose";
import { SITE_TYPE_OPTIONS } from "@/lib/canvas/templates";
import type { SiteType } from "@/lib/canvas/templates";
import { getArtboardStartX } from "@/lib/canvas/unified-canvas-state";
import type {
  ArtboardItem,
  CanvasItem,
  ReferenceItem,
  PromptRun,
  Breakpoint,
} from "@/lib/canvas/unified-canvas-state";
import type { PageNode } from "@/lib/canvas/compose";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function artboardHeight(breakpoint: Breakpoint): number {
  if (breakpoint === "mobile") return 1320;
  return 1780;
}

const ARTBOARD_START_Y = 100;
const ARTBOARD_GAP = 80;

function createArtboardItems(
  pageTree: PageNode,
  siteId: string,
  compiledCode: string | null | undefined,
  existingItems: CanvasItem[]
): ArtboardItem[] {
  const startX = getArtboardStartX(existingItems);
  const layouts: Array<{ breakpoint: Breakpoint; label: string; xOffset: number }> = [
    { breakpoint: "desktop", label: "Desktop", xOffset: 0 },
    { breakpoint: "mobile", label: "Mobile", xOffset: BREAKPOINT_WIDTHS.desktop + ARTBOARD_GAP },
  ];

  return layouts.map(({ breakpoint, label, xOffset }, i) => ({
    id: uid("artboard"),
    kind: "artboard" as const,
    x: startX + xOffset,
    y: ARTBOARD_START_Y,
    width: BREAKPOINT_WIDTHS[breakpoint],
    height: artboardHeight(breakpoint),
    zIndex: 1000 + i,
    locked: false,
    siteId,
    breakpoint,
    name: `${label} ${BREAKPOINT_WIDTHS[breakpoint]}`,
    pageTree: structuredClone(pageTree),
    compiledCode: compiledCode ?? null,
  }));
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PromptPanel() {
  const { state, dispatch } = useCanvas();
  const { prompt, items, selection } = state;

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Reference context: selected references, or all references if none selected
  const referenceItems = React.useMemo(() => {
    const selectedRefs = items.filter(
      (item): item is ReferenceItem =>
        item.kind === "reference" &&
        selection.selectedItemIds.includes(item.id)
    );
    if (selectedRefs.length > 0) return selectedRefs;
    return items.filter(
      (item): item is ReferenceItem => item.kind === "reference"
    );
  }, [items, selection.selectedItemIds]);

  const styleRefCount = referenceItems.filter((r) => r.isStyleRef).length;
  const otherRefCount = referenceItems.length - styleRefCount;
  const refSummary = referenceItems.length > 0
    ? styleRefCount > 0
      ? `Using ${styleRefCount} style reference${styleRefCount !== 1 ? "s" : ""}${otherRefCount > 0 ? ` + ${otherRefCount} other${otherRefCount !== 1 ? "s" : ""}` : ""}`
      : `Using ${referenceItems.length} reference${referenceItems.length !== 1 ? "s" : ""} as context`
    : "No references on canvas";

  // ── Generation pipeline ────────────────────────────────────────────

  const handleGenerate = React.useCallback(async () => {
    if (!prompt.value.trim()) {
      setError("Add a prompt before generating.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Step 1: Analyze reference images
      const imageUrls = referenceItems.slice(0, 6).map((ref) => ref.imageUrl);

      let tokens = null;
      let markdown = "";

      if (imageUrls.length > 0) {
        const analyzeRes = await fetch("/api/canvas/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ images: imageUrls }),
        });

        if (!analyzeRes.ok) {
          const data = await analyzeRes.json().catch(() => ({}));
          throw new Error(data.error || `Analysis failed (${analyzeRes.status})`);
        }

        const analyzeData = await analyzeRes.json();

        // Step 2: Generate design system from analysis
        const systemRes = await fetch("/api/canvas/generate-system", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ analysis: analyzeData.analysis, mode: "auto" }),
        });

        if (systemRes.ok) {
          const systemData = await systemRes.json();
          tokens = systemData.tokens;
          markdown = systemData.markdown ?? "";
        }
      }

      // Step 3: Generate component/site
      const generateRes = await fetch("/api/canvas/generate-component", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "variants",
          prompt: prompt.value.trim(),
          tokens,
          referenceUrls: imageUrls,
          siteType: prompt.siteType,
          siteName: prompt.value.trim().slice(0, 50),
        }),
      });

      const generateData = await generateRes.json();
      if (!generateRes.ok) {
        throw new Error(generateData.error || "Generation failed");
      }

      // Single-variant normalization: choose `safe` when present, otherwise first
      const variants = Array.isArray(generateData.variants) ? generateData.variants : [];
      if (variants.length === 0) {
        throw new Error("No variants returned from generation");
      }

      const safeVariant = variants.find(
        (v: { strategy?: string }) => v.strategy === "safe"
      );
      const chosenVariant = safeVariant ?? variants[0];

      if (!chosenVariant.pageTree) {
        throw new Error("Chosen variant has no page tree");
      }

      // Create artboard items (positions computed dynamically to avoid overlapping references)
      const siteId = uid("site");
      const nonArtboardItems = items.filter((item) => item.kind !== "artboard");
      const artboards = createArtboardItems(
        chosenVariant.pageTree,
        siteId,
        chosenVariant.compiledCode,
        nonArtboardItems
      );

      // Build prompt run entry
      const promptEntry: PromptRun = {
        id: uid("run"),
        createdAt: new Date().toISOString(),
        prompt: prompt.value.trim(),
        siteType: prompt.siteType,
        referenceItemIds: referenceItems.map((ref) => ref.id),
        siteId,
        label: prompt.value.trim().length > 40
          ? prompt.value.trim().slice(0, 40) + "..."
          : prompt.value.trim(),
      };

      // Dispatch REPLACE_SITE (removes old artboards, adds new, pushes history)
      dispatch({ type: "REPLACE_SITE", artboards, promptEntry });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }, [prompt.value, prompt.siteType, referenceItems, dispatch]);

  // ── Restore from history ───────────────────────────────────────────

  const handleRestore = React.useCallback(
    (run: PromptRun) => {
      // Find artboard items from this run's siteId in current items
      // If they exist, restore them. Otherwise create placeholder artboards.
      const existingArtboards = items.filter(
        (item): item is ArtboardItem =>
          item.kind === "artboard" && item.siteId === run.siteId
      );

      if (existingArtboards.length > 0) {
        dispatch({
          type: "REPLACE_SITE",
          artboards: existingArtboards,
          promptEntry: run,
        });
      }
    },
    [items, dispatch]
  );

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {prompt.isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="absolute bottom-14 right-4 z-30 w-[340px] max-h-[480px] overflow-y-auto rounded-[6px] border border-[#E5E5E0] bg-white/90 backdrop-blur-sm shadow-md"
        >
          <div className="p-4 space-y-4">
            {/* Generate section */}
            <div className="space-y-3">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#A0A0A0]">
                Generate
              </span>

              {/* Prompt textarea */}
              <textarea
                value={prompt.value}
                onChange={(e) =>
                  dispatch({ type: "SET_PROMPT", value: e.target.value })
                }
                placeholder="Describe the website..."
                rows={3}
                className="w-full resize-none rounded-[2px] border border-[#E5E5E0] bg-white px-3 py-2 text-[13px] focus:border-[#D1E4FC] focus:ring-2 focus:ring-[#D1E4FC]/40 focus:outline-none"
              />

              {/* Site type selector */}
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-[#6B6B6B]">Site type:</span>
                <select
                  value={prompt.siteType}
                  onChange={(e) => {
                    dispatch({ type: "SET_SITE_TYPE", siteType: e.target.value as SiteType });
                  }}
                  className="flex-1 rounded-[2px] border border-[#E5E5E0] bg-white px-2 py-1.5 text-[12px] focus:border-[#D1E4FC] focus:ring-2 focus:ring-[#D1E4FC]/40 focus:outline-none"
                >
                  {SITE_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reference summary */}
              <div className="text-[11px] text-[#A0A0A0]">{refSummary}</div>

              {/* Error */}
              {error && (
                <div className="text-[11px] text-red-500">{error}</div>
              )}

              {/* Generate button */}
              <button
                onClick={handleGenerate}
                disabled={loading || !prompt.value.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-[4px] bg-[#1E5DF2] px-3 py-2.5 text-[13px] font-medium text-white hover:bg-[#1A4FD6] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate"
                )}
              </button>
            </div>

            {/* History section */}
            {prompt.history.length > 0 && (
              <div className="space-y-2 border-t border-[#E5E5E0] pt-3">
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#A0A0A0]">
                  History
                </span>

                <div className="space-y-1">
                  {prompt.history.map((run) => (
                    <div
                      key={run.id}
                      className="flex items-center justify-between gap-2 rounded-[2px] px-2 py-1.5 hover:bg-[#F5F5F0]"
                    >
                      <span className="flex-1 truncate text-[12px] text-[#1A1A1A]">
                        &ldquo;{run.label}&rdquo;
                      </span>
                      <button
                        onClick={() => handleRestore(run)}
                        className="shrink-0 rounded-[2px] border border-[#E5E5E0] px-2 py-0.5 text-[10px] text-[#6B6B6B] hover:border-[#D1E4FC] hover:text-[#1E5DF2]"
                      >
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
