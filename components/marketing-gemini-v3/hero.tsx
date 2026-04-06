"use client";

export function Hero() {
  return (
    <section
      className="flex flex-col items-center pt-[100px] px-10 pb-0 text-center relative overflow-hidden"
      id="hero"
    >
      {/* Content */}
      <div className="relative z-[2] flex flex-col items-center">
        <div
          className="inline-flex items-center gap-2 px-3.5 py-[5px] rounded-[6px] border border-[#EFEFEC]/50 bg-white font-mono text-[10px] uppercase tracking-[1px] font-mono text-[#A0A0A0] mb-6"
          data-reveal="hero"
        >
          <div className="w-[5px] h-[5px] rounded-[6px] bg-[#1E5DF2] animate-[pulse_2.5s_ease-in-out_infinite]" />
          Now in early access
        </div>

        <h1
          className="text-[clamp(36px,5vw,56px)] font-['Bespoke_Serif'] font-medium tracking-[-0.04em] leading-[1.05] mb-3.5 max-w-[600px] text-balance"
          data-reveal="hero"
        >
          AI that designs
          <br />
          like <span className="text-[#1E5DF2]">you</span>.
        </h1>

        <p
          className="text-[15px] font-light text-[#6B6B6B] leading-[1.55] max-w-[460px] mb-7 text-balance"
          data-reveal="hero"
        >
          Feed Studio OS your references. It extracts your design sensibility
          and generates pages that look like yours — not like everyone
          else&apos;s.
        </p>

        <div className="flex gap-3 items-center" data-reveal="hero">
          <button className="text-[13px] font-medium text-white bg-[#1A1A1A] px-6 py-[11px] rounded-[4px] border-none cursor-pointer no-underline transition-all duration-150 tracking-[-0.01em] hover:bg-[#333] hover:scale-[1.02] active:scale-[0.97]">
            Start designing
          </button>
          <a
            className="text-[13px] font-medium text-[#6B6B6B] px-5 py-[11px] border-none bg-none cursor-pointer no-underline transition-colors duration-150 inline-flex items-center gap-1.5 hover:text-[#1A1A1A] group"
            href="#how"
          >
            See how it works
            <span className="text-[14px] transition-transform duration-150 group-hover:translate-x-[3px]">
              &rarr;
            </span>
          </a>
        </div>
      </div>

      {/* Product Shot */}
      <div
        className="relative z-[2] mt-10 w-full max-w-[1200px] px-5"
        data-reveal
      >
        <div className="rounded-[6px] border border-black/[0.08] overflow-hidden shadow-[0_0_0_0.5px_rgba(0,0,0,0.04),0_32px_100px_-20px_rgba(0,0,0,0.12),0_8px_24px_-8px_rgba(0,0,0,0.04)]">
          {/* Browser Chrome */}
          <div className="flex items-center gap-1.5 px-4 py-2.5 bg-[#F5F5F5] border-b border-black/[0.06]">
            <div className="w-2.5 h-2.5 rounded-[6px] bg-[#FF5F56]" />
            <div className="w-2.5 h-2.5 rounded-[6px] bg-[#FEBC2E]" />
            <div className="w-2.5 h-2.5 rounded-[6px] bg-[#27C840]" />
            <div className="ml-3 flex items-center gap-1.5 bg-white border border-black/[0.06] rounded-[4px] px-2.5 py-[3px] font-mono text-[10px] text-[#A0A0A0]">
              <div className="w-1 h-1 rounded-[6px] bg-[#1E5DF2]" />
              studio-os.app
            </div>
          </div>

          {/* Editor Body */}
          <div className="flex h-[560px] bg-[#141414]">
            {/* Mini Rail */}
            <div className="w-[44px] bg-[#1A1A1A] border-r border-[#262626]/50 flex flex-col items-center pt-3.5 pb-3.5 gap-3.5">
              <div className="w-[22px] h-[22px] bg-[#1E5DF2] rounded-[4px] flex items-center justify-center text-[11px] font-medium text-white">
                S
              </div>
              <div className="w-3.5 h-3.5 rounded-[2px] bg-[#1E5DF2] opacity-90" />
              <div className="w-3.5 h-3.5 rounded-[2px] bg-[#333]" />
              <div className="w-3.5 h-3.5 rounded-[2px] bg-[#333]" />
              <div className="flex-1" />
              <div className="w-3.5 h-3.5 rounded-[2px] bg-[#333]" />
            </div>

            {/* Layers Panel */}
            <div className="w-[200px] bg-[#1A1A1A] border-r border-[#262626]/50 overflow-hidden">
              <div className="font-mono text-[9px] uppercase tracking-[1px] font-mono text-[#555] px-3.5 pt-3 pb-2 border-b border-[#262626]/50">
                Layers
              </div>
              <LayerItem label="Page" depth={0} />
              <LayerItem label="Hero Section" depth={1} />
              <LayerItem label="Heading" depth={2} selected />
              <LayerItem label="Subtitle" depth={2} />
              <LayerItem label="Cover Image" depth={2} />
              <LayerItem label="Features Grid" depth={1} />
              <LayerItem label="Card 1" depth={2} />
              <LayerItem label="Card 2" depth={2} />
              <LayerItem label="Card 3" depth={2} />
              <LayerItem label="Quote Block" depth={1} />
            </div>

            {/* Canvas */}
            <div className="flex-1 bg-[#FAFAF8] relative flex items-center justify-center">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='21' height='21'><rect width='20' height='20' rx='1' fill='%23000' opacity='.02'/></svg>")`,
                  backgroundSize: "21px 21px",
                }}
              />
              {/* Artboard */}
              <div className="w-[520px] h-[460px] bg-white rounded-[2px] relative z-[1] shadow-[0_1px_20px_rgba(0,0,0,0.05)] overflow-hidden">
                <div className="absolute -top-[18px] left-0 font-mono text-[9px] text-[#1E5DF2] tracking-[0.5px]">
                  Desktop — 1440
                </div>
                {/* Selection outline */}
                <div className="absolute top-8 left-[22px] w-[200px] h-[30px] border-[1.5px] border-[#1E5DF2] pointer-events-none z-10">
                  <div className="absolute -top-4 -left-px bg-[#1E5DF2] text-white font-mono text-[8px] px-[5px] py-px rounded-[2px] whitespace-nowrap">
                    Heading — text
                  </div>
                </div>
                {/* Hover outline */}
                <div className="absolute top-[172px] left-[22px] right-[22px] h-[115px] border border-dashed border-[#1E5DF2]/45 pointer-events-none z-[9]" />

                {/* Artboard Content — Editorial */}
                <div className="h-[200px] bg-gradient-to-br from-[#0C0F1D] via-[#131834] to-[#1B2654] px-[22px] pt-6 pb-4 text-white relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-[radial-gradient(circle,rgba(75,87,219,0.2)_0%,transparent_70%)]" />
                  <div className="font-mono text-[7px] uppercase tracking-[2px] text-white/30 mb-3.5">
                    Case Study
                  </div>
                  <div className="text-[26px] font-medium leading-[1.08] tracking-[-0.02em] mb-2">
                    Design at the
                    <br />
                    speed of thought
                  </div>
                  <div className="text-[9px] text-white/40 font-medium">
                    A new approach to creative tools
                  </div>
                  {/* Image placeholder */}
                  <div className="absolute right-[18px] top-[18px] w-[110px] h-[130px] bg-white/[0.04] rounded-[3px] border border-white/[0.06] overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(75,87,219,0.15)_0%,transparent_50%),radial-gradient(circle_at_70%_60%,rgba(75,87,219,0.1)_0%,transparent_50%)]" />
                  </div>
                </div>

                {/* Artboard Body */}
                <div className="px-[22px] pt-3.5">
                  <div className="grid grid-cols-3 gap-2 mb-3.5">
                    <ArtCard title="Taste Engine" desc="Extract design patterns from any reference" />
                    <ArtCard title="Real Editor" desc="Canvas feel with deep manipulation" />
                    <ArtCard title="Clean Export" desc="Copy HTML with inline Tailwind" />
                  </div>
                  <blockquote className="border-l-2 border-[#1E5DF2] pl-3.5 py-2.5 pr-3.5 bg-[#EDF1FE] rounded-r-[3px] text-[10px] italic text-[#6B6B6B] leading-[1.5]">
                    &ldquo;Every reference shapes the output. Your taste becomes
                    the constraint.&rdquo;
                  </blockquote>
                </div>
              </div>

              {/* Bottom Bar */}
              <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 bg-[#1A1A1A] border border-[#262626]/50 rounded-[4px] px-3.5 py-1 flex items-center gap-2.5 h-7 z-10">
                <span className="font-mono text-[10px] text-[#777]">100%</span>
                <div className="w-px h-3 bg-[#333]" />
                <span className="font-mono text-[10px] text-[#777]">
                  Desktop
                </span>
                <div className="w-px h-3 bg-[#333]" />
                <span className="font-mono text-[10px] text-[#777]">
                  &#x21A9;
                </span>
                <span className="font-mono text-[10px] text-[#777]">
                  &#x21AA;
                </span>
              </div>
            </div>

            {/* Inspector */}
            <div className="w-[220px] bg-[#1A1A1A] border-l border-[#262626]/50 overflow-hidden">
              <div className="flex border-b border-[#262626]/50 px-3">
                <div className="font-mono text-[9px] uppercase tracking-[1px] font-mono px-2 py-2.5 text-[#E0E0E0] font-medium border-b-[1.5px] border-[#1E5DF2]">
                  Design
                </div>
                <div className="font-mono text-[9px] uppercase tracking-[1px] font-mono px-2 py-2.5 text-[#555]">
                  CSS
                </div>
                <div className="font-mono text-[9px] uppercase tracking-[1px] font-mono px-2 py-2.5 text-[#555]">
                  Export
                </div>
              </div>
              <div className="p-3.5 pt-3">
                <InspRule label="Size" />
                <InspRow label="Width" value="Fill" />
                <InspRow label="Height" value="Hug" />
                <div className="flex gap-px bg-[#222] rounded-[3px] p-0.5 mt-1">
                  <div className="font-mono text-[8px] px-[7px] py-[3px] rounded-[2px] text-[#666]">
                    Fixed
                  </div>
                  <div className="font-mono text-[8px] px-[7px] py-[3px] rounded-[2px] bg-[#333] text-[#E0E0E0]">
                    Fill
                  </div>
                  <div className="font-mono text-[8px] px-[7px] py-[3px] rounded-[2px] text-[#666]">
                    Hug
                  </div>
                </div>
                <div className="h-2.5" />
                <InspRule label="Typography" />
                <InspRow label="Font" value="Geist Sans" />
                <InspRow label="Weight" value="500" />
                <InspRow label="Size" value="28" unit="px" />
                <InspRow label="Leading" value="1.1" />
                <InspRow label="Tracking" value="-0.03" unit="em" />
                <div className="h-2.5" />
                <InspRule label="Fill" />
                <div className="flex justify-between items-center h-6">
                  <span className="text-[10px] text-[#777]">Color</span>
                  <div className="flex items-center gap-[5px]">
                    <div className="w-3 h-3 bg-white border border-[#333] rounded-[2px]" />
                    <span className="font-mono text-[10px] font-medium text-[#D0D0D0]">
                      #FFFFFF
                    </span>
                  </div>
                </div>
                <div className="h-2.5" />
                <InspRule label="Appearance" />
                <InspRow label="Radius" value="0" unit="px" />
                <InspRow label="Opacity" value="100" unit="%" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function LayerItem({
  label,
  depth,
  selected,
}: {
  label: string;
  depth: number;
  selected?: boolean;
}) {
  const pl = 14 + depth * 12;
  return (
    <div
      className={`flex items-center gap-[7px] h-7 text-[11px] cursor-default ${
        selected
          ? "bg-[#1E5DF2]/10 text-[#D1E4FC] border-l-[1.5px] border-[#1E5DF2]"
          : "text-[#777]"
      }`}
      style={{ paddingLeft: pl, paddingRight: 14 }}
    >
      <div
        className={`w-2.5 h-2.5 rounded-[2px] border flex-shrink-0 ${
          selected
            ? "border-[#1E5DF2] bg-[#1E5DF2]/20"
            : "border-[#444]"
        }`}
      />
      {label}
    </div>
  );
}

function ArtCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="bg-[#FAFAF8] border border-[#EFEFEC]/50 rounded-[3px] px-2.5 pt-3 pb-3">
      <div className="w-3.5 h-0.5 bg-[#1E5DF2] rounded-[1px] mb-2" />
      <h4 className="text-[8px] font-medium mb-[3px]">{title}</h4>
      <p className="text-[6.5px] text-[#A0A0A0] leading-[1.5]">{desc}</p>
    </div>
  );
}

function InspRule({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="flex-1 h-px bg-[#2A2A2A]" />
      <span className="font-mono text-[8px] uppercase tracking-[1px] font-mono text-[#4A4A4A] whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-[#2A2A2A]" />
    </div>
  );
}

function InspRow({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div className="flex justify-between items-center h-6">
      <span className="text-[10px] text-[#777]">{label}</span>
      <span className="font-mono text-[10px] font-medium text-[#D0D0D0]">
        {value}
        {unit && (
          <span className="text-[8px] text-[#555] ml-px">{unit}</span>
        )}
      </span>
    </div>
  );
}
