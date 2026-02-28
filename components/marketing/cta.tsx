"use client";

import { motion, useInView, AnimatePresence } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { springs } from "@/lib/animations";

// Seed count — adds credibility from day one.
// Each real signup from /api/waitlist adds on top of this.
const SEED_COUNT = 89;

// Avatar colours — shown as stacked dots next to the counter
const AVATAR_COLORS = ["#818CF8", "#F59E0B", "#10B981", "#F43F5E", "#A78BFA"];

export function CTA() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [count, setCount] = useState<number | null>(null);

  // Fetch current waitlist count on mount
  useEffect(() => {
    fetch("/api/waitlist")
      .then((r) => r.json())
      .then((d) => setCount(typeof d.count === "number" ? d.count : 0))
      .catch(() => setCount(0));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || state === "loading") return;
    setState("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Something went wrong");
      }
      // Bump counter immediately so they see the effect
      setCount((c) => (c ?? 0) + 1);
      setState("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setState("error");
    }
  }

  const displayCount = (count ?? 0) + SEED_COUNT;

  return (
    <section
      id="waitlist"
      className="relative overflow-hidden bg-[#1C1C1C] py-32"
      ref={ref}
    >
      {/* Radial accent glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 55% at 50% 100%, rgba(129,140,248,0.07), transparent)",
        }}
      />
      {/* Top hairline */}
      <div className="absolute top-0 left-1/2 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      <div className="relative mx-auto max-w-4xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-center"
        >
          {/* Eyebrow */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[#818CF8]" />
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500">
              Early access
            </span>
          </div>

          {/* Headline */}
          <h2
            className="mb-5 text-4xl font-medium text-white sm:text-5xl"
            style={{ letterSpacing: "-0.028em", lineHeight: 1.08 }}
          >
            Stop managing moodboards.
            <br />
            <span className="text-neutral-500">Start building.</span>
          </h2>

          {/* Sub */}
          <p
            className="mx-auto mb-10 max-w-lg font-extralight leading-relaxed text-neutral-400"
            style={{ fontSize: "1.05rem" }}
          >
            Studio OS brings your references, design tokens, and briefs into one
            workspace — scored, organised, and AI-ready from day one.
          </p>

          {/* ── Pill form ── */}
          <AnimatePresence mode="wait">
            {state === "success" ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="mx-auto flex max-w-sm flex-col items-center gap-3"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#818CF8]/30 bg-[#818CF8]/10">
                  <svg viewBox="0 0 16 16" fill="none" className="h-5 w-5 text-[#818CF8]">
                    <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="text-base font-medium text-white">You&apos;re on the list</p>
                <p className="text-sm font-extralight text-neutral-500">
                  We&apos;ll reach out with early access details.
                </p>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                onSubmit={handleSubmit}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mx-auto max-w-md"
              >
                {/* Unified pill — input + button as one element */}
                <div className="flex items-center rounded-full border border-white/[0.1] bg-white/[0.04] p-1.5 pl-5 transition-[border-color,box-shadow] duration-200 focus-within:border-[#818CF8]/40 focus-within:shadow-[0_0_0_3px_rgba(129,140,248,0.06)]">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    disabled={state === "loading"}
                    className="flex-1 bg-transparent text-sm text-white placeholder:text-neutral-600 outline-none disabled:opacity-50"
                  />
                  <motion.button
                    type="submit"
                    disabled={state === "loading"}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-black transition-opacity hover:opacity-90 disabled:opacity-40"
                    aria-label="Join waitlist"
                  >
                    {state === "loading" ? (
                      <svg className="h-3.5 w-3.5 animate-spin text-black/50" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 12 12" fill="none" className="h-3.5 w-3.5">
                        <path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </motion.button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Error */}
          {state === "error" && (
            <p className="mt-2 text-xs text-red-400">{errorMsg}</p>
          )}

          {/* ── Live counter — the Audyr trick ── */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="mt-5 flex items-center justify-center gap-2.5"
          >
            {/* Stacked avatar dots */}
            <div className="flex -space-x-1.5">
              {AVATAR_COLORS.map((color, i) => (
                <div
                  key={i}
                  className="h-6 w-6 rounded-full border-2 border-[#1C1C1C]"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>

            {/* Count text */}
            <span className="text-sm text-neutral-500">
              <AnimatePresence mode="wait">
                <motion.span
                  key={displayCount}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="font-medium text-neutral-300"
                >
                  {count === null ? "—" : `${displayCount}+`}
                </motion.span>
              </AnimatePresence>
              {" "}designers on the waitlist
            </span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
