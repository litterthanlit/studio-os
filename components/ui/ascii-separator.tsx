export function AsciiSeparator({ className }: { className?: string }) {
  const chars = "·∴∵◦◌○◯◠◡▫▪▭▯▱◊◈▣▢";
  const repeated = Array.from({ length: 60 }, (_, i) => chars[i % chars.length]).join("");
  
  return (
    <div className={`py-6 overflow-hidden ${className ?? ""}`}>
      <div 
        className="font-mono text-[10px] tracking-[0.3em] text-center whitespace-nowrap opacity-30"
        style={{ color: "var(--text-tertiary)" }}
      >
        {repeated}
      </div>
    </div>
  );
}
