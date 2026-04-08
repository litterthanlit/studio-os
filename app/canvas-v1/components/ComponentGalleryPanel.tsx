"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  X, Layout, Columns2, Grid3x3, Quote, Award, Megaphone, PanelBottom, Trash2, Pencil, Box,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DesignNodeIframePreview } from "./DesignNodeIframePreview";
import { useCanvas } from "@/lib/canvas/canvas-context";
import {
  loadSavedComponents,
  deleteSavedComponent,
  createTemplateById,
  getTemplateList,
  type DesignComponent,
} from "@/lib/canvas/design-component-library";
import { cloneDesignNode } from "@/lib/canvas/design-node";
import { getBuiltinMasters } from "@/lib/canvas/component-builtins";
import type { ComponentMaster } from "@/lib/canvas/design-node";

const BUILTIN_ICONS: Record<string, React.ElementType> = {
  "builtin-hero": Layout,
  "builtin-split": Columns2,
  "builtin-features": Grid3x3,
  "builtin-quote": Quote,
  "builtin-proof": Award,
  "builtin-cta": Megaphone,
  "builtin-footer": PanelBottom,
};

type FilterTab = "all" | "templates" | "project" | "legacy";

type ComponentGalleryPanelProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function ComponentGalleryPanel({ isOpen, onClose }: ComponentGalleryPanelProps) {
  const { state, dispatch } = useCanvas();
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<FilterTab>("all");
  const [legacy, setLegacy] = React.useState<DesignComponent[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);
  const [renamingId, setRenamingId] = React.useState<string | null>(null);
  const [renameValue, setRenameValue] = React.useState("");

  const artboardId = state.selection.activeArtboardId;

  const staticPrimitiveTemplates = React.useMemo(() => {
    return getTemplateList()
      .filter((t) => t.category === "Primitives")
      .map((t) => {
        const comp = createTemplateById(t.id);
        if (!comp) return null;
        return { id: t.id, name: t.name, category: t.category, node: comp.node };
      })
      .filter((x): x is NonNullable<typeof x> => x != null);
  }, []);

  // Load legacy saved components when panel opens
  React.useEffect(() => {
    if (isOpen) setLegacy(loadSavedComponents());
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

  const builtinMasters: ComponentMaster[] = getBuiltinMasters();
  const userMasters: ComponentMaster[] = state.components.filter((c) => c.source === "user");

  const matchSearch = (name: string) =>
    !search || name.toLowerCase().includes(search.toLowerCase());

  // --- Insert handlers ---

  function handleInsertMaster(masterId: string) {
    if (!artboardId) return;
    dispatch({ type: "INSERT_INSTANCE", artboardId, masterId });
    onClose();
  }

  function handleLegacyInsert(savedComponent: DesignComponent) {
    if (!artboardId) return;
    const cloned = cloneDesignNode(savedComponent.node);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dispatch({ type: "INSERT_SECTION", artboardId, section: cloned as any });
    dispatch({
      type: "CREATE_MASTER",
      artboardId,
      nodeId: cloned.id,
      name: savedComponent.name,
      category: savedComponent.category,
    });
    onClose();
  }

  /** DesignNode section templates from design-component-library (e.g. Primitives) — insert only, no master promotion. */
  function handleInsertDesignTemplate(templateId: string) {
    if (!artboardId) return;
    const comp = createTemplateById(templateId);
    if (!comp) return;
    const cloned = cloneDesignNode(comp.node);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dispatch({ type: "INSERT_SECTION", artboardId, section: cloned as any });
    onClose();
  }

  // --- Edit / rename / delete for user masters ---

  function handleEditMaster(masterId: string) {
    dispatch({ type: "ENTER_MASTER_EDIT", masterId });
    onClose();
  }

  function handleDeleteMaster(masterId: string) {
    if (confirmDeleteId === masterId) {
      dispatch({ type: "DELETE_MASTER", masterId });
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(masterId);
    }
  }

  function handleStartRename(master: ComponentMaster) {
    setRenamingId(master.id);
    setRenameValue(master.name);
  }

  function handleCommitRename(masterId: string) {
    const trimmed = renameValue.trim();
    if (trimmed) {
      dispatch({ type: "RENAME_MASTER", masterId, name: trimmed });
    }
    setRenamingId(null);
    setRenameValue("");
  }

  // --- Legacy delete ---

  function handleDeleteLegacy(id: string) {
    if (confirmDeleteId === id) {
      deleteSavedComponent(id);
      setLegacy((prev) => prev.filter((c) => c.id !== id));
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
    }
  }

  if (!isOpen) return null;

  const showTemplates = filter === "all" || filter === "templates";
  const showProject = (filter === "all" || filter === "project") && userMasters.length > 0;
  const showLegacy = (filter === "all" || filter === "legacy") && legacy.length > 0;

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
      <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0 gap-2">
        <span className="text-[10px] uppercase tracking-[1px] text-[#A0A0A0]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
          Component Library
        </span>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/component-gallery"
            className="text-[10px] uppercase tracking-[1px] text-[#4B57DB] hover:underline whitespace-nowrap"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            onClick={onClose}
          >
            Full page
          </Link>
          <button type="button" onClick={onClose} className="text-[#A0A0A0] hover:text-[#1A1A1A] transition-colors">
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 px-4 pb-2 shrink-0 flex-wrap">
        {(["all", "templates", "project", "legacy"] as FilterTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={cn(
              "px-2.5 py-1 rounded-[4px] text-[11px] font-medium transition-colors capitalize",
              filter === tab
                ? "bg-[#4B57DB] text-white"
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

      {/* Sections */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 min-h-0">
        <div className="flex flex-col gap-4">

          {/* ── Templates (built-in masters) ── */}
          {showTemplates && (
            <div>
              <div className="text-[10px] uppercase tracking-[1px] text-[#A0A0A0] mb-1.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                Templates
              </div>
              <div className="flex flex-col gap-2">
                {builtinMasters
                  .filter((m) => matchSearch(m.name))
                  .map((m) => {
                    const Icon = BUILTIN_ICONS[m.id] ?? Layout;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleInsertMaster(m.id)}
                        className="border border-[#E5E5E0] rounded-[4px] p-2 hover:border-[#D1E4FC] cursor-pointer transition-colors flex flex-col gap-2 w-full text-left"
                      >
                        <DesignNodeIframePreview
                          node={m.tree}
                          height={76}
                          contentWidth={1200}
                          contentHeight={420}
                          title={`Preview: ${m.name}`}
                        />
                        <div className="flex items-start gap-2.5 px-1">
                          <Icon size={16} strokeWidth={1.5} className="text-[#A0A0A0] mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-medium text-[#1A1A1A]">{m.name}</div>
                            <div className="text-[10px] text-[#A0A0A0] font-mono uppercase mt-0.5">{m.category}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                {builtinMasters.filter((m) => matchSearch(m.name)).length === 0 && search && (
                  <p className="text-[11px] text-[#A0A0A0] py-2 text-center">No templates match &ldquo;{search}&rdquo;</p>
                )}
              </div>

              {staticPrimitiveTemplates.some((t) => matchSearch(t.name)) && (
                <div className="mt-4">
                  <div className="text-[10px] uppercase tracking-[1px] text-[#A0A0A0] mb-1.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                    Primitives
                  </div>
                  <div className="flex flex-col gap-2">
                    {staticPrimitiveTemplates
                      .filter((t) => matchSearch(t.name))
                      .map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleInsertDesignTemplate(t.id)}
                          className="border border-[#E5E5E0] rounded-[4px] p-2 hover:border-[#D1E4FC] cursor-pointer transition-colors flex flex-col gap-2 w-full text-left"
                        >
                          <DesignNodeIframePreview
                            node={t.node}
                            height={64}
                            contentWidth={640}
                            contentHeight={220}
                            title={`Preview: ${t.name}`}
                          />
                          <div className="flex items-start gap-2.5 px-1">
                            <Box size={16} strokeWidth={1.5} className="text-[#A0A0A0] mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-[13px] font-medium text-[#1A1A1A]">{t.name}</div>
                              <div className="text-[10px] text-[#A0A0A0] font-mono uppercase mt-0.5">{t.category}</div>
                            </div>
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Project Components (user masters) ── */}
          {showProject && (
            <div>
              <div className="text-[10px] uppercase tracking-[1px] text-[#A0A0A0] mb-1.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                Project Components
              </div>
              <div className="flex flex-col gap-2">
                {userMasters
                  .filter((m) => matchSearch(m.name))
                  .map((m) => {
                    const isConfirming = confirmDeleteId === m.id;
                    const isRenaming = renamingId === m.id;
                    return (
                      <div
                        key={m.id}
                        className="border border-[#E5E5E0] rounded-[4px] p-3 hover:border-[#D1E4FC] transition-colors flex items-start gap-2.5 group relative"
                      >
                        <button
                          onClick={() => handleInsertMaster(m.id)}
                          className="flex items-start gap-2.5 flex-1 min-w-0 text-left"
                        >
                          <Layout size={16} strokeWidth={1.5} className="text-[#A0A0A0] mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            {isRenaming ? (
                              <input
                                type="text"
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleCommitRename(m.id);
                                  if (e.key === "Escape") { setRenamingId(null); setRenameValue(""); }
                                }}
                                onBlur={() => handleCommitRename(m.id)}
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                                className="w-full border border-[#D1E4FC] rounded-[2px] bg-[#FAFAF8] px-1.5 py-0.5 text-[13px] outline-none"
                              />
                            ) : (
                              <div className="text-[13px] font-medium text-[#1A1A1A] truncate">{m.name}</div>
                            )}
                            <div className="text-[10px] text-[#A0A0A0] font-mono uppercase mt-0.5">{m.category}</div>
                          </div>
                        </button>

                        {/* Action buttons — visible on hover */}
                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          {/* Edit master */}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEditMaster(m.id); }}
                            className="text-[#A0A0A0] hover:text-[#4B57DB] transition-colors"
                            title="Edit master"
                          >
                            <Pencil size={13} strokeWidth={1.5} />
                          </button>
                          {/* Rename */}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleStartRename(m); }}
                            className="text-[#A0A0A0] hover:text-[#4B57DB] transition-colors text-[10px] font-mono"
                            title="Rename"
                          >
                            Aa
                          </button>
                          {/* Delete */}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteMaster(m.id); }}
                            className={cn(
                              "shrink-0 transition-colors text-[10px]",
                              isConfirming ? "text-red-500" : "text-[#A0A0A0] hover:text-red-500"
                            )}
                            title={isConfirming ? "Click again to confirm" : "Delete"}
                          >
                            {isConfirming ? (
                              <span className="font-mono text-[10px]">Confirm?</span>
                            ) : (
                              <Trash2 size={13} strokeWidth={1.5} />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                {userMasters.filter((m) => matchSearch(m.name)).length === 0 && search && (
                  <p className="text-[11px] text-[#A0A0A0] py-2 text-center">No project components match &ldquo;{search}&rdquo;</p>
                )}
              </div>
            </div>
          )}

          {/* ── Legacy Library (localStorage) ── */}
          {showLegacy && (
            <div>
              <div className="text-[10px] uppercase tracking-[1px] text-[#A0A0A0] mb-1.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                Legacy Library
              </div>
              <div className="flex flex-col gap-2">
                {legacy
                  .filter((s) => matchSearch(s.name))
                  .map((s) => {
                    const isConfirming = confirmDeleteId === s.id;
                    return (
                      <div
                        key={s.id}
                        className="border border-[#E5E5E0] rounded-[4px] p-3 hover:border-[#D1E4FC] transition-colors flex items-start gap-2.5 group relative"
                      >
                        <button
                          onClick={() => handleLegacyInsert(s)}
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
                          onClick={(e) => { e.stopPropagation(); handleDeleteLegacy(s.id); }}
                          className={cn(
                            "shrink-0 transition-colors text-[10px] opacity-0 group-hover:opacity-100",
                            isConfirming ? "!opacity-100 text-red-500" : "text-[#A0A0A0] hover:text-red-500"
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
              </div>
            </div>
          )}

          {/* ── Empty states ── */}
          {(filter === "project") && userMasters.length === 0 && (
            <p className="text-[11px] text-[#A0A0A0] py-4 text-center">
              Right-click any section and choose &ldquo;Save to Library&rdquo; to create project components.
            </p>
          )}
          {(filter === "legacy") && legacy.length === 0 && (
            <p className="text-[11px] text-[#A0A0A0] py-4 text-center">
              No legacy saved components found.
            </p>
          )}
          {filter === "all" && builtinMasters.filter((m) => matchSearch(m.name)).length === 0 &&
            userMasters.filter((m) => matchSearch(m.name)).length === 0 &&
            legacy.filter((s) => matchSearch(s.name)).length === 0 && search && (
            <p className="text-[11px] text-[#A0A0A0] py-4 text-center">
              No results for &ldquo;{search}&rdquo;
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
