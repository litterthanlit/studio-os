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
import { GridTemplatePicker } from "./GridTemplatePicker";
import { InspectorCollapsible } from "./InspectorCollapsible";
import { InspectorSegmented } from "./InspectorSegmented";
import { BreakpointBadge } from "./BreakpointBadge";
import { getFontsByCategory } from "@/lib/canvas/font-library";
import type { ArtboardItem } from "@/lib/canvas/unified-canvas-state";
import type { DesignNode, DesignNodeStyle, Breakpoint } from "@/lib/canvas/design-node";
import { findDesignNodeParent } from "@/lib/canvas/design-node";
import { isDesignNodeTree } from "@/lib/canvas/compose";

// ── Helpers ─────────────────────────────────────────────────────────────────

function useDebouncedHistoryBurst(
  pushHistory: (description: string) => void,
  delay: number
) {
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const burstActiveRef = React.useRef(false);
  const callbackRef = React.useRef(pushHistory);

  React.useEffect(() => {
    callbackRef.current = pushHistory;
  }, [pushHistory]);

  const begin = React.useCallback(
    (description: string) => {
      if (!burstActiveRef.current) {
        callbackRef.current(description);
        burstActiveRef.current = true;
      }
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        burstActiveRef.current = false;
        timerRef.current = null;
      }, delay);
    },
    [delay]
  );

  const flush = React.useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    burstActiveRef.current = false;
  }, []);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      burstActiveRef.current = false;
    };
  }, []);

  return { begin, flush };
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

// ── Inherited typography resolver ────────────────────────────────────────────

type ResolvedTypography = {
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  isInherited: { fontFamily: boolean; fontWeight: boolean; fontSize: boolean };
};

/** Walk up the DesignNode tree to resolve inherited typography values. */
function resolveInheritedTypography(
  node: DesignNode,
  tree: DesignNode
): ResolvedTypography {
  const result: ResolvedTypography = {
    fontFamily: node.style.fontFamily || "",
    fontWeight: node.style.fontWeight ?? 0,
    fontSize: node.style.fontSize ?? 0,
    isInherited: {
      fontFamily: !node.style.fontFamily,
      fontWeight: node.style.fontWeight == null,
      fontSize: node.style.fontSize == null,
    },
  };

  // Walk up parents to find inherited values
  let current = node;
  while (result.fontFamily === "" || result.fontWeight === 0 || result.fontSize === 0) {
    const parent = findDesignNodeParent(tree, current.id);
    if (!parent) break;

    if (result.fontFamily === "" && parent.style.fontFamily) {
      result.fontFamily = parent.style.fontFamily;
    }
    if (result.fontWeight === 0 && parent.style.fontWeight != null) {
      result.fontWeight = parent.style.fontWeight;
    }
    if (result.fontSize === 0 && parent.style.fontSize != null) {
      result.fontSize = parent.style.fontSize;
    }
    current = parent;
  }

  // Browser defaults if nothing found in the tree
  if (result.fontWeight === 0) result.fontWeight = 400;
  if (result.fontSize === 0) result.fontSize = 16;

  return result;
}

// ── Node classification ─────────────────────────────────────────────────────

function classifyDesignNode(node: DesignNode) {
  switch (node.type) {
    case "frame":
      return { showSize: true, showLayout: true, showSpacing: true, showTypography: false, showFill: true, showAppearance: true };
    case "text":
      return { showSize: true, showLayout: false, showSpacing: true, showTypography: true, showFill: true, showAppearance: true };
    case "image":
      return { showSize: true, showLayout: false, showSpacing: false, showTypography: false, showFill: true, showAppearance: true };
    case "button":
      return { showSize: true, showLayout: false, showSpacing: false, showTypography: true, showFill: true, showAppearance: true };
    case "divider":
      return { showSize: false, showLayout: false, showSpacing: false, showTypography: false, showFill: false, showAppearance: true };
    default:
      return { showSize: false, showLayout: false, showSpacing: false, showTypography: false, showFill: false, showAppearance: true };
  }
}

