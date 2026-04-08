"use client";

/**
 * V3 Inspector Panel — tabbed right rail (Design | CSS | Export).
 *
 * Prompt composition lives in FloatingPromptPanel (Prompt tool), not in this rail.
 * Layout chain: panel (absolute, flex-col) -> header (shrink-0) -> tabs (shrink-0)
 * -> content (flex-1 min-h-0 overflow).
 */

import * as React from "react";
import {
  ArrowRight,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  ArrowDownUp,
} from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useCanvas } from "@/lib/canvas/canvas-context";
import { findNodeById, getNodeStyle, BREAKPOINT_WIDTHS, isDesignNodeTree } from "@/lib/canvas/compose";
import { findDesignNodeById } from "@/lib/canvas/design-node";
import type { DesignNode } from "@/lib/canvas/design-node";
import { DesignNodeInspector } from "./inspector/DesignNodeInspector";
import { SITE_TYPE_OPTIONS } from "@/lib/canvas/templates";
import { getProjectState, getProjectById, upsertProjectState } from "@/lib/project-store";
import {
  InspectorSection,
  InspectorLabel,
  InspectorTextInput,
  InspectorTextarea,
  InspectorNumberInput,
  InspectorSelect,
  InspectorColorField,
  InspectorRow,
  InspectorDivider,
} from "./inspector/InspectorField";
import { SpacingDiagram } from "./inspector/SpacingDiagram";
import { TasteCard } from "./TasteCard";
import { ReferenceRail } from "./ReferenceRail";
import type { FidelityMode } from "@/lib/canvas/directive-compiler";
import { AIPreviewBar } from "./AIPreviewBar";
import { InspectorCollapsible } from "./inspector/InspectorCollapsible";
import { InspectorSegmented } from "./inspector/InspectorSegmented";
import { InspectorTabs, type InspectorTabId } from "./inspector/InspectorTabs";
import { BreakpointBadge } from "./inspector/BreakpointBadge";
import { CSSTab } from "./inspector/CSSTab";
import { ExportTab } from "./inspector/ExportTab";
import { InspectorSkeleton } from "./inspector/InspectorSkeleton";
import { StudioButton } from "@/components/ui/studio-button";
import { MultiSelectActionBar } from "./MultiSelectActionBar";
import { getFontsByCategory } from "@/lib/canvas/font-library";
import type { SiteType } from "@/lib/canvas/templates";
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
import type { PageNode, PageNodeStyle } from "@/lib/canvas/compose";
import type { TasteProfile } from "@/types/taste-profile";
import { isHintSeen, markHintSeen } from "./OnboardingHint";

// ─── Shared classes ──────────────────────────────────────────────────────────

const ghostBtnCls =
  "border border-[var(--border-primary)] rounded-[4px] px-3 py-2 text-[12px] text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--accent)] transition-colors";

// ─── Debounce hook ───────────────────────────────────────────────────────────

function useDebouncedCallback<T extends (...args: unknown[]) => void>(
  callback: T,
  delay: number
): T {
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = React.useRef(callback);

  React.useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return React.useCallback(
    (...args: unknown[]) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => callbackRef.current(...args), delay);
    },
    [delay]
  ) as T;
}

function normalizeHexColor(color: string): string | null {
  const value = color.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(value)) return null;

  const expanded =
    value.length === 3
      ? value
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : value;

  return `#${expanded.toUpperCase()}`;
}

function dedupeDocumentColors(colors: string[]): string[] {
  const uniqueColors = new Map<string, string>();

  for (const color of colors) {
    const normalized = normalizeHexColor(color);
    if (!normalized || uniqueColors.has(normalized)) continue;
    uniqueColors.set(normalized, normalized);
  }

  return [...uniqueColors.values()];
}

// ─── Debounced history push (instant visual, delayed history) ────────────────

function useDebouncedHistoryPush(
  pushHistory: (description: string) => void,
  delay: number
) {
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = React.useRef<string | null>(null);
  const callbackRef = React.useRef(pushHistory);

  React.useEffect(() => {
    callbackRef.current = pushHistory;
  }, [pushHistory]);

  const schedule = React.useCallback(
    (description: string) => {
      pendingRef.current = description;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (pendingRef.current) {
          callbackRef.current(pendingRef.current);
          pendingRef.current = null;
        }
      }, delay);
    },
    [delay]
  );

  const flush = React.useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    if (pendingRef.current) {
      callbackRef.current(pendingRef.current);
      pendingRef.current = null;
    }
  }, []);

  // Flush on unmount so pending edits aren't lost
  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (pendingRef.current) {
        callbackRef.current(pendingRef.current);
      }
    };
  }, []);

  return { schedule, flush };
}

// ─── Icon Toggle Group ───────────────────────────────────────────────────────

function IconToggleGroup({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: string; icon: React.ReactNode; title: string }>;
  value: string | undefined;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex gap-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          title={opt.title}
          onClick={() => onChange(opt.value)}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-[2px] transition-colors",
            value === opt.value
              ? "bg-white text-[#1A1A1A] shadow-[0_1px_2px_rgba(0,0,0,0.06)] dark:bg-[#333333] dark:text-[#FFFFFF]"
              : "text-[#A0A0A0] hover:bg-[#F5F5F0] hover:text-[#6B6B6B] dark:text-[#666666] dark:hover:text-[#D0D0D0]"
          )}
        >
          {opt.icon}
        </button>
      ))}
    </div>
  );
}

// ─── Inspector Sub-panels ────────────────────────────────────────────────────

