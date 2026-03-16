"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { SectionLabel } from "@/components/ui/section-label";
import { DitherSurface } from "@/components/ui/dither-surface";
import { cn } from "@/lib/utils";
import type { UnifiedFont, FontCategory, FontSource } from "@/lib/fonts/types";
import { fontshareFonts } from "@/lib/fonts/fontshare-catalog";
import {
  ensureFontLoaded,
  getFontCssFamily,
} from "@/lib/fonts/load-font";

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
const SIZE_SCALE = [12, 14, 16, 20, 24, 32, 48, 72];

const PREVIEW_SAMPLE = "The quick brown fox jumps over the lazy dog.";
const SPECIMEN_ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const SPECIMEN_abc = "abcdefghijklmnopqrstuvwxyz";
const SPECIMEN_NUMS = "0123456789 !@#$%^&*()";

const INITIAL_VISIBLE = 24;
const LOAD_MORE_COUNT = 24;

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
    if (!isVisible) return;
    ensureFontLoaded(font);
  }, [isVisible, font]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect();
    }
  }

  return (
    <DitherSurface
      ref={ref}
      patternVariant="band"
      patternTone={font.category === "display" ? "blue" : "warm"}
      patternDensity="sm"
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      className={cn(
        "flex cursor-pointer flex-col p-5 text-left transition-transform duration-200 ease-out hover:-translate-y-0.5"
      )}
    >
      <div
        className="mb-3 text-2xl text-text-primary leading-snug"
        style={{ fontFamily: getFontCssFamily(font) }}
      >
        {PREVIEW_SAMPLE}
      </div>
      <div className="text-sm font-medium text-text-primary">{font.family}</div>
      <div className="text-[11px] font-mono text-text-tertiary mt-0.5">
        {font.source === "fontshare" ? "Fontshare" : "Google"} ·{" "}
        {font.category} · {font.variants.length} weight
        {font.variants.length !== 1 ? "s" : ""}
      </div>
      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="text-[11px] text-text-tertiary">Add to Project ▾</span>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="text-text-tertiary hover:text-text-secondary transition-colors"
          aria-label="Bookmark"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>
    </DitherSurface>
  );
}

function FontDetailPanel({
  font,
  onClose,
}: {
  font: UnifiedFont;
  onClose: () => void;
}) {
  const [previewText, setPreviewText] = React.useState("Type anything here...");
  const [previewSize, setPreviewSize] = React.useState(24);

  React.useEffect(() => {
    ensureFontLoaded(font);
  }, [font]);

  const fontStyle = { fontFamily: getFontCssFamily(font) };

  return (
    <>
      <motion.div
        className="fixed inset-0 z-40 bg-black/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        onClick={onClose}
      />
      <motion.aside
        className="surface-panel fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col overflow-y-auto rounded-none border-y-0 border-r-0 p-6"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-text-primary" style={fontStyle}>
              {font.family}
            </h2>
            <div className="text-[11px] font-mono text-text-tertiary mt-0.5">
              {font.source === "fontshare" ? "Fontshare" : "Google"} · {font.category}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text-tertiary hover:text-text-primary text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <SectionLabel className="mb-3">Specimen</SectionLabel>
            <DitherSurface
              patternVariant="grid"
              patternTone="warm"
              patternDensity="sm"
              muted
              className="space-y-2 p-4"
              style={fontStyle}
            >
              <div className="text-lg">{SPECIMEN_ABC}</div>
              <div className="text-sm text-text-tertiary">{SPECIMEN_abc}</div>
              <div className="text-sm text-text-tertiary">{SPECIMEN_NUMS}</div>
            </DitherSurface>
          </div>

          <div>
            <SectionLabel className="mb-3">Weights</SectionLabel>
            <div className="space-y-2">
              {font.variants.map((v) => (
                <div key={v} className="text-sm text-text-secondary" style={fontStyle}>
                  <span className="text-text-tertiary font-mono text-[11px]">{v}</span> — {PREVIEW_SAMPLE}
                </div>
              ))}
            </div>
          </div>

          <div>
            <SectionLabel className="mb-3">Preview</SectionLabel>
            <input
              type="text"
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              placeholder="Type anything here..."
              className="mb-4 w-full rounded-[2px] border border-border-primary bg-white/80 px-3 py-2 text-text-primary placeholder:text-text-tertiary outline-none focus:border-[#1E5DF2]"
              style={{ ...fontStyle, fontSize: previewSize }}
            />
            <div className="flex flex-wrap gap-2">
              {SIZE_SCALE.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setPreviewSize(size)}
                  className={cn(
                    "rounded-[2px] px-2 py-1 text-[11px] font-mono border transition-colors",
                    previewSize === size
                      ? "border-[#1E5DF2] text-[#1E5DF2] bg-[#F3F7FF]"
                      : "border-border-primary bg-white/70 text-text-tertiary hover:text-text-secondary"
                  )}
                >
                  {size}px
                </button>
              ))}
            </div>
          </div>

          <div className="editorial-divider border-t pt-4">
            <button
              type="button"
              className="rounded-[2px] border border-border-subtle bg-white/70 px-3 py-2 text-[11px] font-mono uppercase tracking-wider text-text-primary transition-colors hover:border-border-hover"
            >
              Add to Project ▾
            </button>
          </div>
        </div>
      </motion.aside>
    </>
  );
}

