"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { SlashCommandPalette } from "./SlashCommandPalette";

type InsertionBarProps = {
  index: number;
  onInsert: (index: number) => void;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
};

export function InsertionBar({
  index,
  onInsert,
  className,
  style,
  disabled = false,
}: InsertionBarProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  return (
    <div
      className={cn("relative h-8 w-full", disabled && "pointer-events-none", className)}
      style={style}
      onMouseEnter={() => {
        if (!disabled) setIsHovered(true);
      }}
      onMouseLeave={() => {
        if (!paletteOpen) setIsHovered(false);
      }}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered || paletteOpen ? 1 : 0 }}
        transition={{ duration: 0.1 }}
        className="pointer-events-none absolute inset-0"
      >
        <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-[#E5E5E0]" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <button
            ref={buttonRef}
            type="button"
            aria-label="Insert section"
            className="pointer-events-auto flex h-6 w-6 items-center justify-center rounded-full border border-[#E5E5E0] bg-white text-[#A0A0A0] transition-colors hover:border-[#D1E4FC] hover:text-[#1E5DF2] hover:shadow-sm"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setPaletteOpen(true);
            }}
          >
            <Plus size={12} strokeWidth={1.5} />
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {paletteOpen && (
          <SlashCommandPalette
            anchorRef={buttonRef}
            insertAtIndex={index}
            onOpenFullLibrary={(idx) => {
              setPaletteOpen(false);
              setIsHovered(false);
              onInsert(idx);
            }}
            onDismiss={() => {
              setPaletteOpen(false);
              setIsHovered(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
