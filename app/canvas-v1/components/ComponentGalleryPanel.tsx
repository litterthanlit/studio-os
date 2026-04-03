"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  X, Layout, Columns2, Grid3x3, Quote, Award, Megaphone, PanelBottom, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvas } from "@/lib/canvas/canvas-context";
import {
  getTemplateList,
  createTemplateById,
  loadSavedComponents,
  deleteSavedComponent,
  type DesignComponent,
} from "@/lib/canvas/design-component-library";
import type { DesignNode } from "@/lib/canvas/design-node";
import { cloneDesignNode } from "@/lib/canvas/design-node";

const TEMPLATE_ICONS: Record<string, React.ElementType> = {
  "template-hero": Layout,
  "template-split": Columns2,
  "template-features": Grid3x3,
  "template-quote": Quote,
  "template-proof": Award,
  "template-cta": Megaphone,
  "template-footer": PanelBottom,
};

type FilterTab = "all" | "templates" | "saved";

type ComponentGalleryPanelProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function ComponentGalleryPanel({ isOpen, onClose }: ComponentGalleryPanelProps) {
  const { state, dispatch } = useCanvas();
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<FilterTab>("all");
  const [saved, setSaved] = React.useState<DesignComponent[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);

  const artboardId = state.selection.activeArtboardId;

  // Load saved components when panel opens
  React.useEffect(() => {
    if (isOpen) setSaved(loadSavedComponents());
  }, [isOpen]);

  // Escape to close
  React.useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Clear confirm state after 3s
  React.useEffect(() => {
    if (!confirmDeleteId) return;
    const timer = setTimeout(() => setConfirmDeleteId(null), 3000);
    return () => clearTimeout(timer);
  }, [confirmDeleteId]);

  const templates = getTemplateList();

  // Build display list
  const items: Array<{ type: "template"; data: { id: string; name: string; category: string } } | { type: "saved"; data: DesignComponent }> = [];

  if (filter === "all" || filter === "templates") {
    for (const t of templates) {
      if (!search || t.name.toLowerCase().includes(search.toLowerCase())) {
        items.push({ type: "template", data: t });
      }
    }
  }
  if (filter === "all" || filter === "saved") {
    for (const s of saved) {
      if (!search || s.name.toLowerCase().includes(search.toLowerCase())) {
        items.push({ type: "saved", data: s });
      }
    }
  }

  function handleInsertTemplate(templateId: string) {
    if (!artboardId) return;
    const component = createTemplateById(templateId);
    if (!component) return;
    dispatch({ type: "INSERT_SECTION", artboardId, section: component.node });
    onClose();
  }

  function handleInsertSaved(component: DesignComponent) {
    if (!artboardId) return;
    const freshNode = cloneDesignNode(component.node);
    dispatch({ type: "INSERT_SECTION", artboardId, section: freshNode });
    onClose();
  }

  function handleDelete(id: string) {
    if (confirmDeleteId === id) {
      deleteSavedComponent(id);
      setSaved((prev) => prev.filter((c) => c.id !== id));
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
    }
  }

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ x: 320 }}
      animate={{ x: 0 }}
      exit={{ x: 320 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="fixed right-0 top-0 bottom-0 w-80 bg-white border-l border-[#E5E5E0] z-40 flex flex-col"
      style={{ contain: "strict" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
        <span className="text-[10px] uppercase tracking-widest text-[#A0A0A0]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
          Component Library
        </span>
        <button onClick={onClose} className="text-[#A0A0A0] hover:text-[#1A1A1A] transition-colors">
          <X size={14} strokeWidth={1.5} />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 px-4 pb-2 shrink-0">
        {(["all", "templates", "saved"] as FilterTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={cn(
              "px-2.5 py-1 rounded-[4px] text-[11px] font-medium transition-colors capitalize",
              filter === tab
                ? "bg-[#1E5DF2] text-white"
                : "bg-[#F5F5F0] text-[#6B6B6B] hover:bg-[#E5E5E0]"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="px-4 pb-3 shrink-0">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search components..."
          className="border border-[#E5E5E0] rounded-[2px] bg-white px-3 py-2 text-[13px] focus:border-[#D1E4FC] focus:ring-2 focus:ring-[#D1E4FC]/40 w-full outline-none"
        />
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 min-h-0">
        <div className="flex flex-col gap-2">
          {items.map((item) => {
            if (item.type === "template") {
              const Icon = TEMPLATE_ICONS[item.data.id] ?? Layout;
              return (
                <button
                  key={item.data.id}
                  onClick={() => handleInsertTemplate(item.data.id)}
                  className="border border-[#E5E5E0] rounded-[4px] p-3 hover:border-[#D1E4FC] cursor-pointer transition-colors flex items-start gap-2.5 w-full text-left"
                >
                  <Icon size={16} strokeWidth={1.5} className="text-[#A0A0A0] mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-[#1A1A1A]">{item.data.name}</div>
                    <div className="text-[10px] text-[#A0A0A0] font-mono uppercase mt-0.5">{item.data.category}</div>
                  </div>
                </button>
              );
            }

            // Saved component
            const s = item.data;
            const isConfirming = confirmDeleteId === s.id;
            return (
              <div
                key={s.id}
                className="border border-[#E5E5E0] rounded-[4px] p-3 hover:border-[#D1E4FC] transition-colors flex items-start gap-2.5 group relative"
              >
                <button
                  onClick={() => handleInsertSaved(s)}
                  className="flex items-start gap-2.5 flex-1 min-w-0 text-left"
                >
                  <Layout size={16} strokeWidth={1.5} className="text-[#A0A0A0] mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-[#1A1A1A]">{s.name}</div>
                    {s.projectName && (
                      <div className="text-[10px] text-[#A0A0A0] font-mono mt-0.5 truncate">{s.projectName}</div>
                    )}
                  </div>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}
                  className={cn(
                    "shrink-0 transition-colors text-[10px]",
                    isConfirming
                      ? "text-red-500"
                      : "text-[#A0A0A0] hover:text-red-500 opacity-0 group-hover:opacity-100"
                  )}
                  title={isConfirming ? "Click again to confirm" : "Delete"}
                >
                  {isConfirming ? (
                    <span className="font-mono">Confirm?</span>
                  ) : (
                    <Trash2 size={14} strokeWidth={1.5} />
                  )}
                </button>
              </div>
            );
          })}

          {/* Empty states */}
          {items.length === 0 && filter === "saved" && !search && (
            <p className="text-[11px] text-[#A0A0A0] py-4 text-center">
              Right-click any section and choose &ldquo;Save to Library&rdquo; to add components here.
            </p>
          )}
          {items.length === 0 && search && (
            <p className="text-[11px] text-[#A0A0A0] py-4 text-center">
              No results for &ldquo;{search}&rdquo;
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
