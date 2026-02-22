"use client";

// components/animations/AsciiThemeRipple.tsx
// Subtle ASCII rain effect with theme transition — Studio OS signature animation
// Optimized for 60fps with CSS animations and GPU acceleration

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AsciiThemeRippleProps {
  isDark: boolean;
  onToggle: () => void;
  className?: string;
}

const ASCII_CHARS = "·∴∵◦◌○◯◠◡▫▪▭▯▱◊◈▣▢";

interface RainDrop {
  id: number;
  x: number;
  char: string;
  delay: number;
  duration: number;
}

export function AsciiThemeRipple({ isDark, onToggle, className = "" }: AsciiThemeRippleProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [rainDrops, setRainDrops] = useState<RainDrop[]>([]);
  const [showOverlay, setShowOverlay] = useState(false);

  const generateRainDrops = useCallback(() => {
    const drops: RainDrop[] = [];
    const columns = Math.floor(window.innerWidth / 40);
    const totalDrops = Math.min(columns * 2, 60); // Cap at 60 max drops

    for (let i = 0; i < totalDrops; i++) {
      drops.push({
        id: i,
        x: (i % columns) * 40 + Math.random() * 20,
        char: ASCII_CHARS[Math.floor(Math.random() * ASCII_CHARS.length)],
        delay: Math.random() * 0.3,
        duration: 1.2 + Math.random() * 0.6, // 1.2-1.8s range
      });
    }
    return drops;
  }, []);

  const handleToggle = () => {
    if (isAnimating) return;

    setIsAnimating(true);
    setRainDrops(generateRainDrops());
    setShowOverlay(true);

    // Switch theme at 450ms (mid-animation)
    setTimeout(() => {
      onToggle();
    }, 450);

    // End animation
    setTimeout(() => {
      setIsAnimating(false);
      setShowOverlay(false);
      setRainDrops([]);
    }, 1800);
  };

  return (
    <>
      {/* Theme Toggle Button */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={isAnimating}
        className={`relative flex items-center gap-3 h-9 px-3 w-full text-text-tertiary hover:text-text-primary hover:bg-sidebar-hover transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        {isDark ? (
          <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        ) : (
          <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
        <span className="text-sm">{isDark ? "Light mode" : "Dark mode"}</span>
      </button>

      {/* CSS Keyframes for Rain Animation */}
      <style jsx global>{`
        @keyframes asciiFall {
          0% { opacity: 0; transform: translate3d(0, 0, 0); }
          10% { opacity: 1; }
          80% { opacity: 1; }
          100% { opacity: 0; transform: translate3d(0, 100vh, 0); }
        }
      `}</style>

      {/* Subtle ASCII Rain Overlay */}
      <AnimatePresence>
        {showOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden"
            style={{
              background: isDark
                ? "linear-gradient(to bottom, rgba(250,250,250,0.3), rgba(250,250,250,0.5))"
                : "linear-gradient(to bottom, rgba(10,10,10,0.3), rgba(10,10,10,0.5))"
            }}
          >
            {/* Rain drops - GPU accelerated with CSS animations */}
            {rainDrops.map((drop) => (
              <span
                key={drop.id}
                className="absolute font-mono text-[10px]"
                style={{
                  left: drop.x,
                  color: isDark ? "rgba(100,100,100,0.5)" : "rgba(150,150,150,0.5)",
                  willChange: "transform",
                  animation: `asciiFall ${drop.duration}s linear ${drop.delay}s forwards`,
                }}
              >
                {drop.char}
              </span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
