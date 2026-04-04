"use client";

/**
 * GenerationAnimation — three-stage computational visualization during AI generation.
 *
 * Replaces skeleton bars with a canvas-based animation:
 * Stage 1 "analyzing": Dot field (grid of circles, gaussian distribution, gentle pulse)
 * Stage 2 "composing": Vertical bars (left-to-right reveal, height oscillation)
 * Stage 3 "creating": Layered sine waves (gaussian bumps in accent blue, lateral drift)
 * Stage 4 "building": Collapse + handoff
 *
 * Uses HTML Canvas 2D + requestAnimationFrame for smooth rendering.
 * Supports prefers-reduced-motion, failure states, and template fallback.
 */

import * as React from "react";
import type { GenerationStage } from "@/lib/canvas/unified-canvas-state";
import { getGenerationStageLabel } from "@/lib/canvas/unified-canvas-state";

// ─── Types ──────────────────────────────────────────────────────────────────

export type GenerationResult = "success" | "error" | "credit-exhaustion" | "template-fallback" | null;

interface GenerationAnimationProps {
  stage: GenerationStage;
  width: number;
  height: number;
  generationResult?: GenerationResult;
  onHandoffComplete?: () => void;
  onRetry?: () => void;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const WARM_BG = "#F5F5F4";
const DOT_COLOR = "#1A1A1A";
const BAR_COLOR = "#1A1A1A";
const ACCENT_BLUE = "#1E5DF2";
const MUTED_TEXT = "#A0A0A0";
const AMBER = "#F59E0B";

const CROSSFADE_MS = 300;
const COLLAPSE_MS = 200;
const CLEAR_MS = 50;

// ─── Seeded PRNG ────────────────────────────────────────────────────────────

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Gaussian helper ────────────────────────────────────────────────────────

function gaussian(x: number, mean: number, sigma: number): number {
  const d = x - mean;
  return Math.exp(-(d * d) / (2 * sigma * sigma));
}

// ─── Stage 1: Dot Field ─────────────────────────────────────────────────────

interface DotFieldData {
  dots: Array<{ x: number; y: number; radius: number; phaseOffset: number }>;
}

function computeDotField(width: number, height: number, seed: number): DotFieldData {
  const rng = mulberry32(seed);
  const spacing = 20;
  const cols = Math.floor(width / spacing);
  const rows = Math.floor(height / spacing);
  const centerX = width / 2;
  const centerY = height / 2;
  const sigmaX = width * 0.35;
  const sigmaY = height * 0.35;

  const dots: DotFieldData["dots"] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = spacing / 2 + c * spacing;
      const y = spacing / 2 + r * spacing;
      // Gaussian density — more dots near center
      const density = gaussian(x, centerX, sigmaX) * gaussian(y, centerY, sigmaY);
      if (rng() > density * 1.5 + 0.15) continue;
      // Size variation: 2-8px radius, biased by gaussian proximity to center
      const baseRadius = 2 + rng() * 6 * (0.3 + density * 0.7);
      const phaseOffset = rng() * Math.PI * 2;
      dots.push({ x, y, radius: baseRadius, phaseOffset });
    }
  }
  return { dots };
}

