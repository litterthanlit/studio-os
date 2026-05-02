import React from "react";
import { LogoMark } from "./logo-mark";

export function ExportCta() {
  return (
    <section id="export" className="w-full bg-[#4B57DB] py-[120px] px-5 md:px-[80px] relative overflow-hidden min-h-[600px] border-b border-[#0C0C14]/20 flex justify-center scroll-mt-[72px]">
      
      {/* Background Graphic */}
      <h2 className="absolute -bottom-10 -right-10 font-['Noto_Serif'] text-white/[0.08] text-[120px] leading-none whitespace-nowrap pointer-events-none z-0">
        Now you can.
      </h2>

      <div className="w-full max-w-[1440px] mx-auto flex flex-col md:flex-row justify-between relative z-10 w-full h-full min-h-[400px]">
        {/* Left Column */}
        <div className="w-full md:w-1/2 flex flex-col justify-between z-10 relative">
          <h2 className="font-['Noto_Serif'] text-white text-[42px] leading-tight max-w-[400px]">
            From sketch to source.<br/>Effortlessly.
          </h2>

          <div className="flex items-center gap-4 mt-[100px] md:mt-0 pb-10 md:pb-0">
            <LogoMark variant="onAccent" />
            <span className="studio-os-wordmark text-lg text-white">studio OS</span>
          </div>
        </div>

        {/* Right Column (Code Editor Mockup) */}
        <div className="w-full md:w-1/2 flex items-center justify-end z-10 relative pt-10 md:pt-0">
           <div className="relative w-full max-w-[500px]">
             {/* Code Editor */}
             <div className="w-full bg-[#0C0C14] rounded-lg shadow-2xl overflow-hidden border border-white/10 flex flex-col">
               <div className="h-8 border-b border-white/10 flex items-center px-4 gap-2 bg-[#1A1A1A]">
                 <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                 <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                 <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                 <div className="ml-4 font-mono text-[10px] text-white/40">page.tsx</div>
               </div>
               <div className="relative">
                 <div className="p-4 pb-[clamp(2.75rem,8vw,3.75rem)] font-mono text-[11px] text-white/80 leading-relaxed overflow-x-auto">
  <pre className="text-[#FF7A59]">
  <span className="text-[#4B57DB]">import</span> React <span className="text-[#4B57DB]">from</span> <span className="text-[#D1E4FC]">&quot;react&quot;</span>;
  <br/>
  <span className="text-[#4B57DB]">export default function</span> <span className="text-[#FFB267]">GeneratedView</span>() {"{"}<br/>
  {"  "}<span className="text-[#4B57DB]">return</span> (<br/>
  {"    "}&lt;<span className="text-[#FF7A59]">div</span> <span className="text-[#D1E4FC]">className</span>=<span className="text-[#D1E4FC]">&quot;w-full min-h-screen bg-[#FAFAFA]&quot;</span>&gt;<br/>
  {"      "}&lt;<span className="text-[#FF7A59]">nav</span> <span className="text-[#D1E4FC]">className</span>=<span className="text-[#D1E4FC]">&quot;flex justify-between items-center p-6&quot;</span>&gt;<br/>
  {"        "}&lt;<span className="text-[#FF7A59]">div</span> <span className="text-[#D1E4FC]">className</span>=<span className="text-[#D1E4FC]">&quot;text-lg font-bold&quot;</span>&gt;studio OS&lt;/<span className="text-[#FF7A59]">div</span>&gt;<br/>
  {"        "}&lt;<span className="text-[#FF7A59]">button</span> <span className="text-[#D1E4FC]">className</span>=<span className="text-[#D1E4FC]">&quot;bg-[#4B57DB] text-white text-sm font-medium px-4 py-2 rounded-[4px]&quot;</span>&gt;Join waitlist&lt;/<span className="text-[#FF7A59]">button</span>&gt;<br/>
  {"      "}&lt;/<span className="text-[#FF7A59]">nav</span>&gt;<br/>
  {"    "}&lt;/<span className="text-[#FF7A59]">div</span>&gt;<br/>
  {"  "});<br/>
  {"}"}
  </pre>
                 </div>
                 <button
                   type="button"
                   className="pointer-events-auto absolute z-10 bg-[#FF7A59] text-white font-sans font-semibold shadow-sm hover:bg-[#e86a4d] transition-colors
                     bottom-[clamp(0.5rem,2.2vw,0.875rem)] right-[clamp(0.5rem,2.2vw,0.875rem)]
                     px-[clamp(0.5rem,2vw,1rem)] py-[clamp(0.25rem,0.9vw,0.375rem)]
                     text-[clamp(0.5625rem,1.75vw,0.75rem)]
                     rounded-[clamp(3px,0.4vw,6px)]"
                 >
                   Export to Code
                 </button>
               </div>
             </div>

             {/* Helper Annotation */}
             <div className="absolute -bottom-6 right-0 font-sans text-xs text-white/70">
               1-click deployment. Zero translation errors.
             </div>
           </div>
        </div>
      </div>

    </section>
  );
}
