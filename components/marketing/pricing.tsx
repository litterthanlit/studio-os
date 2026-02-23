"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Check } from "lucide-react";
import { springs, staggerContainer, staggerItem } from "@/lib/animations";

const plans = [
  {
    name: "Free",
    description: "For personal projects",
    price: "$0",
    period: "",
    features: [
      "Daily inspiration",
      "3 projects",
      "Basic reference management",
      "Export .md files",
    ],
    cta: "Get started",
    popular: false,
  },
  {
    name: "Pro",
    description: "For professional designers",
    price: "$9",
    period: "/month",
    features: [
      "Unlimited projects",
      "AI curation (75+ score)",
      "Priority support",
      "Advanced export options",
      "Team collaboration",
    ],
    cta: "Join waitlist",
    popular: true,
  },
  {
    name: "Enterprise",
    description: "For design teams",
    price: "Custom",
    period: "",
    features: [
      "Everything in Pro",
      "Teams & integrations",
      "Dedicated support",
      "SLA & security",
      "Custom workflows",
    ],
    cta: "Contact us",
    popular: false,
  },
];

function PricingCard({
  plan,
  index,
}: {
  plan: (typeof plans)[0];
  index: number;
}) {
  return (
    <motion.div
      variants={staggerItem}
      whileHover={{ y: -4, transition: springs.smooth }}
      className={`group relative flex flex-col overflow-hidden border border-neutral-800 p-6 sm:p-8 ${
        plan.popular ? "bg-accent-subtle/30" : "bg-neutral-900"
      }`}
    >
      {/* Gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.03] via-transparent to-black/[0.02]" />

      {/* Popular badge */}
      {plan.popular && (
        <div className="absolute -top-3 left-6 z-10">
          <span className="border border-accent bg-accent px-3 py-1 text-xs font-light text-white">
            Recommended
          </span>
        </div>
      )}

      {/* Header */}
      <div className="relative mb-6">
        <h3 className="mb-1 text-lg font-light text-text-primary">
          {plan.name}
        </h3>
        <p className="text-sm font-extralight text-text-secondary">{plan.description}</p>
      </div>

      {/* Price */}
      <div className="relative mb-6 flex items-baseline">
        <span className="text-4xl font-light tracking-tight text-text-primary">
          {plan.price}
        </span>
        <span className="ml-1 font-extralight text-text-secondary">{plan.period}</span>
      </div>

      {/* Features */}
      <ul className="relative mb-8 flex-1 space-y-3">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <span className="text-sm font-extralight text-text-secondary">{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <motion.a
        href={plan.name === "Enterprise" ? "mailto:hello@studio-os.app" : "#waitlist"}
        className={`relative flex h-12 w-full items-center justify-center text-sm font-medium transition-all ${
          plan.popular
            ? "bg-button-primary-bg text-button-primary-text hover:opacity-90"
            : "border border-border-primary bg-transparent text-text-primary hover:border-border-hover hover:bg-bg-tertiary"
        }`}
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.97 }}
        transition={springs.snappy}
      >
        {plan.cta}
      </motion.a>
    </motion.div>
  );
}

export function Pricing() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="pricing" className="relative bg-black py-32">
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
            Simple, transparent pricing
          </h2>
          <p className="mx-auto max-w-xl font-extralight text-text-secondary">
            Start free, upgrade when you need more power.
          </p>
        </motion.div>

        {/* Pricing grid */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate={isInView ? "animate" : "initial"}
          className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-3"
        >
          {plans.map((plan, index) => (
            <PricingCard key={plan.name} plan={plan} index={index} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
