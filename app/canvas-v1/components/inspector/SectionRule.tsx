"use client";

/**
 * SectionRule — Embedded rule header for inspector sections.
 *
 * Framer-style: 1px horizontal line with centered mono label.
 * Example: ──── SIZE ───────────────
 */

export function SectionRule({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 px-4">
      <div className="w-2 h-px bg-[#E5E5E0] dark:bg-[#333333]" />
      <span className="font-mono text-[10px] font-medium uppercase tracking-[1px] text-[#A0A0A0] dark:text-[#666666] shrink-0">
        {label}
      </span>
      <div className="flex-1 h-px bg-[#E5E5E0] dark:bg-[#333333]" />
    </div>
  );
}
