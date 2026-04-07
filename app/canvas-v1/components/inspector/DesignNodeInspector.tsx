"use client";

/**
 * DesignNodeInspector — Framer-style property inspector.
 *
 * Two-column layout with 32px row height, embedded rule headers,
 * and visual box model for spacing.
 *
 * Supports both single-select and multi-select modes via the `nodes` prop.
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
import { findMaster, getInstanceBaseTree, splitCompositeId, filterAllowedOverrides } from "@/lib/canvas/component-resolver";
import {
  countOverriddenMasterNodes,
  isNonEmptyOverride,
  isResolvedInstanceSubtreeRoot,
} from "@/lib/canvas/component-override-utils";
import { isBuiltinMasterId } from "@/lib/canvas/component-builtins";
import { isDesignNodeTree } from "@/lib/canvas/compose";
import { useBatchUpdate } from "@/app/canvas-v1/hooks/useBatchUpdate";
import {
  compareProperty,
  compareSizeProperties,
  compareSpacingProperties,
  compareTypographyProperties,
  compareVisualProperties,
} from "@/app/canvas-v1/lib/property-comparison";

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
  overriddenMasterNodeCount,
  onResetAllOverrides,
}: {
  context: { master: import("@/lib/canvas/design-node").ComponentMaster | null; isStale: boolean };
  onEditMaster: () => void;
  onDetach: () => void;
  overriddenMasterNodeCount: number;
  onResetAllOverrides: () => void;
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
      {overriddenMasterNodeCount > 0 ? (
        <div className="mt-1.5 text-[11px] text-[#6B6B6B]">
          {overriddenMasterNodeCount} nested override{overriddenMasterNodeCount !== 1 ? "s" : ""}
        </div>
      ) : (
        <div className="mt-1.5 text-[11px] text-[#A0A0A0]">No local overrides</div>
      )}
      <div className="flex flex-wrap gap-2 mt-2">
        <button onClick={onEditMaster} className="text-[12px] text-[#6B6B6B] border border-[#E5E5E0] rounded-[4px] px-2 py-1 hover:border-[#D1E4FC] hover:text-[#4B57DB]">
          Edit Master
        </button>
        {overriddenMasterNodeCount > 0 && (
          <button
            type="button"
            onClick={onResetAllOverrides}
            className="text-[12px] text-[#6B6B6B] border border-[#E5E5E0] rounded-[4px] px-2 py-1 hover:border-[#D1E4FC] hover:text-[#4B57DB]"
          >
            Reset all to master
          </button>
        )}
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
  const hasOverrides = isNonEmptyOverride(context.overrides);
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

// ── Multi-select section visibility helpers ────────────────────────────────

function classifyMultiSelect(nodes: DesignNode[]) {
  // For single-select, use the existing classification
  if (nodes.length === 1) {
    return classifyDesignNode(nodes[0]);
  }

  // For multi-select, compute shared section visibility
  const allTypes = new Set(nodes.map((n) => n.type));
  
  // Show typography only if ALL nodes support it (text or button)
  const showTypography = nodes.every((n) => n.type === "text" || n.type === "button");
  
  // Show layout if ANY node is a frame or group
  const showLayout = nodes.some((n) => n.type === "frame" || n.isGroup);
  
  // Show spacing if ANY node is a frame or text
  const showSpacing = nodes.some((n) => n.type === "frame" || n.type === "text");
  
  // Show size for any multi-select (all nodes have size properties)
  const showSize = true;
  
  // Show fill if ANY node supports fill (not divider)
  const showFill = nodes.some((n) => n.type !== "divider");
  
  // Show appearance for all
  const showAppearance = true;

  return { showSize, showLayout, showSpacing, showTypography, showFill, showAppearance };
}

// ── DesignNodeInspector ─────────────────────────────────────────────────────

type DesignNodeInspectorProps = {
  artboard: ArtboardItem;
  nodes: DesignNode[];  // Changed from node: DesignNode to support multi-select
  documentColors: string[];
};

export function DesignNodeInspector({
  artboard,
  nodes,
  documentColors,
}: DesignNodeInspectorProps) {
  const { dispatch, state: canvasState } = useCanvas();
  const zoom = canvasState.viewport.zoom || 1;
  
  // Multi-select detection
  const isMultiSelect = nodes.length > 1;
  const primaryNode = nodes[0];  // Use first node for shared property display
  const nodeIds = nodes.map((n) => n.id);
  
  // Use batch update hook for unified single/multi-select handling
  const batchUpdate = useBatchUpdate(artboard.id, nodeIds, dispatch);
  
  // For single-select, use the node's style directly; for multi-select, use primary node style
  const style = primaryNode.style;
  const sections = isMultiSelect ? classifyMultiSelect(nodes) : classifyDesignNode(primaryNode);

  // ── Property comparisons for multi-select ──
  const comparisons = React.useMemo(() => {
    if (!isMultiSelect) return null;

    const sizeComparisons = compareSizeProperties(nodes);
    const spacingComparisons = compareSpacingProperties(nodes);
    const typographyComparisons = compareTypographyProperties(nodes);
    const visualComparisons = compareVisualProperties(nodes);

    return {
      // Size
      width: sizeComparisons.width,
      height: sizeComparisons.height,
      // Spacing
      gap: spacingComparisons.gap,
      padding: spacingComparisons.padding,
      // Typography
      fontFamily: typographyComparisons.fontFamily,
      fontSize: typographyComparisons.fontSize,
      fontWeight: typographyComparisons.fontWeight,
      lineHeight: typographyComparisons.lineHeight,
      letterSpacing: typographyComparisons.letterSpacing,
      fontStyle: typographyComparisons.fontStyle,
      textDecoration: typographyComparisons.textDecoration,
      textAlign: typographyComparisons.textAlign,
      // Visual/Fill
      background: visualComparisons.background,
      foreground: visualComparisons.foreground,
      borderColor: visualComparisons.borderColor,
      borderWidth: visualComparisons.borderWidth,
      borderRadius: visualComparisons.borderRadius,
      opacity: visualComparisons.opacity,
      shadow: visualComparisons.shadow,
      // Layout
      flexDirection: compareProperty(nodes, (n) => n.style.flexDirection),
      alignItems: compareProperty(nodes, (n) => n.style.alignItems),
      justifyContent: compareProperty(nodes, (n) => n.style.justifyContent),
      display: compareProperty(nodes, (n) => n.style.display),
      gridTemplate: compareProperty(nodes, (n) => n.style.gridTemplate),
      // Position
      x: compareProperty(nodes, (n) => n.style.x),
      y: compareProperty(nodes, (n) => n.style.y),
      zIndex: compareProperty(nodes, (n) => n.style.zIndex),
    };
  }, [nodes, isMultiSelect]);

  // ── Instance context ──
  // For multi-select, instance banners are shown only if ALL selected nodes
  // are from the same instance (rare case) - for simplicity, we hide them in multi-select
  const instanceContext = React.useMemo(() => {
    // Skip instance context for multi-select
    if (isMultiSelect) return null;
    if (!primaryNode.id.includes("::")) return null;
    const [instanceId, masterNodeId] = splitCompositeId(primaryNode.id);
    const instanceNode = findDesignNodeById(artboard.pageTree as DesignNode, instanceId);
    if (!instanceNode?.componentRef) return null;
    const master = findMaster(canvasState.components, instanceNode.componentRef.masterId);
    // Resolved instance root row uses composite id — handled by instanceRootContext
    if (master && master.tree.id === masterNodeId) return null;
    return {
      instanceId,
      masterNodeId,
      instanceNode,
      master,
      overrides: instanceNode.componentRef.overrides[masterNodeId],
      isStale: instanceNode.componentRef.masterVersion < (master?.version ?? 0),
      isRoot: false as const,
    };
  }, [primaryNode.id, artboard.pageTree, canvasState.components, isMultiSelect]);

  const instanceRootContext = React.useMemo(() => {
    // Skip instance context for multi-select
    if (isMultiSelect) return null;
    const pageTree = artboard.pageTree as DesignNode;

    if (primaryNode.id.includes("::")) {
      if (!isResolvedInstanceSubtreeRoot(primaryNode.id, pageTree, canvasState.components)) {
        return null;
      }
      const [instanceId] = splitCompositeId(primaryNode.id);
      const instanceNode = findDesignNodeById(pageTree, instanceId);
      if (!instanceNode?.componentRef) return null;
      const master = findMaster(canvasState.components, instanceNode.componentRef.masterId);
      return {
        instanceNode,
        master,
        isStale: instanceNode.componentRef.masterVersion < (master?.version ?? 0),
      };
    }

    const sourceNode = findDesignNodeById(pageTree, primaryNode.id);
    if (!sourceNode?.componentRef) return null;
    const master = findMaster(canvasState.components, sourceNode.componentRef.masterId);
    return {
      instanceNode: sourceNode,
      master,
      isStale: sourceNode.componentRef.masterVersion < (master?.version ?? 0),
    };
  }, [primaryNode.id, artboard.pageTree, canvasState.components, isMultiSelect]);

  const isInstanceChild = instanceContext !== null;
  const isInstanceRoot = instanceRootContext !== null;
  const isInsideInstance = isInstanceChild || isInstanceRoot;

  const isForbiddenField = (field: string) =>
    isInsideInstance && !ALLOWED_STYLE_FIELDS.has(field);

  // ── Breakpoint override helpers ──
  const breakpoint: Breakpoint = artboard.breakpoint;
  const isNonDesktop = breakpoint !== "desktop";
  const overrides = primaryNode.responsiveOverrides?.[breakpoint];

  function hasOverride(property: keyof DesignNodeStyle): boolean {
    // No overrides shown in multi-select mode
    if (isMultiSelect) return false;
    // Component override check for instance children
    if (isInstanceChild && instanceContext?.overrides?.style) {
      return (instanceContext.overrides.style as Record<string, unknown>)[property] !== undefined;
    }
    if (!isNonDesktop || !overrides) return false;
    return (overrides as Record<string, unknown>)[property] !== undefined;
  }

  function resetOverride(property: keyof DesignNodeStyle) {
    // No override reset in multi-select mode
    if (isMultiSelect) return;
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
      nodeId: primaryNode.id,
      breakpoint,
      property,
    });
  }

  // Resolve inherited typography from parent chain
  // Only for single-select; multi-select uses primary node style directly
  const tree = isDesignNodeTree(artboard.pageTree) ? artboard.pageTree : null;
  const resolved = React.useMemo(
    () => tree && !isMultiSelect ? resolveInheritedTypography(primaryNode, tree) : null,
    [primaryNode, tree, isMultiSelect]
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
        batchUpdate.updateInstanceOverride(
          instanceContext!.instanceId,
          instanceContext!.masterNodeId,
          filtered
        );
      }
      return;
    }
    // Use batch update for unified single/multi-select handling
    const description = isMultiSelect 
      ? `Styled ${nodes.length} nodes` 
      : `Styled ${primaryNode.type}`;
    history.begin(description);
    batchUpdate.updateStyle(patch);
  }

  function applyImmediate(patch: Partial<DesignNodeStyle>, description: string) {
    if (isInstanceChild) {
      const filtered = filterAllowedOverrides({ style: patch } as NodeOverride);
      if (filtered.style && Object.keys(filtered.style).length > 0) {
        history.flush();
        dispatch({ type: "PUSH_HISTORY", description });
        batchUpdate.updateInstanceOverride(
          instanceContext!.instanceId,
          instanceContext!.masterNodeId,
          filtered
        );
      }
      return;
    }
    history.flush();
    dispatch({ type: "PUSH_HISTORY", description });
    batchUpdate.updateStyle(patch);
  }

  function updatePadding(side: "top" | "right" | "bottom" | "left", value: number | undefined) {
    const description = isMultiSelect 
      ? `Styled ${nodes.length} nodes padding` 
      : `Styled ${primaryNode.type} padding`;
    history.begin(description);
    
    // For padding, we need to merge with existing padding values
    // In multi-select, we apply the same padding to all nodes
    const paddingPatch = { padding: { [side]: value } };
    batchUpdate.updateStyle(paddingPatch as Partial<DesignNodeStyle>);
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
    const masterId = instanceRootContext.master.id;
    if (isBuiltinMasterId(masterId)) {
      // Promote built-in to user master, then enter edit mode
      dispatch({
        type: "PROMOTE_BUILTIN_TO_USER",
        artboardId: artboard.id,
        instanceNodeId: instanceRootContext.instanceNode.id,
      });
    } else {
      dispatch({
        type: "ENTER_MASTER_EDIT",
        masterId,
        returnTo: {
          artboardId: artboard.id,
          instanceRootSourceId: instanceRootContext.instanceNode.id,
          preferredNodeId: canvasState.selection.selectedNodeId,
        },
      });
    }
  }

  function handleDetach() {
    // Detach not available in multi-select
    if (isMultiSelect) return;
    const nodeId = isInstanceRoot
      ? instanceRootContext!.instanceNode.id
      : isInstanceChild
        ? instanceContext!.instanceId
        : null;
    if (!nodeId) return;
    dispatch({ type: "DETACH_INSTANCE", artboardId: artboard.id, nodeId });
  }

  function handleAcceptUpdate() {
    // Not available in multi-select
    if (isMultiSelect) return;
    if (!instanceRootContext?.instanceNode.componentRef) return;
    const ref = instanceRootContext.instanceNode.componentRef;
    const master = instanceRootContext.master;
    if (!master) return;

    // Drop orphaned overrides and type-incompatible content
    const baseTree = getInstanceBaseTree(master, ref.presetId);
    const cleanedOverrides = { ...ref.overrides };
    for (const masterNodeId of Object.keys(cleanedOverrides)) {
      const masterNode = findDesignNodeById(baseTree, masterNodeId);
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
    // Not available in multi-select
    if (isMultiSelect) return;
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
      {isInstanceRoot && instanceRootContext && instanceRootContext.instanceNode.componentRef && (
        <InstanceRootBanner
          context={instanceRootContext}
          onEditMaster={handleEditMaster}
          onDetach={handleDetach}
          overriddenMasterNodeCount={countOverriddenMasterNodes(
            instanceRootContext.instanceNode.componentRef.overrides
          )}
          onResetAllOverrides={handleResetAllOverrides}
        />
      )}
      {isInstanceRoot &&
        instanceRootContext?.master?.presets &&
        instanceRootContext.master.presets.length > 0 &&
        !isMultiSelect &&
        instanceRootContext.instanceNode.componentRef && (
          <div className="px-4 py-2 border-b border-[#EFEFEC]">
            <div className="text-[10px] uppercase tracking-[1px] text-[#A0A0A0] mb-1.5">Preset</div>
            <InspectorSelect
              aria-label="Component preset"
              value={instanceRootContext.instanceNode.componentRef.presetId ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                dispatch({
                  type: "SET_INSTANCE_PRESET",
                  artboardId: artboard.id,
                  instanceNodeId: instanceRootContext.instanceNode.id,
                  presetId: v === "" ? null : v,
                });
              }}
            >
              <option value="">Default</option>
              {instanceRootContext.master.presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </InspectorSelect>
          </div>
        )}
      {isInstanceChild && instanceContext && (
        <InstanceChildBanner
          context={instanceContext}
          nodeName={primaryNode.name}
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
                      const el = document.querySelector(`[data-node-id="${primaryNode.id}"]`);
                      const measured = el ? Math.round(el.getBoundingClientRect().width / zoom) : 200;
                      applyImmediate({ width: measured }, "Set width to Fixed");
                    }
                  }}
                  className="flex-1"
                />
                {getSizingMode(style.width) === "fixed" ? (
                  <InspectorNumberInput
                    value={isMultiSelect
                      ? (comparisons?.width?.sharedValue as number | "") ?? ""
                      : typeof style.width === "number" ? style.width : ""
                    }
                    mixed={isMultiSelect && comparisons?.width?.status === "mixed"}
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
                      const el = document.querySelector(`[data-node-id="${primaryNode.id}"]`);
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
                      const el = document.querySelector(`[data-node-id="${primaryNode.id}"]`);
                      const measured = el ? Math.round(el.getBoundingClientRect().height / zoom) : 200;
                      applyImmediate({ height: measured }, "Set height to Fixed");
                    }
                  }}
                  className="flex-1"
                />
                {getSizingMode(style.height) === "fixed" ? (
                  <InspectorNumberInput
                    value={isMultiSelect
                      ? (comparisons?.height?.sharedValue as number | "") ?? ""
                      : typeof style.height === "number" ? style.height : ""
                    }
                    mixed={isMultiSelect && comparisons?.height?.status === "mixed"}
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
                      const el = document.querySelector(`[data-node-id="${primaryNode.id}"]`);
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
              node={primaryNode}
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
                value={isMultiSelect
                  ? (comparisons?.gap?.sharedValue as number | "") ?? ""
                  : style.gap ?? ""
                }
                mixed={isMultiSelect && comparisons?.gap?.status === "mixed"}
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
                value={isMultiSelect
                  ? (comparisons?.fontFamily?.sharedValue as string | "") ?? ""
                  : style.fontFamily || resolved?.fontFamily || ""
                }
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
                  value={isMultiSelect
                    ? (comparisons?.fontWeight?.sharedValue as number | "") ?? ""
                    : style.fontWeight ?? resolved?.fontWeight ?? ""
                  }
                  mixed={isMultiSelect && comparisons?.fontWeight?.status === "mixed"}
                  placeholder="400"
                  min={100}
                  max={900}
                  step={100}
                  className={cn(!isMultiSelect && resolved?.isInherited.fontWeight && style.fontWeight == null && "text-[#A0A0A0] dark:text-[#666666]")}
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
                  value={isMultiSelect
                    ? (comparisons?.fontSize?.sharedValue as number | "") ?? ""
                    : style.fontSize ?? resolved?.fontSize ?? ""
                  }
                  mixed={isMultiSelect && comparisons?.fontSize?.status === "mixed"}
                  placeholder="16"
                  min={1}
                  className={cn(!isMultiSelect && resolved?.isInherited.fontSize && style.fontSize == null && "text-[#A0A0A0] dark:text-[#666666]")}
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
                  value={isMultiSelect
                    ? (comparisons?.lineHeight?.sharedValue as number | "") ?? ""
                    : style.lineHeight ?? ""
                  }
                  mixed={isMultiSelect && comparisons?.lineHeight?.status === "mixed"}
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
                  value={isMultiSelect
                    ? (comparisons?.letterSpacing?.sharedValue as number | "") ?? ""
                    : style.letterSpacing ?? ""
                  }
                  mixed={isMultiSelect && comparisons?.letterSpacing?.status === "mixed"}
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
                color={isMultiSelect
                  ? (comparisons?.background?.sharedValue as string | "") ?? ""
                  : style.background || ""
                }
                mixed={isMultiSelect && comparisons?.background?.status === "mixed"}
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
                color={isMultiSelect
                  ? (comparisons?.foreground?.sharedValue as string | "") ?? ""
                  : style.foreground || ""
                }
                mixed={isMultiSelect && comparisons?.foreground?.status === "mixed"}
                documentColors={documentColors}
                onCommit={() => history.flush()}
                onChange={(c) => updateStyle({ foreground: c })}
              />
            </InspectorFieldRow>

            {/* Cover Image (frame only) */}
            {primaryNode.type === "frame" && (
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
            {primaryNode.type !== "divider" && (
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
                    value={isMultiSelect
                      ? (comparisons?.borderRadius?.sharedValue as number | "") ?? ""
                      : style.borderRadius ?? ""
                    }
                    mixed={isMultiSelect && comparisons?.borderRadius?.status === "mixed"}
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
            {primaryNode.type === "divider" ? (
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
                        value={isMultiSelect
                          ? (comparisons?.borderWidth?.sharedValue as number | "") ?? ""
                          : style.borderWidth ?? 1
                        }
                        mixed={isMultiSelect && comparisons?.borderWidth?.status === "mixed"}
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
            {primaryNode.type !== "divider" && (
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
                  value={isMultiSelect
                    ? comparisons?.opacity?.sharedValue != null
                      ? Math.round((comparisons.opacity.sharedValue as number) * 100)
                      : 100
                    : style.opacity != null ? Math.round((style.opacity ?? 1) * 100) : 100
                  }
                  mixed={isMultiSelect && comparisons?.opacity?.status === "mixed"}
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
