"use client";

import * as React from "react";
import { Layers, MessageSquareText, ImageIcon, Monitor, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvas } from "@/lib/canvas/canvas-context";
import { findNodeById, isDesignNodeTree } from "@/lib/canvas/compose";
import { findDesignNodeById } from "@/lib/canvas/design-node";
import type { DesignNode } from "@/lib/canvas/design-node";
import type { PageNode } from "@/lib/canvas/compose";
import type { ArtboardItem, FrameItem, ReferenceItem, TextItem } from "@/lib/canvas/unified-canvas-state";
import { canvasItemToDesignNode } from "@/lib/canvas/canvas-item-conversion";
import { LayersPanelV3 } from "./LayersPanelV3";
import { PromptComposerV2 } from "./PromptComposerV2";
import { EditorSynthesisStrip } from "./EditorSynthesisStrip";

export type EditorLeftTabId = "layers" | "prompt" | "sources";

type EditorLeftPanelProps = {
  projectId: string;
  activeTab: EditorLeftTabId;
  onTabChange: (tab: EditorLeftTabId) => void;
  promptTextareaRef: React.RefObject<HTMLTextAreaElement | null>;
  promptVarySignal: number;
  promptRetryRef: React.MutableRefObject<(() => void) | null>;
  onRefineWithTastePrefill: (prefill: string) => void;
};

function usePromptSelectedNode(): DesignNode | PageNode | null {
  const { state } = useCanvas();
  const { selection, items } = state;
  const selectedIds = selection.selectedItemIds ?? [];

  const singleSelected = React.useMemo(() => {
    const selected = items.filter((item) => selectedIds.includes(item.id));
    return selected.length === 1 ? selected[0] : null;
  }, [items, selectedIds]);

  const activeArtboard: ArtboardItem | null = React.useMemo(() => {
    if (singleSelected?.kind === "artboard") return singleSelected as ArtboardItem;
    if (singleSelected?.kind === "frame" || singleSelected?.kind === "text") {
      const item = singleSelected as FrameItem | TextItem;
      const designNode = canvasItemToDesignNode(item);
      return {
        id: item.id,
        kind: "artboard" as const,
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height,
        zIndex: item.zIndex,
        locked: item.locked,
        siteId: item.id,
        breakpoint: "desktop" as const,
        name: item.name,
        pageTree: designNode,
        compiledCode: null,
      } as ArtboardItem;
    }
    return null;
  }, [singleSelected]);

  const isV6Tree = activeArtboard ? isDesignNodeTree(activeArtboard.pageTree) : false;

  const selectedNode: PageNode | null =
    activeArtboard && selection.selectedNodeId && !isV6Tree
      ? findNodeById(activeArtboard.pageTree as PageNode, selection.selectedNodeId)
      : null;

  const selectedDesignNode: DesignNode | null =
    activeArtboard && selection.selectedNodeId && isV6Tree
      ? findDesignNodeById(activeArtboard.pageTree as unknown as DesignNode, selection.selectedNodeId)
      : null;

  return selectedNode ?? selectedDesignNode;
}

function LeftTabButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={cn(
        "flex size-9 items-center justify-center rounded-[6px] transition-colors 2xl:size-10",
        active
          ? "bg-[var(--accent)]/15 text-[var(--accent)]"
          : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-secondary)]"
      )}
    >
      {children}
    </button>
  );
}

