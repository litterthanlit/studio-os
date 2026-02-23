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
    
    // Snappy theme switch at 350ms
    setTimeout(() => onToggle(), 350);
    setTimeout(() => setIsAnimating(false), 750);
  }, [isAnimating, onToggle]);

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
            {/* 8 wave rows - snappy! */}
            {Array.from({ length: 8 }).map((_, i) => (
              <motion.div
                key={i}
                className="fixed left-0 right-0 pointer-events-none z-40 font-mono text-xs overflow-hidden"
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
                <div className="flex justify-around items-center h-full opacity-40">
                  {"01▪◾01▪◾01▪◾01▪◾".split("").map((char, j) => (
                    <span key={j} className={isDark ? "text-white" : "text-black"}>
                      {char}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
            
            {/* Quick flash */}
            <motion.div
              className="fixed inset-0 pointer-events-none z-30"
              style={{ backgroundColor: isDark ? "rgba(255,200,100,0.05)" : "rgba(100,150,255,0.05)" }}
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
