"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import { springs, staggerContainer, staggerItem } from "@/lib/animations";

const ASCII_CHARS = [
  "■", "□", "▪", "▫", "●", "○", "◆", "◇", "△", "▽", "▲", "▼",
  "◁", "▷", "◀", "▶", "+", "×", "÷", "=", "~", "·", ":", ";",
  "/", "\\", "|", "-", "_", "#", "*", ".",
];
const CELL_SIZE = 18;
const FONT_SIZE = 9;
const REVEAL_RADIUS = 200;

export function Hero() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    if (!window.matchMedia("(hover: hover)").matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let cols = 0;
    let rows = 0;
    let grid: number[][] = [];
    let intensityGrid: number[][] = [];

    function buildGrid() {
      cols = Math.ceil(canvas.width / CELL_SIZE);
      rows = Math.ceil(canvas.height / CELL_SIZE);
      grid = Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () =>
          Math.floor(Math.random() * ASCII_CHARS.length)
        )
      );
      intensityGrid = Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => 0)
      );
    }

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      buildGrid();
    }

    resize();
    window.addEventListener("resize", resize);

    let mouseX = -1000;
    let mouseY = -1000;
    let lastTime = performance.now();
    let raf = 0;

    const DECAY_RATE = 0.04;

    function draw(currentTime: number) {
      raf = requestAnimationFrame(draw);
      const deltaTime = (currentTime - lastTime) / 16.67;
      lastTime = currentTime;

      const theme = getComputedStyle(document.documentElement);
      const asciiColor =
        theme.getPropertyValue("--text-tertiary").trim() ||
        "rgba(120,120,120,1)";

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${FONT_SIZE}px "Geist Mono", monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const x = col * CELL_SIZE + CELL_SIZE / 2;
          const y = row * CELL_SIZE + CELL_SIZE / 2;
          const dist = Math.sqrt((x - mouseX) ** 2 + (y - mouseY) ** 2);

          let targetIntensity = 0;
          if (dist < REVEAL_RADIUS) {
            const t = 1 - dist / REVEAL_RADIUS;
            targetIntensity = t * t * 0.22;
          }

          const currentIntensity = intensityGrid[row][col];
          if (targetIntensity > currentIntensity) {
            intensityGrid[row][col] = targetIntensity;
          } else {
            intensityGrid[row][col] = Math.max(
              0,
              currentIntensity - DECAY_RATE * deltaTime
            );
          }

          const intensity = intensityGrid[row][col];
          if (intensity > 0.01) {
            ctx.globalAlpha = intensity;
            ctx.fillStyle = asciiColor;
            ctx.fillText(ASCII_CHARS[grid[row][col]], x, y);
          }
        }
      }
      ctx.globalAlpha = 1;
    }

    function onMouseMove(e: MouseEvent) {
      mouseX = e.clientX;
      mouseY = e.clientY;
    }

    function onMouseLeave() {
      mouseX = -1000;
      mouseY = -1000;
    }

    window.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseleave", onMouseLeave);
    raf = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseleave", onMouseLeave);
      cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <section className="relative min-h-screen overflow-hidden bg-black pt-16">
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Base gradient */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% -20%, var(--accent-subtle), transparent)",
          }}
        />

        {/* Animated mesh gradient */}
        <motion.div
          className="absolute -left-1/4 -top-1/4 h-[150%] w-[150%]"
          animate={{
            background: [
              "radial-gradient(circle at 20% 30%, rgba(0,112,243,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(0,112,243,0.05) 0%, transparent 50%)",
              "radial-gradient(circle at 30% 40%, rgba(0,112,243,0.06) 0%, transparent 50%), radial-gradient(circle at 70% 60%, rgba(0,112,243,0.07) 0%, transparent 50%)",
              "radial-gradient(circle at 25% 35%, rgba(0,112,243,0.08) 0%, transparent 50%), radial-gradient(circle at 75% 65%, rgba(0,112,243,0.05) 0%, transparent 50%)",
            ],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
          }}
        />

        {/* Subtle dot pattern */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage:
              "radial-gradient(circle, var(--text-primary) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      {/* ASCII Background Canvas */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-0"
        aria-hidden
      />

      {/* Content */}
      <div
        className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl flex-col items-center justify-center px-6 py-24 text-center"
      >
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="flex max-w-4xl flex-col items-center"
        >
          {/* Badge */}
          <motion.div variants={staggerItem} className="mb-8">
            <span
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-light"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.1)',
                border: '0.5px solid rgba(255, 255, 255, 0.36)',
                color: 'rgba(255, 255, 255, 0.55)',
              }}
            >
              <span
                className="h-1.5 w-1.5"
                style={{ backgroundColor: 'rgba(41, 141, 255, 1)' }}
              />
              Now in early access
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={staggerItem}
            className="mb-6 text-4xl font-medium tracking-tight text-white sm:text-5xl md:text-6xl"
            style={{ letterSpacing: "-0.03em" }}
          >
            A design workspace
            <br />
            that thinks like you do
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            variants={staggerItem}
            className="mb-10 max-w-xl text-base font-extralight text-neutral-400 sm:text-lg"
          >
            AI-curated inspiration meets unified workspace. Organize references,
            export AI-readable specs, and ship faster than ever.
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={staggerItem}
            className="flex flex-col items-center gap-4 sm:flex-row"
          >
            <motion.a
              href="#waitlist"
              className="group flex h-12 items-center gap-2 bg-button-primary-bg px-6 text-sm font-medium text-button-primary-text transition-all hover:opacity-90"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              transition={springs.snappy}
            >
              Join waitlist
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </motion.a>

            <motion.button
              className="group flex h-12 items-center gap-2 border border-border-primary bg-transparent px-6 text-sm font-medium text-text-primary transition-all hover:border-border-hover hover:bg-bg-secondary"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              transition={springs.snappy}
            >
              <Play className="h-4 w-4" />
              View demo
            </motion.button>
          </motion.div>

          {/* Social Proof */}
          <motion.p
            variants={staggerItem}
            className="mt-8 text-xs font-extralight text-text-muted"
          >
            Join 2,000+ designers on the waitlist
          </motion.p>
        </motion.div>

        {/* Product Screenshot / Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springs.smooth, delay: 0.4 }}
          className="relative mt-16 w-full max-w-5xl"
        >
          {/* Browser chrome */}
          <div className="relative overflow-hidden border border-border-primary bg-bg-secondary shadow-2xl">
            {/* Browser header */}
            <div className="flex items-center gap-2 border-b border-border-subtle bg-bg-tertiary px-4 py-3">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 bg-border-hover" />
                <div className="h-3 w-3 bg-border-hover" />
                <div className="h-3 w-3 bg-border-hover" />
              </div>
              <div className="ml-4 flex-1">
                <div className="mx-auto max-w-md border border-border-subtle bg-bg-primary px-3 py-1 text-center text-xs text-text-muted">
                  studio-os.app/home
                </div>
              </div>
            </div>

            {/* App mockup content */}
            <div className="flex h-[400px] sm:h-[500px]">
              {/* Sidebar */}
              <div className="hidden w-64 border-r border-border-subtle bg-bg-tertiary p-4 sm:block">
                <div className="mb-4 h-8 w-24 bg-border-subtle" />
                <div className="space-y-2">
                  {[75, 60, 85, 70, 65].map((width, i) => (
                    <div
                      key={i}
                      className="h-8 bg-border-subtle/50"
                      style={{ width: `${width}%` }}
                    />
                  ))}
                </div>
              </div>

              {/* Main content */}
              <div className="flex-1 bg-bg-primary p-6">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                  <div className="h-8 w-48 bg-border-subtle" />
                  <div className="h-10 w-32 border border-border-subtle bg-bg-secondary" />
                </div>

                {/* Content grid */}
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="aspect-square border border-border-subtle bg-bg-tertiary"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Glow effect */}
          <div
            className="pointer-events-none absolute -inset-4 -z-10 opacity-50 blur-3xl"
            style={{
              background:
                "radial-gradient(ellipse at center, var(--accent-subtle) 0%, transparent 70%)",
            }}
          />
        </motion.div>
      </div>
    </section>
  );
}
