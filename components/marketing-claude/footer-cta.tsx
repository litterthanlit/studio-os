"use client";

export function FooterCta() {
  return (
    <section className="py-[200px] px-10 text-center relative">
      {/* Decorative vertical bars */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[200px] h-10 opacity-[0.06]"
        style={{
          background:
            "repeating-linear-gradient(90deg, #4B57DB 0px, #4B57DB 3px, transparent 3px, transparent 5px)",
          maskImage: "linear-gradient(to top, black, transparent)",
          WebkitMaskImage: "linear-gradient(to top, black, transparent)",
        }}
      />

      <h2
        className="text-[clamp(40px,6vw,72px)] font-medium tracking-[-0.03em] leading-[1.0] mb-5 text-balance"
        data-reveal
      >
        Your taste.
        <br />
        <span className="text-[#4B57DB] italic">Amplified.</span>
      </h2>
      <p
        className="text-[16px] text-[#6B6B6B] font-medium mb-9 max-w-[440px] mx-auto text-balance"
        data-reveal
      >
        Stop settling for generic AI output. Design with a tool that actually
        gets it.
      </p>
      <button
        className="text-[13px] font-medium text-white bg-[#1A1A1A] px-6 py-[11px] rounded-[4px] border-none cursor-pointer no-underline transition-all duration-150 tracking-[-0.01em] hover:bg-[#333] hover:scale-[1.02] active:scale-[0.97]"
        data-reveal
      >
        Start designing
      </button>
    </section>
  );
}
