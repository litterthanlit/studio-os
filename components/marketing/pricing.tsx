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
    cta: "Get started free",
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
    cta: "Start free trial",
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
          !yearly ? "text-white" : "text-neutral-400"
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
          yearly ? "text-white" : "text-neutral-400"
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
          ? "border-[#2430AD]/50 bg-[#161820] scale-105 z-10 shadow-2xl shadow-[#2430AD]/10"
          : "border-neutral-800 bg-[#141414]"
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
        <h3 className="mb-1 text-lg font-semibold text-white">
          {plan.name}
        </h3>
        
        {/* Price */}
        <div className="mt-4 flex items-baseline">
          {isEnterprise ? (
            <span className="text-2xl font-semibold text-white">
              Contact us
            </span>
          ) : (
            <>
              <span className="text-3xl font-semibold text-white">
                US${price}
              </span>
              <span className="ml-1 text-sm text-neutral-400">
                {plan.period}
              </span>
            </>
          )}
        </div>
        
        {/* Billed yearly toggle indicator */}
        {!isEnterprise && plan.priceMonthly !== 0 && (
          <div className="mt-3 flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${yearly ? 'bg-[#2430AD]' : 'bg-neutral-600'}`} />
            <span className={`text-xs ${yearly ? 'text-neutral-400' : 'text-neutral-500'}`}>
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
      <div className="h-px bg-neutral-800 mx-6" />

      {/* Features */}
      <ul className="flex-1 space-y-3 p-6 pt-5">
        {plan.features.map((feature, i) => (
          <li key={i} className="flex items-start gap-3">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#2430AD]" strokeWidth={2} />
            <span className="text-sm text-neutral-300">{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <div className="p-6 pt-0">
        <motion.a
          href={plan.name === "Enterprise" ? "mailto:hello@studio-os.app" : "#waitlist"}
          className={`flex h-11 w-full items-center justify-center rounded-lg text-sm font-medium transition-all ${
            plan.popular
              ? "bg-white text-black hover:bg-neutral-100"
              : "bg-neutral-800 text-white hover:bg-neutral-700"
          }`}
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.97 }}
          transition={springs.snappy}
        >
          {plan.cta}
        </motion.a>
        
        {plan.popular && (
          <p className="mt-3 text-center text-xs text-neutral-500">
            or <a href="mailto:hello@studio-os.app" className="text-[#2430AD] hover:underline">contact sales</a>
          </p>
        )}
      </div>
    </motion.div>
  );
}

export function Pricing() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [yearly, setYearly] = useState(true);

  return (
    <section id="pricing" className="relative bg-[#111111] py-32">
      <div className="mx-auto max-w-6xl px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={springs.smooth}
          ref={ref}
          className="mb-12 text-center"
        >
          <h2 className="mb-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Pricing
          </h2>
          <p className="mx-auto max-w-xl text-neutral-400">
            Free is genuinely useful. Pro pays for itself the first time you hand off a project.
          </p>
        </motion.div>

        {/* Toggle */}
        <div className="mb-12">
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
      </div>
    </section>
  );
}
