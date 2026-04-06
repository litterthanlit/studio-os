import React from "react";
import { LogoMark } from "./logo-mark";

export function Footer() {
  return (
    <footer className="w-full bg-[#FAFAFA] px-5 md:px-[80px] py-[32px] flex justify-center border-t border-[#0C0C14]/5 text-[#0C0C14]/40 font-sans text-xs">
      <div className="w-full max-w-[1440px] mx-auto flex flex-col md:flex-row items-center justify-between">
        {/* Left */}
        <div className="flex items-center gap-3">
          <LogoMark className="scale-75 origin-left" />
          <span className="font-light tracking-wide text-[#0C0C14]/60">studio OS</span>
        </div>

        {/* Center Links */}
        <div className="flex items-center gap-6 mt-6 md:mt-0">
          <a href="#" className="hover:text-[#0C0C14] transition-colors">Twitter</a>
          <a href="#" className="hover:text-[#0C0C14] transition-colors">Changelog</a>
          <a href="#" className="hover:text-[#0C0C14] transition-colors">Manifesto</a>
          <a href="#" className="hover:text-[#0C0C14] transition-colors">Contact</a>
        </div>

        {/* Right */}
        <div className="mt-6 md:mt-0 font-mono text-[10px]">
          studio-os.io © 2026
        </div>
      </div>
    </footer>
  );
}
