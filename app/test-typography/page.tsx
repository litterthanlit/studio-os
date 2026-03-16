import * as React from "react";

const typeStyles = [
  {
    name: "Display",
    css: "text-[32px] leading-[40px] tracking-[-0.02em] font-semibold text-[#0F172A]",
    details: "32/40 · -0.02em · Semibold",
    text: "The Operating System for Creative Studios",
  },
  {
    name: "H1",
    css: "text-[24px] leading-[32px] tracking-[-0.015em] font-semibold text-[#0F172A]",
    details: "24/32 · -0.015em · Semibold",
    text: "Building digital experiences at scale",
  },
  {
    name: "H2",
    css: "text-[20px] leading-[28px] tracking-[-0.01em] font-semibold text-[#0F172A]",
    details: "20/28 · -0.01em · Semibold",
    text: "System Architecture and Design Tokens",
  },
  {
    name: "H3",
    css: "text-[16px] leading-[24px] font-medium text-[#0F172A]",
    details: "16/24 · Medium",
    text: "Component Generation Settings",
  },
  {
    name: "Body",
    css: "text-[14px] leading-[22px] font-normal text-[#0F172A]",
    details: "14/22 · Regular",
    text: "Our goal is to strip away visual noise and construct a workspace that respects the user's attention. Every tool should be exactly where you expect it.",
  },
  {
    name: "Body Small",
    css: "text-[13px] leading-[20px] font-normal text-[#64748B]",
    details: "13/20 · Regular",
    text: "Used for secondary descriptions, help text, and minor details that shouldn't compete for primacy in the visual hierarchy.",
  },
  {
    name: "Caption",
    css: "text-[12px] leading-[16px] font-medium text-[#94A3B8]",
    details: "12/16 · Medium",
    text: "Last modified 2 days ago",
  },
  {
    name: "Overline",
    css: "text-[10px] leading-[16px] uppercase tracking-[0.08em] font-medium text-[#94A3B8]",
    details: "10/16 · 0.08em · Uppercase",
    text: "Project Meta",
  },
  {
    name: "Mono",
    css: "font-mono text-[13px] leading-[20px] font-normal text-[#0F172A]",
    details: "13/20 · Regular · Geist Mono",
    text: "<Button variant=\"primary\">Generate</Button>",
  },
];

export default function TestTypographyPage() {
  return (
    <main className="min-h-screen bg-[#FAFBFE] p-16 sm:p-24 animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out font-sans">
      <div className="mx-auto max-w-4xl space-y-24">
        
        <div className="space-y-4">
          <h1 className="text-[24px] leading-[32px] tracking-[-0.015em] font-semibold text-[#0F172A]">
            Typography Scale
          </h1>
          <p className="text-[14px] leading-[22px] font-normal text-[#64748B] max-w-2xl">
            The Studio OS type system is precise and technical — not warm, not cold, just clear.
            Using Geist Sans for structural elements and Geist Mono for code/data. 
            Displayed on the #FAFBFE canvas background.
          </p>
        </div>

        <div className="flex flex-col gap-16">
          {typeStyles.map((style) => (
            <div key={style.name} className="flex flex-col sm:flex-row gap-8 items-start sm:items-baseline border-b border-[#E2E8F0] pb-10">
              <div className="w-48 shrink-0 flex flex-col gap-1">
                <span className="text-[12px] leading-[16px] font-medium text-[#0F172A]">{style.name}</span>
                <span className="text-[12px] leading-[16px] font-medium text-[#94A3B8] font-mono">{style.details}</span>
              </div>
              <div className={style.css}>
                {style.text}
              </div>
            </div>
          ))}
        </div>

      </div>
    </main>
  );
}
