"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { springs, staggerContainer, staggerItem } from "@/lib/animations";
import type { ReferenceImage } from "@/lib/canvas/analyze-images";

type ReferenceGridProps = {
  images: ReferenceImage[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onRemove: (id: string) => void;
};

export function ReferenceGrid({
  images,
  selectedIds,
  onToggleSelect,
  onRemove,
}: ReferenceGridProps) {
  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <span className="text-lg text-[#A0A0A0] font-mono">[ ]</span>
        <p className="text-xs text-[#A0A0A0]">
          No references yet — upload images to begin
        </p>
      </div>
    );
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="grid grid-cols-2 gap-1.5"
    >
      <AnimatePresence>
        {images.map((img) => {
          const selected = selectedIds.has(img.id);
          return (
            <motion.div
              key={img.id}
              variants={staggerItem}
              exit={{ opacity: 0, scale: 0.9, transition: springs.smooth }}
              layout
              className="group relative"
            >
              <motion.button
                type="button"
                onClick={() => onToggleSelect(img.id)}
                whileHover={{ scale: 1.02, transition: springs.smooth }}
                whileTap={{ scale: 0.98, transition: springs.snappy }}
                className={cn(
                  "relative w-full overflow-hidden border bg-[#F5F5F0] aspect-square",
                  selected
                    ? "border-[#1E5DF2] ring-1 ring-[#1E5DF2]"
                    : "border-[#E5E5E0] hover:border-[#D1E4FC]"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.thumbnail || img.url}
                  alt={img.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />

                {selected && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={springs.bouncy}
                    className="absolute top-1 right-1 flex items-center justify-center w-5 h-5 bg-accent text-white rounded-full"
                  >
                    <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7 12l3.5 3.5L17 8" />
                    </svg>
                  </motion.div>
                )}

                <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-200 group-hover:bg-black/20" />
              </motion.button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(img.id);
                }}
                className={cn(
                  "absolute bottom-1 right-1 flex items-center justify-center w-5 h-5",
                  "bg-black/80 border border-white/10 text-white/60 hover:text-white",
                  "opacity-0 group-hover:opacity-100 transition-opacity duration-150",
                  "text-[10px]"
                )}
              >
                ×
              </button>

              <p className="mt-1 text-[10px] text-[#A0A0A0] truncate px-0.5">
                {img.name}
              </p>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
}
