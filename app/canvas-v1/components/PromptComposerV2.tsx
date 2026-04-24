"use client";

/**
 * PromptComposerV2 — extracted prompt composer component.
 *
 * Originally lived inside InspectorPanelV3.tsx. Extracted as a standalone
 * component so it can be rendered in both the inspector Prompt tab and the
 * FloatingPromptPanel.
 */

import * as React from "react";
import { ArrowRight, RefreshCw } from "lucide-react";
import { useCanvas } from "@/lib/canvas/canvas-context";
import { BREAKPOINT_WIDTHS } from "@/lib/canvas/compose";
import type { DesignNode } from "@/lib/canvas/design-node";
import { SITE_TYPE_OPTIONS } from "@/lib/canvas/templates";
import { getProjectState, upsertProjectState } from "@/lib/project-store";
import { TasteCard } from "./TasteCard";
import { ReferenceRail } from "./ReferenceRail";
import { TasteFeedbackDialog } from "./TasteFeedbackDialog";
import { detectTasteEdits } from "@/lib/canvas/taste-edit-tracker";
import type { TasteEdit } from "@/lib/canvas/taste-edit-tracker";
import type { FidelityMode } from "@/lib/canvas/directive-compiler";
import { getArtboardStartX, getGenerationStage, getGenerationStageLabel } from "@/lib/canvas/unified-canvas-state";
import type {
  CanvasItem,
  ReferenceItem,
  ArtboardItem,
  PromptRun,
  PromptRunArtboard,
  Breakpoint,
} from "@/lib/canvas/unified-canvas-state";
import type { DesignSystemTokens } from "@/lib/canvas/generate-system";
import type { PageNode } from "@/lib/canvas/compose";
import type { TasteProfile } from "@/types/taste-profile";
import type { SiteType } from "@/lib/canvas/templates";
import { isHintSeen, markHintSeen } from "./OnboardingHint";
import { getNodeTree } from "@/lib/canvas/canvas-item-conversion";
import { isDesignNodeTree } from "@/lib/canvas/compose";
import { buildSectionContext } from "@/lib/canvas/section-context-builder";
import { buildDesignTreeSectionPrompt } from "@/lib/canvas/design-tree-prompt";
import { summarizeCompositionsForTaste } from "@/lib/canvas/composition-blueprint";
import type { CompositionAnalysis } from "@/types/composition-analysis";

// ─── Helpers (copied from InspectorPanelV3) ─────────────────────────────────

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

function createArtboardItemsFromSnapshot(
  siteId: string,
  artboards: PromptRunArtboard[],
  existingItems: CanvasItem[]
): ArtboardItem[] {
  const startX = getArtboardStartX(existingItems);
  return artboards.map((artboard, i) => ({
    id: uid("artboard"),
    kind: "artboard" as const,
    x: startX +
      (artboard.breakpoint === "desktop"
        ? 0
        : BREAKPOINT_WIDTHS.desktop + ARTBOARD_GAP),
    y: ARTBOARD_START_Y,
    width: BREAKPOINT_WIDTHS[artboard.breakpoint],
    height: artboardHeight(artboard.breakpoint),
    zIndex: 1000 + i,
    locked: false,
    siteId,
    breakpoint: artboard.breakpoint,
    name: artboard.name,
    pageTree: structuredClone(artboard.pageTree),
    compiledCode: artboard.compiledCode ?? null,
  }));
}

function snapshotArtboards(artboards: ArtboardItem[]): PromptRunArtboard[] {
  return artboards.map((artboard) => ({
    breakpoint: artboard.breakpoint,
    name: artboard.name,
    pageTree: structuredClone(artboard.pageTree),
    compiledCode: artboard.compiledCode ?? null,
  }));
}

