"use client";

import Link from "next/link";
import { motion, AnimatePresence, type Transition } from "framer-motion";
import { useState } from "react";
import { springs } from "@/lib/animations";

const NAV_ITEMS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

// ── Inline logo — 3 stacked folders, each lifts with staggered spring ──
function LogoMark() {
  const folderSpring: Transition = { type: "spring", stiffness: 420, damping: 18 };

  return (
    <motion.svg
      initial="idle"
      whileHover="hover"
      whileTap="tap"
      viewBox="0 0 585 451"
      width={40}
      height={31}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ overflow: "visible", display: "block" }}
    >
      <defs>
        <linearGradient id="nav-logo-g1" x1="0.498" x2="0.502" y1="0" y2="1">
          <stop offset="0" stopColor="rgba(36,48,173,0.6)" />
          <stop offset="1" stopColor="rgba(92,105,247,0.6)" />
        </linearGradient>
        <linearGradient id="nav-logo-g2" x1="0.498" x2="0.502" y1="0" y2="1">
          <stop offset="0" stopColor="rgba(36,48,173,0.8)" />
          <stop offset="1" stopColor="rgba(92,105,247,0.8)" />
        </linearGradient>
        <linearGradient id="nav-logo-g3" x1="0.498" x2="0.502" y1="0" y2="1">
          <stop offset="0" stopColor="rgb(36,48,173)" />
          <stop offset="1" stopColor="rgb(92,105,247)" />
        </linearGradient>
      </defs>

      {/* Folder 1 — back, lifts first */}
      <motion.g
        variants={{
          idle: { y: 0 },
          hover: { y: -5, transition: { ...folderSpring, delay: 0 } },
          tap:  { y: 3,  transition: { ...folderSpring, delay: 0 } },
        }}
      >
        <path
          d="M 89 32 C 89 14.327 103.327 0 121 0 L 304.167 0 C 310.801 0 317.139 2.746 321.676 7.586 L 348.259 35.943 C 351.284 39.169 355.509 41 359.932 41 L 553 41 C 570.673 41 585 55.327 585 73 L 585 325 C 585 342.673 570.673 357 553 357 L 121 357 C 103.327 357 89 342.673 89 325 Z"
          fill="url(#nav-logo-g1)"
          stroke="white"
          strokeWidth="1"
        />
      </motion.g>

      {/* Folder 2 — middle, lifts second */}
      <motion.g
        variants={{
          idle: { y: 0 },
          hover: { y: -9, transition: { ...folderSpring, delay: 0.07 } },
          tap:  { y: 3,  transition: { ...folderSpring, delay: 0.03 } },
        }}
      >
        <path
          d="M 51 81 C 51 63.327 65.327 49 83 49 L 266.167 49 C 272.801 49 279.139 51.746 283.676 56.586 L 310.259 84.943 C 313.284 88.169 317.509 90 321.932 90 L 515 90 C 532.673 90 547 104.327 547 122 L 547 374 C 547 391.673 532.673 406 515 406 L 83 406 C 65.327 406 51 391.673 51 374 Z"
          fill="url(#nav-logo-g2)"
          stroke="white"
          strokeWidth="1"
        />
      </motion.g>

      {/* Folder 3 — front + pill bars, lifts last and highest */}
      <motion.g
        variants={{
          idle: { y: 0 },
          hover: { y: -14, transition: { ...folderSpring, delay: 0.14 } },
          tap:  { y: 3,   transition: { ...folderSpring, delay: 0.06 } },
        }}
      >
        <path
          d="M 0 126 C 0 108.327 14.327 94 32 94 L 215.167 94 C 221.801 94 228.139 96.746 232.676 101.586 L 259.259 129.943 C 262.284 133.169 266.509 135 270.932 135 L 464 135 C 481.673 135 496 149.327 496 167 L 496 419 C 496 436.673 481.673 451 464 451 L 32 451 C 14.327 451 0 436.673 0 419 Z"
          fill="url(#nav-logo-g3)"
          stroke="white"
          strokeWidth="1"
        />
        {/* Pill bars inside front folder */}
        <path
          d="M 0 0 L 69.063 0 M 0 76.035 L 69.063 76.035"
          transform="translate(99.123 259.451) rotate(-90 34.5 38)"
          fill="transparent"
          strokeWidth="40"
          stroke="white"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </motion.g>
    </motion.svg>
  );
}

export function MarketingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springs.smooth}
        className="fixed top-0 left-0 right-0 z-50 border-b border-black/[0.06] bg-white backdrop-blur-2xl"
        style={{ overflow: "visible" }}
      >
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 md:px-6" style={{ overflow: "visible" }}>
          {/* Logo */}
          <Link href="/" className="flex items-center gap-[6px] shrink-0" style={{ overflow: "visible" }}>
            <div style={{ overflow: "visible", padding: "4px 2px 0" }}>
              <LogoMark />
            </div>
            <span
              className="text-[19px] md:text-[21px] font-semibold leading-none"
              style={{
                fontFamily: "var(--font-instrument-sans)",
                background: "linear-gradient(180deg, #2430AD 0%, #6E79F5 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              studio OS
            </span>
          </Link>

          {/* Desktop: Nav + separator + CTAs */}
          <div className="hidden md:flex items-center gap-6">
            <nav className="flex items-center gap-7">
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="text-[13.5px] font-normal text-neutral-500 transition-colors hover:text-neutral-900"
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="h-5 w-px bg-black/10" />
            <div className="flex items-center gap-3">
              <motion.a
                href="#waitlist"
                className="flex items-center justify-center rounded-full border border-neutral-900 bg-neutral-900 px-4 py-1.5 text-[13.5px] font-medium text-white transition-all hover:bg-neutral-700"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={springs.snappy}
              >
                Join waitlist
              </motion.a>
            </div>
          </div>

          {/* Mobile: Join waitlist + hamburger */}
          <div className="flex items-center gap-3 md:hidden">
            <a
              href="#waitlist"
              className="flex items-center justify-center rounded-full bg-neutral-900 px-4 py-1.5 text-[13px] font-medium text-white"
            >
              Join waitlist
            </a>
            <button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-700 hover:bg-neutral-100 transition-colors"
            >
              <motion.svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                className="h-5 w-5"
                animate={mobileOpen ? "open" : "closed"}
              >
                <motion.path
                  variants={{
                    closed: { d: "M4 6h16" },
                    open:   { d: "M5 19L19 5" },
                  }}
                  transition={{ duration: 0.22, ease: "easeInOut" }}
                />
                <motion.path
                  variants={{
                    closed: { d: "M4 12h16", opacity: 1 },
                    open:   { d: "M4 12h16", opacity: 0 },
                  }}
                  transition={{ duration: 0.15 }}
                />
                <motion.path
                  variants={{
                    closed: { d: "M4 18h16" },
                    open:   { d: "M5 5l14 14" },
                  }}
                  transition={{ duration: 0.22, ease: "easeInOut" }}
                />
              </motion.svg>
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/10 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            {/* Drawer */}
            <motion.div
              key="drawer"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="fixed left-0 right-0 top-[72px] z-40 border-b border-black/[0.06] bg-white/98 px-5 pb-5 pt-3 shadow-lg backdrop-blur-2xl md:hidden"
            >
              <nav className="flex flex-col gap-1">
                {NAV_ITEMS.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex h-11 items-center rounded-lg px-3 text-sm text-neutral-700 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
