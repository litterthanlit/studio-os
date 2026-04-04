"use client";

/**
 * InspectorSkeleton — Figma-style grouped inspector sections.
 *
 * Groups are structured by node type:
 *
 *   Container/Section: LAYOUT | SPACING | APPEARANCE
 *   Text:              TYPOGRAPHY | FILL | APPEARANCE
 *   Media:             FILL | APPEARANCE
 *
 * "APPEARANCE" merges the former standalone Radius, Border(+), Shadow(+), and
 * Opacity sections into a single collapsible group — matching Figma's density.
 *
 * No reducer actions, state types, or dispatch functions were changed.
 */

import * as React from "react";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  ArrowDownUp,
  Plus,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvas } from "@/lib/canvas/canvas-context";
import { getNodeStyle, BREAKPOINT_WIDTHS } from "@/lib/canvas/compose";
import {
  InspectorLabel,
  InspectorNumberInput,
  InspectorSelect,
  InspectorColorField,
} from "./InspectorField";
import { InspectorCollapsible } from "./InspectorCollapsible";
import { InspectorSegmented } from "./InspectorSegmented";
import { SpacingDiagram } from "./SpacingDiagram";
import { getFontsByCategory } from "@/lib/canvas/font-library";
import type { ArtboardItem } from "@/lib/canvas/unified-canvas-state";
import type { PageNode, PageNodeStyle } from "@/lib/canvas/compose";

// ─── Helpers ────────────────────────────────────────────────────────────────

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
              ? "bg-[#D1E4FC]/40 text-[#4B57DB]"
              : "bg-[#FAFAF8] text-[#6B6B6B] border border-[#E5E5E0] hover:bg-[#F5F5F0] hover:text-[#1A1A1A]"
          )}
        >
          {opt.icon}
        </button>
      ))}
    </div>
  );
}

// ─── Inline addable sub-section (for Border/Shadow inside Appearance) ────

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
          className="text-[#A0A0A0] hover:text-[#4B57DB] transition-colors"
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

// ─── Node classification ────────────────────────────────────────────────────

function classifyNode(node: PageNode) {
  const isText = ["heading", "paragraph", "button"].includes(node.type);
  const isMedia = node.type === "section" && Boolean(node.content?.mediaUrl);
  const isContainer =
    !isText &&
    !isMedia &&
    [
      "section",
      "page",
      "button-row",
      "feature-grid",
      "metric-row",
      "logo-row",
      "testimonial-grid",
      "pricing-grid",
    ].includes(node.type);

  return { isText, isMedia, isContainer };
}

// ─── InspectorSkeleton ──────────────────────────────────────────────────────

type InspectorSkeletonProps = {
  artboard: ArtboardItem;
  node: PageNode;
  documentColors: string[];
};

