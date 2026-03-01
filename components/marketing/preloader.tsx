"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

const DURATION = 1800; // ms before the overlay exits

export function Preloader() {
  const [visible, setVisible] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Show only once per session
    const shown = sessionStorage.getItem("sos-preloader");
    if (shown) {
      setVisible(false);
      return;
    }

    const t = setTimeout(() => {
      setVisible(false);
      sessionStorage.setItem("sos-preloader", "1");
    }, DURATION);

    return () => clearTimeout(t);
  }, []);

  // Avoid SSR mismatch — don't render until mounted
  if (!mounted) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="preloader"
          initial={{ y: "0%" }}
          exit={{ y: "-100%" }}
          transition={{ duration: 0.72, ease: [0.76, 0, 0.24, 1] }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white"
          style={{ willChange: "transform" }}
        >
          {/* Logo mark */}
          <motion.div
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mb-6 flex h-12 w-12 items-center justify-center"
          >
            <Image
              src="/logo-icon.svg"
              alt="Studio OS"
              width={48}
              height={48}
              priority
            />
          </motion.div>

          {/* Wordmark */}
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
            className="mb-8 font-mono text-[10px] tracking-[0.3em] text-neutral-400 uppercase"
          >
            Studio OS
          </motion.p>

          {/* Progress track */}
          <div className="relative h-px w-32 overflow-hidden rounded-full bg-neutral-100">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-[#2430AD]"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{
                duration: (DURATION - 600) / 1000,
                ease: [0.22, 1, 0.36, 1],
                delay: 0.4,
              }}
              style={{ originX: 0, width: "100%" }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
