"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { springs, staggerContainer, staggerItem } from "@/lib/animations";

const testimonials = [
  {
    quote:
      "Studio OS changed how I collect references. The AI curation is actually good — it finds images I'd never discover on my own.",
    author: "Sarah Chen",
    role: "Product Designer at Vercel",
    avatar: "SC",
  },
  {
    quote:
      "Finally, a design tool that understands organization. The command bar alone saves me hours every week.",
    author: "Marcus Johnson",
    role: "Design Lead at Linear",
    avatar: "MJ",
  },
  {
    quote:
      "The export to markdown feature is genius. I can feed my entire design system context to Claude in seconds.",
    author: "Emma Rodriguez",
    role: "Independent Designer",
    avatar: "ER",
  },
];

function TestimonialCard({
  testimonial,
}: {
  testimonial: (typeof testimonials)[0];
}) {
  return (
    <motion.div
      variants={staggerItem}
      whileHover={{ y: -4, transition: springs.smooth }}
      className="group relative overflow-hidden border border-neutral-800 bg-neutral-900 p-6"
    >
      {/* Gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.03] via-transparent to-black/[0.02]" />

      {/* Quote mark */}
      <div className="relative mb-4 text-4xl leading-none text-border-hover">&ldquo;</div>

      {/* Quote */}
      <p className="relative mb-6 text-sm font-extralight leading-relaxed text-text-secondary">
        {testimonial.quote}
      </p>

      {/* Author */}
      <div className="relative flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-blue-500/5 text-xs font-medium text-text-primary">
          {testimonial.avatar}
        </div>
        <div>
          <div className="text-sm font-light text-text-primary">
            {testimonial.author}
          </div>
          <div className="text-xs font-extralight text-text-muted">{testimonial.role}</div>
        </div>
      </div>

      {/* Hover border glow */}
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100">
        <div className="absolute inset-0 border border-accent/20" />
      </div>
    </motion.div>
  );
}

export function Testimonials() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="relative bg-black py-32">
      {/* Background */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background:
            "radial-gradient(ellipse at 50% 100%, var(--accent-subtle), transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={springs.smooth}
          ref={ref}
          className="mb-16 text-center"
        >
          <h2 className="mb-4 text-3xl font-light tracking-tight text-text-primary sm:text-4xl">
            What designers are saying
          </h2>
        </motion.div>

        {/* Testimonials grid */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate={isInView ? "animate" : "initial"}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {testimonials.map((testimonial) => (
            <TestimonialCard key={testimonial.author} testimonial={testimonial} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
