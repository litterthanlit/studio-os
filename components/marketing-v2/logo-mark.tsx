type LogoMarkProps = {
  className?: string;
  /** White mark for cobalt / accent backgrounds */
  variant?: "default" | "onAccent";
};

export function LogoMark({ className = "", variant = "default" }: LogoMarkProps) {
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
