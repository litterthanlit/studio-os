import React from "react";

const gridPaper = {
  backgroundImage:
    "linear-gradient(to right, rgba(12, 12, 20, 0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(12, 12, 20, 0.06) 1px, transparent 1px)",
  backgroundSize: "24px 24px",
} as const;

type FeatureCardProps = {
  title: string;
  body: string;
  children: React.ReactNode;
};

function FeatureCard({ title, body, children }: FeatureCardProps) {
  return (
    <article className="group relative flex aspect-square flex-col bg-white p-7 transition-[box-shadow] duration-300 md:p-9">
      <div
        className="pointer-events-none absolute inset-0 rounded-[2px] opacity-0 shadow-[0_24px_48px_-12px_rgba(12,12,20,0.12)] transition-opacity duration-300 group-hover:opacity-100"
        aria-hidden
      />
      <div className="relative z-10">
        <h3 className="mb-3 font-['Noto_Serif'] text-[clamp(1.375rem,2.5vw,1.75rem)] font-normal leading-[1.15] tracking-[-0.02em] text-[#0C0C14]">
          {title}
        </h3>
        <p className="max-w-[22rem] font-sans text-[15px] leading-relaxed text-[#0C0C14]/65">{body}</p>
      </div>
      <div className="relative z-0 mt-auto flex flex-1 flex-col items-center justify-end pt-8">{children}</div>
    </article>
  );
}

