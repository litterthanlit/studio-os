"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { X, Layout, Award, Grid3x3, MessageSquareQuote, CreditCard, Megaphone, PanelBottom } from "lucide-react";
import { useCanvas } from "@/lib/canvas/canvas-context";
import { SECTION_TEMPLATES } from "@/lib/canvas/section-library";

const ICON_MAP: Record<string, React.ElementType> = {
  Layout,
  Award,
  Grid3x3,
  MessageSquareQuote,
  CreditCard,
  Megaphone,
  PanelBottom,
};

type SectionLibraryPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  afterNodeId: string | null;
};

export function SectionLibraryPanel({ isOpen, onClose, afterNodeId }: SectionLibraryPanelProps) {
  const { state, dispatch } = useCanvas();
  const [search, setSearch] = React.useState("");

  const filtered = search
    ? SECTION_TEMPLATES.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
    : SECTION_TEMPLATES;

  const artboardId = state.selection.activeArtboardId;

  // Escape to close
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleInsert(templateId: string) {
    if (!artboardId) return;
    const template = SECTION_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    const section = template.createNodes();
    dispatch({ type: "INSERT_SECTION", artboardId, afterNodeId, section });
    onClose();
  }

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ x: -320 }}
      animate={{ x: 0 }}
      exit={{ x: -320 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="fixed left-0 top-0 bottom-0 w-80 bg-white border-r border-[#E5E5E0] z-40 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <span
          className="text-[10px] uppercase tracking-widest text-[#A0A0A0]"
          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
        >
          Add Section
        </span>
        <button
          onClick={onClose}
          className="text-[#A0A0A0] hover:text-[#1A1A1A] transition-colors"
        >
          <X size={14} strokeWidth={1.5} />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search sections..."
          className="border border-[#E5E5E0] rounded-[2px] bg-white px-3 py-2 text-[13px] focus:border-[#D1E4FC] focus:ring-2 focus:ring-[#D1E4FC]/40 w-full outline-none"
          autoFocus
        />
      </div>

      {/* Template cards */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="flex flex-col gap-2">
          {filtered.map((template) => {
            const Icon = ICON_MAP[template.icon] ?? Layout;
            return (
              <button
                key={template.id}
                onClick={() => handleInsert(template.id)}
                className="border border-[#E5E5E0] rounded-[4px] p-3 hover:border-[#D1E4FC] cursor-pointer transition-colors flex items-start gap-2.5 w-full text-left"
              >
                <Icon size={16} strokeWidth={1.5} className="text-[#A0A0A0] mt-0.5 shrink-0" />
                <div>
                  <div className="text-[13px] font-medium text-[#1A1A1A]">{template.name}</div>
                  <div className="text-[11px] text-[#A0A0A0] mt-0.5">{template.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
