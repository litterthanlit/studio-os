"use client";
import { LogoMark } from "./logo-mark";

export function Hero() {
  return (
    <section className="relative w-full overflow-hidden min-h-[640px] border-b border-[#0C0C14]/5 flex">
      {/* Full-bleed split backgrounds */}
      <div className="absolute inset-0 flex flex-col md:flex-row pointer-events-none">
        <div className="w-full md:w-1/2 bg-white" />
        <div className="w-full md:w-1/2 bg-[#D1E4FC]" style={{
          backgroundImage: 'linear-gradient(to right, rgba(75,87,219,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(75,87,219,0.06) 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }} />
      </div>

      {/* Constrained Content Container */}
      <div className="w-full max-w-[1440px] mx-auto relative z-10 flex flex-col md:flex-row pointer-events-auto">
        {/* Left: white */}
        <div className="w-full md:w-1/2 py-20 px-5 md:pl-[60px] md:pr-[40px] lg:pl-[80px] lg:pr-[60px] flex flex-col justify-center relative">
          <div className="inline-flex items-center gap-2 px-3.5 py-[5px] rounded-full border border-[#EFEFEC] bg-[#FAFAF8] font-mono text-[10px] uppercase tracking-[1px] text-[#A0A0A0] mb-6 w-fit">
            <div className="w-[5px] h-[5px] rounded-full bg-[#4B57DB] animate-pulse" />
            Now in early access
          </div>
          <h1 className="font-['Noto_Serif'] font-medium text-[#0C0C14] text-[clamp(48px,5vw,64px)] leading-[1.05] tracking-tight mb-6 text-balance">
            AI that designs<br />
            <span className="italic text-[#4B57DB]">like you.</span>
          </h1>
          <p className="font-sans font-medium text-[#0C0C14]/60 text-[18px] leading-[1.65] mb-8 max-w-[380px] text-pretty">
            Feed Studio OS your references. It extracts your design sensibility and generates pages that look like yours — not like everyone else&apos;s.
          </p>
          <div className="flex gap-3 items-center">
            <button className="text-[13px] font-medium text-white bg-[#1A1A1A] px-6 py-[11px] rounded-[4px] hover:bg-[#333] transition-all duration-150 hover:scale-[1.02] active:scale-[0.97]">
              Start designing
            </button>
            <a href="#how" className="text-[13px] font-medium text-[#6B6B6B] px-4 py-[11px] inline-flex items-center gap-1.5 hover:text-[#1A1A1A] transition-colors group">
              See how it works
              <span className="transition-transform group-hover:translate-x-[3px]">→</span>
            </a>
          </div>
        </div>

        {/* Right: tile grid + mockup */}
        <div className="w-full md:w-1/2 py-20 px-5 md:pr-[60px] md:pl-[40px] lg:pr-[80px] lg:pl-[60px] flex items-center justify-center relative">
          {/* High-fidelity editor mockup */}
          <div className="w-full max-w-[500px] rounded-[8px] border border-black/[0.08] overflow-hidden shadow-[0_0_0_0.5px_rgba(0,0,0,0.04),0_24px_80px_-20px_rgba(0,0,0,0.22)] relative">
          {/* Browser chrome */}
          <div className="flex items-center gap-1.5 px-3 py-2 bg-[#F5F5F5] border-b border-black/[0.06]">
            <div className="w-2 h-2 rounded-full bg-[#FF5F56]" />
            <div className="w-2 h-2 rounded-full bg-[#FEBC2E]" />
            <div className="w-2 h-2 rounded-full bg-[#27C840]" />
            <div className="ml-2.5 flex items-center gap-1.5 bg-white border border-black/[0.06] rounded-[3px] px-2 py-[2px] font-mono text-[9px] text-[#A0A0A0]">
              <div className="w-1 h-1 rounded-full bg-[#4B57DB]" />
              studio-os.app
            </div>
          </div>
          {/* Editor body */}
          <div className="flex h-[440px] bg-[#141414]">
            {/* Mini rail */}
            <div className="w-[38px] bg-[#1A1A1A] border-r border-[#262626]/50 flex flex-col items-center pt-3 pb-3 gap-3 flex-shrink-0">
              <div className="w-[20px] h-[20px] bg-[#4B57DB] rounded-[3px] flex items-center justify-center text-[9px] font-bold text-white">S</div>
              <div className="w-[12px] h-[12px] rounded-[2px] bg-[#4B57DB] opacity-90" />
              <div className="w-[12px] h-[12px] rounded-[2px] bg-[#333]" />
              <div className="w-[12px] h-[12px] rounded-[2px] bg-[#333]" />
              <div className="flex-1" />
              <div className="w-[12px] h-[12px] rounded-[2px] bg-[#333]" />
            </div>
            {/* Layers panel */}
            <div className="w-[148px] bg-[#1A1A1A] border-r border-[#262626]/50 overflow-hidden flex-shrink-0">
              <div className="font-mono text-[8px] uppercase tracking-[1px] text-[#555] px-3 pt-3 pb-2 border-b border-[#262626]/50">Layers</div>
              <HLayerItem label="Page" depth={0} />
              <HLayerItem label="Hero Section" depth={1} />
              <HLayerItem label="Heading" depth={2} selected />
              <HLayerItem label="Subtitle" depth={2} />
              <HLayerItem label="Cover Image" depth={2} />
              <HLayerItem label="Features Grid" depth={1} />
              <HLayerItem label="Card 1" depth={2} />
              <HLayerItem label="Card 2" depth={2} />
              <HLayerItem label="Quote Block" depth={1} />
            </div>
            {/* Canvas */}
            <div className="flex-1 bg-[#FAFAF8] relative flex items-center justify-center min-w-0">
              <div className="absolute inset-0" style={{
                backgroundImage: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='21' height='21'><rect width='20' height='20' rx='1' fill='%23000' opacity='.02'/></svg>")`,
                backgroundSize: '21px 21px',
              }} />
              <div className="w-[240px] h-[340px] bg-white rounded-[2px] relative z-[1] shadow-[0_1px_16px_rgba(0,0,0,0.06)] overflow-hidden">
                <div className="absolute -top-[14px] left-0 font-mono text-[7px] text-[#4B57DB] tracking-[0.5px]">Desktop — 1440</div>
                {/* Selection */}
                <div className="absolute top-5 left-[12px] w-[110px] h-[18px] border-[1.5px] border-[#4B57DB] pointer-events-none z-10">
                  <div className="absolute -top-[14px] -left-px bg-[#4B57DB] text-white font-mono text-[6px] px-[4px] py-[2px] rounded-[1px] whitespace-nowrap">Heading — text</div>
                </div>
                {/* Hover outline */}
                <div className="absolute top-[130px] left-[12px] right-[12px] h-[80px] border border-dashed border-[#4B57DB]/40 pointer-events-none z-[9]" />
                {/* Artboard content */}
                <div className="h-[140px] bg-gradient-to-br from-[#0C0F1D] via-[#131834] to-[#1B2654] px-[14px] pt-4 pb-3 text-white relative overflow-hidden">
                  <div className="absolute -top-8 -right-8 w-28 h-28 bg-[radial-gradient(circle,rgba(75,87,219,0.2)_0%,transparent_70%)]" />
                  <div className="font-mono text-[5px] uppercase tracking-[2px] text-white/25 mb-2">Case Study</div>
                  <div className="text-[18px] font-medium leading-[1.08] tracking-[-0.02em] mb-1">Design at the<br/>speed of thought</div>
                  <div className="text-[7px] text-white/40 font-medium">A new approach to creative tools</div>
                  <div className="absolute right-[10px] top-[10px] w-[55px] h-[75px] bg-white/[0.04] rounded-[2px] border border-white/[0.06]" />
                </div>
                <div className="px-[14px] pt-2">
                  <div className="grid grid-cols-3 gap-1 mb-2">
                    {['Taste Engine','Real Editor','Clean Export'].map(t => (
                      <div key={t} className="bg-[#FAFAF8] border border-[#EFEFEC]/50 rounded-[2px] px-1.5 py-1.5">
                        <div className="w-2.5 h-0.5 bg-[#4B57DB] rounded-[1px] mb-1" />
                        <div className="text-[5px] font-medium">{t}</div>
                      </div>
                    ))}
                  </div>
                  <div className="border-l-[1.5px] border-[#4B57DB] pl-2 py-1.5 pr-2 bg-[#EDF1FE] rounded-r-[2px] text-[6.5px] italic text-[#6B6B6B] leading-[1.5]">&ldquo;Every reference shapes the output. Your taste becomes the constraint.&rdquo;</div>
                </div>
              </div>
              {/* Bottom bar */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-[#1A1A1A] border border-[#262626]/50 rounded-[3px] px-3 py-0.5 flex items-center gap-2 h-5 z-10">
                <span className="font-mono text-[8px] text-[#777]">100%</span>
                <div className="w-px h-2 bg-[#333]" />
                <span className="font-mono text-[8px] text-[#777]">Desktop</span>
              </div>
            </div>
            {/* Inspector */}
            <div className="w-[152px] bg-[#1A1A1A] border-l border-[#262626]/50 overflow-hidden flex-shrink-0">
              <div className="flex border-b border-[#262626]/50 px-2">
                <div className="font-mono text-[7px] uppercase tracking-[1px] px-1.5 py-2 text-[#E0E0E0] font-medium border-b-[1.5px] border-[#4B57DB]">Design</div>
                <div className="font-mono text-[7px] uppercase tracking-[1px] px-1.5 py-2 text-[#555]">CSS</div>
                <div className="font-mono text-[7px] uppercase tracking-[1px] px-1.5 py-2 text-[#555]">Export</div>
              </div>
              <div className="p-2.5 pt-2">
                <HInspRule label="Size" />
                <HInspRow label="Width" value="Fill" />
                <HInspRow label="Height" value="Hug" />
                <div className="flex gap-px bg-[#222] rounded-[2px] p-0.5 mt-0.5 mb-2">
                  <div className="font-mono text-[6px] px-[5px] py-[2px] rounded-[1px] text-[#666]">Fixed</div>
                  <div className="font-mono text-[6px] px-[5px] py-[2px] rounded-[1px] bg-[#333] text-[#E0E0E0]">Fill</div>
                  <div className="font-mono text-[6px] px-[5px] py-[2px] rounded-[1px] text-[#666]">Hug</div>
                </div>
                <HInspRule label="Typography" />
                <HInspRow label="Font" value="Geist" />
                <HInspRow label="Size" value="28px" />
                <HInspRow label="Weight" value="500" />
                <HInspRow label="Tracking" value="-0.03em" />
                <div className="h-1.5" />
                <HInspRule label="Fill" />
                <div className="flex justify-between h-5 items-center">
                  <span className="text-[8px] text-[#777]">Color</span>
                  <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 bg-white border border-[#333] rounded-[1px]" />
                    <span className="font-mono text-[8px] text-[#D0D0D0]">#FFFFFF</span>
                  </div>
                </div>
                <div className="h-1.5" />
                <HInspRule label="Appearance" />
                <HInspRow label="Radius" value="0px" />
                <HInspRow label="Opacity" value="100%" />
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </section>
  );
}

function HLayerItem({ label, depth, selected }: { label: string; depth: number; selected?: boolean }) {
  const pl = 12 + depth * 10;
  return (
    <div className={`flex items-center gap-1.5 h-[24px] text-[9px] cursor-default ${selected ? 'bg-[#4B57DB]/10 text-[#D1E4FC] border-l-[1.5px] border-[#4B57DB]' : 'text-[#777]'}`} style={{ paddingLeft: pl, paddingRight: 10 }}>
      <div className={`w-2 h-2 rounded-[1px] border flex-shrink-0 ${selected ? 'border-[#4B57DB] bg-[#4B57DB]/20' : 'border-[#444]'}`} />
      {label}
    </div>
  );
}

function HInspRule({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-1">
      <div className="flex-1 h-px bg-[#2A2A2A]" />
      <span className="font-mono text-[6px] uppercase tracking-[1px] text-[#4A4A4A] whitespace-nowrap">{label}</span>
      <div className="flex-1 h-px bg-[#2A2A2A]" />
    </div>
  );
}

function HInspRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center h-[18px]">
      <span className="text-[8px] text-[#777]">{label}</span>
      <span className="font-mono text-[8px] text-[#D0D0D0]">{value}</span>
    </div>
  );
}
