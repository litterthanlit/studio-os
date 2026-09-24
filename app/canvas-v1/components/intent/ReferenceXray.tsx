"use client";

// Reference X-ray (master plan 1.8): what the engine measured and perceived,
// drawn over the reference — column grid, spacing ruler, type ladder, palette
// proportions, key-move pins and lasso regions. 1px #4B57DB at 60%, 10px IBM
// Plex Mono labels on solid white, no blur. Facts are also listed as text.

import * as React from "react";
import { coverTransform, xrayFacts, type PerceptionSummary, type ReferenceRegion } from "@/lib/intent/reference-actions";

const LINE = "rgba(75, 87, 219, 0.6)";
const labelClass = "absolute whitespace-nowrap border border-[#4B57DB]/60 bg-white px-1 font-mono text-[10px] leading-[14px] text-[#4B57DB]";

function readableOn(hex: string): string {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0) > 0.55 ? "#1A1A1A" : "#FFFFFF";
}

type ReferenceXrayProps = {
  summary: PerceptionSummary | undefined;
  regions?: ReferenceRegion[];
  natural: { width: number; height: number } | null;
  box: { width: number; height: number };
};

export function ReferenceXray({ summary, regions = [], natural, box }: ReferenceXrayProps) {
  if (!summary) {
    return (
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <span className={labelClass} style={{ left: 8, top: 8 }}>NOT ANALYZED YET · GENERATE ONCE</span>
      </div>
    );
  }
  const fit = coverTransform(natural ?? box, box);
  const facts = xrayFacts(summary);
  const grid = summary.grid;
  const columnEdges = grid
    ? Array.from({ length: grid.columns }, (_, i) => {
        const start = grid.marginLeft + i * (grid.columnWidth + grid.gutter);
        return [start / grid.width, (start + grid.columnWidth) / grid.width];
      }).flat()
    : [];
  const sizes = summary.type ? [...summary.type.sizes].sort((a, b) => b - a) : [];
  const maxSize = sizes[0] ?? 1;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" data-testid="reference-xray">
      <ul className="sr-only" aria-label="Reference X-ray facts">
        {facts.map((fact) => (
          <li key={fact}>{fact}</li>
        ))}
      </ul>

      <div aria-hidden="true">
        {/* Column grid */}
        {columnEdges.map((nx, i) => (
          <div key={`col-${i}`} className="absolute top-0 h-full" style={{ left: fit.toCard(nx, 0).x, width: 1, background: LINE }} />
        ))}

        {/* Spacing ruler (bottom edge, above the palette bar): outer margin + first gutter */}
        {grid && (
          <>
            <div className="absolute" style={{ left: fit.toCard(0, 0).x, bottom: 40, width: fit.toCard(grid.marginLeft / grid.width, 0).x - fit.toCard(0, 0).x, height: 1, background: LINE }} />
            <span className={labelClass} style={{ left: Math.max(2, fit.toCard(0, 0).x + 2), bottom: 22 }}>{`${grid.marginLeft}px`}</span>
            {grid.columns > 1 && (
              <span className={labelClass} style={{ left: fit.toCard((grid.marginLeft + grid.columnWidth) / grid.width, 0).x + 2, bottom: 22 }}>
                {`${grid.gutter}px · ${grid.columns} COL`}
              </span>
            )}
          </>
        )}

        {/* Type ladder */}
        {summary.type && (
          <div className="absolute right-2 top-9 flex flex-col gap-0.5 border border-[#4B57DB]/60 bg-white px-1.5 py-1">
            <span className="font-mono text-[10px] leading-[14px] text-[#4B57DB]">{`×${summary.type.ratio}`}</span>
            {sizes.map((size) => (
              <div key={size} className="flex items-center gap-1">
                <div style={{ width: Math.max(4, (size / maxSize) * 40), height: 1, background: LINE }} />
                <span className="font-mono text-[10px] leading-[12px] text-[#4B57DB]">{Math.round(size)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Lasso regions */}
        {regions.map((region, i) => {
          const a = fit.toCard(region.bbox[0], region.bbox[1]);
          const b = fit.toCard(region.bbox[0] + region.bbox[2], region.bbox[1] + region.bbox[3]);
          return (
            <div key={`region-${i}`} className="absolute" style={{ left: a.x, top: a.y, width: b.x - a.x, height: b.y - a.y, border: `1px solid ${LINE}` }}>
              <span className={labelClass} style={{ left: -1, top: -15 }}>{region.role.toUpperCase()}</span>
            </div>
          );
        })}

        {/* Key-move pins */}
        {summary.keyMoves.map((move, i) => {
          const c = fit.toCard(move.bbox[0] + move.bbox[2] / 2, move.bbox[1] + move.bbox[3] / 2);
          return (
            <span
              key={`pin-${i}`}
              title={move.label}
              className="absolute flex h-4 w-4 items-center justify-center rounded-[2px] bg-[#4B57DB] font-mono text-[10px] text-white"
              style={{ left: c.x - 8, top: c.y - 8 }}
            >
              {i + 1}
            </span>
          );
        })}

        {/* Palette proportions */}
        {summary.palette.length > 0 && (
          <div className="absolute bottom-0 left-0 flex h-[18px] w-full border-t border-[#4B57DB]/60">
            {summary.palette.map((swatch) => (
              <div
                key={`${swatch.hex}-${swatch.role}`}
                className="flex items-center justify-center overflow-hidden font-mono text-[10px]"
                style={{ flexGrow: swatch.area, flexBasis: 0, background: swatch.hex, color: readableOn(swatch.hex) }}
              >
                {swatch.area >= 0.08 ? `${Math.round(swatch.area * 100)}%` : ""}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
