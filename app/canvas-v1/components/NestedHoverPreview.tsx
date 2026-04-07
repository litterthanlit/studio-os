"use client";

/**
 * NestedHoverPreview — hover preview overlay for Track 4 direct nested selection.
 *
 * Shows a dashed outline around the hover target and a floating breadcrumb label.
 * Rendered via portal to document.body to avoid z-index issues with canvas.
 */

import * as React from "react";
import * as ReactDOM from "react-dom";
import type { DesignNode } from "@/lib/canvas/design-node";
import { getNodeBounds } from "@/lib/canvas/nested-selection";

// =============================================================================
// Types
// =============================================================================

interface NestedHoverPreviewProps {
  /** The node being hovered (from useNestedSelection) */
  targetNode: DesignNode | null;

  /** Chain from root to target for breadcrumb */
  parentChain: DesignNode[];

  /** Canvas transform state for positioning */
  zoom: number;
  scrollX: number;
  scrollY: number;

  /** Artboard offset (where the artboard is positioned on canvas) */
  artboardX: number;
  artboardY: number;
}

// =============================================================================
// Component
// =============================================================================

export function NestedHoverPreview({
  targetNode,
  parentChain,
  zoom,
  scrollX,
  scrollY,
  artboardX,
  artboardY,
}: NestedHoverPreviewProps): JSX.Element | null {
  // Early exit if no target
  if (!targetNode) {
    return null;
  }

  // Calculate bounds in screen coordinates
  const bounds = getNodeBounds(targetNode);

  // Skip if bounds are invalid
  if (bounds.width === 0 || bounds.height === 0) {
    return null;
  }

  const screenX = (bounds.x + artboardX + scrollX) * zoom;
  const screenY = (bounds.y + artboardY + scrollY) * zoom;
  const screenWidth = bounds.width * zoom;
  const screenHeight = bounds.height * zoom;

  // Get immediate parent for breadcrumb (last item in parentChain)
  const immediateParent = parentChain.length > 0 
    ? parentChain[parentChain.length - 1] 
    : null;

  const targetName = targetNode.name || targetNode.type;
  const parentName = immediateParent?.name || immediateParent?.type;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 pointer-events-none">
      {/* Dashed outline */}
      <div
        style={{
          position: "absolute",
          left: screenX,
          top: screenY,
          width: screenWidth,
          height: screenHeight,
          border: "1.5px dashed #4B57DB",
          backgroundColor: "rgba(75, 87, 219, 0.05)",
          zIndex: 40,
          borderRadius: 2,
        }}
      />

      {/* Breadcrumb label */}
      <div
        style={{
          position: "absolute",
          left: screenX + screenWidth / 2,
          top: screenY - 28, // Position above outline with some gap
          transform: "translateX(-50%)",
          zIndex: 41,
        }}
      >
        <div
          className="flex items-center gap-1 px-2 py-1 bg-white border rounded text-[11px] whitespace-nowrap"
          style={{
            borderColor: "#E5E5E0",
            borderRadius: 4,
            fontFamily: "var(--font-geist-sans)",
            color: "#1A1A1A",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
          }}
        >
          <span>{targetName}</span>
          {parentName && (
            <>
              <span style={{ color: "#A0A0A0" }}>→</span>
              <span>{parentName}</span>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
