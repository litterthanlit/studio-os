"use client";

type BreakpointBadgeProps = {
  breakpoint: string;
  width: number;
};

export function BreakpointBadge({ breakpoint, width }: BreakpointBadgeProps) {
  return (
    <div
      className="px-4 py-1.5 border-b border-[#E5E5E0] dark:border-[#333333] font-mono text-[10px] uppercase tracking-[0.1em] text-[#4B57DB] bg-[rgba(209,228,252,0.1)] dark:bg-[rgba(75,87,219,0.1)]"
      style={{
        fontFamily: "'IBM Plex Mono', monospace",
      }}
    >
      {breakpoint.toUpperCase()} &middot; {width}PX
    </div>
  );
}
