export function SectionRule({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="flex-1 h-px bg-[#E5E5E0]" />
      <span className="font-mono text-[10px] uppercase tracking-[1px] text-[#A0A0A0] whitespace-nowrap">{label}</span>
      <div className="flex-1 h-px bg-[#E5E5E0]" />
    </div>
  );
}
