import React from "react";

export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col gap-[2px] ${className}`}>
      <div className="w-5 h-[3px] bg-[#4B57DB] rounded-[1px] opacity-100" />
      <div className="w-5 h-[3px] bg-[#4B57DB] rounded-[1px] opacity-80" />
      <div className="w-5 h-[3px] bg-[#4B57DB] rounded-[1px] opacity-60" />
      <div className="w-5 h-[3px] bg-[#4B57DB] rounded-[1px] opacity-40" />
      <div className="w-5 h-[3px] bg-[#4B57DB] rounded-[1px] opacity-20" />
    </div>
  );
}
