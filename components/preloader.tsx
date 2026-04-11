"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";

const SESSION_KEY = "studio-os:preloader-shown";

const SPRING = { type: "spring" as const, stiffness: 420, damping: 32 };

/**
 * Solid mark paths (foremost layer in `public/studio-os-mark.svg`), ordered
 * bottom → top so we can stack them in from the bottom upward.
 */
const LOGO_PATHS_BOTTOM_TO_TOP = [
  "M 0 68 C 0 66.895 0.895 66 2 66 L 117.189 66 C 118.294 66 119.189 66.895 119.189 68 L 119.189 77 C 119.189 78.105 118.294 79 117.189 79 L 2 79 C 0.895 79 0 78.105 0 77 Z",
  "M 0 51 C 0 49.895 0.895 49 2 49 L 117.189 49 C 118.294 49 119.189 49.895 119.189 51 L 119.189 60 C 119.189 61.105 118.294 62 117.189 62 L 2 62 C 0.895 62 0 61.105 0 60 Z",
  "M 0 34 C 0 32.895 0.895 32 2 32 L 117.189 32 C 118.294 32 119.189 32.895 119.189 34 L 119.189 43 C 119.189 44.105 118.294 45 117.189 45 L 2 45 C 0.895 45 0 44.105 0 43 Z",
  "M 0 17 C 0 15.895 0.895 15 2 15 L 117.189 15 C 118.294 15 119.189 15.895 119.189 17 L 119.189 26 C 119.189 27.105 118.294 28 117.189 28 L 2 28 C 0.895 28 0 27.105 0 26 Z",
  "M 0 2 C 0 0.895 0.895 0 2 0 L 55 0 C 56.105 0 57 0.895 57 2 L 57 9 C 57 10.105 56.105 11 55 11 L 2 11 C 0.895 11 0 10.105 0 9 Z",
];

const STAGGER_S = 0.072;
/** Time for last bar to finish springing in + short hold before dismiss. */
const OVERLAY_MS = 1050;

function LogoStackAnimation() {
  return (
    <svg
      width={127}
      height={83}
      viewBox="0 0 127 83"
      fill="none"
      className="overflow-visible"
      aria-hidden
    >
      <g transform="translate(0 4)">
        {LOGO_PATHS_BOTTOM_TO_TOP.map((d, i) => (
          <motion.g
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING, delay: i * STAGGER_S }}
          >
            <path d={d} fill="rgb(75, 87, 219)" />
          </motion.g>
        ))}
      </g>
    </svg>
  );
}

export function Preloader({ children }: { children: React.ReactNode }) {
  const [skip, setSkip] = React.useState(false);
  const [overlay, setOverlay] = React.useState(true);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SESSION_KEY)) {
      setSkip(true);
      setOverlay(false);
      return;
    }
    const t = window.setTimeout(() => {
      sessionStorage.setItem(SESSION_KEY, "1");
      setOverlay(false);
    }, OVERLAY_MS);
    return () => window.clearTimeout(t);
  }, []);

  if (skip) {
    return <>{children}</>;
  }

  return (
    <>
      <AnimatePresence>
        {overlay && (
          <motion.div
            key="preloader"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 99999,
              background: "#0F1729",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <LogoStackAnimation />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: overlay ? 0 : 1 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </>
  );
}
