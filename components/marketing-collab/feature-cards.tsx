import { SectionRule } from "./section-rule";

export function FeatureCards() {
  return (
    <section className="w-full py-[100px] bg-[#FAFAF8]" id="features" style={{
      backgroundImage: 'linear-gradient(to right, rgba(12, 12, 20, 0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(12, 12, 20, 0.03) 1px, transparent 1px)',
      backgroundSize: '20px 20px'
    }}>
      <div className="w-full max-w-[1440px] px-5 md:px-[60px] mx-auto mb-10 relative z-10">
        <SectionRule label="What makes it different" />
      </div>
      <div className="w-full max-w-[1440px] px-5 md:px-[60px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#0C0C14]/10 border border-[#0C0C14]/10 rounded-[8px] overflow-hidden">

          {/* Card 1 */}
          <div className="flex flex-col bg-white p-8 lg:p-10 aspect-square relative group">
            <div className="z-10">
              <h3 className="font-['Noto_Serif'] font-medium text-[#0C0C14] text-[32px] leading-tight mb-3">
                Your references,<br/>analyzed.
              </h3>
              <p className="font-sans text-[#0C0C14]/70 text-[15px] leading-relaxed max-w-[90%]">
                Drag screenshots, paste URLs. Every image scored and indexed.
              </p>
            </div>
            
            <div className="flex-grow flex flex-col justify-end relative pt-8 z-0">
               {/* Taste profiles UI */}
              <div className="flex flex-col gap-2 p-4 bg-[#FAFAF8] rounded-[6px] border border-[#0C0C14]/5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] w-[90%]">
                {[
                  { label: 'Editorial homepage', score: '97', gradient: 'from-[#0C0F1D] to-[#1B2654]' },
                  { label: 'Minimal portfolio', score: '94', gradient: 'from-[#F5E6D3] to-[#C4A882]' },
                  { label: 'Swiss typography', score: '91', gradient: 'from-[#111] to-[#333]' },
                ].map(r => (
                  <div key={r.label} className="flex items-center gap-3 px-3 py-2 bg-white border border-[#0C0C14]/5 rounded-[4px] shadow-sm">
                    <div className={`w-8 h-[22px] rounded-[2px] flex-shrink-0 bg-gradient-to-br ${r.gradient}`} />
                    <span className="text-[11px] font-medium text-[#0C0C14]/80 flex-1">{r.label}</span>
                    <span className="font-mono text-[10px] text-[#4B57DB] bg-[#4B57DB]/10 px-2 py-0.5 rounded-[3px]">{r.score}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="flex flex-col bg-white p-8 lg:p-10 aspect-square relative group">
            <div className="z-10">
              <h3 className="font-['Noto_Serif'] font-medium text-[#0C0C14] text-[32px] leading-tight mb-3">
                Taste,<br/>not just style.
              </h3>
              <p className="font-sans text-[#0C0C14]/70 text-[15px] leading-relaxed max-w-[90%]">
                Spacing rhythms, color density, type hierarchy. Quantified.
              </p>
            </div>
            
            <div className="flex-grow flex items-end justify-center relative pt-8 z-0">
              {/* Taste profile display */}
              <div className="bg-white border border-[#4B57DB]/15 shadow-lg shadow-[#4B57DB]/5 rounded-[6px] p-5 w-[85%]">
                <div className="font-mono text-[9px] uppercase tracking-[1.5px] text-[#A0A0A0] mb-3">Extracted taste</div>
                <div className="flex gap-2 mb-4">
                  {['#0C0F1D','#1B2654','#4B57DB','#D1E4FC','#FAFAF8'].map(c => (
                    <div key={c} className="w-6 h-6 rounded-[3px] border border-black/10 flex-shrink-0 shadow-sm" style={{ background: c }} />
                  ))}
                </div>
                <div className="flex justify-between items-center mb-2.5">
                  <span className="text-[11px] text-[#6B6B6B]">Typography</span>
                  <span className="font-mono text-[10px] text-[#4B57DB]">Editorial serif</span>
                </div>
                <div className="flex justify-between items-center mb-2.5">
                  <span className="text-[11px] text-[#6B6B6B]">Density</span>
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className={`w-4 h-2 rounded-[1.5px] ${i <= 3 ? 'bg-[#4B57DB]' : 'bg-[#4B57DB]/20'}`} />
                    ))}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-[#6B6B6B]">Mood</span>
                  <span className="font-mono text-[10px] text-[#4B57DB]">Dark, refined</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="flex flex-col bg-white p-8 lg:p-10 aspect-square relative group">
            <div className="z-10">
              <h3 className="font-['Noto_Serif'] font-medium text-[#0C0C14] text-[32px] leading-tight mb-3">
                Generate<br/>with intent.
              </h3>
              <p className="font-sans text-[#0C0C14]/70 text-[15px] leading-relaxed max-w-[90%]">
                Same prompt. Different taste. The references made the difference.
              </p>
            </div>
            
            <div className="flex-grow flex items-center justify-center relative pt-8 z-0">
              {/* Generation stages */}
              <div className="bg-[#0C0C14] rounded-[6px] p-5 w-[85%] shadow-xl shadow-black/10">
                <div className="font-mono text-[9px] uppercase tracking-[1.5px] text-white/40 mb-4">Generation pipeline</div>
                {[
                  { text: 'Analyzing 3 references', done: true },
                  { text: 'Compiling taste directives', done: true },
                  { text: 'Composing layout', active: true },
                  { text: 'Rendering to canvas', done: false },
                ].map(s => (
                  <div key={s.text} className="flex items-center gap-3 mb-3 last:mb-0">
                    <div className={`w-[8px] h-[8px] rounded-full flex-shrink-0 ${s.done ? 'bg-[#4ade80]' : s.active ? 'bg-white animate-pulse' : 'bg-white/20'}`} />
                    <span className={`text-[12px] font-medium ${s.done ? 'text-white/50 line-through' : s.active ? 'text-white' : 'text-white/30'}`}>{s.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card 4 */}
          <div className="flex flex-col bg-white p-8 lg:p-10 aspect-square relative group">
            <div className="z-10">
              <h3 className="font-['Noto_Serif'] font-medium text-[#0C0C14] text-[32px] leading-tight mb-3">
                Edit,<br/>not just preview.
              </h3>
              <p className="font-sans text-[#0C0C14]/70 text-[15px] leading-relaxed max-w-[90%]">
                Select, resize, restyle. Real canvas feel with layout semantics.
              </p>
            </div>
            
            <div className="flex-grow flex items-end justify-end relative pt-8 z-0">
              {/* Mini inspector */}
              <div className="bg-[#1A1A1A] border border-white/10 rounded-tl-[8px] overflow-hidden w-[90%] shadow-2xl">
                <div className="flex border-b border-white/10 px-3">
                  <div className="font-mono text-[9px] uppercase tracking-[1px] px-2 py-2.5 text-[#E0E0E0] border-b-[1.5px] border-[#4B57DB]">Design</div>
                  <div className="font-mono text-[9px] uppercase tracking-[1px] px-2 py-2.5 text-[#444]">CSS</div>
                  <div className="font-mono text-[9px] uppercase tracking-[1px] px-2 py-2.5 text-[#444]">Export</div>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 h-[1px] bg-[#2A2A2A]" />
                    <span className="font-mono text-[8px] uppercase tracking-[1px] text-[#6A6A6A]">Size</span>
                    <div className="flex-1 h-[1px] bg-[#2A2A2A]" />
                  </div>
                  {[['Width','Fill'],['Height','Hug']].map(([l,v]) => (
                    <div key={l} className="flex justify-between h-5 items-center mb-1">
                      <span className="text-[10px] text-[#888]">{l}</span>
                      <span className="font-mono text-[10px] text-[#D0D0D0]">{v}</span>
                    </div>
                  ))}
                  <div className="flex gap-px bg-[#222] rounded-[3px] p-1 mt-2 mb-4">
                    {['Fixed','Fill','Hug'].map((o,i) => (
                      <div key={o} className={`font-mono text-[9px] flex-1 text-center py-[3px] rounded-[2px] ${i===1 ? 'bg-[#333] text-[#E0E0E0]' : 'text-[#666]'}`}>{o}</div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 h-[1px] bg-[#2A2A2A]" />
                    <span className="font-mono text-[8px] uppercase tracking-[1px] text-[#6A6A6A]">Typography</span>
                    <div className="flex-1 h-[1px] bg-[#2A2A2A]" />
                  </div>
                  {[['Font','Noto Serif'],['Size','32px'],['Weight','500']].map(([l,v]) => (
                    <div key={l} className="flex justify-between h-5 items-center mb-1">
                      <span className="text-[10px] text-[#888]">{l}</span>
                      <span className="font-mono text-[10px] text-[#D0D0D0]">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
