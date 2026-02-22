"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { springs, staggerContainer, staggerItem } from "@/lib/animations";

export function CTA() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
      // In a real app, this would send to your backend
    }
  };

  return (
    <section id="waitlist" className="relative bg-black py-32">
      {/* Background gradient */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 50%, var(--accent-subtle), transparent)",
        }}
      />

      <div className="relative mx-auto max-w-3xl px-6">
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate={isInView ? "animate" : "initial"}
          ref={ref}
          className="border border-border-primary bg-bg-secondary p-8 text-center sm:p-12"
        >
          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={springs.smooth}
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center border border-accent bg-accent-subtle">
                <Check className="h-6 w-6 text-accent" />
              </div>
              <h3 className="mb-2 text-2xl font-medium text-text-primary">
                You&apos;re on the list
              </h3>
              <p className="text-text-secondary">
                We&apos;ll be in touch soon with early access details.
              </p>
            </motion.div>
          ) : (
            <>
              <motion.h2
                variants={staggerItem}
                className="mb-4 text-3xl font-light tracking-tight text-text-primary sm:text-4xl"
              >
                Ready to transform
                <br />
                your workflow?
              </motion.h2>

              <motion.p
                variants={staggerItem}
                className="mb-8 text-lg font-extralight text-text-secondary"
              >
                Join 2,000+ designers on the waitlist. Early access rolling out
                soon.
              </motion.p>

              <motion.form
                variants={staggerItem}
                onSubmit={handleSubmit}
                className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row"
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="flex-1 border border-border-secondary bg-bg-input px-4 py-3 text-sm text-text-primary placeholder:text-text-placeholder focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <motion.button
                  type="submit"
                  className="group flex h-12 items-center justify-center gap-2 bg-button-primary-bg px-6 text-sm font-medium text-button-primary-text transition-opacity hover:opacity-90"
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  transition={springs.snappy}
                >
                  Get early access
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </motion.button>
              </motion.form>

              <motion.p
                variants={staggerItem}
                className="mt-4 text-xs font-extralight text-text-muted"
              >
                No spam. Unsubscribe anytime.
              </motion.p>
            </>
          )}
        </motion.div>
      </div>
    </section>
  );
}
