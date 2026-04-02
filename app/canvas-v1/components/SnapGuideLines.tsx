"use client";

/**
 * SnapGuideLines — visual overlay for snap alignment guides.
 *
 * Renders thin magenta lines across the full container when snap guides
 * are active during drag operations. Framer-style visual language.
 */

import type { SnapGuide } from "@/app/canvas-v1/hooks/useSnapGuides";

type SnapGuideLinesProps = {
  guides: SnapGuide[];
  containerWidth: number;
  containerHeight: number;
};

export function SnapGuideLines({ guides, containerWidth, containerHeight }: SnapGuideLinesProps) {
  if (guides.length === 0) return null;

  return (
    <>
      {guides.map((guide, i) => {
        if (guide.axis === "x") {
          // Vertical line at guide.position
          return (
            <div
              key={`snap-x-${i}`}
              style={{
                position: "absolute",
                left: Math.max(0, Math.min(containerWidth, Math.round(guide.position))),
                top: 0,
                width: 1,
                height: containerHeight,
                background: "rgba(255, 0, 102, 0.7)",
                pointerEvents: "none",
                zIndex: 9999,
              }}
            />
          );
        }
        // Horizontal line at guide.position
        return (
          <div
            key={`snap-y-${i}`}
            style={{
              position: "absolute",
              top: Math.max(0, Math.min(containerHeight, Math.round(guide.position))),
              left: 0,
              height: 1,
              width: containerWidth,
              background: "rgba(255, 0, 102, 0.7)",
              pointerEvents: "none",
              zIndex: 9999,
            }}
          />
        );
      })}
    </>
  );
}
