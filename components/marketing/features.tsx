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
      "A fresh board of curated imagery scored against your taste profile. New visuals every morning, zero manual curation.",
  },
  {
    icon: Download,
    title: "Collect Everywhere",
    description:
      "Save references from Pinterest boards, Are.na channels, and Lummi in one click. Everything lands in the right project.",
  },
  {
    icon: FileText,
    title: "Export to AI",
    description:
      "Generate a design-system.md your AI tools can actually read — palette, type scale, and brief, all structured and ready.",
  },
  {
    icon: Command,
    title: "Command Bar",
    description:
      "⌘K for everything. Jump to any project, section, or reference without lifting your hands from the keyboard.",
  },
  {
    icon: Palette,
    title: "Palette & Type System",
    description:
      "Build your color palette and type scale inside the project. Watch them update live as your visual direction sharpens.",
  },
  {
    icon: Wind,
    title: "Brief & Context",
    description:
      "Write your design brief once. Studio OS structures it for AI assistants, client reviews, and engineer handoffs.",
  },
];

function FeatureCard({
  feature,
}: {
  feature: (typeof features)[0];
}) {
  const Icon = feature.icon;

  return (
    <div className="group border border-neutral-800 bg-[#1C1C1C] p-6 transition-colors hover:bg-[#242424]">
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
    <section id="features" className="relative bg-[#1C1C1C] py-32">
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
          <h2 className="mb-4 text-3xl font-medium tracking-tight text-white sm:text-4xl">
            One workspace, start to ship
          </h2>
          <p className="mx-auto max-w-xl text-neutral-400">
            Reference, palette, type, and brief — all connected, all live.
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
