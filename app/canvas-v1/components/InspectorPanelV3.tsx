"use client";

/**
 * V3 Inspector Panel — split panel: inspector (top) + embedded prompt composer (bottom).
 *
 * Replaces the old floating PromptPanel. Contains selection-adaptive property
 * editing in the top section and generation, history, suggestion chips in the
 * bottom section. Draggable divider between sections; split ratio persisted.
 */

import * as React from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { useCanvas } from "@/lib/canvas/canvas-context";
import { findNodeById, BREAKPOINT_WIDTHS } from "@/lib/canvas/compose";
import { SITE_TYPE_OPTIONS } from "@/lib/canvas/templates";
import { ColorPickerPopover } from "./ColorPickerPopover";
import type { SiteType } from "@/lib/canvas/templates";
import type {
  CanvasItem,
  ReferenceItem,
  ArtboardItem,
  NoteItem,
  PromptRun,
  Breakpoint,
} from "@/lib/canvas/unified-canvas-state";
import type { PageNode, PageNodeStyle } from "@/lib/canvas/compose";

// ─── Shared classes ──────────────────────────────────────────────────────────

const inputCls =
  "w-full border border-[#E5E5E0] rounded-[2px] bg-white px-3 py-2 text-[13px] text-[#1A1A1A] placeholder:text-[#A0A0A0] outline-none transition-colors focus:border-[#D1E4FC] focus:ring-2 focus:ring-[#D1E4FC]/40";

const numInputCls =
  "w-full border border-[#E5E5E0] rounded-[2px] bg-white px-2 py-1.5 text-[12px] text-[#1A1A1A] font-mono outline-none transition-colors focus:border-[#D1E4FC] focus:ring-2 focus:ring-[#D1E4FC]/40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none";

const ghostBtnCls =
  "border border-[#E5E5E0] rounded-[4px] px-3 py-2 text-[12px] text-[#6B6B6B] hover:border-[#D1E4FC] hover:text-[#1E5DF2] transition-colors";

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 mb-2 font-mono text-[10px] uppercase tracking-widest text-[#A0A0A0]">
      {children}
    </p>
  );
}

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-2">{children}</div>;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="shrink-0 w-8 text-[10px] font-mono uppercase text-[#A0A0A0]">
      {children}
    </span>
  );
}

// ─── Debounce hook ───────────────────────────────────────────────────────────

function useDebouncedCallback<T extends (...args: unknown[]) => void>(
  callback: T,
  delay: number
): T {
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = React.useRef(callback);
  callbackRef.current = callback;

  return React.useCallback(
    ((...args: unknown[]) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => callbackRef.current(...args), delay);
    }) as T,
    [delay]
  );
}

// ─── Hex validation ──────────────────────────────────────────────────────────

function isValidHex(hex: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex);
}

// ─── Debounced history push (instant visual, delayed history) ────────────────

