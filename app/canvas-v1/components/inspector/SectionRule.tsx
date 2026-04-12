"use client";

/**
 * Section heading for inspector blocks — Framer-like: label only, no rule chrome.
 */

export function SectionRule({ label }: { label: string }) {
  return (
    <div className="px-4">
      <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
        {label}
      </span>
    </div>
  );
}
