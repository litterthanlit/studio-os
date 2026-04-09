"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useCanvas } from "@/lib/canvas/canvas-context";
import { ComposeDocumentView, exitAnyActiveTextEditing } from "./ComposeDocumentView";
import { ComposeDocumentViewV6, exitAnyActiveTextEditingV6 } from "./ComposeDocumentViewV6";
import { BREAKPOINT_WIDTHS, findNodeById, isDesignNodeTree } from "@/lib/canvas/compose";
import type { ArtboardItem, GenerationResult } from "@/lib/canvas/unified-canvas-state";
import type { DesignNode } from "@/lib/canvas/design-node";
import { getGenerationStage } from "@/lib/canvas/unified-canvas-state";
import type { DesignSystemTokens } from "@/lib/canvas/generate-system";
import { GenerationAnimation } from "./GenerationAnimation";
import { VariantCarousel } from "./VariantCarousel";

type CanvasArtboardProps = {
  item: ArtboardItem;
  tokens: DesignSystemTokens | null;
  /** Editor tool: select | hand | marquee | frame | text | prompt */
  activeTool?: string;
  isDragging?: boolean;
  isGenerating?: boolean;
  agentSteps?: string[];
  generationResult?: GenerationResult;
  onPointerDown?: (e: React.PointerEvent, itemId: string, x: number, y: number) => void;
  onOpenSectionLibrary?: (insertAtIndex: number) => void;
  /** V6: opens slide-over component library from insertion “Browse all”. */
  onOpenComponentGallery?: () => void;
  onFocusPromptWithPrefill?: (prefill: string) => void;
  onRetry?: () => void;
};

