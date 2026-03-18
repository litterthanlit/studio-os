"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, X, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UnifiedFont, FontCategory, FontSource } from "@/lib/fonts/types";
import { fontshareFonts } from "@/lib/fonts/fontshare-catalog";
import { ensureFontLoaded, getFontCssFamily } from "@/lib/fonts/load-font";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_TABS: (FontCategory | "all")[] = [
  "all",
  "sans-serif",
  "serif",
  "monospace",
  "display",
  "handwriting",
];

const SOURCE_TABS: (FontSource | "all")[] = ["all", "google", "fontshare"];

type SortOption = "popularity" | "name-asc" | "name-desc";

const SPECIMEN_ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const SPECIMEN_abc = "abcdefghijklmnopqrstuvwxyz";
const SPECIMEN_NUMS = "0123456789 !@#$%&()";
const PREVIEW_SAMPLE = "The quick brown fox jumps over the lazy dog.";
const SIZE_SCALE = [12, 14, 16, 20, 24, 32, 48, 72];

const INITIAL_VISIBLE = 24;
const LOAD_MORE_COUNT = 24;

// ─── Suggested pairings (curated) ─────────────────────────────────────────────

const PAIRING_MAP: Record<string, string[]> = {
  "Inter": ["Playfair Display", "Lora", "Source Serif Pro"],
  "Roboto": ["Roboto Slab", "Merriweather", "Lora"],
  "Open Sans": ["Merriweather", "Lora", "Playfair Display"],
  "Lato": ["Merriweather", "Playfair Display", "Source Serif Pro"],
  "Montserrat": ["Lora", "Source Serif Pro", "Merriweather"],
  "Poppins": ["Lora", "Playfair Display", "Source Serif Pro"],
  "Playfair Display": ["Inter", "Roboto", "Open Sans"],
  "Merriweather": ["Inter", "Open Sans", "Lato"],
  "Lora": ["Inter", "Montserrat", "Poppins"],
  "Source Serif Pro": ["Inter", "Roboto", "Lato"],
  "Raleway": ["Merriweather", "Lora", "Crimson Text"],
  "Oswald": ["Lato", "Open Sans", "Roboto"],
  "Work Sans": ["Lora", "Source Serif Pro", "Merriweather"],
  "DM Sans": ["DM Serif Display", "Lora", "Source Serif Pro"],
  "Space Grotesk": ["Space Mono", "Lora", "Source Serif Pro"],
};

