"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1] as const;

const VERSIONS = [
  { id: "wave", label: "Waveform" },
  { id: "bento", label: "Field" },
  { id: "memory", label: "Memory" },
] as const;

/** Vertical lines with a sinusoidal “cut” — glitch / signal metaphor, brand blues on ink. */
function AbstractWaveform() {
  const gid = useId().replace(/:/g, "");
  const gradId = `tasteWaveGrad-${gid}`;
  const w = 320;
  const h = 220;
  const cols = 48;
  const step = (w - 8) / (cols - 1);
  const lines: { x: number; yTopEnd: number; yBotStart: number; midY: number }[] = [];
  for (let i = 0; i < cols; i++) {
    const x = 4 + i * step;
    // More complex, organic waveform
    const wave = Math.sin(i * 0.25) * 24 + Math.sin(i * 0.1) * 12 + Math.cos(i * 0.5) * 4;
    const mid = h / 2 + wave;
    const gap = 32 + Math.sin(i * 0.2) * 8; // Variable gap width
    const yTopEnd = mid - gap / 2;
    const yBotStart = mid + gap / 2;
    lines.push({ x, yTopEnd, yBotStart, midY: mid });
  }

  const wavePathD = lines
    .map((L, i) => `${i === 0 ? "M" : "L"} ${L.x.toFixed(2)} ${L.midY.toFixed(2)}`)
    .join(" ");

  return (
    <div className="relative flex aspect-[320/220] w-full flex-col overflow-hidden rounded-[16px] bg-[#05070f] shadow-2xl ring-1 ring-white/10">
      {/* Deep glow behind the wave */}
      <div
        className="absolute left-1/2 top-1/2 h-[120px] w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 blur-[40px]"
        style={{
          background: "radial-gradient(circle, rgba(75,87,219,0.8) 0%, rgba(252,129,98,0.2) 100%)",
        }}
      />
      
      {/* Tech grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #8FA0EC 1px, transparent 1px), linear-gradient(to bottom, #8FA0EC 1px, transparent 1px)",
          backgroundSize: "16px 16px",
          backgroundPosition: "center center",
        }}
      />

      <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" aria-hidden>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#D1E2F6" stopOpacity="0.1" />
            <stop offset="40%" stopColor="#8FA0EC" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#4B57DB" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#1B283D" stopOpacity="0.1" />
          </linearGradient>
          <filter id={`glow-${gid}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        
        {/* Animated vertical bars */}
        {lines.map((L, i) => (
          <g key={i}>
            <motion.line
              initial={{ y2: 0, opacity: 0 }}
              animate={{ y2: Math.max(0, L.yTopEnd), opacity: 1 }}
              transition={{ duration: 0.6, delay: i * 0.01, ease: "easeOut" }}
              x1={L.x}
              y1={0}
              x2={L.x}
              stroke={`url(#${gradId})`}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
            <motion.line
              initial={{ y1: h, opacity: 0 }}
              animate={{ y1: L.yBotStart, opacity: 1 }}
              transition={{ duration: 0.6, delay: i * 0.01, ease: "easeOut" }}
              x1={L.x}
              x2={L.x}
              y2={h}
              stroke={`url(#${gradId})`}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
          </g>
        ))}
        
        {/* Glowing trace line through the gap */}
        <motion.path
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.2, ease: "easeInOut", delay: 0.2 }}
          d={wavePathD}
          fill="none"
          stroke="#FC8162"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#glow-${gid})`}
        />
        <motion.path
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.2, ease: "easeInOut", delay: 0.2 }}
          d={wavePathD}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={1}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      
      {/* UI Chrome overlay */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 backdrop-blur-md">
        <div className="h-1.5 w-1.5 rounded-full bg-[#FC8162] shadow-[0_0_8px_#FC8162]" />
        <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-[#D1E2F6]">Taste signal</span>
      </div>
    </div>
  );
}