function EmptySelection({
  projectId,
  onOpenGenerate,
}: {
  projectId?: string;
  onOpenGenerate?: () => void;
}) {
  const { state, dispatch } = useCanvas();
  const refCount = state.items.filter((i) => i.kind === "reference").length;
  const artboardCount = state.items.filter((i) => i.kind === "artboard").length;
  const noteCount = state.items.filter((i) => i.kind === "note").length;
  const zoom = Math.round(state.viewport.zoom * 100);
  const projectName = projectId ? (getProjectById(projectId)?.name ?? "Project") : "Project";

  return (
    <div>
      <InspectorSection label="Canvas">
        <InspectorLabel>Project</InspectorLabel>
        <div className="text-[13px] text-text-primary mb-3">{projectName}</div>

        <InspectorLabel>Items</InspectorLabel>
        <div className="text-[12px] text-text-secondary mb-3">
          {refCount} reference{refCount !== 1 ? "s" : ""} · {artboardCount} artboard{artboardCount !== 1 ? "s" : ""} · {noteCount} note{noteCount !== 1 ? "s" : ""}
        </div>

        <InspectorLabel>Zoom</InspectorLabel>
        <div className="flex flex-wrap items-center gap-2">
          <InspectorNumberInput
            value={zoom}
            onChange={(e) => {
              const pct = Number((e.target as HTMLInputElement).value);
              if (pct > 0) {
                dispatch({
                  type: "SET_VIEWPORT",
                  pan: state.viewport.pan,
                  zoom: pct / 100,
                });
              }
            }}
            className="w-[60px]"
          />
          <button
            type="button"
            className={ghostBtnCls}
            onClick={() => {
              dispatch({
                type: "SET_VIEWPORT",
                pan: { x: 0, y: 0 },
                zoom: 0.5,
              });
            }}
          >
            Fit to View
          </button>
          {onOpenGenerate && (
            <StudioButton type="button" variant="primary" className="text-[12px]" onClick={onOpenGenerate}>
              Generate
            </StudioButton>
          )}
        </div>
      </InspectorSection>
    </div>
  );
}

