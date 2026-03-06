"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";

const SESSION_KEY = "studio-os:preloader-shown";
const SPRING = { type: "spring" as const, stiffness: 400, damping: 30 };

type FolderItem = {
  id: number;
  startX: number;
  startY: number;
  startRotate: number;
  endX: number;
  endY: number;
  opacity: number;
  gradientFrom: string;
  gradientTo: string;
  delay: number;
};

const FOLDERS: FolderItem[] = [
  { id: 0, startX: -80, startY: -60, startRotate: -15, endX: 18, endY: -10, opacity: 0.55, gradientFrom: "rgba(36,48,173,0.5)", gradientTo: "rgba(92,105,247,0.5)", delay: 0 },
  { id: 1, startX: 70, startY: 50, startRotate: 12, endX: 10, endY: 0, opacity: 0.75, gradientFrom: "rgba(36,48,173,0.7)", gradientTo: "rgba(92,105,247,0.7)", delay: 0.03 },
  { id: 2, startX: -50, startY: 70, startRotate: -8, endX: 0, endY: 12, opacity: 1, gradientFrom: "rgb(36,48,173)", gradientTo: "rgb(92,105,247)", delay: 0.06 },
  { id: 3, startX: 90, startY: -50, startRotate: 20, endX: 0, endY: 0, opacity: 0, gradientFrom: "rgba(36,48,173,0.4)", gradientTo: "rgba(92,105,247,0.4)", delay: 0.02 },
  { id: 4, startX: -90, startY: 20, startRotate: -22, endX: 0, endY: 0, opacity: 0, gradientFrom: "rgba(36,48,173,0.3)", gradientTo: "rgba(92,105,247,0.3)", delay: 0.04 },
];

function FolderSVG({ gradientFrom, gradientTo, id }: { gradientFrom: string; gradientTo: string; id: string }) {
  return (
    <svg width="80" height="58" viewBox="0 0 496 357" fill="none">
      <defs>
        <linearGradient id={`fg-${id}`} x1="0.5" x2="0.5" y1="0" y2="1">
          <stop offset="0" stopColor={gradientFrom} />
          <stop offset="1" stopColor={gradientTo} />
        </linearGradient>
      </defs>
      <path
        d="M0 32C0 14.3 14.3 0 32 0h183.2c6.6 0 12.9 2.7 17.5 7.6l26.6 28.3c3 3.2 7.2 5.1 11.7 5.1H464c17.7 0 32 14.3 32 32v252c0 17.7-14.3 32-32 32H32C14.3 357 0 342.7 0 325V32z"
        fill={`url(#fg-${id})`}
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="1"
      />
    </svg>
  );
}

function PauseBars() {
  return (
    <svg width="12" height="14" viewBox="0 0 12 14" fill="none" style={{ position: "absolute", left: "50%", top: "56%", transform: "translate(-50%, -50%)" }}>
      <rect x="0" y="0" width="3.5" height="14" rx="1.5" fill="white" />
      <rect x="8" y="0" width="3.5" height="14" rx="1.5" fill="white" />
    </svg>
  );
}

export function Preloader({ children }: { children: React.ReactNode }) {
  const [show, setShow] = React.useState(false);
  const [phase, setPhase] = React.useState<"scatter" | "converge" | "hold" | "done">("scatter");

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SESSION_KEY)) {
      setPhase("done");
      return;
    }
    setShow(true);
    const t1 = setTimeout(() => setPhase("converge"), 80);
    const t2 = setTimeout(() => setPhase("hold"), 850);
    const t3 = setTimeout(() => {
      setPhase("done");
      sessionStorage.setItem(SESSION_KEY, "1");
    }, 1200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  if (phase === "done" && !show) return <>{children}</>;

  return (
    <>
      <AnimatePresence mode="wait">
        {phase !== "done" && (
          <motion.div
            key="preloader"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            onAnimationComplete={() => { if (phase === "done") setShow(false); }}
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
            <div style={{ position: "relative", width: 100, height: 80 }}>
              {FOLDERS.map((f) => {
                const isScatter = phase === "scatter";
                const isExtra = f.id >= 3;
                const converged = phase === "converge" || phase === "hold";

                return (
                  <motion.div
                    key={f.id}
                    initial={{
                      x: f.startX,
                      y: f.startY,
                      rotate: f.startRotate,
                      scale: 0.55,
                      opacity: 0.35,
                    }}
                    animate={{
                      x: isScatter ? f.startX : f.endX,
                      y: isScatter ? f.startY : f.endY,
                      rotate: isScatter ? f.startRotate : 0,
                      scale: converged ? (isExtra ? 0.3 : 1) : 0.55,
                      opacity: converged ? f.opacity : 0.35,
                    }}
                    transition={{ ...SPRING, delay: f.delay }}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      zIndex: f.id,
                      willChange: "transform, opacity",
                    }}
                  >
                    <FolderSVG
                      gradientFrom={f.gradientFrom}
                      gradientTo={f.gradientTo}
                      id={`${f.id}`}
                    />
                  </motion.div>
                );
              })}

              {/* Pause bars appear after convergence */}
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{
                  opacity: phase === "converge" || phase === "hold" ? 1 : 0,
                  scale: phase === "converge" || phase === "hold" ? 1 : 0.5,
                }}
                transition={{ ...SPRING, delay: 0.2 }}
                style={{ position: "relative", zIndex: 10 }}
              >
                <PauseBars />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* App content renders underneath and shows when preloader exits */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === "done" ? 1 : 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </>
  );
}
