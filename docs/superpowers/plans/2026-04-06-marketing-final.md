# Marketing Final — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the final Studio OS marketing page by creating `components/marketing-final/` with correct taste-first messaging, new sections (Comparison, HowItWorks, Gallery, FooterCta), upgraded hero product shot, and rewritten features copy — then wire to `app/page.tsx`.

**Architecture:** Create one clean `components/marketing-final/` directory with 11 component files. Composition order: Nav → Hero (dark) → Comparison (light) → HowItWorks (light) → Features (dark) → Gallery (light) → ExportCta (dark) → FooterCta (light) → Footer (light). Each component is self-contained. Update `app/page.tsx` to compose them. Old marketing directories stay until locked.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS v4, Geist Sans (body/UI), IBM Plex Mono (mono labels/kickers), hex colors directly (no CSS variables).

---

## File Map

| File | Source | Action |
|------|--------|--------|
| `components/marketing-final/section-rule.tsx` | marketing-claude | Copy exactly |
| `components/marketing-final/logo-mark.tsx` | Brief SVG spec | New (3-layer folder SVG) |
| `components/marketing-final/nav.tsx` | marketing-v2 | Copy + update links |
| `components/marketing-final/hero.tsx` | hybrid | Dark v2 bg + claude product shot + right copy |
| `components/marketing-final/comparison.tsx` | marketing-claude | Copy exactly |
| `components/marketing-final/how-it-works.tsx` | marketing-claude | Copy exactly |
| `components/marketing-final/features.tsx` | marketing-v2 | Keep structure, rewrite copy |
| `components/marketing-final/gallery.tsx` | marketing-claude | Copy exactly |
| `components/marketing-final/export-cta.tsx` | new | Dark section, taste-aligned copy |
| `components/marketing-final/footer-cta.tsx` | marketing-claude | Copy exactly |
| `components/marketing-final/footer.tsx` | marketing-v2 | Copy + update logo import |
| `app/page.tsx` | current | Rewire imports to marketing-final |

---

## Design System (enforce throughout)

- Accent: `#4B57DB`, hover `#3D49C7`, light `#D1E4FC`, subtle `#EDF1FE`
- Dark bg: `#0C0C14` (hero, features, export sections)
- Light bg: `#FAFAF8` (comparison, gallery, footer areas)
- Text light: `#FAFAF8` or `white` on dark sections
- Text dark: `#1A1A1A` / `#6B6B6B` / `#A0A0A0` on light sections
- Chrome borders: `#EFEFEC` (0.5px), Input: `#E5E5E0` (1px), Accent: `#4B57DB` (1.5px)
- Radius: 2px inputs, 4px cards/buttons, 6px containers
- Fonts: Geist Sans (sans-serif via Tailwind), IBM Plex Mono (font-mono)
- No box-shadow except product shots. No blur. No rounded-xl.
- SectionRule pattern: `── LABEL ──` hairline with centered mono label

---

## Task 1: section-rule.tsx

**Files:**
- Create: `components/marketing-final/section-rule.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";

export function SectionRule({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="flex-1 h-px bg-[#EFEFEC]" />
      <span className="font-mono text-[10px] uppercase tracking-[1px] text-[#A0A0A0] whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-[#EFEFEC]" />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/marketing-final/section-rule.tsx
git commit -m "feat(marketing): add section-rule shared component"
```

---

## Task 2: logo-mark.tsx

**Files:**
- Create: `components/marketing-final/logo-mark.tsx`

- [ ] **Step 1: Create the file**

Use the 3-layer stacked bars SVG with folder tab (the canonical logo per brand guidelines):

```tsx
export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg
      width="24"
      height="16"
      viewBox="0 0 127 83"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <g transform="translate(4.075 2)">
        <rect x="0" y="66" width="119.189" height="13" rx="2" fill="rgba(75,87,219,0.67)" />
        <rect x="0" y="49" width="119.189" height="13" rx="2" fill="rgba(75,87,219,0.67)" />
        <rect x="0" y="32" width="119.189" height="13" rx="2" fill="rgba(75,87,219,0.67)" />
        <rect x="0" y="15" width="119.189" height="13" rx="2" fill="rgba(75,87,219,0.67)" />
        <rect x="0" y="0" width="57" height="11" rx="2" fill="rgba(75,87,219,0.67)" />
      </g>
      <g transform="translate(7.811 0)">
        <rect x="0" y="65" width="119.189" height="13" rx="2" fill="rgba(36,48,173,0.3)" />
        <rect x="0" y="48" width="119.189" height="13" rx="2" fill="rgba(36,48,173,0.3)" />
        <rect x="0" y="31" width="119.189" height="13" rx="2" fill="rgba(36,48,173,0.3)" />
        <rect x="0" y="14" width="119.189" height="13" rx="2" fill="rgba(36,48,173,0.3)" />
        <rect x="0" y="0" width="57" height="11" rx="2" fill="rgba(36,48,173,0.3)" />
      </g>
      <g transform="translate(0 4)">
        <rect x="0" y="66" width="119.189" height="13" rx="2" fill="rgb(75,87,219)" />
        <rect x="0" y="49" width="119.189" height="13" rx="2" fill="rgb(75,87,219)" />
        <rect x="0" y="32" width="119.189" height="13" rx="2" fill="rgb(75,87,219)" />
        <rect x="0" y="15" width="119.189" height="13" rx="2" fill="rgb(75,87,219)" />
        <rect x="0" y="0" width="57" height="11" rx="2" fill="rgb(75,87,219)" />
      </g>
    </svg>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/marketing-final/logo-mark.tsx
git commit -m "feat(marketing): add canonical logo-mark SVG"
```

---

## Task 3: nav.tsx

**Files:**
- Create: `components/marketing-final/nav.tsx`

- [ ] **Step 1: Create the file**

Nav stays dark (absolute positioned over the dark hero). Links updated to match final section IDs.

