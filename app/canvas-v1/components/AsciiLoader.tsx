"use client";

import * as React from "react";

// ─── Frame banks ────────────────────────────────────────────────────────────

const PHASE1_FRAMES = [
  [
    "  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ",
    "  ░░░░░░▒▒▒▒▒▒░░░░░░░░░░▒▒▒▒▒▒░░░░░░░░  ",
    "  ░░░░▒▒▒▒▒▒▒▒▒▒░░░░░▒▒▒▒▒▒▒▒▒▒░░░░░░  ",
    "  ░░░░▒▒▒▒▓▓▓▓▒▒░░░░░▒▒▓▓▓▓▒▒▒▒░░░░░░  ",
    "  ░░░░░▒▒▒▒▒▒▒▒░░░░░░░▒▒▒▒▒▒▒▒░░░░░░░  ",
    "  ░░░░░░░▒▒▒▒░░░░░░░░░░░▒▒▒▒░░░░░░░░░  ",
    "  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ",
  ],
  [
    "  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ",
    "  ░░░░▒▒▒▒▒▒▒░░░░░░░░░▒▒▒▒▒▒▒▒░░░░░░░  ",
    "  ░░▒▒▒▒▒▒▒▒▒▒▒░░░░░▒▒▒▒▒▒▒▒▒▒▒░░░░░  ",
    "  ░░▒▒▒▒▓▓▓▓▓▒▒░░░░░▒▒▓▓▓▓▓▒▒▒▒░░░░░  ",
    "  ░░░▒▒▒▒▒▒▒▒▒░░░░░░░▒▒▒▒▒▒▒▒░░░░░░░  ",
    "  ░░░░░░░▒▒▒▒▒░░░░░░░░░░▒▒▒▒▒░░░░░░░  ",
    "  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ",
  ],
  [
    "  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ",
    "  ░░░░░▒▒▒▒▒░░░░░░░░░░░▒▒▒▒▒░░░░░░░░  ",
    "  ░░░▒▒▒▒▒▒▒▒▒░░░░░░▒▒▒▒▒▒▒▒▒░░░░░░  ",
    "  ░░░▒▒▒▓▓▓▓▒▒▒░░░░░▒▒▒▓▓▓▓▒▒▒░░░░░  ",
    "  ░░░▒▒▒▒▒▒▒▒▒░░░░░░░▒▒▒▒▒▒▒▒░░░░░░  ",
    "  ░░░░░▒▒▒▒▒▒░░░░░░░░░▒▒▒▒▒▒░░░░░░░  ",
    "  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ",
  ],
];

const PHASE2_FRAMES = [
  [
    "  ┌─────────┐  ┌─────────────────────────┐  ",
    "  │ ▓▓▓▓▓▓▓ │  │ ░░░░░░░░░░░░░░░░░░░░░░ │  ",
    "  │ ▓▓▓▓▓▓▓ │  │ ░░ ████████████░░░░░░░ │  ",
    "  │ ▓▓▓▓▓▓▓ │  │ ░░ ████████░░░░░░░░░░░ │  ",
    "  │ ▓▓▓▓▓▓▓ │  │ ░░░░░░░░░░░░░░░░░░░░░░ │  ",
    "  │         │  │ ░░ ████░░░░░░░░░░░░░░░ │  ",
    "  └─────────┘  └─────────────────────────┘  ",
  ],
  [
    "  ┌─────────┐  ┌─────────────────────────┐  ",
    "  │ ▓▓▓▓▓▓▓ │  │ ░░░░░░░░░░░░░░░░░░░░░░ │  ",
    "  │ ▓▓▓▓▓▓▓ │  │ ░░ ██████████░░░░░░░░░ │  ",
    "  │ ▓▓▓▓▓▓▓ │  │ ░░ ██████░░░░░░░░░░░░░ │  ",
    "  │ ░░░░░░░ │  │ ░░░░░░░░░░░░░░░░░░░░░░ │  ",
    "  │         │  │ ░░ ██████░░░░░░░░░░░░░ │  ",
    "  └─────────┘  └─────────────────────────┘  ",
  ],
  [
    "  ┌─────────┐  ┌─────────────────────────┐  ",
    "  │ ▒▒▒▒▒▒▒ │  │ ░░░░░░░░░░░░░░░░░░░░░░ │  ",
    "  │ ▒▒▒▒▒▒▒ │  │ ░░ ████████████░░░░░░░ │  ",
    "  │ ▒▒▒▒▒▒▒ │  │ ░░ ████████████░░░░░░░ │  ",
    "  │ ▒▒▒▒▒▒▒ │  │ ░░░░░░░░░░░░░░░░░░░░░░ │  ",
    "  │         │  │ ░░ ████████░░░░░░░░░░░ │  ",
    "  └─────────┘  └─────────────────────────┘  ",
  ],
];