function buildFallbackTokens(existingTokens: DesignSystemTokens | null): DesignSystemTokens {
  if (existingTokens) return existingTokens;

  return {
    colors: {
      primary: "#4B57DB",
      secondary: "#0F172A",
      accent: "#4B83F7",
      background: "#FAFAF8",
      surface: "#FFFFFF",
      text: "#1A1A1A",
      textMuted: "#6B6B6B",
      border: "#E5E5E0",
    },
    typography: {
      fontFamily: "'IBM Plex Sans', 'Helvetica Neue', sans-serif",
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
      unit: 8,
      scale: {
        "0": "0",
        "1": "8px",
        "2": "16px",
        "3": "24px",
        "4": "32px",
        "6": "48px",
        "8": "64px",
        "12": "96px",
        "16": "128px",
      },
    },
    radii: { sm: "8px", md: "16px", lg: "24px", xl: "32px", full: "9999px" },
    shadows: {
      sm: "0 6px 16px rgba(15, 23, 42, 0.08)",
      md: "0 18px 40px rgba(15, 23, 42, 0.12)",
      lg: "0 28px 60px rgba(15, 23, 42, 0.16)",
    },
    animation: {
      spring: {
        smooth: { stiffness: 120, damping: 16 },
        snappy: { stiffness: 220, damping: 18 },
        gentle: { stiffness: 90, damping: 20 },
        bouncy: { stiffness: 260, damping: 14 },
      },
    },
  };
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getSuggestionChips(
  selectedNode: PageNode | DesignNode | null,
  hasArtboards: boolean
): string[] {
  if (!selectedNode) {
    if (hasArtboards) return ["Tighten spacing", "Make this more premium", "Make this more editorial"];
    return ["Explore directions", "Generate an editorial portfolio", "Create a premium launch page"];
  }

  const nodeType = selectedNode.type;

  switch (nodeType) {
    case "heading":
      return ["Make it shorter", "More professional tone", "Add a number or stat"];
    case "paragraph":
      if ((selectedNode as PageNode).name?.toLowerCase().includes("kicker"))
        return ["Make it punchier", "Add urgency", "Use action words"];
      return ["Simplify this", "Make it more persuasive", "Add a call to action"];
    case "button":
      return ["More urgent CTA", "Softer tone", "Add an emoji"];
    case "feature-grid":
    case "feature-card":
      return ["Add 2 more features", "Switch to 2-column layout", "Add icons to each card"];
    case "testimonial-grid":
    case "testimonial-card":
      return ["Make testimonials longer", "Add company names", "Add star ratings"];
    case "pricing-grid":
    case "pricing-tier":
      return ["Highlight the middle tier", "Add a free plan", "Simplify the pricing"];
    case "section":
      if ((selectedNode as PageNode).content?.mediaUrl)
        return ["A hero photo", "An abstract pattern", "A product screenshot"];
      return ["Tighten spacing", "Make this more premium", "More like the primary reference"];
    case "text":
      return ["Simplify this", "Make it more persuasive", "Add a call to action"];
    case "frame":
      return ["Tighten spacing", "Make this more premium", "More like the primary reference"];
    case "image":
      return ["A hero photo", "An abstract pattern", "A product screenshot"];
    default:
      return ["Redesign this section", "Change the layout", "Add more content"];
  }
}

const SECTION_REGEN_MODES = [
  {
    label: "Tighten",
    prompt: "Tighten spacing, sharpen hierarchy, and remove any generic filler while keeping this section's purpose.",
    intent: "more-like-this" as const,
  },
  {
    label: "Premium",
    prompt: "Make this section feel more premium with stronger hierarchy, more intentional spacing, and refined visual restraint.",
    intent: "more-like-this" as const,
  },
  {
    label: "Editorial",
    prompt: "Make this section more editorial: stronger type contrast, more distinctive composition, and less SaaS-template structure.",
    intent: "different-approach" as const,
  },
  {
    label: "Reference",
    prompt: "Move this section closer to the primary reference while preserving the site's overall flow.",
    intent: "more-like-this" as const,
  },
];

// ─── Generate Button with Onboarding Hint ─────────────────────────────────────

function GenerateButtonWithHint({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled: boolean;
}) {
  const [showHint, setShowHint] = React.useState(false);
  const hintKey = "generate-seen";

  const handleMouseEnter = () => {
    if (!isHintSeen(hintKey)) {
      setShowHint(true);
    }
  };

  const handleMouseLeave = () => {
    if (showHint) {
      markHintSeen(hintKey);
      setShowHint(false);
    }
  };

  return (
    <div
      className="absolute right-2 bottom-2"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        onClick={onClick}
        disabled={disabled}
        className="text-[#4B57DB] hover:bg-[#D1E4FC]/30 rounded-[2px] p-1 disabled:opacity-30 transition-colors dark:hover:bg-[#222244]/30"
      >
        <ArrowRight size={14} strokeWidth={1.5} />
      </button>
      {showHint && (
        <div
          className="absolute bottom-full right-0 mb-1 whitespace-nowrap text-[12px] text-[#6B6B6B] bg-[#FFFFFF] border border-[#E5E5E0] rounded-[4px] px-3 py-1.5 shadow-sm pointer-events-none dark:bg-[#1A1A1A] dark:border-[#333333] dark:text-[#D0D0D0]"
          style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}
        >
          Generate an editable site from your references, Taste Brief, and prompt
        </div>
      )}
    </div>
  );
}