export function FeatureGrid() {
  return (
    <section className="w-full flex-col py-16 md:px-[60px] md:py-24" style={gridPaper}>
      <div className="mx-auto mb-10 max-w-[1200px] px-5 md:mb-14 md:px-0">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#0C0C14]/45">Product</p>
        <h2 className="max-w-[520px] font-['Noto_Serif'] text-[clamp(1.75rem,3vw,2.25rem)] font-normal leading-tight tracking-[-0.02em] text-[#0C0C14]">
          A workspace that reads references, respects structure, and ships.
        </h2>
      </div>

      {/* Bento: 1px gutters use a contrasting track color so the grid reads clearly (gap-px + bg). */}
      <div className="mx-auto max-w-[1200px] px-4 sm:px-5 lg:px-0">
        <div className="overflow-hidden rounded-2xl border border-[#0C0C14]/15 bg-[#d1d5dc] p-px shadow-[0_1px_2px_rgba(12,12,20,0.06)]">
          <div className="grid grid-cols-1 gap-px sm:grid-cols-2">
          <FeatureCard
            title="Built for precision."
            body="Inspectors, alignment, and padding you can trust — so layout decisions stay intentional, not accidental."
          >
            <div className="flex items-end gap-2 drop-shadow-[0_8px_24px_rgba(12,12,20,0.08)]">
              <div className="flex flex-col gap-3 rounded-md bg-[#0C0C14] px-3 py-5">
                <div className="h-3.5 w-3.5 rounded-sm bg-white/15" />
                <div className="h-3.5 w-3.5 rounded-sm bg-[#FF7A59]/90" />
                <div className="h-3.5 w-3.5 rounded-sm bg-white/15" />
              </div>
              <div className="flex w-[148px] flex-col gap-3 rounded-md border border-white/[0.06] bg-[#16161c] p-3.5 font-mono text-[10px] text-white/45">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] uppercase tracking-wider text-white/25">Align</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="aspect-square rounded bg-[#0C0C14] shadow-inner" />
                  <div className="aspect-square rounded bg-[#0C0C14] shadow-inner" />
                  <div className="aspect-square rounded bg-[#0C0C14] shadow-inner" />
                </div>
                <div className="h-px w-full bg-white/[0.08]" />
                <div className="flex items-center justify-between text-white/55">
                  <span className="font-sans text-[10px]">Padding</span>
                  <span className="text-[#8B9AE8]">16px</span>
                </div>
              </div>
            </div>
          </FeatureCard>

          <FeatureCard
            title="Guided intuition."
            body="Pin references beside the canvas so taste stays visible while you compose — not buried in a folder."
          >
            <div className="flex h-[168px] w-full max-w-[300px] overflow-hidden rounded-lg border border-[#4B57DB]/[0.12] bg-[#D1E4FC] shadow-[0_12px_32px_-8px_rgba(75,87,219,0.2)]">
              <div className="flex w-[56px] flex-col gap-2 bg-[#0C0C14] p-2">
                <div className="h-8 w-full rounded-sm bg-white/10" />
                <div className="h-8 w-full rounded-sm bg-white/10" />
              </div>
              <div className="relative flex-1 p-4">
                <div className="absolute left-6 top-4 h-[52px] w-[104px] rounded border border-[#0C0C14]/[0.06] bg-white shadow-sm" />
                <div className="absolute bottom-1 right-2 flex h-[104px] w-[78px] rotate-[3deg] flex-col rounded border border-[#0C0C14]/[0.06] bg-white p-1.5 shadow-sm">
                  <div
                    className="h-full w-full rounded-[2px] opacity-[0.12]"
                    style={{
                      backgroundImage:
                        "linear-gradient(45deg, #0C0C14 25%, transparent 25%, transparent 75%, #0C0C14 75%, #0C0C14), linear-gradient(45deg, #0C0C14 25%, transparent 25%, transparent 75%, #0C0C14 75%, #0C0C14)",
                      backgroundSize: "4px 4px",
                      backgroundPosition: "0 0, 2px 2px",
                    }}
                  />
                </div>
              </div>
            </div>
          </FeatureCard>

          <FeatureCard
            title="Co-create with AI."
            body="Prompts become structure you can edit — one calm thread instead of a dozen disconnected tools."
          >
            <div className="relative w-[210px] overflow-hidden rounded-lg border border-[#0C0C14]/[0.08] bg-white shadow-[0_16px_40px_-12px_rgba(12,12,20,0.15)]">
              <div className="absolute right-0 top-0 h-4 w-4 rounded-bl-lg bg-[#FF92D0]" aria-hidden />
              <div className="flex h-8 items-center border-b border-[#0C0C14]/[0.06] px-3">
                <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#0C0C14]/40">Prompt</span>
              </div>
              <div className="flex h-[128px] flex-col gap-2.5 bg-[#FAFAFA] p-3">
                <div className="ml-5 max-w-[85%] self-end rounded-md border border-[#0C0C14]/[0.06] bg-white p-2 text-[10px] leading-snug text-[#0C0C14] shadow-sm">
                  Dark dashboard, editorial type.
                </div>
                <div className="mr-5 max-w-[85%] self-start rounded-md bg-[#4B57DB] p-2 text-[10px] leading-snug text-white shadow-sm">
                  Laying out sections…
                </div>
                <div className="mx-2 mt-auto flex items-center gap-1.5 rounded-full border border-[#0C0C14]/[0.08] bg-white px-2 py-1">
                  <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#FF92D0]" />
                  <span className="text-[8px] text-[#0C0C14]/40">Writing blocks…</span>
                </div>
              </div>
            </div>
          </FeatureCard>

          <FeatureCard
            title="Code, integrated."
            body="Export or publish without a second translation step — structure in the canvas stays structure in the repo."
          >
            <div className="flex h-[168px] w-[248px] flex-col overflow-hidden rounded-t-lg border border-white/15 border-b-0 bg-[#0C0C14] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.45)]">
              <div className="flex h-7 items-center border-b border-white/[0.08] bg-[#14141a] px-3">
                <div className="flex gap-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#FF7A59]" />
                  <div className="h-1.5 w-1.5 rounded-full bg-[#FFB267]" />
                  <div className="h-1.5 w-1.5 rounded-full bg-white/20" />
                </div>
                <span className="ml-auto font-mono text-[8px] text-white/30">Layout.tsx</span>
              </div>
              <div className="p-3 font-mono text-[8px] leading-[15px] text-white/[0.58]">
                <span className="text-[#7D8FE8]">export function</span> <span className="text-[#FFB267]">App</span>() {"{"}
                <br />
                &nbsp;&nbsp;<span className="text-[#7D8FE8]">return</span> (
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;&lt;<span className="text-[#FF8A7A]">div</span>{" "}
                <span className="text-[#B8C8F5]">className</span>=
                <span className="text-[#B8C8F5]">&quot;flex w-full&quot;</span>&gt;
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&lt;<span className="text-[#FF8A7A]">Sidebar</span> /&gt;
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&lt;<span className="text-[#FF8A7A]">Canvas</span>{" "}
                <span className="text-[#B8C8F5]">mode</span>=<span className="text-[#B8C8F5]">&quot;dark&quot;</span> /&gt;
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;&lt;/<span className="text-[#FF8A7A]">div</span>&gt;
                <br />
                &nbsp;&nbsp;)
                <br />
                {"}"}
                <div className="mt-2 h-px w-[38%] bg-white/[0.12]" />
                <div className="mt-1 h-px w-[58%] bg-white/[0.08]" />
              </div>
            </div>
          </FeatureCard>
          </div>
        </div>
      </div>
    </section>
  );
}
