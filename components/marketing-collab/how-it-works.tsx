"use client";

import { SectionRule } from "./section-rule";

export function HowItWorks() {
  return (
    <section className="py-[180px] relative scroll-mt-[72px]" id="how">
      <div className="max-w-[1120px] mx-auto px-10">
        <div className="mb-20" data-reveal>
          <SectionRule label="How it works" />
          <h2 className="text-[clamp(32px,4.5vw,52px)] font-medium tracking-[-0.02em] leading-[1.08] mt-4 text-balance">
            Three steps to
            <br />
            <span className="text-[#A0A0A0]">your design.</span>
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-0">
          {/* Step 1 */}
          <div className="pr-9 border-r border-[#EFEFEC]/50" data-reveal>
            <div className="font-mono text-[10px] text-[#4B57DB] tracking-[1px] mb-4">
              01
            </div>
            <h3 className="text-[20px] font-medium tracking-[-0.02em] mb-2.5">
              Add references
            </h3>
            <p className="text-[14px] text-[#6B6B6B] font-medium leading-[1.6] mb-7 text-pretty">
              Drag screenshots, paste URLs, or import from Pinterest. Studio OS
              scores and analyzes every image.
            </p>
            <StepVis>
              <RefItem
                color="linear-gradient(135deg,#0C0F1D,#1B2654)"
                name="Editorial homepage"
                score="97"
              />
              <RefItem
                color="linear-gradient(135deg,#F5E6D3,#C4A882)"
                name="Minimal portfolio"
                score="94"
              />
              <RefItem
                color="linear-gradient(135deg,#111,#333)"
                name="Swiss typography"
                score="91"
              />
              <div className="flex items-center gap-2 px-2.5 py-2 bg-white border border-dashed border-[#EFEFEC] rounded-[3px] opacity-50">
                <div className="w-9 h-[26px] rounded-[2px] flex-shrink-0 bg-[#F5F5F0]" />
                <span className="text-[10px] text-[#A0A0A0] flex-1">
                  Drop more...
                </span>
              </div>
            </StepVis>
          </div>

          {/* Step 2 */}
          <div className="px-9 border-r border-[#EFEFEC]/50" data-reveal>
            <div className="font-mono text-[10px] text-[#4B57DB] tracking-[1px] mb-4">
              02
            </div>
            <h3 className="text-[20px] font-medium tracking-[-0.02em] mb-2.5">
              Generate
            </h3>
            <p className="text-[14px] text-[#6B6B6B] font-medium leading-[1.6] mb-7 text-pretty">
              Studio OS extracts your taste — spacing, typography, color,
              density — and generates a design that reflects it.
            </p>
            <StepVis>
              <GenStage status="done" text="Analyzing references" label="Done" />
              <GenStage
                status="done"
                text="Extracting taste profile"
                label="Done"
              />
              <GenStage
                status="active"
                text="Composing layout"
                label="Working"
              />
              <GenStage
                status="pending"
                text="Rendering design"
                label="Pending"
              />
              <GenStage
                status="pending"
                text="Validating fidelity"
                label="Pending"
              />
            </StepVis>
          </div>

          {/* Step 3 */}
          <div className="pl-9" data-reveal>
            <div className="font-mono text-[10px] text-[#4B57DB] tracking-[1px] mb-4">
              03
            </div>
            <h3 className="text-[20px] font-medium tracking-[-0.02em] mb-2.5">
              Edit like a designer
            </h3>
            <p className="text-[14px] text-[#6B6B6B] font-medium leading-[1.6] mb-7 text-pretty">
              Select, resize, restyle. Real canvas feel with layout semantics,
              measurement guides, and a precision inspector.
            </p>
            <StepVis>
              <div className="flex gap-[3px] h-[170px]">
                {/* Layers */}
                <div className="w-[55px] bg-[#1A1A1A] rounded-[3px] p-1.5 overflow-hidden">
                  <EdLayer label="Page" />
                  <EdLayer label="Hero" selected />
                  <EdLayer label="Features" />
                  <EdLayer label="Quote" />
                  <EdLayer label="Footer" />
                </div>
                {/* Canvas */}
                <div className="flex-1 bg-[#FAFAF8] rounded-[3px] relative flex items-center justify-center">
                  <div
                    className="absolute inset-0 rounded-[3px]"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='21' height='21'><rect width='20' height='20' rx='1' fill='%23000' opacity='.02'/></svg>")`,
                      backgroundSize: "21px 21px",
                    }}
                  />
                  <div className="w-[110px] h-[90px] bg-white rounded-[2px] shadow-[0_1px_6px_rgba(0,0,0,0.04)] relative z-[1] overflow-hidden">
                    <div className="h-9 bg-gradient-to-br from-[#0C0F1D] to-[#1B2654]" />
                    <div className="p-1.5">
                      <div className="h-[3px] bg-[#EFEFEC] rounded-[1px] mb-[3px]" />
                      <div className="h-[3px] bg-[#EFEFEC] rounded-[1px] mb-[3px] w-[60%]" />
                      <div className="h-[3px] bg-[#EFEFEC] rounded-[1px] w-[40%]" />
                    </div>
                    <div className="absolute top-[5px] left-1.5 w-[50px] h-2.5 border border-[#4B57DB] rounded-[1px]" />
                  </div>
                </div>
                {/* Inspector */}
                <div className="w-[55px] bg-[#1A1A1A] rounded-[3px] p-1.5 overflow-hidden">
                  <div className="h-1.5 mb-[3px] bg-[#2A2A2A] rounded-[1px]" />
                  <div className="h-1.5 mb-[3px] bg-[#2A2A2A] rounded-[1px] w-[80%]" />
                  <div className="h-1.5 mb-[3px] bg-[#2A2A2A] rounded-[1px]" />
                  <div className="h-1" />
                  <div className="h-1.5 mb-[3px] bg-[#2A2A2A] rounded-[1px]" />
                  <div className="h-1.5 mb-[3px] bg-[#2A2A2A] rounded-[1px] w-[80%]" />
                  <div className="h-1.5 mb-[3px] bg-[#2A2A2A] rounded-[1px] w-[60%]" />
                  <div className="h-1" />
                  <div className="h-1.5 mb-[3px] bg-[#2A2A2A] rounded-[1px]" />
                  <div className="h-1.5 mb-[3px] bg-[#2A2A2A] rounded-[1px] w-[80%]" />
                </div>
              </div>
            </StepVis>
          </div>
        </div>
      </div>
    </section>
  );
}

