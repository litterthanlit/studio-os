"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { springs } from "@/lib/animations";

const FAQS = [
  {
    q: "What exactly is Studio OS?",
    a: "Studio OS is a single workspace for your entire creative process — moodboard, design system, and project brief all in one place. It's the connective layer between your inspiration and your output. Not another tool to learn, but the one place where your creative thinking lives before it becomes design.",
  },
  {
    q: "Who is it built for?",
    a: "Solo designers, freelancers, and small creative teams who are tired of juggling Figma, Notion, Pinterest, Are.na, and a dozen browser tabs. If you've ever lost a reference, rewritten a brief from scratch, or rebuilt a design system for every new client — Studio OS is for you.",
  },
  {
    q: "Does it replace Figma or Notion?",
    a: "No — and that's intentional. Studio OS sits alongside the tools you already use. It handles the pre-work layer: collecting references, building your token library, generating the brief. So when you open Figma or write a doc, everything is already organized and ready.",
  },
  {
    q: "When will I get access?",
    a: "We're rolling out early access in waves, starting with people on the waitlist. Join now to get into the first batch. We'll email you directly when your spot is ready — no automated drip, just a real invite.",
  },
  {
    q: "Is my creative work private?",
    a: "Yes. Your boards, references, and projects are private to you by default. We don't train on your data, sell it, or share it with anyone. Your creative work stays yours.",
  },
  {
    q: "Is it really free right now?",
    a: "Yes, completely free while we build. We're iterating with early users before locking in pricing. When we do launch paid plans, everyone who joined early gets a meaningful discount — that's the upside of being here first.",
  },
];

function FAQItem({
  item,
  index,
  isOpen,
  onToggle,
}: {
  item: (typeof FAQS)[0];
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ ...springs.smooth, delay: index * 0.05 }}
      className="border-b border-neutral-200 last:border-b-0"
    >
      <button
        onClick={onToggle}
        className="group flex w-full items-center justify-between gap-6 py-6 text-left"
        aria-expanded={isOpen}
      >
        <span className="text-[17px] font-medium leading-snug text-neutral-900 transition-colors group-hover:text-neutral-600">
          {item.q}
        </span>

        {/* +/− toggle */}
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 22 }}
          className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-neutral-300 text-neutral-500 transition-colors group-hover:border-neutral-400"
        >
          <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3">
            <path
              d="M6 2v8M2 6h8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="answer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            style={{ overflow: "hidden" }}
          >
            <p className="pb-6 text-[15px] font-light leading-relaxed text-neutral-500">
              {item.a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function FAQ() {
  const [openIndex, setOpenIndex] = React.useState<number | null>(0);

  return (
    <section id="faq" className="bg-white py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-[1fr_2fr]">

          {/* Left — label + headline */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={springs.smooth}
            className="lg:pt-2"
          >
            <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-400">
              FAQ
            </p>
            <h2 className="text-3xl font-semibold leading-tight tracking-tight text-neutral-900 sm:text-4xl">
              Questions worth asking.
            </h2>
            <p className="mt-4 text-sm font-light leading-relaxed text-neutral-500">
              Still wondering about something?{" "}
              <a
                href="mailto:hello@studio-os.app"
                className="underline underline-offset-2 transition-colors hover:text-neutral-900"
              >
                Just ask us.
              </a>
            </p>
          </motion.div>

          {/* Right — accordion */}
          <div className="divide-y-0">
            {FAQS.map((item, i) => (
              <FAQItem
                key={item.q}
                item={item}
                index={i}
                isOpen={openIndex === i}
                onToggle={() => setOpenIndex(openIndex === i ? null : i)}
              />
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
