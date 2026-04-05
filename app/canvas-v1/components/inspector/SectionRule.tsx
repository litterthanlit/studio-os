"use client";

export function SectionRule({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-3 h-px bg-[#E0E0DC] dark:bg-[#333333]" />
      <span className="font-mono text-[10px] font-medium uppercase tracking-[1px] text-[#B0B0B0] dark:text-[#666666] shrink-0">
        {label}
      </span>
      <div className="flex-1 h-px bg-[#E0E0DC] dark:bg-[#333333]" />
    </div>
  );
}