function getSuggestedPairings(family: string): string[] {
  return PAIRING_MAP[family] ?? ["Inter", "Lora", "Source Serif Pro"];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function categoryLabel(c: string) {
  return c === "all"
    ? "All"
    : c.charAt(0).toUpperCase() + c.slice(1).replace(/-/g, " ");
}

function sourceLabel(s: string) {
  return s === "all" ? "All" : s === "fontshare" ? "Fontshare" : "Google";
}

// ─── Specimen Panel ───────────────────────────────────────────────────────────

function SpecimenPanel({
  font,
  label,
  onClick,
  isBespokeSerif,
}: {
  font: UnifiedFont | null;
  label: string;
  onClick?: () => void;
  isBespokeSerif?: boolean;
}) {
  const fontFamily = isBespokeSerif
    ? "var(--font-instrument-serif)"
    : font
    ? getFontCssFamily(font)
    : "var(--font-geist-sans)";

  React.useEffect(() => {
    if (font && !isBespokeSerif) ensureFontLoaded(font);
  }, [font, isBespokeSerif]);

  const displayName = isBespokeSerif
    ? "Bespoke Serif"
    : font?.family ?? "Select a font";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex flex-col items-start rounded-[4px] border border-[#E5E5E0] bg-white/80 backdrop-blur-sm p-6 text-left transition-all duration-150",
        "hover:border-[#D1E4FC] hover:bg-white/95",
        "focus:border-[#D1E4FC] focus:ring-2 focus:ring-[#D1E4FC]/40 focus:outline-none"
      )}
    >
      <span className="mono-kicker mb-4">{label}</span>

      <div
        className="text-[120px] leading-none text-[#1A1A1A] tracking-[-0.03em]"
        style={{ fontFamily }}
      >
        Aa
      </div>

      <div className="mt-4 w-full space-y-1" style={{ fontFamily }}>
        <div className="break-all text-[14px] leading-relaxed tracking-wide text-[#1A1A1A]">
          {SPECIMEN_ABC}
        </div>
        <div className="break-all text-[14px] leading-relaxed tracking-wide text-[#6B6B6B]">
          {SPECIMEN_abc}
        </div>
        <div className="text-[13px] leading-relaxed tracking-wide text-[#A0A0A0]">
          {SPECIMEN_NUMS}
        </div>
      </div>

      <div className="mt-5 flex w-full items-center justify-between">
        <span className="text-[13px] font-medium text-[#1A1A1A]">
          {displayName}
        </span>
        <ChevronRight
          size={14}
          strokeWidth={1.5}
          className="text-[#A0A0A0] transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-[#1E5DF2]"
        />
      </div>
      <span className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-[#A0A0A0]">
        {isBespokeSerif
          ? "Display Serif · Built-in"
          : font
          ? `${font.source === "fontshare" ? "Fontshare" : "Google"} · ${categoryLabel(font.category)} · ${font.variants.length} weight${font.variants.length !== 1 ? "s" : ""}`
          : "—"}
      </span>
    </button>
  );
}

// ─── Font Card (grid item) ────────────────────────────────────────────────────

function FontCard({
  font,
  onSelect,
}: {
  font: UnifiedFont;
  onSelect: () => void;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setIsVisible(true);
      },
      { rootMargin: "100px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    if (isVisible) ensureFontLoaded(font);
  }, [isVisible, font]);

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className="group/card flex cursor-pointer flex-col rounded-[4px] border border-[#E5E5E0] bg-white/70 p-4 text-left transition-all duration-150 hover:border-[#D1E4FC] hover:bg-white/90"
    >
      <div
        className="mb-2 line-clamp-2 text-[20px] leading-snug text-[#1A1A1A]"
        style={{ fontFamily: getFontCssFamily(font) }}
      >
        {PREVIEW_SAMPLE}
      </div>
      <div className="mt-auto flex items-center justify-between pt-2">
        <div>
          <div className="text-[13px] font-medium text-[#1A1A1A]">
            {font.family}
          </div>
          <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-[#A0A0A0]">
            {font.source === "fontshare" ? "Fontshare" : "Google"} ·{" "}
            {categoryLabel(font.category)} · {font.variants.length}w
          </div>
        </div>
        <ChevronRight
          size={14}
          strokeWidth={1.5}
          className="shrink-0 text-[#E5E5E0] transition-all duration-150 group-hover/card:text-[#1E5DF2]"
        />
      </div>
    </div>
  );
}

// ─── Font Detail Panel (slide-over) ───────────────────────────────────────────

