"use client";

import * as React from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvas } from "@/lib/canvas/canvas-context";
import { getEffectiveReferenceWeight } from "@/lib/canvas/unified-canvas-state";
import type { ReferenceItem } from "@/lib/canvas/unified-canvas-state";
import type { HandlePosition } from "../hooks/useResize";
import { ResizeHandles } from "./ResizeHandles";
import { ReferenceXray } from "./intent/ReferenceXray";
import { RegionLasso } from "./intent/RegionLasso";
import { RoleChips } from "./intent/RoleChips";
import {
  addReferenceRegion,
  removeReferenceRegion,
  toggleReferenceRole,
  xrayFacts,
} from "@/lib/intent/reference-actions";
import type { ReferenceRole } from "@/lib/design-memory/types";

const REGION_ROLES: ReferenceRole[] = ["layout", "typography", "color", "imagery", "components", "mood"];

type CanvasReferenceProps = {
  item: ReferenceItem;
  isDragging?: boolean;
  isResizing?: boolean;
  isAnalyzing?: boolean;
  /** Reference X-ray is on (editor-wide, toggled with X). */
  xray?: boolean;
  onPointerDown?: (e: React.PointerEvent, itemId: string, x: number, y: number) => void;
  onResizeHandlePointerDown?: (
    e: React.PointerEvent,
    itemId: string,
    handle: HandlePosition,
    itemX: number,
    itemY: number,
    itemW: number,
    itemH: number
  ) => void;
};

