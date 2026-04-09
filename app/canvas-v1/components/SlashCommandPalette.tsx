"use client";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { motion } from "framer-motion";
import { Plus, LayoutGrid, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvas } from "@/lib/canvas/canvas-context";
import { SECTION_TEMPLATES } from "@/lib/canvas/section-library";

type SlashCommandPaletteProps = {
  anchorRef: React.RefObject<HTMLElement | null>;
  insertAtIndex: number;
  onOpenFullLibrary: (index: number) => void;
  onDismiss: () => void;
};

export function SlashCommandPalette({
  anchorRef,
  insertAtIndex,
  onOpenFullLibrary,
  onDismiss,
}: SlashCommandPaletteProps) {
  const { state, dispatch } = useCanvas();
  const itemId = state.selection.activeItemId;
  const menuRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [query, setQuery] = React.useState("");
  const [highlightIndex, setHighlightIndex] = React.useState(0);
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);

  const filtered = query
    ? SECTION_TEMPLATES.filter((t) =>
        t.name.toLowerCase().includes(query.toLowerCase())
      )
    : SECTION_TEMPLATES;

  // Total items: filtered templates + Browse All + Generate (disabled)
  const totalItems = filtered.length + 1; // +1 for Browse All (Generate is disabled, not navigable)

  // Position the palette centered on the anchor, clamped to viewport
  React.useLayoutEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    let top = rect.bottom + 4;
    let left = rect.left + rect.width / 2 - 125; // Center on anchor (250/2)

    setPos({ top, left });

    requestAnimationFrame(() => {
      const menu = menuRef.current;
      if (!menu) return;
      const menuRect = menu.getBoundingClientRect();

      // Horizontal clamping
      if (left + menuRect.width > window.innerWidth - 8) {
        left = window.innerWidth - menuRect.width - 8;
      }
      if (left < 8) left = 8;

      // Vertical: if overflows bottom, show above anchor
      if (top + menuRect.height > window.innerHeight - 8) {
        top = rect.top - menuRect.height - 4;
      }

      setPos({ top, left });
    });
  }, [anchorRef]);

  // Auto-focus input
  React.useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  // Dismiss on click outside
  React.useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onDismiss();
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [onDismiss]);

  // Dismiss on Escape (with preventDefault so canvas keyboard hook skips it)
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onDismiss();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onDismiss]);

  // Reset highlight when filter changes
  React.useEffect(() => {
    setHighlightIndex(0);
  }, [query]);

  function handleSelect(index: number) {
    if (index < filtered.length) {
      if (!itemId) return;
      const template = filtered[index];
      dispatch({ type: "INSERT_SECTION", itemId, index: insertAtIndex, section: template.createNodes() });
    } else {
      // Browse All
      onOpenFullLibrary(insertAtIndex);
    }
    onDismiss();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => (i + 1) % totalItems);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => (i - 1 + totalItems) % totalItems);
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSelect(highlightIndex);
    }
  }

  if (!pos) return null;

  return ReactDOM.createPortal(
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.95, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -4 }}
      transition={{ duration: 0.1 }}
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        zIndex: 50,
      }}
      className="min-w-[220px] max-w-[280px] bg-white border border-[#E5E5E0] rounded-[4px] shadow-md overflow-hidden"
    >
      {/* Search input */}
      <input
        ref={inputRef}
        type="text"
        value={`/${query}`}
        onChange={(e) => {
          const val = e.target.value;
          setQuery(val.startsWith("/") ? val.slice(1) : val);
        }}
        onKeyDown={handleKeyDown}
        className="px-3 py-2 text-[12px] text-[#1A1A1A] border-b border-[#E5E5E0] w-full outline-none bg-transparent"
        placeholder="/section name..."
      />

      {/* Template rows */}
      <div className="py-1 max-h-[260px] overflow-y-auto">
        {filtered.length === 0 && (
          <div className="px-3 py-2 text-[12px] text-[#A0A0A0]">
            No matching sections
          </div>
        )}

        {filtered.map((template, i) => (
          <button
            key={template.id}
            type="button"
            className={cn(
              "px-3 py-2 text-[12px] text-[#1A1A1A] cursor-pointer flex items-center gap-2 w-full text-left transition-colors",
              highlightIndex === i ? "bg-[#F5F5F0]" : "hover:bg-[#F5F5F0]"
            )}
            onMouseEnter={() => setHighlightIndex(i)}
            onClick={() => handleSelect(i)}
          >
            <Plus size={14} className="text-[#A0A0A0] shrink-0" strokeWidth={1.5} />
            <span>{template.name}</span>
          </button>
        ))}

      </div>

      {/* Separator + footer actions */}
      <div className="border-t border-[#E5E5E0] py-1">
        {/* Browse All */}
        <button
          type="button"
          className={cn(
            "px-3 py-2 text-[12px] text-[#1A1A1A] cursor-pointer flex items-center gap-2 w-full text-left transition-colors",
            highlightIndex === filtered.length ? "bg-[#F5F5F0]" : "hover:bg-[#F5F5F0]"
          )}
          onMouseEnter={() => setHighlightIndex(filtered.length)}
          onClick={() => handleSelect(filtered.length)}
        >
          <LayoutGrid size={14} className="text-[#A0A0A0] shrink-0" strokeWidth={1.5} />
          <span>Browse All...</span>
        </button>

        {/* Generate (disabled) */}
        <button
          type="button"
          disabled
          className="px-3 py-2 text-[12px] text-[#A0A0A0] cursor-default flex items-center gap-2 w-full text-left"
        >
          <Sparkles size={14} className="text-[#A0A0A0] shrink-0" strokeWidth={1.5} />
          <span>Generate...</span>
        </button>
      </div>
    </motion.div>,
    document.body
  );
}