function useDebouncedHistoryPush(
  pushHistory: (description: string) => void,
  delay: number
) {
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = React.useRef<string | null>(null);
  const callbackRef = React.useRef(pushHistory);
  callbackRef.current = pushHistory;

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

// ─── Color Swatch ────────────────────────────────────────────────────────────

function ColorSwatch({
  color,
  documentColors,
  onChange,
}: {
  color: string;
  documentColors: string[];
  onChange: (color: string) => void;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="relative">
      <button
        className="h-4 w-4 rounded-[2px] border border-[#E5E5E0]"
        style={{ backgroundColor: color || "#FFFFFF" }}
        onClick={() => setOpen(!open)}
      />
      <ColorPickerPopover
        open={open}
        value={color || "#FFFFFF"}
        documentColors={documentColors}
        onSelect={onChange}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}

// ─── Inspector Sub-panels ────────────────────────────────────────────────────

function EmptySelection() {
  const { state } = useCanvas();
  const refCount = state.items.filter((i) => i.kind === "reference").length;
  const artboardCount = state.items.filter((i) => i.kind === "artboard").length;
  const zoom = Math.round(state.viewport.zoom * 100);

  return (
    <div className="space-y-3">
      <span className="font-mono text-[10px] uppercase tracking-widest text-[#A0A0A0]">
        Canvas
      </span>
      <div className="space-y-1 text-[12px] text-[#6B6B6B]">
        <div>{refCount} reference{refCount !== 1 ? "s" : ""}</div>
        <div>{artboardCount} artboard{artboardCount !== 1 ? "s" : ""}</div>
        <div>{zoom}% zoom</div>
      </div>
    </div>
  );
}

function ReferenceSize({
  item,
  dispatch,
}: {
  item: ReferenceItem;
  dispatch: (action: import("@/lib/canvas/canvas-reducer").CanvasAction) => void;
}) {
  const [locked, setLocked] = React.useState(true);
  const aspectRatio = item.width / (item.height || 1);

  return (
    <div className="flex items-end gap-1">
      <div className="flex-1">
        <FieldLabel>W</FieldLabel>
        <input
          type="number"
          value={Math.round(item.width)}
          className={numInputCls}
          onChange={(e) => {
            const newW = Number(e.target.value);
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
        className="mb-1 flex h-6 w-6 items-center justify-center rounded-[2px] text-[#A0A0A0] hover:text-[#1E5DF2] hover:bg-[#F5F5F0] transition-colors"
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
        <FieldLabel>H</FieldLabel>
        <input
          type="number"
          value={Math.round(item.height)}
          className={numInputCls}
          onChange={(e) => {
            const newH = Number(e.target.value);
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
  );
}

function ReferenceInspector({ item }: { item: ReferenceItem }) {
  const { dispatch } = useCanvas();
  const [annotation, setAnnotation] = React.useState(item.annotation || "");

  const debouncedSave = useDebouncedCallback((...args: unknown[]) => {
    const text = args[0] as string;
    dispatch({ type: "PUSH_HISTORY", description: "Updated annotation" });
    dispatch({ type: "UPDATE_ITEM", itemId: item.id, changes: { annotation: text } as Partial<ReferenceItem> });
  }, 400);

  return (
    <div className="space-y-1">
      <span className="font-mono text-[10px] uppercase tracking-widest text-[#A0A0A0]">
        Reference
      </span>

      {/* Image preview */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.imageUrl}
        alt={item.title || "Reference"}
        className="w-full rounded-[2px] border border-[#E5E5E0] object-cover"
        style={{ maxHeight: 180 }}
      />

      {/* Annotation */}
      <SectionHeader>Annotation</SectionHeader>
      <textarea
        value={annotation}
        onChange={(e) => {
          setAnnotation(e.target.value);
          debouncedSave(e.target.value);
        }}
        placeholder="Add notes..."
        rows={2}
        className={inputCls + " resize-none"}
      />

      {/* Extracted data */}
      {item.extracted && (
        <>
          <SectionHeader>Extracted</SectionHeader>
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
        </>
      )}

      {/* Position */}
      <SectionHeader>Position</SectionHeader>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <FieldLabel>X</FieldLabel>
          <input type="number" value={Math.round(item.x)} className={numInputCls} onChange={(e) => {
            dispatch({ type: "PUSH_HISTORY", description: "Moved reference" });
            dispatch({ type: "MOVE_ITEM", itemId: item.id, x: Number(e.target.value), y: item.y });
          }} />
        </div>
        <div>
          <FieldLabel>Y</FieldLabel>
          <input type="number" value={Math.round(item.y)} className={numInputCls} onChange={(e) => {
            dispatch({ type: "PUSH_HISTORY", description: "Moved reference" });
            dispatch({ type: "MOVE_ITEM", itemId: item.id, x: item.x, y: Number(e.target.value) });
          }} />
        </div>
      </div>

      {/* Size with aspect ratio lock */}
      <SectionHeader>Size</SectionHeader>
      <ReferenceSize item={item} dispatch={dispatch} />

      {/* Actions */}
      <div className="mt-4 space-y-2">
        <button
          className={ghostBtnCls + " w-full" + (item.isStyleRef ? " border-[#1E5DF2] text-[#1E5DF2]" : "")}
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
    <div className="space-y-1">
      <span className="font-mono text-[10px] uppercase tracking-widest text-[#A0A0A0]">
        Artboard · {item.breakpoint.charAt(0).toUpperCase() + item.breakpoint.slice(1)}
      </span>

      <div className="text-[12px] text-[#6B6B6B] space-y-0.5">
        <div>{item.name}</div>
        <div className="font-mono text-[10px]">Site: {item.siteId.slice(0, 12)}…</div>
      </div>

      <SectionHeader>Position</SectionHeader>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <FieldLabel>X</FieldLabel>
          <input type="number" value={Math.round(item.x)} className={numInputCls} onChange={(e) => {
            dispatch({ type: "PUSH_HISTORY", description: "Moved artboard" });
            dispatch({ type: "MOVE_ITEM", itemId: item.id, x: Number(e.target.value), y: item.y });
          }} />
        </div>
        <div>
          <FieldLabel>Y</FieldLabel>
          <input type="number" value={Math.round(item.y)} className={numInputCls} onChange={(e) => {
            dispatch({ type: "PUSH_HISTORY", description: "Moved artboard" });
            dispatch({ type: "MOVE_ITEM", itemId: item.id, x: item.x, y: Number(e.target.value) });
          }} />
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button className={ghostBtnCls + " flex-1"}>View Code</button>
        <button className={ghostBtnCls + " flex-1"}>Export</button>
      </div>
    </div>
  );
}

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
  const style = node.style || {};
  const content = node.content || {};

  const isTextNode = ["heading", "paragraph", "button"].includes(node.type);
  const isImageNode = node.type === "section" && Boolean(content.mediaUrl);

  // Debounced history push — visual updates fire instantly, history commits after 400ms/blur
  const history = useDebouncedHistoryPush(
    (desc) => dispatch({ type: "PUSH_HISTORY", description: desc }),
    400
  );

  // Instant content update + schedule history
  function updateContent(key: string, value: string) {
    dispatch({
      type: "UPDATE_NODE",
      artboardId: artboard.id,
      nodeId: node.id,
      changes: { content: { ...content, [key]: value } },
    });
    history.schedule(`Edited ${node.type} ${key}`);
  }

  // Instant style update + schedule history
  function updateStyle(key: string, value: unknown) {
    dispatch({
      type: "UPDATE_NODE_STYLE",
      artboardId: artboard.id,
      nodeId: node.id,
      style: { [key]: value } as Partial<PageNodeStyle>,
    });
    history.schedule(`Styled ${node.type}`);
  }

  // Local draft states
  const [textDraft, setTextDraft] = React.useState(content.text || "");
  const [fgColorDraft, setFgColorDraft] = React.useState(style.foreground || "#1A1A1A");
  const [bgColorDraft, setBgColorDraft] = React.useState(style.background || "");
  const [aiPrompt, setAiPrompt] = React.useState("");

  // Sync drafts when node changes externally
  React.useEffect(() => { setTextDraft(content.text || ""); }, [content.text]);
  React.useEffect(() => { setFgColorDraft(style.foreground || "#1A1A1A"); }, [style.foreground]);
  React.useEffect(() => { setBgColorDraft(style.background || ""); }, [style.background]);

  return (
    <div className="space-y-1">
      <span data-inspector-first-section className="font-mono text-[10px] uppercase tracking-widest text-[#A0A0A0]">
        {node.type.toUpperCase()}
      </span>

      {/* CONTENT */}
      {isTextNode && (
        <>
          <SectionHeader>Content</SectionHeader>
          <textarea
            value={textDraft}
            onChange={(e) => {
              setTextDraft(e.target.value);
              updateContent("text", e.target.value);
            }}
            onBlur={() => history.flush()}
            rows={node.type === "heading" ? 2 : 3}
            className={inputCls + " resize-none"}
          />
        </>
      )}

      {isImageNode && (
        <>
          <SectionHeader>Content</SectionHeader>
          <div className="space-y-2">
            <input
              type="text"
              value={content.mediaUrl || ""}
              placeholder="Image URL"
              className={inputCls}
              onChange={(e) => updateContent("mediaUrl", e.target.value)}
              onBlur={() => history.flush()}
            />
            <input
              type="text"
              value={content.mediaAlt || ""}
              placeholder="Alt text"
              className={inputCls}
              onChange={(e) => updateContent("mediaAlt", e.target.value)}
              onBlur={() => history.flush()}
            />
          </div>
        </>
      )}

      {/* TYPOGRAPHY */}
      {isTextNode && (
        <>
          <SectionHeader>Typography</SectionHeader>
          <select
            value={style.fontFamily || ""}
            onChange={(e) => {
              dispatch({ type: "UPDATE_NODE_STYLE", artboardId: artboard.id, nodeId: node.id, style: { fontFamily: e.target.value } });
              dispatch({ type: "PUSH_HISTORY", description: "Changed font" });
            }}
            className={inputCls}
          >
            <option value="">Default</option>
            <option value="'Inter', sans-serif">Inter</option>
            <option value="'Instrument Serif', serif">Bespoke Serif</option>
            <option value="'IBM Plex Mono', monospace">IBM Plex Mono</option>
          </select>

          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <FieldLabel>Size</FieldLabel>
              <input
                type="number"
                value={style.fontSize ?? ""}
                placeholder="auto"
                className={numInputCls}
                onChange={(e) => updateStyle("fontSize", e.target.value ? Number(e.target.value) : undefined)}
                onBlur={() => history.flush()}
              />
            </div>
            <div>
              <FieldLabel>Wt</FieldLabel>
              <input
                type="number"
                value={style.fontWeight ?? ""}
                placeholder="400"
                className={numInputCls}
                step={100}
                onChange={(e) => updateStyle("fontWeight", e.target.value ? Number(e.target.value) : undefined)}
                onBlur={() => history.flush()}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <FieldLabel>LH</FieldLabel>
              <input
                type="number"
                value={style.lineHeight ?? ""}
                placeholder="1.5"
                className={numInputCls}
                step={0.1}
                onChange={(e) => updateStyle("lineHeight", e.target.value ? Number(e.target.value) : undefined)}
                onBlur={() => history.flush()}
              />
            </div>
            <div>
              <FieldLabel>LS</FieldLabel>
              <input
                type="number"
                value={style.letterSpacing ?? ""}
                placeholder="0"
                className={numInputCls}
                step={0.1}
                onChange={(e) => updateStyle("letterSpacing", e.target.value ? Number(e.target.value) : undefined)}
                onBlur={() => history.flush()}
              />
            </div>
          </div>

          {/* Text color */}
          <FieldRow>
            <FieldLabel>Col</FieldLabel>
            <ColorSwatch
              color={fgColorDraft}
              documentColors={documentColors}
              onChange={(c) => {
                setFgColorDraft(c);
                dispatch({ type: "PUSH_HISTORY", description: "Changed text color" });
                dispatch({ type: "UPDATE_NODE_STYLE", artboardId: artboard.id, nodeId: node.id, style: { foreground: c } });
              }}
            />
            <input
              type="text"
              value={fgColorDraft}
              className={numInputCls + " flex-1"}
              onChange={(e) => {
                setFgColorDraft(e.target.value);
                if (isValidHex(e.target.value)) {
                  updateStyle("foreground", e.target.value);
                }
              }}
              onBlur={() => history.flush()}
            />
          </FieldRow>
        </>
      )}

      {/* FILL */}
      <SectionHeader>Fill</SectionHeader>
      <FieldRow>
        <ColorSwatch
          color={bgColorDraft || "transparent"}
          documentColors={documentColors}
          onChange={(c) => {
            setBgColorDraft(c);
            dispatch({ type: "PUSH_HISTORY", description: "Changed background" });
            dispatch({ type: "UPDATE_NODE_STYLE", artboardId: artboard.id, nodeId: node.id, style: { background: c } });
          }}
        />
        <input
          type="text"
          value={bgColorDraft}
          placeholder="none"
          className={numInputCls + " flex-1"}
          onChange={(e) => {
            setBgColorDraft(e.target.value);
            if (isValidHex(e.target.value) || e.target.value === "" || e.target.value === "transparent") {
              updateStyle("background", e.target.value);
            }
          }}
          onBlur={() => history.flush()}
        />
      </FieldRow>

      {/* SPACING — visual box model */}
      <SectionHeader>Spacing</SectionHeader>
      <div className="relative mx-auto w-[200px]">
        <div className="flex flex-col items-center gap-1">
          {/* Top */}
          <input
            type="number"
            value={style.paddingY ?? ""}
            placeholder="0"
            className={numInputCls + " w-16 text-center"}
            onChange={(e) => updateStyle("paddingY", e.target.value ? Number(e.target.value) : undefined)}
            onBlur={() => history.flush()}
          />
          <div className="flex items-center gap-1">
            {/* Left */}
            <input
              type="number"
              value={style.paddingX ?? ""}
              placeholder="0"
              className={numInputCls + " w-16 text-center"}
              onChange={(e) => updateStyle("paddingX", e.target.value ? Number(e.target.value) : undefined)}
              onBlur={() => history.flush()}
            />
            {/* Center box */}
            <div className="h-10 w-16 rounded-[2px] border border-dashed border-[#E5E5E0]" />
            {/* Right */}
            <input
              type="number"
              value={style.paddingX ?? ""}
              placeholder="0"
              className={numInputCls + " w-16 text-center"}
              readOnly
            />
          </div>
          {/* Bottom */}
          <input
            type="number"
            value={style.paddingY ?? ""}
            placeholder="0"
            className={numInputCls + " w-16 text-center"}
            readOnly
          />
        </div>
      </div>

      {/* SIZE */}
      <SectionHeader>Size</SectionHeader>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <FieldLabel>W</FieldLabel>
          <input
            type="number"
            value={style.maxWidth ?? ""}
            placeholder="auto"
            className={numInputCls}
            onChange={(e) => updateStyle("maxWidth", e.target.value ? Number(e.target.value) : undefined)}
            onBlur={() => history.flush()}
          />
        </div>
        <div>
          <FieldLabel>H</FieldLabel>
          <input
            type="number"
            value={style.minHeight ?? ""}
            placeholder="fit"
            className={numInputCls}
            onChange={(e) => updateStyle("minHeight", e.target.value ? Number(e.target.value) : undefined)}
            onBlur={() => history.flush()}
          />
        </div>
      </div>

      {/* AI */}
      <SectionHeader>AI</SectionHeader>
      <textarea
        value={aiPrompt}
        onChange={(e) => setAiPrompt(e.target.value)}
        placeholder="Describe changes..."
        rows={2}
        className={inputCls + " resize-none"}
      />
      <div className="mt-2 flex flex-wrap gap-2">
        {node.type === "section" && (
          <button className={ghostBtnCls}>Regenerate section</button>
        )}
        {isImageNode && (
          <button className={ghostBtnCls}>Swap image</button>
        )}
        {isTextNode && (
          <button className={ghostBtnCls}>Rewrite text</button>
        )}
      </div>
    </div>
  );
}

// ─── Prompt Helpers ──────────────────────────────────────────────────────────

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function artboardHeight(breakpoint: Breakpoint): number {
  if (breakpoint === "mobile") return 1320;
  if (breakpoint === "tablet") return 1540;
  return 1780;
}

const ARTBOARD_START_X = 1200;
const ARTBOARD_START_Y = 100;
const ARTBOARD_GAP = 80;

function createArtboardItems(
  pageTree: PageNode,
  siteId: string,
  compiledCode?: string | null
): ArtboardItem[] {
  const layouts: Array<{ breakpoint: Breakpoint; label: string; xOffset: number }> = [
    { breakpoint: "desktop", label: "Desktop", xOffset: 0 },
    { breakpoint: "tablet", label: "Tablet", xOffset: BREAKPOINT_WIDTHS.desktop + ARTBOARD_GAP },
    { breakpoint: "mobile", label: "Mobile", xOffset: BREAKPOINT_WIDTHS.desktop + ARTBOARD_GAP + BREAKPOINT_WIDTHS.tablet + ARTBOARD_GAP },
  ];

  return layouts.map(({ breakpoint, label, xOffset }, i) => ({
    id: uid("artboard"),
    kind: "artboard" as const,
    x: ARTBOARD_START_X + xOffset,
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
  if (selectedNode) {
    const isText = ["heading", "paragraph", "button"].includes(selectedNode.type);
    if (isText) return ["Rewrite this text", "Change font", "Make this darker"];
    return ["Redesign this section", "Add more whitespace", "Change the layout"];
  }
  if (hasArtboards) return ["Add a pricing section", "Tighten the layout", "Improve mobile"];
  return ["Generate a landing page", "Add a hero section", "Change the color scheme"];
}

// ─── Prompt Composer (embedded) ──────────────────────────────────────────────

function PromptComposer({
  textareaRef,
  selectedNode,
}: {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  selectedNode: PageNode | null;
}) {
  const { state, dispatch } = useCanvas();
  const { prompt, items, selection } = state;

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [agentSteps, setAgentSteps] = React.useState<string[]>([]);
  const historyEndRef = React.useRef<HTMLDivElement>(null);

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

  const hasArtboards = items.some((i) => i.kind === "artboard");
  const chips = getSuggestionChips(selectedNode, hasArtboards);

  const refSummary = referenceItems.length > 0
    ? `${referenceItems.length} ref${referenceItems.length !== 1 ? "s" : ""} as context`
    : "No references";

  // Scroll history to bottom on new entry
  React.useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [prompt.history.length]);

  // ── Generation pipeline ────────────────────────────────────────────

  const handleGenerate = React.useCallback(async () => {
    if (!prompt.value.trim()) {
      setError("Add a prompt before generating.");
      return;
    }

    setLoading(true);
    setError(null);
    setAgentSteps(["Analyzing references..."]);

    try {
      // Step 1: Analyze reference images
      const imageUrls = referenceItems.slice(0, 6).map((ref) => ref.imageUrl);

      let tokens = null;

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
        setAgentSteps((s) => [...s, "Extracting design tokens..."]);
        const systemRes = await fetch("/api/canvas/generate-system", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ analysis: analyzeData.analysis, mode: "auto" }),
        });

        if (systemRes.ok) {
          const systemData = await systemRes.json();
          tokens = systemData.tokens;
        }
      }

      // Step 3: Generate component/site
      setAgentSteps((s) => [...s, "Generating layout..."]);
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

      setAgentSteps((s) => [...s, "Building components..."]);

      // Single-variant normalization
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

      // Create artboard items
      const siteId = uid("site");
      const artboards = createArtboardItems(
        chosenVariant.pageTree,
        siteId,
        chosenVariant.compiledCode
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

      dispatch({ type: "REPLACE_SITE", artboards, promptEntry });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
      setAgentSteps([]);
    }
  }, [prompt.value, prompt.siteType, referenceItems, dispatch]);

  // ── Restore from history ───────────────────────────────────────────

  const handleRestore = React.useCallback(
    (run: PromptRun) => {
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
        <span className="font-mono text-[10px] uppercase tracking-widest text-[#A0A0A0]">
          Prompt
        </span>
      </div>

      {/* Scrollable area: history + chips */}
      <div className="flex-1 overflow-y-auto px-3 min-h-0">
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
                    className="text-[11px] text-[#1E5DF2] hover:underline"
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
        {loading ? (
          <div className="space-y-1.5 py-2">
            {/* Agent log steps */}
            {agentSteps.map((step, i) => (
              <div
                key={i}
                className="text-[10px] font-mono text-[#A0A0A0]"
                style={{ animation: "agent-step-fade 300ms ease-out forwards" }}
              >
                {step}
              </div>
            ))}
            <div className="flex items-center gap-2 pt-1">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#1E5DF2]" />
              <span className="text-[11px] font-mono text-[#A0A0A0] animate-pulse">
                GENERATING...
              </span>
            </div>
          </div>
        ) : (
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
                  handleGenerate();
                }
              }}
              placeholder="What would you like to change?"
              rows={1}
              disabled={loading}
              className="w-full border border-[#E5E5E0] rounded-[4px] bg-white px-3 py-2 pr-9 text-[13px] resize-none outline-none transition-colors focus:border-[#D1E4FC] focus:ring-2 focus:ring-[#D1E4FC]/40 disabled:opacity-50"
            />
            <button
              onClick={handleGenerate}
              disabled={loading || !prompt.value.trim()}
              className="absolute right-2 bottom-2 text-[#1E5DF2] hover:bg-[#D1E4FC]/30 rounded-[2px] p-1 disabled:opacity-30 transition-colors"
            >
              <ArrowRight size={14} strokeWidth={1.5} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Panel ──────────────────────────────────────────────────────────────

const MIN_SECTION_HEIGHT = 120;

type InspectorPanelV3Props = {
  projectId?: string;
  promptTextareaRef?: React.RefObject<HTMLTextAreaElement | null>;
};

export function InspectorPanelV3({ projectId, promptTextareaRef }: InspectorPanelV3Props) {
  const { state, dispatch } = useCanvas();
  const { selection, items, prompt } = state;

  const panelRef = React.useRef<HTMLDivElement>(null);
  const internalTextareaRef = React.useRef<HTMLTextAreaElement>(null);
  const textareaRef = promptTextareaRef ?? internalTextareaRef;

  // ── Inspector content logic ────────────────────────────────────────

  const documentColors = React.useMemo(() => {
    const colors: string[] = [];
    for (const item of items) {
      if (item.kind === "reference" && item.extracted?.colors) {
        colors.push(...item.extracted.colors);
      }
    }
    return [...new Set(colors)];
  }, [items]);

  const selectedItems = items.filter((item) =>
    selection.selectedItemIds.includes(item.id)
  );
  const singleSelected: CanvasItem | null =
    selectedItems.length === 1 ? selectedItems[0] : null;

  const activeArtboard = singleSelected?.kind === "artboard" ? singleSelected : null;
  const selectedNode: PageNode | null =
    activeArtboard && selection.selectedNodeId
      ? findNodeById(activeArtboard.pageTree, selection.selectedNodeId)
      : null;

  let inspectorContent: React.ReactNode;

  if (selectedNode && activeArtboard) {
    inspectorContent = (
      <NodeInspector
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
    inspectorContent = <EmptySelection />;
  }

  // ── Scroll-to on node selection ──────────────────────────────────────
  const inspectorScrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!selection.selectedNodeId) return;
    const scrollEl = inspectorScrollRef.current;
    if (!scrollEl) return;
    const target = scrollEl.querySelector("[data-inspector-first-section]");
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selection.selectedNodeId]);

  // ── Split ratio ────────────────────────────────────────────────────

  const hasSelection = selection.selectedItemIds.length > 0;
  const defaultRatio = hasSelection ? 0.6 : 0.4;
  const splitRatio = prompt.splitRatio ?? defaultRatio;

  // Divider drag
  const isDraggingDivider = React.useRef(false);

  const handleDividerPointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      isDraggingDivider.current = true;

      const panel = panelRef.current;
      if (!panel) return;

      const handleMove = (moveEvent: PointerEvent) => {
        if (!isDraggingDivider.current || !panel) return;
        const panelRect = panel.getBoundingClientRect();
        const panelHeight = panelRect.height;
        const pointerY = moveEvent.clientY - panelRect.top;

        // Clamp so both sections are >= MIN_SECTION_HEIGHT
        const minRatio = MIN_SECTION_HEIGHT / panelHeight;
        const maxRatio = 1 - MIN_SECTION_HEIGHT / panelHeight;
        const newRatio = Math.max(minRatio, Math.min(maxRatio, pointerY / panelHeight));

        dispatch({ type: "SET_SPLIT_RATIO", ratio: newRatio });
      };

      const handleUp = () => {
        isDraggingDivider.current = false;
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
      };

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    },
    [dispatch]
  );

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-0 bottom-0 z-20 w-[280px] flex flex-col border-l border-[#E5E5E0] bg-white/95 backdrop-blur-sm"
    >
      {/* Inspector section (top) */}
      <div
        ref={inspectorScrollRef}
        className="overflow-y-auto shrink-0"
        style={{ height: prompt.isOpen ? `${splitRatio * 100}%` : "100%" }}
      >
        <div className="p-4">{inspectorContent}</div>
      </div>

      {/* Divider + Prompt section (bottom) */}
      {prompt.isOpen && (
        <>
          {/* Draggable divider */}
          <div
            className="h-1 cursor-row-resize group relative shrink-0"
            onPointerDown={handleDividerPointerDown}
          >
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-[#E5E5E0] group-hover:h-[2px] group-hover:bg-[#D1E4FC] transition-all" />
          </div>

          {/* Prompt composer section (bottom) */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <PromptComposer
              textareaRef={textareaRef}
              selectedNode={selectedNode}
            />
          </div>
        </>
      )}
    </div>
  );
}
