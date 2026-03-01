"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Check } from "lucide-react";
import { springs, staggerContainer, staggerItem } from "@/lib/animations";

const plans = [
  {
    name: "Free",
    price: 0,
    period: "Free for everyone",
    features: [
      "5 projects",
      "Unlimited reference saves",
      "Board, Type, Palette, Tasks, Brief",
      "⌘K command palette",
      "Daily inspiration (curated feed)",
    ],
    cta: "Join waitlist",
    popular: false,
  },
  {
    name: "Pro",
    price: 9,
    period: "per month",
    features: [
      "Unlimited projects",
      "AI auto-tagging on every reference",
      "GPT-4 scored inspiration feed",
      "Export design-system.md",
      "Are.na + Pinterest import",
      "Browser extension (coming soon)",
    ],
    cta: "Join waitlist",
    popular: true,
  },
];

function PricingCard({ plan }: { plan: (typeof plans)[0] }) {
  const isFree = plan.price === 0;

  return (
    <motion.div
      variants={staggerItem}
      whileHover={plan.popular ? { y: -6, scale: 1.02, boxShadow: "0 24px 48px rgba(36,48,173,0.45), 0 8px 16px rgba(36,48,173,0.25)" } : {}}
      transition={{ type: "spring", stiffness: 340, damping: 22 }}
      className={`group relative flex flex-col overflow-hidden border rounded-xl w-full max-w-xs ${
        plan.popular
          ? "border-[#2430AD] md:scale-105 z-10 shadow-2xl shadow-[#2430AD]/30"
          : "border-neutral-200 bg-white"
      }`}
      style={plan.popular ? { background: "linear-gradient(to bottom, #2430AD 0%, #5C69F7 100%)" } : undefined}
    >
      {/* Header */}
      <div className="p-5 pb-3">
        <h3 className={`mb-1 text-base font-semibold ${plan.popular ? "text-white" : "text-neutral-900"}`}>
          {plan.name}
        </h3>

        {/* Price */}
        <div className="mt-3 flex items-baseline">
          <span className={`text-3xl font-semibold ${plan.popular ? "text-white" : "text-neutral-900"}`}>
            {isFree ? "Free" : `US$${plan.price}`}
          </span>
          {!isFree && (
            <span className={`ml-1 text-sm ${plan.popular ? "text-white/60" : "text-neutral-500"}`}>{plan.period}</span>
          )}
        </div>

        {isFree && (
          <div className="mt-2">
            <span className="text-xs text-neutral-500">Free for everyone</span>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className={`h-px mx-5 ${plan.popular ? "bg-white/20" : "bg-neutral-200"}`} />

      {/* Features */}
      <ul className="flex-1 space-y-2.5 p-5 pt-4">
        {plan.features.map((feature, i) => (
          <li key={i} className="flex items-start gap-3">
            <Check
              className={`mt-0.5 h-4 w-4 shrink-0 ${plan.popular ? "text-white" : "text-[#2430AD]"}`}
              strokeWidth={2}
            />
            <span className={`text-sm ${plan.popular ? "text-white/90" : "text-neutral-700"}`}>{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <div className="p-5 pt-0">
        <motion.a
          href="#waitlist"
          className={`flex h-10 w-full items-center justify-center rounded-full text-sm font-medium transition-all ${
            plan.popular
              ? "bg-white text-neutral-900 hover:bg-white/90"
              : "bg-neutral-900 text-white hover:bg-neutral-700"
          }`}
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.97 }}
          transition={springs.snappy}
        >
          {plan.cta}
        </motion.a>
      </div>
    </motion.div>
  );
}

export function Pricing() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="pricing" className="relative bg-[#FAFAFA] py-24">
      <div className="mx-auto max-w-6xl px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={springs.smooth}
          ref={ref}
          className="mb-6"
        >
<div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <h2
              className="text-3xl font-medium text-neutral-900 sm:text-4xl"
              style={{ letterSpacing: "-0.022em", lineHeight: 1.1 }}
            >
              Free while we build.
              <br />
              <span className="text-neutral-500">No card. No expiry.</span>
            </h2>
            <p className="max-w-sm font-extralight leading-relaxed text-neutral-500 lg:text-right">
              Free is genuinely useful. Pro pays for itself the first time you hand off a project.
            </p>
          </div>
        </motion.div>

        {/* Hairline divider */}
        <div className="mb-10 h-px w-full bg-neutral-200" />

        {/* Pricing grid - Centered 2 cards */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate={isInView ? "animate" : "initial"}
          className="flex flex-col items-center gap-4 md:flex-row md:justify-center md:items-start"
        >
          {plans.map((plan) => (
            <PricingCard key={plan.name} plan={plan} />
          ))}
        </motion.div>

        {/* Bottom footnote */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-8 text-center font-mono text-xs text-neutral-700"
        >
          Questions?{" "}
          <a
            href="mailto:hello@studio-os.app"
            className="text-neutral-500 transition-colors hover:text-neutral-900"
          >
            hello@studio-os.app
          </a>
        </motion.p>
      </div>
    </section>
  );
}
