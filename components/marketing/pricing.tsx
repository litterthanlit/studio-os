"use client";

import { motion, useInView, AnimatePresence } from "framer-motion";
import { useRef, useState } from "react";
import { Check } from "lucide-react";
import { springs, staggerContainer, staggerItem } from "@/lib/animations";

const plans = [
  {
    name: "Free",
    priceMonthly: 0,
    priceYearly: 0,
    period: "Free for everyone",
    features: [
      "5 projects",
      "Unlimited reference saves",
      "Board, Type, Palette, Tasks, Brief",
      "⌘K command palette",
      "Daily inspiration (curated feed)",
      "Light & dark mode",
    ],
    cta: "Join waitlist",
    popular: false,
  },
  {
    name: "Pro",
    priceMonthly: 9,
    priceYearly: 7,
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

function Toggle({
  yearly,
  onChange,
}: {
  yearly: boolean;
  onChange: (yearly: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-4">
      <span
        className={`text-sm transition-colors ${
          !yearly ? "text-neutral-900" : "text-neutral-500"
        }`}
      >
        Monthly
      </span>
      <button
        onClick={() => onChange(!yearly)}
        className="relative h-6 w-11 rounded-full bg-[#2430AD] transition-colors"
      >
        <motion.div
          className="absolute top-1 h-4 w-4 rounded-full bg-white"
          animate={{ left: yearly ? "calc(100% - 1.25rem)" : "0.25rem" }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </button>
      <span
        className={`text-sm transition-colors ${
          yearly ? "text-neutral-900" : "text-neutral-500"
        }`}
      >
        Yearly
      </span>
    </div>
  );
}

function PricingCard({
  plan,
  yearly,
}: {
  plan: (typeof plans)[0];
  yearly: boolean;
}) {
  const price = yearly ? plan.priceYearly : plan.priceMonthly;
  const isEnterprise = price === null;

  return (
    <motion.div
      variants={staggerItem}
      className={`group relative flex flex-col overflow-hidden border rounded-xl ${
        plan.popular
          ? "border-[#2430AD]/50 bg-white scale-105 z-10 shadow-2xl shadow-[#2430AD]/10"
          : "border-neutral-200 bg-white"
      }`}
    >
      {/* Popular indicator dot */}
      {plan.popular && (
        <div className="absolute top-4 right-4">
          <div className="h-2 w-2 rounded-full bg-[#2430AD]" />
        </div>
      )}

      {/* Header */}
      <div className="p-6 pb-4">
        <h3 className="mb-1 text-lg font-semibold text-neutral-900">
          {plan.name}
        </h3>
        
        {/* Price */}
        <div className="mt-4 flex items-baseline">
          {isEnterprise ? (
            <span className="text-2xl font-semibold text-neutral-900">
              Contact us
            </span>
          ) : (
            <>
              <span className="text-3xl font-semibold text-neutral-900">
                US${price}
              </span>
              <span className="ml-1 text-sm text-neutral-500">
                {plan.period}
              </span>
            </>
          )}
        </div>
        
        {/* Billed yearly toggle indicator */}
        {!isEnterprise && plan.priceMonthly !== 0 && (
          <div className="mt-3 flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${yearly ? 'bg-[#2430AD]' : 'bg-neutral-300'}`} />
            <span className={`text-xs ${yearly ? 'text-neutral-500' : 'text-neutral-500'}`}>
              Billed yearly
            </span>
          </div>
        )}
        
        {plan.priceMonthly === 0 && (
          <div className="mt-3">
            <span className="text-xs text-neutral-500">Free for everyone</span>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-neutral-200 mx-6" />

      {/* Features */}
      <ul className="flex-1 space-y-3 p-6 pt-5">
        {plan.features.map((feature, i) => (
          <li key={i} className="flex items-start gap-3">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#2430AD]" strokeWidth={2} />
            <span className="text-sm text-neutral-700">{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <div className="p-6 pt-0">
        <motion.a
          href={plan.name === "Enterprise" ? "mailto:hello@studio-os.app" : "#waitlist"}
          className={`flex h-11 w-full items-center justify-center rounded-full text-sm font-medium transition-all ${
            plan.popular
              ? "bg-neutral-900 text-white hover:bg-neutral-800"
              : "bg-neutral-200 text-neutral-900 hover:bg-neutral-700"
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
  const [yearly, setYearly] = useState(true);

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
          <div className="mb-4 font-mono text-xs text-neutral-600">7.0 — Pricing</div>
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
        <div className="mb-10 h-px w-full bg-white/[0.06]" />

        {/* Toggle */}
        <div className="mb-10">
          <Toggle yearly={yearly} onChange={setYearly} />
        </div>

        {/* Pricing grid - Centered 2 cards */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate={isInView ? "animate" : "initial"}
          className="flex justify-center gap-4 items-start"
        >
          {plans.map((plan) => (
            <PricingCard key={plan.name} plan={plan} yearly={yearly} />
          ))}
        </motion.div>

        {/* Bottom footnote — replaces "contact sales" */}
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