```tsx
import Link from "next/link";
import { LogoMark } from "./logo-mark";

export function Nav() {
  return (
    <header className="absolute top-0 left-0 right-0 w-full z-50 px-5 md:px-[80px] h-20 flex items-center justify-center pointer-events-none">
      <div className="w-full max-w-[1440px] mx-auto flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-3">
          <LogoMark />
          <span className="font-sans font-medium text-white text-[15px] tracking-[-0.01em]">
            studio OS
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          <Link
            href="#comparison"
            className="text-white/50 hover:text-white transition-colors text-sm font-sans"
          >
            Why Studio OS
          </Link>
          <Link
            href="#how"
            className="text-white/50 hover:text-white transition-colors text-sm font-sans"
          >
            How it works
          </Link>
          <Link
            href="#output"
            className="text-white/50 hover:text-white transition-colors text-sm font-sans"
          >
            Output gallery
          </Link>
          <button className="bg-[#4B57DB] text-white text-sm font-medium px-4 py-2 rounded-[4px] hover:bg-[#3D49C7] transition-colors">
            Get access
          </button>
        </nav>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/marketing-final/nav.tsx
git commit -m "feat(marketing): add nav with updated section links"
```

---

## Task 4: hero.tsx

**Files:**
- Create: `components/marketing-final/hero.tsx`

The hero merges the dark v2 background with the claude-version product shot quality. Split layout: left = messaging, right = full warm-dark editor UI rising from the bottom edge.

- [ ] **Step 1: Create the file**

```tsx
"use client";

export function Hero() {
  return (
    <section
      className="relative w-full bg-[#0C0C14] overflow-hidden min-h-screen flex flex-col"
      style={{
        backgroundImage:
          "radial-gradient(circle at center, rgba(255,255,255,0.04) 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }}
    >
      <div className="max-w-[1440px] mx-auto px-5 md:px-[80px] w-full grid grid-cols-1 md:grid-cols-2 gap-10 items-center pt-36 flex-1">
        {/* Left: messaging */}
        <div className="flex flex-col justify-center pb-16">
          <div className="inline-flex items-center gap-2 px-3 py-[5px] rounded-full border border-white/10 bg-white/5 font-mono text-[10px] uppercase tracking-[1px] text-white/40 mb-8 self-start">
            <div className="w-[5px] h-[5px] rounded-full bg-[#4B57DB] animate-[pulse_2.5s_ease-in-out_infinite]" />
            Now in early access
          </div>
          <h1 className="text-white text-[clamp(38px,4vw,60px)] font-medium tracking-[-0.03em] leading-[1.05] mb-5 text-balance">
            AI that designs
            <br />
            like <span className="text-[#4B57DB]">you</span>.
          </h1>
          <p className="text-white/50 text-[17px] leading-[1.65] mb-9 max-w-[420px] text-pretty">
            Feed it references. It extracts your taste — spacing, typography,
            color, density — and generates designs that reflect your
            sensibility. Then you edit in a real canvas.
          </p>
          <div className="flex gap-3 items-center">
            <button className="bg-[#4B57DB] text-white text-[13px] font-medium px-6 py-[11px] rounded-[4px] hover:bg-[#3D49C7] transition-colors tracking-[-0.01em]">
              Start designing
            </button>
            <a
              href="#comparison"
              className="text-white/40 text-[13px] hover:text-white/70 transition-colors inline-flex items-center gap-1.5 group"
            >
              See how it works
              <span className="transition-transform duration-150 group-hover:translate-x-[3px]">
                →
              </span>
            </a>
          </div>
        </div>

        {/* Right: product shot rising from bottom */}
        <div className="relative flex items-end justify-center pt-20 md:pt-0 self-end">
          <div
            className="w-full max-w-[620px] rounded-t-[10px] overflow-hidden border border-white/[0.07] shadow-[0_-20px_80px_rgba(75,87,219,0.1),0_-4px_20px_rgba(0,0,0,0.3)]"
          >
            {/* Browser Chrome */}
            <div className="flex items-center gap-1.5 px-4 py-2.5 bg-[#1A1A1A] border-b border-white/[0.06]">
              <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#27C840]" />
              <div className="ml-3 flex items-center gap-1.5 bg-white/5 border border-white/[0.08] rounded-[4px] px-2.5 py-[3px] font-mono text-[10px] text-white/30">
                <div className="w-1 h-1 rounded-full bg-[#4B57DB]" />
                studio-os.io
              </div>
            </div>

            {/* Editor Body */}
            <div className="flex h-[520px] bg-[#141414]">
              {/* Mini Rail */}
              <div className="w-[44px] bg-[#1A1A1A] border-r border-[#262626]/50 flex flex-col items-center pt-3.5 pb-3.5 gap-3.5">
                <div className="w-[22px] h-[22px] bg-[#4B57DB] rounded-[4px] flex items-center justify-center text-[11px] font-semibold text-white">
                  S
                </div>
                <div className="w-3.5 h-3.5 rounded-[2px] bg-[#4B57DB] opacity-90" />
                <div className="w-3.5 h-3.5 rounded-[2px] bg-[#333]" />
                <div className="w-3.5 h-3.5 rounded-[2px] bg-[#333]" />
                <div className="flex-1" />
                <div className="w-3.5 h-3.5 rounded-[2px] bg-[#333]" />
              </div>

              {/* Layers Panel */}
              <div className="w-[180px] bg-[#1A1A1A] border-r border-[#262626]/50 overflow-hidden">
                <div className="font-mono text-[9px] uppercase tracking-[1px] text-[#555] px-3.5 pt-3 pb-2 border-b border-[#262626]/50">
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
                <LayerItem label="Quote Block" depth={1} />
              </div>

              {/* Canvas */}
              <div className="flex-1 bg-[#FAFAF8] relative flex items-center justify-center overflow-hidden">
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='21' height='21'><rect width='20' height='20' rx='1' fill='%23000' opacity='.02'/></svg>")`,
                    backgroundSize: "21px 21px",
                  }}
                />
                {/* Artboard */}
                <div className="w-[340px] h-[400px] bg-white rounded-[2px] relative z-[1] shadow-[0_1px_20px_rgba(0,0,0,0.05)] overflow-hidden">
                  <div className="absolute -top-[18px] left-0 font-mono text-[9px] text-[#4B57DB] tracking-[0.5px]">
                    Desktop — 1440
                  </div>
                  {/* Selection outline */}
                  <div className="absolute top-7 left-5 w-[160px] h-[24px] border-[1.5px] border-[#4B57DB] pointer-events-none z-10">
                    <div className="absolute -top-4 -left-px bg-[#4B57DB] text-white font-mono text-[8px] px-[5px] py-px rounded-[2px] whitespace-nowrap">
                      Heading — text
                    </div>
                  </div>
                  {/* Hover outline */}
                  <div className="absolute top-[155px] left-5 right-5 h-[100px] border border-dashed border-[#4B57DB]/40 pointer-events-none z-[9]" />
                  {/* Editorial hero zone */}
                  <div className="h-[160px] bg-gradient-to-br from-[#0C0F1D] via-[#131834] to-[#1B2654] px-5 pt-5 pb-4 text-white relative overflow-hidden">
                    <div className="absolute -top-8 -right-8 w-32 h-32 bg-[radial-gradient(circle,rgba(75,87,219,0.2)_0%,transparent_70%)]" />
                    <div className="font-mono text-[6px] uppercase tracking-[2px] text-white/30 mb-2.5">
                      Case Study
                    </div>
                    <div className="text-[20px] font-medium leading-[1.08] tracking-[-0.02em] mb-1.5">
                      Design at the
                      <br />
                      speed of thought
                    </div>
                    <div className="text-[8px] text-white/40 font-medium">
                      A new approach to creative tools
                    </div>
                  </div>
                  {/* Body content */}
                  <div className="px-5 pt-3">
                    <div className="grid grid-cols-3 gap-1.5 mb-3">
                      {[
                        ["Taste Engine", "Extract design patterns"],
                        ["Real Editor", "Canvas feel, deep tools"],
                        ["Clean Export", "HTML + Tailwind"],
                      ].map(([t, d]) => (
                        <div
                          key={t}
                          className="bg-[#FAFAF8] border border-[#EFEFEC]/50 rounded-[2px] px-2 pt-2 pb-2"
                        >
                          <div className="w-3 h-0.5 bg-[#4B57DB] rounded-[1px] mb-1.5" />
                          <div className="text-[7px] font-medium mb-[3px]">{t}</div>
                          <div className="text-[5.5px] text-[#A0A0A0] leading-[1.4]">{d}</div>
                        </div>
                      ))}
                    </div>
                    <div className="border-l-2 border-[#4B57DB] pl-3 py-1.5 pr-3 bg-[#EDF1FE] rounded-r-[2px] text-[8px] italic text-[#6B6B6B]">
                      &ldquo;Every reference shapes the output.&rdquo;
                    </div>
                  </div>
                </div>
                {/* Bottom bar */}
                <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 bg-[#1A1A1A] border border-[#262626]/50 rounded-[4px] px-3.5 py-1 flex items-center gap-2.5 h-7 z-10">
                  <span className="font-mono text-[10px] text-[#777]">100%</span>
                  <div className="w-px h-3 bg-[#333]" />
                  <span className="font-mono text-[10px] text-[#777]">Desktop</span>
                </div>
              </div>

              {/* Inspector */}
              <div className="w-[210px] bg-[#1A1A1A] border-l border-[#262626]/50 overflow-hidden">
                <div className="flex border-b border-[#262626]/50 px-3">
                  <div className="font-mono text-[9px] uppercase tracking-[1px] px-2 py-2.5 text-[#E0E0E0] font-medium border-b-[1.5px] border-[#4B57DB]">
                    Design
                  </div>
                  <div className="font-mono text-[9px] uppercase tracking-[1px] px-2 py-2.5 text-[#555]">
                    CSS
                  </div>
                  <div className="font-mono text-[9px] uppercase tracking-[1px] px-2 py-2.5 text-[#555]">
                    Export
                  </div>
                </div>
                <div className="p-3 pt-2.5">
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
          ? "bg-[#4B57DB]/10 text-[#D1E4FC] border-l-[1.5px] border-[#4B57DB]"
          : "text-[#777]"
      }`}
      style={{ paddingLeft: pl, paddingRight: 14 }}
    >
      <div
        className={`w-2.5 h-2.5 rounded-[2px] border flex-shrink-0 ${
          selected ? "border-[#4B57DB] bg-[#4B57DB]/20" : "border-[#444]"
        }`}
      />
      {label}
    </div>
  );
}

function InspRule({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="flex-1 h-px bg-[#2A2A2A]" />
      <span className="font-mono text-[8px] uppercase tracking-[1px] text-[#4A4A4A] whitespace-nowrap">
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
        {unit && <span className="text-[8px] text-[#555] ml-px">{unit}</span>}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/marketing-final/hero.tsx
git commit -m "feat(marketing): hero — dark bg, claude product shot, taste-first copy"
```

