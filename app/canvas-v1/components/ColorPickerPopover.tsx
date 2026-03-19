"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

const DEFAULT_COLORS = [
  "#000000",
  "#333333",
  "#666666",
  "#D4D4D4",
  "#F5F5F0",
  "#FFFFFF",
  "#EF4444",
  "#F97316",
  "#EAB308",
  "#22C55E",
  "#1E5DF2",
  "#8B5CF6",
];

const POPOVER_WIDTH = 240;
const VIEWPORT_PADDING = 8;

function normalizeHexColor(value: string): string | null {
  const hex = value.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(hex)) return null;

  const expanded =
    hex.length === 3
      ? hex
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : hex;

  return `#${expanded.toUpperCase()}`;
}

function dedupeColors(colors: string[]): string[] {
  const uniqueColors = new Map<string, string>();

  for (const color of colors) {
    const normalized = normalizeHexColor(color);
    if (!normalized || uniqueColors.has(normalized)) continue;
    uniqueColors.set(normalized, normalized);
  }

  return [...uniqueColors.values()];
}

type ColorPickerPopoverProps = {
  open: boolean;
  value: string;
  anchorEl: HTMLElement | null;
  documentColors?: string[];
  onSelect: (color: string) => void;
  onClose: () => void;
};

export function ColorPickerPopover({
  open,
  value,
  anchorEl,
  documentColors = [],
  onSelect,
  onClose,
}: ColorPickerPopoverProps) {
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const closeTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasOpenRef = React.useRef(false);
  const [mounted, setMounted] = React.useState(false);
  const [position, setPosition] = React.useState<{ top: number; left: number } | null>(null);
  const normalizedValue = React.useMemo(
    () => normalizeHexColor(value) ?? "#FFFFFF",
    [value]
  );
  const [hexInput, setHexInput] = React.useState(normalizedValue.slice(1));
  const [previewColor, setPreviewColor] = React.useState(normalizedValue);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) {
      setHexInput(normalizedValue.slice(1));
    }
    setPreviewColor(normalizedValue);
  }, [normalizedValue, open]);

  React.useEffect(() => {
    if (open && !wasOpenRef.current) {
      setHexInput(normalizedValue.slice(1));
      setPreviewColor(normalizedValue);
    }
    wasOpenRef.current = open;
  }, [normalizedValue, open]);

  React.useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  const documentSwatches = React.useMemo(
    () => dedupeColors(documentColors).slice(0, 8),
    [documentColors]
  );

  const updatePosition = React.useCallback(() => {
    if (!open || !anchorEl) return;

    const anchorRect = anchorEl.getBoundingClientRect();
    const popoverWidth = popoverRef.current?.offsetWidth ?? POPOVER_WIDTH;
    const popoverHeight = popoverRef.current?.offsetHeight ?? 270;

    let left = anchorRect.left;
    left = Math.min(
      Math.max(VIEWPORT_PADDING, left),
      window.innerWidth - popoverWidth - VIEWPORT_PADDING
    );

    let top = anchorRect.bottom + 8;
    if (top + popoverHeight > window.innerHeight - VIEWPORT_PADDING) {
      top = anchorRect.top - popoverHeight - 8;
    }
    top = Math.min(
      Math.max(VIEWPORT_PADDING, top),
      window.innerHeight - popoverHeight - VIEWPORT_PADDING
    );

    setPosition({ top, left });
  }, [anchorEl, open]);

  React.useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [documentSwatches.length, open, updatePosition]);

  React.useEffect(() => {
    if (!open) return;

    const handleViewportChange = () => updatePosition();
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [open, updatePosition]);

  React.useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (popoverRef.current?.contains(target)) return;
      if (anchorEl?.contains(target)) return;
      onClose();
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [anchorEl, onClose, open]);

  React.useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  const applyColor = React.useCallback(
    (nextColor: string, closeAfterSelection = false) => {
      const normalized = normalizeHexColor(nextColor);
      if (!normalized) return;

      setHexInput(normalized.slice(1));
      setPreviewColor(normalized);
      onSelect(normalized);

      if (closeAfterSelection) {
        if (closeTimeoutRef.current) {
          clearTimeout(closeTimeoutRef.current);
        }
        closeTimeoutRef.current = setTimeout(() => {
          onClose();
        }, 100);
      }
    },
    [onClose, onSelect]
  );

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open && anchorEl ? (
        <motion.div
          ref={popoverRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
          style={{
            position: "fixed",
            top: position?.top ?? VIEWPORT_PADDING,
            left: position?.left ?? VIEWPORT_PADDING,
            width: POPOVER_WIDTH,
          }}
          className="z-[100] rounded-[6px] border border-[#E5E5E0] bg-white p-3 shadow-lg"
        >
          <div>
            <span className="mb-2 block font-mono text-[9px] uppercase tracking-[0.18em] text-[#A0A0A0]">
              Document Colors
            </span>
            <div className="flex flex-wrap gap-1.5">
              {documentSwatches.map((color) => (
                <button
                  key={color}
                  type="button"
                  className="h-5 w-5 rounded-full border border-[#E5E5E0] transition-shadow hover:ring-2 hover:ring-[#D1E4FC]"
                  style={{ backgroundColor: color }}
                  onClick={() => applyColor(color, true)}
                  aria-label={`Select ${color}`}
                />
              ))}
            </div>
          </div>

          <div className="my-2 h-px bg-[#E5E5E0]" />

          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] text-[#A0A0A0]">#</span>
              <input
                type="text"
                value={hexInput}
                onChange={(event) => {
                  const sanitizedValue = event.target.value
                    .replace(/[^0-9a-fA-F]/g, "")
                    .slice(0, 6)
                    .toUpperCase();

                  setHexInput(sanitizedValue);

                  const normalized = normalizeHexColor(sanitizedValue);
                  if (!normalized) return;
                  setPreviewColor(normalized);
                  onSelect(normalized);
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  const normalized = normalizeHexColor(hexInput);
                  if (!normalized) return;
                  onSelect(normalized);
                  onClose();
                }}
                className="flex-1 rounded-[2px] border border-[#E5E5E0] bg-white px-2 py-1 text-[12px] font-mono focus:border-[#D1E4FC] focus:outline-none focus:ring-2 focus:ring-[#D1E4FC]/40"
              />
            </div>

            <div
              className="mt-2 h-6 w-full rounded-[2px]"
              style={{ backgroundColor: previewColor }}
            />
          </div>

          <div className="my-2 h-px bg-[#E5E5E0]" />

          <div>
            <span className="mb-2 block font-mono text-[9px] uppercase tracking-[0.18em] text-[#A0A0A0]">
              Defaults
            </span>
            <div className="grid grid-cols-6 gap-1.5">
              {DEFAULT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className="h-6 w-6 cursor-pointer rounded-[2px] transition-shadow hover:ring-2 hover:ring-[#D1E4FC]"
                  style={{ backgroundColor: color }}
                  onClick={() => applyColor(color, true)}
                  aria-label={`Select ${color}`}
                />
              ))}
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
