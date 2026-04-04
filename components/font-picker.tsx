"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ProjectFont } from "@/app/(dashboard)/projects/projects-data";
import type { UnifiedFont, FontCategory, FontSource } from "@/lib/fonts/types";
import { fontshareFonts } from "@/lib/fonts/fontshare-catalog";
import { getFontCssFamily, ensureFontLoaded } from "@/lib/fonts/load-font";
import { springs } from "@/lib/animations";

const PREVIEW_SAMPLE = "The quick brown fox jumps over the lazy dog.";
const HEADING_PREVIEW = "Studio OS Project";

const CATEGORY_TABS: (FontCategory | "all")[] = [
  "all",
  "sans-serif",
  "serif",
  "monospace",
  "display",
];

interface FontPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (headingFont: ProjectFont, bodyFont: ProjectFont) => void;
  initialHeadingFont?: ProjectFont;
  initialBodyFont?: ProjectFont;
}

function FontPreviewCard({
  font,
  isSelected,
  onClick,
  previewText,
  isHeading,
}: {
  font: UnifiedFont;
  isSelected: boolean;
  onClick: () => void;
  previewText: string;
  isHeading?: boolean;
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
      { rootMargin: "50px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    if (!isVisible) return;
    ensureFontLoaded(font);
  }, [isVisible, font]);

  return (
    <motion.div
      ref={ref}
      onClick={onClick}
      whileHover={{ y: -2, transition: springs.smooth }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "cursor-pointer border p-4 transition-colors duration-200",
        isSelected
          ? "border-[var(--accent)] bg-[var(--accent)]/5"
          : "border-[var(--border-primary)] bg-[var(--bg-secondary)] hover:border-[var(--text-tertiary)]"
      )}
    >
      <div
        className={cn(
          "mb-2 text-[var(--text-primary)] leading-tight",
          isHeading ? "text-xl font-semibold" : "text-sm"
        )}
        style={{ fontFamily: getFontCssFamily(font) }}
      >
        {previewText}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--text-secondary)]">{font.family}</span>
        <span className="text-[10px] font-mono text-[var(--text-tertiary)] uppercase">
          {font.source}
        </span>
      </div>
    </motion.div>
  );
}

