import React from "react";
import { LogoMark } from "./logo-mark";

export function Nav() {
  return (
    <nav className="w-full h-[80px] px-5 md:px-[60px] flex items-center justify-between z-50 bg-white/80 backdrop-blur-sm border-b border-[#0C0C14]/5 sticky top-0">
      <div className="flex items-center gap-3">
        <LogoMark />
        <span className="font-sans font-medium tracking-tight text-[#0C0C14] text-xl">studio OS</span>
      </div>

      <div className="flex items-center gap-8 font-sans text-sm font-medium text-[#0C0C14]/70">
        <a href="#" className="hover:text-[#0C0C14] transition-colors hidden md:block">Product</a>
        <a href="#" className="hover:text-[#0C0C14] transition-colors hidden md:block">Features</a>
        <a href="#" className="hover:text-[#0C0C14] transition-colors hidden md:block">Pricing</a>
        <a href="#" className="hover:text-[#0C0C14] transition-colors hidden md:block">Support</a>
        <button className="bg-[#4B57DB] text-white px-5 py-2.5 rounded-[4px] hover:bg-[#4B57DB]/90 transition-colors">
          Sign in
        </button>
      </div>
    </nav>
  );
}
