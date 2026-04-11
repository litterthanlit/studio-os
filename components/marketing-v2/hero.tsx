import React from "react";

export function Hero() {
  return (
    <section className="relative w-full bg-[#0C0C14] pt-32 pb-16 flex flex-col justify-between overflow-hidden min-h-[90vh]" style={{
      backgroundImage: 'radial-gradient(circle at center, rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
      backgroundSize: '20px 20px'
    }}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px] w-full max-w-[1440px] px-5 md:px-[80px] mx-auto z-10 flex-grow pt-10">
        {/* Left Column */}
        <div className="flex flex-col justify-center items-start pr-10">
          <h1 className="font-['Noto_Serif'] text-white text-[42px] leading-[1.1] tracking-tight mb-6 max-w-[400px]">
            The Design OS, Integrated.
          </h1>
          <p className="font-sans text-white/60 text-[18px] mb-10 max-w-[400px]">
            A high-end design environment built for speed, predictability, and AI-native workflows.
          </p>
          <button className="bg-[#4B57DB] text-white font-sans text-sm font-medium px-6 py-3 rounded-[4px] hover:bg-[#4B57DB]/90 transition-colors">
            Join waitlist
          </button>
        </div>

        {/* Right Column (Mockup) */}
        <div className="relative flex items-center justify-center pt-10 md:pt-0">
          <div className="relative w-full aspect-[4/3] bg-white border border-[#2A2A2A] rounded-t-xl rounded-bl-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col">
            {/* Window Chrome */}
            <div className="h-10 border-b border-[#2A2A2A] flex items-center px-4 gap-2 bg-[#1C1C1C]">
              <div className="w-2.5 h-2.5 rounded-full bg-[#FF7A59]/50" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#FFB267]/50" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#4B57DB]/50" />
            </div>
            
            {/* Mockup Canvas */}
            <div className="flex-grow flex relative">
              {/* Sidebar tree */}
              <div className="w-[180px] border-r border-[#2A2A2A] p-4 font-mono text-[10px] text-white/50 flex flex-col gap-2 bg-[#1C1C1C]">
                <div className="text-white/80 font-sans text-xs font-semibold mb-2 uppercase tracking-wide">Layers</div>
                <div className="flex items-center gap-2"><span className="text-white/30">▼</span> AppRouter</div>
                <div className="flex items-center gap-2 pl-4"><span className="text-white/30">▼</span> MarketingPage</div>
                <div className="flex items-center gap-2 pl-8 text-[#4B57DB] font-medium">HeroSection</div>
                <div className="flex items-center gap-2 pl-8">FeatureRow</div>
                <div className="flex items-center gap-2 pl-8">Footer</div>
              </div>
              
              {/* Canvas surface */}
              <div className="flex-grow bg-[#FAFAFA] p-6 flex relative items-center justify-center overflow-hidden" style={{
                backgroundImage: 'radial-gradient(circle at center, rgba(12, 12, 20, 0.05) 1px, transparent 1px)',
                backgroundSize: '10px 10px'
              }}>
                {/* Selected Node */}
                <div className="w-48 h-32 border border-[#4B57DB] bg-white flex flex-col items-center justify-center relative shadow-sm">
                  <div className="absolute -top-6 left-[-1px] bg-[#4B57DB] text-white text-[9px] font-mono px-2 py-0.5 rounded-t-[2px]">
                    HeroSection
                  </div>
                  <div className="w-3/4 h-2 bg-[#0C0C14]/10 rounded-full mb-3" />
                  <div className="w-1/2 h-2 bg-[#0C0C14]/10 rounded-full mb-6" />
                  <div className="w-1/3 h-6 bg-[#4B57DB]/10 rounded-[2px]" />
                  
                  {/* Resize handles */}
                  <div className="w-1.5 h-1.5 bg-white border border-[#4B57DB] absolute -top-[3px] -left-[3px] rounded-[1px]" />
                  <div className="w-1.5 h-1.5 bg-white border border-[#4B57DB] absolute -top-[3px] -right-[3px] rounded-[1px]" />
                  <div className="w-1.5 h-1.5 bg-white border border-[#4B57DB] absolute -bottom-[3px] -left-[3px] rounded-[1px]" />
                  <div className="w-1.5 h-1.5 bg-white border border-[#4B57DB] absolute -bottom-[3px] -right-[3px] rounded-[1px]" />
                </div>
              </div>
              
              {/* Floating Inspector Panel */}
              <div className="absolute right-4 top-4 w-[200px] bg-white/90 border border-[#0C0C14]/10 rounded-[6px] shadow-xl p-4 flex flex-col gap-4 font-sans backdrop-blur-md">
                <div className="text-[#0C0C14] text-xs font-semibold uppercase tracking-wide border-b border-[#0C0C14]/10 pb-2">Properties</div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-[#0C0C14]/60">Width</span>
                  <span className="text-[#0C0C14] font-mono bg-[#0C0C14]/5 px-1 rounded">100%</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-[#0C0C14]/60">Height</span>
                  <span className="text-[#0C0C14] font-mono bg-[#0C0C14]/5 px-1 rounded">100vh</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-[#0C0C14]/60">Fill</span>
                  <span className="flex items-center gap-2 text-[#0C0C14] font-mono">
                    <div className="w-3 h-3 rounded-[2px] bg-[#0C0C14] border border-[#0C0C14]/20" />
                    #0C0C14
                  </span>
                </div>
              </div>
            </div>
            
            {/* Color System Band */}
            <div className="h-8 border-t border-[#2A2A2A] bg-[#1C1C1C] flex items-center px-4 gap-4 font-mono text-[9px] text-white/50">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-[2px] bg-[#FAFAFA]" />#FAFAFA</div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-[2px] bg-[#0C0C14] border border-white/20" />#0C0C14</div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-[2px] bg-[#4B57DB]" />#4B57DB</div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-[2px] bg-[#D1E4FC]" />#D1E4FC</div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-[2px] bg-[#FFB267]" />#FFB267</div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-[2px] bg-[#FF7A59]" />#FF7A59</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
