import { cn } from "@/lib/utils";

/**
 * Section header with the ASCII ■ dot marker aesthetic.
 * accent=true → blue accent colour (first label on a page).
 * accent=false (default) → muted #3a3a3a label.
 */
export function SectionLabel({
  children,
  accent = false,
  className,
}: {
  children: React.ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span
        className={cn(
          "text-[9px] leading-none",
          accent ? "text-accent/50" : "text-[#252525]"
        )}
      >
        ■
      </span>
      <span
        className={cn(
          "text-[10px] uppercase tracking-[0.18em] font-medium",
          accent ? "text-accent" : "text-[#3a3a3a]"
        )}
      >
        {children}
      </span>
    </div>
  );
}
