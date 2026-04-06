"use client";

/**
 * DesignNodeInspector — Framer-style property inspector.
 *
 * Two-column layout with 32px row height, embedded rule headers,
 * and visual box model for spacing.
 */

import * as React from "react";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Plus,
  Minus,
  Maximize2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvas } from "@/lib/canvas/canvas-context";
import {
  InspectorFieldRow,
  InspectorNumberInput,
  InspectorSelect,
  InspectorColorField,
  InspectorTextInput,
} from "./InspectorField";
import { GridTemplatePicker } from "./GridTemplatePicker";
import { SectionRule } from "./SectionRule";
import { InspectorSegmented, InspectorSegmentedSmall } from "./InspectorSegmented";
import { BreakpointBadge } from "./BreakpointBadge";
import { SpacingDiagram } from "./SpacingDiagram";
import { getFontsByCategory } from "@/lib/canvas/font-library";
import type { ArtboardItem } from "@/lib/canvas/unified-canvas-state";
import type { DesignNode, DesignNodeStyle, Breakpoint } from "@/lib/canvas/design-node";
import { findDesignNodeParent, findDesignNodeById, ALLOWED_STYLE_FIELDS } from "@/lib/canvas/design-node";
import type { NodeOverride } from "@/lib/canvas/design-node";
import { findMaster, splitCompositeId, filterAllowedOverrides } from "@/lib/canvas/component-resolver";
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

// ── Inherited typography resolver ────────────────────────────────────────────

type ResolvedTypography = {
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  isInherited: { fontFamily: boolean; fontWeight: boolean; fontSize: boolean };
};

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
      fontSize: !node.style.fontSize,
    },
  };

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

// ── Instance Banners ────────────────────────────────────────────────────────

function InstanceRootBanner({
  context,
  onEditMaster,
  onDetach,
}: {
  context: { master: import("@/lib/canvas/design-node").ComponentMaster | null; isStale: boolean };
  onEditMaster: () => void;
  onDetach: () => void;
}) {
  const [confirming, setConfirming] = React.useState(false);
  React.useEffect(() => {
    if (confirming) {
      const t = setTimeout(() => setConfirming(false), 3000);
      return () => clearTimeout(t);
    }
  }, [confirming]);
  return (
    <div className="px-4 py-3 border-b border-[#EFEFEC]">
      <div className="flex items-center gap-2">
        <span className="text-[13px] font-medium text-[#1A1A1A]">{context.master?.name}</span>
        <span className="text-[11px] text-[#A0A0A0]">Component Instance</span>
      </div>
      <div className="flex gap-2 mt-2">
        <button onClick={onEditMaster} className="text-[12px] text-[#6B6B6B] border border-[#E5E5E0] rounded-[4px] px-2 py-1 hover:border-[#D1E4FC] hover:text-[#4B57DB]">
          Edit Master
        </button>
        <button
          onClick={() => confirming ? onDetach() : setConfirming(true)}
          className="text-[12px] border border-[#E5E5E0] rounded-[4px] px-2 py-1"
          style={{ color: confirming ? "#EF4444" : "#6B6B6B" }}
        >
          {confirming ? "Confirm detach?" : "Detach"}
        </button>
      </div>
    </div>
  );
}

