"use client";

import * as React from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { springs, staggerContainer, staggerItem } from "@/lib/animations";

const ASCII_CHARS = [
  "■", "□", "▪", "▫", "●", "○", "◆", "◇", "△", "▽", "▲", "▼",
  "◁", "▷", "◀", "▶", "+", "×", "÷", "=", "~", "·", ":", ";",
  "/", "\\", "|", "-", "_", "#", "*", ".",
];
const CELL_SIZE = 18;
const FONT_SIZE = 9;
const REVEAL_RADIUS = 200;

// Rotating headline phrases
const HEADLINES = [
  "References, palette, brief.",
  "Moodboard, type, brief.",
  "Research, color, brief.",
  "Vision, system, brief.",
];

// On-brand canvas background — design grid aesthetic with brand blue depth
const MOCKUP_BG = `
  radial-gradient(ellipse 100% 60% at 50% 110%, rgba(36,48,173,0.22) 0%, transparent 55%),
  radial-gradient(ellipse 55% 45% at 5% 55%, rgba(92,105,247,0.12) 0%, transparent 55%),
  radial-gradient(ellipse 55% 45% at 95% 55%, rgba(36,48,173,0.1) 0%, transparent 55%),
  linear-gradient(160deg, #DDE1FA 0%, #CDD3F8 40%, #C2C9F6 70%, #B6BFF4 100%)
`;

