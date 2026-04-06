export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col gap-[3px] items-start ${className}`}>
      <div className="h-[4px] w-6 bg-[#4B57DB] rounded-full opacity-100" />
      <div className="h-[4px] w-8 bg-[#4B57DB] rounded-full opacity-[0.85]" />
      <div className="h-[4px] w-8 bg-[#4B57DB] rounded-full opacity-[0.70]" />
      <div className="h-[4px] w-8 bg-[#4B57DB] rounded-full opacity-[0.55]" />
      <div className="h-[4px] w-8 bg-[#4B57DB] rounded-full opacity-[0.40]" />
    </div>
  );
}
