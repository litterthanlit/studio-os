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
      <span className="h-1.5 w-1.5 rounded-full bg-section-dot transition-colors duration-300" />
      <span className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-section-label transition-colors duration-300">
        {children}
      </span>
    </div>
  );
}
