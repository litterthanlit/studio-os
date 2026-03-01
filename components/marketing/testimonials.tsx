"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

// ─── Company logos (SVG wordmarks / logotypes) ────────────────────────────────

const LOGOS = [
  {
    name: "Vercel",
    svg: (
      <svg viewBox="0 0 76 65" fill="currentColor" className="h-4 w-auto">
        <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
      </svg>
    ),
  },
  {
    name: "Linear",
    svg: (
      <svg viewBox="0 0 100 100" fill="currentColor" className="h-4 w-auto">
        <path d="M1.22541 61.5228c-.2225-.9485.90748-1.5459 1.59638-.857l36.0547 36.0548c.6889.6889.0915 1.8189-.857 1.5964C17.9436 94.0807 5.9193 82.0564 1.22541 61.5228ZM.00189135 46.8891c-.01764375.2833.08887225.5599.28957165.7606L52.3503 99.7085c.2007.2007.4773.3073.7606.2897C74.201 98.8268 91.026 82.0019 92.0079 60.8503c.0176-.2833-.0889-.5599-.2896-.7606L39.6399.288655c-.2007-.200699-.4773-.307375-.7606-.289565C18.3556 1.17311 1.53065 17.9981.00189135 46.8891ZM96.8656 37.3801c.6864 10.4135-2.3186 20.6929-8.4806 29.0589L9.77602 7.76085C18.1419 1.59884 28.4214-1.40618 38.835.00187169 64.7835 3.41812 93.4494 11.3353 96.8656 37.3801Z" />
      </svg>
    ),
  },
  {
    name: "Figma",
    svg: (
      <svg viewBox="0 0 38 57" fill="currentColor" className="h-5 w-auto">
        <path d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0zm-19 0c0-5.246 4.254-9.5 9.5-9.5H19v19H9.5C4.254 38 0 33.746 0 28.5zM0 9.5C0 4.254 4.254 0 9.5 0H19v19H9.5C4.254 19 0 14.746 0 9.5zM19 0h9.5C33.746 0 38 4.254 38 9.5S33.746 19 28.5 19H19V0zm0 38h9.5c5.246 0 9.5 4.254 9.5 9.5S33.746 57 28.5 57 19 52.746 19 47.5V38z"/>
      </svg>
    ),
  },
  {
    name: "Framer",
    svg: (
      <svg viewBox="0 0 200 300" fill="currentColor" className="h-5 w-auto">
        <path d="M0 0h200v100H100zm0 100h100l100 100H100v100L0 200z" />
      </svg>
    ),
  },
  {
    name: "Notion",
    svg: (
      <svg viewBox="0 0 100 100" fill="currentColor" className="h-4 w-auto">
        <path d="M6.017 4.313l55.333-4.087c6.797-.583 8.543-.19 12.817 2.913l17.663 12.43c2.913 2.147 3.883 2.73 3.883 5.053v68.243c0 4.277-1.553 6.807-6.99 7.193L24.467 99.967c-4.08.193-6.044-.39-8.184-3.113L3.113 79.813C.973 76.89 0 74.943 0 72.6V10.89c0-3.497 1.553-6.807 6.017-6.577z"/>
        <path fill="white" d="M61.35.226l-55.333 4.087C1.553 4.136 0 7.446 0 10.943V72.6c0 2.343.973 4.29 3.113 7.213l13.17 17.04c2.14 2.723 4.104 3.307 8.184 3.113l64.257-3.94c5.437-.386 6.99-2.916 6.99-7.193V29.583c0-2.287-.953-2.876-3.766-4.94L74.167 12.213C69.893 9.11 68.147 8.717 61.35.226z"/>
        <path d="M27.31 20.873l-5.046 17.113 15.697-1.747L27.31 20.873zM20.8 16.22l11.35 11.82 5.15-12.887-6.043.78c-3.92.503-6.923-.18-10.457 1.287z"/>
      </svg>
    ),
  },
];

// ─── Testimonial data ─────────────────────────────────────────────────────────

const testimonials = [
  {
    quote:
      "Studio OS changed how I collect references. The AI curation is actually good — it finds images I'd never discover on my own.",
    author: "Sarah Chen",
    role: "Product Designer",
    company: "Vercel",
    avatar: "SC",
    accentColor: "#2430AD",
    featured: false,
  },
  {
    quote:
      "Finally, a tool that understands organization. The command bar alone saves me hours every week. It's the missing layer between references and execution.",
    author: "Marcus Johnson",
    role: "Design Lead",
    company: "Linear",
    avatar: "MJ",
    accentColor: "#7C3AED",
    featured: true,
  },
  {
    quote:
      "The export to markdown feature is genius. I can feed my entire design system context to Claude in seconds.",
    author: "Emma Rodriguez",
    role: "Independent Designer",
    company: "Freelance",
    avatar: "ER",
    accentColor: "#10B981",
    featured: false,
  },
  {
    quote:
      "I've tried everything — Notion, Milanote, raw folders. Studio OS is the first tool that actually thinks like a designer.",
    author: "Tomás Abreu",
    role: "Brand Designer",
    company: "Framer",
    avatar: "TA",
    accentColor: "#F59E0B",
    featured: false,
  },
];

