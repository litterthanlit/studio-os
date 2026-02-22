"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { springs } from "@/lib/animations";

export function MarketingNav() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springs.smooth}
      className="fixed top-0 left-0 right-0 z-50 bg-transparent backdrop-blur-xl"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-text-primary" />
          <span className="text-sm font-medium tracking-tight text-text-primary">
            Studio OS
          </span>
        </Link>

        {/* Nav Links - Centered */}
        <nav className="hidden items-center gap-6 md:flex">
          {[
            { label: "Features", href: "#features" },
            { label: "Resources", href: "#resources" },
            { label: "Customers", href: "#customers" },
            { label: "Pricing", href: "#pricing" },
            { label: "Changelog", href: "#changelog" },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-sm font-light text-text-secondary transition-colors hover:text-text-primary"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* CTA */}
        <div className="flex items-center gap-4">
          <a
            href="/login"
            className="text-sm font-light text-text-secondary transition-colors hover:text-text-primary"
          >
            Log in
          </a>
          <motion.a
            href="#waitlist"
            className="flex items-center justify-center rounded-lg bg-text-primary px-4 py-2 text-sm font-medium text-bg-primary transition-colors hover:opacity-90"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={springs.snappy}
          >
            Get started
          </motion.a>
        </div>
      </div>
    </motion.header>
  );
}