---

## Task 5: comparison.tsx

**Files:**
- Create: `components/marketing-final/comparison.tsx`

- [ ] **Step 1: Create the file**

Copy exactly from `components/marketing-claude/comparison.tsx`, updating the import path:

```tsx
"use client";

import { SectionRule } from "./section-rule";

export function Comparison() {
  return (
    <section className="py-[180px] bg-[#FAFAF8] relative" id="comparison">
      <div className="max-w-[1120px] mx-auto px-10">
        <div className="text-center mb-[72px]">
          <SectionRule label="The difference" />
          <h2 className="text-[clamp(32px,4.5vw,52px)] font-medium tracking-[-0.02em] leading-[1.08] mt-4 text-balance">
            Same prompt.
            <br />
            Different taste.
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_40px_1fr] max-w-[1040px] mx-auto px-10">
        {/* Generic Side */}
        <div className="rounded-lg overflow-hidden border border-[#EFEFEC]/50 bg-white opacity-75 saturate-[0.3]">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#EFEFEC]/50">
            <div className="w-[5px] h-[5px] rounded-full bg-[#A0A0A0]" />
            <span className="font-mono text-[10px] uppercase tracking-[1px] text-[#A0A0A0]">
              Any AI tool
            </span>
          </div>
          <div className="p-5 min-h-[340px]">
            <div className="bg-[#F0F1F3] rounded-[4px] px-5 py-7 text-center mb-3">
              <h3 className="text-[15px] font-semibold text-[#4B5563] mb-1.5">
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
        <div className="rounded-lg overflow-hidden border border-[#4B57DB] bg-white shadow-[0_8px_40px_rgba(75,87,219,0.06)]">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#4B57DB]/[0.12]">
            <div className="w-[5px] h-[5px] rounded-full bg-[#4B57DB]" />
            <span className="font-mono text-[10px] uppercase tracking-[1px] text-[#4B57DB]">
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
            <div className="border-l-2 border-[#4B57DB] pl-3 py-2 pr-3 bg-[#EDF1FE] rounded-r-[3px] text-[9px] italic text-[#6B6B6B] leading-[1.5]">
              &ldquo;Every reference shapes the output.&rdquo;
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1120px] mx-auto px-10">
        <p className="text-center mt-12 text-[15px] text-[#6B6B6B] font-medium text-pretty">
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
      <div className="w-4 h-4 bg-[#D1D5DB] rounded-full mb-1.5" />
      <h4 className="text-[8px] font-semibold text-[#6B7280] mb-[3px]">{title}</h4>
      <p className="text-[6px] text-[#9CA3AF] leading-[1.4]">{desc}</p>
    </div>
  );
}

function TasteCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="bg-[#FAFAF8] border border-[#EFEFEC]/50 rounded-[3px] px-2 py-2.5">
      <div className="w-3.5 h-0.5 bg-[#4B57DB] rounded-[1px] mb-2" />
      <h4 className="text-[8px] font-medium mb-[3px]">{title}</h4>
      <p className="text-[6px] text-[#A0A0A0] leading-[1.5]">{desc}</p>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/marketing-final/comparison.tsx
git commit -m "feat(marketing): add comparison section (generic vs taste-aware)"
```