// ─── Components ───────────────────────────────────────────────────────────────

function TestimonialCard({
  t,
  index,
  isInView,
}: {
  t: (typeof testimonials)[0];
  index: number;
  isInView: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: 0.5,
        delay: 0.1 + index * 0.1,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className={`group relative flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white transition-colors duration-300 hover:border-neutral-300 hover:bg-neutral-50 ${
        t.featured ? "lg:col-span-2" : ""
      }`}
    >
      {/* Top accent line */}
      <div
        className="h-px w-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: `linear-gradient(90deg, transparent, ${t.accentColor}60, transparent)` }}
      />

      <div className={`flex h-full flex-col p-6 ${t.featured ? "lg:p-8" : ""}`}>
        {/* Open quote */}
        <div
          className={`mb-4 font-serif leading-none select-none ${t.featured ? "text-5xl" : "text-4xl"}`}
          style={{ color: t.accentColor, opacity: 0.4 }}
        >
          &ldquo;
        </div>

        {/* Quote text */}
        <p
          className={`flex-1 font-extralight leading-relaxed text-neutral-500 ${
            t.featured ? "text-lg" : "text-sm"
          }`}
          style={{ letterSpacing: "-0.011em" }}
        >
          {t.quote}
        </p>

        {/* Author */}
        <div className="mt-6 flex items-center gap-3 border-t border-neutral-100 pt-5">
          {/* Avatar */}
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-neutral-900"
            style={{
              background: `linear-gradient(135deg, ${t.accentColor}40, ${t.accentColor}20)`,
              border: `1px solid ${t.accentColor}30`,
              color: t.accentColor,
            }}
          >
            {t.avatar}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-neutral-900" style={{ letterSpacing: "-0.012em" }}>
              {t.author}
            </div>
            <div className="font-mono text-xs text-neutral-600">
              {t.role} · {t.company}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

export function Testimonials() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const logosRef = useRef(null);
  const logosInView = useInView(logosRef, { once: true, margin: "-60px" });

  return (
    <section id="testimonials" className="relative bg-[#FAFAFA] py-24 overflow-hidden">
      {/* Subtle accent glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-px w-3/4 -translate-x-1/2"
        style={{ background: "linear-gradient(90deg, transparent, rgba(36,48,173,0.3), transparent)" }}
      />

      <div className="mx-auto max-w-7xl px-6">

        {/* Section header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mb-16"
        >
          <div className="mb-4 font-mono text-xs text-neutral-600">6.0 — Testimonials</div>
          <h2
            className="text-3xl font-medium text-neutral-900 sm:text-4xl"
            style={{ letterSpacing: "-0.022em", lineHeight: 1.1 }}
          >
            Designers who switched
            <br />
            <span className="text-neutral-500">don&apos;t go back.</span>
          </h2>
        </motion.div>

        {/* Logos strip */}
        <motion.div
          ref={logosRef}
          initial={{ opacity: 0 }}
          animate={logosInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-14"
        >
          <div className="mb-5 font-mono text-[11px] text-neutral-400">
            Used by designers at
          </div>
          <div className="flex flex-wrap items-center gap-8">
            {LOGOS.map((logo, i) => (
              <motion.div
                key={logo.name}
                initial={{ opacity: 0, y: 8 }}
                animate={logosInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.15 + i * 0.07 }}
                className="text-neutral-400 transition-colors duration-200 hover:text-neutral-600"
                title={logo.name}
              >
                {logo.svg}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Hairline divider */}
        <div className="mb-10 h-px w-full bg-neutral-200" />

        {/* Testimonials grid — asymmetric */}
        {/* Row 1: featured (wide) + regular */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {/* Featured spans 2 cols */}
          <TestimonialCard t={testimonials[1]} index={0} isInView={isInView} />
          <TestimonialCard t={testimonials[0]} index={1} isInView={isInView} />
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TestimonialCard t={testimonials[2]} index={2} isInView={isInView} />
          <TestimonialCard t={testimonials[3]} index={3} isInView={isInView} />
        </div>

        {/* Bottom CTA nudge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-10 text-center"
        >
          <p className="font-mono text-xs text-neutral-400">
            Be first. Join the waitlist.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
