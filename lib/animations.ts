// lib/animations.ts
// Animation presets and variants for Framer Motion

export const springs = {
  smooth: { type: "spring", stiffness: 300, damping: 30 },
  snappy: { type: "spring", stiffness: 400, damping: 25 },
  gentle: { type: "spring", stiffness: 200, damping: 20 },
  bouncy: { type: "spring", stiffness: 500, damping: 15 },
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
    transition: { type: "spring", stiffness: 300, damping: 30 }
  },
};

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
