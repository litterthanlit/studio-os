"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { springs, staggerContainer, staggerItem } from "@/lib/animations";

const steps = [
  {
    num: "01",
    title: "Curate",
    description: "Add your taste profile. Upload 20+ reference images.",
  },
  {
    num: "02",
    title: "Collect",
    description: "Import from anywhere. Pinterest, Are.na, Lummi.",
  },
  {
    num: "03",
    title: "Create",
    description: "Reference while you design. Export specs for AI.",
  },
];

function StepCard({
  step,
}: {
  step: (typeof steps)[0];
}) {
  return (
    <motion.div
      variants={staggerItem}
      className="group relative flex flex-col"
    >
      {/* Step number */}
      <span className="mb-4 font-mono text-xs text-neutral-600">
        {step.num}
      </span>

      {/* Title */}
      <h3 className="mb-3 text-lg font-light text-white">
        {step.title}
      </h3>

      {/* Description */}
      <p className="text-sm font-extralight leading-relaxed text-neutral-500">
        {step.description}
      </p>

      {/* Connector line (hidden on last item and mobile) */}
      <div className="absolute -right-3 top-0 hidden h-full w-px bg-neutral-800 lg:block" />
    </motion.div>
  );
}

export function HowItWorks() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="how-it-works" className="relative bg-black py-32">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={springs.smooth}
          ref={ref}
          className="mb-16 text-center"
        >
          <h2 className="mb-4 text-3xl font-light tracking-tight text-text-primary sm:text-4xl">
            How it works
          </h2>
          <p className="mx-auto max-w-xl font-extralight text-text-secondary">
            Three steps to a unified design workflow.
          </p>
        </motion.div>

        {/* Steps grid */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate={isInView ? "animate" : "initial"}
          className="grid gap-8 sm:grid-cols-3"
        >
          {steps.map((step) => (
            <StepCard key={step.num} step={step} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
