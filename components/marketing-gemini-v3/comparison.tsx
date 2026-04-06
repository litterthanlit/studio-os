"use client";

import { SectionRule } from "./section-rule";

export function Comparison() {
  return (
    <section className="py-[180px] bg-[#FAFAF8] relative" id="comparison">
      <div className="max-w-[1120px] mx-auto px-10">
        <div className="text-center mb-[72px]" data-reveal>
          <SectionRule label="The difference" />
          <h2 className="text-[clamp(36px,5vw,56px)] font-['Bespoke_Serif'] font-medium tracking-[-0.02em] leading-[1.08] mt-4 text-balance">
            Same prompt.
            <br />
            Different taste.
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_40px_1fr] max-w-[1040px] mx-auto px-10">
        {/* Generic Side */}
        <div
          className="rounded-[6px] overflow-hidden border border-[#EFEFEC]/50 bg-white opacity-75 saturate-[0.3]"
          data-reveal
        >
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#EFEFEC]/50">
            <div className="w-[5px] h-[5px] rounded-[6px] bg-[#A0A0A0]" />
            <span className="font-mono text-[10px] uppercase tracking-[1px] font-mono text-[#A0A0A0]">
              Any AI tool
            </span>
          </div>
          <div className="p-5 min-h-[340px]">
            <div className="bg-[#F0F1F3] rounded-[4px] px-5 py-7 text-center mb-3">
              <h3 className="text-[15px] font-medium text-[#4B5563] mb-1.5">
                Welcome to Our Platform
              </h3>
              <p className="text-[10px] text-[#9CA3AF]">
                The best solution for your needs
              </p>
              <div className="inline-block bg-[#4B5563] text-white text-[9px] px-3.5 py-[5px] rounded-[4px] mt-2.5">
                Get Started
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5 mb-3">
              <GenericCard title="Feature One" desc="Lorem ipsum dolor sit amet." />
              <GenericCard title="Feature Two" desc="Adipiscing elit sed do." />
              <GenericCard title="Feature Three" desc="Incididunt ut labore et." />
            </div>
            <div className="h-1.5 bg-[#E5E7EB] rounded-[1px] mb-1 w-[70%]" />
            <div className="h-1.5 bg-[#E5E7EB] rounded-[1px] w-[50%]" />
          </div>
        </div>

        {/* VS divider */}
        <div className="flex items-center justify-center">
          <span className="font-mono text-[10px] text-[#E5E5E0] [writing-mode:vertical-rl] tracking-[3px] uppercase">
            vs
          </span>
        </div>

        {/* Taste Side */}
        <div
          className="rounded-[6px] overflow-hidden border border-[#1E5DF2] bg-white shadow-[0_8px_40px_rgba(75,87,219,0.06)]"
          data-reveal
        >
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1E5DF2]/[0.12]">
            <div className="w-[5px] h-[5px] rounded-[6px] bg-[#1E5DF2]" />
            <span className="font-mono text-[10px] uppercase tracking-[1px] font-mono text-[#1E5DF2]">
              Studio OS
            </span>
          </div>
          <div className="p-5 min-h-[340px]">
            <div className="bg-gradient-to-br from-[#0C0F1D] via-[#131834] to-[#1B2654] rounded-[4px] px-5 py-7 mb-3 relative overflow-hidden">
              <div className="absolute -top-5 -right-5 w-[100px] h-[100px] bg-[radial-gradient(circle,rgba(75,87,219,0.25),transparent_70%)]" />
              <div className="font-mono text-[6px] uppercase tracking-[2px] text-white/25 mb-2.5">
                Case Study
              </div>
              <h3 className="text-[18px] font-medium text-white tracking-[-0.02em] leading-[1.1] mb-1.5">
                Design at the
                <br />
                speed of thought
              </h3>
              <p className="text-[9px] text-white/35 font-medium">
                A new approach to creative tools
              </p>
              <div className="inline-block bg-white text-[#0C0F1D] text-[9px] font-medium px-4 py-1.5 rounded-[3px] mt-3.5 tracking-[-0.01em]">
                Explore the work
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5 mb-3">
              <TasteCard title="Taste Engine" desc="Extract patterns from refs" />
              <TasteCard title="Real Editor" desc="Canvas feel, deep tools" />
              <TasteCard title="Clean Export" desc="HTML + Tailwind" />
            </div>
            <div className="border-l-2 border-[#1E5DF2] pl-3 py-2 pr-3 bg-[#EDF1FE] rounded-r-[3px] text-[9px] italic text-[#6B6B6B] leading-[1.5]">
              &ldquo;Every reference shapes the output.&rdquo;
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1120px] mx-auto px-10">
        <p
          className="text-center mt-12 text-[15px] text-[#6B6B6B] font-medium text-pretty"
          data-reveal
        >
          Same brief. Same prompt.{" "}
          <strong className="text-[#1A1A1A] font-medium">
            The references made the difference.
          </strong>
        </p>
      </div>
    </section>
  );
}

function GenericCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-[4px] p-2.5">
      <div className="w-4 h-4 bg-[#D1D5DB] rounded-[6px] mb-1.5" />
      <h4 className="text-[8px] font-medium text-[#6B7280] mb-[3px]">
        {title}
      </h4>
      <p className="text-[6px] text-[#9CA3AF] leading-[1.4]">{desc}</p>
    </div>
  );
}

function TasteCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="bg-[#FAFAF8] border border-[#EFEFEC]/50 rounded-[3px] px-2 py-2.5">
      <div className="w-3.5 h-0.5 bg-[#1E5DF2] rounded-[1px] mb-2" />
      <h4 className="text-[8px] font-medium mb-[3px]">{title}</h4>
      <p className="text-[6px] text-[#A0A0A0] leading-[1.5]">{desc}</p>
    </div>
  );
}