export function Hero() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [headlineIndex, setHeadlineIndex] = React.useState(0);

  // Hero form state
  const [heroEmail, setHeroEmail] = React.useState("");
  const [heroState, setHeroState] = React.useState<"idle" | "loading" | "success" | "error">("idle");
  const [heroErrorMsg, setHeroErrorMsg] = React.useState("");

  async function handleHeroSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!heroEmail || heroState === "loading") return;
    setHeroState("loading");
    setHeroErrorMsg("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: heroEmail }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Something went wrong");
      }
      setHeroState("success");
    } catch (err) {
      setHeroErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setHeroState("error");
    }
  }

  // Cycle headline every 2.8s
  React.useEffect(() => {
    const interval = setInterval(() => {
      setHeadlineIndex((i) => (i + 1) % HEADLINES.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

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
      ctx.font = `${FONT_SIZE}px "IBM Plex Mono", monospace`;
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
    <section className="relative min-h-screen overflow-x-hidden bg-white pt-16">
      {/* ── Lummi hero image — atmospheric background, low opacity ── */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <Image
          src="/marketing/hero.webp"
          alt=""
          fill
          priority
          className="object-cover opacity-[0.04] mix-blend-multiply"
          sizes="100vw"
          onError={() => {/* silently skip if not yet generated */}}
        />
      </div>

      {/* ── Grain texture overlay ── */}
      <div
        className="pointer-events-none absolute inset-0 z-[1] opacity-[0.055]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "160px 160px",
        }}
      />

      {/* Animated Gradient Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% -20%, var(--accent-subtle), transparent)",
          }}
        />
        <motion.div
          className="absolute -left-1/4 -top-1/4 h-[150%] w-[150%]"
          animate={{
            background: [
              "radial-gradient(circle at 20% 30%, rgba(36, 48, 173,0.06) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(36, 48, 173,0.05) 0%, transparent 50%)",
              "radial-gradient(circle at 30% 40%, rgba(36, 48, 173,0.06) 0%, transparent 50%), radial-gradient(circle at 70% 60%, rgba(36, 48, 173,0.07) 0%, transparent 50%)",
              "radial-gradient(circle at 25% 35%, rgba(36, 48, 173,0.06) 0%, transparent 50%), radial-gradient(circle at 75% 65%, rgba(36, 48, 173,0.05) 0%, transparent 50%)",
            ],
          }}
          transition={{ duration: 8, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
        />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: "radial-gradient(circle, #000000 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      {/* ASCII Background Canvas */}
      <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-0" aria-hidden />

      {/* Content */}
      <div className="relative z-[2] mx-auto flex min-h-[calc(100svh-4rem)] max-w-7xl flex-col items-center justify-center px-5 py-20 md:py-24 text-center">
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="flex max-w-4xl flex-col items-center"
        >
          {/* ── Badge with pulse dot ── */}
          <motion.div variants={staggerItem} className="mb-8">
            <span
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-light"
              style={{
                backgroundColor: "rgba(0,0,0,0.05)",
                borderWidth: "0.5px",
                borderStyle: "solid",
                borderColor: "rgba(0,0,0,0.12)",
                color: "rgba(0,0,0,0.5)",
              }}
            >
              {/* Pulsing live dot */}
              <span className="relative flex h-1.5 w-1.5">
                <span
                  className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                  style={{ backgroundColor: "#2430AD" }}
                />
                <span
                  className="relative inline-flex h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: "#2430AD" }}
                />
              </span>
              Now building
            </span>
          </motion.div>

          {/* ── Rotating headline ── */}
          <motion.div variants={staggerItem} className="mb-6">
            <h1
              className="text-4xl font-medium tracking-tight text-neutral-900 sm:text-5xl md:text-6xl"
              style={{ letterSpacing: "-0.03em" }}
            >
              <AnimatePresence mode="wait">
                <motion.span
                  key={headlineIndex}
                  initial={{ opacity: 0, filter: "blur(8px)", y: 8 }}
                  animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                  exit={{ opacity: 0, filter: "blur(8px)", y: -8 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="block"
                >
                  {HEADLINES[headlineIndex]}
                </motion.span>
              </AnimatePresence>
              <span className="block mt-1">One place to work.</span>
            </h1>
          </motion.div>

          {/* Subheadline */}
          <motion.p
            variants={staggerItem}
            className="mb-10 max-w-xl text-base font-extralight text-neutral-500 sm:text-lg"
          >
            Studio OS connects your visual research, design system, and project
            context — so you can focus on the work, not the tooling.
          </motion.p>

          {/* ── Email CTA ── */}
          <motion.div variants={staggerItem} className="flex w-full max-w-[540px] flex-col items-center gap-4">
            <AnimatePresence mode="wait">
              {heroState === "success" ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 text-sm font-light text-neutral-700"
                >
                  <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 text-[#2430AD]">
                    <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  You&apos;re on the list — we&apos;ll be in touch.
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  onSubmit={handleHeroSubmit}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="w-full"
                >
                  {/* Neumorphic pill — matches reference */}
                  <div
                    className="flex items-center rounded-full bg-white p-2 pl-7 transition-shadow duration-200 focus-within:shadow-[0_12px_48px_rgba(0,0,0,0.18),0_2px_10px_rgba(0,0,0,0.08)]"
                    style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.13), 0 2px_8px rgba(0,0,0,0.07)" }}
                  >
                    <input
                      type="email"
                      value={heroEmail}
                      onChange={(e) => setHeroEmail(e.target.value)}
                      placeholder="Enter email"
                      required
                      disabled={heroState === "loading"}
                      className="flex-1 bg-transparent text-base text-neutral-900 placeholder:text-neutral-400 outline-none disabled:opacity-50"
                    />
                    <motion.button
                      type="submit"
                      disabled={heroState === "loading"}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className="flex h-[52px] w-[76px] shrink-0 items-center justify-center rounded-[999px] disabled:opacity-40"
                      style={{
                        background: "linear-gradient(175deg, #2D40D8 0%, #3D52EE 50%, #5468FF 100%)",
                        boxShadow: "0 1px 0 rgba(255,255,255,0.18) inset, 0 8px 24px rgba(45,64,216,0.5), 0 2px 6px rgba(45,64,216,0.3)",
                      }}
                      aria-label="Join waitlist"
                    >
                      {heroState === "loading" ? (
                        <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" className="h-[29px] w-[29px] text-white">
                          <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </motion.button>
                  </div>
                  {heroState === "error" && (
                    <p className="mt-2 text-center text-xs text-red-500">{heroErrorMsg}</p>
                  )}
                </motion.form>
              )}
            </AnimatePresence>
            <p className="text-xs font-extralight text-neutral-400">
              Free while we build · No credit card required
            </p>
          </motion.div>
        </motion.div>

        {/* ── Product Mockup — Cursor-style: natural size, clips right on mobile ── */}
        {/* Outer bleed wrapper: overflows right on mobile, clips cleanly */}
        <div className="relative mt-10 w-screen md:mt-16 md:w-full md:max-w-6xl" style={{ marginLeft: 0, marginRight: 0 }}>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springs.smooth, delay: 0.4 }}
          className="relative overflow-hidden rounded-2xl"
          style={{
            marginLeft: "clamp(16px, 4vw, 0px)",
            paddingTop: 56,
            paddingLeft: 40,
            paddingRight: 40,
            background: MOCKUP_BG,
          }}
        >
          {/* Subtle grid overlay — evokes design canvas */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: "linear-gradient(rgba(36,48,173,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(36,48,173,0.07) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          {/* Vignette fade at top */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-24"
            style={{ background: "linear-gradient(to bottom, rgba(221,225,250,0.6), transparent)" }}
          />
          {/* Right-side fade on mobile — softens the clip edge */}
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-16 md:hidden"
            style={{ background: "linear-gradient(to right, transparent, rgba(200,207,248,0.7))" }}
          />

          {/* Browser chrome — light theme, min-width keeps content from squishing */}
          <div className="relative overflow-hidden rounded-t-xl border-x border-t border-black/[0.08] shadow-[0_-8px_60px_rgba(36,48,173,0.18),0_-2px_20px_rgba(0,0,0,0.1)]" style={{ background: "#FFFFFF", minWidth: 640 }}>

            {/* Title bar */}
            <div className="flex items-center gap-2 border-b border-black/[0.07] px-4 py-2.5" style={{ background: "#F5F5F7" }}>
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-[#FF5F56]" />
                <div className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
                <div className="h-2.5 w-2.5 rounded-full bg-[#27C840]" />
              </div>
              <div className="ml-3 flex-1">
                <div className="mx-auto flex w-fit items-center gap-1.5 rounded border border-black/[0.08] bg-white px-3 py-0.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#2430AD]" />
                  <span className="font-mono text-[10px] text-neutral-400">studio-os.app/home</span>
                </div>
              </div>
            </div>

            {/* App layout — light theme */}
            <div className="flex" style={{ height: 520 }}>

              {/* Sidebar */}
              <div className="flex w-44 shrink-0 flex-col border-r border-black/[0.06]" style={{ background: "#FAFAFA" }}>
                {/* Logo row */}
                <div className="flex items-center gap-2 border-b border-black/[0.06] px-3 py-2.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-[5px] bg-[#2430AD]">
                    <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3">
                      <rect x="2" y="2" width="3.2" height="8" rx="1" fill="white"/>
                      <rect x="6.8" y="2" width="3.2" height="8" rx="1" fill="white"/>
                    </svg>
                  </div>
                  <span className="text-[11px] font-semibold text-neutral-800">Studio OS</span>
                </div>
                {/* Nav items */}
                <div className="flex-1 px-1.5 py-2 space-y-0.5">
                  {[
                    { label: "Home", active: true },
                    { label: "Projects", active: false },
                    { label: "Inspiration", active: false },
                    { label: "Flow", active: false },
                    { label: "Brief", active: false },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px]"
                      style={{
                        background: item.active ? "rgba(36,48,173,0.08)" : "transparent",
                        color: item.active ? "#2430AD" : "#888",
                      }}
                    >
                      <div className="h-1.5 w-1.5 rounded-full" style={{ background: item.active ? "#2430AD" : "#D4D4D4" }} />
                      {item.label}
                    </div>
                  ))}
                  {/* Projects list */}
                  <div className="mt-3 px-2 pb-1 text-[9px] font-medium uppercase tracking-[1px] text-neutral-400">Projects</div>
                  {[
                    { name: "Acme Rebrand", color: "#FF5533" },
                    { name: "Lumina App", color: "#7C3AED" },
                    { name: "Nox Identity", color: "#059669" },
                  ].map((p) => (
                    <div key={p.name} className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] text-neutral-500">
                      <div className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: p.color }} />
                      <span className="truncate">{p.name}</span>
                    </div>
                  ))}
                </div>
                {/* User row */}
                <div className="border-t border-black/[0.06] px-3 py-2 flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-gradient-to-br from-[#2430AD] to-[#5C69F7] flex items-center justify-center text-[8px] font-bold text-white">N</div>
                  <div>
                    <div className="text-[10px] font-medium text-neutral-700">Nick</div>
                    <div className="text-[9px] text-neutral-400">Free plan</div>
                  </div>
                </div>
              </div>

              {/* Main content */}
              <div className="flex-1 overflow-hidden" style={{ background: "#FFFFFF" }}>
                {/* Top bar */}
                <div className="flex items-center justify-between border-b border-black/[0.06] px-5 py-2" style={{ background: "#FAFAFA" }}>
                  <span className="text-[10px] text-neutral-400">home</span>
                  <div className="flex items-center gap-1.5 rounded-md bg-[#2430AD] px-2.5 py-1 text-[10px] font-medium text-white">
                    + New project
                  </div>
                </div>

                <div className="overflow-y-auto h-full px-5 py-5" style={{ scrollbarWidth: "none" }}>
                  {/* Greeting */}
                  <div className="mb-5 text-center">
                    <div className="text-lg font-light text-neutral-800">Good morning, Nick</div>
                  </div>

                  {/* Command bar */}
                  <div className="mb-5 flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 shadow-sm">
                    <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3 text-neutral-400 shrink-0">
                      <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1"/>
                      <path d="M8 8l2.5 2.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                    </svg>
                    <span className="flex-1 text-[11px] text-neutral-400">What are you working on today?</span>
                    <div className="flex items-center gap-0.5 rounded border border-neutral-200 px-1 py-0.5 text-[8px] text-neutral-400">⌘K</div>
                  </div>

                  <div className="mb-4 flex items-center gap-3">
                    <div className="h-px flex-1 bg-neutral-100" />
                    <div className="h-1 w-1 rounded-full bg-neutral-300" />
                    <div className="h-px flex-1 bg-neutral-100" />
                  </div>

                  {/* Recent projects */}
                  <div className="mb-5">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-[9px] font-medium uppercase tracking-[1px] text-neutral-400">Recent Projects</span>
                      <span className="text-[9px] text-neutral-400">View all →</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { name: "Acme Rebrand", phase: "Discovery", c1: "#FF5533", c2: "#FF8866", bg: "rgba(255,85,51,0.08)", text: "#CC3311", hover: true },
                        { name: "Lumina App",   phase: "Design",    c1: "#7C3AED", c2: "#A78BFA", bg: "rgba(124,58,237,0.08)", text: "#6D28D9", hover: false },
                        { name: "Nox Identity", phase: "Handoff",   c1: "#059669", c2: "#34D399", bg: "rgba(5,150,105,0.08)",  text: "#047857", hover: false },
                      ].map((p, i) => (
                        <div
                          key={i}
                          className="relative overflow-hidden rounded-xl border transition-all duration-300"
                          style={{
                            borderColor: p.hover ? "rgba(0,0,0,0.1)" : "rgba(0,0,0,0.06)",
                            background: "#FFFFFF",
                            transform: p.hover ? "translateY(-1px)" : "none",
                            boxShadow: p.hover ? `0 4px 16px rgba(0,0,0,0.08)` : "0 1px 4px rgba(0,0,0,0.04)",
                          }}
                        >
                          <div
                            className="aspect-[16/9] w-full"
                            style={{ background: `linear-gradient(135deg, ${p.c1}18 0%, ${p.c2}38 100%)` }}
                          >
                            <div className="h-full w-full" style={{ backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.04) 1px, transparent 1px)", backgroundSize: "10px 10px" }} />
                          </div>
                          <div className="flex flex-col gap-1 px-2 py-1.5 border-t border-black/[0.04]">
                            <span className="text-[10px] font-medium text-neutral-700 truncate">{p.name}</span>
                            <span className="self-start rounded px-1 py-0.5 text-[8px] font-semibold uppercase tracking-wider" style={{ background: p.bg, color: p.text }}>{p.phase}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mb-4 flex items-center gap-3">
                    <div className="h-px flex-1 bg-neutral-100" />
                    <div className="h-1 w-1 rounded-full bg-neutral-300" />
                    <div className="h-px flex-1 bg-neutral-100" />
                  </div>

                  {/* Inspiration */}
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-[9px] font-medium uppercase tracking-[1px] text-neutral-400">Daily Inspiration</span>
                      <span className="text-[9px] text-neutral-400">Abstract</span>
                    </div>
                    <div className="grid grid-cols-6 gap-1.5">
                      {[
                        { score: 97, color: "#F59E0B" }, { score: 94, color: "#2430AD" },
                        { score: 92, color: "#10B981" }, { score: 89, color: "#F43F5E" },
                        { score: 91, color: "#8B5CF6" }, { score: 88, color: "#06B6D4" },
                      ].map((item, i) => (
                        <div key={i} className="relative aspect-[3/4] overflow-hidden rounded-md border border-black/[0.04]">
                          <div
                            className="h-full w-full"
                            style={{ background: `linear-gradient(135deg, ${item.color}20 0%, ${item.color}45 100%)` }}
                          />
                          <div className="absolute right-1 top-1 rounded bg-white/80 px-1 py-0.5 font-mono text-[7px] text-neutral-600 shadow-sm">
                            {item.score}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
        </div>
      </div>
    </section>
  );
}
