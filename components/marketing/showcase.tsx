"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { springs, staggerContainer, staggerItem } from "@/lib/animations";

const showcaseImages = [
  { id: 1, aspect: "aspect-[4/5]",  color: "bg-amber-100/20",   score: 97 },
  { id: 2, aspect: "aspect-square", color: "bg-blue-100/20",    score: 92 },
  { id: 3, aspect: "aspect-[3/4]",  color: "bg-emerald-100/20", score: 95 },
  { id: 4, aspect: "aspect-[4/3]",  color: "bg-rose-100/20",    score: 88 },
  { id: 5, aspect: "aspect-[3/5]",  color: "bg-violet-100/20",  score: 94 },
  { id: 6, aspect: "aspect-square", color: "bg-orange-100/20",  score: 91 },
  { id: 7, aspect: "aspect-[4/5]",  color: "bg-cyan-100/20",    score: 96 },
  { id: 8, aspect: "aspect-[3/4]",  color: "bg-pink-100/20",    score: 89 },
];

const scoreRows = [
  { label: "Composition", sublabel: "Balance & structure", value: 92, color: "#2430AD" },
  { label: "Color",       sublabel: "Palette & harmony",   value: 88, color: "#7C3AED" },
  { label: "Mood",        sublabel: "Emotional impact",    value: 85, color: "#10B981" },
];

function ImageCard({ image }: { image: (typeof showcaseImages)[0] }) {
  return (
    <motion.div
      variants={staggerItem}
      whileHover={{ y: -4, transition: springs.smooth }}
      className={`group relative ${image.aspect} overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100`}
    >
      <div className={`absolute inset-0 ${image.color} transition-transform duration-500 group-hover:scale-105`} />

      {/* Score badge */}
      <div className="absolute right-2 top-2 flex items-center gap-1 rounded border border-neutral-200 bg-white/90 px-1.5 py-0.5 backdrop-blur-sm">
        <div className="h-1 w-1 rounded-full bg-[#2430AD]" />
        <span className="font-mono text-[9px] text-neutral-500">{image.score}</span>
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="absolute bottom-0 left-0 right-0 flex flex-wrap gap-1 p-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        {["Comp", "Color", "Mood"].map((tag) => (
          <span key={tag} className="rounded border border-neutral-200 bg-white/90 px-1 py-0.5 font-mono text-[8px] text-neutral-900/50 backdrop-blur-sm">
            {tag}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

export function Showcase() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="showcase" className="relative overflow-hidden bg-white py-24">
      {/* Subtle top border accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-1/2 bg-gradient-to-r from-transparent via-black/[0.06] to-transparent" />

      <div className="relative mx-auto max-w-7xl px-6" ref={ref}>
        <div className="grid gap-16 lg:grid-cols-2 lg:items-center">

          {/* ── Left: Copy + score breakdown ── */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <div className="mb-5 font-mono text-xs text-neutral-600">4.0 — AI curation</div>
            <h2
              className="mb-5 text-3xl font-medium text-neutral-900 sm:text-4xl"
              style={{ letterSpacing: "-0.022em", lineHeight: 1.1 }}
            >
              Only exceptional
              <br />
              <span className="text-neutral-500">imagery makes the cut.</span>
            </h2>
            <p className="mb-10 max-w-sm font-extralight leading-relaxed text-neutral-500">
              Every image is evaluated on composition, color theory, and emotional resonance.
              Only images scoring 80+ reach your feed — so you never wade through noise.
            </p>

            {/* Score rows */}
            <div className="space-y-0 overflow-hidden rounded-xl border border-white/[0.07]">
              {scoreRows.map((row, i) => (
                <motion.div
                  key={row.label}
                  initial={{ opacity: 0, x: -12 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{
                    duration: 0.4,
                    delay: 0.2 + i * 0.1,
                    ease: [0.25, 0.46, 0.45, 0.94],
                  }}
                  className={`flex items-center gap-4 px-5 py-4 ${
                    i < scoreRows.length - 1 ? "border-b border-neutral-200" : ""
                  }`}
                  style={{ background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent" }}
                >
                  {/* Color dot */}
                  <div className="h-2 w-2 shrink-0 rounded-full" style={{ background: row.color }} />

                  {/* Label */}
                  <div className="flex-1">
                    <div className="text-sm font-medium text-neutral-900" style={{ letterSpacing: "-0.012em" }}>
                      {row.label}
                    </div>
                    <div className="font-mono text-[10px] text-neutral-600">{row.sublabel}</div>
                  </div>

                  {/* Score track */}
                  <div className="flex items-center gap-3">
                    <div className="relative h-1 w-28 overflow-hidden rounded-full bg-white/[0.06]">
                      <motion.div
                        className="absolute left-0 top-0 h-full rounded-full"
                        style={{ background: row.color }}
                        initial={{ width: 0 }}
                        animate={isInView ? { width: `${row.value}%` } : { width: 0 }}
                        transition={{
                          duration: 0.8,
                          delay: 0.4 + i * 0.12,
                          ease: [0.25, 0.46, 0.45, 0.94],
                        }}
                      />
                    </div>
                    <span className="w-6 text-right font-mono text-xs text-neutral-500">
                      {row.value}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Footnote */}
            <p className="mt-5 font-mono text-[11px] text-neutral-700">
              Min. threshold: 80 · Refreshed daily · Learns from your saves
            </p>
          </motion.div>

          {/* ── Right: Masonry grid (unchanged) ── */}
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate={isInView ? "animate" : "initial"}
            className="columns-2 gap-3 space-y-3"
          >
            {showcaseImages.map((image) => (
              <ImageCard key={image.id} image={image} />
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
