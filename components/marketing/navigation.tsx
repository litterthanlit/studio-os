"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { springs } from "@/lib/animations";

export function MarketingNav() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springs.smooth}
      className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-[#111111]/80 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-[64px] max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <motion.div
            whileHover={{ y: -2, rotate: -4, scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Studio OS" className="w-16 h-16 rounded-[10px]" />
          </motion.div>
          <span className="text-[15px] font-semibold tracking-tight text-white">
            Studio OS
          </span>
        </Link>

        {/* Right side: Nav + separator + CTAs */}
        <div className="flex items-center gap-6">
          {/* Nav Links */}
          <nav className="hidden items-center gap-7 md:flex">
            {[
              { label: "Features", href: "#features" },
              { label: "Resources", href: "#resources" },
              { label: "Customers", href: "#customers" },
              { label: "Pricing", href: "#pricing" },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-[13.5px] font-normal text-neutral-400 transition-colors hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Separator */}
          <div className="hidden h-5 w-px bg-white/10 md:block" />

          {/* CTAs */}
          <div className="flex items-center gap-3">
            <a
              href="/login"
              className="text-[13.5px] font-normal text-neutral-400 transition-colors hover:text-white"
            >
              Log in
            </a>
            <motion.a
              href="#waitlist"
              className="flex items-center justify-center rounded-md border border-white/20 bg-white px-4 py-1.5 text-[13.5px] font-medium text-black transition-all hover:bg-white/90"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={springs.snappy}
            >
              Sign up
            </motion.a>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
