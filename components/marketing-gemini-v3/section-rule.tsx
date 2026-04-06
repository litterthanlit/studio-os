"use client";

export function SectionRule({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="flex-1 h-px bg-[#EFEFEC]" />
      <span className="font-mono text-[10px] uppercase tracking-[1px] font-mono text-[#A0A0A0] whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-[#EFEFEC]" />
    </div>
  );
}
