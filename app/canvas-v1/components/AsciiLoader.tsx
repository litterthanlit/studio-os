"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type AsciiLoaderProps = {
  progress: number;
  phase: "analyzing" | "composing" | "rendering";
  dissolving?: boolean;
  onComplete?: () => void;
};

const PHASE_META: Record<
  AsciiLoaderProps["phase"],
  { label: string; detail: string }
> = {
  analyzing: {
    label: "Reading the board",
    detail: "Scanning references, density, and type rhythm.",
  },
  composing: {
    label: "Mapping structure",
    detail: "Turning taste into sections, pacing, and breakpoints.",
  },
  rendering: {
    label: "Rendering variants",
    detail: "Composing preview cards and editable page systems.",
  },
};

const ROWS = 12;
const COLS = 32;

// Viewbox wide enough to slice-fill typical canvas container widths
const VB_W = 640;
const VB_H = 160;
const PAD_X = 10;
const PAD_Y = 10;
const COL_GAP = (VB_W - PAD_X * 2) / (COLS - 1); // ~20px
const ROW_GAP = (VB_H - PAD_Y * 2) / (ROWS - 1); // ~12.9px

// Static per-dot wave offsets — drives organic size variation without JS ticks
const WAVE: ReadonlyArray<ReadonlyArray<number>> = Array.from(
  { length: ROWS },
  (_, row) =>
    Array.from({ length: COLS }, (_, col) => {
      const v = Math.sin(col / 3.5) * 0.6 + Math.cos(row / 2.2) * 0.4;
      return (v + 1) / 2; // normalize 0..1
    })
);

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function AsciiLoader({
  progress,
  phase,
  dissolving = false,
  onComplete,
}: AsciiLoaderProps) {
  const [opacity, setOpacity] = React.useState(1);

  // Dissolve — requestAnimationFrame
  React.useEffect(() => {
    if (!dissolving) {
      setOpacity(1);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const animate = (time: number) => {
      const t = Math.min(1, (time - start) / 320);
      setOpacity(1 - t);
      if (t < 1) {
        raf = requestAnimationFrame(animate);
      } else {
        onComplete?.();
      }
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [dissolving, onComplete]);

  const meta = PHASE_META[phase];
  const pct = Math.round(progress * 100);
  const litCount = Math.max(1, Math.round(progress * 12));

  return (
    <div
      className="w-full overflow-hidden rounded-[4px] border border-[#E5E5E0] bg-white"
      style={{ opacity }}
    >
      {/* Pulse keyframe — scoped to this component's lifetime */}
      <style>{`
        @keyframes halftone-dot-pulse {
          0%, 100% { transform: scale(0.9); }
          50%       { transform: scale(1.1); }
        }
      `}</style>

      {/* ── Halftone dot field ─────────────────────────────────────── */}
      <div className="h-[180px] overflow-hidden bg-[#FAFAF8]">
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          {Array.from({ length: ROWS * COLS }, (_, i) => {
            const row = Math.floor(i / COLS);
            const col = i % COLS;

            const colFraction = col / (COLS - 1);
            // Smoothstep fill left→right with soft 10% leading edge
            const fillIntensity =
              1 - smoothstep(progress - 0.08, progress + 0.02, colFraction);
            const isFilled = fillIntensity > 0.05;

            // Ghost: 1px. Filled: 1px–3px driven by intensity × wave
            const r = isFilled
              ? 1 + fillIntensity * (1 + WAVE[row][col]) * 2
              : 1;

            const cx = PAD_X + col * COL_GAP;
            const cy = PAD_Y + row * ROW_GAP;

            // Stagger delay 0–2s by column + row position
            const delay = ((col * 0.06 + row * 0.12) % 2).toFixed(2);

            return (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={Math.max(0.3, r)}
                fill={isFilled ? "#1E5DF2" : "#E5E5E0"}
                opacity={isFilled ? 0.5 + fillIntensity * 0.5 : 0.5}
                style={
                  isFilled
                    ? {
                        transformBox: "fill-box" as React.CSSProperties["transformBox"],
                        transformOrigin: "center",
                        animation: `halftone-dot-pulse 2s ease-in-out ${delay}s infinite`,
                      }
                    : undefined
                }
              />
            );
          })}
        </svg>
      </div>

      {/* ── Metadata bar ──────────────────────────────────────────── */}
      <div className="flex items-end justify-between gap-6 border-t border-[#E5E5E0] px-5 py-4">
        {/* Left: phase identity */}
        <div className="min-w-0 space-y-1.5">
          <p className="mono-kicker">Studio OS / Generate</p>
          <h3 className="text-[22px] font-semibold tracking-[-0.02em] text-[#1A1A1A]">
            {meta.label}
          </h3>
          <p className="max-w-[360px] text-sm text-[#6B6B6B]">
            {meta.detail}
          </p>
        </div>

        {/* Right: progress + meter + phase indicators */}
        <div className="flex shrink-0 flex-col items-end gap-3">
          <div className="flex items-center gap-4">
            <span className="mono-kicker">Progress</span>
            <span className="font-mono text-[11px] text-[#6B6B6B]">{pct}%</span>
          </div>
          <div className="dither-meter">
            {Array.from({ length: 12 }).map((_, idx) => (
              <span key={idx} className={idx < litCount ? "is-active" : undefined} />
            ))}
          </div>
          <div className="flex gap-3 text-[10px] uppercase tracking-[0.14em] text-[#A0A0A0]">
            <span className={cn(phase === "analyzing" && "text-[#1E5DF2]")}>Read</span>
            <span className={cn(phase === "composing" && "text-[#1E5DF2]")}>Compose</span>
            <span className={cn(phase === "rendering" && "text-[#1E5DF2]")}>Render</span>
          </div>
        </div>
      </div>
    </div>
  );
}
