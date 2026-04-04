"use client";

type BreakpointBadgeProps = {
  breakpoint: string;
  width: number;
};

export function BreakpointBadge({ breakpoint, width }: BreakpointBadgeProps) {
  return (
    <div
      className="px-4 py-1.5 border-b border-[#E5E5E0]"
      style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: "10px",
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        color: "#4B57DB",
        background: "rgba(209,228,252,0.1)",
      }}
    >
      {breakpoint.toUpperCase()} &middot; {width}PX
    </div>
  );
}
