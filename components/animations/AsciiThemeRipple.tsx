"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AsciiThemeRippleProps {
  isDark: boolean;
  onToggle: () => void;
  className?: string;
}

export function AsciiThemeRipple({ isDark, onToggle, className = "" }: AsciiThemeRippleProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleToggle = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    
    // Switch theme at 350ms — snappy!
    setTimeout(() => onToggle(), 350);
    setTimeout(() => setIsAnimating(false), 750);
  }, [isAnimating, onToggle]);

  // When animating, we show the INVERSE of current theme
  // because we're transitioning TO the opposite theme
  const showAsLight = isDark; // Currently dark, transitioning to light

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={handleToggle}
        disabled={isAnimating}
        className="relative z-50 p-2 rounded-none border border-border-primary bg-bg-secondary hover:bg-bg-tertiary transition-colors font-mono text-sm text-text-secondary disabled:opacity-50 flex items-center gap-2 h-9 px-3 w-full"
      >
        <span className="text-base">{isDark ? "☀" : "☾"}</span>
        <span className="text-sm">{isDark ? "Light mode" : "Dark mode"}</span>
      </button>

      <AnimatePresence>
        {isAnimating && (
          <>
            {/* Full screen background - inverts during transition */}
            <motion.div
              className="fixed inset-0 pointer-events-none z-[9996]"
              style={{ backgroundColor: showAsLight ? "white" : "black" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 1, 0] }}
              transition={{ duration: 0.75, times: [0, 0.2, 0.8, 1] }}
            />

            {/* 8 wave rows — performant! */}
            {Array.from({ length: 8 }).map((_, i) => (
              <motion.div
                key={i}
                className="fixed left-0 right-0 pointer-events-none z-[9998] font-mono text-xs overflow-hidden"
                style={{ top: `${i * 12.5}%`, height: "12.5%" }}
                initial={{ x: "-100%", opacity: 0 }}
                animate={{ x: "0%", opacity: [0, 1, 0] }}
                transition={{
                  duration: 0.5,
                  delay: i * 0.03,
                  opacity: { duration: 0.5, times: [0, 0.5, 1] },
                  ease: "easeOut",
                }}
              >
                <div className="flex justify-around items-center h-full opacity-60">
                  {"01▪◾01▪◾01▪◾01▪◾".split("").map((char, j) => (
                    <span key={j} style={{ color: showAsLight ? "black" : "white" }}>
                      {char}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
            
            {/* Quick flash overlay */}
            <motion.div
              className="fixed inset-0 pointer-events-none z-[9997]"
              style={{ backgroundColor: showAsLight ? "rgba(255,200,100,0.1)" : "rgba(100,150,255,0.1)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 0.3 }}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
