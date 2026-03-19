"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";

const BASIC_COLORS = [
  "#000000", "#333333", "#666666", "#999999", "#CCCCCC", "#FFFFFF",
  "#EF4444", "#F97316", "#EAB308", "#22C55E", "#3B82F6", "#8B5CF6",
];

type ColorPickerPopoverProps = {
  open: boolean;
  value: string;
  documentColors?: string[];
  onSelect: (color: string) => void;
  onClose: () => void;
};

export function ColorPickerPopover({
  open,
  value,
  documentColors = [],
  onSelect,
  onClose,
}: ColorPickerPopoverProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [hexInput, setHexInput] = React.useState(value.replace("#", ""));

  React.useEffect(() => {
    setHexInput(value.replace("#", ""));
  }, [value]);

  // Click outside to dismiss
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  // Escape to dismiss
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="absolute left-0 top-full z-50 mt-1 w-[248px] rounded-[4px] border border-[#E5E5E0] bg-white p-3 shadow-lg"
        >
          {/* Document colors */}
          {documentColors.length > 0 && (
            <div className="mb-3">
              <span className="mb-1.5 block font-mono text-[9px] uppercase tracking-widest text-[#A0A0A0]">
                Document colors
              </span>
              <div className="flex flex-wrap gap-1.5">
                {documentColors.slice(0, 12).map((color, i) => (
                  <button
                    key={`${color}-${i}`}
                    className="h-5 w-5 rounded-[2px] border border-[#E5E5E0] hover:ring-1 hover:ring-[#1E5DF2]"
                    style={{ backgroundColor: color }}
                    onClick={() => {
                      onSelect(color);
                      onClose();
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Hex input */}
          <div className="mb-3 flex items-center gap-1.5">
            <span className="text-[12px] text-[#A0A0A0]">#</span>
            <input
              type="text"
              value={hexInput}
              onChange={(e) => setHexInput(e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6))}
              onBlur={() => {
                if (/^[0-9a-fA-F]{3,6}$/.test(hexInput)) {
                  onSelect(`#${hexInput}`);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && /^[0-9a-fA-F]{3,6}$/.test(hexInput)) {
                  onSelect(`#${hexInput}`);
                  onClose();
                }
              }}
              className="flex-1 rounded-[2px] border border-[#E5E5E0] bg-white px-2 py-1 text-[12px] font-mono focus:border-[#D1E4FC] focus:ring-2 focus:ring-[#D1E4FC]/40 focus:outline-none"
            />
          </div>

          {/* Basic color grid */}
          <div className="flex flex-wrap gap-1.5">
            {BASIC_COLORS.map((color) => (
              <button
                key={color}
                className="h-5 w-5 rounded-[2px] border border-[#E5E5E0] hover:ring-1 hover:ring-[#1E5DF2]"
                style={{ backgroundColor: color }}
                onClick={() => {
                  onSelect(color);
                  onClose();
                }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