/** 2×2 bento: micro diagrams — cursors, node, curve, prompt — all in brand palette. */
function AbstractBento() {
  return (
    <div className="grid h-full grid-cols-2 gap-2.5 p-3 sm:gap-3 sm:p-4">
      <div className="relative aspect-square overflow-hidden rounded-[12px] bg-[#0c1020] shadow-lg ring-1 ring-white/10">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(75,87,219,0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(75,87,219,0.2) 1px, transparent 1px)",
            backgroundSize: "16px 16px",
          }}
        />
        <div className="absolute left-[22%] top-[38%] h-2.5 w-2.5 rounded-full border-2 border-white/90 bg-[#FC8162] shadow-[0_0_12px_rgba(252,129,98,0.8)]" />
        <div className="absolute left-[58%] top-[52%] h-2.5 w-2.5 rounded-full border-2 border-white/90 bg-[#9B7DFF] shadow-[0_0_12px_rgba(155,125,255,0.8)]" />
        <div className="absolute bottom-2.5 left-3 font-mono text-[8px] uppercase tracking-wider text-[#D1E2F6]/60">multi-point</div>
      </div>
      <div className="relative aspect-square overflow-hidden rounded-[12px] bg-gradient-to-br from-[#D1E2F6] to-[#A3C4F0] shadow-lg ring-1 ring-black/5">
        <svg className="absolute inset-2 h-[calc(100%-16px)] w-[calc(100%-16px)]" viewBox="0 0 100 100" aria-hidden>
          <circle cx="22" cy="72" r="6" fill="#1B283D" />
          <circle cx="78" cy="28" r="6" fill="#3A48B5" />
          <path d="M 22 72 Q 50 20 78 28" fill="none" stroke="#1B283D" strokeWidth="2" opacity="0.4" />
          <path d="M 22 72 L 78 28" fill="none" stroke="#4B57DB" strokeWidth="2" strokeDasharray="4 4" />
        </svg>
        <span className="absolute bottom-2.5 left-3 font-mono text-[8px] uppercase tracking-wider text-[#1B283D]/60">map</span>
      </div>
      <div className="relative aspect-square overflow-hidden rounded-[12px] bg-gradient-to-br from-[#3A48B5] to-[#2D3A91] shadow-lg ring-1 ring-white/20">
        <svg className="absolute inset-0" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          <path
            d="M 0 78 Q 25 40 50 55 T 100 22 L 100 100 L 0 100 Z"
            fill="rgba(255,255,255,0.15)"
          />
          <path d="M 0 62 Q 30 88 55 48 T 100 35" fill="none" stroke="#D1E2F6" strokeWidth="2.5" opacity="0.9" />
        </svg>
        <span className="absolute bottom-2.5 right-3 font-mono text-[8px] uppercase tracking-wider text-[#D1E2F6]/80">curve</span>
      </div>
      <div className="relative aspect-square overflow-hidden rounded-[12px] bg-white shadow-lg ring-1 ring-black/5">
        <div className="absolute left-3 right-3 top-3 rounded-lg border border-[#1B283D]/10 bg-white p-3 shadow-md">
          <div className="mb-2 h-1.5 w-10 rounded-full bg-[#3A48B5]/40" />
          <div className="space-y-1.5">
            <div className="h-1 w-full rounded-full bg-[#1B283D]/10" />
            <div className="h-1 w-[72%] rounded-full bg-[#1B283D]/10" />
          </div>
        </div>
        <div className="absolute bottom-2.5 left-3 rounded bg-[#4B57DB] px-2 py-1 font-mono text-[8px] uppercase tracking-wider text-white shadow-sm">bias</div>
      </div>
    </div>
  );
}

/** Dense tile grid — “sampled palette” heat in brand colors only. */
function AbstractMemory() {
  const cols = 16;
  const rows = 12;
  const palette = ["#0c1020", "#161b2e", "#243552", "#3A48B5", "#4B57DB", "#6B7FD8", "#9EACE8", "#D1E2F6", "#E8ECF5", "#FC8162", "#FDA38A"] as const;
  const cells = Array.from({ length: cols * rows }, (_, i) => {
    const n = (i * 23 + i % 5 + (i >> 2)) % 997;
    return palette[n % palette.length];
  });

  return (
    <div className="flex h-full flex-col justify-between overflow-hidden rounded-[16px] bg-[#05070f] p-4 shadow-2xl ring-1 ring-white/10">
      <div
        className="grid gap-[2px] rounded-lg overflow-hidden bg-white/5 p-[2px]"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        }}
      >
        {cells.map((c, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.005, duration: 0.4 }}
            className="aspect-square min-h-[8px] rounded-[1px] sm:min-h-[10px]" 
            style={{ backgroundColor: c }} 
          />
        ))}
      </div>
      
      <div className="mt-4 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur-md self-start">
        <div className="h-1.5 w-1.5 rounded-full bg-[#4B57DB] shadow-[0_0_8px_#4B57DB]" />
        <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-[#D1E2F6]">sampled chroma</span>
      </div>
    </div>
  );
}

export function TasteSectionVisual() {
  const [v, setV] = useState(0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ duration: 0.5, ease }}
      className="mx-auto w-full max-w-[460px]"
    >
      <div className="mb-5 flex flex-wrap items-center gap-2.5" role="tablist" aria-label="Taste abstract views">
        <span className="mr-1 text-[10px] font-bold uppercase tracking-widest text-[#525252]">View</span>
        {VERSIONS.map((ver, i) => (
          <button
            key={ver.id}
            type="button"
            role="tab"
            aria-selected={v === i}
            aria-controls={`taste-panel-${ver.id}`}
            id={`taste-tab-${ver.id}`}
            onClick={() => setV(i)}
            className={cn(
              "rounded-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all",
              v === i
                ? "bg-[#3A48B5] text-white shadow-sm"
                : "bg-white text-[#525252] shadow-sm hover:bg-white/80"
            )}
          >
            {ver.label}
          </button>
        ))}
      </div>

      <div
        className="relative min-h-[200px] sm:min-h-[240px]"
        role="tabpanel"
        id={`taste-panel-${VERSIONS[v]?.id ?? "wave"}`}
        aria-labelledby={`taste-tab-${VERSIONS[v]?.id ?? "wave"}`}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={v}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25, ease }}
          >
            {v === 0 ? <AbstractWaveform /> : null}
            {v === 1 ? <AbstractBento /> : null}
            {v === 2 ? <AbstractMemory /> : null}
          </motion.div>
        </AnimatePresence>
      </div>

      <blockquote className="mt-8 border-l-[2px] border-[#3A48B5] pl-5 sm:pl-6">
        <p className="font-['Noto_Serif'] text-[17px] font-normal leading-relaxed text-[#1B283D] text-pretty md:text-[19px]">
          Spacing rhythm, type pairing, and color balance — encoded as the bias behind every generation.
        </p>
      </blockquote>
    </motion.div>
  );
}