const PHASE3_FRAMES = [
  [
    "  ╔══════════════════════════════════════╗  ",
    "  ║  ▒▒▒▒▒  STUDIO  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ ║  ",
    "  ║  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ║  ",
    "  ║  ██████████  ░░░░░░░░░░░░░░░░░░░ ║  ",
    "  ║  ██████████  ░░ ████████████░░░░ ║  ",
    "  ║  ██████████  ░░ ████████░░░░░░░░ ║  ",
    "  ╚══════════════════════════════════════╝  ",
  ],
  [
    "  ╔══════════════════════════════════════╗  ",
    "  ║  ▓▓▓▓▓  STUDIO  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ║  ",
    "  ║  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ║  ",
    "  ║  ██████████  ░░░░░░░░░░░░░░░░░░░ ║  ",
    "  ║  ██████████  ░░ ████████████░░░░ ║  ",
    "  ║  ██████████  ░░ ████████████░░░░ ║  ",
    "  ╚══════════════════════════════════════╝  ",
  ],
  [
    "  ╔══════════════════════════════════════╗  ",
    "  ║  ░░░░░  STUDIO  ░░░░░░░░░░░░░░░░ ║  ",
    "  ║  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ ║  ",
    "  ║  ██████████  ░░░░░░░░░░░░░░░░░░░ ║  ",
    "  ║  ██████████  ░░ ████████████░░░░ ║  ",
    "  ║  ██████████  ░░ ████████░░░░░░░░ ║  ",
    "  ╚══════════════════════════════════════╝  ",
  ],
];

// Density chars used for shimmer effect
const SHIMMER_CHARS = ["░", "▒", "▓", "█", " "];

function shimmerLine(line: string): string {
  return line
    .split("")
    .map((ch) => {
      if (Math.random() < 0.08 && SHIMMER_CHARS.includes(ch)) {
        const pool = SHIMMER_CHARS.filter((c) => c !== ch);
        return pool[Math.floor(Math.random() * pool.length)];
      }
      return ch;
    })
    .join("");
}

// ─── Progress bar ────────────────────────────────────────────────────────────

function buildProgressBar(progress: number, width = 32): string {
  const filled = Math.round(Math.max(0, Math.min(1, progress)) * width);
  const empty = width - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}

// ─── Component ───────────────────────────────────────────────────────────────

export type AsciiLoaderProps = {
  progress: number;         // 0–1
  phase: "analyzing" | "composing" | "rendering";
  dissolving?: boolean;     // trigger exit dissolve
  onComplete?: () => void;
};

const PHASE_META: Record<AsciiLoaderProps["phase"], { label: string; frames: string[][] }> = {
  analyzing: { label: "Extracting visual DNA...", frames: PHASE1_FRAMES },
  composing:  { label: "Composing layout...",      frames: PHASE2_FRAMES },
  rendering:  { label: "Rendering variants...",    frames: PHASE3_FRAMES },
};

export function AsciiLoader({ progress, phase, dissolving = false, onComplete }: AsciiLoaderProps) {
  const [frameIndex, setFrameIndex] = React.useState(0);
  const [shimmeredFrame, setShimmeredFrame] = React.useState<string[]>([]);
  const [opacity, setOpacity] = React.useState(1);
  const dissolveStartedRef = React.useRef(false);

  const meta = PHASE_META[phase];
  const frames = meta.frames;

  // Cycle frames every 150ms
  React.useEffect(() => {
    const timer = setInterval(() => {
      setFrameIndex((i) => (i + 1) % frames.length);
    }, 150);
    return () => clearInterval(timer);
  }, [frames]);

  // Apply shimmer on each frame tick
  React.useEffect(() => {
    const raw = frames[frameIndex] ?? frames[0];
    setShimmeredFrame(raw.map(shimmerLine));
  }, [frameIndex, frames]);

  // Dissolve: staggered L-to-R opacity fade over 400ms, then call onComplete
  React.useEffect(() => {
    if (!dissolving || dissolveStartedRef.current) return;
    dissolveStartedRef.current = true;

    // Fade opacity to 0 over 400ms
    const start = performance.now();
    let raf: number;
    function tick(now: number) {
      const t = Math.min(1, (now - start) / 400);
      setOpacity(1 - t);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        onComplete?.();
      }
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [dissolving, onComplete]);

  const pct = Math.round(progress * 100);

  return (
    <div
      style={{
        opacity,
        transition: dissolving ? "none" : undefined,
        fontFamily: "'Geist Mono', 'Courier New', monospace",
      }}
      className="w-full select-none"
    >
      {/* ASCII art frame */}
      <pre
        style={{
          fontSize: 11,
          lineHeight: 1.3,
          color: "#A0A0A0",
          margin: 0,
          overflow: "hidden",
          whiteSpace: "pre",
        }}
      >
        {shimmeredFrame.map((line, i) => (
          <span key={i} style={{ display: "block" }}>
            {line}
          </span>
        ))}
      </pre>

      {/* Status text + progress */}
      <div className="mt-3 space-y-2 px-1">
        <p
          style={{
            fontSize: 13,
            fontFamily: "'Geist Sans', ui-sans-serif, system-ui, sans-serif",
            color: "#6B6B6B",
            letterSpacing: "0.01em",
          }}
        >
          {meta.label}
        </p>

        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <pre
            style={{
              fontSize: 11,
              lineHeight: 1,
              margin: 0,
              flex: 1,
              overflow: "hidden",
            }}
          >
            <span style={{ color: "#1E5DF2" }}>
              {"█".repeat(Math.round(progress * 32))}
            </span>
            <span style={{ color: "#E5E5E0" }}>
              {"░".repeat(32 - Math.round(progress * 32))}
            </span>
          </pre>
          <span
            style={{
              fontSize: 11,
              fontFamily: "inherit",
              color: "#A0A0A0",
              flexShrink: 0,
              minWidth: 36,
            }}
          >
            {pct}%
          </span>
        </div>
      </div>
    </div>
  );
}
