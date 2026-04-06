"use client";

import { SectionRule } from "./section-rule";

export function Gallery() {
  return (
    <section className="py-[180px] relative" id="output">
      <div className="max-w-[1120px] mx-auto px-10">
        <div className="text-center mb-[72px]">
          <SectionRule label="Output quality" />
          <h2 className="text-[clamp(32px,4.5vw,52px)] font-medium tracking-[-0.02em] leading-[1.08] mt-4 text-balance">
            One tool.
            <br />
            Every taste.
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Editorial */}
          <GalCard tag="Editorial" desc="From 3 dark editorial magazine references">
            <div className="h-[58%] bg-gradient-to-br from-[#0C0F1D] to-[#1B2654] p-3.5">
              <div className="font-mono text-[5px] uppercase tracking-[2px] text-white/25 mb-2">
                Issue 01
              </div>
              <div className="text-[15px] text-white leading-[1.1]">
                Design at the
                <br />
                speed of thought
              </div>
            </div>
            <div className="px-3.5 py-2">
              <div className="h-[3px] bg-[#EFEFEC] rounded-[1px] mb-1 w-[70%]" />
              <div className="h-[3px] bg-[#EFEFEC] rounded-[1px] w-[45%]" />
            </div>
          </GalCard>

          {/* Warm Minimal */}
          <GalCard tag="Warm Minimal" desc="From a Scandinavian portfolio site">
            <div className="h-[50%] bg-[#F5E6D3] p-3.5 flex flex-col justify-end">
              <div className="text-[14px] text-[#3D2B1F] leading-[1.15]">
                Craft &amp;
                <br />
                Simplicity
              </div>
            </div>
            <div className="px-3.5 py-2">
              <div className="grid grid-cols-2 gap-1">
                <div className="h-7 bg-[#F5E6D3] rounded-[2px] opacity-40" />
                <div className="h-7 bg-[#F5E6D3] rounded-[2px] opacity-40" />
              </div>
            </div>
          </GalCard>

          {/* Brutalist */}
          <GalCard tag="Brutalist" desc="From 3 brutalist web references">
            <div className="h-[55%] bg-[#FF3B30] p-3.5 flex flex-col justify-end">
              <div className="text-[17px] font-bold text-white tracking-[-0.04em] leading-none uppercase">
                BREAK
                <br />
                RULES
              </div>
            </div>
            <div className="px-3.5 py-2 bg-[#111]">
              <div className="h-[3px] bg-[#333] mb-1 w-[70%]" />
            </div>
          </GalCard>

          {/* Clean SaaS */}
          <GalCard tag="Clean SaaS" desc="From a gradient SaaS landing page">
            <div className="h-[45%] bg-gradient-to-br from-[#667eea] to-[#764ba2] p-3.5 text-center flex flex-col items-center justify-center">
              <div className="text-[12px] font-medium text-white tracking-[-0.02em]">
                Ship faster.
                <br />
                Build better.
              </div>
              <div className="inline-block bg-white text-[#667eea] text-[7px] font-medium px-2.5 py-[3px] rounded-[3px] mt-2">
                Get Started
              </div>
            </div>
            <div className="px-3.5 py-2">
              <div className="grid grid-cols-3 gap-[3px]">
                <div className="h-6 bg-[#FAFAF8] border border-[#EFEFEC]/50 rounded-[2px]" />
                <div className="h-6 bg-[#FAFAF8] border border-[#EFEFEC]/50 rounded-[2px]" />
                <div className="h-6 bg-[#FAFAF8] border border-[#EFEFEC]/50 rounded-[2px]" />
              </div>
            </div>
          </GalCard>

          {/* Dark Portfolio */}
          <GalCard
            tag="Dark Portfolio"
            desc="From a photographer's folio site"
            dark
          >
            <div className="h-[65%] bg-[#1A1A1A] flex items-end p-2.5">
              <div className="text-[10px] text-[#666] tracking-[0.02em]">
                Selected works
                <br />
                2024–2026
              </div>
            </div>
            <div className="px-2.5 py-2 bg-[#111]">
              <div className="flex gap-[3px]">
                <div className="w-6 h-6 bg-[#222] rounded-[2px]" />
                <div className="w-6 h-6 bg-[#222] rounded-[2px]" />
                <div className="w-6 h-6 bg-[#222] rounded-[2px]" />
                <div className="w-6 h-6 bg-[#222] rounded-[2px]" />
              </div>
            </div>
          </GalCard>

          {/* Swiss */}
          <GalCard tag="Swiss" desc="From International Typographic Style refs">
            <div className="h-[40%] bg-white p-3.5 border-b-2 border-[#111] flex flex-col justify-end">
              <div className="text-[15px] font-semibold text-[#111] tracking-[-0.03em] leading-none">
                Form
                <br />
                follows
                <br />
                function
              </div>
            </div>
            <div className="px-3.5 py-2">
              <div className="h-[3px] bg-[#111] mb-[5px] w-[70%]" />
              <div className="h-[3px] bg-[#111] mb-[5px] w-[40%]" />
              <div className="h-[3px] w-5 bg-[#4B57DB] mt-1.5" />
            </div>
          </GalCard>
        </div>
      </div>
    </section>
  );
}

function GalCard({
  tag,
  desc,
  dark,
  children,
}: {
  tag: string;
  desc: string;
  dark?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="border border-[#EFEFEC]/50 rounded-[6px] overflow-hidden bg-white cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.22,1.0,0.36,1.0)] hover:border-[#4B57DB]/25 hover:-translate-y-1 active:-translate-y-px active:scale-[0.99]"
      data-reveal=""
    >
      <div className="h-[220px] p-4 bg-[#FAFAF8]">
        <div
          className={`h-full rounded-[3px] overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.03)] ${
            dark ? "bg-[#111]" : "bg-white"
          }`}
        >
          {children}
        </div>
      </div>
      <div className="px-4 py-3.5">
        <div className="inline-block font-mono text-[9px] uppercase tracking-[1px] text-[#4B57DB] bg-[#EDF1FE] px-2 py-[3px] rounded-[2px] mb-1.5">
          {tag}
        </div>
        <p className="text-[12px] text-[#6B6B6B] font-medium">{desc}</p>
      </div>
    </div>
  );
}
