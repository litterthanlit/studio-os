import React from "react";

export function Hero() {
  return (
    <section className="w-full flex flex-col md:flex-row border-b border-[#0C0C14]/5 min-h-[600px]">
      {/* Left Column */}
      <div className="w-full md:w-1/2 p-10 md:p-[80px] lg:p-[120px] flex flex-col justify-center bg-white relative">
        <h1 className="font-['Noto_Serif'] text-[#0C0C14] text-[56px] leading-[1.05] tracking-tight mb-6">
          Design<br />with your<br />references.
        </h1>
        <p className="font-sans text-[#0C0C14]/60 text-[18px] mb-10 max-w-[320px] leading-relaxed">
          The workspace where structure meets flow. Guided by intuition, hardened for precision.
        </p>
        <button className="bg-[#4B57DB] text-white font-sans text-sm font-medium px-6 py-3 rounded-[4px] hover:bg-[#4B57DB]/90 transition-colors w-fit shadow-md">
          Start Building Free.
        </button>
      </div>

      {/* Right Column */}
      <div className="w-full md:w-1/2 bg-[#D1E4FC] p-10 md:p-[60px] flex items-center justify-center relative overflow-hidden" style={{
        backgroundImage: 'linear-gradient(to right, rgba(75, 87, 219, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(75, 87, 219, 0.05) 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }}>
        {/* Editor Mockup */}
        <div className="relative w-full aspect-[4/3] max-w-[400px] bg-white border border-[#4B57DB]/10 rounded shadow-xl flex flex-col overflow-hidden z-10 transform -translate-y-4">
          {/* Chrome top bar */}
          <div className="h-8 bg-[#1C1C1C] border-b border-[#0C0C14]/10 flex items-center px-4 gap-2">
            <div className="w-2 h-2 rounded-full bg-white/20" />
            <div className="w-2 h-2 rounded-full bg-white/20" />
            <div className="w-2 h-2 rounded-full bg-white/20" />
          </div>
          
          <div className="flex flex-grow relative">
            {/* Sidebar */}
            <div className="w-[80px] bg-[#0C0C14] flex flex-col gap-2 p-2">
              <div className="w-full h-2 bg-white/10 rounded-sm" />
              <div className="w-3/4 h-2 bg-white/10 rounded-sm" />
              <div className="w-1/2 h-2 bg-white/10 rounded-sm" />
            </div>
            {/* Canvas */}
            <div className="flex-grow bg-white p-6 relative flex items-center justify-center">
              {/* Selected wireframe block */}
              <div className="w-[180px] h-[120px] bg-white border border-[#4B57DB] relative flex flex-col items-center justify-center">
                {/* Resize handles */}
                <div className="absolute top-[-3px] left-[-3px] w-1.5 h-1.5 bg-white border border-[#4B57DB]" />
                <div className="absolute top-[-3px] right-[-3px] w-1.5 h-1.5 bg-white border border-[#4B57DB]" />
                <div className="absolute bottom-[-3px] left-[-3px] w-1.5 h-1.5 bg-white border border-[#4B57DB]" />
                <div className="absolute bottom-[-3px] right-[-3px] w-1.5 h-1.5 bg-white border border-[#4B57DB]" />
                
                {/* Dummy lines inside box */}
                <div className="w-[90%] h-4 bg-[#4B57DB]/80 mb-1" />
                <div className="w-[90%] h-4 bg-[#4B57DB]/80 mb-1" />
                <div className="w-[90%] h-4 bg-[#4B57DB]/80 mb-1" />
                <div className="w-[70%] h-4 bg-[#4B57DB]/80" />
              </div>
            </div>
            {/* Right Inspector */}
            <div className="w-[60px] bg-[#0C0C14] border-l border-white/10 flex flex-col p-2 gap-2">
               <div className="w-full h-8 bg-[#4B57DB]/20 rounded-sm border border-[#4B57DB]/30" />
               <div className="w-full h-8 bg-white/5 rounded-sm" />
            </div>
          </div>
        </div>

        {/* Overlapping Bar Strip popup */}
        <div className="absolute bottom-16 right-10 bg-[#FFECD1] border border-[#FFB267]/50 rounded-[4px] p-3 shadow-2xl z-20 w-[140px] transform rotate-2">
          <div className="text-[9px] font-sans font-medium text-[#0C0C14]/80 text-center mb-2">Bar strip</div>
          <div className="flex items-end justify-center gap-[2px] h-[30px] w-full">
            <div className="w-1.5 bg-[#0C0C14]" style={{ height: '50%' }} />
            <div className="w-1.5 bg-[#0C0C14]" style={{ height: '80%' }} />
            <div className="w-1.5 bg-[#0C0C14]" style={{ height: '40%' }} />
            <div className="w-1.5 bg-[#0C0C14]" style={{ height: '100%' }} />
            <div className="w-1.5 bg-[#0C0C14]" style={{ height: '60%' }} />
            <div className="w-1.5 bg-[#0C0C14]" style={{ height: '90%' }} />
            <div className="w-1.5 bg-[#0C0C14]" style={{ height: '70%' }} />
            <div className="w-1.5 bg-[#0C0C14]" style={{ height: '30%' }} />
          </div>
          <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-[#FF7A59] rounded-full border border-white" />
        </div>
        
      </div>
    </section>
  );
}
