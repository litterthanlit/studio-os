// lib/animations.ts
// Animation presets and variants for Framer Motion

export const springs = {
  smooth: { type: "tween", duration: 0.2, ease: "easeOut" } as const,
  snappy: { type: "tween", duration: 0.15, ease: "easeOut" } as const,
  gentle: { type: "tween", duration: 0.25, ease: "easeOut" } as const,
  bouncy: { type: "spring", stiffness: 400, damping: 30, duration: 0.25 } as const,
};

export const slideUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export const staggerContainer = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem = {
  initial: { opacity: 0, y: 10 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { type: "tween", duration: 0.2, ease: "easeOut" }
  },
} as const;

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};
