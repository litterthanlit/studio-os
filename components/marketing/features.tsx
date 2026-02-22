"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  Sparkles,
  Download,
  FileText,
  Command,
  Palette,
  Wind,
} from "lucide-react";
import { springs, staggerContainer, staggerItem } from "@/lib/animations";

const features = [
  {
    icon: Sparkles,
    title: "Daily Inspiration",
    description:
      "AI-curated imagery from Pinterest, Are.na, and Lummi. Fresh references every day.",
  },
  {
    icon: Download,
    title: "Import References",
    description:
      "Pull in your Pinterest boards, Are.na channels, and Lummi collections in one click.",
  },
  {
    icon: FileText,
    title: "Export .md",
    description:
      "Generate AI-readable design specs. Structured markdown for LLM context windows.",
  },
  {
    icon: Command,
    title: "Command Bar",
    description:
      "Keyboard-first navigation. ⌘K to jump anywhere. Built for speed.",
  },
  {
    icon: Palette,
    title: "Color & Type",
    description:
      "Design system tools with real-time preview. Build palettes and type scales fast.",
  },
  {
    icon: Wind,
    title: "Spring Animations",
    description:
      "Natural motion physics throughout. No cubic-bezier, just springs.",
  },
];

function FeatureCard({
  feature,
}: {
  feature: (typeof features)[0];
}) {
  const Icon = feature.icon;

  return (
    <div className="group border border-neutral-800 bg-black p-6 transition-colors hover:bg-neutral-950">
      {/* Icon */}
      <div className="mb-6 flex h-10 w-10 items-center justify-center text-neutral-600 transition-colors group-hover:text-neutral-500">
        <Icon className="h-6 w-6" strokeWidth={1.5} />
      </div>

      {/* Content */}
      <h3 className="mb-2 text-sm font-medium text-white">
        {feature.title}
      </h3>
      <p className="text-sm leading-relaxed text-neutral-500">
        {feature.description}
      </p>
    </div>
  );
}

export function Features() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="features" className="relative bg-black py-32">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={springs.smooth}
          ref={ref}
          className="mb-16 text-center"
        >
          <span className="mb-4 inline-block text-xs font-medium uppercase tracking-wider text-accent">
            Features
          </span>
          <h2 className="mb-4 text-3xl font-medium tracking-tight text-text-primary sm:text-4xl">
            Everything you need
          </h2>
          <p className="mx-auto max-w-xl text-text-secondary">
            A complete toolkit for design research, organization, and
            documentation.
          </p>
        </motion.div>

        {/* Features grid */}
        <div className="grid grid-cols-1 gap-px bg-neutral-800 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  );
}