function InstanceChildBanner({
  context,
  nodeName,
  onResetOverrides,
}: {
  context: {
    master: import("@/lib/canvas/design-node").ComponentMaster | null;
    overrides?: import("@/lib/canvas/design-node").NodeOverride;
  };
  nodeName: string;
  onResetOverrides: () => void;
}) {
  const hasOverrides = context.overrides && Object.keys(context.overrides).length > 0;
  return (
    <div className="px-4 py-2 border-b border-[#EFEFEC]">
      <span className="text-[13px] text-[#1A1A1A]">{nodeName}</span>
      <span className="text-[11px] text-[#A0A0A0] ml-1">in {context.master?.name}</span>
      {hasOverrides && (
        <button onClick={onResetOverrides} className="text-[11px] text-[#4B57DB] ml-2 hover:underline">
          Reset Overrides
        </button>
      )}
    </div>
  );
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

  // ── Instance context ──
  const instanceContext = React.useMemo(() => {
    if (!node.id.includes("::")) return null;
    const [instanceId, masterNodeId] = splitCompositeId(node.id);
    const instanceNode = findDesignNodeById(artboard.pageTree as DesignNode, instanceId);
    if (!instanceNode?.componentRef) return null;
    const master = findMaster(canvasState.components, instanceNode.componentRef.masterId);
    return {
      instanceId,
      masterNodeId,
      instanceNode,
      master,
      overrides: instanceNode.componentRef.overrides[masterNodeId],
      isStale: instanceNode.componentRef.masterVersion < (master?.version ?? 0),
      isRoot: false as const,
    };
  }, [node.id, artboard.pageTree, canvasState.components]);

  const instanceRootContext = React.useMemo(() => {
    if (node.id.includes("::")) return null;
    const sourceNode = findDesignNodeById(artboard.pageTree as DesignNode, node.id);
    if (!sourceNode?.componentRef) return null;
    const master = findMaster(canvasState.components, sourceNode.componentRef.masterId);
    return {
      instanceNode: sourceNode,
      master,
      isStale: sourceNode.componentRef.masterVersion < (master?.version ?? 0),
    };
  }, [node.id, artboard.pageTree, canvasState.components]);

  const isInstanceChild = instanceContext !== null;
  const isInstanceRoot = instanceRootContext !== null;
  const isInsideInstance = isInstanceChild || isInstanceRoot;

  const isForbiddenField = (field: string) =>
    isInsideInstance && !ALLOWED_STYLE_FIELDS.has(field);

  // ── Breakpoint override helpers ──
  const breakpoint: Breakpoint = artboard.breakpoint;
  const isNonDesktop = breakpoint !== "desktop";
  const overrides = node.responsiveOverrides?.[breakpoint];

  function hasOverride(property: keyof DesignNodeStyle): boolean {
    // Component override check for instance children
    if (isInstanceChild && instanceContext?.overrides?.style) {
      return (instanceContext.overrides.style as Record<string, unknown>)[property] !== undefined;
    }
    if (!isNonDesktop || !overrides) return false;
    return (overrides as Record<string, unknown>)[property] !== undefined;
  }

  function resetOverride(property: keyof DesignNodeStyle) {
    if (isInstanceChild) {
      dispatch({
        type: "RESET_INSTANCE_OVERRIDE_FIELD",
        artboardId: artboard.id,
        instanceId: instanceContext!.instanceId,
        masterNodeId: instanceContext!.masterNodeId,
        category: "style",
        field: property,
      });
      return;
    }
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
    if (isInstanceChild) {
      const filtered = filterAllowedOverrides({ style: patch } as NodeOverride);
      if (filtered.style && Object.keys(filtered.style).length > 0) {
        history.begin(`Styled instance override`);
        dispatch({
          type: "UPDATE_INSTANCE_OVERRIDE",
          artboardId: artboard.id,
          instanceId: instanceContext!.instanceId,
          masterNodeId: instanceContext!.masterNodeId,
          override: filtered,
        });
      }
      return;
    }
    history.begin(`Styled ${node.type}`);
    dispatch({
      type: "UPDATE_NODE_STYLE",
      artboardId: artboard.id,
      nodeId: node.id,
      style: patch as Record<string, unknown>,
    });
  }

  function applyImmediate(patch: Partial<DesignNodeStyle>, description: string) {
    if (isInstanceChild) {
      const filtered = filterAllowedOverrides({ style: patch } as NodeOverride);
      if (filtered.style && Object.keys(filtered.style).length > 0) {
        history.flush();
        dispatch({ type: "PUSH_HISTORY", description });
        dispatch({
          type: "UPDATE_INSTANCE_OVERRIDE",
          artboardId: artboard.id,
          instanceId: instanceContext!.instanceId,
          masterNodeId: instanceContext!.masterNodeId,
          override: filtered,
        });
      }
      return;
    }
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

  // ── Instance handlers ──
  function handleEditMaster() {
    if (!instanceRootContext?.master) return;
    dispatch({ type: "ENTER_MASTER_EDIT", masterId: instanceRootContext.master.id });
  }

  function handleDetach() {
    const nodeId = isInstanceRoot
      ? instanceRootContext!.instanceNode.id
      : isInstanceChild
        ? instanceContext!.instanceId
        : null;
    if (!nodeId) return;
    dispatch({ type: "DETACH_INSTANCE", artboardId: artboard.id, nodeId });
  }

  function handleAcceptUpdate() {
    if (!instanceRootContext?.instanceNode.componentRef) return;
    const ref = instanceRootContext.instanceNode.componentRef;
    const master = instanceRootContext.master;
    if (!master) return;

    // Drop orphaned overrides and type-incompatible content
    const cleanedOverrides = { ...ref.overrides };
    for (const masterNodeId of Object.keys(cleanedOverrides)) {
      const masterNode = findDesignNodeById(master.tree, masterNodeId);
      if (!masterNode) {
        delete cleanedOverrides[masterNodeId];
        continue;
      }
      const entry = { ...cleanedOverrides[masterNodeId] };
      if (entry.content && masterNode.type !== "text" && masterNode.type !== "button") {
        delete entry.content;
        if (!entry.style && !entry.hidden) {
          delete cleanedOverrides[masterNodeId];
          continue;
        }
      }
      cleanedOverrides[masterNodeId] = entry;
    }

    // Update the instance node with bumped masterVersion and cleaned overrides
    dispatch({
      type: "UPDATE_NODE",
      artboardId: artboard.id,
      nodeId: instanceRootContext.instanceNode.id,
      changes: {
        componentRef: {
          ...ref,
          masterVersion: master.version,
          overrides: cleanedOverrides,
        },
      } as Record<string, unknown>,
    });
  }

  function handleResetAllOverrides() {
    if (isInstanceRoot) {
      dispatch({
        type: "RESET_ALL_OVERRIDES",
        artboardId: artboard.id,
        nodeId: instanceRootContext!.instanceNode.id,
      });
    } else if (isInstanceChild) {
      dispatch({
        type: "RESET_INSTANCE_OVERRIDE_FIELD",
        artboardId: artboard.id,
        instanceId: instanceContext!.instanceId,
        masterNodeId: instanceContext!.masterNodeId,
        category: "all",
        field: "",
      });
    }
  }

  // ── Position mode ──
  const isBreakout = style.position === "absolute";

  function togglePositionMode(mode: string) {
    if (mode === "absolute") {
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
    <div data-inspector-first-section className="space-y-6 py-4">
      {/* ── Instance banners ──────────────────────────────────────────── */}
      {isInstanceRoot && instanceRootContext && (
        <InstanceRootBanner
          context={instanceRootContext}
          onEditMaster={handleEditMaster}
          onDetach={handleDetach}
        />
      )}
      {isInstanceChild && instanceContext && (
        <InstanceChildBanner
          context={instanceContext}
          nodeName={node.name}
          onResetOverrides={handleResetAllOverrides}
        />
      )}
      {isInstanceRoot && instanceRootContext?.isStale && (
        <div className="mx-4 mt-2 p-3 bg-[#FEF3C7] rounded-[4px]">
          <div className="text-[12px] font-medium text-[#92400E]">Master updated</div>
          <div className="text-[11px] text-[#92400E]/70 mt-0.5">Some overrides may no longer apply.</div>
          <div className="flex gap-2 mt-2">
            <button onClick={handleAcceptUpdate} className="text-[11px] text-[#92400E] border border-[#92400E]/30 rounded-[4px] px-2 py-1 hover:bg-[#92400E]/10">
              Accept Update
            </button>
            <button onClick={handleDetach} className="text-[11px] text-[#92400E] hover:underline">
              Detach
            </button>
          </div>
        </div>
      )}

      {isNonDesktop && (
        <div className="px-4">
          <BreakpointBadge breakpoint={breakpoint} width={artboard.width} />
        </div>
      )}

      {/* ── POSITION ─────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <SectionRule label="POSITION" />
        <div className="px-4 space-y-2">
          <InspectorFieldRow label="Mode" disabled={isForbiddenField("position")}>
            <InspectorSegmented
              value={isBreakout ? "absolute" : "relative"}
              options={[
                { value: "relative", label: "Flow" },
                { value: "absolute", label: "Breakout" },
              ]}
              onChange={togglePositionMode}
            />
          </InspectorFieldRow>

          {isBreakout && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <InspectorFieldRow
                  label="X"
                  hasOverride={hasOverride("x")}
                  onResetOverride={() => resetOverride("x")}
                  disabled={isForbiddenField("x")}
                >
                  <InspectorNumberInput
                    value={style.x ?? 0}
                    placeholder="0"
                    onChange={(e) => updateStyle({ x: Number(e.target.value) || 0 })}
                    onBlur={() => history.flush()}
                  />
                </InspectorFieldRow>
                <InspectorFieldRow
                  label="Y"
                  hasOverride={hasOverride("y")}
                  onResetOverride={() => resetOverride("y")}
                  disabled={isForbiddenField("y")}
                >
                  <InspectorNumberInput
                    value={style.y ?? 0}
                    placeholder="0"
                    onChange={(e) => updateStyle({ y: Number(e.target.value) || 0 })}
                    onBlur={() => history.flush()}
                  />
                </InspectorFieldRow>
              </div>
              <InspectorFieldRow
                label="Z-Index"
                hasOverride={hasOverride("zIndex")}
                onResetOverride={() => resetOverride("zIndex")}
                disabled={isForbiddenField("zIndex")}
              >
                <InspectorNumberInput
                  value={style.zIndex ?? 1}
                  placeholder="1"
                  min={0}
                  onChange={(e) => updateStyle({ zIndex: Number(e.target.value) || undefined })}
                  onBlur={() => history.flush()}
                />
              </InspectorFieldRow>
            </>
          )}
        </div>
      </section>

      {/* ── SIZE ──────────────────────────────────────────────────────── */}
      {sections.showSize && (
        <section className="space-y-3">
          <SectionRule label="SIZE" />
          <div className="px-4 space-y-2">
            {/* Width */}
            <InspectorFieldRow
              label="W"
              hasOverride={hasOverride("width")}
              onResetOverride={() => resetOverride("width")}
              disabled={isForbiddenField("width")}
            >
              <div className="flex items-center gap-2">
                <InspectorSegmented
                  value={getSizingMode(style.width)}
                  options={[
                    { value: "fixed", label: "Fixed" },
                    { value: "hug", label: "Hug" },
                    { value: "fill", label: "Fill" },
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
                  className="flex-1"
                />
                {getSizingMode(style.width) === "fixed" ? (
                  <InspectorNumberInput
                    value={typeof style.width === "number" ? style.width : ""}
                    placeholder="0"
                    min={0}
                    className="w-16"
                    onChange={(e) => updateStyle({ width: Number(e.target.value) || 0 })}
                    onBlur={() => history.flush()}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.querySelector(`[data-node-id="${node.id}"]`);
                      const measured = el ? Math.round(el.getBoundingClientRect().width / zoom) : 200;
                      applyImmediate({ width: measured }, "Reset width to measured");
                    }}
                    className="h-6 px-2 text-[11px] font-mono text-[#A0A0A0] hover:text-[#1A1A1A] dark:text-[#666666] dark:hover:text-[#D0D0D0] transition-colors"
                    title="Reset to measured value"
                  >
                    —
                  </button>
                )}
              </div>
            </InspectorFieldRow>

            {/* Height */}
            <InspectorFieldRow
              label="H"
              hasOverride={hasOverride("height")}
              onResetOverride={() => resetOverride("height")}
              disabled={isForbiddenField("height")}
            >
              <div className="flex items-center gap-2">
                <InspectorSegmented
                  value={getSizingMode(style.height)}
                  options={[
                    { value: "fixed", label: "Fixed" },
                    { value: "hug", label: "Hug" },
                    { value: "fill", label: "Fill" },
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
                  className="flex-1"
                />
                {getSizingMode(style.height) === "fixed" ? (
                  <InspectorNumberInput
                    value={typeof style.height === "number" ? style.height : ""}
                    placeholder="0"
                    min={0}
                    className="w-16"
                    onChange={(e) => updateStyle({ height: Number(e.target.value) || 0 })}
                    onBlur={() => history.flush()}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.querySelector(`[data-node-id="${node.id}"]`);
                      const measured = el ? Math.round(el.getBoundingClientRect().height / zoom) : 200;
                      applyImmediate({ height: measured }, "Reset height to measured");
                    }}
                    className="h-6 px-2 text-[11px] font-mono text-[#A0A0A0] hover:text-[#1A1A1A] dark:text-[#666666] dark:hover:text-[#D0D0D0] transition-colors"
                    title="Reset to measured value"
                  >
                    —
                  </button>
                )}
              </div>
            </InspectorFieldRow>
          </div>
        </section>
      )}

      {/* ── SPACING (frame + text) ───────────────────────────────────── */}
      {sections.showSpacing && (
        <section className="space-y-3">
          <SectionRule label="SPACING" />
          <div className="px-4">
            <SpacingDiagram
              node={node}
              style={style}
              onPaddingChange={updatePadding}
              onHistoryFlush={() => history.flush()}
              hasOverride={hasOverride("padding")}
              onResetOverride={() => resetOverride("padding")}
            />
          </div>
        </section>
      )}

      {/* ── LAYOUT (frame only) ──────────────────────────────────────── */}
      {sections.showLayout && (
        <section className="space-y-3">
          <SectionRule label="LAYOUT" />
          <div className="px-4 space-y-2">
            <InspectorFieldRow label="Display" disabled={isForbiddenField("display")}>
              <InspectorSegmented
                value={style.display || "flex"}
                options={[
                  { value: "flex", label: "Flex" },
                  { value: "grid", label: "Grid" },
                ]}
                onChange={(v) => applyImmediate({ display: v as "flex" | "grid" }, "Changed display")}
              />
            </InspectorFieldRow>

            {(style.display || "flex") === "flex" && (
              <InspectorFieldRow
                label="Direction"
                hasOverride={hasOverride("flexDirection")}
                onResetOverride={() => resetOverride("flexDirection")}
                disabled={isForbiddenField("flexDirection")}
              >
                <InspectorSegmented
                  value={style.flexDirection || "column"}
                  options={[
                    { value: "row", label: "Row" },
                    { value: "column", label: "Column" },
                  ]}
                  onChange={(v) => applyImmediate({ flexDirection: v as "row" | "column" }, "Changed direction")}
                />
              </InspectorFieldRow>
            )}

            {style.display === "grid" && (
              <InspectorFieldRow
                label="Template"
                hasOverride={hasOverride("gridTemplate")}
                onResetOverride={() => resetOverride("gridTemplate")}
                disabled={isForbiddenField("gridTemplate")}
              >
                <GridTemplatePicker
                  value={style.gridTemplate || ""}
                  onChange={(v) => updateStyle({ gridTemplate: v })}
                  onCommit={() => history.flush()}
                />
              </InspectorFieldRow>
            )}

            <div className="grid grid-cols-2 gap-3">
              <InspectorFieldRow
                label="Align"
                hasOverride={hasOverride("alignItems")}
                onResetOverride={() => resetOverride("alignItems")}
                disabled={isForbiddenField("alignItems")}
              >
                <InspectorSegmentedSmall
                  value={style.alignItems || "stretch"}
                  options={[
                    { value: "flex-start", label: "Start" },
                    { value: "center", label: "Center" },
                    { value: "flex-end", label: "End" },
                    { value: "stretch", label: "Stretch" },
                  ]}
                  onChange={(v) => applyImmediate({ alignItems: v as DesignNodeStyle["alignItems"] }, "Changed align")}
                />
              </InspectorFieldRow>
              <InspectorFieldRow
                label="Justify"
                hasOverride={hasOverride("justifyContent")}
                onResetOverride={() => resetOverride("justifyContent")}
                disabled={isForbiddenField("justifyContent")}
              >
                <InspectorSegmentedSmall
                  value={style.justifyContent || "flex-start"}
                  options={[
                    { value: "flex-start", label: "Start" },
                    { value: "center", label: "Center" },
                    { value: "flex-end", label: "End" },
                    { value: "space-between", label: "Between" },
                  ]}
                  onChange={(v) => applyImmediate({ justifyContent: v as DesignNodeStyle["justifyContent"] }, "Changed justify")}
                />
              </InspectorFieldRow>
            </div>

            <InspectorFieldRow
              label="Gap"
              hasOverride={hasOverride("gap")}
              onResetOverride={() => resetOverride("gap")}
              disabled={isForbiddenField("gap")}
            >
              <InspectorNumberInput
                value={style.gap ?? ""}
                placeholder="0"
                min={0}
                onChange={(e) => updateStyle({ gap: Number(e.target.value) || undefined })}
                onBlur={() => history.flush()}
              />
            </InspectorFieldRow>
          </div>
        </section>
      )}

      {/* ── TYPOGRAPHY (text + button) ───────────────────────────────── */}
      {sections.showTypography && (
        <section className="space-y-3">
          <SectionRule label="TYPOGRAPHY" />
          <div className="px-4 space-y-2">
            {/* Font Family */}
            <InspectorFieldRow 
              label="Font"
              hasOverride={hasOverride("fontFamily")} 
              onResetOverride={() => resetOverride("fontFamily")}
            >
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
            </InspectorFieldRow>

            {/* Weight + Size */}
            <div className="grid grid-cols-2 gap-3">
              <InspectorFieldRow 
                label="Weight"
                hasOverride={hasOverride("fontWeight")} 
                onResetOverride={() => resetOverride("fontWeight")}
              >
                <InspectorNumberInput
                  value={style.fontWeight ?? resolved?.fontWeight ?? ""}
                  placeholder="400"
                  min={100}
                  max={900}
                  step={100}
                  className={cn(resolved?.isInherited.fontWeight && style.fontWeight == null && "text-[#A0A0A0] dark:text-[#666666]")}
                  onChange={(e) => updateStyle({ fontWeight: Number(e.target.value) || undefined })}
                  onBlur={() => history.flush()}
                />
              </InspectorFieldRow>
              <InspectorFieldRow 
                label="Size"
                hasOverride={hasOverride("fontSize")} 
                onResetOverride={() => resetOverride("fontSize")}
              >
                <InspectorNumberInput
                  value={style.fontSize ?? resolved?.fontSize ?? ""}
                  placeholder="16"
                  min={1}
                  className={cn(resolved?.isInherited.fontSize && style.fontSize == null && "text-[#A0A0A0] dark:text-[#666666]")}
                  onChange={(e) => updateStyle({ fontSize: Number(e.target.value) || undefined })}
                  onBlur={() => history.flush()}
                />
              </InspectorFieldRow>
            </div>

            {/* Line Height + Tracking */}
            <div className="grid grid-cols-2 gap-3">
              <InspectorFieldRow 
                label="Height"
                hasOverride={hasOverride("lineHeight")} 
                onResetOverride={() => resetOverride("lineHeight")}
              >
                <InspectorNumberInput
                  value={style.lineHeight ?? ""}
                  placeholder="Auto"
                  step={0.1}
                  onChange={(e) => updateStyle({ lineHeight: Number(e.target.value) || undefined })}
                  onBlur={() => history.flush()}
                />
              </InspectorFieldRow>
              <InspectorFieldRow 
                label="Tracking"
                hasOverride={hasOverride("letterSpacing")} 
                onResetOverride={() => resetOverride("letterSpacing")}
              >
                <InspectorNumberInput
                  value={style.letterSpacing ?? ""}
                  placeholder="0"
                  step={0.1}
                  onChange={(e) => updateStyle({ letterSpacing: Number(e.target.value) || undefined })}
                  onBlur={() => history.flush()}
                />
              </InspectorFieldRow>
            </div>

            {/* Text Align */}
            <InspectorFieldRow 
              label="Align"
              hasOverride={hasOverride("textAlign")} 
              onResetOverride={() => resetOverride("textAlign")}
            >
              <div className="flex gap-0.5">
                {[
                  { value: "left" as const, icon: AlignLeft, title: "Left" },
                  { value: "center" as const, icon: AlignCenter, title: "Center" },
                  { value: "right" as const, icon: AlignRight, title: "Right" },
                  { value: "justify" as const, icon: AlignJustify, title: "Justify" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    title={opt.title}
                    onClick={() => applyImmediate({ textAlign: opt.value }, "Changed text align")}
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-[2px] transition-colors",
                      style.textAlign === opt.value
                        ? "bg-white text-[#1A1A1A] shadow-[0_1px_2px_rgba(0,0,0,0.06)] dark:bg-[#333333] dark:text-[#FFFFFF]"
                        : "bg-[#F5F5F0] dark:bg-[#2A2A2A] text-[#6B6B6B] dark:text-[#999999] hover:bg-[#EFEFEC] dark:hover:bg-[#333333]"
                    )}
                  >
                    <opt.icon size={12} />
                  </button>
                ))}
              </div>
            </InspectorFieldRow>

            {/* Font Style + Decoration */}
            <div className="grid grid-cols-2 gap-3">
              <InspectorFieldRow 
                label="Style"
                hasOverride={hasOverride("fontStyle")} 
                onResetOverride={() => resetOverride("fontStyle")}
              >
                <InspectorSegmentedSmall
                  value={style.fontStyle || "normal"}
                  options={[
                    { value: "normal", label: "Normal" },
                    { value: "italic", label: "Italic" },
                  ]}
                  onChange={(v) => applyImmediate({ fontStyle: v as "normal" | "italic" }, "Changed font style")}
                />
              </InspectorFieldRow>
              <InspectorFieldRow 
                label="Deco"
                hasOverride={hasOverride("textDecoration")} 
                onResetOverride={() => resetOverride("textDecoration")}
              >
                <InspectorSegmentedSmall
                  value={style.textDecoration || "none"}
                  options={[
                    { value: "none", label: "None" },
                    { value: "underline", label: "Underline" },
                  ]}
                  onChange={(v) => applyImmediate({ textDecoration: v as "none" | "underline" }, "Changed decoration")}
                />
              </InspectorFieldRow>
            </div>
          </div>
        </section>
      )}

      {/* ── FILL ─────────────────────────────────────────────────────── */}
      {sections.showFill && (
        <section className="space-y-3">
          <SectionRule label="FILL" />
          <div className="px-4 space-y-2">
            <InspectorFieldRow 
              label="Bg"
              hasOverride={hasOverride("background")} 
              onResetOverride={() => resetOverride("background")}
            >
              <InspectorColorField
                color={style.background || ""}
                documentColors={documentColors}
                onCommit={() => history.flush()}
                onChange={(c) => updateStyle({ background: c })}
              />
            </InspectorFieldRow>

            <InspectorFieldRow 
              label="Text"
              hasOverride={hasOverride("foreground")} 
              onResetOverride={() => resetOverride("foreground")}
            >
              <InspectorColorField
                color={style.foreground || ""}
                documentColors={documentColors}
                onCommit={() => history.flush()}
                onChange={(c) => updateStyle({ foreground: c })}
              />
            </InspectorFieldRow>

            {/* Cover Image (frame only) */}
            {node.type === "frame" && (
              <div className="pt-2">
                {!style.coverImage ? (
                  <div className="flex items-center justify-between h-8">
                    <span className="text-[13px] text-[#6B6B6B] dark:text-[#999999]">Image</span>
                    <button
                      type="button"
                      onClick={() => applyImmediate({ coverImage: "https://", coverSize: "cover" }, "Added cover image")}
                      className="h-6 w-6 flex items-center justify-center rounded-[2px] bg-[#F5F5F0] dark:bg-[#2A2A2A] text-[#6B6B6B] dark:text-[#999999] hover:bg-[#EFEFEC] dark:hover:bg-[#333333] transition-colors"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-[#6B6B6B] dark:text-[#999999]">Image</span>
                      <button
                        type="button"
                        onClick={() => applyImmediate({ coverImage: undefined, coverSize: undefined, coverPosition: undefined, scrimEnabled: undefined }, "Removed cover image")}
                        className="h-6 w-6 flex items-center justify-center rounded-[2px] text-[#A0A0A0] hover:text-red-500 transition-colors"
                      >
                        <Minus size={12} />
                      </button>
                    </div>
                    
                    <InspectorTextInput
                      value={style.coverImage || ""}
                      placeholder="https://..."
                      onChange={(e) => updateStyle({ coverImage: (e.target as HTMLInputElement).value || undefined })}
                      onBlur={() => history.flush()}
                    />

                    {style.coverImage && style.coverImage !== "https://" && (
                      <div className="w-full h-[60px] rounded-[2px] border border-[#E5E5E0] dark:border-[#333333] overflow-hidden bg-[#F5F5F0] dark:bg-[#2A2A2A]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={style.coverImage}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <InspectorFieldRow label="Size">
                        <InspectorSegmentedSmall
                          value={style.coverSize || "cover"}
                          options={[
                            { value: "cover", label: "Cover" },
                            { value: "contain", label: "Contain" },
                          ]}
                          onChange={(v) => applyImmediate({ coverSize: v as "cover" | "contain" }, "Changed cover size")}
                        />
                      </InspectorFieldRow>
                      <InspectorFieldRow label="Position">
                        <InspectorTextInput
                          value={style.coverPosition || ""}
                          placeholder="center"
                          onChange={(e) => updateStyle({ coverPosition: (e.target as HTMLInputElement).value || undefined })}
                          onBlur={() => history.flush()}
                        />
                      </InspectorFieldRow>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── APPEARANCE (all types) ───────────────────────────────────── */}
      {sections.showAppearance && (
        <section className="space-y-3">
          <SectionRule label="APPEARANCE" />
          <div className="px-4 space-y-2">
            {/* Radius */}
            {node.type !== "divider" && (
              <InspectorFieldRow 
                label="Radius"
                hasOverride={hasOverride("borderRadius")} 
                onResetOverride={() => resetOverride("borderRadius")}
              >
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {["0", "2", "4", "8"].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => applyImmediate({ borderRadius: Number(r) }, `Set radius to ${r}`)}
                        className={cn(
                          "h-6 w-6 flex items-center justify-center rounded-[2px] text-[10px] font-mono transition-colors",
                          style.borderRadius === Number(r)
                            ? "bg-white text-[#1A1A1A] shadow-[0_1px_2px_rgba(0,0,0,0.06)] dark:bg-[#333333] dark:text-[#FFFFFF]"
                            : "bg-[#F5F5F0] dark:bg-[#2A2A2A] text-[#6B6B6B] dark:text-[#999999] hover:bg-[#EFEFEC] dark:hover:bg-[#333333]"
                        )}
                        title={`${r}px`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  <InspectorNumberInput
                    value={style.borderRadius ?? ""}
                    placeholder="0"
                    min={0}
                    max={999}
                    className="w-16"
                    onChange={(e) => updateStyle({ borderRadius: Number(e.target.value) || undefined })}
                    onBlur={() => history.flush()}
                  />
                </div>
              </InspectorFieldRow>
            )}

            {/* Border */}
            {node.type === "divider" ? (
              <InspectorFieldRow label="Color">
                <InspectorColorField
                  color={style.borderColor || "rgba(0,0,0,0.1)"}
                  documentColors={documentColors}
                  onCommit={() => history.flush()}
                  onChange={(c) => updateStyle({ borderColor: c })}
                />
              </InspectorFieldRow>
            ) : (
              <>
                {!hasBorder ? (
                  <div className="flex items-center justify-between h-8">
                    <span className="text-[13px] text-[#6B6B6B] dark:text-[#999999]">Border</span>
                    <button
                      type="button"
                      onClick={addBorder}
                      className="h-6 w-6 flex items-center justify-center rounded-[2px] bg-[#F5F5F0] dark:bg-[#2A2A2A] text-[#6B6B6B] dark:text-[#999999] hover:bg-[#EFEFEC] dark:hover:bg-[#333333] transition-colors"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-[#6B6B6B] dark:text-[#999999]">Border</span>
                      <button
                        type="button"
                        onClick={removeBorder}
                        className="h-6 w-6 flex items-center justify-center rounded-[2px] text-[#A0A0A0] hover:text-red-500 transition-colors"
                      >
                        <Minus size={12} />
                      </button>
                    </div>
                    <InspectorColorField
                      color={style.borderColor || "#E5E5E0"}
                      documentColors={documentColors}
                      onCommit={() => history.flush()}
                      onChange={(c) => updateStyle({ borderColor: c })}
                    />
                    <InspectorFieldRow 
                      label="Width"
                      hasOverride={hasOverride("borderWidth")} 
                      onResetOverride={() => resetOverride("borderWidth")}
                    >
                      <InspectorNumberInput
                        value={style.borderWidth ?? 1}
                        placeholder="1"
                        min={0}
                        max={20}
                        onChange={(e) => updateStyle({ borderWidth: Number(e.target.value) || undefined })}
                        onBlur={() => history.flush()}
                      />
                    </InspectorFieldRow>
                  </div>
                )}
              </>
            )}

            {/* Shadow */}
            {node.type !== "divider" && (
              <InspectorFieldRow 
                label="Shadow"
                hasOverride={hasOverride("shadow")} 
                onResetOverride={() => resetOverride("shadow")}
              >
                <InspectorTextInput
                  value={style.shadow || ""}
                  placeholder="0 4px 12px rgba(0,0,0,0.08)"
                  onChange={(e) => updateStyle({ shadow: (e.target as HTMLInputElement).value || undefined })}
                  onBlur={() => history.flush()}
                />
              </InspectorFieldRow>
            )}

            {/* Opacity */}
            <InspectorFieldRow 
              label="Opacity"
              hasOverride={hasOverride("opacity")} 
              onResetOverride={() => resetOverride("opacity")}
            >
              <div className="relative flex-1">
                <InspectorNumberInput
                  value={style.opacity != null ? Math.round((style.opacity ?? 1) * 100) : 100}
                  placeholder="100"
                  min={0}
                  max={100}
                  className="pr-6"
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
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#A0A0A0] dark:text-[#666666]">%</span>
              </div>
            </InspectorFieldRow>
          </div>
        </section>
      )}
    </div>
  );
}