export function FontPicker({
  isOpen,
  onClose,
  onSelect,
  initialHeadingFont,
  initialBodyFont,
}: FontPickerProps) {
  const [activeTab, setActiveTab] = React.useState<"heading" | "body">("heading");
  const [selectedHeading, setSelectedHeading] = React.useState<UnifiedFont | null>(null);
  const [selectedBody, setSelectedBody] = React.useState<UnifiedFont | null>(null);
  const [categoryFilter, setCategoryFilter] = React.useState<(typeof CATEGORY_TABS)[number]>("all");
  const [query, setQuery] = React.useState("");
  const [googleFonts, setGoogleFonts] = React.useState<UnifiedFont[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Load fonts on mount
  React.useEffect(() => {
    if (!isOpen) return;
    
    fetch("/api/fonts/google?sort=popularity")
      .then((r) => r.json())
      .then((data) => {
        const google = Array.isArray(data) ? data : [];
        setGoogleFonts(google);
      })
      .catch(() => setGoogleFonts([]))
      .finally(() => setLoading(false));
  }, [isOpen]);

  // Set initial selections
  React.useEffect(() => {
    if (!isOpen) return;
    
    if (initialHeadingFont) {
      const match = [...fontshareFonts, ...googleFonts].find(
        (f) => f.family === initialHeadingFont.family && f.source === initialHeadingFont.source
      );
      if (match) setSelectedHeading(match);
    }
    
    if (initialBodyFont) {
      const match = [...fontshareFonts, ...googleFonts].find(
        (f) => f.family === initialBodyFont.family && f.source === initialBodyFont.source
      );
      if (match) setSelectedBody(match);
    }
  }, [isOpen, initialHeadingFont, initialBodyFont, googleFonts.length]);

  const allFonts = React.useMemo(() => {
    const fontshareWithPopularity = fontshareFonts.map((f) => ({ ...f, popularity: 0 }));
    const combined = [...fontshareWithPopularity, ...googleFonts];
    combined.sort((a, b) => (a.popularity ?? 9999) - (b.popularity ?? 9999));
    return combined;
  }, [googleFonts]);

  const filteredFonts = React.useMemo(() => {
    return allFonts.filter((font) => {
      if (categoryFilter !== "all" && font.category !== categoryFilter) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        if (!font.family.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [allFonts, categoryFilter, query]);

  const handleSave = () => {
    if (selectedHeading && selectedBody) {
      onSelect(
        {
          family: selectedHeading.family,
          source: selectedHeading.source,
          category: selectedHeading.category,
        },
        {
          family: selectedBody.family,
          source: selectedBody.source,
          category: selectedBody.category,
        }
      );
      onClose();
    }
  };

  const previewHeading = selectedHeading || allFonts[0];
  const previewBody = selectedBody || allFonts[0];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={springs.snappy}
            className="fixed inset-0 z-50 bg-black/60"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={springs.snappy}
            className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-50 md:w-[900px] md:max-h-[85vh] bg-[var(--bg-secondary)] border border-[var(--border-primary)] shadow-[var(--shadow-lg)] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border-primary)] px-6 py-4">
              <h2 className="text-lg font-medium text-[var(--text-primary)]">
                Typography Spine
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="flex flex-1 overflow-hidden">
              {/* Left: Font Selector */}
              <div className="flex-1 flex flex-col border-r border-[var(--border-primary)] min-w-0">
                {/* Tabs */}
                <div className="flex border-b border-[var(--border-primary)]">
                  <button
                    type="button"
                    onClick={() => setActiveTab("heading")}
                    className={cn(
                      "flex-1 px-4 py-3 text-sm font-medium transition-colors relative",
                      activeTab === "heading"
                        ? "text-[var(--text-primary)]"
                        : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                    )}
                  >
                    Select Heading Font
                    {selectedHeading && (
                      <span className="ml-2 text-[10px] font-mono text-[var(--accent)]">
                        {selectedHeading.family}
                      </span>
                    )}
                    {activeTab === "heading" && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent)]"
                        transition={springs.smooth}
                      />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("body")}
                    className={cn(
                      "flex-1 px-4 py-3 text-sm font-medium transition-colors relative",
                      activeTab === "body"
                        ? "text-[var(--text-primary)]"
                        : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                    )}
                  >
                    Select Body Font
                    {selectedBody && (
                      <span className="ml-2 text-[10px] font-mono text-[var(--accent)]">
                        {selectedBody.family}
                      </span>
                    )}
                    {activeTab === "body" && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent)]"
                        transition={springs.smooth}
                      />
                    )}
                  </button>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3 border-b border-[var(--border-primary)] px-4 py-3">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search fonts..."
                    className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-primary)] px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none focus:border-[var(--accent)]"
                  />
                  <div className="flex gap-1">
                    {CATEGORY_TABS.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategoryFilter(cat)}
                        className={cn(
                          "px-2 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors",
                          categoryFilter === cat
                            ? "bg-[var(--accent)] text-white"
                            : "bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                        )}
                      >
                        {cat === "all" ? "All" : cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Grid */}
                <div className="flex-1 overflow-y-auto p-4">
                  {loading ? (
                    <div className="flex items-center justify-center h-full text-[var(--text-tertiary)]">
                      Loading fonts…
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {filteredFonts.map((font) => (
                        <FontPreviewCard
                          key={`${font.source}-${font.family}`}
                          font={font}
                          isSelected={
                            activeTab === "heading"
                              ? selectedHeading?.family === font.family
                              : selectedBody?.family === font.family
                          }
                          onClick={() => {
                            if (activeTab === "heading") {
                              setSelectedHeading(font);
                            } else {
                              setSelectedBody(font);
                            }
                          }}
                          previewText={activeTab === "heading" ? HEADING_PREVIEW : PREVIEW_SAMPLE}
                          isHeading={activeTab === "heading"}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Preview */}
              <div className="w-[320px] flex flex-col bg-[var(--bg-primary)] p-6">
                <h3 className="text-[11px] font-mono uppercase tracking-[0.15em] text-[var(--text-tertiary)] mb-4">
                  Live Preview
                </h3>
                <div className="flex-1 space-y-6">
                  <div
                    className="text-2xl font-semibold text-[var(--text-primary)] leading-tight"
                    style={{
                      fontFamily: previewHeading ? getFontCssFamily(previewHeading) : undefined,
                    }}
                  >
                    {HEADING_PREVIEW}
                  </div>
                  <div
                    className="text-sm text-[var(--text-secondary)] leading-relaxed space-y-3"
                    style={{
                      fontFamily: previewBody ? getFontCssFamily(previewBody) : undefined,
                    }}
                  >
                    <p>
                      {PREVIEW_SAMPLE} This is how your body text will look with the selected
                      pairing.
                    </p>
                    <p>
                      Typography is the voice of design. The right pairing creates harmony and
                      establishes hierarchy throughout your project.
                    </p>
                  </div>
                </div>

                {/* Selected Info */}
                <div className="border-t border-[var(--border-primary)] pt-4 mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-tertiary)]">Heading</span>
                    <span className="text-[var(--text-primary)] font-medium">
                      {selectedHeading?.family || "Not selected"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-tertiary)]">Body</span>
                    <span className="text-[var(--text-primary)] font-medium">
                      {selectedBody?.family || "Not selected"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-[var(--border-primary)] px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!selectedHeading || !selectedBody}
                className="px-4 py-2 bg-[var(--accent)] text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              >
                Save Pairing
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