export function InspectorSkeleton({
  artboard,
  node,
  documentColors,
}: InspectorSkeletonProps) {
  const { dispatch } = useCanvas();
  const bp = artboard.breakpoint;
  const style = getNodeStyle(node, bp);
  const isNonDesktop = bp !== "desktop";
  const { isText, isMedia, isContainer } = classifyNode(node);

  // Responsive override helpers
  const overrides = isNonDesktop ? node.responsiveOverrides?.[bp] : undefined;

  function hasOverride(property: keyof PageNodeStyle): boolean {
    return isNonDesktop && overrides != null && property in overrides;
  }

  function resetOverride(property: keyof PageNodeStyle) {
    dispatch({
      type: "RESET_NODE_STYLE_OVERRIDE",
      artboardId: artboard.id,
      nodeId: node.id,
      property,
      breakpoint: bp,
    });
  }

  // Debounced history
  const history = useDebouncedHistoryPush(
    (desc) => dispatch({ type: "PUSH_HISTORY", description: desc }),
    400
  );

  const dispatchType = isText ? "UPDATE_TEXT_STYLE_SITE" : "UPDATE_NODE_STYLE";

  function updateStyle(key: string, value: unknown) {
    dispatch({
      type: dispatchType,
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
      type: dispatchType,
      artboardId: artboard.id,
      nodeId: node.id,
      style: stylePatch,
    });
  }

  // ── Border & Shadow "addable" state ──────────────────────────────────

  const hasBorder = Boolean(style.borderColor);
  const hasShadow = style.shadow !== undefined && style.shadow !== "none";

  function addBorder() {
    applyImmediateStyleChange({ borderColor: "#E5E5E0" }, "Added border");
  }

  function removeBorder() {
    applyImmediateStyleChange({ borderColor: undefined }, "Removed border");
  }

  function addShadow() {
    applyImmediateStyleChange({ shadow: "soft" }, "Added shadow");
  }

  function removeShadow() {
    applyImmediateStyleChange({ shadow: "none" }, "Removed shadow");
  }

  return (
    <div data-inspector-first-section>
      {/* ── BREAKPOINT LABEL ─────────────────────────────────────────── */}
      {isNonDesktop && (
        <div className="px-4 pt-3 pb-1">
          <span className="text-[10px] uppercase tracking-[1px] text-[#8A8A8A] font-mono">
            Mobile ({BREAKPOINT_WIDTHS[bp]}px)
          </span>
        </div>
      )}

      {/* ── LAYOUT (containers only) ─────────────────────────────────── */}
      {isContainer && (
        <InspectorCollapsible label="Layout">
          <InspectorLabel
            hasOverride={hasOverride("direction")}
            onResetOverride={() => resetOverride("direction")}
          >
            Direction
          </InspectorLabel>
          <InspectorSegmented
            value={style.direction || "column"}
            options={[
              { value: "column", label: "Column" },
              { value: "row", label: "Row" },
            ]}
            onChange={(v) => {
              dispatch({ type: "PUSH_HISTORY", description: "Changed direction" });
              dispatch({
                type: "UPDATE_NODE_STYLE",
                artboardId: artboard.id,
                nodeId: node.id,
                style: { direction: v as "row" | "column" },
              });
            }}
          />

          <div className="mt-1.5">
            <InspectorLabel
              hasOverride={hasOverride("align")}
              onResetOverride={() => resetOverride("align")}
            >
              Align
            </InspectorLabel>
            <IconToggleGroup
              value={style.align || "left"}
              onChange={(v) => {
                dispatch({ type: "PUSH_HISTORY", description: "Changed alignment" });
                dispatch({
                  type: "UPDATE_NODE_STYLE",
                  artboardId: artboard.id,
                  nodeId: node.id,
                  style: { align: v as PageNodeStyle["align"] },
                });
              }}
              options={[
                { value: "left", icon: <AlignLeft size={14} />, title: "Start" },
                { value: "center", icon: <AlignCenter size={14} />, title: "Center" },
                { value: "right", icon: <AlignRight size={14} />, title: "End" },
              ]}
            />
          </div>

          <div className="mt-1.5">
            <InspectorLabel
              hasOverride={hasOverride("justify")}
              onResetOverride={() => resetOverride("justify")}
            >
              Justify
            </InspectorLabel>
            <IconToggleGroup
              value={style.justify || "start"}
              onChange={(v) => {
                dispatch({ type: "PUSH_HISTORY", description: "Changed justify" });
                dispatch({
                  type: "UPDATE_NODE_STYLE",
                  artboardId: artboard.id,
                  nodeId: node.id,
                  style: { justify: v as PageNodeStyle["justify"] },
                });
              }}
              options={[
                { value: "start", icon: <AlignStartVertical size={14} />, title: "Start" },
                { value: "center", icon: <AlignCenterVertical size={14} />, title: "Center" },
                { value: "end", icon: <AlignEndVertical size={14} />, title: "End" },
                { value: "between", icon: <ArrowDownUp size={14} />, title: "Space Between" },
              ]}
            />
          </div>

          <div className="mt-1.5">
            <InspectorLabel
              hasOverride={hasOverride("maxWidth")}
              onResetOverride={() => resetOverride("maxWidth")}
            >
              Max Width
            </InspectorLabel>
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
      )}

      {/* ── SPACING (containers only) ────────────────────────────────── */}
      {isContainer && (
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
      )}

      {/* ── TYPOGRAPHY (text nodes only) — labeled, compact, scannable ── */}
      {isText && (
        <InspectorCollapsible label="Typography">
          {/* Single wrapper with tight 6px gaps between rows */}
          <div className="space-y-1.5">
          {/* Row 1: Font family — full width with label */}
          <div className="space-y-0.5">
            <span className="text-[9px] text-[#A0A0A0] font-mono uppercase tracking-wider">Font</span>
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
          </div>

          {/* Row 2: Weight + Size — labeled */}
          <div className="grid grid-cols-[1fr_60px] gap-1.5">
            <div className="space-y-0.5">
              <span className="text-[9px] text-[#A0A0A0] font-mono uppercase tracking-wider">Weight</span>
              <InspectorSelect
                value={String(style.fontWeight ?? "")}
                onChange={(e) => {
                  const val = (e.target as HTMLSelectElement).value;
                  updateStyle("fontWeight", val ? Number(val) : undefined);
                }}
              >
                <option value="">Auto</option>
                <option value="300">Light</option>
                <option value="400">Regular</option>
                <option value="500">Medium</option>
                <option value="600">Semi</option>
                <option value="700">Bold</option>
              </InspectorSelect>
            </div>
            <div className="space-y-0.5">
              <span className="text-[9px] text-[#A0A0A0] font-mono uppercase tracking-wider">Size</span>
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
          </div>

          {/* Row 3: Line Height + Tracking — labeled, no icon symbols */}
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
                  updateStyle("lineHeight", val ? Number(val) : undefined);
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
                  updateStyle("letterSpacing", val ? Number(val) : undefined);
                }}
                onBlur={() => history.flush()}
              />
            </div>
          </div>

          {/* Row 4: Align + Style — labeled */}
          <div className="grid grid-cols-2 gap-1.5">
            <div className="space-y-0.5">
              <span className="text-[9px] text-[#A0A0A0] font-mono uppercase tracking-wider">Align</span>
              <IconToggleGroup
                value={style.align || "left"}
                onChange={(v) => {
                  applyImmediateStyleChange(
                    { align: v as PageNodeStyle["align"] },
                    "Changed text alignment"
                  );
                }}
                options={[
                  { value: "left", icon: <AlignLeft size={14} />, title: "Left" },
                  { value: "center", icon: <AlignCenter size={14} />, title: "Center" },
                  { value: "right", icon: <AlignRight size={14} />, title: "Right" },
                ]}
              />
            </div>
            <div className="space-y-0.5">
              <span className="text-[9px] text-[#A0A0A0] font-mono uppercase tracking-wider">Style</span>
              <div className="flex gap-0.5">
                <button
                  type="button"
                  title="Bold"
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-[2px] text-[12px] font-bold transition-colors",
                    (style.fontWeight ?? 400) >= 700
                      ? "bg-[#D1E4FC]/40 text-[#4B57DB]"
                      : "bg-[#FAFAF8] text-[#6B6B6B] border border-[#E5E5E0] hover:bg-[#F5F5F0] hover:text-[#1A1A1A]"
                  )}
                  onClick={() => {
                    applyImmediateStyleChange(
                      { fontWeight: (style.fontWeight ?? 400) >= 700 ? 400 : 700 },
                      "Toggled bold"
                    );
                  }}
                >
                  B
                </button>
                <button
                  type="button"
                  title="Italic"
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-[2px] text-[12px] font-medium transition-colors",
                    style.fontStyle === "italic"
                      ? "bg-[#D1E4FC]/40 text-[#4B57DB]"
                      : "bg-[#FAFAF8] text-[#6B6B6B] border border-[#E5E5E0] hover:bg-[#F5F5F0] hover:text-[#1A1A1A]"
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
                  title="Underline"
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-[2px] text-[12px] font-medium transition-colors",
                    style.textDecoration === "underline"
                      ? "bg-[#D1E4FC]/40 text-[#4B57DB]"
                      : "bg-[#FAFAF8] text-[#6B6B6B] border border-[#E5E5E0] hover:bg-[#F5F5F0] hover:text-[#1A1A1A]"
                  )}
                  style={{ textDecoration: "underline" }}
                  onClick={() => {
                    applyImmediateStyleChange(
                      { textDecoration: style.textDecoration === "underline" ? "none" : "underline" },
                      "Toggled underline"
                    );
                  }}
                >
                  U
                </button>
              </div>
            </div>
          </div>
          </div>{/* end space-y-1.5 wrapper */}
        </InspectorCollapsible>
      )}

      {/* ── FILL ─────────────────────────────────────────────────────── */}
      {/* Text nodes: text color under "Fill" */}
      {isText && (
        <InspectorCollapsible label="Fill">
          <InspectorLabel
            hasOverride={hasOverride("foreground")}
            onResetOverride={() => resetOverride("foreground")}
          >
            Color
          </InspectorLabel>
          <InspectorColorField
            color={style.foreground || "#1A1A1A"}
            documentColors={documentColors}
            onCommit={() => history.flush()}
            onChange={(c) => updateStyle("foreground", c)}
          />
        </InspectorCollapsible>
      )}

      {/* Container/media nodes: background color under "Fill" */}
      {(isContainer || isMedia) && (
        <InspectorCollapsible label="Fill">
          <InspectorLabel
            hasOverride={hasOverride("background")}
            onResetOverride={() => resetOverride("background")}
          >
            Background
          </InspectorLabel>
          <InspectorColorField
            color={style.background || ""}
            documentColors={documentColors}
            onCommit={() => history.flush()}
            onChange={(c) => updateStyle("background", c)}
          />
        </InspectorCollapsible>
      )}

      {/* ── APPEARANCE ───────────────────────────────────────────────── */}
      {/* Merges: Background (text only), Opacity, Radius, Border(+), Shadow(+) */}
      <InspectorCollapsible label="Appearance">
        {/* Background — only for text nodes (containers have it in Fill above) */}
        {isText && (
          <div>
            <InspectorLabel
              hasOverride={hasOverride("background")}
              onResetOverride={() => resetOverride("background")}
            >
              Background
            </InspectorLabel>
            <InspectorColorField
              color={style.background || ""}
              documentColors={documentColors}
              onCommit={() => history.flush()}
              onChange={(c) => updateStyle("background", c)}
            />
          </div>
        )}

        {/* Opacity */}
        <div>
          <InspectorLabel
            hasOverride={hasOverride("opacity")}
            onResetOverride={() => resetOverride("opacity")}
          >
            Opacity
          </InspectorLabel>
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
                updateStyle("opacity", undefined);
              } else {
                const pct = Math.min(100, Math.max(0, Number(val)));
                updateStyle("opacity", pct >= 100 ? undefined : pct / 100);
              }
            }}
            onBlur={() => history.flush()}
          />
          <span className="text-[10px] text-[#A0A0A0] font-mono mt-0.5 block">%</span>
        </div>

        {/* Radius */}
        {isContainer && (
          <div>
            <InspectorLabel
              hasOverride={hasOverride("borderRadius")}
              onResetOverride={() => resetOverride("borderRadius")}
            >
              Radius
            </InspectorLabel>
            <InspectorNumberInput
              value={style.borderRadius ?? 0}
              min={0}
              max={100}
              step={1}
              placeholder="0"
              className="w-full"
              onChange={(e) => {
                const val = (e.target as HTMLInputElement).value;
                const num = val ? Number(val) : 0;
                updateStyle("borderRadius", num === 0 ? undefined : num);
                history.flush();
              }}
              onBlur={() => history.flush()}
            />
          </div>
        )}

        {/* Border (+) — inline addable */}
        <InlineAddableRow
          label="Border"
          hasValue={hasBorder}
          onAdd={addBorder}
          onRemove={removeBorder}
        >
          <InspectorColorField
            color={style.borderColor || "#E5E5E0"}
            documentColors={documentColors}
            onCommit={() => history.flush()}
            onChange={(c) => updateStyle("borderColor", c)}
          />
        </InlineAddableRow>

        {/* Shadow (+) — inline addable */}
        <InlineAddableRow
          label="Shadow"
          hasValue={hasShadow}
          onAdd={addShadow}
          onRemove={removeShadow}
        >
          <InspectorSegmented
            value={style.shadow || "soft"}
            options={[
              { value: "soft", label: "Soft" },
              { value: "medium", label: "Medium" },
            ]}
            onChange={(v) => {
              applyImmediateStyleChange(
                { shadow: v as PageNodeStyle["shadow"] },
                "Changed shadow"
              );
            }}
          />
        </InlineAddableRow>
      </InspectorCollapsible>

      {/* ── VISIBILITY (non-desktop only) ────────────────────────────── */}
      {isNonDesktop && (
        <InspectorCollapsible label="Visibility">
          <label className="flex items-center justify-between py-1 cursor-pointer">
            <span className="text-[12px] text-[#1A1A1A]">Hide on Mobile</span>
            <input
              type="checkbox"
              checked={node.hidden?.mobile ?? false}
              onChange={() =>
                dispatch({
                  type: "TOGGLE_NODE_HIDDEN",
                  artboardId: artboard.id,
                  nodeId: node.id,
                  breakpoint: "mobile",
                })
              }
              className="accent-[#4B57DB] w-3.5 h-3.5 cursor-pointer"
            />
          </label>
        </InspectorCollapsible>
      )}
    </div>
  );
}
