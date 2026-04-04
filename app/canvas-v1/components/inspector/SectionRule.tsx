"use client";

export function SectionRule({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-3 h-px bg-[#EFEFEC]" />
      <span className="font-mono text-[10px] font-medium uppercase tracking-[1px] text-[#A0A0A0] shrink-0">
        {label}
      </span>
      <div className="flex-1 h-px bg-[#EFEFEC]" />
    </div>
  );
}