function FontDetailPanel({
  font,
  onClose,
}: {
  font: UnifiedFont;
  onClose: () => void;
}) {
  const [previewText, setPreviewText] = React.useState(
    "Type anything here..."
  );
  const [previewSize, setPreviewSize] = React.useState(24);

  React.useEffect(() => {
    ensureFontLoaded(font);
  }, [font]);

  const fontStyle = { fontFamily: getFontCssFamily(font) };
  const pairings = getSuggestedPairings(font.family);

  return (
    <>
      <motion.div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
      />

      <motion.aside
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col overflow-y-auto border-l border-[#E5E5E0] bg-white/95 backdrop-blur-sm"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#E5E5E0] px-6 py-5">
          <div>
            <h2
              className="text-[22px] font-normal leading-tight text-[#1A1A1A]"
              style={fontStyle}
            >
              {font.family}
            </h2>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-[#A0A0A0]">
              {font.source === "fontshare" ? "Fontshare" : "Google Fonts"} ·{" "}
              {categoryLabel(font.category)} · {font.variants.length} weight
              {font.variants.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-[4px] text-[#A0A0A0] transition-colors hover:bg-[#F5F5F0] hover:text-[#6B6B6B]"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex-1 space-y-6 px-6 py-5">
          {/* Specimen */}
          <div>
            <span className="mono-kicker mb-3 block">Specimen</span>
            <div
              className="space-y-2 rounded-[4px] border border-[#E5E5E0] bg-[#FAFAF8] p-4"
              style={fontStyle}
            >
              <div className="text-[48px] leading-none text-[#1A1A1A]">Aa</div>
              <div className="break-all text-[14px] leading-relaxed tracking-wide text-[#1A1A1A]">
                {SPECIMEN_ABC}
              </div>
              <div className="break-all text-[14px] leading-relaxed tracking-wide text-[#6B6B6B]">
                {SPECIMEN_abc}
              </div>
              <div className="text-[13px] leading-relaxed text-[#A0A0A0]">
                {SPECIMEN_NUMS}
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div>
            <span className="mono-kicker mb-3 block">Details</span>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div>
                <div className="text-[11px] text-[#A0A0A0]">Name</div>
                <div className="text-[13px] text-[#1A1A1A]">{font.family}</div>
              </div>
              <div>
                <div className="text-[11px] text-[#A0A0A0]">Source</div>
                <div className="text-[13px] text-[#1A1A1A]">
                  {font.source === "fontshare" ? "Fontshare" : "Google Fonts"}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[#A0A0A0]">Classification</div>
                <div className="text-[13px] text-[#1A1A1A]">
                  {categoryLabel(font.category)}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[#A0A0A0]">Weights</div>
                <div className="text-[13px] text-[#1A1A1A]">
                  {font.variants.length}
                </div>
              </div>
            </div>
          </div>

          {/* Weights */}
          <div>
            <span className="mono-kicker mb-3 block">Weights</span>
            <div className="space-y-1.5">
              {font.variants.map((v) => (
                <div
                  key={v}
                  className="flex items-baseline gap-3 text-[13px]"
                  style={fontStyle}
                >
                  <span className="w-12 shrink-0 font-mono text-[10px] uppercase text-[#A0A0A0]">
                    {v}
                  </span>
                  <span className="truncate text-[#1A1A1A]">
                    {PREVIEW_SAMPLE}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Suggested Pairings */}
          <div>
            <span className="mono-kicker mb-3 block">Suggested Pairings</span>
            <div className="space-y-1.5">
              {pairings.map((pair) => (
                <div
                  key={pair}
                  className="flex items-center gap-2 rounded-[4px] border border-[#E5E5E0] bg-[#FAFAF8] px-3 py-2 text-[13px] text-[#1A1A1A] transition-colors hover:border-[#D1E4FC]"
                >
                  <span className="font-medium">{pair}</span>
                  <span className="text-[11px] text-[#A0A0A0]">
                    + {font.family}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Live Preview */}
          <div>
            <span className="mono-kicker mb-3 block">Preview</span>
            <input
              type="text"
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              placeholder="Type anything here..."
              className="mb-3 w-full rounded-[2px] border border-[#E5E5E0] bg-white px-3 py-2 text-[#1A1A1A] outline-none placeholder:text-[#A0A0A0] transition-colors focus:border-[#D1E4FC] focus:ring-2 focus:ring-[#D1E4FC]/40"
              style={{ ...fontStyle, fontSize: previewSize }}
            />
            <div className="flex flex-wrap gap-1.5">
              {SIZE_SCALE.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setPreviewSize(size)}
                  className={cn(
                    "rounded-[2px] border px-2 py-1 font-mono text-[10px] transition-colors",
                    previewSize === size
                      ? "border-[#1E5DF2] bg-[#D1E4FC]/30 text-[#1E5DF2]"
                      : "border-[#E5E5E0] bg-white text-[#A0A0A0] hover:text-[#6B6B6B]"
                  )}
                >
                  {size}px
                </button>
              ))}
            </div>
          </div>

          {/* Add to project */}
          <div className="border-t border-[#E5E5E0] pt-4">
            <button
              type="button"
              className="w-full rounded-[4px] bg-[#1E5DF2] px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-[#1A4FD6]"
            >
              Add to Project
            </button>
          </div>
        </div>
      </motion.aside>
    </>
  );
}

// ─── Category Filter Pill ─────────────────────────────────────────────────────

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-[4px] px-2.5 py-1.5 text-[12px] font-medium transition-colors duration-150",
        active
          ? "bg-[#1E5DF2] text-white"
          : "bg-[#F5F5F0] text-[#6B6B6B] hover:bg-[#E5E5E0] hover:text-[#1A1A1A]"
      )}
    >
      {label}
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function TypeLibraryPage() {
  const [query, setQuery] = React.useState("");
  const [activeCategory, setActiveCategory] =
    React.useState<(typeof CATEGORY_TABS)[number]>("all");
  const [activeSource, setActiveSource] =
    React.useState<(typeof SOURCE_TABS)[number]>("all");
  const [sort, setSort] = React.useState<SortOption>("popularity");
  const [selectedFont, setSelectedFont] = React.useState<UnifiedFont | null>(
    null
  );
  const [visibleCount, setVisibleCount] = React.useState(INITIAL_VISIBLE);
  const [googleFonts, setGoogleFonts] = React.useState<UnifiedFont[]>([]);
  const [loading, setLoading] = React.useState(true);
  const loadMoreRef = React.useRef<HTMLDivElement>(null);
  const [specimenFont, setSpecimenFont] = React.useState<UnifiedFont | null>(
    null
  );

  React.useEffect(() => {
    fetch("/api/fonts/google?sort=popularity")
      .then((r) => r.json())
      .then((data) => {
        const fonts = Array.isArray(data) ? data : [];
        setGoogleFonts(fonts);
        const firstSans = fonts.find(
          (f: UnifiedFont) => f.category === "sans-serif"
        );
        if (firstSans && !specimenFont) setSpecimenFont(firstSans);
      })
      .catch(() => setGoogleFonts([]))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allFonts = React.useMemo(() => {
    const withPopularity = fontshareFonts.map((f) => ({
      ...f,
      popularity: 0,
    }));
    googleFonts.forEach((f) => {
      if (
        !withPopularity.some(
          (x) => x.family === f.family && x.source === f.source
        )
      ) {
        withPopularity.push({ ...f, popularity: f.popularity ?? 9999 });
      }
    });
    if (sort === "popularity") {
      withPopularity.sort(
        (a, b) => (a.popularity ?? 9999) - (b.popularity ?? 9999)
      );
    } else if (sort === "name-asc") {
      withPopularity.sort((a, b) => a.family.localeCompare(b.family));
    } else if (sort === "name-desc") {
      withPopularity.sort((a, b) => b.family.localeCompare(a.family));
    }
    return withPopularity;
  }, [googleFonts, sort]);

  const filteredFonts = React.useMemo(() => {
    return allFonts.filter((font) => {
      if (activeCategory !== "all" && font.category !== activeCategory)
        return false;
      if (activeSource !== "all" && font.source !== activeSource) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        if (!font.family.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [allFonts, activeCategory, activeSource, query]);

  const visibleFonts = filteredFonts.slice(0, visibleCount);
  const hasMore = visibleFonts.length < filteredFonts.length;

  React.useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisibleCount((prev) =>
            Math.min(prev + LOAD_MORE_COUNT, filteredFonts.length)
          );
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visibleFonts.length, filteredFonts.length]);

  React.useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE);
  }, [activeCategory, activeSource, query, sort]);

  function handleSelectFont(font: UnifiedFont) {
    setSelectedFont(font);
    setSpecimenFont(font);
  }

  return (
    <>
      <div className="relative z-10 mx-auto max-w-[960px] animate-in fade-in slide-in-from-bottom-2 pt-16 pb-16 duration-300 ease-out">
        {/* ── Header ── */}
        <div className="mb-8">
          <span className="mono-kicker mb-3 block">Studio OS</span>
          <h1 className="font-serif text-[28px] font-normal tracking-[-0.02em] text-[#1A1A1A] leading-[1.1]">
            Type Explorer
          </h1>
          <p className="mt-2 max-w-[520px] text-[14px] leading-relaxed text-[#6B6B6B]">
            Browse 1500+ fonts from Google Fonts and Fontshare. Search, compare
            specimens, and add to your project.
          </p>
        </div>

        {/* ── Specimen Panels ── */}
        <div className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-2">
          <SpecimenPanel
            font={null}
            label="Display Font"
            isBespokeSerif
          />
          <SpecimenPanel
            font={specimenFont}
            label="Library Font"
            onClick={() => {
              if (specimenFont) setSelectedFont(specimenFont);
            }}
          />
        </div>

        {/* ── Search + Filter Bar ── */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search
                size={14}
                strokeWidth={1.5}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#A0A0A0]"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search fonts..."
                className="h-8 w-[200px] rounded-[2px] border border-[#E5E5E0] bg-white pl-8 pr-3 text-[13px] text-[#1A1A1A] outline-none placeholder:text-[#A0A0A0] transition-colors focus:border-[#D1E4FC] focus:ring-2 focus:ring-[#D1E4FC]/40"
              />
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="h-8 rounded-[2px] border border-[#E5E5E0] bg-white px-2 text-[12px] text-[#6B6B6B] outline-none transition-colors focus:border-[#D1E4FC]"
            >
              <option value="popularity">Popular</option>
              <option value="name-asc">A–Z</option>
              <option value="name-desc">Z–A</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            {SOURCE_TABS.map((tab) => (
              <FilterPill
                key={tab}
                label={sourceLabel(tab)}
                active={activeSource === tab}
                onClick={() => setActiveSource(tab)}
              />
            ))}
          </div>
        </div>

        {/* ── Category tabs ── */}
        <div className="mb-6 flex items-center gap-1.5 overflow-x-auto">
          {CATEGORY_TABS.map((tab) => (
            <FilterPill
              key={tab}
              label={categoryLabel(tab)}
              active={activeCategory === tab}
              onClick={() => setActiveCategory(tab)}
            />
          ))}
          <span className="ml-auto shrink-0 font-mono text-[10px] uppercase tracking-wider text-[#A0A0A0]">
            {filteredFonts.length} font{filteredFonts.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* ── Font Grid ── */}
        {loading ? (
          <div className="py-20 text-center text-[13px] text-[#A0A0A0]">
            Loading fonts...
          </div>
        ) : filteredFonts.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <p className="text-[13px] text-[#A0A0A0]">
              No fonts match{" "}
              {query ? `"${query}"` : "the current filters"}.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setActiveCategory("all");
                setActiveSource("all");
              }}
              className="mt-2 text-[13px] text-[#1E5DF2] transition-opacity hover:opacity-70"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleFonts.map((font) => (
              <FontCard
                key={`${font.source}-${font.family}`}
                font={font}
                onSelect={() => handleSelectFont(font)}
              />
            ))}
          </div>
        )}

        {hasMore && <div ref={loadMoreRef} className="h-8" />}
      </div>

      <AnimatePresence>
        {selectedFont && (
          <FontDetailPanel
            font={selectedFont}
            onClose={() => setSelectedFont(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
