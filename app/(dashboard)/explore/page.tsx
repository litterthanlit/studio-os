"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { useCuratedInspiration } from "@/hooks/use-curated-inspiration";
import { EmptyState } from "@/components/ui/empty-state";

export default function ExplorePage() {
  const {
    images,
    loading,
    error,
    toggleLike,
    isLiked,
  } = useCuratedInspiration({ limit: 18, minScore: 75 });

  return (
    <section className="mx-auto max-w-7xl px-6 py-16 sm:px-8">
      <div className="max-w-3xl px-6 py-6">
        <p className="mono-kicker text-text-tertiary">
          Explore
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-text-primary sm:text-5xl">
          Daily inspiration, without the dashboard clutter
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-text-secondary sm:text-base">
          A curated feed of references Studio OS scores for composition, color, and mood.
        </p>
      </div>

      <div className="mt-10">
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 9 }).map((_, index) => (
              <div key={index} className="aspect-[4/5] animate-pulse rounded-[4px] bg-[#F5F5F0]" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-[4px] border border-[#E5E5E0] bg-white/70 px-6 py-10 text-sm text-red-500">
            {error}
          </div>
        ) : images.length === 0 ? (
          <EmptyState
            title="No inspiration yet"
            description="Connect a source in Settings to populate Explore."
            variant="blue"
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {images.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: index * 0.03, ease: "easeOut" }}
                className="surface-panel group overflow-hidden"
              >
                <div className="halftone-preview relative aspect-[4/5] overflow-hidden bg-bg-tertiary">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.thumbnailUrl || item.imageUrl}
                    alt={item.title || ""}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                  {item.scores ? (
                    <div className="pixel-kicker absolute right-3 top-3 rounded-[2px] border border-white/15 bg-black/45 px-3 py-1 text-white backdrop-blur-sm">
                      Score {item.scores.overall}
                    </div>
                  ) : null}
                </div>
                <div className="space-y-4 px-5 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-base font-semibold text-text-primary">
                        {item.title || "Untitled reference"}
                      </h2>
                      <p className="mt-1 text-sm text-text-secondary">
                        {item.mood || item.style || "Curated reference"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleLike(item.id)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-[4px] border border-border-primary bg-white/70 text-sm text-text-secondary transition-colors hover:text-text-primary"
                      aria-label={isLiked(item.id) ? "Unlike image" : "Like image"}
                    >
                      {isLiked(item.id) ? "♥" : "♡"}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.tags.slice(0, 4).map((tag) => (
                      <span
                        key={`${item.id}-${tag}`}
                        className="rounded-[2px] border border-border-primary bg-white/70 px-3 py-1 text-[10px] uppercase tracking-[0.12em] text-text-tertiary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
