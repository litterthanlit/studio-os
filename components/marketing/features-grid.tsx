"use client";

import * as React from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { springs } from "@/lib/animations";

const ARROW_PATH =
  "M 86 10 C 86 -0.221 87.684 0.001 96 0 L 198.517 0 C 206.915 0 208.346 -0.031 208.346 10 C 208.346 20.031 208.346 160.5 208.346 160.5 L 274.309 160.669 C 287.962 160.669 295.343 176.668 286.481 187.054 L 157.762 337.902 C 151.387 345.372 139.851 345.39 133.453 337.941 L 3.893 187.093 C -5.018 176.718 2.354 160.669 16.031 160.669 L 86 160.669 C 86 160.669 86 20.222 86 10 Z";

// ── FIG 0.1 — inline animated SVG ─────────────────────────────────────────
// Arrow drops on hover only. Blue → pink gradient crossfade as it falls.
// Eyes blink independently on a timer.
// Folder panels lift in staggered spring on hover (like nav logo).
function Fig01Animated() {
  const [hovered, setHovered] = React.useState(false);

  const dropSpring = { type: "spring", stiffness: 260, damping: 16 } as const;
  const returnSpring = { type: "spring", stiffness: 380, damping: 22 } as const;
  const folderSpring = { type: "spring", stiffness: 420, damping: 18 } as const;

  // Blink — both eyes, slight offset for organic feel
  const blinkBase = {
    duration: 0.26,
    times: [0, 0.25, 0.5, 0.75, 1] as number[],
    repeat: Infinity,
    repeatDelay: 3.4,
    ease: "easeInOut" as const,
  };

  return (
    <div
      className="h-full w-full"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <svg
        viewBox="0 0 496 492.5"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full object-contain"
      >
        <defs>
          {/* Folder panels */}
          <linearGradient id="f1-p1" x1="0.498" x2="0.502" y1="0" y2="1">
            <stop offset="0" stopColor="rgba(103,146,240,0.6)" />
            <stop offset="1" stopColor="rgba(38,66,191,0.6)" />
          </linearGradient>
          <linearGradient id="f1-p2" x1="0.498" x2="0.502" y1="0" y2="1">
            <stop offset="0" stopColor="rgba(103,146,240,0.8)" />
            <stop offset="1" stopColor="rgba(38,66,191,0.8)" />
          </linearGradient>
          <linearGradient id="f1-p3" x1="0.498" x2="0.502" y1="0" y2="1">
            <stop offset="0" stopColor="rgb(103,147,240)" />
            <stop offset="1" stopColor="rgb(38,66,192)" />
          </linearGradient>
          {/* Arrow — blue (entry) */}
          <linearGradient id="f1-arr-blue" x1="0.498" x2="0.502" y1="0" y2="1">
            <stop offset="0" stopColor="#638EED" />
            <stop offset="1" stopColor="#2430AD" />
          </linearGradient>
          {/* Arrow — pink (landed) */}
          <linearGradient id="f1-arr-pink" x1="0.498" x2="0.502" y1="0" y2="1">
            <stop offset="0" stopColor="#FA399D" />
            <stop offset="1" stopColor="#FF99DF" />
          </linearGradient>
        </defs>

        {/* ── Folder body — 3 panels, stagger-lift on hover ── */}
        <g transform="translate(0 218)">
          {/* Panel 1 — back, lifts first */}
          <motion.g
            animate={{ y: hovered ? -5 : 0 }}
            transition={hovered
              ? { ...folderSpring, delay: 0 }
              : { ...folderSpring, delay: 0 }}
          >
            <path
              d="M 48 32 C 48 14.327 62.327 0 80 0 L 419 0 C 436.673 0 451 14.327 451 32 L 451 122 C 451 139.673 436.673 154 419 154 L 80 154 C 62.327 154 48 139.673 48 122 Z"
              fill="url(#f1-p1)" strokeWidth="0.5" stroke="rgba(255,255,255,0.58)"
            />
          </motion.g>
          {/* Panel 2 — middle */}
          <motion.g
            animate={{ y: hovered ? -9 : 0 }}
            transition={hovered
              ? { ...folderSpring, delay: 0.07 }
              : { ...folderSpring, delay: 0.03 }}
          >
            <path
              d="M 20 71 C 20 53.327 34.327 39 52 39 L 444 39 C 461.673 39 476 53.327 476 71 L 476 181 C 476 198.673 461.673 213 444 213 L 52 213 C 34.327 213 20 198.673 20 181 Z"
              fill="url(#f1-p2)" strokeWidth="0.5" stroke="rgba(255,255,255,0.58)"
            />
          </motion.g>
          {/* Panel 3 — front, lifts most. Eyes nested here so they travel with it. */}
          <motion.g
            animate={{ y: hovered ? -14 : 0 }}
            transition={hovered
              ? { ...folderSpring, delay: 0.14 }
              : { ...folderSpring, delay: 0.06 }}
          >
            <path
              d="M 0 109 C 0 91.327 14.327 77 32 77 L 129.43 77 C 136.741 77 143.653 80.332 148.206 86.051 L 198.696 149.466 C 201.731 153.279 206.339 155.5 211.213 155.5 L 284.787 155.5 C 289.661 155.5 294.269 153.279 297.304 149.466 L 347.794 86.051 C 352.347 80.332 359.259 77 366.57 77 L 464 77 C 481.673 77 496 91.327 496 109 L 496 242.5 C 496 260.173 481.673 274.5 464 274.5 L 32 274.5 C 14.327 274.5 0 260.173 0 242.5 Z"
              fill="url(#f1-p3)" strokeWidth="0.5" stroke="rgba(255,255,255,0.58)"
            />
            {/* Eyes — y offset adjusted for translate(0 218) parent: 407.693 - 218 = 189.693 */}
            <g transform="translate(48 189.693)">
              <motion.line
                x1="0" y1="0" x2="0.095" y2="46.817"
                strokeWidth="25" stroke="white" strokeLinecap="round"
                style={{ transformBox: "fill-box", transformOrigin: "center" }}
                animate={{ scaleY: [1, 1, 0.04, 1, 1] }}
                transition={blinkBase}
              />
              <motion.line
                x1="40.033" y1="0" x2="40.128" y2="46.817"
                strokeWidth="25" stroke="white" strokeLinecap="round"
                style={{ transformBox: "fill-box", transformOrigin: "center" }}
                animate={{ scaleY: [1, 1, 0.04, 1, 1] }}
                transition={{ ...blinkBase, delay: 0.05 }}
              />
            </g>
          </motion.g>
        </g>

        {/*
          Arrow — hover only, springs in from above.
          Outer <g> keeps SVG x-offset in SVG coordinate space.
          Inner <motion.g> only animates CSS y (px) so the coordinate systems don't fight.
          Two overlaid paths crossfade blue→pink as the arrow drops.
        */}
        <g transform="translate(105.154 0)">
          <motion.g
            animate={{ y: hovered ? 0 : -155 }}
            transition={hovered ? dropSpring : returnSpring}
          >
            {/* Arrow — fades in immediately on enter so it's visible the whole slide */}
            <motion.path
              d={ARROW_PATH}
              fill="url(#f1-arr-pink)"
              stroke="rgba(255,255,255,0.53)"
              initial={{ opacity: 0 }}
              animate={{ opacity: hovered ? 1 : 0 }}
              transition={
                hovered
                  ? { duration: 0.12 }   // appear fast → visible for the whole drop
                  : { duration: 0.18 }   // fade out slightly slower → clean exit
              }
            />
          </motion.g>
        </g>

      </svg>
    </div>
  );
}