function StepVis({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#FAFAF8] border border-[#EFEFEC]/50 rounded-[6px] overflow-hidden">
      <div className="flex gap-1 px-3 py-2 border-b border-[#EFEFEC]/50">
        <div className="w-1.5 h-1.5 rounded-full bg-[#E5E5E0]" />
        <div className="w-1.5 h-1.5 rounded-full bg-[#E5E5E0]" />
        <div className="w-1.5 h-1.5 rounded-full bg-[#E5E5E0]" />
      </div>
      <div className="p-3.5">{children}</div>
    </div>
  );
}

function RefItem({
  color,
  name,
  score,
}: {
  color: string;
  name: string;
  score: string;
}) {
  return (
    <div className="flex items-center gap-2 px-2.5 py-2 bg-white border border-[#EFEFEC]/50 rounded-[3px] mb-1.5 last:mb-0">
      <div
        className="w-9 h-[26px] rounded-[2px] flex-shrink-0"
        style={{ background: color }}
      />
      <span className="text-[10px] text-[#6B6B6B] flex-1">{name}</span>
      <span className="font-mono text-[9px] text-[#4B57DB] bg-[#EDF1FE] px-1.5 py-0.5 rounded-[2px]">
        {score}
      </span>
    </div>
  );
}

function GenStage({
  status,
  text,
  label,
}: {
  status: "done" | "active" | "pending";
  text: string;
  label: string;
}) {
  const dotColor =
    status === "done"
      ? "bg-[#22C55E]"
      : status === "active"
        ? "bg-[#4B57DB] animate-[pulse_1.5s_infinite]"
        : "bg-[#E5E5E0]";
  const statusColor =
    status === "done"
      ? "text-[#22C55E]"
      : status === "active"
        ? "text-[#4B57DB]"
        : "text-[#A0A0A0]";

  return (
    <div className="flex items-center gap-2.5 px-2.5 py-2 bg-white border border-[#EFEFEC]/50 rounded-[3px] mb-1.5 last:mb-0">
      <div className={`w-[7px] h-[7px] rounded-full flex-shrink-0 ${dotColor}`} />
      <span className="text-[10px] text-[#6B6B6B] flex-1">{text}</span>
      <span
        className={`font-mono text-[8px] uppercase tracking-[0.5px] ${statusColor}`}
      >
        {label}
      </span>
    </div>
  );
}

function EdLayer({ label, selected }: { label: string; selected?: boolean }) {
  return (
    <div
      className={`text-[6px] px-1 py-0.5 h-3.5 rounded-[1px] mb-px flex items-center ${
        selected
          ? "bg-[#4B57DB]/[0.12] text-[#D1E4FC]"
          : "text-[#777]"
      }`}
    >
      {label}
    </div>
  );
}
