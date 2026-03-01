"use client";

import Link from "next/link";
import Image from "next/image";
import { Twitter, Github } from "lucide-react";

export function MarketingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden bg-[#F5F5F5]">

      {/* ── Large faded wordmark watermark ── */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-12 select-none text-center font-bold leading-none text-neutral-900"
        style={{
          fontSize: "clamp(36px, 18vw, 260px)",
          opacity: 0.028,
          letterSpacing: "-0.04em",
          userSelect: "none",
        }}
        aria-hidden
      >
        Studio OS
      </div>

      <div className="relative mx-auto max-w-7xl px-6">

        {/* ── Top zone: CTA ── */}
        <div className="flex flex-col items-start pt-16 pb-12">
          <div className="mb-3 font-mono text-[11px] text-neutral-400">
            Free while we build
          </div>
          <a
            href="#waitlist"
            className="group inline-flex items-center gap-2 rounded-full border border-neutral-900 bg-neutral-900 px-5 py-2 text-sm text-white transition-all hover:bg-neutral-700"
          >
            Join waitlist
            <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
              <path d="M2 10L10 2M10 2H4M10 2v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
        </div>

        {/* ── Hairline divider ── */}
        <div className="h-px w-full bg-neutral-200" />

        {/* ── Bottom bar ── */}
        <div className="flex flex-col items-start justify-between gap-4 py-6 sm:flex-row sm:items-center">

          {/* Logo + copyright */}
          <div className="flex items-center gap-3">
            <Image
              src="/logo-icon.svg"
              alt="Studio OS"
              width={24}
              height={24}
              className="opacity-70"
            />
            <span className="font-mono text-xs text-neutral-400">
              © {currentYear} Studio OS. All rights reserved.
            </span>
          </div>

          {/* Center links */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-6">
            {[
              { label: "Terms", href: "#" },
              { label: "Privacy", href: "/privacy" },
              { label: "hello@studio-os.app", href: "mailto:hello@studio-os.app" },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="font-mono text-xs text-neutral-400 transition-colors hover:text-neutral-700"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Social icons */}
          <div className="flex items-center gap-3">
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-400 transition-colors hover:text-neutral-700"
              aria-label="Twitter"
            >
              <Twitter className="h-3.5 w-3.5" />
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-400 transition-colors hover:text-neutral-700"
              aria-label="GitHub"
            >
              <Github className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