function drawDotField(
  ctx: CanvasRenderingContext2D,
  data: DotFieldData,
  time: number,
  alpha: number
) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = DOT_COLOR;
  const pulseFreq = 0.8 * Math.PI * 2; // ~0.8 Hz
  for (const dot of data.dots) {
    const pulse = 1 + 0.12 * Math.sin(time * pulseFreq / 1000 + dot.phaseOffset);
    const r = dot.radius * pulse;
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ─── Stage 2: Vertical Bars ─────────────────────────────────────────────────

interface BarFieldData {
  bars: Array<{ x: number; baseHeight: number; phaseOffset: number }>;
}

function computeBarField(width: number, height: number, seed: number): BarFieldData {
  const rng = mulberry32(seed + 1000);
  const spacing = 20;
  const count = Math.floor(width / spacing);
  const centerX = width / 2;
  const sigmaX = width * 0.35;
  const bars: BarFieldData["bars"] = [];

  for (let i = 0; i < count; i++) {
    const x = spacing / 2 + i * spacing;
    const envelopeHeight = gaussian(x, centerX, sigmaX);
    const baseHeight = (0.1 + envelopeHeight * 0.85) * height * (0.5 + rng() * 0.5);
    const phaseOffset = rng() * Math.PI * 2;
    bars.push({ x, baseHeight, phaseOffset });
  }
  return { bars };
}

function drawBarField(
  ctx: CanvasRenderingContext2D,
  data: BarFieldData,
  canvasHeight: number,
  time: number,
  alpha: number,
  revealProgress: number // 0..1 for left-to-right reveal
) {
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = BAR_COLOR;
  ctx.lineWidth = 1.5;
  ctx.lineCap = "round";

  const totalBars = data.bars.length;
  for (let i = 0; i < totalBars; i++) {
    const bar = data.bars[i];
    // Left-to-right reveal: only show bars up to revealProgress
    const barRevealThreshold = (i + 1) / totalBars;
    if (barRevealThreshold > revealProgress) continue;

    // Per-bar fade-in at the reveal edge
    const barAlpha = Math.min(1, (revealProgress - (i / totalBars)) * totalBars * 2);
    ctx.globalAlpha = alpha * barAlpha;

    // Slow height oscillation (±4%)
    const oscillation = 1 + 0.04 * Math.sin(time * 0.001 + bar.phaseOffset);
    const h = bar.baseHeight * oscillation;
    const yStart = canvasHeight - h;

    ctx.beginPath();
    ctx.moveTo(bar.x, canvasHeight);
    ctx.lineTo(bar.x, yStart);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// ─── Stage 3: Sine Waves (Gaussian Bumps) ───────────────────────────────────

interface WaveBandData {
  bands: Array<{
    y: number;
    bumps: Array<{
      centerX: number;
      width: number;
      amplitude: number;
      driftSpeed: number;
      phaseOffset: number;
    }>;
  }>;
}

function computeWaveBands(width: number, height: number, seed: number): WaveBandData {
  const rng = mulberry32(seed + 2000);
  const bandCount = 6 + Math.floor(rng() * 3); // 6-8 bands
  const bandSpacing = height / (bandCount + 1);
  const bands: WaveBandData["bands"] = [];

  for (let i = 0; i < bandCount; i++) {
    const y = bandSpacing * (i + 1);
    const bumpCount = 2 + Math.floor(rng() * 3); // 2-4 bumps per band
    const bumps = [];
    for (let j = 0; j < bumpCount; j++) {
      bumps.push({
        centerX: rng() * width,
        width: 40 + rng() * 120,
        amplitude: 8 + rng() * 20,
        driftSpeed: (rng() - 0.5) * 30, // px/sec lateral drift
        phaseOffset: rng() * Math.PI * 2,
      });
    }
    bands.push({ y, bumps });
  }
  return { bands };
}

function drawWaveBands(
  ctx: CanvasRenderingContext2D,
  data: WaveBandData,
  width: number,
  time: number,
  alpha: number,
  scaleY: number
) {
  ctx.globalAlpha = alpha;

  for (const band of data.bands) {
    ctx.beginPath();
    ctx.moveTo(0, band.y);

    for (let x = 0; x <= width; x += 2) {
      let yOffset = 0;
      for (const bump of band.bumps) {
        // Drift laterally
        const cx = bump.centerX + bump.driftSpeed * (time / 1000);
        // Wrap around canvas edges
        const wrappedCx = ((cx % width) + width) % width;
        // Amplitude variation over time
        const ampMod = 1 + 0.3 * Math.sin(time * 0.0008 + bump.phaseOffset);
        const amp = bump.amplitude * ampMod * scaleY;
        yOffset += amp * gaussian(x, wrappedCx, bump.width);
      }
      ctx.lineTo(x, band.y - yOffset);
    }

    ctx.lineTo(width, band.y);
    ctx.closePath();
    ctx.fillStyle = ACCENT_BLUE;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function GenerationAnimation({
  stage,
  width,
  height,
  generationResult,
  onHandoffComplete,
  onRetry,
}: GenerationAnimationProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const animFrameRef = React.useRef<number>(0);
  const startTimeRef = React.useRef<number>(0);
  const stageStartRef = React.useRef<number>(0);

  // Track the previous stage for crossfade
  const prevStageRef = React.useRef<GenerationStage>(stage);
  const transitionStartRef = React.useRef<number>(0);

  // Precomputed field data (seeded once per generation)
  const seedRef = React.useRef(Date.now());
  const dotFieldRef = React.useRef<DotFieldData | null>(null);
  const barFieldRef = React.useRef<BarFieldData | null>(null);
  const waveBandRef = React.useRef<WaveBandData | null>(null);

  // Bar reveal progress
  const barRevealStartRef = React.useRef<number>(0);

  // Handoff state
  const [handoffPhase, setHandoffPhase] = React.useState<
    "none" | "collapse" | "clear" | "complete"
  >("none");
  const handoffPhaseRef = React.useRef<"none" | "collapse" | "clear" | "complete">("none");

  // Frozen state for credit exhaustion
  const frozenRef = React.useRef(false);

  // Reduced motion preference
  const reducedMotion = React.useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // Compute field data once on mount
  React.useEffect(() => {
    const seed = seedRef.current;
    dotFieldRef.current = computeDotField(width, height, seed);
    barFieldRef.current = computeBarField(width, height, seed);
    waveBandRef.current = computeWaveBands(width, height, seed);
  }, [width, height]);

  // Track stage transitions for crossfade
  React.useEffect(() => {
    if (stage !== prevStageRef.current) {
      transitionStartRef.current = performance.now();
      if (stage === "composing") {
        barRevealStartRef.current = performance.now();
      }
      prevStageRef.current = stage;
    }
  }, [stage]);

  // Handle handoff sequence when building stage completes
  React.useEffect(() => {
    if (stage === "building" && handoffPhase === "none") {
      setHandoffPhase("collapse");
      handoffPhaseRef.current = "collapse";
      const collapseTimer = setTimeout(() => {
        setHandoffPhase("clear");
        handoffPhaseRef.current = "clear";
        const clearTimer = setTimeout(() => {
          setHandoffPhase("complete");
          handoffPhaseRef.current = "complete";
          onHandoffComplete?.();
        }, CLEAR_MS);
        return () => clearTimeout(clearTimer);
      }, COLLAPSE_MS);
      return () => clearTimeout(collapseTimer);
    }
  }, [stage, handoffPhase, onHandoffComplete]);

  // Freeze animation on credit exhaustion
  React.useEffect(() => {
    if (generationResult === "credit-exhaustion") {
      frozenRef.current = true;
    }
  }, [generationResult]);

  // Reset on new generation
  React.useEffect(() => {
    if (stage === "analyzing") {
      seedRef.current = Date.now();
      dotFieldRef.current = computeDotField(width, height, seedRef.current);
      barFieldRef.current = computeBarField(width, height, seedRef.current);
      waveBandRef.current = computeWaveBands(width, height, seedRef.current);
      setHandoffPhase("none");
      handoffPhaseRef.current = "none";
      frozenRef.current = false;
      startTimeRef.current = performance.now();
      stageStartRef.current = performance.now();
    }
  }, [stage, width, height]);

  // Main animation loop
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (startTimeRef.current === 0) {
      startTimeRef.current = performance.now();
      stageStartRef.current = performance.now();
    }

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    let lastFrozenTime = 0;

    function animate(now: number) {
      if (!ctx || !canvas) return;

      // If frozen, keep rendering the last frame
      if (frozenRef.current) {
        if (lastFrozenTime === 0) lastFrozenTime = now;
        now = lastFrozenTime;
      }

      const time = now - startTimeRef.current;

      // Clear
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = WARM_BG;
      ctx.fillRect(0, 0, width, height);

      // Reduced motion: simple opacity pulse
      if (reducedMotion) {
        const pulse = 0.4 + 0.2 * Math.sin(time * 0.002);
        ctx.globalAlpha = pulse;
        ctx.fillStyle = DOT_COLOR;
        ctx.fillRect(0, 0, width, height);
        ctx.globalAlpha = 1;
        animFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      // Handoff phase handling
      if (handoffPhaseRef.current === "collapse" || handoffPhaseRef.current === "clear") {
        if (handoffPhaseRef.current === "clear") {
          // Empty warm artboard
          animFrameRef.current = requestAnimationFrame(animate);
          return;
        }
        // Collapse: draw waves with decreasing scaleY
        const collapseElapsed = now - transitionStartRef.current;
        const collapseProgress = Math.min(1, collapseElapsed / COLLAPSE_MS);
        const scaleY = 1 - collapseProgress;
        if (waveBandRef.current) {
          drawWaveBands(ctx, waveBandRef.current, width, time, 1, scaleY);
        }
        animFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      if (handoffPhaseRef.current === "complete") {
        // Nothing to draw — parent handles reveal
        return;
      }

      // Crossfade logic
      const transitionElapsed = now - transitionStartRef.current;
      const crossfadeProgress =
        transitionStartRef.current > 0
          ? Math.min(1, transitionElapsed / CROSSFADE_MS)
          : 1;

      // Determine which stages to draw
      const currentStage = stage;
      const prevStage = prevStageRef.current;
      const isTransitioning = crossfadeProgress < 1 && currentStage !== prevStage;

      // Draw previous stage fading out
      if (isTransitioning && prevStage !== "idle" && prevStage !== "building") {
        drawStage(ctx, prevStage, time, 1 - crossfadeProgress, now);
      }

      // Draw current stage fading in
      if (currentStage !== "idle" && currentStage !== "building") {
        const alpha = isTransitioning ? crossfadeProgress : 1;
        drawStage(ctx, currentStage, time, alpha, now);
      }

      animFrameRef.current = requestAnimationFrame(animate);
    }

    function drawStage(
      ctx: CanvasRenderingContext2D,
      s: GenerationStage,
      time: number,
      alpha: number,
      now: number
    ) {
      switch (s) {
        case "analyzing":
          if (dotFieldRef.current) {
            drawDotField(ctx, dotFieldRef.current, time, alpha);
          }
          break;
        case "composing":
          if (barFieldRef.current) {
            // Left-to-right reveal over ~3s
            const revealElapsed = now - barRevealStartRef.current;
            const revealProgress = Math.min(1, revealElapsed / 3000);
            drawBarField(ctx, barFieldRef.current, height, time, alpha, revealProgress);
          }
          break;
        case "creating":
          if (waveBandRef.current) {
            drawWaveBands(ctx, waveBandRef.current, width, time, alpha, 1);
          }
          break;
      }
    }

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [stage, width, height, reducedMotion]);

  // Stage label
  const stageLabel = getGenerationStageLabel(stage);
  const [displayLabel, setDisplayLabel] = React.useState(stageLabel);
  const [labelOpacity, setLabelOpacity] = React.useState(0);

  React.useEffect(() => {
    const newLabel = getGenerationStageLabel(stage);
    if (newLabel !== displayLabel) {
      setLabelOpacity(0);
      const fadeTimer = setTimeout(() => {
        setDisplayLabel(newLabel);
        setLabelOpacity(1);
      }, 150);
      return () => clearTimeout(fadeTimer);
    } else if (newLabel) {
      setLabelOpacity(1);
    }
  }, [stage, displayLabel]);

  // Error/failure overlay
  if (generationResult === "error") {
    return (
      <div
        style={{ width, minHeight: height, position: "relative", background: WARM_BG }}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <span style={{ color: MUTED_TEXT, fontSize: 13 }}>
            Generation failed. Try again.
          </span>
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-[12px] text-[#1E5DF2] hover:underline"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ width, minHeight: height, position: "relative" }}>
      {/* Template fallback border */}
      {generationResult === "template-fallback" && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ border: `2px solid ${AMBER}`, borderRadius: 0 }}
        />
      )}

      {/* Template fallback badge */}
      {generationResult === "template-fallback" && (
        <div
          className="absolute top-0 left-0 z-10 px-1.5 py-0.5"
          style={{
            background: AMBER,
            fontSize: 10,
            fontFamily: "var(--font-geist-sans), sans-serif",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "#FFFFFF",
            borderRadius: 4,
          }}
        >
          TEMPLATE
        </div>
      )}

      {/* Canvas animation surface */}
      <canvas
        ref={canvasRef}
        style={{
          width,
          height,
          background: WARM_BG,
          display: handoffPhase === "complete" ? "none" : "block",
        }}
      />

      {/* Stage label — bottom-left, outside artboard (below) */}
      {stageLabel && handoffPhase === "none" && (
        <div
          style={{
            position: "absolute",
            bottom: -24,
            left: 0,
            fontSize: 11,
            fontFamily: "var(--font-geist-sans), sans-serif",
            color: MUTED_TEXT,
            letterSpacing: "0.06em",
            opacity: labelOpacity,
            transition: "opacity 150ms ease",
          }}
        >
          {displayLabel}
        </div>
      )}

      {/* Credit exhaustion pill */}
      {generationResult === "credit-exhaustion" && (
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            bottom: -40,
            fontSize: 12,
            fontFamily: "var(--font-geist-sans), sans-serif",
            color: MUTED_TEXT,
            background: "#FFFFFF",
            border: "1px solid #E5E5E0",
            borderRadius: 4,
            padding: "6px 14px",
            whiteSpace: "nowrap",
          }}
        >
          Credits needed to continue
        </div>
      )}
    </div>
  );
}
