export function FooterCta() {
  return (
    <section className="w-full bg-[#4B57DB] relative overflow-hidden">
      <div className="w-full max-w-[1440px] mx-auto px-5 md:px-[60px] py-[100px] md:py-[120px] flex flex-col md:flex-row items-center gap-12 md:gap-20">
        {/* Left: headline + CTA */}
        <div className="flex-1 min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-[1px] text-white/40 mb-5">── Studio OS ──</div>
          <h2 className="font-['Noto_Serif'] font-medium text-white text-[clamp(48px,6vw,76px)] leading-[1.05] mb-6">
            Your taste.<br /><em style={{ fontStyle: 'italic' }}>Amplified.</em>
          </h2>
          <p className="font-sans font-medium text-white/70 text-[18px] leading-[1.65] mb-9 max-w-[380px] text-pretty">
            Stop settling for generic AI output. Design with a tool that actually gets your aesthetic.
          </p>
          <div className="flex gap-3 items-center">
            <button className="text-[14px] font-medium text-[#4B57DB] bg-white px-7 py-3.5 rounded-[4px] hover:bg-[#F0F0FF] transition-colors">
              Start designing
            </button>
            <button className="text-[14px] font-medium text-white/80 border border-white/30 px-6 py-3.5 rounded-[4px] hover:border-white/60 hover:text-white transition-colors">
              View the gallery →
            </button>
          </div>
          {/* Logo */}
          <div className="flex items-center gap-2.5 mt-12 opacity-30">
            <div className="flex flex-col gap-[2px]">
              {[1,0.8,0.6,0.4,0.2].map((o,i) => (
                <div key={i} className="w-4 h-[2.5px] bg-white rounded-[1px]" style={{ opacity: o }} />
              ))}
            </div>
            <span className="studio-os-wordmark text-sm text-white">studio OS</span>
          </div>
        </div>

        {/* Right: code editor mockup (like Figma "From sketch to source") */}
        <div className="flex-1 min-w-0 max-w-[480px]">
          <div className="bg-[#0D0D0D] rounded-[8px] overflow-hidden border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
            <div className="flex items-center gap-1.5 px-3.5 py-2.5 border-b border-[#1A1A1A] bg-[#141414]">
              <div className="w-2 h-2 rounded-full bg-[#FF5F56]/70" />
              <div className="w-2 h-2 rounded-full bg-[#FEBC2E]/70" />
              <div className="w-2 h-2 rounded-full bg-[#27C840]/70" />
              <span className="ml-auto font-mono text-[9px] text-[#555]">src/components/Hero.tsx</span>
            </div>
            <div className="p-5 font-mono text-[11px] leading-[1.75] overflow-x-auto">
              <div><span className="text-[#E06C75]">import</span> <span className="text-[#ABB2BF]">{"{ Button }"}</span> <span className="text-[#E06C75]">from</span> <span className="text-[#98C379]">&quot;@/components/ui&quot;</span>;</div>
              <div className="h-3" />
              <div><span className="text-[#E06C75]">export const</span> <span className="text-[#61AFEF]">HeroSection</span> <span className="text-[#ABB2BF]">= () =&gt; {"{"}</span></div>
              <div><span className="text-[#ABB2BF]">&nbsp;&nbsp;return (</span></div>
              <div><span className="text-[#ABB2BF]">&nbsp;&nbsp;&nbsp;&nbsp;</span><span className="text-[#E06C75]">&lt;section</span> <span className="text-[#D19A66]">className</span>=<span className="text-[#98C379]">&quot;bg-dark text-white p-20&quot;</span><span className="text-[#E06C75]">&gt;</span></div>
              <div><span className="text-[#ABB2BF]">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span><span className="text-[#E06C75]">&lt;div</span> <span className="text-[#D19A66]">className</span>=<span className="text-[#98C379]">&quot;max-w-7xl mx-auto&quot;</span><span className="text-[#E06C75]">&gt;</span></div>
              <div><span className="text-[#ABB2BF]">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span><span className="text-[#E06C75]">&lt;h1</span> <span className="text-[#D19A66]">className</span>=<span className="text-[#98C379]">&quot;font-serif text-6xl&quot;</span><span className="text-[#E06C75]">&gt;</span></div>
              <div><span className="text-[#ABB2BF]">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Export to Code.</span></div>
              <div><span className="text-[#ABB2BF]">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span><span className="text-[#E06C75]">&lt;/h1&gt;</span></div>
              <div><span className="text-[#ABB2BF]">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span><span className="text-[#E06C75]">&lt;Button</span> <span className="text-[#D19A66]">variant</span>=<span className="text-[#98C379]">&quot;primary&quot;</span><span className="text-[#E06C75]">&gt;</span></div>
              <div><span className="text-[#ABB2BF]">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Deploy Now</span></div>
              <div><span className="text-[#ABB2BF]">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span><span className="text-[#E06C75]">&lt;/Button&gt;</span></div>
              <div><span className="text-[#ABB2BF]">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span><span className="text-[#E06C75]">&lt;/div&gt;</span></div>
              <div><span className="text-[#ABB2BF]">&nbsp;&nbsp;&nbsp;&nbsp;</span><span className="text-[#E06C75]">&lt;/section&gt;</span></div>
              <div><span className="text-[#ABB2BF]">&nbsp;&nbsp;);</span></div>
              <div><span className="text-[#ABB2BF]">{"}"}</span>;</div>
            </div>
            <div className="flex justify-end px-4 pb-4">
              <button className="flex items-center gap-2 bg-[#FF7A59] text-white text-[12px] font-medium px-4 py-2 rounded-[4px] hover:bg-[#FF6B47] transition-colors">
                <span className="font-mono">&lt;/&gt;</span>
                Export to Code
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
