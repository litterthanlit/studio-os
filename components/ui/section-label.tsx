import { cn } from "@/lib/utils";

export function SectionLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-[8px] text-section-dot leading-none">■</span>
      <span className="font-mono text-[11px] uppercase tracking-[0.15em] font-medium text-section-label">
        {children}
      </span>
    </div>
  );
}