// ── Sizing mode helper ───────────────────────────────────────────────────────

type SizingMode = "fixed" | "fill" | "hug";

function getSizingMode(value: number | "hug" | "fill" | undefined): SizingMode {
  if (value === "fill") return "fill";
  if (value === "hug") return "hug";
  if (typeof value === "number") return "fixed";
  return "hug";
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
  const { dispatch, state: canvasState } = useCanvas();
  const zoom = canvasState.viewport.zoom || 1;
  const style = node.style;
  const sections = classifyDesignNode(node);

  // ── Breakpoint override helpers ──
  const breakpoint: Breakpoint = artboard.breakpoint;
  const isNonDesktop = breakpoint !== "desktop";
  const overrides = node.responsiveOverrides?.[breakpoint];

  function hasOverride(property: keyof DesignNodeStyle): boolean {
    if (!isNonDesktop || !overrides) return false;
    return (overrides as Record<string, unknown>)[property] !== undefined;
  }

  function resetOverride(property: keyof DesignNodeStyle) {
    dispatch({
      type: "RESET_NODE_STYLE_OVERRIDE",
      artboardId: artboard.id,
      nodeId: node.id,
      breakpoint,
      property,
    });
  }

  // Resolve inherited typography from parent chain
  const tree = isDesignNodeTree(artboard.pageTree) ? artboard.pageTree : null;
  const resolved = React.useMemo(
    () => tree ? resolveInheritedTypography(node, tree) : null,
    [node, tree]
  );

  // Debounced history
  const history = useDebouncedHistoryBurst(
    (desc) => dispatch({ type: "PUSH_HISTORY", description: desc }),
    400
  );

  function updateStyle(patch: Partial<DesignNodeStyle>) {
    history.begin(`Styled ${node.type}`);
    dispatch({
      type: "UPDATE_NODE_STYLE",
      artboardId: artboard.id,
      nodeId: node.id,
      style: patch as Record<string, unknown>,
    });
  }

  function applyImmediate(patch: Partial<DesignNodeStyle>, description: string) {
    history.flush();
    dispatch({ type: "PUSH_HISTORY", description });
    dispatch({
      type: "UPDATE_NODE_STYLE",
      artboardId: artboard.id,
      nodeId: node.id,
      style: patch as Record<string, unknown>,
    });
  }

  function updatePadding(side: "top" | "right" | "bottom" | "left", value: number | undefined) {
    history.begin(`Styled ${node.type} padding`);
    dispatch({
      type: "UPDATE_NODE_STYLE",
      artboardId: artboard.id,
      nodeId: node.id,
      style: { padding: { ...node.style.padding, [side]: value } } as Record<string, unknown>,
    });
  }

  // ── Border addable state ──
  const hasBorder = Boolean(style.borderColor);

  function addBorder() {
    applyImmediate({ borderColor: "#E5E5E0", borderWidth: 1 }, "Added border");
  }
  function removeBorder() {
    applyImmediate({ borderColor: undefined, borderWidth: undefined }, "Removed border");
  }

  // ── Position mode ──
  const isBreakout = style.position === "absolute";

  function togglePositionMode(mode: string) {
    if (mode === "absolute") {
      // Preserve the current static-position offset when possible by not
      // inventing explicit coordinates in the inspector. The renderer can
      // later measure and persist exact x/y if needed.
      applyImmediate(
        { position: "absolute", x: style.x, y: style.y, zIndex: style.zIndex ?? 1 },
        "Switched to breakout"
      );
    } else {
      applyImmediate(
        { position: "relative", x: undefined, y: undefined, zIndex: undefined },
        "Switched to flow"
      );
    }
  }

  return (
    <div data-inspector-first-section>
      {isNonDesktop && (
        <div className="mb-2">
          <BreakpointBadge breakpoint={breakpoint} width={artboard.width} />
        </div>
      )}
      {/* ── POSITION ─────────────────────────────────────────────────── */}
      <InspectorCollapsible label="Position">
        <div className="space-y-1.5">
          <div className="space-y-0.5">
            <InspectorLabel hasOverride={hasOverride("position")} onResetOverride={() => resetOverride("position")}>Mode</InspectorLabel>
            <InspectorSegmented
              value={isBreakout ? "absolute" : "relative"}
              options={[
                { value: "relative", label: "Flow" },
                { value: "absolute", label: "Breakout" },
              ]}
              onChange={togglePositionMode}
            />
          </div>

          {isBreakout && (
            <>
              <div className="grid grid-cols-2 gap-1.5">
                <div className="space-y-0.5">
                  <InspectorLabel hasOverride={hasOverride("x")} onResetOverride={() => resetOverride("x")}>X</InspectorLabel>
                  <InspectorNumberInput
                    value={style.x ?? 0}
                    placeholder="0"
                    className="w-full"
                    onChange={(e) => {
                      const val = (e.target as HTMLInputElement).value;
                      updateStyle({ x: val ? Number(val) : 0 });
                    }}
                    onBlur={() => history.flush()}
                  />
                </div>
                <div className="space-y-0.5">
                  <InspectorLabel hasOverride={hasOverride("y")} onResetOverride={() => resetOverride("y")}>Y</InspectorLabel>
                  <InspectorNumberInput
                    value={style.y ?? 0}
                    placeholder="0"
                    className="w-full"
                    onChange={(e) => {
                      const val = (e.target as HTMLInputElement).value;
                      updateStyle({ y: val ? Number(val) : 0 });
                    }}
                    onBlur={() => history.flush()}
                  />
                </div>
              </div>
              <div className="space-y-0.5">
                <InspectorLabel hasOverride={hasOverride("zIndex")} onResetOverride={() => resetOverride("zIndex")}>Z-Index</InspectorLabel>
                <InspectorNumberInput
                  value={style.zIndex ?? 1}
                  placeholder="1"
                  min={0}
                  className="w-full"
                  onChange={(e) => {
                    const val = (e.target as HTMLInputElement).value;
                    updateStyle({ zIndex: val ? Number(val) : undefined });
                  }}
                  onBlur={() => history.flush()}
                />
              </div>
            </>
          )}
        </div>
      </InspectorCollapsible>

      {/* ── SIZE ──────────────────────────────────────────────────────── */}
      {sections.showSize && (
        <InspectorCollapsible label="Size">
          <div className="space-y-1.5">
            {/* Width */}
            <div className="flex items-center gap-1.5">
              <InspectorLabel hasOverride={hasOverride("width")} onResetOverride={() => resetOverride("width")}>W</InspectorLabel>
              <InspectorSegmented
                value={getSizingMode(style.width)}
                options={[
                  { value: "fixed", label: "Fixed" },
                  { value: "fill", label: "Fill" },
                  { value: "hug", label: "Hug" },
                ]}
                onChange={(mode) => {
                  if (mode === "fill") {
                    applyImmediate({ width: "fill" }, "Set width to Fill");
                  } else if (mode === "hug") {
                    applyImmediate({ width: "hug" }, "Set width to Hug");
                  } else {
                    const el = document.querySelector(`[data-node-id="${node.id}"]`);
                    const measured = el ? Math.round(el.getBoundingClientRect().width / zoom) : 200;
                    applyImmediate({ width: measured }, "Set width to Fixed");
                  }
                }}
              />
              {getSizingMode(style.width) === "fixed" ? (
                <InspectorNumberInput
                  value={typeof style.width === "number" ? style.width : ""}
                  placeholder="0"
                  min={0}
                  className="w-[60px]"
                  onChange={(e) => {
                    const val = (e.target as HTMLInputElement).value;
                    updateStyle({ width: val ? Number(val) : 0 });
                  }}
                  onBlur={() => history.flush()}
                />
              ) : (
                <div className="w-[60px] px-2 py-[3px] text-[11px] text-[#A0A0A0] bg-[#F5F5F0] border border-[#E5E5E0] rounded-[2px] text-right">
                  {getSizingMode(style.width) === "fill" ? "Fill" : "Hug"}
                </div>
              )}
            </div>

            {/* Height */}
            <div className="flex items-center gap-1.5">
              <InspectorLabel hasOverride={hasOverride("height")} onResetOverride={() => resetOverride("height")}>H</InspectorLabel>
              <InspectorSegmented
                value={getSizingMode(style.height)}
                options={[
                  { value: "fixed", label: "Fixed" },
                  { value: "fill", label: "Fill" },
                  { value: "hug", label: "Hug" },
                ]}
                onChange={(mode) => {
                  if (mode === "fill") {
                    applyImmediate({ height: "fill" }, "Set height to Fill");
                  } else if (mode === "hug") {
                    applyImmediate({ height: "hug" }, "Set height to Hug");
                  } else {
                    const el = document.querySelector(`[data-node-id="${node.id}"]`);
                    const measured = el ? Math.round(el.getBoundingClientRect().height / zoom) : 200;
                    applyImmediate({ height: measured }, "Set height to Fixed");
                  }
                }}
              />
              {getSizingMode(style.height) === "fixed" ? (
                <InspectorNumberInput
                  value={typeof style.height === "number" ? style.height : ""}
                  placeholder="0"
                  min={0}
                  className="w-[60px]"
                  onChange={(e) => {
                    const val = (e.target as HTMLInputElement).value;
                    updateStyle({ height: val ? Number(val) : 0 });
                  }}
                  onBlur={() => history.flush()}
                />
              ) : (
                <div className="w-[60px] px-2 py-[3px] text-[11px] text-[#A0A0A0] bg-[#F5F5F0] border border-[#E5E5E0] rounded-[2px] text-right">
                  {getSizingMode(style.height) === "fill" ? "Fill" : "Hug"}
                </div>
              )}
            </div>
          </div>
        </InspectorCollapsible>
      )}

      {/* ── LAYOUT (frame only) ──────────────────────────────────────── */}
      {sections.showLayout && (
        <InspectorCollapsible label="Layout">
          <div className="space-y-1.5">
            {/* Display */}
            <div className="space-y-0.5">
              <InspectorLabel hasOverride={hasOverride("display")} onResetOverride={() => resetOverride("display")}>Display</InspectorLabel>
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
                <InspectorLabel hasOverride={hasOverride("flexDirection")} onResetOverride={() => resetOverride("flexDirection")}>Direction</InspectorLabel>
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
                <InspectorLabel hasOverride={hasOverride("gridTemplate")} onResetOverride={() => resetOverride("gridTemplate")}>Grid Template</InspectorLabel>
                <GridTemplatePicker
                  value={style.gridTemplate || ""}
                  onChange={(v) => updateStyle({ gridTemplate: v })}
                  onCommit={() => history.flush()}
                />
              </div>
            )}

            {/* Align Items */}
            <div className="space-y-0.5">
              <InspectorLabel hasOverride={hasOverride("alignItems")} onResetOverride={() => resetOverride("alignItems")}>Align</InspectorLabel>
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
              <InspectorLabel hasOverride={hasOverride("justifyContent")} onResetOverride={() => resetOverride("justifyContent")}>Justify</InspectorLabel>
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
              <InspectorLabel hasOverride={hasOverride("gap")} onResetOverride={() => resetOverride("gap")}>Gap</InspectorLabel>
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
            <InspectorLabel hasOverride={hasOverride("padding")} onResetOverride={() => resetOverride("padding")}>Padding</InspectorLabel>
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
              <InspectorLabel hasOverride={hasOverride("fontFamily")} onResetOverride={() => resetOverride("fontFamily")}>
                Font{resolved?.isInherited.fontFamily ? <span className="text-[#1E5DF2] ml-1">*</span> : null}
              </InspectorLabel>
              <InspectorSelect
                value={style.fontFamily || resolved?.fontFamily || ""}
                onChange={(e) => {
                  updateStyle({ fontFamily: (e.target as HTMLSelectElement).value || undefined });
                }}
              >
                {!style.fontFamily && resolved?.fontFamily ? (
                  <option value={resolved.fontFamily}>{resolved.fontFamily} (inherited)</option>
                ) : (
                  <option value="">Default</option>
                )}
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
                <InspectorLabel hasOverride={hasOverride("fontWeight")} onResetOverride={() => resetOverride("fontWeight")}>
                  Weight{resolved?.isInherited.fontWeight ? <span className="text-[#1E5DF2] ml-1">*</span> : null}
                </InspectorLabel>
                <InspectorNumberInput
                  value={style.fontWeight ?? resolved?.fontWeight ?? ""}
                  placeholder="400"
                  min={100}
                  max={900}
                  step={100}
                  className={cn("w-full", resolved?.isInherited.fontWeight && style.fontWeight == null && "text-[#A0A0A0]")}
                  onChange={(e) => {
                    const val = (e.target as HTMLInputElement).value;
                    updateStyle({ fontWeight: val ? Number(val) : undefined });
                  }}
                  onBlur={() => history.flush()}
                />
              </div>
              <div className="space-y-0.5">
                <InspectorLabel hasOverride={hasOverride("fontSize")} onResetOverride={() => resetOverride("fontSize")}>
                  Size{resolved?.isInherited.fontSize ? <span className="text-[#1E5DF2] ml-1">*</span> : null}
                </InspectorLabel>
                <InspectorNumberInput
                  value={style.fontSize ?? resolved?.fontSize ?? ""}
                  placeholder="16"
                  min={1}
                  className={cn("w-full", resolved?.isInherited.fontSize && style.fontSize == null && "text-[#A0A0A0]")}
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
                <InspectorLabel hasOverride={hasOverride("lineHeight")} onResetOverride={() => resetOverride("lineHeight")}>Height</InspectorLabel>
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
                <InspectorLabel hasOverride={hasOverride("letterSpacing")} onResetOverride={() => resetOverride("letterSpacing")}>Tracking</InspectorLabel>
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
              <InspectorLabel hasOverride={hasOverride("textAlign")} onResetOverride={() => resetOverride("textAlign")}>Align</InspectorLabel>
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
                <InspectorLabel hasOverride={hasOverride("fontStyle")} onResetOverride={() => resetOverride("fontStyle")}>Style</InspectorLabel>
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
                <InspectorLabel hasOverride={hasOverride("textDecoration")} onResetOverride={() => resetOverride("textDecoration")}>Decoration</InspectorLabel>
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
              <InspectorLabel hasOverride={hasOverride("background")} onResetOverride={() => resetOverride("background")}>Background</InspectorLabel>
              <InspectorColorField
                color={style.background || ""}
                documentColors={documentColors}
                onCommit={() => history.flush()}
                onChange={(c) => updateStyle({ background: c })}
              />
            </div>

            {/* Foreground */}
            <div>
              <InspectorLabel hasOverride={hasOverride("foreground")} onResetOverride={() => resetOverride("foreground")}>Foreground</InspectorLabel>
              <InspectorColorField
                color={style.foreground || ""}
                documentColors={documentColors}
                onCommit={() => history.flush()}
                onChange={(c) => updateStyle({ foreground: c })}
              />
            </div>

            {/* Cover Image (frame only) */}
            {node.type === "frame" && (
              <InlineAddableRow
                label="Cover Image"
                hasValue={Boolean(style.coverImage)}
                onAdd={() => applyImmediate({ coverImage: "https://", coverSize: "cover" }, "Added cover image")}
                onRemove={() => applyImmediate({ coverImage: undefined, coverSize: undefined, coverPosition: undefined, scrimEnabled: undefined }, "Removed cover image")}
              >
                <div className="space-y-1.5">
                  {/* URL */}
                  <InspectorLabel hasOverride={hasOverride("coverImage")} onResetOverride={() => resetOverride("coverImage")}>URL</InspectorLabel>
                  <InspectorTextInput
                    value={style.coverImage || ""}
                    placeholder="https://..."
                    onChange={(e) => updateStyle({ coverImage: (e.target as HTMLInputElement).value || undefined })}
                    onBlur={() => history.flush()}
                  />

                  {/* Preview thumbnail */}
                  {style.coverImage && style.coverImage !== "https://" && (
                    <div
                      className="w-full h-[80px] rounded-[2px] border border-[#E5E5E0] overflow-hidden bg-[#F5F5F0]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={style.coverImage}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    </div>
                  )}

                  {/* Cover Size */}
                  <div>
                    <InspectorLabel hasOverride={hasOverride("coverSize")} onResetOverride={() => resetOverride("coverSize")}>Size</InspectorLabel>
                    <InspectorSegmented
                      value={style.coverSize || "cover"}
                      options={[
                        { value: "cover", label: "Cover" },
                        { value: "contain", label: "Contain" },
                      ]}
                      onChange={(v) => applyImmediate({ coverSize: v as "cover" | "contain" }, "Changed cover size")}
                    />
                  </div>

                  {/* Cover Position */}
                  <div>
                    <InspectorLabel hasOverride={hasOverride("coverPosition")} onResetOverride={() => resetOverride("coverPosition")}>Position</InspectorLabel>
                    <InspectorTextInput
                      value={style.coverPosition || ""}
                      placeholder="center"
                      onChange={(e) => updateStyle({ coverPosition: (e.target as HTMLInputElement).value || undefined })}
                      onBlur={() => history.flush()}
                    />
                  </div>

                  {/* Scrim */}
                  <div>
                    <InspectorLabel hasOverride={hasOverride("scrimEnabled")} onResetOverride={() => resetOverride("scrimEnabled")}>Scrim</InspectorLabel>
                    <InspectorSegmented
                      value={style.scrimEnabled === true ? "on" : style.scrimEnabled === false ? "off" : "auto"}
                      options={[
                        { value: "auto", label: "Auto" },
                        { value: "on", label: "On" },
                        { value: "off", label: "Off" },
                      ]}
                      onChange={(v) => {
                        const val = v === "auto" ? undefined : v === "on";
                        applyImmediate({ scrimEnabled: val }, "Changed scrim");
                      }}
                    />
                  </div>
                </div>
              </InlineAddableRow>
            )}
          </div>
        </InspectorCollapsible>
      )}

      {/* ── APPEARANCE (all types) ───────────────────────────────────── */}
      {sections.showAppearance && (
        <InspectorCollapsible label="Appearance">
          {node.type !== "divider" && (
            <div>
              <InspectorLabel hasOverride={hasOverride("borderRadius")} onResetOverride={() => resetOverride("borderRadius")}>Radius</InspectorLabel>
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
          )}

          {node.type === "divider" ? (
            <div>
              <InspectorLabel hasOverride={hasOverride("borderColor")} onResetOverride={() => resetOverride("borderColor")}>Line Color</InspectorLabel>
              <InspectorColorField
                color={style.borderColor || "rgba(0,0,0,0.1)"}
                documentColors={documentColors}
                onCommit={() => history.flush()}
                onChange={(c) => updateStyle({ borderColor: c })}
              />
            </div>
          ) : (
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
                  <InspectorLabel hasOverride={hasOverride("borderWidth")} onResetOverride={() => resetOverride("borderWidth")}>Width</InspectorLabel>
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
          )}

          {node.type !== "divider" && (
            <div>
              <InspectorLabel hasOverride={hasOverride("shadow")} onResetOverride={() => resetOverride("shadow")}>Shadow</InspectorLabel>
              <InspectorTextInput
                value={style.shadow || ""}
                placeholder="0 4px 12px rgba(0,0,0,0.08)"
                onChange={(e) => updateStyle({ shadow: (e.target as HTMLInputElement).value || undefined })}
                onBlur={() => history.flush()}
              />
            </div>
          )}

          {/* Opacity */}
          <div>
            <InspectorLabel hasOverride={hasOverride("opacity")} onResetOverride={() => resetOverride("opacity")}>Opacity</InspectorLabel>
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
