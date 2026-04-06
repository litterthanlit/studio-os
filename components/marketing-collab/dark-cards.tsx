import React from "react";

export function DarkCards() {
  return (
    <section className="w-full py-[120px] bg-[#FAFAF8]" id="dark-cards">
      <div className="w-full max-w-[1440px] px-5 md:px-[60px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[20px]">
          
          {/* Card 1 */}
          <div className="bg-[#0C0C14] rounded-[6px] p-6 flex flex-col justify-between aspect-square group relative overflow-hidden shadow-sm hover:-translate-y-1 transition-transform duration-300">
            <h3 className="font-['Noto_Serif'] font-medium text-white text-2xl leading-tight mb-4 z-10 w-[80%]">
              Shared Canvas.<br/>Individual Flow.
            </h3>
            
            {/* UI Mockup for Card 1 */}
            <div className="relative flex-grow flex items-end justify-center pb-4 z-10">
              <div className="w-[120%] h-[120px] bg-white/[0.03] border border-white/5 rounded-t-[6px] shadow-lg flex relative overflow-hidden left-4">
                 <div className="w-16 h-full border-r border-[#1A1A1A]/5 bg-transparent" />
                 <div className="flex-grow bg-white flex items-center justify-center relative" style={{
                   backgroundImage: 'linear-gradient(to right, #f0f0f0 1px, transparent 1px), linear-gradient(to bottom, #f0f0f0 1px, transparent 1px)',
                   backgroundSize: '15px 15px'
                 }}>
                   {/* Multiple cursors */}
                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="absolute top-[30%] left-[30%]" xmlns="http://www.w3.org/2000/svg"><path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 01.35-.15h6.42c.45 0 .67-.54.35-.85L5.5 3.21z" fill="#FFB267" stroke="#000" strokeWidth="1.5"/></svg>
                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="absolute top-[50%] left-[45%]" xmlns="http://www.w3.org/2000/svg"><path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 01.35-.15h6.42c.45 0 .67-.54.35-.85L5.5 3.21z" fill="#FF7A59" stroke="#000" strokeWidth="1.5"/></svg>
                 </div>
              </div>
            </div>
            
            <p className="font-sans text-white/50 text-sm mt-4 z-10 w-[80%]">
              Collaborate in real-time without friction.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-[#D1E4FC] rounded-[6px] p-6 flex flex-col justify-between aspect-square relative overflow-hidden shadow-sm hover:-translate-y-1 transition-transform duration-300">
            <h3 className="font-['Noto_Serif'] font-medium text-[#0C0C14] text-2xl leading-tight mb-4 z-10 w-[80%]">
              Immutable Logic.<br/>Predicted State.
            </h3>
            
            {/* Diagram for Card 2 */}
            <div className="relative flex-grow flex items-center justify-center z-10">
              <div className="flex items-center gap-4">
                <div className="flex flex-col gap-2">
                  <div className="h-0.5 w-6 bg-[#1E5DF2]/40" />
                  <div className="h-0.5 w-8 bg-[#1E5DF2]/40" />
                  <div className="h-0.5 w-6 bg-[#1E5DF2]/40" />
                </div>
                <div className="border border-[#1E5DF2] bg-[#1E5DF2]/5 rounded-[4px] text-[#1E5DF2] font-mono text-[10px] py-1.5 px-3 flex items-center justify-center shadow-sm font-medium">
                  DesignNode
                </div>
                <div className="flex flex-col gap-2">
                  <div className="h-0.5 w-10 relative bg-[#FF7A59]/40"><div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#FF7A59] border border-[#D1E4FC]" /></div>
                  <div className="h-0.5 w-8 relative bg-[#1E5DF2]/40"><div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#1E5DF2] border border-[#D1E4FC]" /></div>
                </div>
              </div>
            </div>

            <p className="font-sans text-[#1A1A1A]/70 text-sm mt-4 z-10 w-[90%]">
              Your design pipeline, hardened for enterprise reliability.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-[#4B57DB] rounded-[6px] p-6 flex flex-col justify-between aspect-square relative overflow-hidden shadow-sm hover:-translate-y-1 transition-transform duration-300">
            <h3 className="font-['Noto_Serif'] font-medium text-white text-2xl leading-tight mb-4 z-10 w-[80%]">
              Intent,<br/>Mapped.
            </h3>
            
            {/* Abstract Graphic for Card 3 */}
            <div className="relative flex-grow flex items-center justify-center z-10">
              <div className="relative w-full h-full flex items-center justify-center">
                 {/* Sketch paper mockup */}
                 <div className="absolute w-[100px] h-[100px] bg-[#fdfdfd] shadow-lg transform -rotate-6 flex items-center justify-center overflow-hidden border border-black/5" style={{
                   backgroundImage: 'repeating-linear-gradient(transparent, transparent 19px, #e0e0e0 20px)'
                 }}>
                   <svg width="60" height="60" viewBox="0 0 100 100" className="opacity-30">
                     <path d="M10 90 Q 50 10 90 90" fill="none" stroke="#000" strokeWidth="2" />
                     <circle cx="50" cy="50" r="20" fill="none" stroke="#000" strokeWidth="2" />
                   </svg>
                 </div>
                 {/* Vector curve over it */}
                 <div className="absolute w-full h-full">
                    <svg width="100%" height="100%" viewBox="0 0 200 200" className="overflow-visible absolute top-0 left-0">
                      <path d="M 50 120 C 80 120, 100 60, 160 80" fill="none" stroke="#FF7A59" strokeWidth="1.5" />
                      <circle cx="50" cy="120" r="4" fill="#FF7A59" />
                      <circle cx="160" cy="80" r="3" fill="#D1E4FC" />
                      <circle cx="80" cy="120" r="3" fill="#1A1A1A" />
                      <circle cx="100" cy="60" r="3" fill="#1A1A1A" />
                      <line x1="160" y1="80" x2="160" y2="150" stroke="#FF7A59" strokeWidth="1" opacity="0.5" />
                    </svg>
                 </div>
              </div>
            </div>

            <p className="font-sans text-white/70 text-sm mt-4 z-10 w-[80%]">
              Turn inspiration into immutable structure.
            </p>
          </div>

          {/* Card 4 */}
          <div className="bg-[#0C0C14] rounded-[6px] p-6 flex flex-col justify-between aspect-square relative overflow-hidden shadow-sm hover:-translate-y-1 transition-transform duration-300">
            <h3 className="font-['Noto_Serif'] font-medium text-white text-2xl leading-tight mb-4 z-10 w-[80%]">
              Prompt.<br/>Generate.<br/>Build.
            </h3>
            
            {/* Minimal UI for Card 4 */}
            <div className="relative flex-grow flex items-center justify-center z-10">
               <div className="w-[140px] h-[100px] bg-white/[0.03] border border-white/5 rounded-[4px] overflow-hidden flex flex-col shadow-xl absolute rotate-2">
                 <div className="h-6 border-b border-white/5 flex items-center px-2 bg-transparent">
                   <div className="text-[7px] font-mono text-white/40 uppercase tracking-wider">Prompt</div>
                 </div>
                 <div className="p-3 flex-grow flex flex-col gap-2">
                   <div className="bg-[#1E5DF2]/10 text-[#1E5DF2] text-[8px] p-1.5 rounded-[4px] self-end max-w-[80%]">
                     Create a dark mode dashboard.
                   </div>
                   <div className="bg-white/5 text-white/70 text-[8px] p-1.5 rounded-[4px] self-start max-w-[80%]">
                     Generating structure...
                   </div>
                   <div className="flex gap-1 mt-auto">
                     <div className="h-[2px] bg-[#FF7A59] flex-grow rounded-full animate-pulse" />
                     <div className="h-[2px] bg-white/10 flex-grow rounded-full" />
                   </div>
                 </div>
               </div>
            </div>

            <p className="font-sans text-white/50 text-sm mt-4 z-10 w-[90%]">
              Your workflow, unified and optimized. Now you can.
            </p>
          </div>
          
        </div>
      </div>
    </section>
  );
}
