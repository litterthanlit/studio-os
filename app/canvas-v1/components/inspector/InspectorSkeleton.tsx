"use client";

/**
 * InspectorSkeleton — stable section ordering regardless of node type.
 *
 * Renders ALL 8 sections in a fixed order. Each section internally checks
 * the node type to decide what controls to show. The section ORDER never
 * changes — this is the Paper.design "same panel shell, different controls
 * per selection" pattern.
 *
 * Section order:
 *   1. LAYOUT      2. SPACING      3. TYPOGRAPHY    4. FILL
 *   5. RADIUS      6. BORDER (+)   7. SHADOW (+)    8. OPACITY
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvas } from "@/lib/canvas/canvas-context";
import { getNodeStyle, BREAKPOINT_WIDTHS } from "@/lib/canvas/compose";
import {
  InspectorLabel,
  InspectorNumberInput,
  InspectorSelect,
  InspectorColorField,
  InspectorRow,
} from "./InspectorField";
import { InspectorCollapsible } from "./InspectorCollapsible";
import { InspectorSegmented } from "./InspectorSegmented";
import { SpacingDiagram } from "./SpacingDiagram";
import { AddableSection } from "./AddableSection";
import type { ArtboardItem, Breakpoint } from "@/lib/canvas/unified-canvas-state";
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
              ? "bg-[#D1E4FC]/40 text-[#1E5DF2]"
              : "text-[#A0A0A0] hover:bg-[#F5F5F0]"
          )}
        >
          {opt.icon}
        </button>
      ))}
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
          <span className="text-[10px] uppercase tracking-widest text-[#A0A0A0] font-mono">
            {bp === "tablet" ? "Tablet" : "Mobile"} ({BREAKPOINT_WIDTHS[bp]}px)
          </span>
        </div>
      )}

      {/* ── 1. LAYOUT ────────────────────────────────────────────────── */}
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

      {/* For text/media nodes: show a collapsed layout header only */}
      {(isText || isMedia) && (
        <InspectorCollapsible label="Layout" defaultOpen={false}>
          <span className="text-[11px] text-[#A0A0A0]">
            Controlled by parent container
          </span>
        </InspectorCollapsible>
      )}

      {/* ── 2. SPACING ───────────────────────────────────────────────── */}
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

      {(isText || isMedia) && (
        <InspectorCollapsible label="Spacing" defaultOpen={false}>
          <span className="text-[11px] text-[#A0A0A0]">
            Set on parent container
          </span>
        </InspectorCollapsible>
      )}

      {/* ── 3. TYPOGRAPHY ────────────────────────────────────────────── */}
      {isText && (
        <InspectorCollapsible label="Typography">
          <InspectorLabel
            hasOverride={hasOverride("fontFamily")}
            onResetOverride={() => resetOverride("fontFamily")}
          >
            Font Family
          </InspectorLabel>
          <InspectorSelect
            value={style.fontFamily || ""}
            onChange={(e) => {
              updateStyle("fontFamily", (e.target as HTMLSelectElement).value || undefined);
            }}
          >
            <option value="">Default</option>
            <option value="'Inter', sans-serif">Inter</option>
            <option value="'Instrument Serif', serif">Bespoke Serif</option>
            <option value="'IBM Plex Mono', monospace">IBM Plex Mono</option>
          </InspectorSelect>

          <InspectorRow className="mt-1.5">
            <div>
              <InspectorLabel
                hasOverride={hasOverride("fontWeight")}
                onResetOverride={() => resetOverride("fontWeight")}
              >
                Weight
              </InspectorLabel>
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
              <InspectorLabel
                hasOverride={hasOverride("fontSize")}
                onResetOverride={() => resetOverride("fontSize")}
              >
                Size
              </InspectorLabel>
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

          <InspectorRow className="mt-1.5">
            <div>
              <InspectorLabel
                hasOverride={hasOverride("letterSpacing")}
                onResetOverride={() => resetOverride("letterSpacing")}
              >
                Tracking
              </InspectorLabel>
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
              <InspectorLabel
                hasOverride={hasOverride("lineHeight")}
                onResetOverride={() => resetOverride("lineHeight")}
              >
                Leading
              </InspectorLabel>
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

          {/* Text align */}
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

          {/* B / I / U toggles */}
          <div className="mt-1.5 flex gap-1.5">
            <button
              type="button"
              className={cn(
                "border rounded-[2px] px-2.5 py-1.5 text-[12px] font-bold transition-colors",
                (style.fontWeight ?? 400) >= 700
                  ? "bg-[#D1E4FC]/40 text-[#1E5DF2] border-[#D1E4FC]"
                  : "border-[#E5E5E0] text-[#6B6B6B] hover:border-[#D1E4FC] hover:text-[#1E5DF2]"
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
              className={cn(
                "border rounded-[2px] px-2.5 py-1.5 text-[12px] font-medium transition-colors",
                style.fontStyle === "italic"
                  ? "bg-[#D1E4FC]/40 text-[#1E5DF2] border-[#D1E4FC]"
                  : "border-[#E5E5E0] text-[#6B6B6B] hover:border-[#D1E4FC] hover:text-[#1E5DF2]"
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
                  ? "bg-[#D1E4FC]/40 text-[#1E5DF2] border-[#D1E4FC]"
                  : "border-[#E5E5E0] text-[#6B6B6B] hover:border-[#D1E4FC] hover:text-[#1E5DF2]"
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

          {/* Text color — lives in Typography, not Fill */}
          <div className="mt-1.5">
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
          </div>
        </InspectorCollapsible>
      )}

      {/* Non-text nodes: collapsed typography header */}
      {!isText && (
        <InspectorCollapsible label="Typography" defaultOpen={false}>
          <span className="text-[11px] text-[#A0A0A0]">
            Select a text element
          </span>
        </InspectorCollapsible>
      )}

      {/* ── 4. FILL ──────────────────────────────────────────────────── */}
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

      {/* ── 5. RADIUS ────────────────────────────────────────────────── */}
      <InspectorCollapsible label="Radius" defaultOpen={isContainer}>
        <InspectorLabel
          hasOverride={hasOverride("borderRadius")}
          onResetOverride={() => resetOverride("borderRadius")}
        >
          Corner Radius
        </InspectorLabel>
        <InspectorNumberInput
          value={style.borderRadius ?? ""}
          placeholder="0"
          className="w-[60px]"
          onChange={(e) => {
            const val = (e.target as HTMLInputElement).value;
            updateStyle("borderRadius", val ? Number(val) : undefined);
          }}
          onBlur={() => history.flush()}
        />
      </InspectorCollapsible>

      {/* ── 6. BORDER (+) ────────────────────────────────────────────── */}
      <AddableSection
        title="Border"
        hasValue={hasBorder}
        onAdd={addBorder}
        onRemove={removeBorder}
      >
        <InspectorLabel>Color</InspectorLabel>
        <InspectorColorField
          color={style.borderColor || "#E5E5E0"}
          documentColors={documentColors}
          onCommit={() => history.flush()}
          onChange={(c) => updateStyle("borderColor", c)}
        />
      </AddableSection>

      {/* ── 7. SHADOW (+) ────────────────────────────────────────────── */}
      <AddableSection
        title="Shadow"
        hasValue={hasShadow}
        onAdd={addShadow}
        onRemove={removeShadow}
      >
        <InspectorLabel>Style</InspectorLabel>
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
      </AddableSection>

      {/* ── 8. OPACITY ───────────────────────────────────────────────── */}
      <InspectorCollapsible label="Opacity">
        <InspectorLabel
          hasOverride={hasOverride("opacity")}
          onResetOverride={() => resetOverride("opacity")}
        >
          Opacity
        </InspectorLabel>
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
      </InspectorCollapsible>

      {/* ── VISIBILITY (non-desktop only) ────────────────────────────── */}
      {isNonDesktop && (
        <InspectorCollapsible label="Visibility">
          <label className="flex items-center justify-between py-1 cursor-pointer">
            <span className="text-[12px] text-[#1A1A1A]">Hide on Tablet</span>
            <input
              type="checkbox"
              checked={node.hidden?.tablet ?? false}
              onChange={() =>
                dispatch({
                  type: "TOGGLE_NODE_HIDDEN",
                  artboardId: artboard.id,
                  nodeId: node.id,
                  breakpoint: "tablet",
                })
              }
              className="accent-[#1E5DF2] w-3.5 h-3.5 cursor-pointer"
            />
          </label>
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
              className="accent-[#1E5DF2] w-3.5 h-3.5 cursor-pointer"
            />
          </label>
        </InspectorCollapsible>
      )}
    </div>
  );
}
