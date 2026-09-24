"use client";

// Live Build (master plan 1.9): while a screen generates, the sections that
// have streamed in render read-only in the artboard, followed by flat
// placeholder blocks for what is still coming. Replaced by the validated tree
// when the run completes.

import * as React from "react";
import type { DesignNode } from "@/lib/canvas/design-node";
import { ComposeDocumentViewV6 } from "../ComposeDocumentViewV6";

/** Placeholder heights for sections that have not landed yet. */
const PENDING_HEIGHTS = [240, 160];

export function LiveBuildPreview({ sections, width }: { sections: DesignNode[]; width: number }) {
  const tree = React.useMemo<DesignNode>(
    () => ({
      id: "live-build-root",
      type: "frame",
      name: "Live build",
      style: { display: "flex", flexDirection: "column", width },
      children: sections,
    }),
    [sections, width],
  );

  return (
    <div className="flex flex-col" data-testid="live-build">
      <div aria-live="polite" className="sr-only">
        {`${sections.length} ${sections.length === 1 ? "section" : "sections"} built: ${sections.map((s) => s.name).join(", ")}`}
      </div>
      <ComposeDocumentViewV6 tree={tree} interactive={false} />
      <div aria-hidden="true" className="flex flex-col gap-3 bg-white p-6">
        <span className="mono-kicker">{`BUILDING · ${sections.length} ${sections.length === 1 ? "SECTION" : "SECTIONS"} READY`}</span>
        {PENDING_HEIGHTS.map((height, index) => (
          <div key={index} className="w-full rounded-[4px] bg-[#F5F5F0]" style={{ height }} />
        ))}
      </div>
    </div>
  );
}
