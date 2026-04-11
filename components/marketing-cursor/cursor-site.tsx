"use client";

import type { ReactNode } from "react";
import { useCallback, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  BoxSelect,
  Boxes,
  Hand,
  Layers,
  LayoutTemplate,
  MessageCircle,
  Monitor,
  Moon,
  MousePointer2,
  Redo2,
  Sun,
  SlidersHorizontal,
  Type,
  Undo2,
} from "lucide-react";
import { LogoMark } from "@/components/marketing-v2/logo-mark";
import { cn } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1] as const;

/** Primary CTA on dark hero/nav — brand royal (Studio OS), sand text. */
const ctaPrimaryOnDark =
  "rounded-[6px] bg-[#3A48B5] px-6 py-3 text-[14px] font-semibold text-[#FAFAFA] shadow-[0_1px_0_rgba(255,255,255,0.14)_inset] transition-colors hover:bg-[#323F9F] active:bg-[#2D3A91]";
const ctaPrimaryOnDarkNav =
  "rounded-[4px] bg-[#3A48B5] px-3.5 py-2 text-[13px] font-semibold text-[#FAFAFA] transition-colors hover:bg-[#323F9F] active:bg-[#2D3A91] md:px-4";
/** Secondary — ghost outline on charcoal. */
const ctaSecondaryOnDark =
  "rounded-[6px] border border-white/[0.18] bg-transparent px-5 py-3 text-[14px] font-medium text-white/85 transition-colors hover:border-[#D1E2F6]/35 hover:bg-[#3A48B5]/15";

function Nav() {
  const links = [
    { href: "#harness", label: "Harness" },
    { href: "#editor", label: "Editor" },
    { href: "#taste", label: "Taste" },
    { href: "#pricing", label: "Pricing" },
    { href: "#export", label: "Export" },
  ] as const;

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-50">
      <div className="pointer-events-auto border-b border-white/[0.05] bg-[#010206]/50 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-5 md:h-16 md:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark className="brightness-0 invert" />
            <span className="text-[14px] font-medium tracking-[-0.02em] text-[#FAFAFA] md:text-[15px]">studio OS</span>
          </Link>
          <div className="flex items-center gap-1 md:gap-2">
            <nav className="hidden items-center md:flex md:gap-1">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="rounded-[4px] px-2.5 py-1.5 text-[13px] font-medium text-white/45 transition-colors hover:bg-white/[0.04] hover:text-white/90"
                >
                  {l.label}
                </a>
              ))}
            </nav>
            <button type="button" className={`ml-1 ${ctaPrimaryOnDarkNav}`}>
              Join waitlist
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

/** Hero atmosphere — dark studio up top; brand blue only in the bottom wash. */
function HeroAmbient() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[#010206]" />

      {/* No extra “floor” ellipses here — they were mixing to slate behind the mockup. */}

      <div
        className="absolute inset-x-0 bottom-0 h-[42%]"
        style={{
          background:
            "linear-gradient(to top, rgba(2,4,14,0.98) 0%, rgba(4,8,22,0.22) 55%, transparent 100%)",
        }}
      />

      {/* Pull the ceiling toward true black; bluish mists sit above this in the stack */}
      <div
        className="absolute inset-x-0 top-0 h-[min(36vh,400px)]"
        style={{
          background: "linear-gradient(180deg, rgba(0,0,0,0.68) 0%, rgba(1,2,8,0.42) 38%, rgba(2,5,14,0.08) 68%, transparent 100%)",
        }}
      />

      {/* Slight bluish air — toned down so the top reads blacker */}
      <div
        className="absolute -left-[18%] top-[-12%] h-[min(72vh,560px)] w-[min(92vw,720px)] rounded-full opacity-[0.38] blur-[100px]"
        style={{
          background: "radial-gradient(closest-side, rgba(58,72,181,0.36), rgba(58,72,181,0.06) 58%, transparent 74%)",
        }}
      />
      <div
        className="absolute left-1/2 top-[-20%] h-[min(90vh,700px)] w-[min(115vw,860px)] -translate-x-1/2 opacity-[0.32] blur-[115px]"
        style={{
          background: "radial-gradient(closest-side, rgba(58,72,181,0.28), rgba(75,87,219,0.08) 52%, transparent 72%)",
        }}
      />
      <div
        className="absolute -right-[12%] top-[8%] h-[min(52vh,480px)] w-[min(78vw,560px)] rounded-full opacity-[0.26] blur-[95px]"
        style={{
          background: "radial-gradient(closest-side, rgba(209,226,246,0.18), rgba(58,72,181,0.08) 55%, transparent 72%)",
        }}
      />
      <div
        className="absolute inset-x-0 top-0 h-[40%] opacity-[0.42]"
        style={{
          background: "linear-gradient(180deg, rgba(28,36,68,0.22) 0%, rgba(12,18,40,0.08) 48%, transparent 100%)",
        }}
      />

      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 65% at 50% 38%, transparent 25%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      <div
        className="absolute inset-0 opacity-[0.09]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(160,185,240,0.06) 1px, transparent 0)",
          backgroundSize: "30px 30px",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#02040a]/42 via-transparent to-[#020308]/18" />

      {/*
        Bottom glow only: saturated royal + sky — short mid blend so nothing goes “slate”.
        (Fewer stops = less muddy gray between dark and the good blue you see at the very bottom.)
      */}
      <div
        className="absolute inset-x-[-12%] top-[12%] bottom-0"
        style={{
          background: [
            "radial-gradient(ellipse 92% 52% at 50% 100%, rgba(58,72,181,0.34) 0%, transparent 50%)",
            "radial-gradient(ellipse 108% 76% at 50% 100%, rgba(209,226,246,0.62) 0%, rgba(209,226,246,0.36) 18%, rgba(58,72,181,0.2) 38%, rgba(58,72,181,0.08) 58%, transparent 82%)",
          ].join(", "),
        }}
      />
    </div>
  );
}

const HERO_TRANSPORT_TOOLS = [
  { id: "select", Icon: MousePointer2, label: "Cursor (V)" },
  { id: "hand", Icon: Hand, label: "Hand (H)" },
  { id: "marquee", Icon: BoxSelect, label: "Marquee (M)" },
  { id: "frame", Icon: LayoutTemplate, label: "Frame (F)" },
  { id: "text", Icon: Type, label: "Text (T)" },
  { id: "prompt", Icon: MessageCircle, label: "Prompt (K)" },
] as const;

const HERO_ZOOM_LEVELS = [50, 75, 85, 100, 125] as const;

