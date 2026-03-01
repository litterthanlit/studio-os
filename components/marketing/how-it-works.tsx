"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const steps = [
  {
    num: "01",
    title: "Import",
    description:
      "Pull references from Pinterest, Are.na, Lummi, or your desktop. Studio OS scores every image on composition, colour, and mood — and organises them without a single manual tag.",
    visual: <GatherVisual />,
  },
  {
    num: "02",
    title: "Systemise",
    description:
      "Define your palette, type scale, and spacing tokens inside the project. Everything stays in sync and exports a structured file any AI model or handoff tool can read.",
    visual: <BuildVisual />,
  },
  {
    num: "03",
    title: "Export",
    description:
      "Generate a creative brief in seconds. Ship a design-system.md to your AI tools, or hand off a polished spec to clients and engineers.",
    visual: <ShipVisual />,
  },
];

// ─── Step visuals ─────────────────────────────────────────────────────────────

function GatherVisual() {
  return (
    <div className="flex flex-col gap-2 p-1">
      {/* Import sources */}
      {[
        { label: "Pinterest", count: 84, color: "#F43F5E" },
        { label: "Are.na",    count: 47, color: "#2430AD" },
        { label: "Lummi",     count: 29, color: "#10B981" },
      ].map((src) => (
        <div
          key={src.label}
          className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-3 py-2"
        >
          <div className="h-1.5 w-1.5 rounded-full" style={{ background: src.color }} />
          <span className="flex-1 text-[11px] text-neutral-400">{src.label}</span>
          <span className="font-mono text-[10px] text-neutral-400">{src.count}</span>
          <div className="flex h-4 items-center rounded bg-neutral-100 px-1.5">
            <span className="font-mono text-[8px] text-neutral-400">synced</span>
          </div>
        </div>
      ))}
      <div className="flex items-center justify-center rounded-lg border border-dashed border-neutral-200 py-2 text-[10px] text-neutral-400">
        + Drop files here
      </div>
    </div>
  );
}

function BuildVisual() {
  const colors = ["#2430AD", "#111111", "#E5E5E5", "#F59E0B"];
  return (
    <div className="flex flex-col gap-3 p-1">
      {/* Palette row */}
      <div>
        <div className="mb-1.5 font-mono text-[8px] uppercase tracking-widest text-neutral-400">Color</div>
        <div className="flex gap-1">
          {colors.map((c, i) => (
            <div key={i} className="relative flex-1">
              <div className="h-8 rounded-md border border-neutral-200" style={{ backgroundColor: c }} />
            </div>
          ))}
        </div>
      </div>
      {/* Type preview */}
      <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2">
        <div className="mb-1 font-mono text-[8px] uppercase tracking-widest text-neutral-400">Typography</div>
        <div className="text-[22px] font-semibold leading-none text-neutral-900" style={{ letterSpacing: "-0.02em" }}>Aa</div>
        <div className="mt-0.5 font-mono text-[9px] text-neutral-400">Inter Variable · 590</div>
      </div>
      {/* Token count */}
      <div className="flex items-center gap-2 rounded-lg border border-[#2430AD]/20 bg-[#2430AD]/5 px-3 py-2">
        <div className="h-1.5 w-1.5 rounded-full bg-[#2430AD]" />
        <span className="text-[10px] text-neutral-400">14 tokens defined</span>
        <span className="ml-auto font-mono text-[9px] text-[#818cf8]">Export ↓</span>
      </div>
    </div>
  );
}

function ShipVisual() {
  return (
    <div className="flex flex-col gap-2 p-1">
      {/* Brief preview */}
      <div className="rounded-lg border border-neutral-200 bg-neutral-100 p-3 space-y-2">
        {[
          { k: "Project", v: "Acme Rebrand" },
          { k: "Tone", v: "Minimal, premium" },
          { k: "Palette", v: "Navy + white" },
        ].map((row) => (
          <div key={row.k} className="flex items-baseline gap-2">
            <span className="w-12 shrink-0 font-mono text-[8px] uppercase tracking-wider text-neutral-400">{row.k}</span>
            <span className="text-[10px] text-neutral-400">{row.v}</span>
          </div>
        ))}
      </div>
      {/* Export actions */}
      {[
        { label: "design-system.md", tag: "AI-ready", color: "#2430AD" },
        { label: "creative-brief.pdf", tag: "Client", color: "#10B981" },
      ].map((item) => (
        <div key={item.label} className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2">
          <div className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
          <span className="flex-1 font-mono text-[10px] text-neutral-500">{item.label}</span>
          <span className="rounded border border-neutral-200 px-1.5 py-0.5 font-mono text-[8px] text-neutral-400">{item.tag}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────

export function HowItWorks() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="how-it-works" className="relative bg-white py-24 overflow-hidden">
      {/* Subtle top border accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-1/2 bg-gradient-to-r from-transparent via-black/[0.06] to-transparent" />

      <div className="mx-auto max-w-7xl px-6" ref={ref}>

        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mb-20"
        >
          <div className="mb-4 font-mono text-xs text-neutral-400">5.0 — How it works</div>
          <h2
            className="text-3xl font-medium text-neutral-900 sm:text-4xl"
            style={{ letterSpacing: "-0.022em", lineHeight: 1.1 }}
          >
            From first reference
            <br />
            <span className="text-neutral-500">to final spec.</span>
          </h2>
        </motion.div>

        {/* Steps */}
        <div className="relative grid grid-cols-1 gap-0 lg:grid-cols-3 divide-y divide-neutral-200 lg:divide-y-0">
          {/* Connecting line (desktop only) */}
          <div className="pointer-events-none absolute left-0 right-0 top-[52px] hidden lg:block">
            <motion.div
              initial={{ scaleX: 0 }}
              animate={isInView ? { scaleX: 1 } : {}}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="mx-auto h-px origin-left bg-gradient-to-r from-white/[0.06] via-white/[0.06] to-transparent"
              style={{ width: "66%" }}
            />
          </div>

          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 24 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.5,
                delay: 0.1 + i * 0.12,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              className={`relative flex flex-col gap-6 py-8 lg:py-0 lg:pb-0 ${
                i < 2 ? "lg:border-r lg:border-neutral-200 lg:pr-12" : ""
              } ${i > 0 ? "lg:pl-12" : ""}`}
            >
              {/* Step number bubble */}
              <div className="flex items-center gap-4">
                <div
                  className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neutral-200"
                  style={{ background: "rgba(0,0,0,0.03)" }}
                >
                  {/* Connector dot indicator */}
                  <div
                    className="absolute -right-px top-1/2 hidden h-2 w-2 -translate-y-1/2 translate-x-1/2 rounded-full border border-white lg:block"
                    style={{ background: i === 0 ? "var(--accent)" : "#e5e7eb" }}
                  />
                  <span className="font-mono text-xs text-neutral-500">{step.num}</span>
                </div>
                <h3
                  className="text-xl font-medium text-neutral-900"
                  style={{ letterSpacing: "-0.012em" }}
                >
                  {step.title}
                </h3>
              </div>

              {/* Description */}
              <p className="font-extralight leading-relaxed text-neutral-500">
                {step.description}
              </p>

              {/* Visual card */}
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 overflow-hidden">
                {/* Mini title bar */}
                <div className="flex items-center gap-1.5 border-b border-neutral-200 px-3 py-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#FF5F56]/60" />
                  <div className="h-1.5 w-1.5 rounded-full bg-[#FEBC2E]/60" />
                  <div className="h-1.5 w-1.5 rounded-full bg-[#27C840]/60" />
                </div>
                <div className="p-3">
                  {step.visual}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
