"use client";

/**
 * V3 Inspector Panel — single scrollable property panel that adapts by selection type.
 *
 * Replaces the 4-tab inspector. No tabs, one scroll.
 * Content → Typography → Colors → Spacing → Size → AI.
 */

import * as React from "react";
import { useCanvas } from "@/lib/canvas/canvas-context";
import { findNodeById } from "@/lib/canvas/compose";
import { ColorPickerPopover } from "./ColorPickerPopover";
import type {
  CanvasItem,
  ReferenceItem,
  ArtboardItem,
  NoteItem,
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

// ─── Sub-panels ──────────────────────────────────────────────────────────────

function EmptySelection({ projectId }: { projectId?: string }) {
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
        <div>
          <FieldLabel>W</FieldLabel>
          <input type="number" value={Math.round(item.width)} className={numInputCls} onChange={(e) => {
            dispatch({ type: "PUSH_HISTORY", description: "Resized reference" });
            dispatch({ type: "UPDATE_ITEM", itemId: item.id, changes: { width: Number(e.target.value) } });
          }} />
        </div>
        <div>
          <FieldLabel>H</FieldLabel>
          <input type="number" value={Math.round(item.height)} className={numInputCls} onChange={(e) => {
            dispatch({ type: "PUSH_HISTORY", description: "Resized reference" });
            dispatch({ type: "UPDATE_ITEM", itemId: item.id, changes: { height: Number(e.target.value) } });
          }} />
        </div>
      </div>

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

  // Debounced content update
  const debouncedUpdate = useDebouncedCallback((...args: unknown[]) => {
    const key = args[0] as string;
    const value = args[1] as string;
    dispatch({ type: "PUSH_HISTORY", description: `Edited ${node.type} ${key}` });
    dispatch({
      type: "UPDATE_NODE",
      artboardId: artboard.id,
      nodeId: node.id,
      changes: { content: { ...content, [key]: value } },
    });
  }, 400);

  // Debounced style update
  const debouncedStyleUpdate = useDebouncedCallback((...args: unknown[]) => {
    const key = args[0] as string;
    const value = args[1];
    dispatch({ type: "PUSH_HISTORY", description: `Styled ${node.type}` });
    dispatch({
      type: "UPDATE_NODE_STYLE",
      artboardId: artboard.id,
      nodeId: node.id,
      style: { [key]: value } as Partial<PageNodeStyle>,
    });
  }, 400);

  const [textDraft, setTextDraft] = React.useState(content.text || "");
  const [aiPrompt, setAiPrompt] = React.useState("");

  React.useEffect(() => {
    setTextDraft(content.text || "");
  }, [content.text]);

  return (
    <div className="space-y-1">
      <span className="font-mono text-[10px] uppercase tracking-widest text-[#A0A0A0]">
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
              debouncedUpdate("text", e.target.value);
            }}
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
              onChange={(e) => debouncedUpdate("mediaUrl", e.target.value)}
            />
            <input
              type="text"
              value={content.mediaAlt || ""}
              placeholder="Alt text"
              className={inputCls}
              onChange={(e) => debouncedUpdate("mediaAlt", e.target.value)}
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
            onChange={(e) => debouncedStyleUpdate("fontFamily", e.target.value)}
            className={inputCls}
          >
            <option value="">Default</option>
            <option value="'Inter', sans-serif">Inter</option>
            <option value="'Instrument Serif', serif">Bespoke Serif</option>
            <option value="'Geist Mono', monospace">Geist Mono</option>
          </select>

          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <FieldLabel>Size</FieldLabel>
              <input
                type="number"
                value={style.fontSize ?? ""}
                placeholder="auto"
                className={numInputCls}
                onChange={(e) => debouncedStyleUpdate("fontSize", e.target.value ? Number(e.target.value) : undefined)}
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
                onChange={(e) => debouncedStyleUpdate("fontWeight", e.target.value ? Number(e.target.value) : undefined)}
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
                onChange={(e) => debouncedStyleUpdate("lineHeight", e.target.value ? Number(e.target.value) : undefined)}
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
                onChange={(e) => debouncedStyleUpdate("letterSpacing", e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>
          </div>

          {/* Text color */}
          <FieldRow>
            <FieldLabel>Col</FieldLabel>
            <ColorSwatch
              color={style.foreground || "#1A1A1A"}
              documentColors={documentColors}
              onChange={(c) => {
                dispatch({ type: "PUSH_HISTORY", description: "Changed text color" });
                dispatch({ type: "UPDATE_NODE_STYLE", artboardId: artboard.id, nodeId: node.id, style: { foreground: c } });
              }}
            />
            <input
              type="text"
              value={style.foreground || "#1A1A1A"}
              className={numInputCls + " flex-1"}
              onChange={(e) => debouncedStyleUpdate("foreground", e.target.value)}
            />
          </FieldRow>
        </>
      )}

      {/* FILL */}
      <SectionHeader>Fill</SectionHeader>
      <FieldRow>
        <ColorSwatch
          color={style.background || "transparent"}
          documentColors={documentColors}
          onChange={(c) => {
            dispatch({ type: "PUSH_HISTORY", description: "Changed background" });
            dispatch({ type: "UPDATE_NODE_STYLE", artboardId: artboard.id, nodeId: node.id, style: { background: c } });
          }}
        />
        <input
          type="text"
          value={style.background || ""}
          placeholder="none"
          className={numInputCls + " flex-1"}
          onChange={(e) => debouncedStyleUpdate("background", e.target.value)}
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
            onChange={(e) => debouncedStyleUpdate("paddingY", e.target.value ? Number(e.target.value) : undefined)}
          />
          <div className="flex items-center gap-1">
            {/* Left */}
            <input
              type="number"
              value={style.paddingX ?? ""}
              placeholder="0"
              className={numInputCls + " w-16 text-center"}
              onChange={(e) => debouncedStyleUpdate("paddingX", e.target.value ? Number(e.target.value) : undefined)}
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
            onChange={(e) => debouncedStyleUpdate("maxWidth", e.target.value ? Number(e.target.value) : undefined)}
          />
        </div>
        <div>
          <FieldLabel>H</FieldLabel>
          <input
            type="number"
            value={style.minHeight ?? ""}
            placeholder="fit"
            className={numInputCls}
            onChange={(e) => debouncedStyleUpdate("minHeight", e.target.value ? Number(e.target.value) : undefined)}
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

// ─── Main Panel ──────────────────────────────────────────────────────────────

export function InspectorPanelV3({ projectId }: { projectId?: string }) {
  const { state } = useCanvas();
  const { selection, items } = state;

  // Collect document colors from all reference extracted data
  const documentColors = React.useMemo(() => {
    const colors: string[] = [];
    for (const item of items) {
      if (item.kind === "reference" && item.extracted?.colors) {
        colors.push(...item.extracted.colors);
      }
    }
    // Deduplicate
    return [...new Set(colors)];
  }, [items]);

  // Determine what's selected
  const selectedItems = items.filter((item) =>
    selection.selectedItemIds.includes(item.id)
  );
  const singleSelected: CanvasItem | null =
    selectedItems.length === 1 ? selectedItems[0] : null;

  // If a node is selected within an artboard
  const activeArtboard = singleSelected?.kind === "artboard" ? singleSelected : null;
  const selectedNode: PageNode | null =
    activeArtboard && selection.selectedNodeId
      ? findNodeById(activeArtboard.pageTree, selection.selectedNodeId)
      : null;

  // Render the appropriate sub-panel
  let content: React.ReactNode;

  if (selectedNode && activeArtboard) {
    content = (
      <NodeInspector
        artboard={activeArtboard}
        node={selectedNode}
        documentColors={documentColors}
      />
    );
  } else if (singleSelected?.kind === "reference") {
    content = <ReferenceInspector item={singleSelected} />;
  } else if (singleSelected?.kind === "artboard") {
    content = <ArtboardInspector item={singleSelected} />;
  } else {
    content = <EmptySelection projectId={projectId} />;
  }

  return (
    <div className="absolute right-0 top-0 bottom-0 z-20 w-[280px] overflow-y-auto border-l border-[#E5E5E0] bg-white/95 backdrop-blur-sm">
      <div className="p-4">{content}</div>
    </div>
  );
}