---

## Task 6: how-it-works.tsx

**Files:**
- Create: `components/marketing-final/how-it-works.tsx`

- [ ] **Step 1: Create the file**

Copy exactly from `components/marketing-claude/how-it-works.tsx`, updating the import path:

```tsx
"use client";

import { SectionRule } from "./section-rule";

export function HowItWorks() {
  return (
    <section className="py-[180px] relative" id="how">
      <div className="max-w-[1120px] mx-auto px-10">
        <div className="mb-20">
          <SectionRule label="How it works" />
          <h2 className="text-[clamp(32px,4.5vw,52px)] font-medium tracking-[-0.02em] leading-[1.08] mt-4 text-balance">
            Three steps to
            <br />
            <span className="text-[#A0A0A0]">your design.</span>
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-0">
          {/* Step 1 */}
          <div className="pr-9 border-r border-[#EFEFEC]/50">
            <div className="font-mono text-[10px] text-[#4B57DB] tracking-[1px] mb-4">01</div>
            <h3 className="text-[20px] font-medium tracking-[-0.02em] mb-2.5">Add references</h3>
            <p className="text-[14px] text-[#6B6B6B] font-medium leading-[1.6] mb-7 text-pretty">
              Drag screenshots, paste URLs, or import from Pinterest. Studio OS
              scores and analyzes every image.
            </p>
            <StepVis>
              <RefItem color="linear-gradient(135deg,#0C0F1D,#1B2654)" name="Editorial homepage" score="97" />
              <RefItem color="linear-gradient(135deg,#F5E6D3,#C4A882)" name="Minimal portfolio" score="94" />
              <RefItem color="linear-gradient(135deg,#111,#333)" name="Swiss typography" score="91" />
              <div className="flex items-center gap-2 px-2.5 py-2 bg-white border border-dashed border-[#EFEFEC] rounded-[3px] opacity-50">
                <div className="w-9 h-[26px] rounded-[2px] flex-shrink-0 bg-[#F5F5F0]" />
                <span className="text-[10px] text-[#A0A0A0] flex-1">Drop more...</span>
              </div>
            </StepVis>
          </div>

          {/* Step 2 */}
          <div className="px-9 border-r border-[#EFEFEC]/50">
            <div className="font-mono text-[10px] text-[#4B57DB] tracking-[1px] mb-4">02</div>
            <h3 className="text-[20px] font-medium tracking-[-0.02em] mb-2.5">Generate</h3>
            <p className="text-[14px] text-[#6B6B6B] font-medium leading-[1.6] mb-7 text-pretty">
              Studio OS extracts your taste — spacing, typography, color,
              density — and generates a design that reflects it.
            </p>
            <StepVis>
              <GenStage status="done" text="Analyzing references" label="Done" />
              <GenStage status="done" text="Extracting taste profile" label="Done" />
              <GenStage status="active" text="Composing layout" label="Working" />
              <GenStage status="pending" text="Rendering design" label="Pending" />
              <GenStage status="pending" text="Validating fidelity" label="Pending" />
            </StepVis>
          </div>

          {/* Step 3 */}
          <div className="pl-9">
            <div className="font-mono text-[10px] text-[#4B57DB] tracking-[1px] mb-4">03</div>
            <h3 className="text-[20px] font-medium tracking-[-0.02em] mb-2.5">Edit like a designer</h3>
            <p className="text-[14px] text-[#6B6B6B] font-medium leading-[1.6] mb-7 text-pretty">
              Select, resize, restyle. Real canvas feel with layout semantics,
              measurement guides, and a precision inspector.
            </p>
            <StepVis>
              <div className="flex gap-[3px] h-[170px]">
                <div className="w-[55px] bg-[#1A1A1A] rounded-[3px] p-1.5 overflow-hidden">
                  <EdLayer label="Page" />
                  <EdLayer label="Hero" selected />
                  <EdLayer label="Features" />
                  <EdLayer label="Quote" />
                  <EdLayer label="Footer" />
                </div>
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

function RefItem({ color, name, score }: { color: string; name: string; score: string }) {
  return (
    <div className="flex items-center gap-2 px-2.5 py-2 bg-white border border-[#EFEFEC]/50 rounded-[3px] mb-1.5 last:mb-0">
      <div className="w-9 h-[26px] rounded-[2px] flex-shrink-0" style={{ background: color }} />
      <span className="text-[10px] text-[#6B6B6B] flex-1">{name}</span>
      <span className="font-mono text-[9px] text-[#4B57DB] bg-[#EDF1FE] px-1.5 py-0.5 rounded-[2px]">{score}</span>
    </div>
  );
}

function GenStage({ status, text, label }: { status: "done" | "active" | "pending"; text: string; label: string }) {
  const dotColor =
    status === "done" ? "bg-[#22C55E]" :
    status === "active" ? "bg-[#4B57DB] animate-[pulse_1.5s_infinite]" :
    "bg-[#E5E5E0]";
  const statusColor =
    status === "done" ? "text-[#22C55E]" :
    status === "active" ? "text-[#4B57DB]" :
    "text-[#A0A0A0]";
  return (
    <div className="flex items-center gap-2.5 px-2.5 py-2 bg-white border border-[#EFEFEC]/50 rounded-[3px] mb-1.5 last:mb-0">
      <div className={`w-[7px] h-[7px] rounded-full flex-shrink-0 ${dotColor}`} />
      <span className="text-[10px] text-[#6B6B6B] flex-1">{text}</span>
      <span className={`font-mono text-[8px] uppercase tracking-[0.5px] ${statusColor}`}>{label}</span>
    </div>
  );
}

function EdLayer({ label, selected }: { label: string; selected?: boolean }) {
  return (
    <div
      className={`text-[6px] px-1 py-0.5 h-3.5 rounded-[1px] mb-px flex items-center ${
        selected ? "bg-[#4B57DB]/[0.12] text-[#D1E4FC]" : "text-[#777]"
      }`}
    >
      {label}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/marketing-final/how-it-works.tsx
git commit -m "feat(marketing): add how-it-works 3-step section"
```

