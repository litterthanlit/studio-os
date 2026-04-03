"use client";

/**
 * MultiSelectActionBar — shown above the inspector when multiple nodes
 * are selected. Provides align, distribute, and group/ungroup actions.
 */

import * as React from "react";
import {
  AlignHorizontalJustifyStart,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignHorizontalSpaceBetween,
  AlignVerticalSpaceBetween,
  Group,
  Ungroup,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvas } from "@/lib/canvas/canvas-context";
import { allAbsolute, allSameParent } from "@/lib/canvas/multi-select-helpers";
import { findDesignNodeById } from "@/lib/canvas/design-node";
import type { DesignNode } from "@/lib/canvas/design-node";
import { isDesignNodeTree } from "@/lib/canvas/compose";
import type { ArtboardItem } from "@/lib/canvas/unified-canvas-state";
import type { AlignDirection, DistributeAxis } from "@/lib/canvas/multi-select-helpers";

// ─── Action Button ──────────────────────────────────────────────────────────

function ActionButton({
  icon: Icon,
  label,
  disabled,
  onClick,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex items-center justify-center w-[26px] h-[26px] border rounded-[2px] transition-colors",
        disabled
          ? "text-[#D1D1D1] cursor-not-allowed bg-[#FAFAF8] border-[#E5E5E0]"
          : "bg-white border-[#E5E5E0] text-[#6B6B6B] hover:border-[#D1E4FC] hover:text-[#1E5DF2]"
      )}
    >
      <Icon size={14} strokeWidth={1.5} />
    </button>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function MultiSelectActionBar() {
  const { state, dispatch } = useCanvas();
  const { selection, items } = state;
  const { selectedNodeIds, activeArtboardId } = selection;

  // Find the active artboard + tree
  const activeArtboard = React.useMemo(() => {
    if (!activeArtboardId) return null;
    const item = items.find((i) => i.id === activeArtboardId);
    return item?.kind === "artboard" ? (item as ArtboardItem) : null;
  }, [items, activeArtboardId]);

  const tree: DesignNode | null = React.useMemo(() => {
    if (!activeArtboard || !isDesignNodeTree(activeArtboard.pageTree)) return null;
    return activeArtboard.pageTree as DesignNode;
  }, [activeArtboard]);

  // Compute capabilities
  const isAbsolute = React.useMemo(() => {
    if (!tree || selectedNodeIds.length < 2) return false;
    return allAbsolute(selectedNodeIds, tree);
  }, [tree, selectedNodeIds]);

  const sameParent = React.useMemo(() => {
    if (!tree || selectedNodeIds.length < 2) return null;
    return allSameParent(selectedNodeIds, tree);
  }, [tree, selectedNodeIds]);

  // Check if primary node is a group (for ungroup)
  const primaryNode = React.useMemo(() => {
    if (!tree || !selection.selectedNodeId) return null;
    return findDesignNodeById(tree, selection.selectedNodeId);
  }, [tree, selection.selectedNodeId]);

  const isPrimaryGroup = primaryNode?.isGroup === true;

  const canAlign = isAbsolute;
  const canDistribute = isAbsolute && selectedNodeIds.length >= 3;
  const canGroup = isAbsolute && sameParent !== null;
  const canUngroup = isPrimaryGroup && selectedNodeIds.length === 1;

  // ── Handlers ────────────────────────────────────────────────────────

  const handleAlign = React.useCallback(
    (direction: AlignDirection) => {
      if (!activeArtboardId) return;
      dispatch({ type: "ALIGN_NODES", artboardId: activeArtboardId, direction });
    },
    [dispatch, activeArtboardId]
  );

  const handleDistribute = React.useCallback(
    (axis: DistributeAxis) => {
      if (!activeArtboardId) return;
      dispatch({ type: "DISTRIBUTE_NODES", artboardId: activeArtboardId, axis });
    },
    [dispatch, activeArtboardId]
  );

  const handleGroup = React.useCallback(() => {
    if (!activeArtboardId) return;
    dispatch({ type: "GROUP_NODES", artboardId: activeArtboardId });
  }, [dispatch, activeArtboardId]);

  const handleUngroup = React.useCallback(() => {
    if (!activeArtboardId || !selection.selectedNodeId) return;
    dispatch({ type: "UNGROUP_NODES", artboardId: activeArtboardId, nodeId: selection.selectedNodeId });
  }, [dispatch, activeArtboardId, selection.selectedNodeId]);

  // Don't render if not in multi-select
  if (selectedNodeIds.length < 2) return null;

  return (
    <div className="border-b border-[#E5E5E0] bg-[#F5F5F0]">
      {/* Header */}
      <div className="px-3 pt-2.5 pb-1.5">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[#A0A0A0]">
          {selectedNodeIds.length} nodes selected
        </span>
      </div>

      {/* Align row */}
      <div className="px-3 pb-1.5">
        <div className="flex items-center gap-1">
          <ActionButton
            icon={AlignHorizontalJustifyStart}
            label="Align Left"
            disabled={!canAlign}
            onClick={() => handleAlign("left")}
          />
          <ActionButton
            icon={AlignHorizontalJustifyCenter}
            label="Align Center Horizontal"
            disabled={!canAlign}
            onClick={() => handleAlign("centerH")}
          />
          <ActionButton
            icon={AlignHorizontalJustifyEnd}
            label="Align Right"
            disabled={!canAlign}
            onClick={() => handleAlign("right")}
          />

          <div className="w-px h-4 bg-[#E5E5E0] mx-0.5" />

          <ActionButton
            icon={AlignVerticalJustifyStart}
            label="Align Top"
            disabled={!canAlign}
            onClick={() => handleAlign("top")}
          />
          <ActionButton
            icon={AlignVerticalJustifyCenter}
            label="Align Center Vertical"
            disabled={!canAlign}
            onClick={() => handleAlign("centerV")}
          />
          <ActionButton
            icon={AlignVerticalJustifyEnd}
            label="Align Bottom"
            disabled={!canAlign}
            onClick={() => handleAlign("bottom")}
          />
        </div>
      </div>

      {/* Distribute + Group row */}
      <div className="px-3 pb-2.5">
        <div className="flex items-center gap-1">
          <ActionButton
            icon={AlignHorizontalSpaceBetween}
            label="Distribute Horizontal"
            disabled={!canDistribute}
            onClick={() => handleDistribute("horizontal")}
          />
          <ActionButton
            icon={AlignVerticalSpaceBetween}
            label="Distribute Vertical"
            disabled={!canDistribute}
            onClick={() => handleDistribute("vertical")}
          />

          <div className="w-px h-4 bg-[#E5E5E0] mx-0.5" />

          {canUngroup ? (
            <ActionButton
              icon={Ungroup}
              label="Ungroup"
              onClick={handleUngroup}
            />
          ) : (
            <ActionButton
              icon={Group}
              label="Group"
              disabled={!canGroup}
              onClick={handleGroup}
            />
          )}
        </div>
      </div>
    </div>
  );
}
