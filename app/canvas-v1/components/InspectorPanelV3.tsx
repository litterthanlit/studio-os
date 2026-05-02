"use client";

/**
 * V3 Inspector Panel — tabbed right rail (Inspector | Notes | Export).
 */

import * as React from "react";
import { AnimatePresence } from "framer-motion";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ArrowRight,
  BarChart3,
  Box,
  CheckCircle2,
  MessageSquareText,
  Minus,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";
import { useCanvas } from "@/lib/canvas/canvas-context";
import { findNodeById, BREAKPOINT_WIDTHS, isDesignNodeTree } from "@/lib/canvas/compose";
import { findDesignNodeById } from "@/lib/canvas/design-node";
import type { DesignNode } from "@/lib/canvas/design-node";
import { DesignNodeInspector } from "./inspector/DesignNodeInspector";
import { getProjectState, getProjectById } from "@/lib/project-store";
import {
  InspectorSection,
  InspectorLabel,
  InspectorTextarea,
  InspectorNumberInput,
  InspectorRow,
  InspectorDivider,
} from "./inspector/InspectorField";
import { AIPreviewBar } from "./AIPreviewBar";
import { InspectorTabs, type InspectorTabId } from "./inspector/InspectorTabs";
import { BreakpointBadge } from "./inspector/BreakpointBadge";
import { ExportTab } from "./inspector/ExportTab";
import { InspectorSkeleton } from "./inspector/InspectorSkeleton";
import { MultiSelectActionBar } from "./MultiSelectActionBar";
import type {
  CanvasItem,
  ReferenceItem,
  ArtboardItem,
  FrameItem,
  TextItem,
} from "@/lib/canvas/unified-canvas-state";
import { canvasItemToDesignNode } from "@/lib/canvas/canvas-item-conversion";
import type { PageNode } from "@/lib/canvas/compose";

// ─── Shared classes ──────────────────────────────────────────────────────────

const ghostBtnCls =
  "border border-[var(--border-primary)] rounded-[4px] px-3 py-2 text-[12px] text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--accent)] transition-colors";

type InspectorSelectionSummaryProps = {
  sectionTitle: string;
  title: string;
  meta: string;
  showTasteAction: boolean;
  onRefineWithTaste: () => void;
};

function InspectorSelectionSummary({
  sectionTitle,
  title,
  meta,
  showTasteAction,
  onRefineWithTaste,
}: InspectorSelectionSummaryProps) {
  return (
    <div className="shrink-0 border-b border-[var(--inspector-border)] bg-[var(--inspector-bg)] px-3 py-2.5">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[12px] font-semibold tracking-normal text-[var(--text-primary)]">
          {sectionTitle}
        </div>
        <Minus size={14} className="text-[var(--text-muted)]" strokeWidth={1.8} />
      </div>
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-[4px] border border-[var(--inspector-control-border)] bg-[var(--inspector-control-bg)] text-[var(--accent)]">
          <Box size={13} strokeWidth={1.6} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12px] font-medium text-[var(--text-primary)]">
            {title}
          </div>
          <div className="mt-1 truncate text-[10px] text-[var(--text-muted)]">
            {meta}
          </div>
        </div>
      </div>

      {showTasteAction && (
        <button
          type="button"
          onClick={onRefineWithTaste}
          className="mt-2.5 flex h-7 w-full items-center justify-between rounded-[4px] border border-[var(--accent)]/35 bg-[var(--accent-subtle)] px-2.5 text-[10px] font-medium text-[var(--accent)] transition-colors hover:bg-[var(--accent-light)]"
        >
          <span className="flex items-center gap-2">
            <Sparkles size={13} strokeWidth={1.6} />
            Refine with taste
          </span>
          <ArrowRight size={13} strokeWidth={1.6} />
        </button>
      )}
    </div>
  );
}

