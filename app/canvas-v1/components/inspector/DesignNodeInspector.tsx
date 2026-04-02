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
      {/* ── POSITION ─────────────────────────────────────────────────── */}
      <InspectorCollapsible label="Position">
        <div className="space-y-1.5">
          <div className="space-y-0.5">
            <span className="text-[9px] text-[#A0A0A0] font-mono uppercase tracking-wider">Mode</span>
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
                  <span className="text-[9px] text-[#A0A0A0] font-mono uppercase tracking-wider">X</span>
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
                  <span className="text-[9px] text-[#A0A0A0] font-mono uppercase tracking-wider">Y</span>
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
                <span className="text-[9px] text-[#A0A0A0] font-mono uppercase tracking-wider">Z-Index</span>
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
              <span className="text-[9px] text-[#A0A0A0] font-mono uppercase tracking-wider">
                Font{resolved?.isInherited.fontFamily ? <span className="text-[#1E5DF2] ml-1">*</span> : null}
              </span>
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
                <span className="text-[9px] text-[#A0A0A0] font-mono uppercase tracking-wider">
                  Weight{resolved?.isInherited.fontWeight ? <span className="text-[#1E5DF2] ml-1">*</span> : null}
                </span>
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
                <span className="text-[9px] text-[#A0A0A0] font-mono uppercase tracking-wider">
                  Size{resolved?.isInherited.fontSize ? <span className="text-[#1E5DF2] ml-1">*</span> : null}
                </span>
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
                  <InspectorLabel>URL</InspectorLabel>
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
                    <InspectorLabel>Size</InspectorLabel>
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
                    <InspectorLabel>Position</InspectorLabel>
                    <InspectorTextInput
                      value={style.coverPosition || ""}
                      placeholder="center"
                      onChange={(e) => updateStyle({ coverPosition: (e.target as HTMLInputElement).value || undefined })}
                      onBlur={() => history.flush()}
                    />
                  </div>

                  {/* Scrim */}
                  <div>
                    <InspectorLabel>Scrim</InspectorLabel>
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
          )}

          {node.type === "divider" ? (
            <div>
              <InspectorLabel>Line Color</InspectorLabel>
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
          )}

          {node.type !== "divider" && (
            <div>
              <InspectorLabel>Shadow</InspectorLabel>
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