function LaunchLoopStrip() {
  const steps = ["References", "Taste Brief", "Generate", "Edit", "Publish"];

  return (
    <div className="px-3 py-2 border-b border-[#E5E5E0] dark:border-[#333333]">
      <div className="flex flex-wrap items-center gap-1.5">
        {steps.map((step, index) => (
          <React.Fragment key={step}>
            <span className="rounded-[3px] bg-[#F5F5F0] px-1.5 py-1 text-[10px] font-mono uppercase tracking-[0.6px] text-[#6B6B6B] dark:bg-[#222222] dark:text-[#D0D0D0]">
              {step}
            </span>
            {index < steps.length - 1 && (
              <span className="text-[10px] text-[#A0A0A0]">-&gt;</span>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ─── PromptComposerV2 ──────────────────────────────────────────────────────────

type PromptComposerV2Props = {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  selectedNode: DesignNode | PageNode | null;
  projectId: string;
  varySignal: number;
  retryRef: React.MutableRefObject<(() => void) | null>;
};

export function PromptComposerV2({
  textareaRef,
  selectedNode,
  projectId,
  varySignal = 0,
  retryRef,
}: PromptComposerV2Props) {
  const { state, dispatch } = useCanvas();
  const { prompt, items, selection } = state;
  const agentSteps = prompt.agentSteps ?? [];
  const isGenerating = prompt.isGenerating ?? false;

  const [error, setError] = React.useState<string | null>(null);
  const historyEndRef = React.useRef<HTMLDivElement>(null);
  const projectTokens = React.useMemo(
    () => (projectId ? getProjectState(projectId).canvas?.designTokens ?? null : null),
    [projectId]
  );
  // Taste profile: seed from project state, then update in-memory when extraction runs
  const [tasteProfile, setTasteProfile] = React.useState<TasteProfile | null>(
    () => (projectId ? getProjectState(projectId).canvas?.tasteProfile ?? null : null)
  );

  // Fidelity mode: persisted in project state, same pattern as tasteProfile
  const [fidelityMode, setFidelityMode] = React.useState<FidelityMode>(
    () => {
      if (!projectId) return "balanced";
      const ps = getProjectState(projectId);
      return ps.canvas?.fidelityMode ?? "balanced";
    }
  );

  // Detect if the selected node is a root-level section (direct child of page root)
  const selectedSection = React.useMemo(() => {
    if (!selection.activeItemId || !selection.selectedNodeId) return null;
    const item = items.find((i) => i.id === selection.activeItemId);
    if (!item) return null;
    const tree = getNodeTree(item);
    if (!tree?.children) return null;
    const isDirectChild = tree.children.some((c) => c.id === selection.selectedNodeId);
    if (!isDirectChild) return null;
    const node = tree.children.find((c) => c.id === selection.selectedNodeId);
    return node ? { id: node.id, name: node.name || "Section", itemId: item.id } : null;
  }, [selection.activeItemId, selection.selectedNodeId, items]);

  // Persist fidelityMode changes to project state
  const handleFidelityChange = React.useCallback(
    (mode: FidelityMode) => {
      setFidelityMode(mode);
      if (projectId) {
        upsertProjectState(projectId, { canvas: { fidelityMode: mode } });
      }
    },
    [projectId]
  );

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

  // Weight-filtered and sorted references: muted excluded, primary first
  const weightedReferenceItems = React.useMemo(() => {
    const active = referenceItems.filter(
      (ref) => (ref.weight || "default") !== "muted"
    );
    return active.sort((a, b) => {
      const wa = a.weight === "primary" ? 0 : 1;
      const wb = b.weight === "primary" ? 0 : 1;
      return wa - wb;
    });
  }, [referenceItems]);

  // Taste feedback loop state
  const [showTasteFeedback, setShowTasteFeedback] = React.useState(false);

  const applyTasteOverrides = React.useCallback(
    (edits: TasteEdit[]) => {
      if (!tasteProfile) return;

      const overrides: NonNullable<typeof tasteProfile.userOverrides> = { ...tasteProfile.userOverrides };

      for (const edit of edits) {
        switch (edit.dimension) {
          case "headingFont":
            overrides.headingFont = edit.after as string;
            break;
          case "bodyFont":
            overrides.bodyFont = edit.after as string;
            break;
          case "density": {
            const spacing = edit.after as number;
            overrides.density = spacing < 48 ? "dense" : spacing > 72 ? "spacious" : "balanced";
            break;
          }
          case "palette":
            // Palette diff captured — store new color list as override palette
            break;
        }
      }

      const updatedProfile = { ...tasteProfile, userOverrides: overrides };
      setTasteProfile(updatedProfile);
      if (projectId) {
        upsertProjectState(projectId, { canvas: { tasteProfile: updatedProfile } });
      }

      dispatch({ type: "SET_PENDING_TASTE_EDITS", edits: [] });
    },
    [tasteProfile, projectId, dispatch]
  );

  const [isRefreshingTaste, setIsRefreshingTaste] = React.useState(false);
  const [refreshError, setRefreshError] = React.useState(false);

  // Count references with actual usable image URLs
  const usableRefCount = React.useMemo(
    () => referenceItems.filter((r) => r.imageUrl).length,
    [referenceItems]
  );

  const handleRefreshTaste = React.useCallback(async () => {
    if (isRefreshingTaste || usableRefCount === 0 || !projectId) return;
    setIsRefreshingTaste(true);
    setRefreshError(false);
    try {
      const imageUrls = weightedReferenceItems
        .map((r) => r.imageUrl)
        .filter(Boolean);

      const referenceWeights = weightedReferenceItems.reduce<Record<string, string>>((acc, ref) => {
        acc[ref.imageUrl] = ref.weight || "default";
        return acc;
      }, {});

      const res = await fetch("/api/taste/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          referenceUrls: imageUrls,
          referenceWeights,
          prompt: prompt.value?.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("Taste extraction failed");
      const data = await res.json();
      if (data && typeof data === "object" && data.summary) {
        const profile = data as TasteProfile;
        setTasteProfile(profile);
        upsertProjectState(projectId, { canvas: { tasteProfile: profile } });
      }
    } catch (err) {
      console.error("[TasteCard] Refresh failed:", err);
      setRefreshError(true);
      setTimeout(() => setRefreshError(false), 1500);
    } finally {
      setIsRefreshingTaste(false);
    }
  }, [isRefreshingTaste, usableRefCount, weightedReferenceItems, projectId, prompt.value]);

  const hasArtboards = items.some((i) => i.kind === "artboard");
  const chips = getSuggestionChips(selectedNode, hasArtboards);

  const refSummary = referenceItems.length > 0
    ? `${referenceItems.length} ref${referenceItems.length !== 1 ? "s" : ""} as context`
    : "No references";

  // Scroll history to bottom on new entry
  React.useEffect(() => {
    const el = historyEndRef.current;
    if (!el) return;
    // Use manual scrollTop on the closest scrollable parent to avoid
    // scrollIntoView bubbling up and shifting the page/shell.
    const scrollParent = el.closest(".overflow-y-auto") as HTMLElement | null;
    if (scrollParent) {
      scrollParent.scrollTo({ top: scrollParent.scrollHeight, behavior: "smooth" });
    }
  }, [prompt.history.length]);

  // Guard: skip taste edit detection when continuing after dialog confirmation
  const skipTasteCheckRef = React.useRef(false);

  // ── Generation pipeline ────────────────────────────────────────────

  const handleGenerate = React.useCallback(async () => {
    if (!prompt.value.trim()) {
      setError("Add a prompt before generating.");
      return;
    }

    setError(null);

    // ── Taste feedback detection ───────────────────────────────────────
    // Only check on full-page generation (not section regen), and only when
    // we have a snapshot from a previous generation to compare against.
    if (!skipTasteCheckRef.current && !selectedSection && state.generatedTreeSnapshot) {
      const allEdits: TasteEdit[] = [];
      for (const [itemId, snapshot] of Object.entries(state.generatedTreeSnapshot)) {
        const item = items.find((i) => i.id === itemId);
        if (!item) continue;
        const currentTree = getNodeTree(item);
        if (!currentTree) continue;
        const edits = detectTasteEdits(currentTree, snapshot);
        allEdits.push(...edits);
      }

      if (allEdits.length > 0) {
        dispatch({ type: "SET_PENDING_TASTE_EDITS", edits: allEdits });
        setShowTasteFeedback(true);
        return; // Wait for user to respond to dialog
      }
    }
    // Reset the guard for next invocation
    skipTasteCheckRef.current = false;

    // ── Section regeneration mode ──────────────────────────────────────
    // When a root-level section is selected, route to section regen instead of full-page.
    if (selectedSection) {
      dispatch({
        type: "SET_PROMPT_STATUS",
        isGenerating: true,
        agentSteps: [`Regenerating section: ${selectedSection.name}...`],
        generationResult: null,
      });

      try {
        const item = items.find((i) => i.id === selectedSection.itemId);
        if (!item) throw new Error("Section item not found");
        const tree = getNodeTree(item);
        if (!tree?.children) throw new Error("No node tree found");

        const context = buildSectionContext(tree.children, selectedSection.id);
        const tokens = projectId ? (getProjectState(projectId).canvas?.designTokens ?? {}) as DesignSystemTokens : ({} as DesignSystemTokens);
        const rawPrompt = prompt.value.trim();
        const mode = SECTION_REGEN_MODES.find((option) => option.prompt === rawPrompt);
        const intent = mode?.intent ?? "more-like-this";

        dispatch({ type: "PUSH_HISTORY", description: `Regenerate section: ${context.targetName}` });

        const sectionPrompt = buildDesignTreeSectionPrompt(
          tokens,
          context.targetName,
          { above: context.above, below: context.below },
          {
            intent,
            direction: rawPrompt,
            tasteProfile,
            fidelityMode,
          }
        );

        const res = await fetch("/api/canvas/generate-component", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: sectionPrompt,
            tokens,
            regenerationIntent: intent,
            useDesignNode: true,
            mode: "single",
          }),
        });

        if (!res.ok) throw new Error("Section regeneration failed");
        const data = await res.json();

        const variant = data.variants?.[0];
        if (!variant?.pageTree) throw new Error("No section generated");

        let sectionTree = variant.pageTree;
        if (sectionTree.type === "frame" && sectionTree.children?.length === 1 && sectionTree.name === "Root") {
          sectionTree = sectionTree.children[0];
        }

        dispatch({
          type: "REPLACE_SECTION",
          itemId: selectedSection.itemId,
          nodeId: selectedSection.id,
          replacement: sectionTree,
        });

        dispatch({ type: "SET_PROMPT_STATUS", generationResult: "success" });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Section regeneration failed";
        setError(errMsg);
        dispatch({ type: "SET_PROMPT_STATUS", generationResult: "error" });
      } finally {
        dispatch({ type: "SET_PROMPT_STATUS", isGenerating: false, agentSteps: [] });
      }
      return;
    }

    // Snapshot pre-edit state for preview/reject flow
    dispatch({
      type: "START_AI_PREVIEW",
      prompt: prompt.value.trim(),
      nodeId: selection.selectedNodeId || "",
    });

    dispatch({
      type: "SET_PROMPT_STATUS",
      isGenerating: true,
      agentSteps: ["Preparing generation..."],
      generationResult: null,
    });

    try {
      const imageUrls = weightedReferenceItems.slice(0, 6).map((ref) => ref.imageUrl);
      let tokens = buildFallbackTokens(projectTokens);

      // Keep generation working in local/demo environments by falling back to
      // project/default tokens whenever remote image analysis is unavailable.
      if (imageUrls.length > 0) {
        dispatch({
          type: "SET_PROMPT_STATUS",
          agentSteps: ["Analyzing references..."],
        });
        try {
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
          dispatch({
            type: "SET_PROMPT_STATUS",
            agentSteps: ["Analyzing references...", "Extracting design tokens..."],
          });

          const systemRes = await fetch("/api/canvas/generate-system", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ analysis: analyzeData.analysis, mode: "auto" }),
          });

          if (!systemRes.ok) {
            const data = await systemRes.json().catch(() => ({}));
            throw new Error(data.error || `Token generation failed (${systemRes.status})`);
          }

          const systemData = await systemRes.json();
          if (systemData.tokens) {
            tokens = systemData.tokens;
          }
        } catch (analysisErr) {
          console.warn("[prompt] Falling back to local tokens:", analysisErr);
          dispatch({
            type: "SET_PROMPT_STATUS",
            agentSteps: ["Analyzing references...", "Using local design defaults..."],
          });
        }
      } else {
        dispatch({
          type: "SET_PROMPT_STATUS",
          agentSteps: ["Using local design defaults..."],
        });
      }

      if (projectId) {
        // Keep the artboard renderer in sync with the freshly chosen token set
        // so generated pages immediately render instead of falling back to
        // "No design tokens available" on first paint.
        upsertProjectState(projectId, { canvas: { designTokens: tokens } });
      }

      // Step 2.5a: Analyze compositions for weighted references (cached per reference item)
      const compositionData: Array<{
        analysis: CompositionAnalysis;
        weight: "primary" | "default" | "muted";
        referenceIndex: number;
      }> = [];

      for (let i = 0; i < weightedReferenceItems.length && i < 6; i++) {
        const ref = weightedReferenceItems[i];

        // Use cached analysis if available
        if (ref.compositionAnalysis) {
          compositionData.push({
            analysis: ref.compositionAnalysis,
            weight: ref.weight ?? "default",
            referenceIndex: i,
          });
          continue;
        }

        // Analyze uncached reference — fail open on any error
        try {
          const compRes = await fetch("/api/taste/analyze-composition", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageUrl: ref.imageUrl }),
          });
          if (compRes.ok) {
            const analysis: CompositionAnalysis = await compRes.json();
            // Cache on the reference item via dispatch
            dispatch({
              type: "UPDATE_ITEM",
              itemId: ref.id,
              changes: { compositionAnalysis: analysis } as Partial<ReferenceItem>,
            });
            compositionData.push({
              analysis,
              weight: ref.weight ?? "default",
              referenceIndex: i,
            });
          }
        } catch (compErr) {
          console.warn("[COMPOSITION] Failed to analyze reference", ref.id, compErr);
          // Continue without this reference's composition — fail open
        }
      }

      const compositionContext = summarizeCompositionsForTaste(compositionData);

      // Step 2.5: Extract taste profile if we have references but no taste profile yet
      let resolvedTaste = tasteProfile;
      console.log("[TASTE DEBUG] tasteProfile source:", resolvedTaste ? "project-state (cached)" : "will-extract");
      console.log("[TASTE DEBUG] tasteProfile archetype:", resolvedTaste?.archetypeMatch ?? "none");
      console.log("[TASTE DEBUG] tasteProfile avoid:", resolvedTaste?.avoid?.length ?? 0, "items");
      if (!resolvedTaste && imageUrls.length > 0 && projectId) {
        dispatch({
          type: "SET_PROMPT_STATUS",
          agentSteps: ["Analyzing references...", "Extracting taste profile..."],
        });
        try {
          const referenceWeights = weightedReferenceItems.reduce<Record<string, string>>((acc, ref) => {
            acc[ref.imageUrl] = ref.weight || "default";
            return acc;
          }, {});

          const tasteRes = await fetch("/api/taste/extract", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectId,
              referenceUrls: imageUrls,
              referenceWeights,
              existingTokens: tokens,
              prompt: prompt.value?.trim() || undefined,
            }),
          });
          if (tasteRes.ok) {
            const tasteData = await tasteRes.json();
            if (tasteData && typeof tasteData === "object" && tasteData.summary) {
              resolvedTaste = tasteData as TasteProfile;
              setTasteProfile(resolvedTaste);
              upsertProjectState(projectId, { canvas: { tasteProfile: resolvedTaste } });
            }
          }
        } catch (tasteErr) {
          console.warn("[prompt] Taste extraction failed, continuing without:", tasteErr);
        }
      }

      // Step 3: Compose layout + generate component/site
      const analysisPrefix = imageUrls.length > 0 ? ["Analyzing references..."] : [];

      dispatch({
        type: "SET_PROMPT_STATUS",
        agentSteps: [...analysisPrefix, "Composing layout..."],
      });

      // Timed split: transition from "composing" to "creating" after ~10s
      // since the long API call has no real midpoint event.
      const creatingTimer = setTimeout(() => {
        dispatch({
          type: "SET_PROMPT_STATUS",
          agentSteps: [...analysisPrefix, "Creating variations..."],
        });
      }, 10_000);

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
          tasteProfile: resolvedTaste,
          fidelityMode,
          useDesignNode: true,
          compositionData: compositionData.length > 0 ? compositionData : undefined,
          compositionContext: compositionContext || undefined,
        }),
      });

      clearTimeout(creatingTimer);

      const generateData = await generateRes.json();
      if (!generateRes.ok) {
        throw new Error(generateData.error || "Generation failed");
      }

      dispatch({
        type: "SET_PROMPT_STATUS",
        agentSteps: [...analysisPrefix, "Creating variations...", "Building artboards..."],
      });

      // Single-variant normalization
      const variants = Array.isArray(generateData.variants) ? generateData.variants : [];
      if (variants.length === 0) {
        throw new Error("No variants returned from generation");
      }

      const safeVariant = variants.find(
        (v: { strategy?: string }) => v.strategy === "safe"
      );
      const chosenVariant = safeVariant ?? variants[0];

      // Debug: log what the generation returned
      console.log("[GEN DEBUG] Chosen variant:", {
        strategy: chosenVariant.strategy,
        pageTreeSource: chosenVariant.pageTreeSource,
        previewSource: chosenVariant.previewSource,
        previewFallbackReason: chosenVariant.previewFallbackReason,
        pageTreeType: chosenVariant.pageTree?.type,
        pageTreeChildCount: chosenVariant.pageTree?.children?.length,
        pageTreeChildNames: chosenVariant.pageTree?.children?.map((c: { name?: string }) => c.name),
      });

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
        artboards: snapshotArtboards(artboards),
      };

      dispatch({ type: "REPLACE_SITE", artboards, promptEntry });

      // After REPLACE_SITE, snapshot the generated trees for taste feedback tracking
      const snapshots: Record<string, DesignNode> = {};
      for (const artboard of artboards) {
        if (isDesignNodeTree(artboard.pageTree)) {
          snapshots[artboard.id] = structuredClone(artboard.pageTree as DesignNode);
        }
      }
      if (Object.keys(snapshots).length > 0) {
        dispatch({ type: "SET_GENERATED_SNAPSHOT", snapshots });
      }

      // ── Variant carousel: set up Base + Pushed preview (V6 DesignNode only) ──
      // The route returns 3 variants (safe=base, creative=pushed, alternative=restructured).
      // We show Base + Pushed on the desktop artboard via the carousel.
      const desktopArtboard = artboards.find((a) => a.breakpoint === "desktop");
      const pushedVariant = variants.find(
        (v: { strategy?: string }) => v.strategy === "creative"
      );

      if (
        desktopArtboard &&
        pushedVariant?.pageTree &&
        chosenVariant.pageTreeSource !== "template"
      ) {
        const isDesignNodeTree = chosenVariant.pageTree?.type === "frame";
        if (isDesignNodeTree) {
          dispatch({
            type: "SET_VARIANT_PREVIEW",
            itemId: desktopArtboard.id,
            variants: [
              {
                tree: chosenVariant.pageTree as import("@/lib/canvas/design-node").DesignNode,
                label: "Base",
                changesSummary: "Faithful to your taste and references.",
              },
              {
                tree: pushedVariant.pageTree as import("@/lib/canvas/design-node").DesignNode,
                label: "Pushed",
                changesSummary: "Bolder interpretation — heavier weights, more contrast, tighter spacing.",
              },
            ],
          });
        }
      }

      // Detect template fallback vs AI success
      const isTemplateFallback = chosenVariant.pageTreeSource === "template";
      dispatch({
        type: "SET_PROMPT_STATUS",
        generationResult: isTemplateFallback ? "template-fallback" : "success",
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Generation failed";
      setError(errMsg);
      // Detect credit exhaustion by error message pattern
      const isCreditExhaustion = errMsg.toLowerCase().includes("credit") || errMsg.toLowerCase().includes("quota");
      dispatch({
        type: "SET_PROMPT_STATUS",
        generationResult: isCreditExhaustion ? "credit-exhaustion" : "error",
      });
    } finally {
      dispatch({
        type: "SET_PROMPT_STATUS",
        isGenerating: false,
        agentSteps: [],
      });
    }
  }, [dispatch, projectId, projectTokens, tasteProfile, fidelityMode, prompt.siteType, prompt.value, referenceItems, weightedReferenceItems, selection.selectedNodeId, selectedSection, items, state.generatedTreeSnapshot]);

  // Expose handleGenerate to parent via ref for retry wiring
  React.useEffect(() => {
    if (retryRef) retryRef.current = handleGenerate;
    return () => { if (retryRef) retryRef.current = null; };
  }, [retryRef, handleGenerate]);

  // ── Vary: re-trigger generation when varySignal increments ──────────

  const varySignalRef = React.useRef(varySignal);
  React.useEffect(() => {
    if (varySignal > 0 && varySignal !== varySignalRef.current) {
      varySignalRef.current = varySignal;
      handleGenerate();
    }
  }, [varySignal, handleGenerate]);

  // ── Restore from history ───────────────────────────────────────────

  const handleRestore = React.useCallback(
    (run: PromptRun) => {
      if (run.artboards?.length) {
        const nonArtboards = items.filter((item) => item.kind !== "artboard");
        dispatch({
          type: "RESTORE_SITE",
          artboards: createArtboardItemsFromSnapshot(run.siteId, run.artboards, nonArtboards),
        });
      } else {
        const existingArtboards = items.filter(
          (item): item is ArtboardItem =>
            item.kind === "artboard" && item.siteId === run.siteId
        );

        if (existingArtboards.length > 0) {
          dispatch({ type: "RESTORE_SITE", artboards: existingArtboards });
        }
      }
    },
    [items, dispatch]
  );

  // ── Textarea auto-grow ─────────────────────────────────────────────

  const adjustTextareaHeight = React.useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const lineHeight = 20;
    const maxHeight = lineHeight * 4; // max 4 rows
    el.style.height = Math.min(el.scrollHeight, maxHeight) + "px";
  }, [textareaRef]);

  React.useEffect(() => {
    adjustTextareaHeight();
  }, [prompt.value, adjustTextareaHeight]);

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Taste Feedback Dialog */}
      {showTasteFeedback && state.pendingTasteEdits && state.pendingTasteEdits.length > 0 && (
        <TasteFeedbackDialog
          edits={state.pendingTasteEdits}
          onApplyAll={() => {
            applyTasteOverrides(state.pendingTasteEdits!);
            setShowTasteFeedback(false);
            skipTasteCheckRef.current = true;
            handleGenerate();
          }}
          onSkip={() => {
            setShowTasteFeedback(false);
            dispatch({ type: "SET_PENDING_TASTE_EDITS", edits: [] });
            skipTasteCheckRef.current = true;
            handleGenerate();
          }}
          onDismiss={() => {
            setShowTasteFeedback(false);
          }}
        />
      )}

      {/* Header */}
      <div className="shrink-0 px-3 pt-3 pb-1">
        <span className="font-mono text-[10px] uppercase tracking-[1px] text-[#A0A0A0] dark:text-[#666666]">
          Prompt
        </span>
      </div>

      {/* Section regeneration indicator */}
      {selectedSection && (
        <div
          className="shrink-0"
          style={{
            padding: "6px 12px",
            fontSize: 11,
            fontFamily: "var(--font-geist-mono)",
            color: "#4B57DB",
            borderBottom: "1px solid rgba(75, 87, 219, 0.2)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <RefreshCw size={12} strokeWidth={1.5} />
          Regenerating: {selectedSection.name}
        </div>
      )}

      {/* Scrollable area: history + chips */}
      <div className="flex-1 overflow-y-auto px-3 min-h-0">
        {/* Taste Intelligence surfaces — scroll with content */}
        <div className="-mx-3">
          <LaunchLoopStrip />
          <div className="border-b border-[#E5E5E0] dark:border-[#333333]">
            <TasteCard
              tasteProfile={tasteProfile}
              fidelityMode={fidelityMode}
              onFidelityChange={handleFidelityChange}
              onRefresh={handleRefreshTaste}
              isRefreshing={isRefreshingTaste}
              refreshError={refreshError}
              hasReferences={usableRefCount > 0}
            />
          </div>
          <div className="border-b border-[#E5E5E0] dark:border-[#333333]">
            <ReferenceRail references={referenceItems} />
          </div>
        </div>

        {selectedSection && (
          <div className="my-2 rounded-[4px] border border-[#D1E4FC] bg-[#F7FAFF] p-2 dark:border-[#29336F] dark:bg-[#171B2E]">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[1px] text-[#4B57DB] dark:text-[#91A0FF]">
                Section regen
              </span>
              <span className="truncate text-[10px] text-[#6B6B6B] dark:text-[#A0A0A0]">
                {selectedSection.name}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {SECTION_REGEN_MODES.map((mode) => (
                <button
                  key={mode.label}
                  type="button"
                  onClick={() => dispatch({ type: "SET_PROMPT", value: mode.prompt })}
                  className="rounded-[3px] bg-white px-2 py-1.5 text-left text-[11px] text-[#1A1A1A] shadow-sm transition-colors hover:bg-[#EEF4FF] dark:bg-[#222222] dark:text-[#D0D0D0] dark:hover:bg-[#2A2F4D]"
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Prompt history */}
        {prompt.history.length > 0 && (
          <div className="space-y-1 mb-3">
            {prompt.history.map((run) => (
              <div
                key={run.id}
                className="rounded-[2px] px-2 py-1.5 hover:bg-[#F5F5F0] transition-colors dark:hover:bg-[#2A2A2A]"
              >
                <div className="text-[12px] text-[#1A1A1A] truncate dark:text-[#D0D0D0]">
                  &ldquo;{run.label}&rdquo;
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[10px] text-[#A0A0A0] font-mono dark:text-[#666666]">
                    {run.referenceItemIds.length} ref{run.referenceItemIds.length !== 1 ? "s" : ""} · {relativeTime(run.createdAt)}
                  </span>
                  <button
                    onClick={() => handleRestore(run)}
                    className="text-[11px] text-[#4B57DB] hover:underline"
                  >
                    Restore
                  </button>
                </div>
              </div>
            ))}
            <div ref={historyEndRef} />
          </div>
        )}

        {/* Suggestion chips */}
        <div className="flex flex-wrap gap-1.5 py-2">
          {chips.map((chip) => (
            <button
              key={chip}
              onClick={() => dispatch({ type: "SET_PROMPT", value: chip })}
              className="bg-[#F5F5F0] text-[#6B6B6B] rounded-[4px] px-2.5 py-1 text-[11px] hover:bg-[#E5E5E0] hover:text-[#1A1A1A] cursor-pointer transition-colors dark:bg-[#222222] dark:text-[#D0D0D0] dark:hover:bg-[#333333] dark:hover:text-[#FFFFFF]"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Context row: refs + site type */}
        <div className="flex items-center gap-2 py-1">
          <span className="text-[10px] text-[#A0A0A0] dark:text-[#666666]">{refSummary}</span>
          <select
            value={prompt.siteType}
            onChange={(e) => dispatch({ type: "SET_SITE_TYPE", siteType: e.target.value as SiteType })}
            className="ml-auto rounded-[2px] border border-[#E5E5E0] bg-white px-1.5 py-0.5 text-[10px] text-[#6B6B6B] outline-none focus:border-[#D1E4FC] dark:bg-[#2A2A2A] dark:border-[#333333] dark:text-[#D0D0D0]"
          >
            {SITE_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Error */}
        {error && (
          <div className="text-[11px] text-red-500 py-1">{error}</div>
        )}
      </div>

      {/* Input area (pinned to bottom) */}
      <div className="shrink-0 px-3 pb-3 pt-2">
        <div className="relative">
          <textarea
            ref={textareaRef}
            id="prompt-textarea"
            value={prompt.value}
            onChange={(e) => {
              dispatch({ type: "SET_PROMPT", value: e.target.value });
            }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!isGenerating) {
                    handleGenerate();
                  }
                }
              }}
            placeholder="What would you like to change?"
            rows={1}
            disabled={isGenerating}
            className="w-full border border-[#E5E5E0] rounded-[4px] bg-white px-3 py-2 pr-9 text-[13px] resize-none outline-none transition-colors focus:border-[#D1E4FC] focus:ring-2 focus:ring-[#D1E4FC]/40 disabled:cursor-wait disabled:opacity-60 dark:bg-[#2A2A2A] dark:border-[#333333] dark:text-[#FFFFFF]"
          />
          <GenerateButtonWithHint
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.value.trim()}
          />
        </div>
        {isGenerating && (
          <div className="py-2">
            <span style={{ fontSize: 11, color: "#A0A0A0" }}>
              {getGenerationStageLabel(getGenerationStage(agentSteps))}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