function InspectorControlStrip() {
  const controls = [
    { label: "Align left", icon: AlignLeft },
    { label: "Align center", icon: AlignCenter },
    { label: "Align right", icon: AlignRight },
    { label: "Distribute", icon: AlignJustify },
    { label: "Tune", icon: SlidersHorizontal },
    { label: "Metrics", icon: BarChart3 },
  ];

  return (
    <div className="grid h-9 shrink-0 grid-cols-6 border-b border-[var(--inspector-border)] bg-[var(--inspector-bg)] px-3 py-1.5">
      {controls.map(({ label, icon: Icon }) => (
        <button
          key={label}
          type="button"
          title={label}
          className="flex h-7 items-center justify-center rounded-[4px] text-[var(--text-muted)] transition-colors hover:bg-[var(--inspector-surface-hover)] hover:text-[var(--text-primary)]"
        >
          <Icon size={14} strokeWidth={1.8} />
        </button>
      ))}
    </div>
  );
}

function HandoffReadinessPanel({
  artboardCount,
  referenceCount,
  hasTokens,
}: {
  artboardCount: number;
  referenceCount: number;
  hasTokens: boolean;
}) {
  const rows = [
    { label: "Specs", value: artboardCount > 0 ? "Complete" : "Missing", ready: artboardCount > 0 },
    { label: "Tokens", value: hasTokens ? "Synced" : "Pending", ready: hasTokens },
    { label: "Assets", value: referenceCount > 0 ? "Ready" : "Add refs", ready: referenceCount > 0 },
  ];

  return (
    <div className="border-t border-[var(--inspector-border)] px-3 py-2.5">
      <div className="mb-2 text-[11px] font-semibold tracking-normal text-[var(--text-muted)]">
        Handoff readiness
      </div>
      <div className="space-y-1.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-2 text-[var(--text-secondary)]">
              <CheckCircle2
                size={13}
                strokeWidth={1.8}
                className={row.ready ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}
              />
              {row.label}
            </span>
            <span className={row.ready ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"}>
              {row.value}
            </span>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="mt-2.5 h-7 w-full rounded-[4px] border border-[var(--inspector-control-border)] bg-[var(--inspector-control-bg)] text-[11px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--inspector-surface-hover)]"
      >
        Open handoff spec
      </button>
    </div>
  );
}

function InspectorNotesPanel({
  selectionTitle,
  selectionMeta,
}: {
  selectionTitle: string;
  selectionMeta: string;
}) {
  const [draft, setDraft] = React.useState("");
  const notes = [
    {
      id: "spacing",
      author: "Alex R.",
      body: "Consider refining token naming for spacing scale before handoff.",
      time: "Today, 9:15 AM",
    },
    {
      id: "taste",
      author: "Studio OS",
      body: "Taste alignment is strong. Typography and layout tokens are ready to consolidate.",
      time: "System note",
    },
  ];

  return (
    <div className="px-3 py-3">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold tracking-normal text-[var(--text-muted)]">
        <MessageSquareText size={13} strokeWidth={1.7} />
        Context notes
      </div>
      <div className="mb-2 rounded-[4px] border border-[var(--inspector-border)] bg-[var(--inspector-surface)] px-2.5 py-2">
        <div className="text-[11px] font-medium text-[var(--text-primary)]">{selectionTitle}</div>
        <div className="mt-1 text-[10px] text-[var(--text-muted)]">{selectionMeta}</div>
      </div>

      <div className="space-y-1.5">
        {notes.map((note) => (
          <div
            key={note.id}
            className="rounded-[4px] border border-[var(--inspector-border)] bg-[var(--inspector-bg)] px-2.5 py-2"
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-[var(--text-primary)]">{note.author}</span>
              <span className="text-[10px] text-[var(--text-muted)]">{note.time}</span>
            </div>
            <p className="text-[11px] leading-relaxed text-[var(--text-secondary)]">{note.body}</p>
          </div>
        ))}
      </div>

      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Add selection note..."
        className="mt-2.5 min-h-[60px] w-full resize-none rounded-[4px] border border-[var(--inspector-control-border)] bg-[var(--inspector-control-bg)] px-2.5 py-2 text-[11px] text-[var(--inspector-control-text)] outline-none placeholder:text-[var(--text-placeholder)] focus:border-[var(--accent)]"
      />
      <button
        type="button"
        className="mt-2 h-8 w-full rounded-[4px] bg-[var(--accent)] text-[11px] font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!draft.trim()}
      >
        Add note
      </button>
    </div>
  );
}

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


// ─── Inspector Sub-panels ────────────────────────────────────────────────────

function EmptySelection({ projectId }: { projectId?: string }) {
  const { state, dispatch } = useCanvas();
  const [projectName, setProjectName] = React.useState("Project");
  const refCount = state.items.filter((i) => i.kind === "reference").length;
  const artboardCount = state.items.filter((i) => i.kind === "artboard").length;
  const noteCount = state.items.filter((i) => i.kind === "note").length;
  const zoom = Math.round(state.viewport.zoom * 100);

  React.useEffect(() => {
    setProjectName(projectId ? (getProjectById(projectId)?.name ?? "Project") : "Project");
  }, [projectId]);

  return (
    <div>
      <InspectorSection label="Canvas">
        <InspectorLabel>Project</InspectorLabel>
        <div className="text-[12px] text-text-primary mb-3">{projectName}</div>

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
                zoom: 0.42,
              });
            }}
          >
            Fit to View
          </button>
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


// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatNodeType(type: string): string {
  return type
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ─── Main Panel ──────────────────────────────────────────────────────────────

type InspectorPanelV3Props = {
  projectId?: string;
  onOpenGenerate?: () => void;
  /** Bumps PromptComposerV2 vary signal in the left Direction panel (AI preview vary). */
  onBumpPromptVary?: () => void;
};

export function InspectorPanelV3({
  projectId,
  onOpenGenerate,
  onBumpPromptVary,
}: InspectorPanelV3Props) {
  const { state, dispatch } = useCanvas();
  const { selection, items, prompt } = state;
  const projectTokens = projectId ? getProjectState(projectId).canvas?.designTokens ?? null : null;

  const containerRef = React.useRef<HTMLDivElement>(null);

  // ── Tab state ──────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = React.useState<InspectorTabId>("design");
  const handleTabChange = React.useCallback((tab: InspectorTabId) => {
    setActiveTab(tab);
  }, []);

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
  const referenceCount = React.useMemo(
    () => items.filter((item) => item.kind === "reference").length,
    [items]
  );

  // For canvas-level frame/text items, synthesize a minimal ArtboardItem so
  // DesignNodeInspector can handle them without any changes to that component.
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

  // Get all selected DesignNodes for multi-select support.
  // For canvas-level frame/text items with no inner node selected, show the item root.
  const selectedDesignNodes: DesignNode[] = React.useMemo(() => {
    if (!activeArtboard || !isV6Tree) return [];
    const tree = activeArtboard.pageTree as unknown as DesignNode;
    // If an inner node is selected, resolve it; otherwise show the root node itself.
    if (selection.selectedNodeIds.length > 0) {
      const resolved = selection.selectedNodeIds
        .map((id) => findDesignNodeById(tree, id))
        .filter((n): n is DesignNode => n !== null);
      if (resolved.length > 0) return resolved;
    }
    // Primary id without multi-select ids (or stale ids above) — still resolve single selection.
    if (selection.selectedNodeId) {
      const one = findDesignNodeById(tree, selection.selectedNodeId);
      if (one) return [one];
    }
    // No inner selection — show the item root node (frame/text canvas items)
    const isCanvasFrameOrText =
      singleSelected?.kind === "frame" || singleSelected?.kind === "text";
    if (isCanvasFrameOrText) {
      return [tree];
    }
    return [];
  }, [activeArtboard, isV6Tree, selection.selectedNodeIds, selection.selectedNodeId, singleSelected]);

  // ── Breakpoint badge ───────────────────────────────────────────────
  const artboardBreakpoint = activeArtboard?.breakpoint ?? "desktop";
  const showBreakpointBadge = artboardBreakpoint !== "desktop";

  const selectionSummary = React.useMemo(() => {
    if (selectedDesignNodes.length > 1) {
      return {
        sectionTitle: "Selection",
        title: `${selectedDesignNodes.length} nodes selected`,
        meta: activeArtboard ? `${activeArtboard.name} · ${artboardBreakpoint}` : "Multi-edit",
        canRefine: true,
      };
    }

    if (selectedDesignNodes.length === 1) {
      const node = selectedDesignNodes[0];
      const nodeTitle = node.name || node.type;
      const context =
        activeArtboard && activeArtboard.name !== nodeTitle
          ? `${activeArtboard.name} · editable layer`
          : "editable layer";
      return {
        sectionTitle: formatNodeType(node.type),
        title: nodeTitle,
        meta: context,
        canRefine: true,
      };
    }

    if (selectedNode) {
      const nodeTitle = selectedNode.name || formatNodeType(selectedNode.type);
      const context =
        activeArtboard && activeArtboard.name !== nodeTitle
          ? `${activeArtboard.name} · ${artboardBreakpoint}`
          : artboardBreakpoint;
      return {
        sectionTitle: formatNodeType(selectedNode.type),
        title: nodeTitle,
        meta: activeArtboard ? context : "Page node",
        canRefine: true,
      };
    }

    if (singleSelected) {
      const sectionTitle = formatNodeType(singleSelected.kind);
      return {
        sectionTitle,
        title: "name" in singleSelected && singleSelected.name ? singleSelected.name : formatNodeType(singleSelected.kind),
        meta: `${Math.round(singleSelected.width)} x ${Math.round(singleSelected.height)} · canvas object`,
        canRefine: singleSelected.kind === "artboard" || singleSelected.kind === "frame" || singleSelected.kind === "text",
      };
    }

    return {
      sectionTitle: "Canvas",
      title: "No selection",
      meta: "Select an object to inspect and refine",
      canRefine: false,
    };
  }, [activeArtboard, artboardBreakpoint, selectedDesignNodes, selectedNode, singleSelected]);

  const handleRefineWithTaste = React.useCallback(() => {
    const target = selectionSummary.title === "No selection" ? "the current canvas" : selectionSummary.title;
    dispatch({
      type: "SET_PROMPT",
      value: `Refine ${target} with the active taste profile. Preserve the intent, tighten hierarchy, improve spacing, and make the result feel more Studio OS: precise, editorial, and production-ready.`,
    });
    onOpenGenerate?.();
  }, [dispatch, onOpenGenerate, selectionSummary.title]);

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
    inspectorContent = <EmptySelection projectId={projectId} />;
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
    onBumpPromptVary?.();
  }, [dispatch, state.aiPreview?.prompt, onBumpPromptVary]);

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      className="editor-inspector relative z-20 flex h-full min-h-0 w-[244px] min-w-[244px] max-w-[244px] shrink-0 flex-col border-l border-[var(--sidebar-border)] bg-[var(--inspector-bg)] 2xl:w-[288px] 2xl:min-w-[288px] 2xl:max-w-[288px]"
      style={{
        position: "fixed",
        top: 48,
        right: "var(--editor-viewport-right-inset, 0px)",
        bottom: 0,
        height: "auto",
        zIndex: 40,
      }}
    >
      {/* Tabs — shrink-0, never participates in flex distribution */}
      <InspectorTabs activeTab={activeTab} onTabChange={handleTabChange} />
      {activeTab === "design" && (selectedDesignNodes.length > 1 || selectedItems.length > 1) && (
        <InspectorControlStrip />
      )}

      <InspectorSelectionSummary
        sectionTitle={selectionSummary.sectionTitle}
        title={selectionSummary.title}
        meta={selectionSummary.meta}
        showTasteAction={activeTab === "design" && selectionSummary.canRefine}
        onRefineWithTaste={handleRefineWithTaste}
      />

      {/* Breakpoint badge (below tabs, non-desktop only) — shrink-0 */}
      {activeTab === "design" && showBreakpointBadge && activeArtboard && (
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

            <div>{inspectorContent}</div>
            <HandoffReadinessPanel
              artboardCount={artboardItems.length}
              referenceCount={referenceCount}
              hasTokens={Boolean(projectTokens)}
            />
          </>
        ) : activeTab === "export" ? (
          <ExportTab
            artboard={activeArtboard}
            artboards={artboardItems}
            components={state.components}
            selectedNodeId={selection.selectedNodeId}
          />
        ) : (
          <InspectorNotesPanel
            selectionTitle={selectionSummary.title}
            selectionMeta={selectionSummary.meta}
          />
        )}
      </div>
    </div>
  );
}
