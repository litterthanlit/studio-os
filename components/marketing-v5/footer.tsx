import React from "react";
import { LogoMark } from "./logo-mark";

export function Footer() {
  return (
    <footer className="w-full bg-white relative pb-10">
       {/* Top Border line that over-extends */}
       <div className="absolute top-0 left-[-50px] right-[-50px] h-[1px] bg-[#0C0C14]/10" />
       
       <div className="w-full grid grid-cols-1 md:grid-cols-3 pt-6 px-5 md:px-[60px] pb-10 relative">
          
          {/* Vertical lines connecting the grid */}
          <div className="hidden md:block absolute top-0 bottom-0 left-[33.33%] w-[1px] bg-[#0C0C14]/10" />
          <div className="hidden md:block absolute top-0 bottom-0 left-[66.66%] w-[1px] bg-[#0C0C14]/10" />

          {/* Col 1 */}
          <div className="flex items-start gap-4 p-4 md:p-8 relative">
             {/* Crosshair top left */}
             <div className="absolute top-[-4px] left-[-4px] font-mono text-[8px] text-[#0C0C14]/30">+</div>
             <LogoMark />
             <span className="studio-os-wordmark text-lg text-[#0C0C14]">studio OS</span>
          </div>

          {/* Col 2 */}
          <div className="flex flex-col gap-2 p-4 md:p-8 font-sans text-sm text-[#0C0C14]/70">
             <div className="font-medium text-[#0C0C14] mb-2 text-xs uppercase tracking-wider">Links</div>
             <a href="#" className="hover:text-[#4B57DB] transition-colors">Features</a>
             <a href="#" className="hover:text-[#4B57DB] transition-colors">Pricing</a>
             <a href="#" className="hover:text-[#4B57DB] transition-colors">Support</a>
          </div>

          {/* Col 3 */}
          <div className="flex flex-col justify-between p-4 md:p-8 h-full">
            <div className="font-mono text-[10px] text-[#0C0C14]/50 leading-relaxed">
              Copyright © 2026 Studio OS.<br/>
              Ghost Blue (#D1E4FC)<br/>
              Deep Cobalt (#4B57DB)
            </div>
            
            <div className="font-['Noto_Serif'] text-[24px] text-[#0C0C14] mt-8 text-right w-full">
              Now you can.
            </div>
          </div>
       </div>

       {/* Bottom horizontal line */}
       <div className="w-full h-[1px] bg-[#0C0C14]/10 relative mt-4">
         {/* Crosshair bottom */}
         <div className="absolute top-[-4px] right-[60px] font-mono text-[8px] text-[#0C0C14]/30">+</div>
       </div>
    </footer>
  );
}
