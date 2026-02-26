"use client";

import { motion } from "framer-motion";
import { springs } from "@/lib/animations";

// ── Placeholder SVGs — swap for your custom isometric illustrations ──

function CollectIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Three reference thumbnails */}
      <rect x="28" y="108" width="46" height="34" rx="3" stroke="currentColor" strokeWidth="1.2" />
      <rect x="34" y="114" width="34" height="20" rx="1.5" stroke="currentColor" strokeWidth="0.7" opacity="0.45" />
      <rect x="78" y="100" width="46" height="34" rx="3" stroke="currentColor" strokeWidth="1.2" />
      <rect x="84" y="106" width="34" height="20" rx="1.5" stroke="currentColor" strokeWidth="0.7" opacity="0.45" />
      <rect x="126" y="108" width="46" height="34" rx="3" stroke="currentColor" strokeWidth="1.2" />
      <rect x="132" y="114" width="34" height="20" rx="1.5" stroke="currentColor" strokeWidth="0.7" opacity="0.45" />
      {/* Dashed drop arrow */}
      <path d="M100 38 L100 86" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 3" />
      <path d="M93 79 L100 88 L107 79" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Folder at bottom */}
      <path d="M58 152 L58 164 Q58 167 61 167 L139 167 Q142 167 142 164 L142 147 Q142 144 139 144 L100 144 L96 139 L61 139 Q58 139 58 142 Z"
        stroke="currentColor" strokeWidth="1.2" fill="none" />
      {/* Auto-tag chips */}
      <rect x="32" y="146" width="18" height="5" rx="2.5" stroke="currentColor" strokeWidth="0.7" opacity="0.4" />
      <rect x="53" y="146" width="13" height="5" rx="2.5" stroke="currentColor" strokeWidth="0.7" opacity="0.4" />
      <rect x="82" y="138" width="18" height="5" rx="2.5" stroke="currentColor" strokeWidth="0.7" opacity="0.4" />
    </svg>
  );
}

function BuildIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Colour swatch row */}
      <rect x="28" y="56" width="22" height="22" rx="3" stroke="currentColor" strokeWidth="1.2" />
      <rect x="55" y="56" width="22" height="22" rx="3" stroke="currentColor" strokeWidth="1.2" />
      <rect x="82" y="56" width="22" height="22" rx="3" stroke="currentColor" strokeWidth="1.2" />
      <rect x="109" y="56" width="22" height="22" rx="3" stroke="currentColor" strokeWidth="1.2" />
      <rect x="136" y="56" width="22" height="22" rx="3" stroke="currentColor" strokeWidth="1.2" />
      {/* Type scale */}
      <line x1="28" y1="96" x2="172" y2="96" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" opacity="0.9" />
      <line x1="28" y1="108" x2="144" y2="108" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" opacity="0.65" />
      <line x1="28" y1="118" x2="116" y2="118" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />
      <line x1="28" y1="126" x2="94" y2="126" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.3" />
      {/* Token rows */}
      <rect x="28" y="144" width="58" height="7" rx="2" stroke="currentColor" strokeWidth="0.8" opacity="0.35" />
      <rect x="92" y="144" width="38" height="7" rx="2" stroke="currentColor" strokeWidth="0.8" opacity="0.35" />
      <rect x="136" y="144" width="28" height="7" rx="2" stroke="currentColor" strokeWidth="0.8" opacity="0.35" />
      <rect x="28" y="156" width="42" height="7" rx="2" stroke="currentColor" strokeWidth="0.8" opacity="0.22" />
      <rect x="76" y="156" width="54" height="7" rx="2" stroke="currentColor" strokeWidth="0.8" opacity="0.22" />
    </svg>
  );
}

function BriefIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Document */}
      <rect x="50" y="36" width="100" height="128" rx="5" stroke="currentColor" strokeWidth="1.2" />
      {/* Spark icon */}
      <path d="M88 58 L92 66 L100 58 L92 50 Z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
      <path d="M100 58 L108 54" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      <path d="M100 58 L104 66" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      {/* Generated text lines */}
      <line x1="66" y1="80" x2="134" y2="80" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.9" />
      <line x1="66" y1="91" x2="128" y2="91" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.72" />
      <line x1="66" y1="102" x2="134" y2="102" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.55" />
      <line x1="66" y1="113" x2="120" y2="113" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.38" />
      {/* Still writing — dashed */}
      <line x1="66" y1="124" x2="112" y2="124" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" strokeLinecap="round" opacity="0.28" />
      {/* Cursor */}
      <rect x="114" y="120" width="2" height="9" rx="1" fill="currentColor" opacity="0.55" />
      {/* Section chips */}
      <rect x="66" y="140" width="28" height="6" rx="3" stroke="currentColor" strokeWidth="0.7" opacity="0.3" />
      <rect x="100" y="140" width="20" height="6" rx="3" stroke="currentColor" strokeWidth="0.7" opacity="0.3" />
    </svg>
  );
}

function InspireIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Masonry grid */}
      <rect x="26" y="46" width="42" height="58" rx="3" stroke="currentColor" strokeWidth="1.2" />
      <rect x="73" y="46" width="42" height="32" rx="3" stroke="currentColor" strokeWidth="1.2" />
      <rect x="120" y="46" width="54" height="58" rx="3" stroke="currentColor" strokeWidth="1.2" />
      <rect x="73" y="83" width="42" height="21" rx="3" stroke="currentColor" strokeWidth="1.2" />
      <rect x="26" y="110" width="64" height="44" rx="3" stroke="currentColor" strokeWidth="1.2" />
      <rect x="95" y="110" width="32" height="44" rx="3" stroke="currentColor" strokeWidth="1.2" />
      <rect x="132" y="110" width="42" height="44" rx="3" stroke="currentColor" strokeWidth="1.2" />
      {/* Score badges */}
      <rect x="48" y="52" width="16" height="7" rx="2" stroke="currentColor" strokeWidth="0.7" opacity="0.55" />
      <rect x="128" y="52" width="16" height="7" rx="2" stroke="currentColor" strokeWidth="0.7" opacity="0.55" />
      <rect x="34" y="116" width="16" height="7" rx="2" stroke="currentColor" strokeWidth="0.7" opacity="0.45" />
      <rect x="140" y="116" width="16" height="7" rx="2" stroke="currentColor" strokeWidth="0.7" opacity="0.45" />
    </svg>
  );
}

const FEATURES = [
  {
    fig: "FIG 0.1",
    icon: CollectIcon,
    title: "Every reference, one place.",
    description:
      "Save images, links, and screenshots from anywhere. Auto-tagged by mood, color, and subject — so finding the right reference is instant.",
  },
  {
    fig: "FIG 0.2",
    icon: BuildIcon,
    title: "Your design system, alive.",
    description:
      "Build your palette, type scale, and token library as the project evolves. Export a design-system.md your whole team can use.",
  },
  {
    fig: "FIG 0.3",
    icon: BriefIcon,
    title: "Brief in seconds.",
    description:
      "AI reads your board and generates a structured creative brief — positioning, tone, constraints — so you spend less time writing and more time designing.",
  },
  {
    fig: "FIG 0.4",
    icon: InspireIcon,
    title: "A feed that gets your taste.",
    description:
      "Daily curated images scored by your aesthetic. Connect Are.na channels and Pinterest boards to make it entirely yours.",
  },
];

export function FeaturesGrid() {
  return (
    <section className="bg-[#111111] py-32">
      <div className="mx-auto max-w-7xl px-6">

        {/* Section headline */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={springs.smooth}
          className="mb-20 max-w-4xl"
        >
          <h2 className="text-4xl font-semibold leading-[1.15] tracking-tight sm:text-5xl">
            <span className="text-white">One workspace, every creative layer.</span>{" "}
            <span className="text-neutral-500">
              From raw reference to final handoff — Studio OS holds your entire
              process so nothing gets lost between tools.
            </span>
          </h2>
        </motion.div>

        {/* 2×2 card grid with hairline borders */}
        <div className="grid grid-cols-1 border border-white/[0.07] sm:grid-cols-2">
          {FEATURES.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.fig}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ ...springs.smooth, delay: i * 0.07 }}
                className={[
                  "group flex flex-col bg-[#111111] p-10 transition-colors duration-300 hover:bg-[#151515]",
                  // right border on left column cards
                  i % 2 === 0 ? "sm:border-r border-white/[0.07]" : "",
                  // top border on bottom row cards
                  i >= 2 ? "border-t border-white/[0.07]" : "",
                ].join(" ")}
              >
                {/* Fig label */}
                <span className="mb-8 font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-600">
                  {feature.fig}
                </span>

                {/* Illustration */}
                <div className="mb-8 flex h-44 items-center justify-center">
                  <Icon className="h-36 w-36 text-neutral-700 transition-colors duration-500 group-hover:text-neutral-400" />
                </div>

                {/* Copy */}
                <h3 className="mb-3 text-[17px] font-medium leading-snug text-white">
                  {feature.title}
                </h3>
                <p className="text-sm font-light leading-relaxed text-neutral-500">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
