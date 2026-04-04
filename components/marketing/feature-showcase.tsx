"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { springs } from "@/lib/animations";

// ─── Feature tab data ────────────────────────────────────────────────────────
const FEATURES = [
  {
    id: "collect",
    label: "Collect",
    fig: "4.1",
    headline: "Every reference,\none place.",
    body: "Drag in images from anywhere — Pinterest boards, Are.na channels, Lummi, or your local files. Studio OS organizes and scores them automatically so the best stuff surfaces first.",
    tags: ["Pinterest", "Are.na", "Lummi", "Local files"],
    visual: <CollectVisual />,
  },
  {
    id: "build",
    label: "Build",
    fig: "4.2",
    headline: "Your system,\nalive.",
    body: "Define your palette, type scale, and spacing rules once. Studio OS keeps them synced across every project and exports a structured design-system.md your AI tools can actually read.",
    tags: ["Color tokens", "Type scale", "Spacing", "Export"],
    visual: <BuildVisual />,
  },
  {
    id: "brief",
    label: "Brief",
    fig: "4.3",
    headline: "Brief written\nin seconds.",
    body: "Point Studio OS at your reference collection and get a detailed creative brief — tone, direction, audience, visual language — ready to share with clients or feed to any AI model.",
    tags: ["AI brief", "Export PDF", "Client ready", "Markdown"],
    visual: <BriefVisual />,
  },
];

// ─── Inline visual mockups ────────────────────────────────────────────────────