---

## Task 7: features.tsx

**Files:**
- Create: `components/marketing-final/features.tsx`

The 4-card grid from v2, repurposed with taste-first copy. Section background: dark (#0C0C14) — creates contrast between the two light sections around it. Card colors unchanged (white, accent-light, accent, white) — they read well on dark.

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { SectionRule } from "./section-rule";

export function Features() {
  return (
    <section
      className="w-full py-[120px] relative"
      style={{
        backgroundImage:
          "radial-gradient(circle at center, rgba(255,255,255,0.03) 1px, transparent 1px)",
        backgroundSize: "20px 20px",
        backgroundColor: "#0C0C14",
      }}
      id="features"
    >
      <div className="w-full max-w-[1440px] px-5 md:px-[80px] mx-auto">
        <div className="mb-14">
          <SectionRule label="What it does" />
          <h2 className="text-[clamp(28px,3.5vw,44px)] font-medium tracking-[-0.02em] leading-[1.1] mt-4 text-white text-balance">
            The taste engine.
            <br />
            <span className="text-white/40">Four ways it works.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[16px]">

          {/* Card 1: References as signal */}
          <div className="bg-white rounded-[4px] p-6 flex flex-col justify-between aspect-square group relative overflow-hidden">
            <h3 className="text-[#1A1A1A] text-xl font-medium leading-tight mb-4 z-10 tracking-[-0.02em]">
              Your taste.
              <br />
              As signal.
            </h3>
            <div className="relative flex-grow flex items-end justify-center pb-4 z-10">
              <div className="w-full space-y-2">
                {[
                  { color: "linear-gradient(135deg,#0C0F1D,#1B2654)", label: "Editorial", score: "97" },
                  { color: "linear-gradient(135deg,#F5E6D3,#C4A882)", label: "Warm minimal", score: "94" },
                  { color: "linear-gradient(135deg,#111,#333)", label: "Swiss type", score: "91" },
                ].map(({ color, label, score }) => (
                  <div key={label} className="flex items-center gap-2.5 px-2.5 py-2 bg-[#FAFAF8] border border-[#EFEFEC] rounded-[3px]">
                    <div className="w-8 h-[22px] rounded-[2px] flex-shrink-0" style={{ background: color }} />
                    <span className="text-[10px] text-[#6B6B6B] flex-1">{label}</span>
                    <span className="font-mono text-[9px] text-[#4B57DB] bg-[#EDF1FE] px-1.5 py-0.5 rounded-[2px]">{score}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-[#6B6B6B] text-sm mt-4 z-10">
              Drag screenshots, paste URLs. Every reference scores and informs the output.
            </p>
          </div>

          {/* Card 2: Extraction */}
          <div className="bg-[#D1E4FC] rounded-[4px] p-6 flex flex-col justify-between aspect-square relative overflow-hidden">
            <h3 className="text-[#1A1A1A] text-xl font-medium leading-tight mb-4 z-10 tracking-[-0.02em]">
              Sensibility,
              <br />
              extracted.
            </h3>
            <div className="relative flex-grow flex items-center justify-center z-10">
              <div className="w-full space-y-2">
                {[
                  { label: "Spacing rhythm", value: "8 / 16 / 32" },
                  { label: "Type scale", value: "15 / 28 / 52" },
                  { label: "Color density", value: "Restrained" },
                  { label: "Layout", value: "Editorial grid" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center text-[11px]">
                    <span className="text-[#1A1A1A]/60">{label}</span>
                    <span className="font-mono text-[#4B57DB] text-[10px]">{value}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-[#1A1A1A]/70 text-sm mt-4 z-10">
              Spacing, typography, color density — extracted and structured into design directives.
            </p>
          </div>

          {/* Card 3: Generation */}
          <div className="bg-[#4B57DB] rounded-[4px] p-6 flex flex-col justify-between aspect-square relative overflow-hidden">
            <h3 className="text-white text-xl font-medium leading-tight mb-4 z-10 tracking-[-0.02em]">
              Generated
              <br />
              to your spec.
            </h3>
            <div className="relative flex-grow flex items-center justify-center z-10">
              <div className="space-y-2 w-full">
                {[
                  { text: "Analyzing references", done: true },
                  { text: "Extracting taste profile", done: true },
                  { text: "Composing layout", done: false, active: true },
                  { text: "Rendering design", done: false },
                ].map(({ text, done, active }) => (
                  <div key={text} className="flex items-center gap-2.5 px-2.5 py-2 bg-white/10 rounded-[3px]">
                    <div className={`w-[7px] h-[7px] rounded-full flex-shrink-0 ${done ? "bg-[#22C55E]" : active ? "bg-white animate-[pulse_1.5s_infinite]" : "bg-white/20"}`} />
                    <span className={`text-[10px] flex-1 ${done || active ? "text-white" : "text-white/40"}`}>{text}</span>
                    {done && <span className="font-mono text-[8px] text-[#22C55E]">Done</span>}
                    {active && <span className="font-mono text-[8px] text-white">Working</span>}
                  </div>
                ))}
              </div>
            </div>
            <p className="text-white/70 text-sm mt-4 z-10">
              Same prompt. Different taste. The output reflects your references — not the internet's average.
            </p>
          </div>

          {/* Card 4: Real editor */}
          <div className="bg-white rounded-[4px] p-6 flex flex-col justify-between aspect-square relative overflow-hidden">
            <h3 className="text-[#1A1A1A] text-xl font-medium leading-tight mb-4 z-10 tracking-[-0.02em]">
              A real canvas.
              <br />
              Not a preview.
            </h3>
            <div className="relative flex-grow flex items-center justify-center z-10">
              <div className="w-[160px] h-[110px] bg-[#141414] rounded-[4px] overflow-hidden flex">
                <div className="w-[36px] bg-[#1A1A1A] border-r border-[#2A2A2A] p-1.5">
                  <div className="w-[18px] h-[18px] bg-[#4B57DB] rounded-[3px] mb-2 mx-auto" />
                  <div className="w-3 h-3 bg-[#333] rounded-[2px] mx-auto mb-1.5" />
                  <div className="w-3 h-3 bg-[#333] rounded-[2px] mx-auto" />
                </div>
                <div className="flex-1 bg-[#FAFAF8] relative flex items-center justify-center">
                  <div className="w-[80px] h-[70px] bg-white rounded-[2px] shadow-[0_1px_6px_rgba(0,0,0,0.04)] overflow-hidden relative">
                    <div className="h-7 bg-gradient-to-br from-[#0C0F1D] to-[#1B2654]" />
                    <div className="p-1">
                      <div className="h-[2px] bg-[#EFEFEC] rounded-[1px] mb-[2px]" />
                      <div className="h-[2px] bg-[#EFEFEC] rounded-[1px] w-[60%]" />
                    </div>
                    <div className="absolute top-1 left-1 right-1 h-7 border-[1.5px] border-[#4B57DB] rounded-[1px] pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
            <p className="text-[#6B6B6B] text-sm mt-4 z-10">
              Select, resize, restyle. Layers panel, inspector, measurement guides — the full toolkit.
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/marketing-final/features.tsx
git commit -m "feat(marketing): features — dark section, taste-first 4-card grid"
```

---

## Task 8: gallery.tsx

**Files:**
- Create: `components/marketing-final/gallery.tsx`

- [ ] **Step 1: Create the file**

Copy exactly from `components/marketing-claude/gallery.tsx`, updating the import path:

```tsx
"use client";

import { SectionRule } from "./section-rule";

export function Gallery() {
  return (
    <section className="py-[180px] bg-[#FAFAF8] relative" id="output">
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
          <GalCard tag="Editorial" desc="From 3 dark editorial magazine references">
            <div className="h-[58%] bg-gradient-to-br from-[#0C0F1D] to-[#1B2654] p-3.5">
              <div className="font-mono text-[5px] uppercase tracking-[2px] text-white/25 mb-2">Issue 01</div>
              <div className="text-[15px] text-white leading-[1.1]">Design at the<br />speed of thought</div>
            </div>
            <div className="px-3.5 py-2">
              <div className="h-[3px] bg-[#EFEFEC] rounded-[1px] mb-1 w-[70%]" />
              <div className="h-[3px] bg-[#EFEFEC] rounded-[1px] w-[45%]" />
            </div>
          </GalCard>

          <GalCard tag="Warm Minimal" desc="From a Scandinavian portfolio site">
            <div className="h-[50%] bg-[#F5E6D3] p-3.5 flex flex-col justify-end">
              <div className="text-[14px] text-[#3D2B1F] leading-[1.15]">Craft &amp;<br />Simplicity</div>
            </div>
            <div className="px-3.5 py-2">
              <div className="grid grid-cols-2 gap-1">
                <div className="h-7 bg-[#F5E6D3] rounded-[2px] opacity-40" />
                <div className="h-7 bg-[#F5E6D3] rounded-[2px] opacity-40" />
              </div>
            </div>
          </GalCard>

          <GalCard tag="Brutalist" desc="From 3 brutalist web references">
            <div className="h-[55%] bg-[#FF3B30] p-3.5 flex flex-col justify-end">
              <div className="text-[17px] font-bold text-white tracking-[-0.04em] leading-none uppercase">BREAK<br />RULES</div>
            </div>
            <div className="px-3.5 py-2 bg-[#111]">
              <div className="h-[3px] bg-[#333] mb-1 w-[70%]" />
            </div>
          </GalCard>

          <GalCard tag="Clean SaaS" desc="From a gradient SaaS landing page">
            <div className="h-[45%] bg-gradient-to-br from-[#667eea] to-[#764ba2] p-3.5 text-center flex flex-col items-center justify-center">
              <div className="text-[12px] font-medium text-white tracking-[-0.02em]">Ship faster.<br />Build better.</div>
              <div className="inline-block bg-white text-[#667eea] text-[7px] font-medium px-2.5 py-[3px] rounded-[3px] mt-2">Get Started</div>
            </div>
            <div className="px-3.5 py-2">
              <div className="grid grid-cols-3 gap-[3px]">
                <div className="h-6 bg-[#FAFAF8] border border-[#EFEFEC]/50 rounded-[2px]" />
                <div className="h-6 bg-[#FAFAF8] border border-[#EFEFEC]/50 rounded-[2px]" />
                <div className="h-6 bg-[#FAFAF8] border border-[#EFEFEC]/50 rounded-[2px]" />
              </div>
            </div>
          </GalCard>

          <GalCard tag="Dark Portfolio" desc="From a photographer's folio site" dark>
            <div className="h-[65%] bg-[#1A1A1A] flex items-end p-2.5">
              <div className="text-[10px] text-[#666] tracking-[0.02em]">Selected works<br />2024–2026</div>
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

          <GalCard tag="Swiss" desc="From International Typographic Style refs">
            <div className="h-[40%] bg-white p-3.5 border-b-2 border-[#111] flex flex-col justify-end">
              <div className="text-[15px] font-semibold text-[#111] tracking-[-0.03em] leading-none">Form<br />follows<br />function</div>
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
    <div className="border border-[#EFEFEC]/50 rounded-[6px] overflow-hidden bg-white cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.22,1.0,0.36,1.0)] hover:border-[#4B57DB]/25 hover:-translate-y-1 active:-translate-y-px active:scale-[0.99]">
      <div className="h-[220px] p-4 bg-[#FAFAF8]">
        <div className={`h-full rounded-[3px] overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.03)] ${dark ? "bg-[#111]" : "bg-white"}`}>
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
```

- [ ] **Step 2: Commit**

```bash
git add components/marketing-final/gallery.tsx
git commit -m "feat(marketing): add output gallery (6 style archetypes)"
```

---

## Task 9: export-cta.tsx

**Files:**
- Create: `components/marketing-final/export-cta.tsx`

Dark section. Positions export as the final step in the taste-to-code flow. Shows a code preview with inline-styled HTML output.

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { SectionRule } from "./section-rule";

export function ExportCta() {
  return (
    <section
      className="py-[140px] relative overflow-hidden"
      style={{ backgroundColor: "#0C0C14" }}
      id="export"
    >
      <div className="max-w-[1120px] mx-auto px-10 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        {/* Left: copy */}
        <div>
          <SectionRule label="Export" />
          <h2 className="text-[clamp(28px,4vw,48px)] font-medium tracking-[-0.02em] leading-[1.08] mt-4 text-white text-balance">
            From sketch
            <br />
            to source.
            <br />
            <span className="text-white/30">Effortlessly.</span>
          </h2>
          <p className="text-[15px] text-white/50 leading-[1.7] mt-5 mb-7 text-pretty max-w-[400px]">
            When you're happy with the design, copy clean HTML with inline
            Tailwind styles. Drop it into any project — no framework lock-in,
            no generated garbage.
          </p>
          <div className="flex gap-4 items-center">
            <button className="bg-[#4B57DB] text-white text-[13px] font-medium px-5 py-[10px] rounded-[4px] hover:bg-[#3D49C7] transition-colors">
              Copy HTML
            </button>
            <span className="font-mono text-[10px] uppercase tracking-[1px] text-white/20">
              Inline styles · No dependencies
            </span>
          </div>
        </div>

        {/* Right: code preview */}
        <div className="rounded-[6px] border border-white/[0.07] overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-[#1A1A1A] border-b border-white/[0.06]">
            <div className="w-[5px] h-[5px] rounded-full bg-[#4B57DB]" />
            <span className="font-mono text-[10px] uppercase tracking-[1px] text-white/30">
              output.html
            </span>
          </div>
          <div className="bg-[#111] p-5 font-mono text-[11px] leading-[1.8] overflow-hidden">
            <div className="text-[#555]">&lt;!-- Hero Section --&gt;</div>
            <div>
              <span className="text-[#4B57DB]">&lt;section</span>
              <span className="text-white/40"> style=</span>
              <span className="text-[#D1E4FC]">&quot;background:#0C0F1D;&quot;</span>
              <span className="text-[#4B57DB]">&gt;</span>
            </div>
            <div className="pl-4">
              <span className="text-[#4B57DB]">&lt;div</span>
              <span className="text-white/40"> class=</span>
              <span className="text-[#D1E4FC]">&quot;px-20 py-24&quot;</span>
              <span className="text-[#4B57DB]">&gt;</span>
            </div>
            <div className="pl-8">
              <span className="text-[#4B57DB]">&lt;p</span>
              <span className="text-white/40"> class=</span>
              <span className="text-[#D1E4FC]">&quot;text-xs tracking-widest&quot;</span>
              <span className="text-[#4B57DB]">&gt;</span>
              <span className="text-white/60">Case Study</span>
              <span className="text-[#4B57DB]">&lt;/p&gt;</span>
            </div>
            <div className="pl-8">
              <span className="text-[#4B57DB]">&lt;h1</span>
              <span className="text-white/40"> class=</span>
              <span className="text-[#D1E4FC]">&quot;text-5xl font-medium&quot;</span>
              <span className="text-[#4B57DB]">&gt;</span>
            </div>
            <div className="pl-12 text-white/80">Design at the speed</div>
            <div className="pl-8">
              <span className="text-[#4B57DB]">&lt;/h1&gt;</span>
            </div>
            <div className="pl-4">
              <span className="text-[#4B57DB]">&lt;/div&gt;</span>
            </div>
            <div>
              <span className="text-[#4B57DB]">&lt;/section&gt;</span>
            </div>
            <div className="mt-2 text-[#333]">— 847 lines copied</div>
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/marketing-final/export-cta.tsx
git commit -m "feat(marketing): add export-cta — dark section with code preview"
```

---

## Task 10: footer-cta.tsx

**Files:**
- Create: `components/marketing-final/footer-cta.tsx`

- [ ] **Step 1: Create the file**

Copy exactly from `components/marketing-claude/footer-cta.tsx`:

```tsx
"use client";

export function FooterCta() {
  return (
    <section className="py-[200px] px-10 text-center relative bg-[#FAFAF8]">
      {/* Decorative vertical bars */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[200px] h-10 opacity-[0.06]"
        style={{
          background:
            "repeating-linear-gradient(90deg, #4B57DB 0px, #4B57DB 3px, transparent 3px, transparent 5px)",
          maskImage: "linear-gradient(to top, black, transparent)",
          WebkitMaskImage: "linear-gradient(to top, black, transparent)",
        }}
      />
      <h2 className="text-[clamp(40px,6vw,72px)] font-medium tracking-[-0.03em] leading-[1.0] mb-5 text-balance">
        Your taste.
        <br />
        <span className="text-[#4B57DB] italic">Amplified.</span>
      </h2>
      <p className="text-[16px] text-[#6B6B6B] font-medium mb-9 max-w-[440px] mx-auto text-balance">
        Stop settling for generic AI output. Design with a tool that actually
        gets it.
      </p>
      <button className="text-[13px] font-medium text-white bg-[#1A1A1A] px-6 py-[11px] rounded-[4px] border-none cursor-pointer transition-all duration-150 tracking-[-0.01em] hover:bg-[#333] hover:scale-[1.02] active:scale-[0.97]">
        Start designing
      </button>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/marketing-final/footer-cta.tsx
git commit -m "feat(marketing): add footer-cta — Your taste. Amplified."
```

---

## Task 11: footer.tsx

**Files:**
- Create: `components/marketing-final/footer.tsx`

- [ ] **Step 1: Create the file**

From v2, updated to import LogoMark from local path:

```tsx
import { LogoMark } from "./logo-mark";

export function Footer() {
  return (
    <footer className="w-full bg-[#FAFAF8] px-5 md:px-[80px] py-[32px] flex justify-center border-t border-[#EFEFEC] font-sans text-xs">
      <div className="w-full max-w-[1440px] mx-auto flex flex-col md:flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <LogoMark />
          <span className="font-sans text-[#A0A0A0] text-[13px]">studio OS</span>
        </div>
        <div className="flex items-center gap-6 mt-6 md:mt-0">
          <a href="#" className="text-[#A0A0A0] hover:text-[#1A1A1A] transition-colors">Twitter</a>
          <a href="#" className="text-[#A0A0A0] hover:text-[#1A1A1A] transition-colors">Changelog</a>
          <a href="#" className="text-[#A0A0A0] hover:text-[#1A1A1A] transition-colors">Manifesto</a>
          <a href="#" className="text-[#A0A0A0] hover:text-[#1A1A1A] transition-colors">Contact</a>
        </div>
        <div className="mt-6 md:mt-0 font-mono text-[10px] text-[#A0A0A0]">
          studio-os.io © 2026
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/marketing-final/footer.tsx
git commit -m "feat(marketing): add footer with canonical logo"
```

---

## Task 12: Wire app/page.tsx

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Replace the file content**

```tsx
import { Nav } from "@/components/marketing-final/nav";
import { Hero } from "@/components/marketing-final/hero";
import { Comparison } from "@/components/marketing-final/comparison";
import { HowItWorks } from "@/components/marketing-final/how-it-works";
import { Features } from "@/components/marketing-final/features";
import { Gallery } from "@/components/marketing-final/gallery";
import { ExportCta } from "@/components/marketing-final/export-cta";
import { FooterCta } from "@/components/marketing-final/footer-cta";
import { Footer } from "@/components/marketing-final/footer";

export const metadata = {
  title: "Studio OS — AI that designs like you.",
  description:
    "Feed it references. Studio OS extracts your taste and generates designs that reflect your sensibility — then you edit in a real canvas.",
};

export default function MarketingPage() {
  return (
    <div className="min-h-screen text-[#1A1A1A] font-sans selection:bg-[#D1E4FC] selection:text-[#0C0C14] overflow-x-hidden">
      <Nav />
      <Hero />
      <Comparison />
      <HowItWorks />
      <Features />
      <Gallery />
      <ExportCta />
      <FooterCta />
      <Footer />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/page.tsx
git commit -m "feat(marketing): wire app/page.tsx to marketing-final components"
```

---

## Task 13: Build check

**Files:** None (verification only)

- [ ] **Step 1: Run TypeScript check**

```bash
cd "/Users/niki_g/Local Files/workflow/Projects/studio OS/studio-os" && npx tsc --noEmit 2>&1 | head -40
```

Expected: only pre-existing errors (canvas-client.tsx:525, UploadZone.tsx:31, etc.) — no new errors from marketing-final components.

- [ ] **Step 2: Run dev server and visually verify**

```bash
npm run dev
```

Navigate to `http://localhost:3000` and check:
- [ ] Dark hero with split layout loads (no flash of unstyled content)
- [ ] Product shot is visible — warm-dark editor with mini rail, layers panel, canvas, inspector
- [ ] Comparison section: two panels, left desaturated, right with accent border
- [ ] HowItWorks: 3-column grid with step visuals
- [ ] Features: dark section, 4 cards readable
- [ ] Gallery: 6 style cards with correct tags and preview content
- [ ] ExportCta: dark section with code block
- [ ] FooterCta: "Your taste. Amplified."
- [ ] Footer: logo + links + copyright
- [ ] No 404s in console, no layout overflow issues

- [ ] **Step 3: Commit any visual fixes found during review, then push**

```bash
git push origin main
```

---

## Self-Review Checklist

### Spec coverage

| Brief requirement | Task |
|---|---|
| Hero: dark, bold, product shot dominant | Task 4 |
| Comparison: generic vs taste-aware (emotional core) | Task 5 |
| How it works: 3 steps | Task 6 |
| Features: what makes editor real | Task 7 |
| Output gallery: 6 styles | Task 8 |
| Export: code output section | Task 9 |
| Footer CTA: "Your taste. Amplified." | Task 10 |
| Messaging rewrite (designer language, "taste" central) | Tasks 3, 4, 7 |
| SectionRule pattern throughout | Tasks 5, 6, 7, 8, 9 |
| Correct logo SVG (3-layer folder) | Task 2 |
| Nav updated links | Task 3 |
| Geist Sans body, IBM Plex Mono labels | Enforced via font-sans / font-mono |
| Accent #4B57DB | Enforced throughout |
| No shadows except product shot | Enforced |
| Tile grid background on dark sections | Tasks 4, 7 |
| Section order (Hero→Comparison→How→Features→Gallery→Export→FooterCTA→Footer) | Task 12 |
| Consolidate to one directory | Tasks 1–11 (marketing-final) |

### Placeholder scan

No TBD, TODO, or "similar to Task N" entries found.

### Type consistency

- `LayerItem` props: `label: string, depth: number, selected?: boolean` — defined in Task 4, consistent.
- `InspRule` props: `label: string` — defined in Task 4, consistent.
- `InspRow` props: `label: string, value: string, unit?: string` — defined in Task 4, consistent.
- `GenStage` status union: `"done" | "active" | "pending"` — defined in Task 6, consistent.
- `GalCard` props: `tag, desc, dark?, children` — defined in Task 8, consistent.
- `SectionRule` props: `label: string` — defined in Task 1, used in Tasks 5, 6, 7, 8, 9 via `import { SectionRule } from "./section-rule"`.
- `LogoMark` props: `className?: string` — defined in Task 2, used in Tasks 3, 11.
