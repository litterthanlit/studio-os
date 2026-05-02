import { LogoMark } from "@/components/marketing-v2/logo-mark";

export function SplitTaste() {
  return (
    <section id="taste" className="relative w-full overflow-hidden min-h-[580px] border-y border-[#0C0C14]/8 flex scroll-mt-[72px]">
      {/* Split backgrounds */}
      <div className="absolute inset-0 flex flex-col md:flex-row pointer-events-none">
        <div className="w-full md:w-1/2 bg-[#4B57DB]" />
        <div className="w-full md:w-1/2 bg-[#D1E4FC]" style={{
          backgroundImage: 'linear-gradient(to right, rgba(75,87,219,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(75,87,219,0.08) 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }} />
      </div>

      <div className="w-full max-w-[1440px] mx-auto px-5 md:px-[60px] relative z-10 flex flex-col md:flex-row">
        {/* Left: deep blue — headline + copy */}
        <div className="w-full md:w-1/2 py-16 md:py-[80px] md:pr-12 flex flex-col justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[1px] text-white/40 mb-4">── Taste engine ──</div>
            <h2 className="font-['Noto_Serif'] text-white text-[clamp(32px,3.5vw,52px)] leading-[1.08] mb-6 max-w-[380px]">
              From references<br/>to results.
            </h2>
            <p className="font-sans text-white/70 text-[15px] leading-[1.65] max-w-[340px] text-pretty">
              Studio OS reads your moodboard and pulls out the patterns — spacing rhythms, type density, color sensibility. Not just inspiration. Structured taste data that constrains every generation.
            </p>
          </div>
          <div className="flex items-center gap-3 mt-10 md:mt-0">
            <LogoMark variant="onAccent" className="opacity-80" />
            <span className="studio-os-wordmark text-sm text-white/60">studio OS</span>
          </div>
        </div>

        {/* Right: light blue — taste extraction visualization */}
        <div className="w-full md:w-1/2 py-16 md:py-[80px] md:pl-12 flex flex-col justify-center relative">
          {/* Reference images stacked */}
          <div className="relative mb-6">
            <div className="font-mono text-[10px] uppercase tracking-[1px] text-[#4B57DB] mb-3">Your references</div>
            <div className="flex gap-2.5">
              {[
                { gradient: 'from-[#0C0F1D] to-[#1B2654]', label: 'Editorial', score: '97' },
                { gradient: 'from-[#F5E6D3] to-[#C4A882]', label: 'Minimal', score: '94' },
                { gradient: 'from-[#111] to-[#333]', label: 'Swiss', score: '91' },
              ].map(r => (
                <div key={r.label} className="flex-1 relative">
                  <div className={`h-[80px] rounded-[4px] bg-gradient-to-br ${r.gradient} border border-black/10`} />
                  <div className="flex justify-between items-center mt-1">
                    <span className="font-mono text-[9px] text-[#6B6B6B]">{r.label}</span>
                    <span className="font-mono text-[9px] text-[#4B57DB] bg-[#4B57DB]/10 px-1.5 py-0.5 rounded-[2px]">{r.score}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Arrow */}
          <div className="flex items-center gap-2 mb-5">
            <div className="flex-1 h-px bg-[#4B57DB]/30" />
            <div className="font-mono text-[9px] text-[#4B57DB]/60 uppercase tracking-[1px]">Extracted</div>
            <div className="flex-1 h-px bg-[#4B57DB]/30" />
          </div>

          {/* Extracted taste card */}
          <div className="bg-white/70 border border-[#4B57DB]/15 rounded-[6px] p-4 backdrop-blur-sm">
            <div className="font-mono text-[8px] uppercase tracking-[1px] text-[#A0A0A0] mb-3">Taste profile</div>
            {/* Color palette */}
            <div className="mb-3">
              <div className="text-[10px] text-[#6B6B6B] mb-1.5">Color palette</div>
              <div className="flex gap-1.5">
                {['#0C0F1D','#1B2654','#4B57DB','#D1E4FC','#FAFAF8'].map(c => (
                  <div key={c} title={c} className="w-7 h-7 rounded-[3px] border border-black/10 shadow-sm" style={{ background: c }} />
                ))}
              </div>
            </div>
            {/* Typography */}
            <div className="mb-3 pb-3 border-b border-[#EFEFEC]">
              <div className="text-[10px] text-[#6B6B6B] mb-1">Typography</div>
              <div className="flex gap-2 items-baseline">
                <span className="font-['Noto_Serif'] text-[18px] text-[#0C0C14] leading-none">Aa</span>
                <div>
                  <div className="font-mono text-[9px] text-[#4B57DB]">Editorial serif</div>
                  <div className="font-mono text-[8px] text-[#A0A0A0]">Display — 48–72px</div>
                </div>
              </div>
            </div>
            {/* Metrics */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Density', value: 'Low', accent: true },
                { label: 'Mood', value: 'Dark, refined', accent: false },
                { label: 'Spacing', value: 'Generous', accent: false },
                { label: 'Fidelity', value: 'Close', accent: true },
              ].map(m => (
                <div key={m.label} className="flex flex-col">
                  <span className="text-[9px] text-[#A0A0A0]">{m.label}</span>
                  <span className={`font-mono text-[9px] ${m.accent ? 'text-[#4B57DB]' : 'text-[#1A1A1A]'}`}>{m.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