function CollectVisual() {
  const images = [
    { color: "#F59E0B", label: "Brand film" },
    { color: "#2430AD", label: "Editorial" },
    { color: "#10B981", label: "Product" },
    { color: "#F43F5E", label: "Identity" },
    { color: "#8B5CF6", label: "Spatial" },
    { color: "#06B6D4", label: "Motion" },
  ];
  return (
    <div className="h-full w-full p-6">
      {/* Toolbar */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-neutral-400">FIG 4.1</span>
          <div className="h-2 w-px bg-white/[0.08]" />
          <span className="text-[11px] text-neutral-600">Acme Rebrand / References</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex h-5 items-center gap-1 rounded border border-neutral-200 bg-neutral-100 px-2">
            <div className="h-1 w-1 rounded-full bg-[#2430AD]" />
            <span className="font-mono text-[9px] text-neutral-400">sort: score</span>
          </div>
        </div>
      </div>
      {/* Image masonry */}
      <div className="grid grid-cols-3 gap-1.5">
        {images.map((img, i) => (
          <div
            key={i}
            className="group relative overflow-hidden rounded-lg"
            style={{ aspectRatio: i % 3 === 0 ? "1/1.2" : "1/1" }}
          >
            <div
              className="h-full w-full"
              style={{
                background: `linear-gradient(135deg, ${img.color}25, ${img.color}50)`,
                backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
                backgroundSize: "8px 8px",
              }}
            />
            <div className="absolute bottom-0 left-0 right-0 translate-y-full bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5 transition-transform duration-200 group-hover:translate-y-0">
              <span className="text-[9px] text-neutral-900/80">{img.label}</span>
            </div>
            {/* Score badge */}
            <div className="absolute right-1 top-1 rounded bg-white/80 px-1 py-0.5 font-mono text-[8px] text-neutral-900/70">
              {94 - i * 2}
            </div>
          </div>
        ))}
      </div>
      {/* Stats row */}
      <div className="mt-3 flex items-center gap-4 border-t border-neutral-200 pt-3">
        {[
          { label: "Images", value: "247" },
          { label: "Sources", value: "4" },
          { label: "Tagged", value: "191" },
        ].map((s) => (
          <div key={s.label}>
            <div className="text-[10px] font-medium text-neutral-900">{s.value}</div>
            <div className="text-[9px] text-neutral-400">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BuildVisual() {
  const palette = [
    { name: "Brand Blue", hex: "#2430AD", role: "Primary" },
    { name: "Midnight", hex: "#111111", role: "Background" },
    { name: "Smoke", hex: "#E5E5E5", role: "Surface" },
    { name: "Accent", hex: "#F59E0B", role: "Highlight" },
  ];
  const typeScale = [
    { label: "Display", size: "56px", weight: "590", sample: "Aa" },
    { label: "Heading", size: "32px", weight: "590", sample: "Aa" },
    { label: "Body", size: "15px", weight: "400", sample: "Aa" },
  ];
  return (
    <div className="h-full w-full p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-neutral-400">FIG 4.2</span>
          <div className="h-2 w-px bg-white/[0.08]" />
          <span className="text-[11px] text-neutral-600">Design System</span>
        </div>
        <span className="rounded border border-[#2430AD]/30 bg-[#2430AD]/10 px-1.5 py-0.5 font-mono text-[9px] text-[#2430AD]">Live</span>
      </div>
      {/* Palette */}
      <div className="mb-4">
        <div className="mb-2 font-mono text-[9px] uppercase tracking-[1px] text-neutral-400">Color tokens</div>
        <div className="flex gap-1.5">
          {palette.map((color) => (
            <div key={color.name} className="group flex flex-1 flex-col gap-1">
              <div
                className="h-10 rounded-md border border-neutral-200"
                style={{ backgroundColor: color.hex }}
              />
              <div className="font-mono text-[8px] text-neutral-400 group-hover:text-neutral-600 transition-colors">
                {color.hex}
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Type scale */}
      <div className="mb-4 rounded-lg border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 px-3 py-2 font-mono text-[9px] uppercase tracking-[1px] text-neutral-400">
          Type scale
        </div>
        {typeScale.map((t, i) => (
          <div
            key={t.label}
            className={`flex items-center gap-3 px-3 py-2 ${i < typeScale.length - 1 ? "border-b border-white/[0.04]" : ""}`}
          >
            <div
              className="w-12 shrink-0 text-neutral-900"
              style={{ fontSize: `clamp(14px, ${parseInt(t.size) * 0.45}px, 28px)`, fontWeight: t.weight }}
            >
              {t.sample}
            </div>
            <div className="flex flex-1 items-center justify-between">
              <span className="text-[10px] text-neutral-600">{t.label}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] text-neutral-400">{t.size}</span>
                <span className="font-mono text-[9px] text-neutral-400">{t.weight}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Export button */}
      <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-3 py-2">
        <span className="font-mono text-[10px] text-neutral-400">design-system.md</span>
        <div className="flex items-center gap-1 rounded bg-[#2430AD]/20 px-2 py-0.5">
          <svg viewBox="0 0 10 10" fill="none" className="h-2 w-2 text-[#2430AD]">
            <path d="M5 1v6M2 5l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="font-mono text-[9px] text-[#2430AD]">Export</span>
        </div>
      </div>
    </div>
  );
}

function BriefVisual() {
  return (
    <div className="h-full w-full p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-neutral-400">FIG 4.3</span>
          <div className="h-2 w-px bg-white/[0.08]" />
          <span className="text-[11px] text-neutral-600">Creative Brief</span>
        </div>
        <div className="flex h-5 items-center gap-1 rounded border border-[#2430AD]/30 bg-[#2430AD]/10 px-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2430AD] opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#2430AD]" />
          </span>
          <span className="font-mono text-[9px] text-[#2430AD]">Generating</span>
        </div>
      </div>
      {/* Brief document */}
      <div className="rounded-lg border border-neutral-200 bg-neutral-100 p-4 space-y-3">
        {[
          { label: "PROJECT", value: "Acme Rebrand — Q1 2025" },
          { label: "TONE", value: "Premium, minimal, confident" },
          { label: "AUDIENCE", value: "Enterprise SaaS buyers, design-literate" },
          { label: "DIRECTION", value: "Less is more. Deep navy and white space. Let the product speak." },
          { label: "PALETTE", value: "Navy · Off-white · Stone · Single amber accent" },
          { label: "TYPE", value: "Inter Variable · Berkeley Mono" },
        ].map((row, i) => (
          <div key={i} className={`pb-3 ${i < 5 ? "border-b border-white/[0.04]" : ""}`}>
            <div className="mb-0.5 font-mono text-[8px] uppercase tracking-[1px] text-neutral-400">{row.label}</div>
            <div className="text-[11px] leading-relaxed text-neutral-400">{row.value}</div>
          </div>
        ))}
      </div>
      {/* Action bar */}
      <div className="mt-3 flex items-center gap-2">
        <div className="flex h-6 flex-1 items-center gap-1.5 rounded border border-neutral-200 bg-white px-2">
          <svg viewBox="0 0 10 10" fill="none" className="h-2 w-2 text-neutral-400">
            <path d="M1 5h8M5 1l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="font-mono text-[9px] text-neutral-400">Share with client</span>
        </div>
        <div className="flex h-6 items-center gap-1 rounded bg-[#2430AD]/20 px-2">
          <span className="font-mono text-[9px] text-[#2430AD]">Copy MD</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main section ────────────────────────────────────────────────────────────

export function FeatureShowcase() {
  const [activeTab, setActiveTab] = React.useState(0);
  const active = FEATURES[activeTab];

  return (
    <section className="bg-[#FAFAFA] py-24">
      <div className="mx-auto max-w-7xl px-6">

        {/* Section header */}
        <div className="mb-16 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-end">
          <div>
            <div className="mb-4 font-mono text-xs text-neutral-400">3.0 — Feature overview</div>
            <h2
              className="text-3xl font-medium text-neutral-900 sm:text-4xl"
              style={{ letterSpacing: "-0.022em", lineHeight: 1.1 }}
            >
              Everything your creative
              <br />
              <span className="text-neutral-600">process actually needs.</span>
            </h2>
          </div>
          <p className="max-w-sm font-extralight leading-relaxed text-neutral-600 lg:text-right">
            From first reference to final handoff — Studio OS connects the parts of your workflow that were never meant to live in separate tabs.
          </p>
        </div>

        {/* Main bento */}
        <div className="overflow-hidden rounded-xl border border-neutral-200">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_480px]">

            {/* Left — description + tab switcher */}
            <div className="flex flex-col justify-between border-b border-neutral-200 p-8 lg:border-b-0 lg:border-r lg:p-12">

              {/* Tab switcher */}
              <div className="mb-10 flex items-center gap-1 self-start rounded-lg border border-neutral-200 bg-white p-1">
                {FEATURES.map((f, i) => (
                  <button
                    key={f.id}
                    onClick={() => setActiveTab(i)}
                    className="relative rounded-md px-4 py-1.5 text-sm font-medium transition-colors"
                    style={{
                      color: activeTab === i ? "#0A0A0A" : "#9CA3AF",
                    }}
                  >
                    {activeTab === i && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 rounded-md"
                        style={{ background: "rgba(0,0,0,0.06)" }}
                        transition={{ type: "spring", stiffness: 400, damping: 35 }}
                      />
                    )}
                    <span className="relative">{f.label}</span>
                  </button>
                ))}
              </div>

              {/* Copy block */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={active.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                  <div className="mb-3 font-mono text-xs text-neutral-400">{active.fig}</div>
                  <h3
                    className="mb-4 whitespace-pre-line text-2xl font-medium text-neutral-900 sm:text-3xl"
                    style={{ letterSpacing: "-0.022em", lineHeight: 1.1 }}
                  >
                    {active.headline}
                  </h3>
                  <p className="mb-8 max-w-sm font-extralight leading-relaxed text-neutral-600">
                    {active.body}
                  </p>

                  {/* Tag row */}
                  <div className="flex flex-wrap gap-1.5">
                    {active.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded border border-neutral-200 bg-neutral-100 px-2 py-0.5 font-mono text-[11px] text-neutral-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Step dots */}
              <div className="mt-12 flex items-center gap-2">
                {FEATURES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveTab(i)}
                    className="h-1 rounded-full transition-all duration-300"
                    style={{
                      width: activeTab === i ? 20 : 6,
                      background: activeTab === i ? "#2430AD" : "rgba(0,0,0,0.12)",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Right — visual mockup */}
            <div
              className="relative overflow-hidden"
              style={{ background: "#0D0D0D", minHeight: 460 }}
            >
              {/* Window chrome */}
              <div className="flex items-center gap-1.5 border-b border-neutral-200 px-4 py-2.5" style={{ background: "#090909" }}>
                <div className="h-2 w-2 rounded-full bg-[#FF5F56]" />
                <div className="h-2 w-2 rounded-full bg-[#FEBC2E]" />
                <div className="h-2 w-2 rounded-full bg-[#27C840]" />
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={active.id}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="absolute inset-0 top-[33px]"
                >
                  {active.visual}
                </motion.div>
              </AnimatePresence>

              {/* Subtle gradient at bottom */}
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#F0F0F0] to-transparent" />
            </div>
          </div>
        </div>

        {/* Bottom stat strip */}
        <div className="mt-px grid grid-cols-3 overflow-hidden rounded-b-xl border border-t-0 border-neutral-200">
          {[
            { num: "4 sources", label: "natively connected" },
            { num: "1 export", label: "works with any AI tool" },
            { num: "∞ projects", label: "no workspace limit" },
          ].map((stat, i) => (
            <div
              key={i}
              className={`bg-[#FAFAFA] px-6 py-5 hover:bg-neutral-100 transition-colors ${i < 2 ? "border-r border-neutral-200" : ""}`}
            >
              <div className="text-sm font-medium text-neutral-900" style={{ letterSpacing: "-0.012em" }}>{stat.num}</div>
              <div className="mt-0.5 font-mono text-xs text-neutral-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