// ── FIG 0.2 — shared bar constants (module-level, never re-created) ─────────
const BAR_TRACK =
  "M 0 20 C 0 8.954 8.954 0 20 0 L 27.487 0 C 38.532 0 47.487 8.954 47.487 20 L 47.487 185.902 C 47.487 196.947 38.532 205.902 27.487 205.902 L 20 205.902 C 8.954 205.902 0 196.947 0 185.902 Z";

// Capsule fill path with top cap at `sy`, bottom always at track-bottom y=205.902.
const makeFillPath = (sy: number) => {
  const h = (sy + 8.954).toFixed(3);
  return (
    `M 0 ${sy + 20} C 0 ${h} 8.954 ${sy} 20 ${sy} ` +
    `L 27.487 ${sy} C 38.532 ${sy} 47.487 ${h} 47.487 ${sy + 20} ` +
    `L 47.487 185.902 C 47.487 196.947 38.532 205.902 27.487 205.902 ` +
    `L 20 205.902 C 8.954 205.902 0 196.947 0 185.902 Z`
  );
};

// ── AnimatedBar — one numeric MotionValue drives the spring ─────────────────
// We animate `sy` (a single number) through a spring, then derive the SVG
// path string via useTransform. This avoids Framer Motion ever interpolating
// path *strings*, which is what caused the blinking in the previous approach.
function AnimatedBar({
  dx, fill, idleY, hoverY, hovered, delay,
}: {
  dx: number; fill: string; idleY: number; hoverY: number;
  hovered: boolean; delay: number;
}) {
  const BAR_SPRING = { type: "spring" as const, stiffness: 260, damping: 16 };
  const sy = useMotionValue(idleY);
  const d = useTransform(sy, makeFillPath);

  React.useEffect(() => {
    const controls = animate(sy, hovered ? hoverY : idleY, {
      ...BAR_SPRING,
      delay: hovered ? delay : delay * 0.3,
    });
    return () => controls.stop();
  }, [hovered]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <g transform={`translate(${dx} 0)`}>
      <path d={BAR_TRACK} fill="rgba(119,148,226,0.5)" />
      <motion.path d={d} fill={fill} />
    </g>
  );
}

