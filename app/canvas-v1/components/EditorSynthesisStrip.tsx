"use client";

/**
 * Studio OS pipeline affordance — references → taste → synthesis → output.
 * Compact, editor-native strip above the prompt composer (not a chat header).
 */

import * as React from "react";
import { ArrowRight, BookOpen, Sparkles, Palette, Box } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvas } from "@/lib/canvas/canvas-context";
import { getProjectState } from "@/lib/project-store";

type StepId = "refs" | "taste" | "synthesis" | "output";

function Step({
  active,
  done,
  label,
  icon: Icon,
}: {
  active: boolean;
  done: boolean;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center gap-1 px-0.5",
        active && "text-[var(--accent)]"
      )}
    >
      <div
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-[4px] border-[0.5px] transition-colors",
          done || active
            ? "border-[var(--accent)]/35 bg-[var(--accent)]/10 text-[var(--accent)]"
            : "border-[var(--border-subtle)] text-[var(--text-muted)]"
        )}
      >
        <Icon size={14} strokeWidth={1.5} className="shrink-0" />
      </div>
      <span
        className={cn(
          "w-full truncate text-center font-mono text-[8px] uppercase tracking-[0.08em]",
          active ? "text-[var(--text-primary)] font-medium" : "text-[var(--text-muted)]"
        )}
      >
        {label}
      </span>
    </div>
  );
}

type EditorSynthesisStripProps = {
  projectId: string;
  /** When user clicks “Refine with taste” on a section selection */
  onRefineWithTaste?: (prefill: string) => void;
};

export function EditorSynthesisStrip({ projectId, onRefineWithTaste }: EditorSynthesisStripProps) {
  const { state, dispatch } = useCanvas();
  const refCount = React.useMemo(
    () => state.items.filter((i) => i.kind === "reference").length,
    [state.items]
  );
  const tasteProfile = React.useMemo(() => {
    if (!projectId) return null;
    return getProjectState(projectId).canvas?.tasteProfile ?? null;
  }, [projectId, state.items, state.prompt.isGenerating]);

  const hasTaste = Boolean(tasteProfile?.summary?.trim());
  const isGenerating = state.prompt.isGenerating;

  const activeStep: StepId = React.useMemo(() => {
    if (isGenerating) return "synthesis";
    if (refCount === 0) return "refs";
    if (!hasTaste) return "taste";
    return "output";
  }, [refCount, hasTaste, isGenerating]);

  const selectedSection = React.useMemo(() => {
    const { activeItemId, selectedNodeId } = state.selection;
    if (!activeItemId || !selectedNodeId) return null;
    const item = state.items.find((i) => i.id === activeItemId);
    if (!item || item.kind !== "artboard") return null;
    return { itemId: item.id, nodeId: selectedNodeId };
  }, [state.items, state.selection]);

  const handleRefine = () => {
    if (!selectedSection || !onRefineWithTaste) return;
    const prefill =
      "Refine the selected section to align tighter with starred references and the taste brief — hierarchy, spacing, and distinctive tone. Preserve structure.";
    dispatch({ type: "SELECT_ITEM", itemId: selectedSection.itemId });
    onRefineWithTaste(prefill);
  };

  return (
    <div className="shrink-0 border-b-[0.5px] border-[var(--border-subtle)] bg-[var(--card-bg)] px-2 py-2.5">
      <div className="mb-2 flex items-center gap-1.5 px-0.5">
        <Sparkles size={12} strokeWidth={1.5} className="shrink-0 text-[var(--accent)]" />
        <span className="font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-[var(--section-label)]">
          Taste loop
        </span>
      </div>
      <div className="flex items-start justify-between gap-0.5">
        <Step
          active={activeStep === "refs"}
          done={refCount > 0}
          label="Refs"
          icon={BookOpen}
        />
        <ArrowRight size={12} strokeWidth={1.5} className="mt-2 shrink-0 text-[var(--text-muted)] opacity-70" />
        <Step
          active={activeStep === "taste"}
          done={hasTaste}
          label="Taste"
          icon={Palette}
        />
        <ArrowRight size={12} strokeWidth={1.5} className="mt-2 shrink-0 text-[var(--text-muted)] opacity-70" />
        <Step
          active={activeStep === "synthesis"}
          done={!isGenerating && refCount > 0 && hasTaste}
          label="Synth"
          icon={Sparkles}
        />
        <ArrowRight size={12} strokeWidth={1.5} className="mt-2 shrink-0 text-[var(--text-muted)] opacity-70" />
        <Step
          active={activeStep === "output"}
          done={state.items.some((i) => i.kind === "artboard")}
          label="Output"
          icon={Box}
        />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 px-0.5">
        <p className="min-w-0 flex-1 text-[10px] leading-snug text-[var(--text-muted)]">
          {refCount === 0
            ? "Drop references to anchor synthesis."
            : !hasTaste
              ? "Generate once to compile taste, then iterate."
              : isGenerating
                ? "Synthesis running — directives + layout pass."
                : `${refCount} ref${refCount === 1 ? "" : "s"} · taste active · ready to ship iterations.`}
        </p>
        {selectedSection && onRefineWithTaste && (
          <button
            type="button"
            onClick={handleRefine}
            className="shrink-0 rounded-[4px] border-[0.5px] border-[var(--accent)]/40 bg-[var(--accent)]/10 px-2 py-1 font-mono text-[8px] font-medium uppercase tracking-[0.06em] text-[var(--accent)] transition-colors hover:bg-[var(--accent)]/18"
          >
            Refine w/ taste
          </button>
        )}
      </div>
    </div>
  );
}
