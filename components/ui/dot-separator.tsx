export function DotSeparator({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-1 py-6 ${className ?? ""}`}>
      {Array.from({ length: 40 }).map((_, i) => (
        <span
          key={i}
          className="w-1 h-1 rounded-full"
          style={{ backgroundColor: "var(--dot-separator)" }}
        />
      ))}
    </div>
  );
}
