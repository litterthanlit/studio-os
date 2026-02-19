"use client";

import * as React from "react";
import {
  Inter,
  Space_Grotesk,
  Playfair_Display,
  IBM_Plex_Mono,
  Sora,
  Fraunces,
  JetBrains_Mono,
  Cabin,
} from "next/font/google";
import { AnimatePresence, motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { SectionLabel } from "@/components/ui/section-label";
import { cn } from "@/lib/utils";

const interFont = Inter({ subsets: ["latin"], weight: ["400", "700"] });
const spaceGroteskFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "700"],
});
const playfairFont = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "700"],
});
const plexMonoFont = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
});
const soraFont = Sora({ subsets: ["latin"], weight: ["400", "700"] });
const frauncesFont = Fraunces({
  subsets: ["latin"],
  weight: ["400", "700"],
});
const jetbrainsMonoFont = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
});
const cabinetGroteskFont = Cabin({
  subsets: ["latin"],
  weight: ["400", "700"],
});

type Classification = "Sans Serif" | "Serif" | "Mono" | "Display";

type FontEntry = {
  id: string;
  name: string;
  classification: Classification;
  foundry: string;
  usageCount: number;
  rating: number;
  fontClassName: string;
  weights: string[];
};

const FONTS: FontEntry[] = [
  {
    id: "inter",
    name: "Inter",
    classification: "Sans Serif",
    foundry: "Google Fonts",
    usageCount: 4,
    rating: 5,
    fontClassName: interFont.className,
    weights: ["400", "500", "600", "700"],
  },
  {
    id: "space-grotesk",
    name: "Space Grotesk",
    classification: "Sans Serif",
    foundry: "Google Fonts",
    usageCount: 2,
    rating: 4,
    fontClassName: spaceGroteskFont.className,
    weights: ["400", "500", "600", "700"],
  },
  {
    id: "playfair-display",
    name: "Playfair Display",
    classification: "Serif",
    foundry: "Google Fonts",
    usageCount: 3,
    rating: 5,
    fontClassName: playfairFont.className,
    weights: ["400", "500", "600", "700"],
  },
  {
    id: "ibm-plex-mono",
    name: "IBM Plex Mono",
    classification: "Mono",
    foundry: "Google Fonts",
    usageCount: 1,
    rating: 4,
    fontClassName: plexMonoFont.className,
    weights: ["400", "500", "600", "700"],
  },
  {
    id: "sora",
    name: "Sora",
    classification: "Sans Serif",
    foundry: "Google Fonts",
    usageCount: 2,
    rating: 4,
    fontClassName: soraFont.className,
    weights: ["400", "500", "600", "700"],
  },
  {
    id: "fraunces",
    name: "Fraunces",
    classification: "Serif",
    foundry: "Google Fonts",
    usageCount: 1,
    rating: 3,
    fontClassName: frauncesFont.className,
    weights: ["400", "500", "600", "700"],
  },
  {
    id: "jetbrains-mono",
    name: "JetBrains Mono",
    classification: "Mono",
    foundry: "Google Fonts",
    usageCount: 2,
    rating: 5,
    fontClassName: jetbrainsMonoFont.className,
    weights: ["400", "500", "600", "700"],
  },
  {
    id: "cabinet-grotesk",
    name: "Cabinet Grotesk",
    classification: "Display",
    foundry: "Approx. via Cabin (Google Fonts)",
    usageCount: 1,
    rating: 4,
    fontClassName: cabinetGroteskFont.className,
    weights: ["400", "500", "600", "700"],
  },
];

const CLASS_TABS: (Classification | "All")[] = [
  "All",
  "Sans Serif",
  "Serif",
  "Mono",
  "Display",
];

const SIZE_SCALE = [12, 14, 16, 18, 24, 32, 48, 72];

const PAIRINGS: Record<
  string,
  { bodyId: string; note: string }[]
> = {
  Inter: [
    {
      bodyId: "sora",
      note: "High contrast between headings and body with complementary x-heights.",
    },
    {
      bodyId: "ibm-plex-mono",
      note: "Technical body copy under clean product headings.",
    },
    {
      bodyId: "jetbrains-mono",
      note: "Strong editorial feel for decks and interface specs.",
    },
  ],
  "Playfair Display": [
    {
      bodyId: "inter",
      note: "Classic editorial pairing for product stories.",
    },
    {
      bodyId: "sora",
      note: "Softened grotesk body under high-contrast serifs.",
    },
    {
      bodyId: "space-grotesk",
      note: "More characterful body copy for narrative-heavy work.",
    },
  ],
  "Space Grotesk": [
    {
      bodyId: "inter",
      note: "Neutral body tone balancing expressive headings.",
    },
    {
      bodyId: "sora",
      note: "Future-facing pairing for product marketing.",
    },
    {
      bodyId: "jetbrains-mono",
      note: "Functional, system-like body for docs and specs.",
    },
  ],
};

