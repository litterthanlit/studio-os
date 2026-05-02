import React from "react";

export function LogoMark({
  className = "",
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "onAccent";
}) {
  return (
    <div className={`inline-flex shrink-0 items-center ${className}`}>
      <img
        src="/studio-os-mark.svg"
        alt=""
        width={127}
        height={83}
        className={`h-[26px] w-auto max-w-none object-contain object-left ${
          variant === "onAccent" ? "brightness-0 invert" : ""
        }`}
      />
    </div>
  );
}
