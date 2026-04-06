import React from "react";

export function Cta() {
  return (
    <section className="w-full bg-[#4B57DB] py-[100px] px-5 md:px-[60px] flex flex-col items-start justify-center">
      <h2 className="font-['Noto_Serif'] text-white text-[48px] md:text-[64px] leading-[1.1] mb-10 max-w-[800px]">
        Deploy studio OS.<br />Build with structure.
      </h2>
      <button className="bg-[#0C0C14] text-white font-sans text-[15px] font-medium px-8 py-4 rounded-[4px] hover:bg-[#0C0C14]/90 transition-colors shadow-lg">
        Get studio OS.
      </button>
    </section>
  );
}