// ── FIG 0.2 — equalizer bars ────────────────────────────────────────────────
function Fig02Animated() {
  const [hovered, setHovered] = React.useState(false);

  // idleY = fill top at rest (lower → taller bar). All hoverY < idleY → all rise.
  // Centering: folder is 496 wide → center=248. Bar span=359 → center=179.5.
  // Required translate-x = 248 − 179.5 = 68.5 ≈ 69.
  const bars = [
    { dx: 0,       fill: "url(#f2-b1)", idleY: 131, hoverY: 45,  delay: 0    },
    { dx: 83.577,  fill: "url(#f2-b2)", idleY: 61,  hoverY: 20,  delay: 0.06 },
    { dx: 155.757, fill: "url(#f2-b3)", idleY: 129, hoverY: 38,  delay: 0.12 },
    { dx: 239.333, fill: "url(#f2-b4)", idleY: 66,  hoverY: 15,  delay: 0.18 },
    { dx: 311.513, fill: "url(#f2-b5)", idleY: 34,  hoverY: 10,  delay: 0.24 },
  ];

  return (
    <div
      className="h-full w-full"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <svg
        viewBox="0 0 524 421"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full object-contain"
        style={{ overflow: "visible" }}
      >
        <defs>
          <linearGradient id="f2-folder-t" x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0" stopColor="rgb(99,141,236)" stopOpacity="0.6" />
            <stop offset="1" stopColor="rgba(92,105,247,0)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="f2-folder-s" x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0" stopColor="rgb(103,147,240)" />
            <stop offset="1" stopColor="rgb(38,66,192)" />
          </linearGradient>
          <linearGradient id="f2-b1" x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0" stopColor="rgb(255,255,255)" />
            <stop offset="1" stopColor="rgb(219,240,255)" />
          </linearGradient>
          <linearGradient id="f2-b2" x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0" stopColor="rgb(151,193,255)" />
            <stop offset="1" stopColor="rgb(173,203,255)" />
          </linearGradient>
          <linearGradient id="f2-b3" x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0" stopColor="rgb(255,255,255)" />
            <stop offset="1" stopColor="rgb(204,223,255)" />
          </linearGradient>
          <linearGradient id="f2-b4" x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0" stopColor="rgb(222,66,145)" />
            <stop offset="1" stopColor="rgb(215,67,191)" />
          </linearGradient>
          <linearGradient id="f2-b5" x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0" stopColor="rgb(153,194,255)" />
            <stop offset="1" stopColor="rgb(207,225,255)" />
          </linearGradient>
          {/* Folder body clip — in translate(28,64) local space */}
          <clipPath id="f2-folder-clip">
            <path d="M 0 32 C 0 14.327 14.327 0 32 0 L 215.167 0 C 221.801 0 228.139 2.746 232.676 7.586 L 259.259 35.943 C 262.284 39.169 266.509 41 270.932 41 L 464 41 C 481.673 41 496 55.327 496 73 L 496 325 C 496 342.673 481.673 357 464 357 L 32 357 C 14.327 357 0 342.673 0 325 Z" />
          </clipPath>
        </defs>

        {/* Back-back panel */}
        <path
          d="M 0 49 C 0 31.327 14.327 17 32 17 L 464 17 C 481.673 17 496 31.327 496 49 L 496 301 C 496 318.673 481.673 333 464 333 L 32 333 C 14.327 333 0 318.673 0 301 Z"
          fill="url(#f2-folder-t)"
        />
        {/* Back panel with tab */}
        <path
          d="M 0 32 C 0 14.327 14.327 0 32 0 L 215.167 0 C 221.801 0 228.139 2.746 232.676 7.586 L 259.259 35.943 C 262.284 39.169 266.509 41 270.932 41 L 464 41 C 481.673 41 496 55.327 496 73 L 496 325 C 496 342.673 481.673 357 464 357 L 32 357 C 14.327 357 0 342.673 0 325 Z"
          fill="url(#f2-folder-t)"
        />

        {/* Front folder group */}
        <g transform="translate(28 64)">
          {/* Folder body */}
          <path
            d="M 0 42 C 0 24.327 14.327 10 32 10 L 464 10 C 481.673 10 496 24.327 496 42 L 496 294 C 496 311.673 481.673 326 464 326 L 32 326 C 14.327 326 0 311.673 0 294 Z"
            fill="url(#f2-folder-s)" strokeWidth="0.5" stroke="rgba(255,255,255,0.35)"
          />
          <path
            d="M 0 32 C 0 14.327 14.327 0 32 0 L 215.167 0 C 221.801 0 228.139 2.746 232.676 7.586 L 259.259 35.943 C 262.284 39.169 266.509 41 270.932 41 L 464 41 C 481.673 41 496 55.327 496 73 L 496 325 C 496 342.673 481.673 357 464 357 L 32 357 C 14.327 357 0 342.673 0 325 Z"
            fill="url(#f2-folder-s)" strokeWidth="0.5" stroke="rgba(255,255,255,0.58)"
          />

          {/* Bars — clipped to folder body, centered horizontally */}
          <g clipPath="url(#f2-folder-clip)">
            <g transform="translate(69 95)">
              {bars.map((bar, i) => (
                <AnimatedBar key={i} {...bar} hovered={hovered} />
              ))}
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}

// ── Feature card spring configs ────────────────────────────────────────────
const spring = { type: "spring", stiffness: 340, damping: 22 };

const FEATURES = [
  {
    fig: "FIG 0.1",
    src: null,
    title: "Every reference, one place.",
    description:
      "Save images, links, and screenshots from anywhere. Auto-tagged by mood, color, and subject — so finding the right reference is instant.",
    idle:  { rotate: 0, y: 0, scale: 1 },
    hover: { rotate: 0, y: 0, scale: 1 },
  },
  {
    fig: "FIG 0.2",
    src: null,
    title: "Your design system, alive.",
    description:
      "Build your palette, type scale, and token library as the project evolves. Export a design-system.md your whole team can use.",
    idle:  { rotate: 0, y: 0, scale: 1 },
    hover: { rotate: 0, y: 0, scale: 1 },
  },
  {
    fig: "FIG 0.3",
    src: "/fig-0.3.svg",
    title: "Brief in seconds.",
    description:
      "AI reads your board and generates a structured creative brief — positioning, tone, constraints — so you spend less time writing and more time designing.",
    idle:  { y: 0, opacity: 1 },
    hover: { y: -10, opacity: 1, transition: { type: "spring", stiffness: 600, damping: 16 } },
  },
  {
    fig: "FIG 0.4",
    src: "/fig-0.4.svg",
    title: "A feed that gets your taste.",
    description:
      "Daily curated images scored by your aesthetic. Connect Are.na channels and Pinterest boards to make it entirely yours.",
    idle:  { rotate: 0, scale: 1 },
    hover: { rotate: -2.5, scale: 1.04, transition: { type: "spring", stiffness: 220, damping: 20 } },
  },
];

export function FeaturesGrid() {
  return (
    <section className="bg-[#FAFAFA] py-32">
      <div className="mx-auto max-w-7xl px-6">

        {/* Section headline */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={springs.smooth}
          className="mb-20 max-w-4xl"
        >
          <h2 className="text-4xl font-semibold leading-[1.15] tracking-tight sm:text-5xl">
            <span className="text-neutral-900">One workspace, every creative layer.</span>{" "}
            <span className="text-neutral-500">
              From raw reference to final handoff — Studio OS holds your entire
              process so nothing gets lost between tools.
            </span>
          </h2>
        </motion.div>

        {/* 2×2 card grid */}
        <div className="grid grid-cols-1 border border-neutral-200 sm:grid-cols-2">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.fig}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ ...springs.smooth, delay: i * 0.07 }}
              className={[
                "group flex flex-col bg-[#FAFAFA] p-10 transition-colors duration-300 hover:bg-white",
                i % 2 === 0 ? "sm:border-r border-neutral-200" : "",
                i >= 2 ? "border-t border-neutral-200" : "",
              ].join(" ")}
            >
              <span className="mb-8 font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-400">
                {feature.fig}
              </span>

              <div className="mb-8 flex h-52 items-center justify-center overflow-hidden">
                <motion.div
                  className="h-full w-full"
                  initial={feature.idle}
                  whileHover={feature.hover}
                  animate={feature.idle}
                  style={{ originX: "50%", originY: "60%" }}
                >
                  {feature.src === null ? (
                    feature.fig === "FIG 0.2" ? <Fig02Animated /> : <Fig01Animated />
                  ) : (
                    <img
                      src={feature.src}
                      alt={feature.title}
                      className="h-full w-full object-contain"
                      loading="lazy"
                    />
                  )}
                </motion.div>
              </div>

              <h3 className="mb-3 text-[17px] font-medium leading-snug text-neutral-900">
                {feature.title}
              </h3>
              <p className="text-sm font-light leading-relaxed text-neutral-500">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
