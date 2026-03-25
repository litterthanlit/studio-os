"use client";

/**
 * DesignNodeInspector — V6 DesignNode property inspector.
 *
 * Displays and edits DesignNodeStyle properties for the 5 universal
 * node types: frame, text, image, button, divider.
 *
 * Mirrors InspectorSkeleton's UI patterns (collapsible sections,
 * shared field primitives, debounced history) but targets the
 * DesignNodeStyle model instead of PageNodeStyle.
 */

import * as React from "react";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Plus,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvas } from "@/lib/canvas/canvas-context";
import {
  InspectorLabel,
  InspectorNumberInput,
  InspectorSelect,
  InspectorColorField,
  InspectorTextInput,
} from "./InspectorField";
import { InspectorCollapsible } from "./InspectorCollapsible";
import { InspectorSegmented } from "./InspectorSegmented";
import { getFontsByCategory } from "@/lib/canvas/font-library";
import type { ArtboardItem } from "@/lib/canvas/unified-canvas-state";
import type { DesignNode, DesignNodeStyle } from "@/lib/canvas/design-node";

// ── Helpers ─────────────────────────────────────────────────────────────────

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

// ── Inline addable row (for Border inside Appearance) ───────────────────────

function InlineAddableRow({
  label,
  hasValue,
  onAdd,
  onRemove,
  children,
}: {
  label: string;
  hasValue: boolean;
  onAdd: () => void;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  if (!hasValue) {
    return (
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wide text-[#8A8A8A] font-mono">
          {label}
        </span>
        <button
          type="button"
          onClick={onAdd}
          className="text-[#A0A0A0] hover:text-[#1E5DF2] transition-colors"
        >
          <Plus size={12} />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wide text-[#8A8A8A] font-mono">
          {label}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="text-[#A0A0A0] hover:text-red-500 transition-colors"
        >
          <Minus size={12} />
        </button>
      </div>
      {children}
    </div>
  );
}

// ── Node classification ─────────────────────────────────────────────────────

function classifyDesignNode(node: DesignNode) {
  switch (node.type) {
    case "frame":
      return { showLayout: true, showSpacing: true, showTypography: false, showFill: true, showAppearance: true };
    case "text":
      return { showLayout: false, showSpacing: true, showTypography: true, showFill: true, showAppearance: true };
    case "image":
      return { showLayout: false, showSpacing: false, showTypography: false, showFill: true, showAppearance: true };
    case "button":
      return { showLayout: false, showSpacing: false, showTypography: true, showFill: true, showAppearance: true };
    case "divider":
      return { showLayout: false, showSpacing: false, showTypography: false, showFill: false, showAppearance: true };
    default:
      return { showLayout: false, showSpacing: false, showTypography: false, showFill: false, showAppearance: true };
  }
}

// ── DesignNodeInspector ─────────────────────────────────────────────────────

type DesignNodeInspectorProps = {
  artboard: ArtboardItem;
  node: DesignNode;
  documentColors: string[];
};

export function DesignNodeInspector({
  artboard,
  node,
  documentColors,
}: DesignNodeInspectorProps) {
  const { dispatch } = useCanvas();
  const style = node.style;
  const sections = classifyDesignNode(node);

  // Debounced history
  const history = useDebouncedHistoryPush(
    (desc) => dispatch({ type: "PUSH_HISTORY", description: desc }),
    400
  );

  function updateStyle(patch: Partial<DesignNodeStyle>) {
    dispatch({
      type: "UPDATE_NODE_STYLE",
      artboardId: artboard.id,
      nodeId: node.id,
      style: patch as Record<string, unknown>,
    });
    history.schedule(`Styled ${node.type}`);
  }

  function applyImmediate(patch: Partial<DesignNodeStyle>, description: string) {
    dispatch({ type: "PUSH_HISTORY", description });
    dispatch({
      type: "UPDATE_NODE_STYLE",
      artboardId: artboard.id,
      nodeId: node.id,
      style: patch as Record<string, unknown>,
    });
  }

  function updatePadding(side: "top" | "right" | "bottom" | "left", value: number | undefined) {
    dispatch({
      type: "UPDATE_NODE_STYLE",
      artboardId: artboard.id,
      nodeId: node.id,
      style: { padding: { ...node.style.padding, [side]: value } } as Record<string, unknown>,
    });
    history.schedule(`Styled ${node.type} padding`);
  }

  // ── Border addable state ──
  const hasBorder = Boolean(style.borderColor);

  function addBorder() {
    applyImmediate({ borderColor: "#E5E5E0", borderWidth: 1 }, "Added border");
  }
  function removeBorder() {
    applyImmediate({ borderColor: undefined, borderWidth: undefined }, "Removed border");
  }

  return (
    <div data-inspector-first-section>
      {/* ── LAYOUT (frame only) ──────────────────────────────────────── */}
      {sections.showLayout && (
        <InspectorCollapsible label="Layout">
          <div className="space-y-1.5">
            {/* Display */}
            <div className="space-y-0.5">
              <span className="text-[9px] text-[#A0A0A0] font-mono uppercase tracking-wider">Display</span>
              <InspectorSegmented
                value={style.display || "flex"}
                options={[
                  { value: "flex", label: "Flex" },
                  { value: "grid", label: "Grid" },
                ]}
                onChange={(v) => applyImmediate({ display: v as "flex" | "grid" }, "Changed display")}
              />
            </div>

            {/* Flex Direction (only when flex) */}
            {(style.display || "flex") === "flex" && (
              <div className="space-y-0.5">
                <span className="text-[9px] text-[#A0A0A0] font-mono uppercase tracking-wider">Direction</span>
                <InspectorSegmented
                  value={style.flexDirection || "column"}
                  options={[
                    { value: "row", label: "Row" },
                    { value: "column", label: "Column" },
                  ]}
                  onChange={(v) => applyImmediate({ flexDirection: v as "row" | "column" }, "Changed direction")}
                />
              </div>
            )}

            {/* Grid Template (only when grid) */}
            {style.display === "grid" && (
              <div className="space-y-0.5">
                <span className="text-[9px] text-[#A0A0A0] font-mono uppercase tracking-wider">Grid Template</span>
                <InspectorTextInput
                  value={style.gridTemplate || ""}
                  placeholder="repeat(3, 1fr)"
                  onChange={(e) => updateStyle({ gridTemplate: (e.target as HTMLInputElement).value || undefined })}
                  onBlur={() => history.flush()}
                />
              </div>
            )}

            {/* Align Items */}
            <div className="space-y-0.5">
              <span className="text-[9px] text-[#A0A0A0] font-mono uppercase tracking-wider">Align</span>
              <InspectorSegmented
                value={style.alignItems || "stretch"}
                options={[
                  { value: "flex-start", label: "Start" },
                  { value: "center", label: "Center" },
                  { value: "flex-end", label: "End" },
                  { value: "stretch", label: "Stretch" },
                ]}
                onChange={(v) => applyImmediate({ alignItems: v as DesignNodeStyle["alignItems"] }, "Changed align")}
              />
            </div>

            {/* Justify Content */}
            <div className="space-y-0.5">
              <span className="text-[9px] text-[#A0A0A0] font-mono uppercase tracking-wider">Justify</span>
              <InspectorSegmented
                value={style.justifyContent || "flex-start"}
                options={[
                  { value: "flex-start", label: "Start" },
                  { value: "center", label: "Center" },
                  { value: "flex-end", label: "End" },
                  { value: "space-between", label: "Between" },
                ]}
                onChange={(v) => applyImmediate({ justifyContent: v as DesignNodeStyle["justifyContent"] }, "Changed justify")}
              />
            </div>

            {/* Gap */}
            <div className="space-y-0.5">
              <span className="text-[9px] text-[#A0A0A0] font-mono uppercase tracking-wider">Gap</span>
              <InspectorNumberInput
                value={style.gap ?? ""}
                placeholder="0"
                min={0}
                className="w-full"
                onChange={(e) => {
                  const val = (e.target as HTMLInputElement).value;
                  updateStyle({ gap: val ? Number(val) : undefined });
                }}
                onBlur={() => history.flush()}
              />
            </div>
          </div>
        </InspectorCollapsible>
      )}

      {/* ── SPACING (frame + text) ───────────────────────────────────── */}
      {sections.showSpacing && (
        <InspectorCollapsible label="Spacing">
          <div className="space-y-1.5">
            <span className="text-[9px] text-[#A0A0A0] font-mono uppercase tracking-wider">Padding</span>
            <div className="grid grid-cols-4 gap-1.5">
              {(["top", "right", "bottom", "left"] as const).map((side) => (
                <div key={side} className="space-y-0.5">
                  <span className="text-[9px] text-[#A0A0A0] font-mono uppercase tracking-wider text-center block">
                    {side[0]!.toUpperCase()}
                  </span>
                  <InspectorNumberInput
                    value={style.padding?.[side] ?? ""}
                    placeholder="0"
                    min={0}
                    className="w-full"
                    onChange={(e) => {
                      const val = (e.target as HTMLInputElement).value;
                      updatePadding(side, val ? Number(val) : undefined);
                    }}
                    onBlur={() => history.flush()}
                  />
                </div>
              ))}
            </div>
          </div>
        </InspectorCollapsible>
      )}

      {/* ── TYPOGRAPHY (text + button) ───────────────────────────────── */}
      {sections.showTypography && (
        <InspectorCollapsible label="Typography">
          <div className="space-y-1.5">
            {/* Font Family */}
            <div className="space-y-0.5">
              <span className="text-[9px] text-[#A0A0A0] font-mono uppercase tracking-wider">Font</span>
              <InspectorSelect
                value={style.fontFamily || ""}
                onChange={(e) => {
                  updateStyle({ fontFamily: (e.target as HTMLSelectElement).value || undefined });
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
            </div>

            {/* Weight + Size */}
            <div className="grid grid-cols-[1fr_60px] gap-1.5">
              <div className="space-y-0.5">
                <span className="text-[9px] text-[#A0A0A0] font-mono uppercase tracking-wider">Weight</span>
                <InspectorNumberInput
                  value={style.fontWeight ?? ""}
                  placeholder="400"
                  min={100}
                  max={900}
                  step={100}
                  className="w-full"
                  onChange={(e) => {
                    const val = (e.target as HTMLInputElement).value;
                    updateStyle({ fontWeight: val ? Number(val) : undefined });
                  }}
                  onBlur={() => history.flush()}
                />
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] text-[#A0A0A0] font-mono uppercase tracking-wider">Size</span>
                <InspectorNumberInput
                  value={style.fontSize ?? ""}
                  placeholder="16"
                  min={1}
                  className="w-full"
                  onChange={(e) => {
                    const val = (e.target as HTMLInputElement).value;
                    updateStyle({ fontSize: val ? Number(val) : undefined });
                  }}
                  onBlur={() => history.flush()}
                />
              </div>
            </div>

            {/* Line Height + Letter Spacing */}
            <div className="grid grid-cols-2 gap-1.5">
              <div className="space-y-0.5">
                <span className="text-[9px] text-[#A0A0A0] font-mono uppercase tracking-wider">Height</span>
                <InspectorNumberInput
                  value={style.lineHeight ?? ""}
                  placeholder="Auto"
                  step={0.1}
                  className="w-full"
                  onChange={(e) => {
                    const val = (e.target as HTMLInputElement).value;
                    updateStyle({ lineHeight: val ? Number(val) : undefined });
                  }}
                  onBlur={() => history.flush()}
                />
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] text-[#A0A0A0] font-mono uppercase tracking-wider">Tracking</span>
                <InspectorNumberInput
                  value={style.letterSpacing ?? ""}
                  placeholder="0"
                  step={0.1}
                  className="w-full"
                  onChange={(e) => {
                    const val = (e.target as HTMLInputElement).value;
                    updateStyle({ letterSpacing: val ? Number(val) : undefined });
                  }}
                  onBlur={() => history.flush()}
                />
              </div>
            </div>

            {/* Text Align */}
            <div className="space-y-0.5">
              <span className="text-[9px] text-[#A0A0A0] font-mono uppercase tracking-wider">Align</span>
              <div className="flex gap-0.5">
                {[
                  { value: "left" as const, icon: <AlignLeft size={14} />, title: "Left" },
                  { value: "center" as const, icon: <AlignCenter size={14} />, title: "Center" },
                  { value: "right" as const, icon: <AlignRight size={14} />, title: "Right" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    title={opt.title}
                    onClick={() => applyImmediate({ textAlign: opt.value }, "Changed text align")}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-[2px] transition-colors",
                      style.textAlign === opt.value
                        ? "bg-[#D1E4FC]/40 text-[#1E5DF2]"
                        : "bg-[#FAFAF8] text-[#6B6B6B] border border-[#E5E5E0] hover:bg-[#F5F5F0] hover:text-[#1A1A1A]"
                    )}
                  >
                    {opt.icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Style + Text Decoration */}
            <div className="grid grid-cols-2 gap-1.5">
              <div className="space-y-0.5">
                <span className="text-[9px] text-[#A0A0A0] font-mono uppercase tracking-wider">Style</span>
                <InspectorSegmented
                  value={style.fontStyle || "normal"}
                  options={[
                    { value: "normal", label: "Normal" },
                    { value: "italic", label: "Italic" },
                  ]}
                  onChange={(v) => applyImmediate({ fontStyle: v as "normal" | "italic" }, "Changed font style")}
                />
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] text-[#A0A0A0] font-mono uppercase tracking-wider">Decoration</span>
                <InspectorSegmented
                  value={style.textDecoration || "none"}
                  options={[
                    { value: "none", label: "None" },
                    { value: "underline", label: "Underline" },
                  ]}
                  onChange={(v) => applyImmediate({ textDecoration: v as "none" | "underline" }, "Changed decoration")}
                />
              </div>
            </div>
          </div>
        </InspectorCollapsible>
      )}

      {/* ── FILL ─────────────────────────────────────────────────────── */}
      {sections.showFill && (
        <InspectorCollapsible label="Fill">
          <div className="space-y-2">
            {/* Background */}
            <div>
              <InspectorLabel>Background</InspectorLabel>
              <InspectorColorField
                color={style.background || ""}
                documentColors={documentColors}
                onCommit={() => history.flush()}
                onChange={(c) => updateStyle({ background: c })}
              />
            </div>

            {/* Foreground */}
            <div>
              <InspectorLabel>Foreground</InspectorLabel>
              <InspectorColorField
                color={style.foreground || ""}
                documentColors={documentColors}
                onCommit={() => history.flush()}
                onChange={(c) => updateStyle({ foreground: c })}
              />
            </div>

            {/* Cover Image URL (frame only, shown when coverImage is set) */}
            {node.type === "frame" && style.coverImage != null && (
              <div>
                <InspectorLabel>Cover Image</InspectorLabel>
                <InspectorTextInput
                  value={style.coverImage || ""}
                  placeholder="https://..."
                  onChange={(e) => updateStyle({ coverImage: (e.target as HTMLInputElement).value || undefined })}
                  onBlur={() => history.flush()}
                />
              </div>
            )}
          </div>
        </InspectorCollapsible>
      )}

      {/* ── APPEARANCE (all types) ───────────────────────────────────── */}
      {sections.showAppearance && (
        <InspectorCollapsible label="Appearance">
          {/* Border Radius */}
          <div>
            <InspectorLabel>Radius</InspectorLabel>
            <InspectorNumberInput
              value={style.borderRadius ?? ""}
              min={0}
              max={999}
              step={1}
              placeholder="0"
              className="w-full"
              onChange={(e) => {
                const val = (e.target as HTMLInputElement).value;
                updateStyle({ borderRadius: val ? Number(val) : undefined });
              }}
              onBlur={() => history.flush()}
            />
          </div>

          {/* Border (+) */}
          <InlineAddableRow
            label="Border"
            hasValue={hasBorder}
            onAdd={addBorder}
            onRemove={removeBorder}
          >
            <div className="space-y-1.5">
              <InspectorColorField
                color={style.borderColor || "#E5E5E0"}
                documentColors={documentColors}
                onCommit={() => history.flush()}
                onChange={(c) => updateStyle({ borderColor: c })}
              />
              <div>
                <InspectorLabel>Width</InspectorLabel>
                <InspectorNumberInput
                  value={style.borderWidth ?? 1}
                  min={0}
                  max={20}
                  step={1}
                  placeholder="1"
                  className="w-full"
                  onChange={(e) => {
                    const val = (e.target as HTMLInputElement).value;
                    updateStyle({ borderWidth: val ? Number(val) : undefined });
                  }}
                  onBlur={() => history.flush()}
                />
              </div>
            </div>
          </InlineAddableRow>

          {/* Shadow */}
          <div>
            <InspectorLabel>Shadow</InspectorLabel>
            <InspectorTextInput
              value={style.shadow || ""}
              placeholder="0 4px 12px rgba(0,0,0,0.08)"
              onChange={(e) => updateStyle({ shadow: (e.target as HTMLInputElement).value || undefined })}
              onBlur={() => history.flush()}
            />
          </div>

          {/* Opacity */}
          <div>
            <InspectorLabel>Opacity</InspectorLabel>
            <InspectorNumberInput
              value={style.opacity != null ? Math.round((style.opacity ?? 1) * 100) : 100}
              min={0}
              max={100}
              step={1}
              placeholder="100"
              className="w-full"
              onChange={(e) => {
                const val = (e.target as HTMLInputElement).value;
                if (val === "") {
                  updateStyle({ opacity: undefined });
                } else {
                  const pct = Math.min(100, Math.max(0, Number(val)));
                  updateStyle({ opacity: pct >= 100 ? undefined : pct / 100 });
                }
              }}
              onBlur={() => history.flush()}
            />
            <span className="text-[10px] text-[#A0A0A0] font-mono mt-0.5 block">%</span>
          </div>
        </InspectorCollapsible>
      )}
    </div>
  );
}