export function TypeLibraryPage() {
  const [query, setQuery] = React.useState("");
  const [activeCategory, setActiveCategory] = React.useState<(typeof CATEGORY_TABS)[number]>("all");
  const [activeSource, setActiveSource] = React.useState<(typeof SOURCE_TABS)[number]>("all");
  const [sort, setSort] = React.useState<SortOption>("popularity");
  const [selectedFont, setSelectedFont] = React.useState<UnifiedFont | null>(null);
  const [visibleCount, setVisibleCount] = React.useState(INITIAL_VISIBLE);
  const [googleFonts, setGoogleFonts] = React.useState<UnifiedFont[]>([]);
  const [loading, setLoading] = React.useState(true);
  const loadMoreRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    fetch("/api/fonts/google?sort=popularity")
      .then((r) => r.json())
      .then((data) => {
        setGoogleFonts(Array.isArray(data) ? data : []);
      })
      .catch(() => setGoogleFonts([]))
      .finally(() => setLoading(false));
  }, []);

  const allFonts = React.useMemo(() => {
    const withPopularity = fontshareFonts.map((f) => ({ ...f, popularity: 0 }));
    googleFonts.forEach((f) => {
      if (!withPopularity.some((x) => x.family === f.family && x.source === f.source)) {
        withPopularity.push({ ...f, popularity: f.popularity ?? 9999 });
      }
    });
    if (sort === "popularity") {
      withPopularity.sort((a, b) => (a.popularity ?? 9999) - (b.popularity ?? 9999));
    } else if (sort === "name-asc") {
      withPopularity.sort((a, b) => a.family.localeCompare(b.family));
    } else if (sort === "name-desc") {
      withPopularity.sort((a, b) => b.family.localeCompare(a.family));
    }
    return withPopularity;
  }, [googleFonts, sort]);

  const filteredFonts = React.useMemo(() => {
    return allFonts.filter((font) => {
      if (activeCategory !== "all" && font.category !== activeCategory) return false;
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
          setVisibleCount((prev) => Math.min(prev + LOAD_MORE_COUNT, filteredFonts.length));
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

  const categoryLabel = (c: string) =>
    c === "all" ? "All" : c.charAt(0).toUpperCase() + c.slice(1).replace(/-/g, " ");
  const sourceLabel = (s: string) =>
    s === "all" ? "All Sources" : s === "fontshare" ? "Fontshare" : "Google";

  return (
    <section className="space-y-6">
      <SectionLabel>Type</SectionLabel>

      <div className="space-y-6">
        <DitherSurface
          patternVariant="fade"
          patternTone="warm"
          patternDensity="sm"
          muted
          className="space-y-2 px-6 py-6"
        >
          <p className="mono-kicker">Studio OS / Type Library</p>
          <h2 className="text-3xl font-bold text-text-primary tracking-tight">
            Type Library
          </h2>
          <p className="text-sm text-text-secondary">
            Browse 1500+ fonts from Google Fonts and Fontshare — search, filter, and add to your
            project.
          </p>
        </DitherSurface>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search fonts..."
            className="h-12 flex-1 max-w-sm"
          />
          <div className="flex items-center gap-2 text-[11px] text-text-tertiary">
            <span className="font-mono uppercase tracking-wider">Sort</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="rounded-[2px] border border-border-primary bg-white/80 px-2 py-1.5 text-text-primary outline-none focus:border-[#1E5DF2]"
            >
              <option value="popularity">Popularity</option>
              <option value="name-asc">Name A–Z</option>
              <option value="name-desc">Name Z–A</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-0 border-b border-border-subtle">
          <div className="flex">
            {CATEGORY_TABS.map((tab) => {
              const active = activeCategory === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveCategory(tab)}
                  className={cn(
                    "px-4 py-2 text-[11px] font-medium uppercase tracking-[0.15em]",
                    "border-b-2 -mb-px transition-colors whitespace-nowrap",
                    active
                      ? "border-text-primary text-text-primary"
                      : "border-transparent text-text-tertiary hover:text-text-secondary"
                  )}
                >
                  {categoryLabel(tab)}
                </button>
              );
            })}
          </div>
          <span className="mx-2 text-text-tertiary">│</span>
          <div className="flex">
            {SOURCE_TABS.map((tab) => {
              const active = activeSource === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveSource(tab)}
                  className={cn(
                    "px-4 py-2 text-[11px] font-medium uppercase tracking-[0.15em]",
                    "border-b-2 -mb-px transition-colors whitespace-nowrap",
                    active
                      ? "border-text-primary text-text-primary"
                      : "border-transparent text-text-tertiary hover:text-text-secondary"
                  )}
                >
                  {sourceLabel(tab)}
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-text-tertiary text-sm">Loading fonts…</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleFonts.map((font) => (
              <FontCard
                key={`${font.source}-${font.family}`}
                font={font}
                onSelect={() => setSelectedFont(font)}
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
    </section>
  );
}
