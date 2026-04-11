import React from "react";
import { LogoMark } from "./logo-mark";

export function SplitFeature() {
  return (
    <section id="workflow" className="relative w-full overflow-hidden min-h-[600px] border-y border-[#0C0C14]/10 flex scroll-mt-[72px]">
      {/* Full-bleed split backgrounds */}
      <div className="absolute inset-0 flex flex-col md:flex-row pointer-events-none">
        <div className="w-full md:w-1/2 bg-[#4B57DB]" />
        <div className="w-full md:w-1/2 bg-[#D1E4FC]" style={{
          backgroundImage: 'linear-gradient(to right, rgba(75, 87, 219, 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(75, 87, 219, 0.1) 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }} />
      </div>

      <div className="w-full max-w-[1440px] mx-auto px-5 md:px-[80px] relative z-10 flex flex-col md:flex-row pointer-events-auto">
        {/* Left Half Content */}
        <div className="w-full md:w-1/2 py-10 md:py-[80px] md:pr-10 flex flex-col justify-between">
          <div className="pt-10">
            <h2 className="font-['Noto_Serif'] text-white text-[32px] md:text-[42px] leading-tight mb-10 max-w-[300px]">
              Precision<br/>meets<br/>intuition.
            </h2>
          </div>
          
          <div className="flex flex-col gap-6 mt-[60px]">
            <div className="flex items-center gap-4">
              <LogoMark variant="onAccent" />
              <span className="font-sans font-light tracking-wide text-white text-lg">studio OS</span>
            </div>
            <div className="font-mono text-white/50 text-xs mt-10">
              Deep Cobalt (#4B57DB) /<br/>
              Ghost Blue (#D1E4FC)
            </div>
          </div>
        </div>

        {/* Right Half Content */}
        <div className="w-full md:w-1/2 py-10 md:py-[80px] md:pl-10 relative">
          <h2 className="font-['Noto_Serif'] text-[#0C0C14] text-[32px] md:text-[42px] leading-tight mb-[40px] relative z-10">
            Structural Metronome.
          </h2>

          {/* Mockup with annotations */}
          <div className="relative w-full max-w-[400px] mt-[60px] z-10 bg-[#FAFAFA] border border-[#0C0C14]/10 shadow-xl ml-auto md:ml-0 font-sans text-sm">
            {/* Header */}
            <div className="flex justify-between items-center px-4 py-2 border-b border-[#0C0C14]/10 text-xs uppercase tracking-wider font-semibold text-[#0C0C14]/60">
              <span>Design</span>
              <span>GSS</span>
              <span>Export</span>
            </div>
            <div className="p-4 border-b border-[#0C0C14]/10 font-medium text-xs text-[#0C0C14]/40 uppercase">Inspector</div>
            
            <div className="p-4 flex flex-col gap-4 relative">
               <div className="flex justify-between items-center text-xs">
                 <span className="text-[#0C0C14]/70">W: 100%</span>
                 <span className="text-[#0C0C14]/70">H: Auto</span>
               </div>
               <div className="grid grid-cols-2 gap-2 text-xs">
                 <div className="bg-[#0C0C14]/5 px-2 py-1.5 rounded-[2px] flex justify-between"><span>L:</span><span className="font-mono">12</span></div>
                 <div className="bg-[#0C0C14]/5 px-2 py-1.5 rounded-[2px] flex justify-between"><span>R:</span><span className="font-mono">12</span></div>
                 <div className="bg-[#0C0C14]/5 px-2 py-1.5 rounded-[2px] flex justify-between"><span>T:</span><span className="font-mono">24</span></div>
                 <div className="bg-[#0C0C14]/5 px-2 py-1.5 rounded-[2px] flex justify-between"><span>B:</span><span className="font-mono">24</span></div>
               </div>
            </div>

            {/* Leader Lines and Annotations overlay */}
            <div className="absolute top-1/2 -left-32 w-20 hidden lg:flex items-center justify-end">
              <span className="font-mono text-[10px] text-[#4B57DB] mr-2">Row height: 28px</span>
              <div className="h-[0.5px] w-8 bg-[#4B57DB]/50" />
              <div className="w-[3px] h-[3px] rounded-full bg-[#4B57DB]" />
            </div>

            <div className="absolute top-[20%] -left-[140px] w-32 hidden lg:flex items-center justify-end">
              <span className="font-mono text-[10px] text-[#4B57DB] mr-2">Borders: 0.5px</span>
              <div className="h-[0.5px] w-6 bg-[#4B57DB]/50" />
              <div className="w-[3px] h-[3px] rounded-full bg-[#4B57DB]" />
            </div>

            <div className="absolute bottom-[20%] -left-24 w-20 hidden lg:flex items-center justify-end">
              <span className="font-mono text-[10px] text-[#4B57DB] mr-2">Indent: 14px</span>
              <div className="h-[0.5px] w-12 bg-[#4B57DB]/50" />
              <div className="w-[3px] h-[3px] rounded-full bg-[#4B57DB]" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
