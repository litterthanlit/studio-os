"use client";

import { SectionRule } from "./section-rule";

export function ExportSection() {
  return (
    <section className="py-[180px] bg-[#FAFAF8]" id="export">
      <div className="max-w-[1120px] mx-auto px-10">
        <div className="grid grid-cols-[1fr_1.1fr] gap-14 items-center">
          {/* Text */}
          <div data-reveal>
            <SectionRule label="Export" />
            <h2 className="text-[clamp(36px,5vw,56px)] font-['Bespoke_Serif'] font-medium tracking-[-0.02em] leading-[1.1] mb-3.5 mt-4 text-balance">
              Real code.
              <br />
              Not a proprietary format.
            </h2>
            <p className="text-[15px] text-[#6B6B6B] font-medium leading-[1.6] text-pretty">
              Copy clean HTML with inline styles. Paste into any project. No
              vendor lock-in, no framework dependency.
            </p>
          </div>

          {/* Code Block */}
          <div
            className="bg-[#0D0D0D] rounded-[6px] overflow-hidden border border-[#2A2A2A]/50"
            data-reveal
          >
            <div className="flex items-center gap-1 px-3.5 py-2.5 border-b border-[#222]/50 bg-[#141414]">
              <div className="w-1.5 h-1.5 rounded-[6px] bg-[#333]" />
              <div className="w-1.5 h-1.5 rounded-[6px] bg-[#333]" />
              <div className="w-1.5 h-1.5 rounded-[6px] bg-[#333]" />
              <span className="ml-auto font-mono text-[10px] text-[#1E5DF2] cursor-pointer">
                Copy HTML
              </span>
            </div>
            <div className="p-5 font-mono text-[11px] leading-[1.7] text-[#777] overflow-x-auto whitespace-pre">
              <span className="text-[#E06C75]">&lt;section</span>{" "}
              <span className="text-[#D19A66]">style</span>=
              <span className="text-[#98C379]">
                &quot;padding: 64px 32px;
                <br />
                {"  "}background: linear-gradient(168deg,
                <br />
                {"    "}#0C0F1D, #1B2654);&quot;
              </span>
              <span className="text-[#E06C75]">&gt;</span>
              <br />
              {"  "}
              <span className="text-[#E06C75]">&lt;p</span>{" "}
              <span className="text-[#D19A66]">style</span>=
              <span className="text-[#98C379]">
                &quot;font-size: 10px;
                <br />
                {"    "}text-transform: uppercase;
                <br />
                {"    "}letter-spacing: 2px;
                <br />
                {"    "}color: rgba(255,255,255,0.3);&quot;
              </span>
              <span className="text-[#E06C75]">&gt;</span>
              <br />
              {"    "}
              <span className="text-[#ABB2BF]">Case Study</span>
              <br />
              {"  "}
              <span className="text-[#E06C75]">&lt;/p&gt;</span>
              <br />
              {"  "}
              <span className="text-[#E06C75]">&lt;h1</span>{" "}
              <span className="text-[#D19A66]">style</span>=
              <span className="text-[#98C379]">
                &quot;font-size: 48px;
                <br />
                {"    "}font-weight: 500;
                <br />
                {"    "}letter-spacing: -0.03em;
                <br />
                {"    "}color: white;&quot;
              </span>
              <span className="text-[#E06C75]">&gt;</span>
              <br />
              {"    "}
              <span className="text-[#ABB2BF]">
                Design at the speed of thought
              </span>
              <br />
              {"  "}
              <span className="text-[#E06C75]">&lt;/h1&gt;</span>
              <br />
              <span className="text-[#E06C75]">&lt;/section&gt;</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