/** Dark editor chrome — interactive marketing preview (mirrors canvas-v1 structure). */
function HeroEditorMockup() {
  const [railActive, setRailActive] = useState<"layers" | "inspector" | "components" | "theme">("layers");
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [toolIndex, setToolIndex] = useState(0);
  const [inspectorTab, setInspectorTab] = useState<"design" | "css" | "export">("design");
  const [refSelected, setRefSelected] = useState(false);
  const [cardIndex, setCardIndex] = useState<number | null>(1);
  const [zoomIdx, setZoomIdx] = useState(2);
  const [history, setHistory] = useState(3);
  const [themePref, setThemePref] = useState(0);
  const [exportFlash, setExportFlash] = useState<string | null>(null);
  const [libraryFlash, setLibraryFlash] = useState(false);

  const themeIcons = [Moon, Sun, Monitor] as const;
  const ThemeIcon = themeIcons[themePref % 3];
  const themeTitles = ["Theme: dark", "Theme: light", "Theme: system"] as const;

  const workspaceTint =
    themePref % 3 === 1
      ? { bg: "#F4F4F0", dot: "rgba(0,0,0,0.07)" }
      : { bg: "#10101a", dot: "rgba(255,255,255,0.09)" };

  const dotCanvas = {
    backgroundColor: workspaceTint.bg,
    backgroundImage: `radial-gradient(${workspaceTint.dot} 0.65px, transparent 0.65px)`,
    backgroundSize: "14px 14px",
  } as const;

  const cycleZoom = useCallback(() => {
    setZoomIdx((i) => (i + 1) % HERO_ZOOM_LEVELS.length);
  }, []);

  const copySnippet = useCallback(() => {
    const snippet = `<section class="hero">\n  <h1>Design with References</h1>\n</section>`;
    void navigator.clipboard.writeText(snippet).then(
      () => setExportFlash("Copied HTML"),
      () => setExportFlash("Copied")
    );
    window.setTimeout(() => setExportFlash(null), 1800);
  }, []);

  const railBtn =
    "flex h-7 w-7 items-center justify-center rounded-[5px] transition-colors md:h-8 md:w-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3A48B5]/50";

  return (
    <div
      className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-[inherit] bg-[#12121a]"
      role="application"
      aria-label="Interactive editor preview"
      onClick={(e) => e.stopPropagation()}
    >
      {/* App title strip */}
      <div className="flex h-7 shrink-0 items-center justify-between border-b border-[#2A2A2A] bg-[#16161c] px-2.5 md:h-8 md:px-3">
        <div className="flex items-center gap-1.5" aria-hidden>
          <span className="h-2 w-2 rounded-full bg-[#FF5F57]/90" />
          <span className="h-2 w-2 rounded-full bg-[#FEBC2E]/90" />
          <span className="h-2 w-2 rounded-full bg-[#28C840]/90" />
        </div>
        <span
          className="truncate font-mono text-[7px] font-medium tracking-wide text-[#6B6B6B] md:text-[8px]"
          style={{ fontFamily: "ui-monospace, monospace" }}
        >
          studio OS · Canvas
        </span>
        <span className="font-mono text-[7px] text-[#5C5C5C] md:text-[8px]">desktop · 1440</span>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Mini rail */}
        <div className="flex w-[34px] shrink-0 flex-col items-center gap-1 border-r border-[#2A2A2A] bg-[#14141a] py-2 md:w-[38px] md:gap-1.5 md:py-2.5">
          <button
            type="button"
            title="Layers"
            aria-pressed={railActive === "layers"}
            onClick={() => {
              setRailActive("layers");
            }}
            className={cn(railBtn, railActive === "layers" ? "bg-[#3A48B5]/20 text-[#8B9AE8]" : "text-[#6B6B6B] hover:bg-white/[0.06]")}
          >
            <Layers className="h-3.5 w-3.5 md:h-4 md:w-4" strokeWidth={2} />
          </button>
          <button
            type="button"
            title="Inspector"
            aria-pressed={railActive === "inspector"}
            onClick={() => {
              setRailActive("inspector");
              setInspectorOpen((o) => !o);
            }}
            className={cn(railBtn, railActive === "inspector" ? "bg-[#3A48B5]/20 text-[#8B9AE8]" : "text-[#6B6B6B] hover:bg-white/[0.06]")}
          >
            <SlidersHorizontal className="h-3.5 w-3.5 md:h-4 md:w-4" strokeWidth={2} />
          </button>
          <button
            type="button"
            title="Component gallery"
            aria-pressed={railActive === "components"}
            onClick={() => {
              setRailActive("components");
              setLibraryFlash(true);
              window.setTimeout(() => setLibraryFlash(false), 1400);
            }}
            className={cn(railBtn, railActive === "components" ? "bg-[#3A48B5]/20 text-[#8B9AE8]" : "text-[#6B6B6B] hover:bg-white/[0.06]")}
          >
            <Boxes className="h-3.5 w-3.5 md:h-4 md:w-4" strokeWidth={2} />
          </button>
          <button
            type="button"
            title={themeTitles[themePref % 3]}
            aria-label={themeTitles[themePref % 3]}
            onClick={() => {
              setRailActive("theme");
              setThemePref((n) => (n + 1) % 3);
            }}
            className={cn("mt-auto", railBtn, railActive === "theme" ? "bg-[#3A48B5]/20 text-[#8B9AE8]" : "text-[#6B6B6B] hover:bg-white/[0.06]")}
          >
            <ThemeIcon className="h-3.5 w-3.5 md:h-4 md:w-4" strokeWidth={2} />
          </button>
        </div>

        {/* Canvas + artboard */}
        <div
          className={cn(
            "relative min-w-0 flex-1 overflow-hidden",
            toolIndex === 1 && "cursor-grab active:cursor-grabbing"
          )}
          style={dotCanvas}
        >
          {libraryFlash ? (
            <div className="pointer-events-none absolute left-1/2 top-[6%] z-[4] -translate-x-1/2 rounded-[4px] border border-[#3A48B5]/40 bg-[#1C1C1C] px-2 py-1 font-mono text-[7px] text-[#D1E2F6] shadow-lg md:text-[8px]">
              Library · browse components
            </div>
          ) : null}

          {/* Reference card */}
          <button
            type="button"
            title={refSelected ? "Deselect reference" : "Select reference"}
            aria-pressed={refSelected}
            onClick={() => setRefSelected((v) => !v)}
            className={cn(
              "absolute left-[6%] top-[14%] z-[1] w-[18%] min-w-[56px] rounded-[3px] border bg-[#1C1C1C] p-1 text-left shadow-lg transition-shadow md:left-[8%] md:top-[12%] md:w-[15%]",
              refSelected
                ? "border-[#4B57DB] ring-2 ring-[#4B57DB]/35"
                : "border-[#2A2A2A] hover:border-[#3A48B5]/45"
            )}
          >
            <div
              className="aspect-[4/3] w-full rounded-[2px] bg-gradient-to-br from-[#2a2f4a] via-[#1a1f35] to-[#121828]"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, rgba(58,72,181,0.35) 0%, transparent 50%), radial-gradient(circle at 30% 20%, rgba(252,129,98,0.15), transparent 55%)",
              }}
            />
            <p className="mt-1 truncate font-mono text-[5px] text-[#8A8A8A] md:text-[6px]">Reference</p>
          </button>

          {/* Artboard */}
          <div className="pointer-events-none absolute left-1/2 top-[10%] z-[2] w-[58%] -translate-x-1/2 md:top-[8%] md:w-[52%]">
            <div className="relative rounded-[3px] border border-[#4B57DB]/55 bg-[#0e0e14] shadow-[0_0_0_1px_rgba(75,87,219,0.2),0_16px_40px_-12px_rgba(0,0,0,0.65)]">
              <div className="absolute -top-[15px] left-0 flex items-center gap-1 rounded-[2px] bg-[#4B57DB] px-1.5 py-0.5 font-mono text-[6px] font-medium text-white md:-top-[17px] md:text-[7px]">
                Hero — frame
              </div>
              <div
                className="relative aspect-[16/11] w-full rounded-[2px]"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, rgba(75,87,219,0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(75,87,219,0.07) 1px, transparent 1px)",
                  backgroundSize: "12px 12px",
                  backgroundColor: "#14141f",
                }}
              >
                <div className="pointer-events-auto absolute left-[8%] top-[10%] h-[18%] w-[55%] rounded-[2px] border border-[#3A48B5]/40 bg-[#1a1a24]/90" />
                <div className="pointer-events-auto absolute bottom-[12%] left-[8%] right-[8%] flex gap-[2%]">
                  {[0, 1, 2].map((i) => (
                    <button
                      key={i}
                      type="button"
                      aria-pressed={cardIndex === i}
                      onClick={() => setCardIndex((c) => (c === i ? null : i))}
                      className={cn(
                        "h-[22%] flex-1 rounded-[2px] border transition-colors",
                        cardIndex === i
                          ? "border-[#4B57DB] bg-[#252532]/95 ring-1 ring-[#4B57DB]/40"
                          : "border-white/[0.06] bg-[#1C1C28]/80 hover:border-white/15"
                      )}
                      style={{ opacity: 1 - i * 0.15 }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom transport bar */}
          <div className="absolute bottom-[5%] left-1/2 z-[3] flex -translate-x-1/2 items-center gap-1 rounded-[5px] border border-[#2A2A2A] bg-[#1C1C1C] px-1 py-0.5 shadow-xl md:bottom-[6%] md:gap-1.5 md:px-1.5 md:py-1">
            <div className="flex items-center gap-0.5 border-r border-[#2A2A2A] pr-1 md:pr-1.5">
              {HERO_TRANSPORT_TOOLS.map(({ id, Icon, label }, i) => (
                <button
                  key={id}
                  type="button"
                  title={label}
                  aria-pressed={toolIndex === i}
                  onClick={() => setToolIndex(i)}
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-[3px] md:h-6 md:w-6",
                    toolIndex === i ? "bg-[#2A2A2A] text-[#D1E2F6]" : "text-[#6B6B6B] hover:bg-white/[0.06] hover:text-[#9A9A9A]"
                  )}
                >
                  <Icon className="h-2.5 w-2.5 md:h-3 md:w-3" strokeWidth={2} />
                </button>
              ))}
            </div>
            <div className="flex items-center gap-0.5 border-r border-[#2A2A2A] pr-1 text-[#6B6B6B] md:gap-1 md:pr-1.5">
              <button
                type="button"
                title="Undo"
                disabled={history <= 0}
                onClick={() => setHistory((h) => Math.max(0, h - 1))}
                className="rounded-[2px] p-0.5 hover:bg-white/[0.08] disabled:opacity-30"
              >
                <Undo2 className="h-2.5 w-2.5 md:h-3 md:w-3" strokeWidth={2} />
              </button>
              <button
                type="button"
                title="Redo"
                disabled={history >= 5}
                onClick={() => setHistory((h) => Math.min(5, h + 1))}
                className="rounded-[2px] p-0.5 hover:bg-white/[0.08] disabled:opacity-30"
              >
                <Redo2 className="h-2.5 w-2.5 md:h-3 md:w-3" strokeWidth={2} />
              </button>
            </div>
            <button
              type="button"
              title="Cycle zoom"
              onClick={cycleZoom}
              className="pr-0.5 font-mono text-[7px] tabular-nums text-[#A0A0A0] hover:text-[#D1E2F6] md:text-[8px]"
            >
              {HERO_ZOOM_LEVELS[zoomIdx]}%
            </button>
          </div>
        </div>

        {/* Inspector */}
        {inspectorOpen ? (
          <div className="hidden w-[30%] min-w-[100px] shrink-0 flex-col border-l border-[#2A2A2A] bg-[#1C1C1C] sm:flex md:w-[26%] md:min-w-[120px]">
            <div className="flex shrink-0 flex-wrap gap-1 border-b border-[#2A2A2A] px-2 py-1.5 md:px-2.5 md:py-2">
              {(["design", "css", "export"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setInspectorTab(tab)}
                  className={cn(
                    "rounded-[3px] px-1.5 py-0.5 font-mono text-[6px] font-medium capitalize md:text-[7px]",
                    inspectorTab === tab ? "bg-[#2A2A2A] text-[#E8E8E8]" : "text-[#5C5C5C] hover:bg-white/[0.06] hover:text-[#9A9A9A]"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2 md:px-2.5 md:py-2.5">
              {inspectorTab === "design" ? (
                <>
                  <p className="mb-1.5 font-mono text-[6px] uppercase tracking-[0.08em] text-[#6B6B6B] md:text-[7px]">Taste</p>
                  <div className="space-y-2 rounded-[3px] border border-[#2A2A2A] bg-[#141414] p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[7px] text-[#9A9A9A] md:text-[8px]">Density</span>
                      <span className="font-mono text-[7px] text-[#D1E2F6] md:text-[8px]">tight</span>
                    </div>
                    <div className="h-px bg-[#2A2A2A]" />
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[7px] text-[#9A9A9A] md:text-[8px]">Type</span>
                      <span className="font-mono text-[7px] text-[#D1E2F6] md:text-[8px]">editorial</span>
                    </div>
                    <div className="h-px bg-[#2A2A2A]" />
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[7px] text-[#9A9A9A] md:text-[8px]">Palette</span>
                      <span className="font-mono text-[7px] text-[#D1E2F6] md:text-[8px]">neutral</span>
                    </div>
                  </div>
                  <p className="mb-1 mt-3 font-mono text-[6px] uppercase tracking-[0.08em] text-[#6B6B6B] md:mt-4 md:text-[7px]">
                    Selection
                  </p>
                  <div className="space-y-1.5 rounded-[3px] border border-[#2A2A2A] bg-[#141414] p-2 font-mono text-[6px] text-[#8A8A8A] md:text-[7px]">
                    <div className="flex justify-between">
                      <span>Width</span>
                      <span className="text-[#C8C8C8]">Fill</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Height</span>
                      <span className="text-[#C8C8C8]">Hug</span>
                    </div>
                  </div>
                </>
              ) : null}
              {inspectorTab === "css" ? (
                <div className="space-y-2 rounded-[3px] border border-[#2A2A2A] bg-[#141414] p-2 font-mono text-[6px] leading-relaxed text-[#9A9A9A] md:text-[7px]">
                  <p className="text-[#6B6B6B]">.hero &#123;</p>
                  <p className="pl-2 text-[#D1E2F6]/90">display: flex;</p>
                  <p className="pl-2 text-[#D1E2F6]/90">gap: 1.5rem;</p>
                  <p className="text-[#6B6B6B]">&#125;</p>
                </div>
              ) : null}
              {inspectorTab === "export" ? (
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={copySnippet}
                    className="rounded-[4px] bg-[#3A48B5] px-2 py-1.5 text-center font-mono text-[7px] font-medium text-[#FAFAFA] hover:bg-[#323F9F] md:text-[8px]"
                  >
                    Copy HTML
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExportFlash("Publish queued");
                      window.setTimeout(() => setExportFlash(null), 1800);
                    }}
                    className="rounded-[4px] border border-[#2A2A2A] bg-transparent px-2 py-1.5 text-center font-mono text-[7px] text-[#C8C8C8] hover:bg-white/[0.06] md:text-[8px]"
                  >
                    Publish link
                  </button>
                  {exportFlash ? (
                    <p className="text-center font-mono text-[6px] text-[#4ADE80] md:text-[7px]">{exportFlash}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function HeroVisual() {
  const windowShadow = [
    "0 0 0 1px rgba(255,255,255,0.065)",
    "0 1px 0 rgba(255,255,255,0.05) inset",
    "0 -1px 0 rgba(0,0,0,0.35) inset",
    "0 20px 50px -12px rgba(0,0,0,0.55)",
    "0 40px 100px -24px rgba(0,0,0,0.5)",
    "0 72px 140px -36px rgba(0,0,0,0.45)",
    "0 0 80px -20px rgba(58,72,181,0.14)",
  ].join(", ");

  return (
    <div className="relative mx-auto w-full pb-6 pt-1 [perspective:1200px] md:pb-10">
      {/* Contact shadow — soft oval on the “floor” under the window */}
      <div
        className="pointer-events-none absolute -bottom-1 left-1/2 z-0 h-[min(100px,14vw)] w-[min(92%,1040px)] -translate-x-1/2 md:-bottom-2 md:h-[min(120px,12vw)]"
        style={{
          background: "radial-gradient(ellipse 100% 100% at 50% 50%, rgba(0,0,0,0.5), transparent 68%)",
          filter: "blur(28px)",
          opacity: 0.85,
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-3 left-1/2 z-0 h-[min(80px,11vw)] w-[min(75%,880px)] -translate-x-1/2 opacity-50 md:-bottom-4"
        style={{
          background: "radial-gradient(ellipse 100% 100% at 50% 50%, rgba(0,0,0,0.65), transparent 72%)",
          filter: "blur(20px)",
        }}
        aria-hidden
      />

      <div className="relative z-[1]">
        <div
          className="relative aspect-[16/10] w-full rounded-[14px] md:rounded-[16px]"
          style={{ boxShadow: windowShadow }}
        >
          {/* Outer bezel + faint top highlight (glass edge) */}
          <div
            className="absolute inset-0 rounded-[inherit] bg-[#0a0a10]"
            style={{
              boxShadow: "0 0 0 1px rgba(255,255,255,0.04), 0 0 1px rgba(255,255,255,0.08)",
            }}
          >
            <div
              className="absolute inset-0 rounded-[inherit] opacity-[0.15]"
              style={{
                background:
                  "linear-gradient(165deg, rgba(255,255,255,0.07) 0%, transparent 42%, transparent 100%)",
              }}
            />
          </div>
          <div className="absolute inset-[6px] overflow-hidden rounded-[11px] border border-white/[0.07] bg-[#0c0c12] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] md:inset-[7px] md:rounded-[12px]">
            <HeroEditorMockup />
          </div>
        </div>
      </div>
    </div>
  );
}

function HarnessVisualImportScore() {
  return (
    <div className="relative mx-auto w-full max-w-[280px]">
      <p className="mb-3 font-mono text-[7px] uppercase tracking-[1px] text-[#6B6B6B]">Drop references</p>
      <div className="mb-4 flex items-end justify-center gap-2">
        <div
          className="h-14 w-11 rounded-[3px] bg-[#E5E7EB] shadow-sm ring-1 ring-[#D1E2F6]"
          style={{
            backgroundImage:
              "linear-gradient(145deg, #f0f0f0 0%, #d8d8d8 40%, #e8e8e8 100%)",
          }}
        />
        <div className="h-16 w-12 rounded-[3px] bg-[#3A48B5]/15 ring-1 ring-[#3A48B5]/25">
          <div className="m-1.5 space-y-1">
            <div className="h-1 w-full rounded-full bg-[#3A48B5]/35" />
            <div className="h-1 w-4/5 rounded-full bg-[#3A48B5]/20" />
            <div className="mt-2 h-6 w-full rounded-[2px] bg-white/80" />
          </div>
        </div>
        <div className="flex h-12 w-10 items-center justify-center rounded-[3px] border border-dashed border-[#3A48B5]/35 bg-[#FAFAFA]">
          <span className="font-mono text-[9px] text-[#3A48B5]/60">+</span>
        </div>
      </div>
      <div className="flex items-stretch gap-2">
        <div className="flex flex-1 flex-col gap-1.5 rounded-[4px] border border-[#D1E2F6] bg-white p-2.5 shadow-sm">
          <span className="font-mono text-[6px] uppercase tracking-[0.5px] text-[#6B6B6B]">Hierarchy</span>
          <div className="flex h-[42px] items-end justify-between gap-1 px-0.5">
            {[40, 65, 35, 80, 50].map((h, i) => (
              <div
                key={i}
                className="w-[18%] rounded-t-[1px] bg-[#3A48B5]/25"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
        <div className="flex w-[72px] flex-col justify-between rounded-[4px] border border-[#D1E2F6] bg-white p-2 shadow-sm">
          <span className="font-mono text-[6px] uppercase tracking-[0.5px] text-[#6B6B6B]">Rhythm</span>
          <div className="flex h-8 items-end justify-between px-0.5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex w-1 flex-col justify-end gap-0.5">
                <div className="h-2 w-px bg-[#3A48B5]/50" />
                <div className="h-2 w-px bg-[#3A48B5]/30" />
                <div className="h-2 w-px bg-[#3A48B5]/15" />
              </div>
            ))}
          </div>
        </div>
        <div className="flex w-[52px] flex-col gap-1.5 rounded-[4px] border border-[#D1E2F6] bg-white p-2 shadow-sm">
          <span className="font-mono text-[6px] uppercase tracking-[0.5px] text-[#6B6B6B]">Palette</span>
          <div className="flex flex-1 flex-col gap-1">
            <div className="h-2.5 w-full rounded-[1px] bg-[#1B283D]" />
            <div className="h-2.5 w-full rounded-[1px] bg-[#D1E2F6]" />
            <div className="h-2.5 w-full rounded-[1px] bg-[#FC8162]" />
          </div>
        </div>
      </div>
    </div>
  );
}

function HarnessVisualCompileTaste() {
  return (
    <div className="relative mx-auto w-full max-w-[280px]">
      <div className="mb-3 rounded-[4px] border border-[#3A48B5]/15 bg-white px-2.5 py-2 shadow-sm">
        <p className="font-mono text-[8px] leading-relaxed text-[#525252]">
          <span className="text-[#3A48B5]">›</span> Keep editorial type, tight vertical rhythm, no neon accents…
        </p>
      </div>
      <p className="mb-2 font-mono text-[7px] uppercase tracking-[1px] text-[#6B6B6B]">Becomes constraints</p>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 rounded-[4px] border border-[#3A48B5]/20 bg-[#3A48B5]/10 px-2.5 py-2">
          <span className="shrink-0 font-mono text-[7px] font-medium uppercase tracking-[0.5px] text-[#3A48B5]">
            Protect
          </span>
          <span className="text-[9px] font-medium text-[#1B283D]">Serif display · 8/16/32 spacing</span>
        </div>
        <div className="flex items-center gap-2 rounded-[4px] border border-dashed border-[#D1E2F6] bg-[#FAFAFA] px-2.5 py-2">
          <span className="shrink-0 font-mono text-[7px] font-medium uppercase tracking-[0.5px] text-[#6B6B6B]">
            Bend
          </span>
          <span className="text-[9px] font-medium text-[#525252]">Line length · component density</span>
        </div>
        <div className="flex items-center gap-2 rounded-[4px] border border-[#FC8162]/25 bg-white px-2.5 py-2 opacity-90">
          <span className="shrink-0 font-mono text-[7px] font-medium uppercase tracking-[0.5px] text-[#B85A45]">
            Avoid
          </span>
          <span className="text-[9px] font-medium text-[#6B6B6B] line-through decoration-[#FC8162]/50">Gradients · heavy shadows</span>
        </div>
      </div>
    </div>
  );
}

function HarnessVisualEditExport() {
  return (
    <div className="relative mx-auto w-full max-w-[280px]">
      <div className="overflow-hidden rounded-[4px] border border-[#2A2A2A] bg-[#141418] shadow-md">
        <div className="flex h-6 items-center gap-1 border-b border-white/[0.06] bg-[#1A1A1F] px-2">
          <div className="h-1.5 w-1.5 rounded-full bg-[#FC8162]/90" />
          <div className="h-1.5 w-1.5 rounded-full bg-[#E8C547]/80" />
          <div className="h-1.5 w-1.5 rounded-full bg-[#4ADE80]/70" />
          <span className="ml-2 font-mono text-[6px] text-[#6B6B6B]">Canvas</span>
        </div>
        <div className="flex gap-2 p-2">
          <div
            className="relative h-[72px] flex-[1.15] rounded-[3px] bg-[#FAFAFA]"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(58,72,181,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(58,72,181,0.06) 1px, transparent 1px)",
              backgroundSize: "10px 10px",
            }}
          >
            <div className="absolute left-2 top-2 h-7 w-[42%] rounded-[2px] border border-[#3A48B5]/40 bg-white shadow-sm" />
            <div className="absolute bottom-2 left-2 right-2 flex gap-1">
              <div className="h-3 flex-1 rounded-[1px] bg-[#3A48B5]/10" />
              <div className="h-3 flex-1 rounded-[1px] bg-[#3A48B5]/6" />
            </div>
          </div>
          <div className="flex w-[52px] flex-col gap-0.5 rounded-[2px] bg-[#0F0F12] p-1.5">
            <span className="mb-0.5 font-mono text-[5px] uppercase tracking-[0.5px] text-[#555]">Layers</span>
            <div className="h-1.5 w-full rounded-[1px] bg-[#3A48B5]/40" />
            <div className="h-1.5 w-full rounded-[1px] bg-[#333]" />
            <div className="h-1.5 w-full rounded-[1px] bg-[#2A2A2A]" />
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <span className="rounded-[3px] bg-[#3A48B5] px-2.5 py-1.5 font-mono text-[8px] font-medium text-[#FAFAFA] shadow-sm">
          Copy HTML
        </span>
        <span className="rounded-[3px] border border-[#D1E2F6] bg-white px-2.5 py-1.5 font-mono text-[8px] font-medium text-[#1B283D]">
          Publish
        </span>
      </div>
    </div>
  );
}

function HarnessStepCard({
  step,
  title,
  body,
  visual,
}: {
  step: string;
  title: string;
  body: string;
  visual: ReactNode;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ duration: 0.5, ease }}
      className="flex h-full flex-col overflow-hidden rounded-[6px] border border-[#3A48B5]/12 bg-white shadow-[0_12px_48px_-28px_rgba(58,72,181,0.14)]"
    >
      <div className="border-b border-[#D1E2F6]/90 bg-[linear-gradient(180deg,#FAFAFA_0%,#F5F6FA_100%)] px-4 py-6 md:px-5 md:py-7">
        {visual}
      </div>
      <div className="flex flex-1 flex-col px-5 pb-6 pt-5 md:px-6 md:pb-7 md:pt-6">
        <span className="mb-3 font-mono text-[10px] tracking-[1px] text-[#525252]">{step}</span>
        <h3 className="mb-2 font-['Noto_Serif'] text-[20px] font-medium leading-snug tracking-tight text-[#1B283D] md:text-[22px]">
          {title}
        </h3>
        <p className="text-[14px] font-medium leading-relaxed text-[#6B6B6B]">{body}</p>
      </div>
    </motion.article>
  );
}

function TasteStrip() {
  const chips = [
    { label: "Spacing rhythm", v: "8 / 16 / 32" },
    { label: "Type voice", v: "serif display" },
    { label: "Palette", v: "neutral + accent" },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((c) => (
        <div
          key={c.label}
          className="flex items-center gap-2 rounded-[4px] border border-[#D1E2F6] bg-[#FAFAFA] px-3 py-2"
        >
          <span className="font-mono text-[10px] uppercase tracking-[1px] text-[#6B6B6B]">
            {c.label}
          </span>
          <span className="text-[12px] font-medium text-[#1B283D]">{c.v}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Editor section (after marketing-claude / editor-showcase) ─── */

function PitchInspRule({ label }: { label: string }) {
  return (
    <div className="mb-2 flex items-center gap-1.5">
      <div className="h-px flex-1 bg-[#2A2A2A]" />
      <span className="whitespace-nowrap font-mono text-[7px] uppercase tracking-[1px] text-[#4A4A4A]">
        {label}
      </span>
      <div className="h-px flex-1 bg-[#2A2A2A]" />
    </div>
  );
}

function PitchInspRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex h-5 items-center justify-between">
      <span className="text-[9px] text-[#777]">{label}</span>
      <span className="font-mono text-[9px] text-[#D0D0D0]">{value}</span>
    </div>
  );
}

function PitchLayer({
  label,
  depth,
  selected,
}: {
  label: string;
  depth: number;
  selected?: boolean;
}) {
  const pl = 6 + depth * 14;
  return (
    <div
      className={`flex h-[22px] items-center gap-[5px] px-1.5 py-[3px] text-[8px] ${
        selected
          ? "border-l-[1.5px] border-[#3A48B5] bg-[#3A48B5]/10 text-[#D1E2F6]"
          : "text-[#777]"
      }`}
      style={{ paddingLeft: pl }}
    >
      <div
        className={`h-2 w-2 rounded-[1px] border ${
          selected ? "border-[#3A48B5]" : "border-[#444]"
        }`}
      />
      {label}
    </div>
  );
}

function EditorPitch() {
  return (
    <section id="editor" className="scroll-mt-24 border-b border-[#3A48B5]/10 bg-[#FAFAFA] py-20 md:py-28">
      <div className="mx-auto max-w-[1120px] px-5 md:px-10">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[1px] text-[#525252]">The editor</p>
        <h2 className="mb-14 max-w-[640px] text-[clamp(1.75rem,3.5vw,2.75rem)] font-medium leading-[1.08] tracking-[-0.02em] text-[#1B283D]">
          A real design tool.
          <br />
          <span className="text-[#6B6B6B]">Not a preview pane.</span>
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Canvas feel */}
          <div className="overflow-hidden rounded-[6px] border border-[#D1E2F6] bg-white transition-colors hover:border-[#3A48B5]/25">
            <div className="relative flex h-[220px] items-center justify-center overflow-hidden bg-[#1A1A1A]">
              <div className="relative h-[75%] w-[75%] rounded-[3px] bg-[#FAFAFA]">
                <div
                  className="absolute inset-0 rounded-[3px]"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='21' height='21'><rect width='20' height='20' rx='1' fill='%233A48B5' opacity='.04'/></svg>")`,
                    backgroundSize: "21px 21px",
                  }}
                />
                <div className="absolute left-8 top-6 z-[1] h-[90px] w-[130px] rounded-[2px] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
                  <div className="absolute -top-3.5 left-0 font-mono text-[7px] text-[#1B283D]">Hero — frame</div>
                </div>
                <div className="absolute left-[100px] top-11 h-11 w-[90px] border border-dashed border-[#3A48B5]/45" />
                <div className="absolute left-[164px] top-[60px] h-[18px] w-px bg-[#FC8162]" />
                <div className="absolute left-[170px] top-[65px] rounded-[1px] bg-[#FC8162] px-1 py-px font-mono text-[6px] text-[#FAFAFA]">
                  24px
                </div>
              </div>
            </div>
            <div className="px-[22px] py-5">
              <h3 className="mb-1.5 text-[15px] font-medium text-[#1B283D]">Canvas feel</h3>
              <p className="text-[13px] font-medium leading-[1.5] text-[#6B6B6B] text-pretty">
                Hover outlines, frame labels, measurement guides, smooth zoom. It feels like the tools you already use.
              </p>
            </div>
          </div>

          {/* Inspector */}
          <div className="overflow-hidden rounded-[6px] border border-[#D1E2F6] bg-white transition-colors hover:border-[#3A48B5]/25">
            <div className="flex h-[220px] items-center justify-center bg-[#1A1A1A]">
              <div className="w-[65%]">
                <PitchInspRule label="Size" />
                <PitchInspRow label="Width" value="Fill" />
                <PitchInspRow label="Height" value="Hug" />
                <div className="mt-1 flex gap-px rounded-[2px] bg-[#222] p-0.5">
                  <div className="rounded-[1px] px-1.5 py-0.5 font-mono text-[7px] text-[#666]">Fixed</div>
                  <div className="rounded-[1px] bg-[#333] px-1.5 py-0.5 font-mono text-[7px] text-[#E0E0E0]">Fill</div>
                  <div className="rounded-[1px] px-1.5 py-0.5 font-mono text-[7px] text-[#666]">Hug</div>
                </div>
                <div className="mt-3">
                  <PitchInspRule label="Typography" />
                  <PitchInspRow label="Font" value="Geist Sans" />
                  <PitchInspRow label="Weight" value="500" />
                  <PitchInspRow label="Size" value="28px" />
                  <PitchInspRow label="Tracking" value="-0.03em" />
                </div>
              </div>
            </div>
            <div className="px-[22px] py-5">
              <h3 className="mb-1.5 text-[15px] font-medium text-[#1B283D]">Precision inspector</h3>
              <p className="text-[13px] font-medium leading-[1.5] text-[#6B6B6B] text-pretty">
                Fixed / Fill / Hug sizing, typography, spacing, and fill — all in a two-column layout the model can read.
              </p>
            </div>
          </div>

          {/* Layers */}
          <div className="overflow-hidden rounded-[6px] border border-[#D1E2F6] bg-white transition-colors hover:border-[#3A48B5]/25">
            <div className="flex h-[220px] items-center justify-center bg-[#1A1A1A]">
              <div className="w-[55%]">
                <div className="mb-1 border-b border-[#2A2A2A]/50 pb-1.5 font-mono text-[7px] uppercase tracking-[1px] text-[#555]">
                  Layers
                </div>
                <PitchLayer label="Page" depth={0} />
                <PitchLayer label="Hero Section" depth={1} />
                <PitchLayer label="Heading" depth={2} selected />
                <PitchLayer label="Subtitle" depth={2} />
                <PitchLayer label="Cover Image" depth={2} />
                <PitchLayer label="Features Grid" depth={1} />
                <PitchLayer label="Card 1" depth={2} />
                <PitchLayer label="Card 2" depth={2} />
              </div>
            </div>
            <div className="px-[22px] py-5">
              <h3 className="mb-1.5 text-[15px] font-medium text-[#1B283D]">Component hierarchy</h3>
              <p className="text-[13px] font-medium leading-[1.5] text-[#6B6B6B] text-pretty">
                Clean tree structure, drag reorder, multi-select. See what was generated and restructure it.
              </p>
            </div>
          </div>

          {/* Layout semantics */}
          <div className="overflow-hidden rounded-[6px] border border-[#D1E2F6] bg-white transition-colors hover:border-[#3A48B5]/25">
            <div className="flex h-[220px] items-center justify-center bg-[#FAFAFA]">
              <div className="text-center">
                <div className="mb-4 flex items-end justify-center gap-7">
                  <div className="text-center">
                    <div className="mb-1.5 flex h-[72px] w-[72px] items-center justify-center rounded-[4px] border-[1.5px] border-[#3A48B5] bg-white font-mono text-[11px] text-[#1B283D]">
                      Fill
                    </div>
                    <div className="text-[10px] text-[#A0A0A0]">Stretches</div>
                  </div>
                  <div className="text-center">
                    <div className="mb-1.5 flex h-[52px] w-[52px] items-center justify-center rounded-[4px] border border-[#D1E2F6] bg-white font-mono text-[11px] text-[#525252]">
                      Hug
                    </div>
                    <div className="text-[10px] text-[#A0A0A0]">Wraps</div>
                  </div>
                  <div className="text-center">
                    <div className="mb-1.5 flex h-[62px] w-[62px] items-center justify-center rounded-[4px] border border-[#D1E2F6] bg-white font-mono text-[11px] text-[#525252]">
                      Fixed
                    </div>
                    <div className="text-[10px] text-[#A0A0A0]">Exact</div>
                  </div>
                </div>
                <div className="font-mono text-[9px] tracking-[0.5px] text-[#A0A0A0]">
                  Layout semantics the AI understands
                </div>
              </div>
            </div>
            <div className="px-[22px] py-5">
              <h3 className="mb-1.5 text-[15px] font-medium text-[#1B283D]">Layout semantics</h3>
              <p className="text-[13px] font-medium leading-[1.5] text-[#6B6B6B] text-pretty">
                Fill, Hug, and Fixed sizing — not just pixels. Generate with these constraints; edit with the same vocabulary.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PricingCard({
  name,
  price,
  priceDetail,
  description,
  features,
  highlighted,
  cta,
}: {
  name: string;
  price: string;
  priceDetail?: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  cta: ReactNode;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ duration: 0.45, ease }}
      className={`relative flex flex-col rounded-[6px] border p-6 md:p-7 ${
        highlighted
          ? "border-[#3A48B5] bg-white shadow-[0_12px_40px_-16px_rgba(58,72,181,0.35)]"
          : "border-[#3A48B5]/12 bg-[#FAFAFA]"
      }`}
    >
      {highlighted ? (
        <span className="absolute -top-2.5 left-6 rounded-[4px] bg-[#3A48B5] px-2 py-0.5 font-mono text-[9px] font-medium uppercase tracking-[0.5px] text-[#FAFAFA]">
          Popular
        </span>
      ) : null}
      <h3 className="font-['Noto_Serif'] text-[20px] font-medium text-[#1B283D]">{name}</h3>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="text-[28px] font-semibold tracking-tight text-[#1B283D]">{price}</span>
        {priceDetail ? (
          <span className="text-[13px] font-medium text-[#6B6B6B]">{priceDetail}</span>
        ) : null}
      </div>
      <p className="mt-3 text-[14px] font-medium leading-relaxed text-[#525252]">{description}</p>
      <ul className="mt-6 flex flex-col gap-2.5 border-t border-[#3A48B5]/10 pt-6">
        {features.map((f) => (
          <li key={f} className="flex gap-2 text-[13px] font-medium leading-snug text-[#525252]">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#FC8162]" aria-hidden />
            {f}
          </li>
        ))}
      </ul>
      <div className="mt-8">{cta}</div>
    </motion.article>
  );
}

function PricingSection() {
  return (
    <section id="pricing" className="scroll-mt-24 border-t border-[#3A48B5]/10 bg-[#FAFAFA] py-20 md:py-28">
      <div className="mx-auto max-w-[1200px] px-5 md:px-10">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[1px] text-[#525252]">Pricing</p>
        <h2 className="mb-4 max-w-[560px] font-['Noto_Serif'] text-[clamp(1.75rem,3vw,2.25rem)] font-medium leading-tight tracking-tight text-[#1B283D]">
          Simple tiers. Ship when you’re ready.
        </h2>
        <p className="mb-12 max-w-[520px] text-[15px] font-medium leading-relaxed text-[#525252]">
          We’re in early access — numbers below are the targets we’re building toward. Join the waitlist to lock in founder
          pricing conversations.
        </p>
        <div className="grid gap-6 md:grid-cols-3">
          <PricingCard
            name="Early access"
            price="Free"
            description="For designers and builders trying the loop: references → taste → canvas → export."
            features={[
              "Waitlist + invite-only beta",
              "Core canvas, taste profile, and exports",
              "Community updates",
            ]}
            cta={
              <button
                type="button"
                className="w-full rounded-[4px] border border-[#3A48B5]/25 bg-white py-3 text-[14px] font-medium text-[#1B283D] transition-colors hover:border-[#3A48B5]/45 hover:bg-[#FAFAFA]"
              >
                Join waitlist
              </button>
            }
          />
          <PricingCard
            name="Pro"
            price="$39"
            priceDetail="/ mo at launch · billed monthly"
            description="For solo designers who live in the tool — higher limits, faster queue, full handoff."
            highlighted
            features={[
              "Generous monthly generation allowance",
              "ZIP + publish + copy-ready HTML",
              "Priority generation queue",
              "Email support",
            ]}
            cta={
              <button
                type="button"
                className="w-full rounded-[4px] bg-[#FC8162] py-3 text-[14px] font-medium text-[#FAFAFA] transition-colors hover:bg-[#EE7351]"
              >
                Join waitlist
              </button>
            }
          />
          <PricingCard
            name="Team"
            price="Custom"
            description="For studios standardizing taste across projects and handoff to engineering."
            features={[
              "Multiple seats & shared libraries",
              "Admin & usage visibility (roadmap)",
              "SSO & security reviews (roadmap)",
              "Dedicated success channel",
            ]}
            cta={
              <a
                href="mailto:hello@studio-os.dev?subject=Team%20pricing"
                className="flex w-full items-center justify-center rounded-[4px] border border-[#3A48B5]/25 bg-white py-3 text-[14px] font-medium text-[#1B283D] transition-colors hover:border-[#3A48B5]/45 hover:bg-[#FAFAFA]"
              >
                Talk to us
              </a>
            }
          />
        </div>
        <p className="mt-8 text-center font-mono text-[10px] leading-relaxed text-[#6B6B6B]">
          Indicative pricing — final plans and limits may change before public launch. No charges until we publish checkout.
        </p>
      </div>
    </section>
  );
}

function ExportPanel() {
  const kw = "text-[#6B8CFF]";
  const fn = "text-[#F9AE69]";
  const tag = "text-[#FC8162]";
  const attr = "text-[#B8D4F6]";
  const str = "text-[#F5F5F0]";

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="overflow-hidden rounded-[10px] border border-white/[0.12] bg-[#0C0C14] shadow-[0_24px_60px_-12px_rgba(0,0,0,0.45)]">
        <div className="flex h-10 items-center border-b border-white/[0.08] bg-[#12121A] px-3">
          <div className="flex gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#3D4454]" />
            <span className="h-2 w-2 rounded-full bg-[#3D4454]" />
            <span className="h-2 w-2 rounded-full bg-[#3D4454]" />
          </div>
          <span className="flex-1 text-center font-mono text-[11px] font-medium text-[#9CA3AF]">page.tsx</span>
          <div className="w-[52px]" aria-hidden />
        </div>

        <div className="relative">
          <pre className="max-h-[min(320px,55vh)] overflow-auto p-4 pb-16 font-mono text-[11px] leading-[1.65] text-[#94A3B8] sm:p-5 sm:pb-[4.25rem] sm:text-[12px]">
            <code>
              <span className={kw}>import</span> <span className={fn}>React</span> <span className={kw}>from</span>{" "}
              <span className={str}>&quot;react&quot;</span>
              {";\n\n"}
              <span className={kw}>export default function</span> <span className={fn}>GeneratedView</span>() {"{\n"}
              {"  "}
              <span className={kw}>return</span> (
              {"\n"}
              {"    "}
              &lt;<span className={tag}>div</span> <span className={attr}>className</span>=
              <span className={str}>&quot;w-full min-h-screen bg-[#FAFAFA]&quot;</span>&gt;
              {"\n"}
              {"      "}
              &lt;<span className={tag}>nav</span> <span className={attr}>className</span>=
              <span className={str}>&quot;flex justify-between items-center p-6&quot;</span>&gt;
              {"\n"}
              {"        "}
              &lt;<span className={tag}>div</span> <span className={attr}>className</span>=
              <span className={str}>&quot;text-lg font-bold&quot;</span>&gt;
              <span className={fn}>studio OS</span>
              &lt;/<span className={tag}>div</span>&gt;
              {"\n"}
              {"        "}
              &lt;<span className={tag}>button</span> <span className={attr}>className</span>=
              <span className={str}>&quot;bg-[#4B57DB] text-white text-sm font-medium px-4 py-2 rounded-[4px]&quot;</span>&gt;
              {"\n"}
              {"          "}
              Ship
              {"\n"}
              {"        "}
              &lt;/<span className={tag}>button</span>&gt;
              {"\n"}
              {"      "}
              &lt;/<span className={tag}>nav</span>&gt;
              {"\n"}
              {"    "}
              &lt;/<span className={tag}>div</span>&gt;
              {"\n"}
              {"  "}
              );
              {"\n"}
              {"}"}
            </code>
          </pre>
          <div className="pointer-events-none absolute bottom-3 right-3 sm:bottom-4 sm:right-4">
            <span className="pointer-events-auto inline-flex rounded-[6px] bg-[#FC8162] px-3.5 py-2 font-sans text-[11px] font-semibold text-[#FAFAFA] shadow-sm transition-colors hover:bg-[#EE7351] sm:px-4 sm:text-[12px]">
              Export to Code
            </span>
          </div>
        </div>
      </div>
      <p className="text-center font-sans text-[14px] font-medium leading-snug text-[#FAFAFA] sm:text-[15px]">
        1-click deployment. Zero translation errors.
      </p>
    </div>
  );
}

export function CursorSite() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#1B283D] selection:bg-[#D1E2F6] selection:text-[#1B283D]">
      {/* Hero — Linear-like: short headline, one-line subcopy, tight mockup */}
      <section className="relative flex min-h-[100vh] flex-col overflow-hidden bg-[#010206]">
        <HeroAmbient />
        <Nav />
        <div className="relative z-10 flex w-full flex-1 flex-col px-5 pb-12 pt-28 md:px-10 md:pb-16 md:pt-36 lg:px-12 lg:pt-44">
          <div className="mx-auto flex w-full max-w-[1200px] flex-col items-start">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease }}
              className="w-full max-w-[56rem] text-left"
            >
              <h1 className="mt-16 mb-6 max-w-[920px] font-['Noto_Serif'] text-[clamp(2.35rem,4.8vw,3.5rem)] font-medium leading-[1.05] tracking-[-0.035em] text-[#FAFAFA]">
                Design with References,
                <br />
                <span className="bg-gradient-to-r from-[#E8EDFF] via-[#D1E2F6] to-[#9EACE8] bg-clip-text text-transparent">
                  Now You Can.
                </span>
              </h1>
              <p className="mb-8 max-w-[480px] text-[15px] leading-[1.6] text-white/38 md:mb-10 md:text-[16px]">
                Purpose-built for design-led teams. Taste, canvas, and handoff — in one calm system.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" className={ctaPrimaryOnDark}>
                  Join waitlist
                </button>
                <a href="#editor" className={ctaSecondaryOnDark}>
                  Tour the editor
                </a>
              </div>
            </motion.div>
            {/*
              Mockup width matches nav content rail (max-w-[1200px]).
              Linear’s marketing grid is typically ~1200px content; 1440px is often full-bleed artboard — we stay at 1200 for alignment.
            */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease, delay: 0.05 }}
              className="relative mt-10 w-full max-w-[1200px] self-stretch md:mt-14"
            >
              <div
                className="pointer-events-none absolute inset-x-[-6%] -top-8 bottom-[-8%] opacity-75 md:inset-x-[-10%] md:-top-10 md:bottom-[-10%]"
                aria-hidden
              >
                {/* Softer bloom behind mockup — ties UI to floor light */}
                <div
                  className="absolute left-1/2 top-[58%] h-[min(75%,480px)] w-[min(105%,920px)] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[100px]"
                  style={{
                    background:
                      "radial-gradient(closest-side, rgba(58,72,181,0.22), rgba(58,72,181,0.05) 52%, transparent 72%)",
                  }}
                />
              </div>
              <div className="relative w-full">
                <HeroVisual />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section id="harness" className="scroll-mt-24 border-b border-[#3A48B5]/8 bg-[#FAFAFA] py-20 md:py-28">
        <div className="mx-auto max-w-[1200px] px-5 md:px-10">
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[1px] text-[#525252]">The loop</p>
          <h2 className="mb-14 max-w-[520px] font-['Noto_Serif'] text-[clamp(1.75rem,3vw,2.25rem)] font-medium leading-tight tracking-tight text-[#1B283D]">
            One pipeline from inspiration to shipped UI — without losing your eye.
          </h2>
          <div className="grid gap-6 md:grid-cols-3 md:gap-6 lg:gap-8">
            <HarnessStepCard
              step="01"
              title="Import & score"
              body="Drop references. Studio OS reads hierarchy, rhythm, and palette — not vibes."
              visual={<HarnessVisualImportScore />}
            />
            <HarnessStepCard
              step="02"
              title="Compile taste"
              body="Directives become constraints: what to protect, what to bend, what to avoid."
              visual={<HarnessVisualCompileTaste />}
            />
            <HarnessStepCard
              step="03"
              title="Edit & export"
              body="Work in a canvas that respects structure. Copy HTML or publish when you’re ready."
              visual={<HarnessVisualEditExport />}
            />
          </div>
        </div>
      </section>

      <EditorPitch />

      <section id="taste" className="scroll-mt-24 bg-[#D1E2F6] py-20 md:py-28">
        <div className="mx-auto grid max-w-[1200px] gap-12 px-5 md:grid-cols-2 md:items-center md:gap-16 md:px-10">
          <div>
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[1px] text-[#525252]">Taste engine</p>
            <h2 className="mb-5 font-['Noto_Serif'] text-[clamp(1.75rem,3vw,2.25rem)] font-medium leading-tight tracking-tight text-[#1B283D]">
              Moodboard in,
              <br />
              <span className="text-[#6B6B6B]">constraints out.</span>
            </h2>
            <p className="mb-8 max-w-[440px] text-[15px] font-medium leading-relaxed text-[#525252]">
              Every generation is biased toward your spacing habits, type choices, and color relationships — so output stays
              in your lane.
            </p>
            <TasteStrip />
          </div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{ duration: 0.5, ease }}
            className="grid grid-cols-2 gap-3"
          >
            <div className="aspect-[4/5] rounded-[6px] bg-[#3A48B5]" />
            <div className="mt-8 aspect-[4/5] rounded-[6px] bg-[#FAFAFA] ring-1 ring-[#3A48B5]/15" />
            <div className="col-span-2 flex items-center justify-center rounded-[6px] border border-dashed border-[#3A48B5]/30 bg-[#FAFAFA] py-8 font-mono text-[11px] text-[#6B6B6B]">
              + add references
            </div>
          </motion.div>
        </div>
      </section>

      <PricingSection />

      <section id="export" className="scroll-mt-24 bg-[#3A48B5] py-20 md:py-28">
        <div className="mx-auto grid max-w-[1200px] gap-12 px-5 md:grid-cols-2 md:items-center md:gap-16 md:px-10">
          <div>
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[1px] text-[#D1E2F6]/70">Handoff</p>
            <h2 className="mb-5 font-['Noto_Serif'] text-[clamp(1.75rem,3vw,2.5rem)] font-medium leading-tight text-[#FAFAFA]">
              Real markup.
              <br />
              No lock-in.
            </h2>
            <p className="mb-8 max-w-[400px] text-[15px] font-medium leading-relaxed text-[#D1E2F6]/90">
              Copy HTML with inline styles, bundle a ZIP, or publish a link. Your layout leaves as code you can own.
            </p>
            <button
              type="button"
              className="rounded-[4px] bg-[#FAFAFA] px-6 py-3 text-[14px] font-medium text-[#1B283D] transition-colors hover:bg-[#D1E2F6]"
            >
              Join waitlist
            </button>
          </div>
          <ExportPanel />
        </div>
      </section>

      <footer className="border-t border-[#3A48B5]/12 bg-[#FAFAFA] py-10">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-5 md:flex-row md:items-center md:justify-between md:px-10">
          <div className="flex items-center gap-3">
            <LogoMark />
            <span className="text-[15px] font-medium text-[#1B283D]">studio OS</span>
          </div>
          <div className="flex flex-wrap gap-6 font-sans text-[13px] font-medium text-[#525252]">
            <Link href="/" className="underline-offset-4 transition-colors hover:underline">
              Main site
            </Link>
            <a href="/privacy" className="underline-offset-4 transition-colors hover:underline">
              Privacy
            </a>
          </div>
          <p className="font-mono text-[10px] text-[#6B6B6B]">© 2026 Studio OS</p>
        </div>
      </footer>
    </div>
  );
}
