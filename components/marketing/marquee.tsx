"use client";

import * as React from "react";

const ITEMS = [
  "references", "palette", "brief", "moodboard", "type system",
  "color tokens", "inspiration", "design system", "handoff", "project brief",
  "visual research", "brand identity", "art direction", "creative direction",
];

// Dot separator between items
function Dot() {
  return (
    <span className="mx-5 inline-block h-1 w-1 shrink-0 rounded-full bg-[#2430AD] align-middle opacity-60" />
  );
}

export function Marquee() {
  // Duplicate for seamless loop
  const items = [...ITEMS, ...ITEMS];

  return (
    <div className="relative overflow-hidden border-y border-white/[0.06] bg-[#111111] py-4">
      {/* Left fade */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#111111] to-transparent" />
      {/* Right fade */}
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#111111] to-transparent" />

      <div className="flex w-max animate-marquee items-center whitespace-nowrap">
        {items.map((item, i) => (
          <React.Fragment key={i}>
            <span className="text-[12px] font-mono font-light uppercase tracking-[0.18em] text-neutral-500">
              {item}
            </span>
            <Dot />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
