"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { springs } from "@/lib/animations";

type SpringType = "smooth" | "snappy" | "bouncy";

const springConfigs = {
  smooth: { type: "spring" as const, stiffness: 300, damping: 30 },
  snappy: { type: "spring" as const, stiffness: 400, damping: 25 },
  bouncy: { type: "spring" as const, stiffness: 500, damping: 15 },
};

const springDescriptions = {
  smooth: "Balanced and natural",
  snappy: "Fast and responsive",
  bouncy: "Playful and energetic",
};

export function AnimationDemo() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [activeSpring, setActiveSpring] = useState<SpringType>("smooth");
  const [clickCount, setClickCount] = useState(0);

  return (
    <section className="relative bg-black py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
          {/* Left: Interactive Demo */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={springs.smooth}
            ref={ref}
            className="order-2 lg:order-1"
          >
            <div className="relative border border-border-primary bg-bg-secondary p-8 sm:p-12">
              {/* Grid background */}
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage:
                    "radial-gradient(circle, var(--text-primary) 1px, transparent 1px)",
                  backgroundSize: "24px 24px",
                }}
              />

              {/* Interactive button */}
              <div className="relative flex flex-col items-center gap-8">
                <motion.button
                  key={clickCount}
                  onClick={() => setClickCount((c) => c + 1)}
                  className="group flex h-16 w-48 items-center justify-center border border-border-primary bg-bg-primary text-sm font-medium text-text-primary shadow-lg"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.97 }}
                  transition={springConfigs[activeSpring]}
                >
                  <span className="flex items-center gap-2">
                    <motion.span
                      animate={{ rotate: clickCount * 360 }}
                      transition={springConfigs[activeSpring]}
                      className="text-lg"
                    >
                      ✦
                    </motion.span>
                    Try me
                  </span>
                </motion.button>

                {/* Physics indicators */}
                <div className="flex gap-8 text-center">
                  <div>
                    <div className="text-2xl font-medium text-text-primary">
                      {springConfigs[activeSpring].stiffness}
                    </div>
                    <div className="text-xs text-text-muted">Stiffness</div>
                  </div>
                  <div>
                    <div className="text-2xl font-medium text-text-primary">
                      {springConfigs[activeSpring].damping}
                    </div>
                    <div className="text-xs text-text-muted">Damping</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Spring selector */}
            <div className="mt-6 flex justify-center gap-2">
              {(Object.keys(springConfigs) as SpringType[]).map((type) => (
                <motion.button
                  key={type}
                  onClick={() => setActiveSpring(type)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeSpring === type
                      ? "bg-button-primary-bg text-button-primary-text"
                      : "border border-border-primary bg-transparent text-text-secondary hover:text-text-primary"
                  }`}
                  whileTap={{ scale: 0.97 }}
                  transition={springs.snappy}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Right: Content */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={springs.smooth}
            className="order-1 lg:order-2"
          >
            <span className="mb-4 inline-block text-xs font-medium uppercase tracking-wider text-accent">
              Motion
            </span>
            <h2 className="mb-6 text-3xl font-medium tracking-tight text-text-primary sm:text-4xl">
              Spring physics,
              <br />
              not cubic-bezier
            </h2>
            <p className="mb-8 text-lg text-text-secondary">
              Every interaction feels natural. We use real spring physics for
              motion that responds like the physical world.
            </p>

            <div className="space-y-4">
              {(Object.keys(springConfigs) as SpringType[]).map((type) => (
                <motion.div
                  key={type}
                  onClick={() => setActiveSpring(type)}
                  className={`cursor-pointer border p-4 transition-colors ${
                    activeSpring === type
                      ? "border-accent bg-accent-subtle"
                      : "border-border-primary bg-bg-secondary hover:border-border-hover"
                  }`}
                  whileHover={{ x: 4 }}
                  transition={springs.smooth}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-text-primary">
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </span>
                    <span className="text-sm text-text-secondary">
                      {springDescriptions[type]}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
