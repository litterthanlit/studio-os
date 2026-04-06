import React from "react";

export function FeatureGrid() {
  return (
    <section className="w-full flex-col px-5 md:px-[60px] py-[60px]" style={{
      backgroundImage: 'linear-gradient(to right, rgba(12, 12, 20, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(12, 12, 20, 0.05) 1px, transparent 1px)',
      backgroundSize: '20px 20px'
    }}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#0C0C14]/10 border border-[#0C0C14]/10 rounded-[8px] overflow-hidden">
        
        {/* Card 1 */}
        <div className="flex flex-col bg-white p-8 aspect-square relative group">
          <div className="z-10 bg-white">
            <h3 className="font-['Noto_Serif'] text-[#0C0C14] text-[32px] leading-tight mb-3">
              Built for Precision.
            </h3>
            <p className="font-sans text-[#0C0C14]/70 text-[15px] leading-relaxed max-w-[90%]">
              Visualization meet inspector data and alignment tools and alignment tools.
            </p>
          </div>
          
          <div className="flex-grow flex items-end justify-center relative pt-8 z-0">
             {/* Mockups for Card 1 */}
             <div className="flex gap-2 items-end drop-shadow-md">
               <div className="bg-[#0C0C14] rounded px-3 py-6 flex flex-col gap-3">
                 <div className="w-4 h-4 bg-white/20 rounded-sm" />
                 <div className="w-4 h-4 bg-[#FF7A59] rounded-sm" />
                 <div className="w-4 h-4 bg-white/20 rounded-sm" />
               </div>
               <div className="bg-[#1C1C1C] rounded p-4 flex flex-col gap-4 text-[10px] font-mono text-white/50 border border-white/5 w-[140px]">
                 <div className="flex justify-between items-center"><span className="text-white/30">ALIGN</span></div>
                 <div className="grid grid-cols-3 gap-2">
                   <div className="w-full aspect-square bg-[#0C0C14] rounded shadow-inner" />
                   <div className="w-full aspect-square bg-[#0C0C14] rounded shadow-inner" />
                   <div className="w-full aspect-square bg-[#0C0C14] rounded shadow-inner" />
                 </div>
                 <div className="h-[1px] w-full bg-white/10 my-1" />
                 <div className="flex justify-between items-center"><span className="text-white">Padding</span> <span className="font-sans text-[#4B57DB]">16px</span></div>
               </div>
             </div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="flex flex-col bg-white p-8 aspect-square relative group">
          <div className="z-10 bg-white">
            <h3 className="font-['Noto_Serif'] text-[#0C0C14] text-[32px] leading-tight mb-3">
              Guided Intuition.
            </h3>
            <p className="font-sans text-[#0C0C14]/70 text-[15px] leading-relaxed max-w-[90%]">
              View of placing architectural references onto a canvas into a canvas.
            </p>
          </div>
          
          <div className="flex-grow flex items-end justify-center relative pt-8 z-0">
             {/* Mockups for Card 2 */}
             <div className="w-full max-w-[280px] h-[160px] bg-[#D1E4FC] border border-[#4B57DB]/10 rounded shadow-md flex overflow-hidden">
               <div className="w-[60px] bg-[#0C0C14] p-2 flex flex-col gap-2">
                 <div className="w-full h-8 bg-white/10 rounded-sm" />
                 <div className="w-full h-8 bg-white/10 rounded-sm" />
               </div>
               <div className="flex-grow p-4 relative">
                 <div className="w-[100px] h-[60px] bg-white absolute top-4 left-6 shadow-sm border border-[#0C0C14]/5"></div>
                 <div className="w-[80px] h-[100px] bg-white absolute bottom-[-10px] right-2 shadow-sm border border-[#0C0C14]/5 transform rotate-3 flex flex-col pt-2 px-2 pb-6">
                   <div className="w-full h-full bg-[#FAFAFA] border border-[#0C0C14]/5" style={{
                     backgroundImage: 'linear-gradient(45deg, #0C0C14 25%, transparent 25%, transparent 75%, #0C0C14 75%, #0C0C14), linear-gradient(45deg, #0C0C14 25%, transparent 25%, transparent 75%, #0C0C14 75%, #0C0C14)',
                     backgroundSize: '4px 4px',
                     backgroundPosition: '0 0, 2px 2px',
                     opacity: 0.1
                   }} />
                 </div>
               </div>
             </div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="flex flex-col bg-white p-8 aspect-square relative group">
          <div className="z-10 bg-white">
            <h3 className="font-['Noto_Serif'] text-[#0C0C14] text-[32px] leading-tight mb-3">
              Co-create with AI.
            </h3>
            <p className="font-sans text-[#0C0C14]/70 text-[15px] leading-relaxed max-w-[90%]">
              Uses a single notification dot using Electric Pink (#FF92D0) for the 10% spark.
            </p>
          </div>
          
          <div className="flex-grow flex items-center justify-center relative pt-8 z-0">
             {/* Mockups for Card 3 */}
             <div className="w-[200px] bg-white rounded-md shadow-[0_10px_30px_rgba(0,0,0,0.1)] border border-[#0C0C14]/10 flex flex-col overflow-hidden relative">
               <div className="absolute top-0 right-0 w-4 h-4 bg-[#FF92D0] rounded-bl-lg" />
               <div className="h-8 border-b border-[#0C0C14]/5 flex items-center px-3">
                 <span className="font-mono text-[9px] text-[#0C0C14]/40 uppercase tracking-widest">Prompt</span>
               </div>
               <div className="p-3 flex flex-col gap-3 text-[10px] bg-[#FAFAFA] h-[120px]">
                 <div className="bg-white border border-[#0C0C14]/5 p-2 rounded ml-4 shadow-sm self-end max-w-[85%] text-[#0C0C14] leading-snug">
                   Create a dark mode dashboard.
                 </div>
                 <div className="bg-[#4B57DB] text-white p-2 rounded mr-4 shadow-sm self-start max-w-[85%] leading-snug">
                   Generating structure...
                 </div>
                 <div className="flex items-center gap-1.5 mt-auto bg-white border border-[#0C0C14]/10 rounded-full px-2 py-1 mx-2">
                    <div className="w-1.5 h-1.5 bg-[#FF92D0] rounded-full animate-pulse" />
                    <span className="text-[8px] text-[#0C0C14]/40">Writing blocks...</span>
                 </div>
               </div>
             </div>
          </div>
        </div>

        {/* Card 4 */}
        <div className="flex flex-col bg-white p-8 aspect-square relative group">
          <div className="z-10 bg-white">
            <h3 className="font-['Noto_Serif'] text-[#0C0C14] text-[32px] leading-tight mb-3">
              Code, Integrated.
            </h3>
            <p className="font-sans text-[#0C0C14]/70 text-[15px] leading-relaxed max-w-[90%]">
              Code view and next floor text view.
            </p>
          </div>
          
          <div className="flex-grow flex items-end justify-center relative pt-8 z-0">
             {/* Mockups for Card 4 */}
             <div className="w-[240px] h-[160px] bg-[#0C0C14] rounded-t-md shadow-2xl flex flex-col border border-white/20 border-b-0 overflow-hidden">
               <div className="h-6 flex items-center px-3 border-b border-white/10 bg-[#1C1C1C]">
                 <div className="flex gap-1">
                   <div className="w-1.5 h-1.5 rounded-full bg-[#FF7A59]" />
                   <div className="w-1.5 h-1.5 rounded-full bg-[#FFB267]" />
                   <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                 </div>
                 <div className="ml-auto font-mono text-[8px] text-white/30">Layout.tsx</div>
               </div>
               <div className="p-3 font-mono text-[8px] text-white/60 leading-[14px]">
                 <span className="text-[#4B57DB]">export function</span> <span className="text-[#FFB267]">App</span>() {"{"}<br/>
                 &nbsp;&nbsp;<span className="text-[#4B57DB]">return</span> (<br/>
                 &nbsp;&nbsp;&nbsp;&nbsp;&lt;<span className="text-[#FF7A59]">div</span> <span className="text-[#D1E4FC]">className</span>=<span className="text-[#D1E4FC]">&quot;flex w-full&quot;</span>&gt;<br/>
                 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&lt;<span className="text-[#FF7A59]">Sidebar</span> /&gt;<br/>
                 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&lt;<span className="text-[#FF7A59]">Canvas</span> <span className="text-[#D1E4FC]">mode</span>=<span className="text-[#D1E4FC]">&quot;dark&quot;</span> /&gt;<br/>
                 &nbsp;&nbsp;&nbsp;&nbsp;&lt;/<span className="text-[#FF7A59]">div</span>&gt;<br/>
                 &nbsp;&nbsp;)<br/>
                 {"}"}
                 <div className="mt-2 w-[40%] h-[1px] bg-white/10" />
                 <div className="mt-1 w-[60%] h-[1px] bg-white/10" />
               </div>
             </div>
          </div>
        </div>

      </div>
    </section>
  );
}