function SourcesTab() {
  const { state, dispatch } = useCanvas();
  const refs = state.items.filter((i): i is ReferenceItem => i.kind === "reference");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b-[0.5px] border-[var(--border-subtle)] px-3 py-2.5">
        <p className="font-mono text-[9px] font-medium uppercase tracking-[0.1em] text-[var(--section-label)]">
          Sources
        </p>
        <p className="mt-1 text-[11px] leading-snug text-[var(--text-muted)]">
          References on the canvas. Star items in the inspector to weight taste extraction.
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {refs.length === 0 ? (
          <p className="px-2 py-6 text-center text-[12px] text-[var(--text-muted)]">
            No references yet — drop images onto the canvas.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {refs.map((r) => {
              const selected = state.selection.selectedItemIds.includes(r.id);
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => dispatch({ type: "SELECT_ITEM", itemId: r.id })}
                  className={cn(
                    "group relative aspect-square overflow-hidden rounded-[4px] border-[0.5px] transition-colors",
                    selected
                      ? "border-[var(--accent)] ring-1 ring-[var(--accent)]/30"
                      : "border-[var(--border-subtle)] hover:border-[var(--border-hover)]"
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={r.imageUrl}
                    alt={r.title || "Reference"}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-1.5 py-1">
                    <span className="line-clamp-2 text-left text-[9px] font-medium text-white/95">
                      {r.title || "Untitled"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function EditorLeftPanel({
  projectId,
  activeTab,
  onTabChange,
  promptTextareaRef,
  promptVarySignal,
  promptRetryRef,
  onRefineWithTastePrefill,
}: EditorLeftPanelProps) {
  const { state, dispatch } = useCanvas();
  const activeBreakpoint = state.activeBreakpoint ?? "desktop";
  const selectedNode = usePromptSelectedNode();

  return (
    <div className="editor-left-panel relative z-20 flex h-full min-h-0 w-[248px] min-w-[248px] max-w-[248px] shrink-0 border-r-[0.5px] border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] 2xl:w-[292px] 2xl:min-w-[292px] 2xl:max-w-[292px]">
      {/* Icon rail */}
      <nav
        className="flex w-10 shrink-0 flex-col items-center gap-1 border-r-[0.5px] border-[var(--sidebar-border)] py-2 2xl:w-11"
        aria-label="Editor modes"
      >
        <LeftTabButton
          active={activeTab === "layers"}
          onClick={() => onTabChange("layers")}
          title="Layers"
        >
          <Layers size={18} strokeWidth={1.5} />
        </LeftTabButton>
        <LeftTabButton
          active={activeTab === "prompt"}
          onClick={() => onTabChange("prompt")}
          title="Prompt — direction & generation"
        >
          <MessageSquareText size={18} strokeWidth={1.5} />
        </LeftTabButton>
        <LeftTabButton
          active={activeTab === "sources"}
          onClick={() => onTabChange("sources")}
          title="Sources — reference thumbnails"
        >
          <ImageIcon size={18} strokeWidth={1.5} />
        </LeftTabButton>
      </nav>

      {/* Mode content */}
      <div className="editor-left-panel-content flex min-w-0 flex-1 flex-col">
        {activeTab === "layers" && (
          <>
            <div className="flex shrink-0 items-center justify-between gap-2 border-b-[0.5px] border-[var(--border-subtle)] px-3 py-2">
              <span className="font-mono text-[9px] font-medium uppercase tracking-[0.1em] text-[var(--section-label)]">
                Layers
              </span>
              <div className="flex h-[22px] overflow-hidden rounded-[2px] border border-[var(--border-control)]">
                <button
                  type="button"
                  title="Desktop"
                  onClick={() => dispatch({ type: "SET_ACTIVE_BREAKPOINT", breakpoint: "desktop" })}
                  className={cn(
                    "flex w-7 items-center justify-center transition-colors",
                    activeBreakpoint === "desktop"
                      ? "bg-[var(--accent)]/18 text-[var(--accent)]"
                      : "bg-[var(--card-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <Monitor size={12} strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  title="Mobile"
                  onClick={() => dispatch({ type: "SET_ACTIVE_BREAKPOINT", breakpoint: "mobile" })}
                  className={cn(
                    "flex w-7 items-center justify-center border-l border-[var(--border-control)] transition-colors",
                    activeBreakpoint === "mobile"
                      ? "bg-[var(--accent)]/18 text-[var(--accent)]"
                      : "bg-[var(--card-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <Smartphone size={12} strokeWidth={1.5} />
                </button>
              </div>
            </div>
            <LayersPanelV3 projectId={projectId} embedded />
          </>
        )}

        {activeTab === "prompt" && (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex shrink-0 items-center justify-between border-b-[0.5px] border-[var(--border-subtle)] px-3 py-2">
              <div>
                <span className="font-mono text-[9px] font-medium uppercase tracking-[0.1em] text-[var(--section-label)]">
                  Direction
                </span>
                <p className="text-[10px] text-[var(--text-muted)]">Critique, regen, site synthesis</p>
              </div>
            </div>
            <EditorSynthesisStrip
              projectId={projectId}
              onRefineWithTaste={onRefineWithTastePrefill}
            />
            <div className="min-h-0 flex-1 overflow-hidden">
              <PromptComposerV2
                textareaRef={promptTextareaRef}
                selectedNode={selectedNode}
                projectId={projectId}
                varySignal={promptVarySignal}
                retryRef={promptRetryRef}
              />
            </div>
          </div>
        )}

        {activeTab === "sources" && <SourcesTab />}
      </div>
    </div>
  );
}