export function CanvasReference({
  item,
  isDragging,
  isResizing,
  isAnalyzing,
  xray = false,
  onPointerDown,
  onResizeHandlePointerDown,
}: CanvasReferenceProps) {
  const { state, dispatch } = useCanvas();
  const [natural, setNatural] = React.useState<{ width: number; height: number } | null>(null);
  const [lassoRole, setLassoRole] = React.useState<ReferenceRole | null>(null);
  const roles = item.roles ?? [];
  const displayName = item.title || "reference";
  const setRoles = (role: ReferenceRole) =>
    dispatch({ type: "UPDATE_ITEM", itemId: item.id, changes: { roles: toggleReferenceRole(item.roles, role) } });
  const isSelected = state.selection.selectedItemIds.includes(item.id);
  const extractedColors = item.extracted?.colors ?? [];

  const currentWeight = getEffectiveReferenceWeight(item);
  const isAutoWeighted = !item.weight && currentWeight !== "default";
  const nextWeight =
    currentWeight === "default" ? "primary"
    : currentWeight === "primary" ? "muted"
    : "default";

  const handleWeightToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({
      type: "UPDATE_ITEM",
      itemId: item.id,
      changes: { weight: nextWeight === "default" ? undefined : nextWeight },
    });
  };

  return (
    <div
      data-canvas-item-id={item.id}
      className="absolute"
      style={{
        left: item.x,
        top: item.y,
        zIndex: item.zIndex,
      }}
    >
      {/* Reference card */}
      <div
        className={cn(
          "canvas-reference group relative cursor-pointer rounded-[4px] border overflow-hidden bg-white transition-[border-color,box-shadow,shadow,opacity] duration-150",
          isSelected
            ? "outline outline-1 outline-[#4B57DB] border-[#4B57DB]"
            : "border-[#E5E5E0] hover:outline hover:outline-1 hover:outline-[#4B57DB]/40",
          (isDragging || isResizing) ? "shadow-md" : "shadow-sm"
        )}
        style={{
          width: item.width,
          height: item.height,
          opacity: currentWeight === "muted" ? 0.4 : 1,
          outline: currentWeight === "primary" ? "2px solid #4B57DB" : undefined,
        }}
        onPointerDown={(e) => onPointerDown?.(e, item.id, item.x, item.y)}
        onClick={(e) => {
          e.stopPropagation();
          dispatch({
            type: "SELECT_ITEM",
            itemId: item.id,
            addToSelection: e.shiftKey,
          });
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imageUrl}
          alt={item.title || "Reference"}
          className="h-full w-full object-cover"
          draggable={false}
          onLoad={(e) => setNatural({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })}
        />

        {xray && (
          <ReferenceXray summary={item.perception} regions={item.regions} natural={natural} box={{ width: item.width, height: item.height }} />
        )}
        {xray && isSelected && lassoRole && (
          <RegionLasso
            role={lassoRole}
            natural={natural}
            box={{ width: item.width, height: item.height }}
            zoom={state.viewport.zoom}
            onCommit={(bbox) => {
              dispatch({ type: "UPDATE_ITEM", itemId: item.id, changes: { regions: addReferenceRegion(item.regions, bbox, lassoRole) } });
              setLassoRole(null);
            }}
            onCancel={() => setLassoRole(null)}
          />
        )}

        {/* Annotation pin */}
        {item.annotation && (
          <div className="absolute bottom-2 right-2 h-2.5 w-2.5 rounded-full bg-[#4B57DB] shadow-sm" />
        )}

        {/* Analyzing indicator — pulsing dot */}
        {isAnalyzing && (
          <div className="absolute top-2 left-2 h-2 w-2 rounded-full bg-[#4B57DB] opacity-60 animate-pulse" />
        )}

        {/* Style ref badge — moved to top-left to avoid overlap with weight toggle */}
        {(item.isStyleRef || isAutoWeighted) && (
          <div className="absolute top-2 left-2 rounded-[2px] bg-[#4B57DB] px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-wider text-white">
            {item.isStyleRef ? "Style" : "AI"}
          </div>
        )}

        {/* Weight toggle — top-right corner */}
        <button
          onClick={handleWeightToggle}
          className={cn(
            "absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-[2px] transition-opacity",
            currentWeight === "default" ? "opacity-0 group-hover:opacity-100" : "opacity-100"
          )}
          style={{
            background:
              currentWeight === "primary" ? "#4B57DB"
              : currentWeight === "muted" ? "rgba(0,0,0,0.4)"
              : "rgba(0,0,0,0.3)",
          }}
          title={
            currentWeight === "primary" ? "Primary reference (click to mute)"
            : currentWeight === "muted" ? "Muted (click to reset)"
            : "Click to star as primary"
          }
        >
          {currentWeight === "primary" && <Star size={12} fill="#FFF" stroke="none" />}
          {currentWeight === "muted" && <span style={{ color: "#FFF", fontSize: 10 }}>×</span>}
        </button>
      </div>

      {/* Resize handles — visible only when selected */}
      {isSelected && onResizeHandlePointerDown && (
        <ResizeHandles
          width={item.width}
          height={item.height}
          onHandlePointerDown={(e, handle) =>
            onResizeHandlePointerDown(e, item.id, handle, item.x, item.y, item.width, item.height)
          }
        />
      )}

      {/* Roles, regions and X-ray facts for the selected reference (1.8) */}
      {isSelected && (
        <div
          className="mt-1.5 flex flex-col gap-1.5 rounded-[4px] border border-[#E5E5E0] bg-white p-1.5 dark:border-[#333333] dark:bg-[#1A1A1A]"
          style={{ width: Math.max(item.width, 240) }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <RoleChips roles={roles} onToggle={setRoles} label={`Roles for ${displayName}`} />
          {xray && (
            <>
              <div className="flex flex-wrap items-center gap-1">
                <span className="mono-kicker mr-1">Region</span>
                {REGION_ROLES.map((role) => (
                  <button
                    key={role}
                    type="button"
                    aria-pressed={lassoRole === role}
                    onClick={(e) => {
                      e.stopPropagation();
                      setLassoRole(lassoRole === role ? null : role);
                    }}
                    className={
                      "rounded-[2px] border px-1.5 py-0.5 font-mono text-[10px] uppercase outline-none focus-visible:ring-2 focus-visible:ring-[#D1E4FC] " +
                      (lassoRole === role ? "border-[#4B57DB] bg-[#EDF1FE] text-[#4B57DB]" : "border-[#E5E5E0] bg-white text-[#6B6B6B] hover:border-[#4B57DB]")
                    }
                  >
                    {role === "typography" ? "Type" : role}
                  </button>
                ))}
              </div>
              {(item.regions ?? []).length > 0 && (
                <ul className="flex flex-wrap gap-1" aria-label="Regions">
                  {(item.regions ?? []).map((region, index) => (
                    <li key={index} className="flex items-center gap-1 rounded-[2px] border border-[#E5E5E0] px-1 font-mono text-[10px] uppercase text-[#6B6B6B]">
                      {`${region.role} ${index + 1}`}
                      <button
                        type="button"
                        aria-label={`Remove ${region.role} region ${index + 1}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          dispatch({ type: "UPDATE_ITEM", itemId: item.id, changes: { regions: removeReferenceRegion(item.regions, index) } });
                        }}
                        className="text-[#A0A0A0] outline-none hover:text-[#1A1A1A] focus-visible:ring-2 focus-visible:ring-[#D1E4FC]"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {item.perception && (
                <ul className="flex flex-col gap-0.5 border-t border-[#EFEFEC] pt-1 text-[10px] text-[#6B6B6B] dark:border-[#333333] dark:text-[#A0A0A0]" aria-label="Measured facts">
                  {xrayFacts(item.perception).map((fact) => (
                    <li key={fact}>{fact}</li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}

      {/* Extracted color dots — below the card, outside the border */}
      {extractedColors.length > 0 && (
        <div className="mt-1.5 flex gap-1 opacity-60">
          {extractedColors.slice(0, 5).map((color, i) => (
            <div
              key={`${color}-${i}`}
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
