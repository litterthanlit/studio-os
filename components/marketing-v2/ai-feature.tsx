import React from "react";
import { LogoMark } from "./logo-mark";

export function AiFeature() {
  return (
    <section id="ai" className="w-full bg-[#0C0C14] py-[120px] px-5 md:px-[80px] flex justify-center min-h-[900px] border-t border-[#0C0C14]/10 overflow-hidden scroll-mt-[72px]">
      <div className="w-full max-w-[1440px] mx-auto relative flex flex-col justify-between h-full min-h-[900px]">
        {/* Header */}
        <div className="flex justify-start w-full z-20">
          <h2 className="font-['Noto_Serif'] text-white text-[32px] md:text-[56px] leading-tight">
            <span className="text-white">AI Co-creation.</span>
          </h2>
        </div>

        {/* Floating Annotations */}
        <div className="absolute top-[20%] right-[10%] hidden md:flex items-center z-20">
          <span className="font-mono text-[10px] text-[#FFB267] mr-2">Peach — Multi-artboard view</span>
          <div className="h-[0.5px] w-12 bg-[#FFB267]/70" />
          <div className="w-[3px] h-[3px] rounded-full bg-[#FFB267]" />
        </div>

        <div className="absolute top-[50%] left-[5%] hidden md:flex items-center z-20">
          <div className="w-[3px] h-[3px] rounded-full bg-white/50" />
          <div className="h-[0.5px] w-12 bg-white/30" />
          <span className="font-mono text-[10px] text-white/50 ml-2">spec.</span>
        </div>

        {/* Composite Mockups */}
        <div className="relative w-full max-w-[900px] mx-auto h-[500px] flex items-center justify-center mt-10 z-10">
          
          {/* Background artboard 1 */}
          <div className="absolute left-[10%] top-[20%] w-[280px] h-[350px] bg-[#1C1C1C] border border-[#2A2A2A] rounded-md shadow-lg flex flex-col opacity-60 transform -rotate-3 scale-95">
            <div className="h-6 border-b border-[#2A2A2A] flex items-center px-4">
               <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
            </div>
            <div className="p-4 flex-grow flex flex-col gap-2">
              <div className="w-full h-24 bg-white/5 rounded" />
              <div className="w-3/4 h-4 bg-white/5 rounded" />
              <div className="w-1/2 h-4 bg-white/5 rounded" />
            </div>
          </div>

          {/* Background artboard 2 (Peach suggested) */}
          <div className="absolute right-[15%] top-[10%] w-[280px] h-[350px] bg-[#FFB267]/5 border border-[#FFB267]/30 rounded-md shadow-xl flex flex-col opacity-80 transform rotate-3 scale-95">
            <div className="absolute -top-3 -right-3 bg-[#FFB267] text-[#0C0C14] text-[9px] font-mono px-2 py-0.5 rounded shadow">Suggestion</div>
            <div className="h-6 border-b border-[#FFB267]/20 flex items-center px-4" />
            <div className="p-4 flex-grow flex flex-col gap-2">
              <div className="w-full h-32 bg-[#FFB267]/10 rounded" />
              <div className="flex gap-2">
                 <div className="w-5 h-5 bg-[#FFB267]/20 rounded-full" />
                 <div className="w-3/4 h-4 bg-[#FFB267]/10 rounded mt-0.5" />
              </div>
              <div className="flex gap-2">
                 <div className="w-5 h-5 bg-[#FFB267]/20 rounded-full" />
                 <div className="w-2/3 h-4 bg-[#FFB267]/10 rounded mt-0.5" />
              </div>
            </div>
          </div>

          {/* Foreground Bar Chart Generator */}
          <div className="relative w-[320px] h-[220px] bg-[#1A1A1A] border border-[#4B57DB]/20 rounded-lg shadow-2xl z-20 flex flex-col items-center justify-center p-6 transform translate-y-4">
             <h3 className="font-sans text-white text-sm font-medium mb-6">Bar strip generation animation</h3>
             <div className="flex items-end justify-center w-full h-[80px] gap-2">
                <div className="w-[10%] bg-[#4B57DB] rounded-t-[2px] animate-[pulse_1.5s_infinite]" style={{ height: '40%' }} />
                <div className="w-[10%] bg-[#4B57DB] rounded-t-[2px] animate-[pulse_1.5s_infinite_0.1s]" style={{ height: '70%' }} />
                <div className="w-[10%] bg-[#4B57DB] rounded-t-[2px] animate-[pulse_1.5s_infinite_0.2s]" style={{ height: '30%' }} />
                <div className="w-[10%] bg-[#4B57DB] rounded-t-[2px] animate-[pulse_1.5s_infinite_0.3s]" style={{ height: '90%' }} />
                <div className="w-[10%] bg-[#4B57DB] rounded-t-[2px] animate-[pulse_1.5s_infinite_0.4s]" style={{ height: '50%' }} />
                <div className="w-[10%] bg-[#4B57DB] rounded-t-[2px] animate-[pulse_1.5s_infinite_0.5s]" style={{ height: '80%' }} />
                <div className="w-[10%] bg-[#4B57DB] rounded-t-[2px] animate-[pulse_1.5s_infinite_0.6s]" style={{ height: '60%' }} />
             </div>
          </div>

        </div>

        {/* Footer text & Logo */}
        <div className="flex justify-between items-end w-full mt-20 z-20">
          <LogoMark />
          <p className="font-sans text-white/70 text-right max-w-[300px] text-sm md:text-base leading-relaxed">
            Co-create with your logic. Sans-serif AI that learns your references. Then pushes them.
          </p>
        </div>
      </div>
    </section>
  );
}