export function CanvasArtboard({ item, tokens, activeTool = "select", isDragging, isGenerating, agentSteps, generationResult, onPointerDown, onOpenSectionLibrary, onOpenComponentGallery, onFocusPromptWithPrefill, onRetry }: CanvasArtboardProps) {
  const { state, dispatch } = useCanvas();
  const isSelected = state.selection.selectedItemIds.includes(item.id);
  const isActiveArtboard = state.selection.activeItemId === item.id;

  // Variant preview: if this artboard is showing variants, display the active variant tree
  const variantPreview = state.variantPreview?.itemId === item.id ? state.variantPreview : null;
  const displayTree = variantPreview
    ? (variantPreview.variants[variantPreview.activeIndex]?.tree ?? item.pageTree)
    : item.pageTree;

  /** V6 renderer is driven by tree shape, not tokens — sample / pre-analysis projects have DesignNode trees but null tokens. */
  const usesV6Renderer = isDesignNodeTree(displayTree);
  const rendererMode = usesV6Renderer ? "v6" : tokens ? "legacy" : "no-tokens";

  const breakpointWidth = BREAKPOINT_WIDTHS[item.breakpoint];
  const label = `${item.breakpoint.toUpperCase()} · ${breakpointWidth}PX`;
  const isDesktop = item.breakpoint === "desktop";

  // ── Handoff sequence state ─────────────────────────────────────────
  // Tracks the transition from animation → real content
  const [handoffState, setHandoffState] = React.useState<
    "idle" | "animating" | "collapsing" | "revealing" | "normalizing"
  >("idle");
  const [contentOpacity, setContentOpacity] = React.useState(1);
  const [warmBg, setWarmBg] = React.useState(false);
  const prevIsGeneratingRef = React.useRef(isGenerating);
  const isTemplateFallback = generationResult === "template-fallback";

  React.useEffect(() => {
    // #region agent log
    fetch("http://127.0.0.1:7393/ingest/391248b0-24d6-418e-a9f6-e5cbe0f87918", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "f3006b" },
      body: JSON.stringify({
        sessionId: "f3006b",
        id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        hypothesisId: "H11-artboard-renderer",
        runId: "initial-pass",
        location: "CanvasArtboard:mount",
        message: "artboard mounted",
        data: {
          itemId: item.id,
          rendererMode,
          usesV6Renderer,
          hasTokens: Boolean(tokens),
          breakpoint: item.breakpoint,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Detect isGenerating flipping from true→false (generation complete)
  React.useEffect(() => {
    const wasGenerating = prevIsGeneratingRef.current;
    prevIsGeneratingRef.current = isGenerating;

    if (wasGenerating && !isGenerating && (generationResult === "success" || isTemplateFallback)) {
      // Start handoff: animation is still showing, begin collapse phase
      setHandoffState("collapsing");
      setContentOpacity(0);
      setWarmBg(true);
    }
  }, [isGenerating, generationResult, isTemplateFallback]);

  // Handle handoff complete callback from GenerationAnimation
  const handleHandoffComplete = React.useCallback(() => {
    // Animation collapsed + cleared. Now reveal the real content.
    setHandoffState("revealing");
    // Trigger content fade-in on next frame
    requestAnimationFrame(() => {
      setContentOpacity(1);
      // After content reveal (400ms), normalize background
      setTimeout(() => {
        setHandoffState("normalizing");
        setWarmBg(false);
        // After background normalizes (150ms), done
        setTimeout(() => {
          setHandoffState("idle");
        }, 150);
      }, 400);
    });
  }, []);

  // Reset handoff state when generation starts
  React.useEffect(() => {
    if (isGenerating) {
      setHandoffState("animating");
      setContentOpacity(1);
      setWarmBg(false);
    }
  }, [isGenerating]);

  const handleNodeSelect = React.useCallback(
    (nodeId: string | null) => {
      if (nodeId) {
        dispatch({ type: "SELECT_NODE", itemId: item.id, nodeId });
      } else {
        dispatch({ type: "SELECT_ITEM", itemId: item.id });
      }
    },
    [dispatch, item.id]
  );

  const handleSectionReorder = React.useCallback(
    (nodeId: string, newIndex: number) => {
      dispatch({
        type: "REORDER_NODE",
        itemId: item.id,
        nodeId,
        newIndex,
      });
    },
    [dispatch, item.id]
  );

  const handleNodeContentUpdate = React.useCallback(
    (nodeId: string, key: string, value: string) => {
      if (key === "text") {
        dispatch({
          type: "UPDATE_TEXT_CONTENT_SITE",
          itemId: item.id,
          nodeId,
          text: value,
        });
        return;
      }

      dispatch({
        type: "UPDATE_NODE",
        itemId: item.id,
        nodeId,
        changes: {
          content: {
            ...(findNodeById(item.pageTree, nodeId)?.content ?? {}),
            [key]: value,
          },
        },
      });
    },
    [dispatch, item.id, item.pageTree]
  );

  const handleNodeStyleUpdate = React.useCallback(
    (nodeId: string, style: Record<string, unknown>) => {
      dispatch({
        type: "UPDATE_NODE_STYLE",
        itemId: item.id,
        nodeId,
        style: style as import("@/lib/canvas/compose").PageNodeStyle,
      });
    },
    [dispatch, item.id]
  );

  const handleInsertSectionV6 = React.useCallback(
    (index: number, section: DesignNode, parentNodeId?: string | null) => {
      // #region agent log
      fetch("http://127.0.0.1:7393/ingest/391248b0-24d6-418e-a9f6-e5cbe0f87918", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "f3006b" },
        body: JSON.stringify({
          sessionId: "f3006b",
          id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          hypothesisId: "H3-insert-dispatch",
          runId: "initial-pass",
          location: "CanvasArtboard:handleInsertSectionV6",
          message: "dispatching INSERT_SECTION from artboard",
          data: {
            itemId: item.id,
            index,
            parentNodeId: parentNodeId ?? null,
            sectionId: section.id,
            sectionType: section.type,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      dispatch({
        type: "INSERT_SECTION",
        itemId: item.id,
        index,
        section,
        parentNodeId: parentNodeId ?? undefined,
      });
    },
    [dispatch, item.id]
  );

  const handleReplaceNodeImage = React.useCallback(
    (nodeId: string, file: File) => {
      const reader = new FileReader();

      reader.onload = () => {
        const mediaUrl = typeof reader.result === "string" ? reader.result : null;
        if (!mediaUrl) return;
        const syncedArtboardIds = state.items
          .filter(
            (canvasItem): canvasItem is ArtboardItem =>
              canvasItem.kind === "artboard" && canvasItem.siteId === item.siteId
          )
          .map((canvasItem) => canvasItem.id);

        dispatch({ type: "PUSH_HISTORY", description: "Replaced image" });
        syncedArtboardIds.forEach((itemId) => {
          dispatch({
            type: "UPDATE_NODE",
            itemId,
            nodeId,
            changes: {
              content: {
                ...(findNodeById(item.pageTree, nodeId)?.content ?? {}),
                mediaUrl,
                mediaAlt: file.name || "Uploaded image",
              },
            },
          });
        });
      };

      reader.readAsDataURL(file);
    },
    [dispatch, item.pageTree, item.siteId, state.items]
  );

  return (
    <div
      data-canvas-item-id={item.id}
      className={cn("absolute", isDragging && "shadow-md")}
      style={{
        left: item.x,
        top: item.y,
        width: breakpointWidth,
        zIndex: item.zIndex,
      }}
      onPointerDown={(e) => {
        // When frame/text draw tool is active, don't start artboard drag —
        // let the event bubble to V6's mergedPointerDown handler instead.
        if (activeTool === "frame" || activeTool === "text") return;
        onPointerDown?.(e, item.id, item.x, item.y);
      }}
    >
      {/* Artboard header */}
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[1px] text-[var(--text-muted)] relative">
        {label}
        {/* Variant carousel — floats above the artboard header */}
        {variantPreview && <VariantCarousel itemId={item.id} />}
      </div>

      {/* Artboard body */}
      <div
        className={cn(
          "canvas-artboard relative",
          isDesktop ? "border-t-2 border-t-[#4B57DB]" : "border-t border-t-[var(--border-primary)]",
          isSelected && "outline outline-1 outline-[#4B57DB]",
          isActiveArtboard && "editing",
          // Template fallback: persistent amber border
          isTemplateFallback && !isGenerating && "outline outline-2 outline-[#F59E0B]"
        )}
        style={{
          background: warmBg ? "#F5F5F4" : "#FFFFFF",
          transition: handoffState === "normalizing" ? "background 150ms ease" : "none",
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (!(e.target as HTMLElement).closest("[data-node-id]")) {
            exitAnyActiveTextEditing();
            exitAnyActiveTextEditingV6();
            dispatch({ type: "SELECT_ITEM", itemId: item.id });
          }
        }}
      >
        {/* Template fallback badge */}
        {isTemplateFallback && !isGenerating && (
          <div
            className="absolute top-0 left-0 z-10 px-1.5 py-0.5"
            style={{
              background: "#F59E0B",
              fontSize: 10,
              fontFamily: "var(--font-geist-sans), sans-serif",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "#FFFFFF",
              borderRadius: 4,
            }}
          >
            TEMPLATE
          </div>
        )}

        {/* Click-intercepting overlay for point-and-edit selection */}
        <div
          className="relative"
          onClickCapture={(e) => {
            const target = e.target as HTMLElement;
            const link = target.closest("a");
            const button = target.closest("button");
            if (link || button) {
              e.preventDefault();
            }
          }}
        >
          {/* Show animation during generation or during handoff collapse */}
          {(isGenerating || handoffState === "collapsing") ? (
            <GenerationAnimation
              stage={isGenerating ? getGenerationStage(agentSteps ?? []) : "building"}
              width={breakpointWidth}
              height={400}
              generationResult={generationResult}
              onHandoffComplete={handleHandoffComplete}
              onRetry={onRetry}
            />
          ) : (
            <div
              style={{
                opacity: contentOpacity,
                transition: handoffState === "revealing"
                  ? "opacity 400ms ease-out"
                  : "none",
              }}
            >
              {isDesignNodeTree(displayTree) ? (
                <ComposeDocumentViewV6
                  tree={displayTree as import("@/lib/canvas/design-node").DesignNode}
                  components={state.components}
                  masterEditDirty={Boolean(state.masterEditSession?.dirty)}
                  selectedNodeId={isActiveArtboard && !variantPreview ? state.selection.selectedNodeId : null}
                  selectedNodeIds={isActiveArtboard && !variantPreview ? state.selection.selectedNodeIds : []}
                  onSelectNode={variantPreview ? () => {} : handleNodeSelect}
                  onToggleNodeSelection={(nodeId) => {
                    if (variantPreview) return;
                    dispatch({ type: "TOGGLE_NODE_SELECTION", itemId: item.id, nodeId });
                  }}
                  onSetSelectedNodes={(nodeIds) => {
                    if (variantPreview) return;
                    dispatch({ type: "SET_SELECTED_NODES", itemId: item.id, nodeIds });
                  }}
                  onUpdateContent={variantPreview ? () => {} : handleNodeContentUpdate}
                  onUpdateNodeStyle={variantPreview ? () => {} : handleNodeStyleUpdate}
                  onPushHistory={(desc) => dispatch({ type: "PUSH_HISTORY", description: desc })}
                  itemId={item.id}
                  zoom={state.viewport.zoom}
                  canvasTool={variantPreview ? "select" : activeTool}
                  onInsertSection={variantPreview ? () => {} : handleInsertSectionV6}
                  onOpenGallery={variantPreview ? undefined : onOpenComponentGallery}
                  interactive={!variantPreview}
                />
              ) : tokens ? (
                <ComposeDocumentView
                  pageTree={displayTree}
                  tokens={tokens}
                  breakpoint={item.breakpoint}
                  selectedNodeId={isActiveArtboard && !variantPreview ? state.selection.selectedNodeId : null}
                  onSelectNode={variantPreview ? () => {} : handleNodeSelect}
                  onUpdateContent={variantPreview ? () => {} : handleNodeContentUpdate}
                  onReorderSection={variantPreview ? () => {} : handleSectionReorder}
                  onOpenSectionLibrary={variantPreview ? undefined : onOpenSectionLibrary}
                  onFocusPromptWithPrefill={variantPreview ? undefined : onFocusPromptWithPrefill}
                  onReplaceImage={variantPreview ? undefined : handleReplaceNodeImage}
                  interactive={!variantPreview}
                />
              ) : (
                <div
                  className="flex items-center justify-center bg-[#F5F5F0] text-[13px] text-[#A0A0A0]"
                  style={{ width: breakpointWidth, minHeight: 400 }}
                >
                  No design tokens available
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
