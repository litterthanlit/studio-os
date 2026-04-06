"use client";

import { SectionRule } from "./section-rule";

export function EditorShowcase() {
  return (
    <section className="py-[180px] bg-[#FAFAF8]" id="editor">
      <div className="max-w-[1120px] mx-auto px-10">
        <div className="mb-14" data-reveal>
          <SectionRule label="The editor" />
          <h2 className="text-[clamp(32px,4.5vw,52px)] font-medium tracking-[-0.02em] leading-[1.08] mt-4 text-balance">
            A real design tool.
            <br />
            <span className="text-[#A0A0A0]">Not a preview pane.</span>
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Card 1: Canvas Feel */}
          <div
            className="bg-white border border-[#EFEFEC]/50 rounded-[6px] overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.22,1.0,0.36,1.0)] hover:border-[#4B57DB]/20 hover:-translate-y-1"
            data-reveal
          >
            <div className="h-[220px] bg-[#1A1A1A] flex items-center justify-center relative overflow-hidden">
              <div className="w-[75%] h-[75%] bg-[#FAFAF8] rounded-[3px] relative">
                <div
                  className="absolute inset-0 rounded-[3px]"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='21' height='21'><rect width='20' height='20' rx='1' fill='%23000' opacity='.02'/></svg>")`,
                    backgroundSize: "21px 21px",
                  }}
                />
                <div className="absolute top-6 left-8 w-[130px] h-[90px] bg-white rounded-[2px] z-[1] shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
                  <div className="absolute -top-3.5 left-0 font-mono text-[7px] text-[#4B57DB]">
                    Hero — frame
                  </div>
                </div>
                <div className="absolute top-11 left-[100px] w-[90px] h-11 border border-dashed border-[#4B57DB]/45" />
                <div className="absolute top-[60px] left-[164px] w-px h-[18px] bg-[#E040FB]" />
                <div className="absolute top-[65px] left-[170px] bg-[#E040FB] text-white font-mono text-[6px] px-1 py-px rounded-[1px]">
                  24px
                </div>
              </div>
            </div>
            <div className="px-[22px] py-5">
              <h3 className="text-[15px] font-medium mb-1.5">Canvas feel</h3>
              <p className="text-[13px] text-[#6B6B6B] font-medium leading-[1.5] text-pretty">
                Hover outlines, frame labels, measurement guides, smooth zoom.
                It feels like the tools you already use.
              </p>
            </div>
          </div>

          {/* Card 2: Inspector */}
          <div
            className="bg-white border border-[#EFEFEC]/50 rounded-[6px] overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.22,1.0,0.36,1.0)] hover:border-[#4B57DB]/20 hover:-translate-y-1"
            data-reveal
          >
            <div className="h-[220px] bg-[#1A1A1A] flex items-center justify-center relative overflow-hidden">
              <div className="w-[65%]">
                <div className="mb-2">
                  <DarkInspRule label="Size" />
                  <DarkInspRow label="Width" value="Fill" />
                  <DarkInspRow label="Height" value="Hug" />
                  <div className="flex gap-px bg-[#222] rounded-[2px] p-0.5 mt-1">
                    <div className="font-mono text-[7px] px-1.5 py-0.5 rounded-[1px] text-[#666]">
                      Fixed
                    </div>
                    <div className="font-mono text-[7px] px-1.5 py-0.5 rounded-[1px] bg-[#333] text-[#E0E0E0]">
                      Fill
                    </div>
                    <div className="font-mono text-[7px] px-1.5 py-0.5 rounded-[1px] text-[#666]">
                      Hug
                    </div>
                  </div>
                </div>
                <div className="mb-2">
                  <DarkInspRule label="Typography" />
                  <DarkInspRow label="Font" value="Geist Sans" />
                  <DarkInspRow label="Weight" value="500" />
                  <DarkInspRow label="Size" value="28px" />
                  <DarkInspRow label="Tracking" value="-0.03em" />
                </div>
              </div>
            </div>
            <div className="px-[22px] py-5">
              <h3 className="text-[15px] font-medium mb-1.5">
                Precision inspector
              </h3>
              <p className="text-[13px] text-[#6B6B6B] font-medium leading-[1.5] text-pretty">
                Fixed / Fill / Hug sizing, typography, spacing, and fill — all
                in a two-column key-value layout the AI understands.
              </p>
            </div>
          </div>

          {/* Card 3: Layers */}
          <div
            className="bg-white border border-[#EFEFEC]/50 rounded-[6px] overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.22,1.0,0.36,1.0)] hover:border-[#4B57DB]/20 hover:-translate-y-1"
            data-reveal
          >
            <div className="h-[220px] bg-[#1A1A1A] flex items-center justify-center relative overflow-hidden">
              <div className="w-[55%]">
                <div className="font-mono text-[7px] uppercase tracking-[1px] text-[#555] pb-1.5 border-b border-[#2A2A2A]/50 mb-1">
                  Layers
                </div>
                <ScLayerItem label="Page" depth={0} />
                <ScLayerItem label="Hero Section" depth={1} />
                <ScLayerItem label="Heading" depth={2} selected />
                <ScLayerItem label="Subtitle" depth={2} />
                <ScLayerItem label="Cover Image" depth={2} />
                <ScLayerItem label="Features Grid" depth={1} />
                <ScLayerItem label="Card 1" depth={2} />
                <ScLayerItem label="Card 2" depth={2} />
              </div>
            </div>
            <div className="px-[22px] py-5">
              <h3 className="text-[15px] font-medium mb-1.5">
                Component hierarchy
              </h3>
              <p className="text-[13px] text-[#6B6B6B] font-medium leading-[1.5] text-pretty">
                Clean tree structure, drag reorder, multi-select. See exactly
                what was generated and restructure it.
              </p>
            </div>
          </div>

          {/* Card 4: Layout Semantics */}
          <div
            className="bg-white border border-[#EFEFEC]/50 rounded-[6px] overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.22,1.0,0.36,1.0)] hover:border-[#4B57DB]/20 hover:-translate-y-1"
            data-reveal
          >
            <div className="h-[220px] bg-[#FAFAF8] flex items-center justify-center relative overflow-hidden">
              <div className="text-center">
                <div className="flex gap-7 items-end justify-center mb-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center w-[72px] h-[72px] bg-white rounded-[4px] border-[1.5px] border-[#4B57DB] font-mono text-[11px] text-[#4B57DB] mb-1.5">
                      Fill
                    </div>
                    <div className="text-[10px] text-[#A0A0A0]">Stretches</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center w-[52px] h-[52px] bg-white rounded-[4px] border border-[#E5E5E0] font-mono text-[11px] text-[#6B6B6B] mb-1.5">
                      Hug
                    </div>
                    <div className="text-[10px] text-[#A0A0A0]">Wraps</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center w-[62px] h-[62px] bg-white rounded-[4px] border border-[#E5E5E0] font-mono text-[11px] text-[#6B6B6B] mb-1.5">
                      Fixed
                    </div>
                    <div className="text-[10px] text-[#A0A0A0]">Exact</div>
                  </div>
                </div>
                <div className="font-mono text-[9px] text-[#A0A0A0] tracking-[0.5px]">
                  Layout semantics the AI understands
                </div>
              </div>
            </div>
            <div className="px-[22px] py-5">
              <h3 className="text-[15px] font-medium mb-1.5">
                Layout semantics
              </h3>
              <p className="text-[13px] text-[#6B6B6B] font-medium leading-[1.5] text-pretty">
                Fill, Hug, and Fixed sizing — not just pixels. The AI generates
                with these constraints, and you edit with them.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DarkInspRule({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-1.5">
      <div className="flex-1 h-px bg-[#2A2A2A]" />
      <span className="font-mono text-[7px] uppercase tracking-[1px] text-[#4A4A4A] whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-[#2A2A2A]" />
    </div>
  );
}

function DarkInspRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between h-5 items-center">
      <span className="text-[9px] text-[#777]">{label}</span>
      <span className="font-mono text-[9px] text-[#D0D0D0]">{value}</span>
    </div>
  );
}

function ScLayerItem({
  label,
  depth,
  selected,
}: {
  label: string;
  depth: number;
  selected?: boolean;
}) {
  const pl = depth * 14;
  return (
    <div
      className={`flex items-center gap-[5px] py-[3px] px-1.5 text-[8px] h-[22px] ${
        selected
          ? "bg-[#4B57DB]/10 text-[#D1E4FC] border-l-[1.5px] border-[#4B57DB]"
          : "text-[#777]"
      }`}
      style={{ paddingLeft: pl + 6 }}
    >
      <div
        className={`w-2 h-2 border rounded-[1px] ${
          selected ? "border-[#4B57DB]" : "border-[#444]"
        }`}
      />
      {label}
    </div>
  );
}
