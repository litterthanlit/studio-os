import React from "react";

export const metadata = {
  title: "Gemini V2 - The Integrated Workspace",
};

export default function GeminiV2Page() {
  return (
    <div 
      className="min-h-screen bg-[#cacaca] relative overflow-x-hidden flex flex-col items-center py-20 pb-40 font-sans selection:bg-[#4B57DB] selection:text-white"
      style={{
        backgroundImage: `
          linear-gradient(to right, rgba(0,0,0,0.03) 1px, transparent 1px), 
          linear-gradient(to bottom, rgba(0,0,0,0.03) 1px, transparent 1px),
          url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.08'/%3E%3C/svg%3E")
        `,
        backgroundSize: '100px 100px, 100px 100px, auto'
      }}
    >
      {/* Grid Coordinates Overlay */}
      <div className="absolute top-4 left-4 font-mono text-[10px] text-black/30 tracking-widest uppercase">X: 0 / Y: 0 / Z: BASE</div>
      <div className="absolute bottom-4 left-4 font-mono text-[10px] text-black/30 tracking-widest uppercase">SCALE 1:1</div>

      {/* Conceptual L-Square Ruler */}
      <div className="absolute top-[5%] right-[5%] z-0 mix-blend-multiply opacity-50 drop-shadow-xl pointer-events-none">
        <div className="w-[400px] h-[40px] bg-gradient-to-b from-[#e0e0e0] to-[#b8b8b8] border border-white/60 flex items-end px-4 gap-[2px]">
          {[...Array(80)].map((_, i) => (
            <div key={i} className={`bg-black/30 w-[1px] ${i % 10 === 0 ? 'h-3' : 'h-1.5'}`} />
          ))}
        </div>
        <div className="w-[40px] h-[300px] bg-gradient-to-l from-[#e0e0e0] to-[#b8b8b8] border border-white/60 flex flex-col items-start py-4 gap-[2px]">
          {[...Array(60)].map((_, i) => (
            <div key={i} className={`bg-black/30 h-[1px] ${i % 10 === 0 ? 'w-3' : 'w-1.5'}`} />
          ))}
        </div>
      </div>

      {/* Scattered Conceptual Pencil */}
      <div className="absolute bottom-[20%] right-[10%] z-0 rotate-[-15deg] mix-blend-multiply drop-shadow-2xl pointer-events-none opacity-80">
        <div className="w-[180px] h-[8px] bg-[#222] rounded-r-md flex items-center justify-end relative">
          <div className="w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-r-[20px] border-r-[#d2b48c] absolute -left-[20px]" />
          <div className="w-[4px] h-[4px] bg-[#333] rounded-full absolute -left-[20px]" />
          <div className="text-[5px] text-white/50 font-mono absolute left-4">HB  GRAPHITE</div>
        </div>
      </div>

      {/* Top Center Brand */}
      <div className="z-10 flex flex-col items-center mb-16 text-center shadow-sm p-8 bg-white/20 backdrop-blur-sm border border-white/40 rounded-xl relative">
        <div className="absolute -top-3 -left-3 border-t border-l border-black/20 w-4 h-4" />
        <div className="absolute -top-3 -right-3 border-t border-r border-black/20 w-4 h-4" />
        <div className="absolute -bottom-3 -left-3 border-b border-l border-black/20 w-4 h-4" />
        <div className="absolute -bottom-3 -right-3 border-b border-r border-black/20 w-4 h-4" />

        <div className="flex flex-col gap-[3px] items-center mb-6">
          <div className="h-[4px] w-[50px] bg-[#4B57DB] rounded-[2px] opacity-100" />
          <div className="h-[4px] w-[60px] bg-[#4B57DB] rounded-[2px] opacity-80" />
          <div className="h-[4px] w-[70px] bg-[#4B57DB] rounded-[2px] opacity-60" />
          <div className="h-[4px] w-[60px] bg-[#4B57DB] rounded-[2px] opacity-40" />
        </div>
        <div className="studio-os-wordmark mb-4 text-[18px] text-[#0C0C14]">studio OS</div>
        <h1 className="font-['Noto_Serif'] text-[56px] text-[#0C0C14] leading-tight font-medium">The Integrated Workspace.</h1>
      </div>

      {/* Main Presentation Layout Container */}
      <div className="relative w-full max-w-[1500px] flex gap-10 items-center justify-center z-20">
        
        {/* Left Side Cards */}
        <div className="flex flex-col gap-10 w-[260px]">
          {/* Card 1: Metronome */}
          <div className="bg-[#D1E4FC] w-full aspect-square rounded p-6 flex flex-col justify-between shadow-[10px_20px_30px_rgba(0,0,0,0.15)] border border-[#0C0C14]/5 relative transform -rotate-1 hover:rotate-0 transition-transform bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTAgMjBWMGgyMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMykiIHN0cm9rZS13aWR0aD0iMSIvPjwvc3ZnPg==')]">
            <h3 className="font-['Noto_Serif'] text-[#0C0C14] text-xl leading-snug w-[90%]">A Metronome for Layout.</h3>
            <div className="font-mono text-[#4B57DB] text-[10px] flex flex-col gap-2">
              <div className="bg-white/50 p-2 border border-[#4B57DB]/20">
                Grid: 20px<br/>
                Gap: 1px<br/>
                Radius: 1px
              </div>
              <div className="p-2 border border-[#4B57DB]/10">
                #EFEFEC / #E5E5E0 / #4B57DB
              </div>
            </div>
            <div className="text-[10px] font-sans text-black/60 uppercase tracking-widest mt-4">System Spec</div>
          </div>
          {/* Card 2: Immutable Logic */}
          <div className="bg-[#0C0C14] w-full aspect-square rounded p-6 flex flex-col justify-between shadow-[10px_20px_30px_rgba(0,0,0,0.25)] border border-white/5 relative transform rotate-1 hover:rotate-0 transition-transform">
            <h3 className="font-['Noto_Serif'] text-white text-xl leading-snug w-[90%]">Immutable Logic.</h3>
            <div className="flex-grow flex items-center justify-center">
              <div className="border border-[#4B57DB] bg-[#4B57DB]/10 text-[#4B57DB] px-3 py-1 font-mono text-[10px] rounded flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-[#4B57DB] rounded-full animate-pulse" />
                DesignNode
              </div>
            </div>
            <div className="text-[10px] font-mono text-[#D1E4FC] mt-4">Status: Predicted</div>
          </div>
        </div>

        {/* Central App UI Mockup */}
        <div className="w-[900px] h-[600px] bg-white rounded-md shadow-[0_30px_60px_rgba(0,0,0,0.2)] border border-[#0C0C14]/20 flex flex-col overflow-hidden relative">
          
          {/* Top Chrome */}
          <div className="h-[44px] bg-white border-b border-[#0C0C14]/10 flex items-center justify-between px-4 z-20">
            <div className="flex items-center gap-3">
              <div className="flex flex-col gap-[1px]">
                 <div className="h-[2px] w-4 bg-[#4B57DB] rounded opacity-100" />
                 <div className="h-[2px] w-5 bg-[#4B57DB] rounded opacity-80" />
                 <div className="h-[2px] w-6 bg-[#4B57DB] rounded opacity-60" />
              </div>
              <span className="studio-os-wordmark text-sm text-[#0C0C14]">studio OS</span>
            </div>
            <div className="flex gap-8 font-sans text-[11px] text-[#0C0C14]/60">
              <span className="text-[#0C0C14] font-semibold border-b border-[#0C0C14] pb-1">Workspace</span>
              <span>References</span>
              <span>Layers</span>
              <span>Collaborate</span>
            </div>
            <div className="flex gap-2">
              <div className="bg-[#4B57DB] text-white px-3 py-1.5 text-[10px] font-medium rounded-[3px]">Share</div>
              <div className="bg-[#0C0C14] text-white px-3 py-1.5 text-[10px] font-medium rounded-[3px]">Export</div>
            </div>
          </div>

          <div className="flex flex-grow relative overflow-hidden">
             {/* Left Panel (Dark Theme #1A1A1A) */}
             <div className="w-[200px] bg-[#1A1A1A] border-r border-[#0C0C14] flex flex-col p-4 shrink-0 z-10 shadow-xl">
               <div className="font-mono text-[9px] text-white/50 mb-3 tracking-[0.2em]">REFERENCES</div>
               <div className="w-full aspect-video border border-[#4B57DB] bg-[#FAFAF8]/10 rounded mb-6 flex flex-col items-center justify-center relative group p-2">
                  <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#FF7A59]" />
                  <div className="w-full h-1/2 bg-white/20 rounded-sm mb-1" />
                  <div className="w-[80%] h-1/3 bg-[#4B57DB]/40 rounded-sm" />
               </div>
               
               <div className="font-mono text-[9px] text-white/50 mb-3 tracking-[0.2em]">LAYERS</div>
               <div className="flex flex-col gap-1 font-mono text-[10px]">
                 <div className="text-[#4B57DB] bg-[#4B57DB]/10 px-2 py-1.5 rounded-[3px] border border-[#4B57DB]/20">Artboard A</div>
                 <div className="px-2 py-1.5 text-white/60 ml-2 border-l border-white/10">HeaderNav</div>
                 <div className="px-2 py-1.5 text-white/60 ml-2 border-l border-white/10">HeroContent</div>
                 <div className="text-white/80 bg-white/5 px-2 py-1.5 rounded-[3px] mt-1">Artboard B</div>
               </div>
             </div>

             {/* Central Canvas (Light Theme #FAFAF8) */}
             <div className="flex-grow bg-[#FAFAF8] relative overflow-hidden flex" style={{
               backgroundImage: 'radial-gradient(circle at center, rgba(12, 12, 20, 0.08) 1px, transparent 1px)',
               backgroundSize: '20px 20px'
             }}>
               
               {/* Translucent reference image conceptual block */}
               <div className="absolute top-10 left-[400px] w-[200px] h-[300px] border-2 border-dashed border-[#4B57DB]/30 bg-[#4B57DB]/5 rounded z-0 flex items-center justify-center">
                  <span className="font-mono text-[10px] text-[#4B57DB]/40 rotate-90">REFERENCE LAYER</span>
               </div>

               {/* Artboard 1 */}
               <div className="w-[280px] h-[360px] bg-white border border-[#4B57DB] shadow-xl p-4 absolute top-12 left-12 z-20 flex flex-col relative">
                  <div className="absolute -top-5 left-0 font-mono text-[9px] text-[#4B57DB] bg-[#4B57DB]/10 px-1 rounded-sm">Base.Layout</div>
                  <div className="w-full h-12 border-b border-[#0C0C14]/10 mb-4 flex gap-2 items-center">
                    <div className="w-4 h-4 rounded-full bg-[#0C0C14]/10" />
                    <div className="w-16 h-2 bg-[#0C0C14]/10 rounded" />
                  </div>
                  <div className="flex gap-4 mb-4">
                     <div className="flex-grow h-32 bg-[#4B57DB]/5 border border-[#4B57DB]/20 rounded" />
                     <div className="w-1/3 h-32 bg-[#FF7A59]/5 border border-[#FF7A59]/20 rounded" />
                  </div>
                  {/* Animation Concept underneath artboard */}
                  <div className="absolute -bottom-[20px] left-1/2 -translate-x-1/2 flex items-end justify-center w-24 h-[16px] gap-[2px]">
                    <div className="w-1 bg-[#0C0C14] animate-[pulse_1s_infinite]" style={{ height: '40%' }} />
                    <div className="w-1 bg-[#0C0C14] animate-[pulse_1s_infinite_0.1s]" style={{ height: '90%' }} />
                    <div className="w-1 bg-[#0C0C14] animate-[pulse_1s_infinite_0.2s]" style={{ height: '60%' }} />
                    <div className="w-1 bg-[#4B57DB] animate-[pulse_1s_infinite_0.3s]" style={{ height: '100%' }} />
                    <div className="w-1 bg-[#0C0C14] animate-[pulse_1s_infinite_0.4s]" style={{ height: '80%' }} />
                    <div className="w-1 bg-[#0C0C14] animate-[pulse_1s_infinite_0.5s]" style={{ height: '50%' }} />
                  </div>
               </div>

               {/* Artboard 2 */}
               <div className="w-[220px] h-[280px] bg-[#FAFAFA] border border-[#0C0C14]/10 shadow-md p-4 absolute top-24 left-[340px] z-10 flex flex-col relative opacity-80">
                  <div className="absolute -top-5 right-0 font-mono text-[9px] text-[#0C0C14]/40">Variant.Grid</div>
                  <div className="grid grid-cols-2 gap-2 h-full">
                     <div className="bg-[#0C0C14]/5 rounded border border-[#0C0C14]/10" />
                     <div className="bg-[#0C0C14]/5 rounded border border-[#0C0C14]/10" />
                     <div className="bg-[#0C0C14]/5 rounded border border-[#0C0C14]/10" />
                     <div className="bg-[#0C0C14]/5 rounded border border-[#0C0C14]/10" />
                  </div>
               </div>

               {/* Mapping Lines */}
               <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
                 {/* Connection from Artboard 1 to Artboard 2 */}
                 <path d="M 230 180 C 280 180, 280 140, 340 140" fill="none" stroke="#FF7A59" strokeWidth="1.5" strokeDasharray="3 3" />
                 <circle cx="230" cy="180" r="3" fill="#FF7A59" />
                 <circle cx="340" cy="140" r="3" fill="#FF7A59" />
                 
                 {/* Connection from Reference to Artboard 2 */}
                 <path d="M 450 310 C 450 280, 420 280, 390 280" fill="none" stroke="#FFB267" strokeWidth="1.5" />
                 <circle cx="450" cy="310" r="3" fill="#FFB267" />
                 <circle cx="390" cy="280" r="3" fill="#FFB267" />
               </svg>

               {/* Cursors */}
               <div className="absolute top-[50%] left-[25%] z-30 pointer-events-none drop-shadow-md">
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="#FFB267" stroke="#fff" strokeWidth="1.5"><path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 01.35-.15h6.42c.45 0 .67-.54.35-.85L5.5 3.21z" /></svg>
                 <div className="bg-[#FFB267] text-white text-[8px] font-mono px-1 rounded absolute top-5 left-3">Niki</div>
               </div>
               
               <div className="absolute top-[30%] left-[55%] z-30 pointer-events-none drop-shadow-md">
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="#FF7A59" stroke="#fff" strokeWidth="1.5"><path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 01.35-.15h6.42c.45 0 .67-.54.35-.85L5.5 3.21z" /></svg>
                 <div className="bg-[#FF7A59] text-white text-[8px] font-mono px-1 rounded absolute top-5 left-3">Gemini</div>
               </div>

               {/* Floating Prompt Panel */}
               <div className="absolute right-6 bottom-6 w-[260px] bg-[#FAFAFA] rounded border border-[#FF7A59] shadow-[0_15px_30px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden z-40">
                  <div className="h-8 bg-white border-b border-[#0C0C14]/5 flex items-center justify-between px-3">
                    <span className="font-mono text-[9px] text-[#0C0C14]/60 font-semibold uppercase tracking-wider">Prompt Studio</span>
                    <div className="relative">
                       <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-[#FF92D0] rounded-full" />
                       <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0C0C14" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                    </div>
                  </div>
                  <div className="p-3 flex flex-col gap-3 min-h-[120px] bg-white">
                    <div className="bg-[#0C0C14]/5 text-[#0C0C14] text-[10px] p-2 rounded self-end w-[85%] leading-relaxed font-sans border border-[#0C0C14]/5">
                      Extract structural metadata from reference.
                    </div>
                    <div className="bg-[#4B57DB]/10 text-[#4B57DB] text-[10px] p-2 rounded self-start w-[85%] leading-relaxed font-sans border border-[#4B57DB]/20 border-l-2">
                      Variant Grid generated based on Peach tracking cues.
                    </div>
                  </div>
                  <div className="p-2 bg-white border-t border-[#FF7A59]/30">
                     <div className="h-8 border border-[#FF7A59] rounded px-2 flex items-center bg-[#FAFAFA]">
                        <div className="w-[1px] h-3 bg-[#FF7A59] animate-pulse" />
                     </div>
                     <button className="w-full bg-[#4B57DB] text-white text-[10px] font-semibold py-1.5 rounded mt-2 uppercase tracking-wide">Generate</button>
                  </div>
               </div>
             </div>

             {/* Right Panel (Dark Theme #1A1A1A) */}
             <div className="w-[180px] bg-[#1A1A1A] border-l border-[#0C0C14] flex flex-col shrink-0 z-10 shadow-[-10px_0_20px_rgba(0,0,0,0.1)]">
               <div className="flex border-b border-white/10 text-[9px] font-mono text-white/50 tracking-wider">
                 <div className="px-1 py-3 border-b border-[#4B57DB] text-white flex-1 text-center bg-white/5">DESIGN</div>
                 <div className="px-1 py-3 border-b border-transparent flex-1 text-center">CSS</div>
                 <div className="px-1 py-3 border-b border-transparent flex-1 text-center">EXPORT</div>
               </div>
               
               <div className="p-4 flex flex-col gap-6">
                 <div>
                   <div className="text-[9px] font-sans text-white/40 mb-3 uppercase tracking-wider font-semibold">Dimensions</div>
                   <div className="flex flex-col gap-2 font-mono text-[10px]">
                     <div className="flex justify-between border-b border-white/5 pb-1"><span className="text-white/40">W</span><span className="text-white">100%</span></div>
                     <div className="flex justify-between border-b border-white/5 pb-1"><span className="text-white/40">H</span><span className="text-white">Auto</span></div>
                   </div>
                 </div>

                 <div>
                   <div className="text-[9px] font-sans text-white/40 mb-3 uppercase tracking-wider font-semibold">Position</div>
                   <div className="flex flex-col gap-1 font-mono text-[10px]">
                     <div className="bg-white/5 px-2 py-1.5 rounded flex justify-between"><span className="text-[#FF7A59]">X</span><span className="text-white">120px</span></div>
                     <div className="bg-white/5 px-2 py-1.5 rounded flex justify-between"><span className="text-[#FFB267]">Y</span><span className="text-white">80px</span></div>
                   </div>
                 </div>
                 
                 <div>
                   <div className="text-[9px] font-sans text-white/40 mb-3 uppercase tracking-wider font-semibold">Padding</div>
                   <div className="grid grid-cols-2 gap-1 font-mono text-[10px]">
                     <div className="border border-white/10 rounded flex justify-center py-1 text-white">16</div>
                     <div className="border border-white/10 rounded flex justify-center py-1 text-white">16</div>
                     <div className="border border-white/10 rounded flex justify-center py-1 text-white">16</div>
                     <div className="border border-white/10 rounded flex justify-center py-1 text-white">16</div>
                   </div>
                 </div>
               </div>
             </div>

          </div>
        </div>

        {/* Right Side Cards */}
        <div className="flex flex-col gap-10 w-[260px]">
          {/* Card 3: Intent Mapping */}
          <div className="bg-[#4B57DB] w-full aspect-square rounded p-6 flex flex-col justify-between shadow-[10px_20px_30px_rgba(0,0,0,0.2)] border border-[#0C0C14]/5 relative transform rotate-2 hover:rotate-0 transition-transform overflow-hidden">
            <h3 className="font-['Noto_Serif'] text-white text-xl leading-snug w-[90%] relative z-10">Intent Mapping.</h3>
            
            <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
              <svg width="150" height="150" viewBox="0 0 100 100">
                 <path d="M 10 50 Q 50 10 90 90" fill="none" stroke="#FF7A59" strokeWidth="2" />
                 <path d="M 20 80 C 40 80, 60 20, 80 50" fill="none" stroke="#FFB267" strokeWidth="2" />
              </svg>
            </div>
            
            <div className="text-[10px] font-sans text-white/60 uppercase tracking-widest mt-4 relative z-10">Advanced Co-creation</div>
          </div>
          
          {/* Card 4: Integrated OS */}
          <div className="bg-[#0C0C14] w-full aspect-square rounded p-6 flex flex-col justify-between shadow-[10px_20px_30px_rgba(0,0,0,0.3)] border border-white/10 relative transform -rotate-1 hover:rotate-0 transition-transform">
            <h3 className="font-['Noto_Serif'] text-white text-xl leading-snug w-[90%]">The Design OS,<br/>Integrated.</h3>
            
            <div className="flex-grow flex flex-col items-center justify-center gap-4 relative">
               <div className="text-[#4B57DB] text-[8px] font-mono border border-[#4B57DB] px-2 py-0.5 rounded">github integration</div>
               <div className="h-6 w-[0.5px] bg-[#4B57DB]" />
               <div className="text-[#D1E4FC] text-[8px] font-mono border border-[#D1E4FC] px-2 py-0.5 rounded">vercel deploy</div>
            </div>
            
            <div className="text-[12px] font-['Noto_Serif'] text-white/50 text-right mt-4 italic">Now you can.</div>
          </div>
        </div>

      </div>

      {/* Floating Bottom Right Note */}
      <div className="absolute bottom-[20%] right-10 font-['Noto_Serif'] text-[#0C0C14]/40 text-xl italic pointer-events-none">
        Now you can.
      </div>

      {/* Bottom Color Palette Bar */}
      <div className="fixed bottom-0 left-0 right-0 h-16 flex z-50 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] border-t border-black/10">
        <div className="flex-1 bg-[#444FC7] flex items-center justify-between px-6 text-white text-[11px] font-mono border-r border-black/10">
           <span>Deep Cobalt #444FC7</span>
           <span className="text-white/50 hidden md:block">Geist Sans</span>
        </div>
        <div className="flex-1 bg-[#D1E4FC] flex items-center justify-between px-6 text-[#0C0C14] text-[11px] font-mono border-r border-black/10">
           <span>Ghost Blue #D1E4FC</span>
           <span className="text-[#0C0C14]/50 hidden md:block">Hex (#D1E4FC)</span>
        </div>
        <div className="flex-1 bg-[#FFB267] flex items-center px-6 text-[#0C0C14] text-[11px] font-mono border-r border-[#0C0C14]/10">
           <span>Peach #FFB267</span>
        </div>
        <div className="flex-1 bg-[#FF7A59] flex items-center justify-between px-6 text-white text-[11px] font-mono">
           <span>Coral #FF7A59</span>
           <span className="text-white/50 hidden md:block">Sunset #FF7A59</span>
        </div>
        <div className="absolute top-0 right-6 h-full flex items-center text-[9px] font-mono text-black/20 pointer-events-none">
          possible variant C.3.b conceptual
        </div>
      </div>

    </div>
  );
}
