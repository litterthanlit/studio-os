"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { DitherSurface } from "@/components/ui/dither-surface";

export type AsciiLoaderProps = {
  progress: number;
  phase: "analyzing" | "composing" | "rendering";
  dissolving?: boolean;
  onComplete?: () => void;
};

const PHASE_META: Record<
  AsciiLoaderProps["phase"],
  { label: string; detail: string; variant: "grid" | "fade" | "band" | "noise" }
> = {
  analyzing: {
    label: "Reading the board",
    detail: "Scanning references, density, and type rhythm.",
    variant: "grid",
  },
  composing: {
    label: "Mapping structure",
    detail: "Turning taste into sections, pacing, and breakpoints.",
    variant: "fade",
  },
  rendering: {
    label: "Rendering variants",
    detail: "Composing preview cards and editable page systems.",
    variant: "band",
  },
};

const DOT_COLUMNS = 24;

function buildMatrix(phase: AsciiLoaderProps["phase"], tick: number): boolean[][] {
  return Array.from({ length: 7 }, (_, row) =>
    Array.from({ length: DOT_COLUMNS }, (_, col) => {
      const wave = Math.sin((col + tick * 0.9) / 2.2) + Math.cos((row * 2.2 + tick) / 2.8);
      if (phase === "analyzing") return wave > 0.38 && col > 1 && col < 19;
      if (phase === "composing") return wave > 0.12 && col > row && col < 22 - row;
      return wave > -0.1 && col > 3 && col < 22;
    })
  );
}

export function AsciiLoader({
  progress,
  phase,
  dissolving = false,
  onComplete,
}: AsciiLoaderProps) {
  const [tick, setTick] = React.useState(0);
  const [opacity, setOpacity] = React.useState(1);

  React.useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 120);
    return () => window.clearInterval(timer);
  }, []);

  React.useEffect(() => {
    if (!dissolving) {
      setOpacity(1);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const animate = (time: number) => {
      const next = Math.min(1, (time - start) / 320);
      setOpacity(1 - next);
      if (next < 1) {
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
  const matrix = buildMatrix(phase, tick);

  return (
    <DitherSurface
      patternVariant={meta.variant}
      patternTone="blue"
      patternDensity="md"
      className="rounded-[4px] px-5 py-5"
      style={{ opacity }}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="mono-kicker">Studio OS / Generate</p>
            <h3 className="text-[22px] font-semibold tracking-[-0.02em] text-[#1A1A1A]">
              {meta.label}
            </h3>
            <p className="max-w-[420px] text-sm text-[#6B6B6B]">
              {meta.detail}
            </p>
          </div>

          <div className="rounded-[4px] border border-[#E5E5E0] bg-white/86 px-4 py-4">
            <div className="grid gap-1">
              {matrix.map((line, row) => (
                <div key={row} className="flex gap-1">
                  {line.map((active, col) => (
                    <span
                      key={`${row}-${col}`}
                      className={cn(
                        "h-1.5 w-1.5 rounded-full transition-colors duration-150",
                        active ? "bg-[#1E5DF2]" : "bg-[#E5E5E0]"
                      )}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="w-full max-w-[280px] space-y-4 rounded-[4px] border border-[#E5E5E0] bg-white/84 px-4 py-4">
          <div className="flex items-center justify-between">
            <span className="mono-kicker">Progress</span>
            <span className="font-mono text-[11px] text-[#6B6B6B]">{pct}%</span>
          </div>
          <div className="dither-meter">
            {Array.from({ length: 12 }).map((_, index) => (
              <span key={index} className={index < litCount ? "is-active" : undefined} />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 text-[10px] uppercase tracking-[0.14em] text-[#A0A0A0]">
            <span className={cn(phase === "analyzing" && "text-[#1E5DF2]")}>Read</span>
            <span className={cn(phase === "composing" && "text-[#1E5DF2]")}>Compose</span>
            <span className={cn(phase === "rendering" && "text-[#1E5DF2]")}>Render</span>
          </div>
        </div>
      </div>
    </DitherSurface>
  );
}