function ReferenceInspector({ item }: { item: ReferenceItem }) {
  const { dispatch } = useCanvas();
  const [annotation, setAnnotation] = React.useState(item.annotation || "");
  const [locked, setLocked] = React.useState(true);
  const aspectRatio = item.width / (item.height || 1);

  const debouncedSave = useDebouncedCallback((...args: unknown[]) => {
    const text = args[0] as string;
    dispatch({ type: "PUSH_HISTORY", description: "Updated annotation" });
    dispatch({ type: "UPDATE_ITEM", itemId: item.id, changes: { annotation: text } as Partial<ReferenceItem> });
  }, 400);

  return (
    <div>
      <InspectorSection label="Reference">
        {/* Image preview */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imageUrl}
          alt={item.title || "Reference"}
          className="w-full rounded-[2px] border border-[#E5E5E0] object-cover"
          style={{ maxHeight: 180 }}
        />
      </InspectorSection>

      <InspectorSection label="Annotation">
        <InspectorTextarea
          value={annotation}
          onChange={(e) => {
            setAnnotation(e.target.value);
            debouncedSave(e.target.value);
          }}
          placeholder="Add notes..."
          rows={2}
        />
      </InspectorSection>

      {/* Extracted data */}
      {item.extracted && (
        <InspectorSection label="Extracted">
          {item.extracted.colors.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {item.extracted.colors.map((color, i) => (
                <div
                  key={`${color}-${i}`}
                  className="h-4 w-4 rounded-full border border-[#E5E5E0]"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          )}
          {item.extracted.fonts.length > 0 && (
            <div className="text-[11px] font-mono text-[#6B6B6B] mb-1">
              {item.extracted.fonts.join(" · ")}
            </div>
          )}
          {item.extracted.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.extracted.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-[2px] bg-[#F5F5F0] px-2 py-0.5 text-[10px] text-[#6B6B6B]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </InspectorSection>
      )}

      <InspectorSection label="Position">
        <InspectorRow>
          <div>
            <InspectorLabel>X</InspectorLabel>
            <InspectorNumberInput
              value={Math.round(item.x)}
              className="w-full"
              onChange={(e) => {
                dispatch({ type: "PUSH_HISTORY", description: "Moved reference" });
                dispatch({ type: "MOVE_ITEM", itemId: item.id, x: Number((e.target as HTMLInputElement).value), y: item.y });
              }}
            />
          </div>
          <div>
            <InspectorLabel>Y</InspectorLabel>
            <InspectorNumberInput
              value={Math.round(item.y)}
              className="w-full"
              onChange={(e) => {
                dispatch({ type: "PUSH_HISTORY", description: "Moved reference" });
                dispatch({ type: "MOVE_ITEM", itemId: item.id, x: item.x, y: Number((e.target as HTMLInputElement).value) });
              }}
            />
          </div>
        </InspectorRow>
      </InspectorSection>

      <InspectorSection label="Size">
        <div className="flex items-end gap-1">
          <div className="flex-1">
            <InspectorLabel>W</InspectorLabel>
            <InspectorNumberInput
              value={Math.round(item.width)}
              className="w-full"
              onChange={(e) => {
                const newW = Number((e.target as HTMLInputElement).value);
                dispatch({ type: "PUSH_HISTORY", description: "Resized reference" });
                if (locked) {
                  const newH = Math.round(newW / aspectRatio);
                  dispatch({ type: "UPDATE_ITEM", itemId: item.id, changes: { width: newW, height: newH } });
                } else {
                  dispatch({ type: "UPDATE_ITEM", itemId: item.id, changes: { width: newW } });
                }
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => setLocked((v) => !v)}
            className="mb-1 flex h-6 w-6 items-center justify-center rounded-[2px] text-[#A0A0A0] hover:text-[#4B57DB] hover:bg-[#F5F5F0] transition-colors"
            title={locked ? "Unlock aspect ratio" : "Lock aspect ratio"}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
              {locked ? (
                <>
                  <path d="M2 5.5V3a4 4 0 0 1 8 0v2.5" />
                  <rect x="1" y="5.5" width="10" height="5.5" rx="1" />
                </>
              ) : (
                <>
                  <path d="M2 5.5V3a4 4 0 0 1 8 0" />
                  <rect x="1" y="5.5" width="10" height="5.5" rx="1" />
                </>
              )}
            </svg>
          </button>
          <div className="flex-1">
            <InspectorLabel>H</InspectorLabel>
            <InspectorNumberInput
              value={Math.round(item.height)}
              className="w-full"
              onChange={(e) => {
                const newH = Number((e.target as HTMLInputElement).value);
                dispatch({ type: "PUSH_HISTORY", description: "Resized reference" });
                if (locked) {
                  const newW = Math.round(newH * aspectRatio);
                  dispatch({ type: "UPDATE_ITEM", itemId: item.id, changes: { width: newW, height: newH } });
                } else {
                  dispatch({ type: "UPDATE_ITEM", itemId: item.id, changes: { height: newH } });
                }
              }}
            />
          </div>
        </div>
      </InspectorSection>

      {/* Actions */}
      <InspectorDivider />
      <div className="space-y-2">
        <button
          className={ghostBtnCls + " w-full" + (item.isStyleRef ? " border-[#4B57DB] text-[#4B57DB]" : "")}
          onClick={() => {
            dispatch({
              type: "UPDATE_ITEM",
              itemId: item.id,
              changes: { isStyleRef: !item.isStyleRef } as Partial<ReferenceItem>,
            });
          }}
        >
          {item.isStyleRef ? "Remove style reference" : "Use as style reference"}
        </button>
        <button
          className="w-full text-[12px] text-red-500 hover:text-red-600"
          onClick={() => {
            dispatch({ type: "PUSH_HISTORY", description: "Removed reference" });
            dispatch({ type: "REMOVE_ITEM", itemId: item.id });
          }}
        >
          Remove from canvas
        </button>
      </div>
    </div>
  );
}

function ArtboardInspector({ item }: { item: ArtboardItem }) {
  const { dispatch } = useCanvas();

  return (
    <div>
      <InspectorSection label={`Artboard · ${item.breakpoint.charAt(0).toUpperCase() + item.breakpoint.slice(1)}`}>
        <div className="text-[12px] text-[#6B6B6B] space-y-0.5">
          <div>{item.name}</div>
          <div className="font-mono text-[10px]">Site: {item.siteId.slice(0, 12)}…</div>
        </div>
      </InspectorSection>

      <InspectorSection label="Position">
        <InspectorRow>
          <div>
            <InspectorLabel>X</InspectorLabel>
            <InspectorNumberInput
              value={Math.round(item.x)}
              className="w-full"
              onChange={(e) => {
                dispatch({ type: "PUSH_HISTORY", description: "Moved artboard" });
                dispatch({ type: "MOVE_ITEM", itemId: item.id, x: Number((e.target as HTMLInputElement).value), y: item.y });
              }}
            />
          </div>
          <div>
            <InspectorLabel>Y</InspectorLabel>
            <InspectorNumberInput
              value={Math.round(item.y)}
              className="w-full"
              onChange={(e) => {
                dispatch({ type: "PUSH_HISTORY", description: "Moved artboard" });
                dispatch({ type: "MOVE_ITEM", itemId: item.id, x: item.x, y: Number((e.target as HTMLInputElement).value) });
              }}
            />
          </div>
        </InspectorRow>
      </InspectorSection>

      <InspectorSection label="Size">
        <InspectorRow>
          <div>
            <InspectorLabel>Width</InspectorLabel>
            <InspectorNumberInput value={BREAKPOINT_WIDTHS[item.breakpoint]} className="w-full" readOnly />
          </div>
          <div />
        </InspectorRow>
      </InspectorSection>

      <InspectorDivider />
      <div className="flex gap-2">
        <button className={ghostBtnCls + " flex-1"}>View Code</button>
        <button className={ghostBtnCls + " flex-1"}>Export</button>
      </div>
    </div>
  );
}

// ─── NodeInspector ───────────────────────────────────────────────────────────

function NodeInspector({
  artboard,
  node,
  documentColors,
}: {
  artboard: ArtboardItem;
  node: PageNode;
  documentColors: string[];
}) {
  const { dispatch } = useCanvas();
  const bp = artboard.breakpoint;
  const style = getNodeStyle(node, bp);
  const content = node.content || {};
  const isNonDesktop = bp !== "desktop";

  const isTextNode = ["heading", "paragraph", "button"].includes(node.type);
  const isMediaNode = node.type === "section" && Boolean(content.mediaUrl);
  const isContainerNode = !isTextNode && !isMediaNode && (node.type === "section" || node.type === "page" || node.type === "button-row" || node.type === "feature-grid" || node.type === "metric-row" || node.type === "logo-row" || node.type === "testimonial-grid" || node.type === "pricing-grid");

  // Responsive override helpers
  const overrides = isNonDesktop ? node.responsiveOverrides?.[bp] : undefined;

  function hasOverride(property: keyof PageNodeStyle): boolean {
    return isNonDesktop && overrides != null && property in overrides;
  }

  function resetOverride(property: keyof PageNodeStyle) {
    dispatch({ type: "RESET_NODE_STYLE_OVERRIDE", artboardId: artboard.id, nodeId: node.id, property, breakpoint: bp });
  }

  // Debounced history push — visual updates fire instantly, history commits after 400ms/blur
  const history = useDebouncedHistoryPush(
    (desc) => dispatch({ type: "PUSH_HISTORY", description: desc }),
    400
  );

  function updateContent(key: string, value: string) {
    dispatch({
      type: "UPDATE_NODE",
      artboardId: artboard.id,
      nodeId: node.id,
      changes: { content: { ...content, [key]: value } },
    });
    history.schedule(`Edited ${node.type} ${key}`);
  }

  function updateStyle(key: string, value: unknown) {
    dispatch({
      type: isTextNode ? "UPDATE_TEXT_STYLE_SITE" : "UPDATE_NODE_STYLE",
      artboardId: artboard.id,
      nodeId: node.id,
      style: { [key]: value } as Partial<PageNodeStyle>,
    });
    history.schedule(`Styled ${node.type}`);
  }

  function applyImmediateStyleChange(
    stylePatch: Partial<PageNodeStyle>,
    description: string
  ) {
    dispatch({ type: "PUSH_HISTORY", description });
    dispatch({
      type: isTextNode ? "UPDATE_TEXT_STYLE_SITE" : "UPDATE_NODE_STYLE",
      artboardId: artboard.id,
      nodeId: node.id,
      style: stylePatch,
    });
  }

  const textPreview = (content.text || "").trim();
  const truncatedPreview =
    textPreview.length > 96 ? `${textPreview.slice(0, 96)}...` : textPreview || "Empty text";

  return (
    <div data-inspector-first-section>

      {/* ── BREAKPOINT LABEL ─────────────────────────────────────────── */}
      {isNonDesktop && (
        <div className="px-4 pt-3 pb-1">
          <span className="text-[10px] uppercase tracking-[1px] text-[#A0A0A0] font-mono">
            Mobile ({BREAKPOINT_WIDTHS[bp]}px)
          </span>
        </div>
      )}

      {/* ── TEXT NODE ───────────────────────────────────────────────────── */}
      {isTextNode && (
        <>
          <InspectorCollapsible label="Content">
            <div className="rounded-[4px] border border-[#E5E5E0] bg-white px-3 py-3">
              <div className="text-[12px] font-medium text-[#1A1A1A]">{truncatedPreview}</div>
              <div className="mt-2 text-[10px] uppercase tracking-[0.14em] text-[#A0A0A0]">
                Double-click or press Enter to edit on canvas
              </div>
            </div>
          </InspectorCollapsible>

          <InspectorCollapsible label="Typography">
            <InspectorLabel hasOverride={hasOverride("fontFamily")} onResetOverride={() => resetOverride("fontFamily")}>Font Family</InspectorLabel>
            <InspectorSelect
              value={style.fontFamily || ""}
              onChange={(e) => {
                updateStyle("fontFamily", (e.target as HTMLSelectElement).value || undefined);
              }}
            >
              <option value="">Default</option>
              {getFontsByCategory().map(({ category, label, fonts }) => (
                <optgroup key={category} label={label}>
                  {fonts.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.family}
                    </option>
                  ))}
                </optgroup>
              ))}
            </InspectorSelect>

            <InspectorRow className="mt-2">
              <div>
                <InspectorLabel hasOverride={hasOverride("fontWeight")} onResetOverride={() => resetOverride("fontWeight")}>Weight</InspectorLabel>
                <InspectorSelect
                  value={String(style.fontWeight ?? "")}
                  onChange={(e) => {
                    const val = (e.target as HTMLSelectElement).value;
                    updateStyle("fontWeight", val ? Number(val) : undefined);
                  }}
                >
                  <option value="">Auto</option>
                  <option value="300">300 Light</option>
                  <option value="400">400 Regular</option>
                  <option value="500">500 Medium</option>
                  <option value="600">600 Semi</option>
                  <option value="700">700 Bold</option>
                </InspectorSelect>
              </div>
              <div>
                <InspectorLabel hasOverride={hasOverride("fontSize")} onResetOverride={() => resetOverride("fontSize")}>Size</InspectorLabel>
                <InspectorNumberInput
                  value={style.fontSize ?? ""}
                  placeholder="auto"
                  className="w-full"
                  onChange={(e) => {
                    const val = (e.target as HTMLInputElement).value;
                    updateStyle("fontSize", val ? Number(val) : undefined);
                  }}
                  onBlur={() => history.flush()}
                />
              </div>
            </InspectorRow>

            <InspectorRow className="mt-2">
              <div>
                <InspectorLabel hasOverride={hasOverride("letterSpacing")} onResetOverride={() => resetOverride("letterSpacing")}>Tracking</InspectorLabel>
                <InspectorNumberInput
                  value={style.letterSpacing ?? ""}
                  placeholder="0"
                  step={0.1}
                  className="w-full"
                  onChange={(e) => {
                    const val = (e.target as HTMLInputElement).value;
                    updateStyle("letterSpacing", val ? Number(val) : undefined);
                  }}
                  onBlur={() => history.flush()}
                />
              </div>
              <div>
                <InspectorLabel hasOverride={hasOverride("lineHeight")} onResetOverride={() => resetOverride("lineHeight")}>Leading</InspectorLabel>
                <InspectorNumberInput
                  value={style.lineHeight ?? ""}
                  placeholder="1.5"
                  step={0.1}
                  className="w-full"
                  onChange={(e) => {
                    const val = (e.target as HTMLInputElement).value;
                    updateStyle("lineHeight", val ? Number(val) : undefined);
                  }}
                  onBlur={() => history.flush()}
                />
              </div>
            </InspectorRow>

            <div className="mt-2">
              <InspectorLabel hasOverride={hasOverride("foreground")} onResetOverride={() => resetOverride("foreground")}>Color</InspectorLabel>
              <InspectorColorField
                color={style.foreground || "#1A1A1A"}
                documentColors={documentColors}
                onCommit={() => history.flush()}
                onChange={(c) => {
                  updateStyle("foreground", c);
                }}
              />
            </div>

            {/* Font Style & Decoration toggles */}
            <div className="mt-2 flex gap-1.5">
              <button
                type="button"
                className={cn(
                  "border rounded-[2px] px-2.5 py-1.5 text-[12px] font-medium transition-colors",
                  style.fontStyle === "italic"
                    ? "bg-white text-[#1A1A1A] border-[#E5E5E0] shadow-[0_1px_2px_rgba(0,0,0,0.06)] dark:bg-[#333333] dark:text-[#FFFFFF] dark:border-[#444444]"
                    : "border-[#E5E5E0] text-[#A0A0A0] hover:text-[#6B6B6B] dark:text-[#666666] dark:hover:text-[#D0D0D0] dark:border-[#333333]"
                )}
                style={{ fontStyle: "italic" }}
                onClick={() => {
                  applyImmediateStyleChange(
                    { fontStyle: style.fontStyle === "italic" ? "normal" : "italic" },
                    "Toggled italic"
                  );
                }}
              >
                I
              </button>
              <button
                type="button"
                className={cn(
                  "border rounded-[2px] px-2.5 py-1.5 text-[12px] font-medium transition-colors",
                  style.textDecoration === "underline"
                    ? "bg-white text-[#1A1A1A] border-[#E5E5E0] shadow-[0_1px_2px_rgba(0,0,0,0.06)] dark:bg-[#333333] dark:text-[#FFFFFF] dark:border-[#444444]"
                    : "border-[#E5E5E0] text-[#A0A0A0] hover:text-[#6B6B6B] dark:text-[#666666] dark:hover:text-[#D0D0D0] dark:border-[#333333]"
                )}
                style={{ textDecoration: "underline" }}
                onClick={() => {
                  applyImmediateStyleChange(
                    {
                      textDecoration:
                        style.textDecoration === "underline" ? "none" : "underline",
                    },
                    "Toggled underline"
                  );
                }}
              >
                U
              </button>
            </div>
          </InspectorCollapsible>

          <InspectorCollapsible label="Appearance" defaultOpen={false}>
            <InspectorLabel hasOverride={hasOverride("background")} onResetOverride={() => resetOverride("background")}>Background</InspectorLabel>
            <InspectorColorField
              color={style.background || ""}
              documentColors={documentColors}
              onCommit={() => history.flush()}
              onChange={(c) => updateStyle("background", c)}
            />
            <div className="mt-2">
              <InspectorLabel hasOverride={hasOverride("opacity")} onResetOverride={() => resetOverride("opacity")}>Opacity</InspectorLabel>
              <InspectorNumberInput
                value={style.opacity ?? ""}
                placeholder="1"
                step={0.1}
                min={0}
                max={1}
                className="w-[60px]"
                onChange={(e) => {
                  const val = (e.target as HTMLInputElement).value;
                  updateStyle("opacity", val ? Number(val) : undefined);
                }}
                onBlur={() => history.flush()}
              />
            </div>
          </InspectorCollapsible>
        </>
      )}

      {/* ── MEDIA NODE ─────────────────────────────────────────────────── */}
      {isMediaNode && (
        <>
          <InspectorCollapsible label="Image">
            <InspectorLabel>Src</InspectorLabel>
            <InspectorTextInput
              value={content.mediaUrl || ""}
              placeholder="Image URL"
              onChange={(e) => updateContent("mediaUrl", (e.target as HTMLInputElement).value)}
              onBlur={() => history.flush()}
            />
            <div className="mt-2">
              <InspectorLabel>Alt</InspectorLabel>
              <InspectorTextInput
                value={content.mediaAlt || ""}
                placeholder="Alt text"
                onChange={(e) => updateContent("mediaAlt", (e.target as HTMLInputElement).value)}
                onBlur={() => history.flush()}
              />
            </div>
          </InspectorCollapsible>

          <InspectorCollapsible label="Appearance">
            <InspectorLabel hasOverride={hasOverride("background")} onResetOverride={() => resetOverride("background")}>Background</InspectorLabel>
            <InspectorColorField
              color={style.background || ""}
              documentColors={documentColors}
              onCommit={() => history.flush()}
              onChange={(c) => updateStyle("background", c)}
            />
            <div className="mt-2">
              <InspectorLabel hasOverride={hasOverride("opacity")} onResetOverride={() => resetOverride("opacity")}>Opacity</InspectorLabel>
              <InspectorNumberInput
                value={style.opacity ?? ""}
                placeholder="1"
                step={0.1}
                min={0}
                max={1}
                className="w-[60px]"
                onChange={(e) => {
                  const val = (e.target as HTMLInputElement).value;
                  updateStyle("opacity", val ? Number(val) : undefined);
                }}
                onBlur={() => history.flush()}
              />
            </div>
          </InspectorCollapsible>
        </>
      )}

      {/* ── CONTAINER / LAYOUT NODE ────────────────────────────────────── */}
      {isContainerNode && (
        <>
          <InspectorCollapsible label="Layout">
            <InspectorLabel hasOverride={hasOverride("direction")} onResetOverride={() => resetOverride("direction")}>Direction</InspectorLabel>
            <InspectorSegmented
              value={style.direction || "column"}
              options={[
                { value: "column", label: "Column" },
                { value: "row", label: "Row" },
              ]}
              onChange={(v) => {
                dispatch({ type: "PUSH_HISTORY", description: "Changed direction" });
                dispatch({ type: "UPDATE_NODE_STYLE", artboardId: artboard.id, nodeId: node.id, style: { direction: v as "row" | "column" } });
              }}
            />

            <div className="mt-2">
              <InspectorLabel hasOverride={hasOverride("align")} onResetOverride={() => resetOverride("align")}>Align</InspectorLabel>
              <IconToggleGroup
                value={style.align || "left"}
                onChange={(v) => {
                  dispatch({ type: "PUSH_HISTORY", description: "Changed alignment" });
                  dispatch({ type: "UPDATE_NODE_STYLE", artboardId: artboard.id, nodeId: node.id, style: { align: v as PageNodeStyle["align"] } });
                }}
                options={[
                  { value: "left", icon: <AlignLeft size={14} />, title: "Start" },
                  { value: "center", icon: <AlignCenter size={14} />, title: "Center" },
                  { value: "right", icon: <AlignRight size={14} />, title: "End" },
                ]}
              />
            </div>

            <div className="mt-2">
              <InspectorLabel hasOverride={hasOverride("justify")} onResetOverride={() => resetOverride("justify")}>Justify</InspectorLabel>
              <IconToggleGroup
                value={style.justify || "start"}
                onChange={(v) => {
                  dispatch({ type: "PUSH_HISTORY", description: "Changed justify" });
                  dispatch({ type: "UPDATE_NODE_STYLE", artboardId: artboard.id, nodeId: node.id, style: { justify: v as PageNodeStyle["justify"] } });
                }}
                options={[
                  { value: "start", icon: <AlignStartVertical size={14} />, title: "Start" },
                  { value: "center", icon: <AlignCenterVertical size={14} />, title: "Center" },
                  { value: "end", icon: <AlignEndVertical size={14} />, title: "End" },
                  { value: "between", icon: <ArrowDownUp size={14} />, title: "Space Between" },
                ]}
              />
            </div>

            <div className="mt-2">
              <InspectorLabel hasOverride={hasOverride("maxWidth")} onResetOverride={() => resetOverride("maxWidth")}>Max Width</InspectorLabel>
              <InspectorNumberInput
                value={style.maxWidth ?? ""}
                placeholder="auto"
                className="w-full"
                onChange={(e) => {
                  const val = (e.target as HTMLInputElement).value;
                  updateStyle("maxWidth", val ? Number(val) : undefined);
                }}
                onBlur={() => history.flush()}
              />
            </div>
          </InspectorCollapsible>

          <InspectorCollapsible label="Spacing">
            <SpacingDiagram
              artboardId={artboard.id}
              nodeId={node.id}
              nodeType={node.type}
              style={style}
              onHistorySchedule={history.schedule}
              onHistoryFlush={history.flush}
            />
          </InspectorCollapsible>

          <InspectorCollapsible label="Appearance">
            <InspectorLabel hasOverride={hasOverride("background")} onResetOverride={() => resetOverride("background")}>Background</InspectorLabel>
            <InspectorColorField
              color={style.background || ""}
              documentColors={documentColors}
              onCommit={() => history.flush()}
              onChange={(c) => updateStyle("background", c)}
            />
            <div className="mt-2">
              <InspectorLabel hasOverride={hasOverride("opacity")} onResetOverride={() => resetOverride("opacity")}>Opacity</InspectorLabel>
              <InspectorNumberInput
                value={style.opacity ?? ""}
                placeholder="1"
                step={0.1}
                min={0}
                max={1}
                className="w-[60px]"
                onChange={(e) => {
                  const val = (e.target as HTMLInputElement).value;
                  updateStyle("opacity", val ? Number(val) : undefined);
                }}
                onBlur={() => history.flush()}
              />
            </div>
            <div className="mt-2">
              <InspectorLabel hasOverride={hasOverride("minHeight")} onResetOverride={() => resetOverride("minHeight")}>Min Height</InspectorLabel>
              <InspectorNumberInput
                value={style.minHeight ?? ""}
                placeholder="fit"
                className="w-full"
                onChange={(e) => {
                  const val = (e.target as HTMLInputElement).value;
                  updateStyle("minHeight", val ? Number(val) : undefined);
                }}
                onBlur={() => history.flush()}
              />
            </div>
          </InspectorCollapsible>
        </>
      )}

      {/* ── VISIBILITY (non-desktop only) ──────────────────────────────── */}
      {isNonDesktop && (
        <InspectorCollapsible label="Visibility">
          <label className="flex items-center justify-between py-1 cursor-pointer">
            <span className="text-[12px] text-[#1A1A1A]">Hide on Mobile</span>
            <input
              type="checkbox"
              checked={node.hidden?.mobile ?? false}
              onChange={() =>
                dispatch({ type: "TOGGLE_NODE_HIDDEN", artboardId: artboard.id, nodeId: node.id, breakpoint: "mobile" })
              }
              className="accent-[#4B57DB] w-3.5 h-3.5 cursor-pointer"
            />
          </label>
        </InspectorCollapsible>
      )}
    </div>
  );
}

// ─── Prompt Helpers ──────────────────────────────────────────────────────────

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
  selectedNode: PageNode | null,
  hasArtboards: boolean
): string[] {
  if (!selectedNode) {
    if (hasArtboards) return ["Add a pricing section", "Tighten the layout", "Improve mobile responsiveness"];
    return ["Generate a landing page", "Build a portfolio site", "Create a SaaS homepage"];
  }

  switch (selectedNode.type) {
    case "heading":
      return ["Make it shorter", "More professional tone", "Add a number or stat"];
    case "paragraph":
      if (selectedNode.name.toLowerCase().includes("kicker"))
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
      if (selectedNode.content?.mediaUrl)
        return ["A hero photo", "An abstract pattern", "A product screenshot"];
      return ["Add more whitespace", "Make it darker", "Simplify this section"];
    default:
      return ["Redesign this section", "Change the layout", "Add more content"];
  }
}

// ─── Prompt Composer (embedded) ──────────────────────────────────────────────

function PromptComposer({
  textareaRef,
  selectedNode,
  projectId,
  varySignal = 0,
  retryRef,
}: {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  selectedNode: PageNode | null;
  projectId?: string;
  varySignal?: number;
  retryRef?: React.MutableRefObject<(() => void) | null>;
}) {
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
      return (ps.canvas as any)?.fidelityMode ?? "balanced";
    }
  );

  // Persist fidelityMode changes to project state
  const handleFidelityChange = React.useCallback(
    (mode: FidelityMode) => {
      setFidelityMode(mode);
      if (projectId) {
        upsertProjectState(projectId, { canvas: { fidelityMode: mode } as any });
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
      const imageUrls = referenceItems
        .map((r) => r.imageUrl)
        .filter(Boolean);

      const res = await fetch("/api/taste/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          referenceUrls: imageUrls,
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
  }, [isRefreshingTaste, usableRefCount, referenceItems, projectId, prompt.value]);

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

  // ── Generation pipeline ────────────────────────────────────────────

  const handleGenerate = React.useCallback(async () => {
    if (!prompt.value.trim()) {
      setError("Add a prompt before generating.");
      return;
    }

    setError(null);

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
      const imageUrls = referenceItems.slice(0, 6).map((ref) => ref.imageUrl);
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
          const tasteRes = await fetch("/api/taste/extract", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectId,
              referenceUrls: imageUrls,
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
  }, [dispatch, projectId, projectTokens, tasteProfile, fidelityMode, prompt.siteType, prompt.value, referenceItems, selection.selectedNodeId]);

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
      {/* Header */}
      <div className="shrink-0 px-3 pt-3 pb-1">
        <span className="font-mono text-[10px] uppercase tracking-[1px] text-[#A0A0A0]">
          Prompt
        </span>
      </div>

      {/* Scrollable area: history + chips */}
      <div className="flex-1 overflow-y-auto px-3 min-h-0">
        {/* Taste Intelligence surfaces — scroll with content */}
        <div className="-mx-3">
          <div className="border-b border-[#E5E5E0]">
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
          <div className="border-b border-[#E5E5E0]">
            <ReferenceRail references={referenceItems} />
          </div>
        </div>

        {/* Prompt history */}
        {prompt.history.length > 0 && (
          <div className="space-y-1 mb-3">
            {prompt.history.map((run) => (
              <div
                key={run.id}
                className="rounded-[2px] px-2 py-1.5 hover:bg-[#F5F5F0] transition-colors"
              >
                <div className="text-[12px] text-[#1A1A1A] truncate">
                  &ldquo;{run.label}&rdquo;
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[10px] text-[#A0A0A0] font-mono">
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
              className="bg-[#F5F5F0] text-[#6B6B6B] rounded-[4px] px-2.5 py-1 text-[11px] hover:bg-[#E5E5E0] hover:text-[#1A1A1A] cursor-pointer transition-colors"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Context row: refs + site type */}
        <div className="flex items-center gap-2 py-1">
          <span className="text-[10px] text-[#A0A0A0]">{refSummary}</span>
          <select
            value={prompt.siteType}
            onChange={(e) => dispatch({ type: "SET_SITE_TYPE", siteType: e.target.value as SiteType })}
            className="ml-auto rounded-[2px] border border-[#E5E5E0] bg-white px-1.5 py-0.5 text-[10px] text-[#6B6B6B] outline-none focus:border-[#D1E4FC]"
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
            className="w-full border border-[#E5E5E0] rounded-[4px] bg-white px-3 py-2 pr-9 text-[13px] resize-none outline-none transition-colors focus:border-[#D1E4FC] focus:ring-2 focus:ring-[#D1E4FC]/40 disabled:cursor-wait disabled:opacity-60"
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
        className="text-[#4B57DB] hover:bg-[#D1E4FC]/30 rounded-[2px] p-1 disabled:opacity-30 transition-colors"
      >
        <ArrowRight size={14} strokeWidth={1.5} />
      </button>
      {showHint && (
        <div
          className="absolute bottom-full right-0 mb-1 whitespace-nowrap text-[12px] text-[#6B6B6B] bg-[#FFFFFF] border border-[#E5E5E0] rounded-[4px] px-3 py-1.5 shadow-sm pointer-events-none"
          style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}
        >
          AI generates a site based on your references and prompt
        </div>
      )}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatNodeType(type: string): string {
  return type
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ─── Main Panel ──────────────────────────────────────────────────────────────

export type InspectorPanelV3Handle = {
  retryGeneration: () => void;
};

type InspectorPanelV3Props = {
  projectId?: string;
  promptTextareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  panelRef?: React.RefObject<InspectorPanelV3Handle | null>;
  onOpenGenerate?: () => void;
};

export function InspectorPanelV3({
  projectId,
  promptTextareaRef,
  panelRef: externalPanelRef,
  onOpenGenerate,
}: InspectorPanelV3Props) {
  const { state, dispatch } = useCanvas();
  const { selection, items, prompt } = state;
  const projectTokens = projectId ? getProjectState(projectId).canvas?.designTokens ?? null : null;

  const containerRef = React.useRef<HTMLDivElement>(null);
  const internalTextareaRef = React.useRef<HTMLTextAreaElement>(null);
  const textareaRef = promptTextareaRef ?? internalTextareaRef;

  // ── Tab state ──────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = React.useState<InspectorTabId>("design");

  // Ref for PromptComposer's generate function — set by PromptComposer, read by imperative handle
  const retryRef = React.useRef<(() => void) | null>(null);

  // Expose imperative handle so parent can retry generation
  React.useImperativeHandle(externalPanelRef, () => ({
    retryGeneration: () => retryRef.current?.(),
  }));

  // ── Inspector content logic ────────────────────────────────────────

  const documentColors = React.useMemo(() => {
    const colors: string[] = [];
    for (const item of items) {
      if (item.kind === "reference" && item.extracted?.colors) {
        colors.push(...item.extracted.colors);
      }
    }
    if (projectTokens) {
      colors.push(...Object.values(projectTokens.colors));
    }
    return dedupeDocumentColors(colors);
  }, [items, projectTokens]);

  const selectedItems = items.filter((item) =>
    selection.selectedItemIds.includes(item.id)
  );
  const singleSelected: CanvasItem | null =
    selectedItems.length === 1 ? selectedItems[0] : null;

  const artboardItems = React.useMemo(
    () => items.filter((item): item is ArtboardItem => item.kind === "artboard"),
    [items]
  );

  const activeArtboard = singleSelected?.kind === "artboard" ? singleSelected : null;
  const isV6Tree = activeArtboard ? isDesignNodeTree(activeArtboard.pageTree) : false;

  const selectedNode: PageNode | null =
    activeArtboard && selection.selectedNodeId && !isV6Tree
      ? findNodeById(activeArtboard.pageTree as PageNode, selection.selectedNodeId)
      : null;

  const selectedDesignNode: DesignNode | null =
    activeArtboard && selection.selectedNodeId && isV6Tree
      ? findDesignNodeById(activeArtboard.pageTree as unknown as DesignNode, selection.selectedNodeId)
      : null;

  // Get all selected DesignNodes for multi-select support
  const selectedDesignNodes: DesignNode[] = React.useMemo(() => {
    if (!activeArtboard || !isV6Tree) return [];
    const tree = activeArtboard.pageTree as unknown as DesignNode;
    return selection.selectedNodeIds
      .map((id) => findDesignNodeById(tree, id))
      .filter((n): n is DesignNode => n !== null);
  }, [activeArtboard, isV6Tree, selection.selectedNodeIds]);

  const isNodeInspector = Boolean((selectedNode || selectedDesignNode) && activeArtboard);

  // ── Header: zoom + node type ──────────────────────────────────────
  const zoomPercent = Math.round(state.viewport.zoom * 100);

  const handleZoomReset = React.useCallback(() => {
    dispatch({
      type: "SET_VIEWPORT",
      pan: state.viewport.pan,
      zoom: 1,
    });
  }, [dispatch, state.viewport.pan]);

  // ── Breakpoint badge + resolved style for CSS tab ──────────────────
  const artboardBreakpoint = activeArtboard?.breakpoint ?? "desktop";
  const showBreakpointBadge = artboardBreakpoint !== "desktop";

  const resolvedStyle: PageNodeStyle | null = React.useMemo(() => {
    if (!activeArtboard) return null;
    if (selectedNode) return getNodeStyle(selectedNode, activeArtboard.breakpoint);
    if (selectedDesignNode) return selectedDesignNode.style as unknown as PageNodeStyle;
    return null;
  }, [selectedNode, selectedDesignNode, activeArtboard]);

  let inspectorContent: React.ReactNode;

  if (selectedDesignNodes.length > 0 && activeArtboard) {
    inspectorContent = (
      <>
        {selection.selectedNodeIds.length > 1 && <MultiSelectActionBar />}
        <DesignNodeInspector
          artboard={activeArtboard}
          nodes={selectedDesignNodes}
          documentColors={documentColors}
        />
      </>
    );
  } else if (selectedNode && activeArtboard) {
    inspectorContent = (
      <InspectorSkeleton
        artboard={activeArtboard}
        node={selectedNode}
        documentColors={documentColors}
      />
    );
  } else if (singleSelected?.kind === "reference") {
    inspectorContent = <ReferenceInspector item={singleSelected} />;
  } else if (singleSelected?.kind === "artboard") {
    inspectorContent = <ArtboardInspector item={singleSelected} />;
  } else {
    inspectorContent = <EmptySelection projectId={projectId} onOpenGenerate={onOpenGenerate} />;
  }

  // ── Scroll-to on node selection ──────────────────────────────────────
  const inspectorScrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!selection.selectedNodeId) return;
    const scrollEl = inspectorScrollRef.current;
    if (!scrollEl) return;
    const target = scrollEl.querySelector("[data-inspector-first-section]");
    if (target) {
      // Use block:"nearest" to prevent scroll from escaping the
      // inspector panel and shifting the page/canvas shell.
      target.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }
  }, [selection.selectedNodeId]);

  // ── AI Preview: Vary signal ───────────────────────────────────────

  const [varySignal, setVarySignal] = React.useState(0);

  const handleAcceptPreview = React.useCallback(() => {
    dispatch({ type: "ACCEPT_AI_PREVIEW" });
  }, [dispatch]);

  const handleRejectPreview = React.useCallback(() => {
    dispatch({ type: "RESTORE_AI_PREVIEW" });
  }, [dispatch]);

  const handleVaryPreview = React.useCallback(() => {
    const aiPrompt = state.aiPreview?.prompt ?? "";
    dispatch({ type: "RESTORE_AI_PREVIEW" });
    dispatch({ type: "SET_PROMPT", value: aiPrompt });
    setVarySignal((v) => v + 1);
  }, [dispatch, state.aiPreview?.prompt]);

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      className="absolute right-0 top-0 bottom-0 z-20 w-[288px] flex flex-col border-l-[0.5px] border-sidebar-border bg-card-bg"
    >
      {/* Header area — shrink-0 so it never grows/shrinks */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-subtle shrink-0">
        <span
          className={cn(
            "flex-1 min-w-0 truncate text-[13px] font-medium",
            selectedNode || selectedDesignNodes.length > 0 ? "text-text-primary" : "text-text-muted"
          )}
        >
          {selectedDesignNodes.length > 1 
            ? `${selectedDesignNodes.length} nodes selected`
            : selectedDesignNodes.length === 1 
              ? `${selectedDesignNodes[0].type} — ${selectedDesignNodes[0].name}`
              : selectedNode 
                ? formatNodeType(selectedNode.type) 
                : "No Selection"}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className="text-[11px] font-mono text-text-secondary cursor-pointer hover:text-text-primary transition-colors"
            onClick={handleZoomReset}
            title="Reset zoom to 100%"
          >
            {zoomPercent}%
          </span>
          <button
            type="button"
            disabled
            className="text-[11px] text-text-muted cursor-not-allowed"
            title="Share coming soon"
          >
            Share
          </button>
          <StudioButton
            type="button"
            variant="primary"
            className="h-auto px-2.5 py-1 text-[11px]"
            onClick={() => setActiveTab("export")}
          >
            Export
          </StudioButton>
        </div>
      </div>

      {/* Tabs — shrink-0, never participates in flex distribution */}
      <InspectorTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Breakpoint badge (below tabs, non-desktop only) — shrink-0 */}
      {showBreakpointBadge && activeArtboard && (
        <div className="shrink-0">
          <BreakpointBadge
            breakpoint={artboardBreakpoint as "mobile"}
            width={BREAKPOINT_WIDTHS[artboardBreakpoint]}
          />
        </div>
      )}

      {/* ── Single content area — flex-1 min-h-0, one mode at a time ── */}
      <div
        ref={inspectorScrollRef}
        className="flex-1 min-h-0 overflow-y-auto"
      >
        {activeTab === "design" ? (
          <>
            {/* AI Preview bar */}
            <AnimatePresence>
              {state.aiPreview?.active && !prompt.isGenerating && (
                <AIPreviewBar
                  onAccept={handleAcceptPreview}
                  onReject={handleRejectPreview}
                  onVary={handleVaryPreview}
                />
              )}
            </AnimatePresence>

            <div className={isNodeInspector ? undefined : "p-4"}>{inspectorContent}</div>
          </>
        ) : activeTab === "export" ? (
          <ExportTab
            artboard={activeArtboard}
            artboards={artboardItems}
            components={state.components}
            selectedNodeId={selection.selectedNodeId}
          />
        ) : (
          <CSSTab resolvedStyle={resolvedStyle} />
        )}
      </div>
    </div>
  );
}