function getFontById(id: string): FontEntry | undefined {
  return FONTS.find((font) => font.id === id);
}

export function TypeLibraryPage() {
  const [query, setQuery] = React.useState("");
  const [activeClass, setActiveClass] =
    React.useState<(typeof CLASS_TABS)[number]>("All");
  const [selectedFontId, setSelectedFontId] = React.useState<string | null>(
    null
  );
  const [notesByFont, setNotesByFont] = React.useState<Record<string, string>>(
    {}
  );

  const [selectedHeading, setSelectedHeading] =
    React.useState<string>("Inter");

  const filteredFonts = React.useMemo(() => {
    return FONTS.filter((font) => {
      if (activeClass !== "All" && font.classification !== activeClass) {
        return false;
      }
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        font.name.toLowerCase().includes(q) ||
        font.foundry.toLowerCase().includes(q) ||
        font.classification.toLowerCase().includes(q)
      );
    });
  }, [activeClass, query]);

  const selectedFont = selectedFontId
    ? FONTS.find((font) => font.id === selectedFontId) ?? null
    : null;

  function handleOpenDetail(id: string) {
    setSelectedFontId(id);
  }

  function handleCloseDetail() {
    setSelectedFontId(null);
  }

  return (
    <section className="space-y-6">
      <SectionLabel>Type</SectionLabel>

      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-white tracking-tight">
            Type Library
          </h2>
          <p className="text-sm text-[#888]">
            Define the typographic spine of your studio — systems, scales, and
            pairings that stay consistent across products and decks.
          </p>
        </div>

        <div className="space-y-3">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search fonts... try 'mono', 'display', or 'editorial'"
            className="h-12 text-sm"
          />

          {/* Underline tab indicator */}
          <div className="flex items-center gap-0 overflow-x-auto pb-0 border-b border-[#1a1a1a]">
            {CLASS_TABS.map((tab) => {
              const active = activeClass === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveClass(tab)}
                  className={cn(
                    "px-4 py-2 text-[11px] font-medium uppercase tracking-[0.15em]",
                    "transition-colors duration-200 whitespace-nowrap",
                    "border-b-2 -mb-px",
                    active
                      ? "border-white text-white"
                      : "border-transparent text-[#555] hover:text-[#888]"
                  )}
                >
                  {tab}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filteredFonts.map((font) => (
            <button
              key={font.id}
              type="button"
              onClick={() => handleOpenDetail(font.id)}
              className={cn(
                "flex flex-col border border-dashed border-[#222] bg-[#0a0a0a] text-left",
                "overflow-hidden transition-[border-color] duration-200 ease-out hover:border-[#444]"
              )}
            >
              <div className={cn("border-b border-dashed border-[#1a1a1a] p-5", font.fontClassName)}>
                <div className="mb-2 text-4xl leading-none text-white">Aa</div>
                <div className="text-sm font-bold text-white">
                  {font.name}
                </div>
                <div className="text-[11px] text-[#555] font-mono">{font.foundry}</div>
              </div>

              <div className={cn("border-b border-dashed border-[#1a1a1a] p-5 text-sm", font.fontClassName)}>
                <p className="text-[#888]">
                  The quick brown fox jumps over the lazy dog.
                </p>
              </div>

              <div className="flex items-center justify-between gap-2 p-5">
                <span className="border border-[#222] bg-black px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-[#555]">
                  {font.classification}
                </span>
                <span className="text-[11px] text-[#555] font-mono">
                  {font.usageCount} project{font.usageCount === 1 ? "" : "s"}
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-8 space-y-3 border-t border-dashed border-[#222] pt-6">
          <SectionLabel>Font Pairings</SectionLabel>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-[#888]">
              Curate heading/body pairs that feel like your studio.
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-[11px] uppercase tracking-[0.15em] text-[#555]">
                Heading font
              </span>
              <select
                value={selectedHeading}
                onChange={(e) => setSelectedHeading(e.target.value)}
                className="h-8 border border-[#222] bg-[#0a0a0a] px-2 text-xs uppercase tracking-[0.15em] text-white outline-none transition-[border-color] duration-200 ease-out focus:border-[#444]"
              >
                {["Inter", "Playfair Display", "Space Grotesk"].map(
                  (name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {(PAIRINGS[selectedHeading] ?? []).map((pair) => {
              const headingFont = FONTS.find(
                (font) => font.name === selectedHeading
              );
              const bodyFont = getFontById(pair.bodyId);
              if (!headingFont || !bodyFont) return null;

              return (
                <div
                  key={`${selectedHeading}-${pair.bodyId}`}
                  className="flex flex-col border border-dashed border-[#222] bg-[#0a0a0a] p-4 transition-colors duration-200 hover:border-[#444]"
                >
                  <div className="mb-2 space-y-1">
                    <div
                      className={cn(
                        "text-xs font-medium uppercase tracking-[0.15em] text-gray-400"
                      )}
                    >
                      Heading / Body
                    </div>
                    <div
                      className={cn(
                        "text-sm text-white",
                        headingFont.fontClassName
                      )}
                    >
                      {headingFont.name}
                    </div>
                    <div
                      className={cn(
                        "text-xs text-gray-400",
                        bodyFont.fontClassName
                      )}
                    >
                      {bodyFont.name}
                    </div>
                  </div>
                  <div className="mb-2 space-y-1">
                    <div
                      className={cn(
                        "text-xs text-gray-500",
                        headingFont.fontClassName
                      )}
                    >
                      Product launch headline setting the tone.
                    </div>
                    <div
                      className={cn(
                        "text-xs text-gray-400",
                        bodyFont.fontClassName
                      )}
                    >
                      Supporting body copy carrying the story without
                      overpowering the hero.
                    </div>
                  </div>
                  <div className="mt-auto text-[11px] text-gray-400">
                    {pair.note}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedFont && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              onClick={handleCloseDetail}
            />
            <motion.aside
              className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-[#222] bg-[#0a0a0a] p-4"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="space-y-1">
                  <SectionLabel>Specimen</SectionLabel>
                  <div
                    className={cn(
                      "text-lg font-bold text-white",
                      selectedFont.fontClassName
                    )}
                  >
                    {selectedFont.name}
                  </div>
                  <div className="text-[11px] text-gray-400">
                    {selectedFont.foundry}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseDetail}
                  className="text-xs uppercase tracking-[0.15em] text-gray-400 transition-colors duration-200 hover:text-white"
                >
                  Close
                </button>
              </div>

              <div
                className={cn(
                  "mb-4 border border-dashed border-[#222] bg-[#0a0a0a] p-3",
                  selectedFont.fontClassName
                )}
              >
                <div className="mb-2 text-4xl leading-none">Aa</div>
                <div className="text-xs text-gray-400">
                  ABCDEFGHIJKLMNOPQRSTUVWXYZ
                  <br />
                  abcdefghijklmnopqrstuvwxyz
                </div>
              </div>

              <div className="mb-4 space-y-2">
                <div className="text-[11px] font-medium uppercase tracking-[0.15em] text-gray-400">
                  Weights
                </div>
                <div className="space-y-1">
                  {selectedFont.weights.map((weight) => (
                    <div
                      key={weight}
                      className={cn(
                        "text-sm text-gray-400",
                        selectedFont.fontClassName
                      )}
                      style={{ fontWeight: Number(weight) }}
                    >
                      {selectedFont.name} {weight}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-4 space-y-2">
                <div className="text-[11px] font-medium uppercase tracking-[0.15em] text-gray-400">
                  Size Scale
                </div>
                <div className="space-y-1">
                  {SIZE_SCALE.map((size) => (
                    <div
                      key={size}
                      className={cn(
                        "text-gray-400",
                        selectedFont.fontClassName
                      )}
                      style={{ fontSize: `${size}px` }}
                    >
                      {size}px — Studio OS type system in motion.
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-4 space-y-2">
                <div className="text-[11px] font-medium uppercase tracking-[0.15em] text-gray-400">
                  Sample Paragraph
                </div>
                <p
                  className={cn(
                    "text-sm text-gray-400",
                    selectedFont.fontClassName
                  )}
                >
                  Designers don&apos;t need more inspiration; they need a spine.
                  This type system gives every artifact — from decks to product
                  UI — a consistent, quiet confidence.
                </p>
              </div>

              <div className="mb-4 space-y-2">
                <div className="text-[11px] font-medium uppercase tracking-[0.15em] text-gray-400">
                  Notes
                </div>
                <textarea
                  value={notesByFont[selectedFont.id] ?? ""}
                  onChange={(e) =>
                    setNotesByFont((prev) => ({
                      ...prev,
                      [selectedFont.id]: e.target.value,
                    }))
                  }
                  placeholder="Where does this font belong in the studio? Document decisions, constraints, and examples."
                  className="h-20 w-full border border-[#222222] bg-transparent px-2 py-1 text-sm text-white outline-none transition-[border-color] duration-200 ease-out focus:border-accent"
                />
              </div>

              <div className="mt-auto flex items-center justify-between gap-3 border-t border-dashed border-[#222] pt-3 text-xs">
                <div className="text-[11px] text-[#333] font-mono">
                  Tag this face with use cases once you know where it wins.
                </div>
                <button
                  type="button"
                  className="border border-[#1a1a1a] bg-black px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-white transition-[border-color] duration-200 ease-out hover:border-[#2a2a2a]"
                >
                  Add to Project
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </section>
  );
}

