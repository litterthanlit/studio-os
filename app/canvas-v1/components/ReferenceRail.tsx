"use client";

import React from "react";
import type { ReferenceItem } from "@/lib/canvas/unified-canvas-state";
import { OnboardingHint, markHintSeen } from "./OnboardingHint";

interface ReferenceRailProps {
  references: ReferenceItem[];
}

const MAX_THUMBNAILS = 8;

export function ReferenceRail({ references }: ReferenceRailProps) {
  // Dismiss hint when references are added
  React.useEffect(() => {
    if (references.length > 0) {
      markHintSeen("references-seen");
    }
  }, [references.length]);

  // Empty state
  if (references.length === 0) {
    return (
      <div className="px-3 py-2">
        <p className="text-[11px] text-[#A0A0A0]">
          Drop reference images onto the canvas to inform generation
        </p>
        <OnboardingHint
          hintKey="references-seen"
          text="Drop images here to set your taste"
          className="mt-2"
        />
      </div>
    );
  }

  const primaryCount = references.filter((r) => r.weight === "primary").length;
  const mutedCount = references.filter((r) => r.weight === "muted").length;
  const activeCount = references.length - mutedCount;

  const countLabel =
    primaryCount > 0
      ? `${activeCount} ${activeCount === 1 ? "Reference" : "References"} (${primaryCount} starred)`
      : mutedCount > 0
        ? `${activeCount} active, ${mutedCount} muted`
        : `${references.length} ${references.length === 1 ? "Reference" : "References"}`;

  const visible = references.slice(0, MAX_THUMBNAILS);
  const overflowCount = Math.max(0, references.length - MAX_THUMBNAILS);

  return (
    <div className="px-3 py-2">
      {/* Mono-kicker header */}
      <span className="font-mono text-[10px] uppercase tracking-[1px] text-[#8A8A8A] block mb-1.5">
        {countLabel}
      </span>

      {/* Scrollable thumbnail row */}
      <div className="flex items-start gap-2 overflow-x-auto">
        {visible.map((ref) => {
          const colors = ref.extracted?.colors ?? [];

          return (
            <div key={ref.id} className="shrink-0 flex flex-col items-center gap-0.5">
              {/* Thumbnail */}
              <img
                src={ref.imageUrl}
                alt={ref.title ?? ""}
                className="w-10 h-10 rounded-[2px] object-cover"
                draggable={false}
              />

              {/* Color dots (up to 3, 50% opacity per spec) */}
              {colors.length > 0 && (
                <div className="flex gap-0.5">
                  {colors.slice(0, 3).map((color, i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: color, opacity: 0.5 }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Overflow badge */}
        {overflowCount > 0 && (
          <div className="shrink-0 w-10 h-10 rounded-[2px] bg-[#F5F5F0] border border-[#E5E5E0] flex items-center justify-center">
            <span className="text-[10px] font-mono text-[#6B6B6B]">
              +{overflowCount}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
