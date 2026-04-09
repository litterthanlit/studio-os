"use client";

import * as React from "react";
import * as ReactDOM from "react-dom";
import {
  Layout, Columns2, Grid3x3, Quote, Award, Megaphone, PanelBottom, Box,
} from "lucide-react";
import {
  loadSavedComponents,
  createTemplateById,
  getTemplateList,
  type DesignComponent,
} from "@/lib/canvas/design-component-library";
import { cloneDesignNode } from "@/lib/canvas/design-node";
import { getBuiltinMasters } from "@/lib/canvas/component-builtins";
import type { ComponentMaster } from "@/lib/canvas/design-node";
import { useCanvas } from "@/lib/canvas/canvas-context";

const BUILTIN_ICONS: Record<string, React.ElementType> = {
  "builtin-hero": Layout,
  "builtin-split": Columns2,
  "builtin-features": Grid3x3,
  "builtin-quote": Quote,
  "builtin-proof": Award,
  "builtin-cta": Megaphone,
  "builtin-footer": PanelBottom,
};

type ComponentQuickPickerProps = {
  anchorRect: DOMRect;
  onBrowseAll: () => void;
  onDismiss: () => void;
  /** @deprecated Pass itemId instead; kept for backward compat. If provided, legacy INSERT_SECTION path is used. */
  onInsert?: (node: import("@/lib/canvas/design-node").DesignNode) => void;
};

export function ComponentQuickPicker({
  anchorRect,
  onBrowseAll,
  onDismiss,
  onInsert,
}: ComponentQuickPickerProps) {
  const { state, dispatch } = useCanvas();
  const menuRef = React.useRef<HTMLDivElement>(null);

  const builtinMasters: ComponentMaster[] = getBuiltinMasters();
  // Recent user masters (last 3, newest first)
  const recentUserMasters: ComponentMaster[] = state.components
    .filter((c) => c.source === "user")
    .slice(-3)
    .reverse();
  // Legacy saved components (last 3, newest first)
  const legacySaved: DesignComponent[] = React.useMemo(
    () => loadSavedComponents().slice(-3).reverse(),
    []
  );

  const itemId = state.selection.activeItemId;

  // Position below anchor, centered
  const left = Math.max(8, anchorRect.left + anchorRect.width / 2 - 110);
  const top = anchorRect.bottom + 4;

  // Viewport clamping
  React.useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pad = 8;
    if (rect.bottom > window.innerHeight - pad) {
      el.style.top = `${anchorRect.top - rect.height - 4}px`;
    }
    if (rect.right > window.innerWidth - pad) {
      el.style.left = `${window.innerWidth - rect.width - pad}px`;
    }
  }, [anchorRect]);

  // Dismiss on Escape or outside click
  React.useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onDismiss();
    }
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onDismiss();
      }
    }
    window.addEventListener("keydown", handleKey);
    window.addEventListener("mousedown", handleClick, true);
    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("mousedown", handleClick, true);
    };
  }, [onDismiss]);

  function handleMasterClick(masterId: string) {
    if (itemId) {
      dispatch({ type: "INSERT_INSTANCE", itemId, masterId });
      onDismiss();
    }
  }

  function handlePrimitiveTemplateClick(templateId: string) {
    if (!itemId) return;
    const comp = createTemplateById(templateId);
    if (!comp) return;
    const cloned = cloneDesignNode(comp.node);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dispatch({ type: "INSERT_SECTION", itemId, section: cloned as any });
    onDismiss();
  }

  const primitiveTemplates = getTemplateList().filter((t) => t.category === "Primitives");

  function handleLegacyClick(component: DesignComponent) {
    if (itemId) {
      const cloned = cloneDesignNode(component.node);
      // Legacy path: insert node + promote to master
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dispatch({ type: "INSERT_SECTION", itemId, section: cloned as any });
      dispatch({
        type: "CREATE_MASTER",
        itemId,
        nodeId: cloned.id,
        name: component.name,
        category: component.category,
      });
    } else if (onInsert) {
      // Fallback if no itemId
      onInsert(cloneDesignNode(component.node));
    }
    onDismiss();
  }

  return ReactDOM.createPortal(
    <div
      ref={menuRef}
      className="fixed z-[9999] w-[248px] rounded-[4px] border border-[#E5E5E0] bg-white py-1 shadow-lg"
      style={{ left, top }}
    >
      {/* Built-in Templates */}
      <div className="px-3 py-1">
        <span className="text-[11px] uppercase tracking-wide text-[#8A8A8A] font-mono">Templates</span>
      </div>
      {builtinMasters.map((m) => {
        const Icon = BUILTIN_ICONS[m.id] ?? Layout;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => handleMasterClick(m.id)}
            className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-[#1A1A1A] hover:bg-[#F5F5F0] transition-colors text-left"
          >
            <Icon size={14} strokeWidth={1.5} className="text-[#A0A0A0] shrink-0" />
            <span className="flex-1 truncate">{m.name}</span>
            <span className="text-[10px] text-[#8A8A8A] font-mono uppercase">{m.category}</span>
          </button>
        );
      })}

      {primitiveTemplates.length > 0 && (
        <>
          <div className="h-px bg-[#E5E5E0] my-1" />
          <div className="px-3 py-1">
            <span className="text-[11px] uppercase tracking-wide text-[#8A8A8A] font-mono">Primitives</span>
          </div>
          {primitiveTemplates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => handlePrimitiveTemplateClick(t.id)}
              className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-[#1A1A1A] hover:bg-[#F5F5F0] transition-colors text-left"
            >
              <Box size={14} strokeWidth={1.5} className="text-[#A0A0A0] shrink-0" />
              <span className="flex-1 truncate">{t.name}</span>
              <span className="text-[10px] text-[#8A8A8A] font-mono uppercase">{t.category}</span>
            </button>
          ))}
        </>
      )}

      {/* Recent user masters */}
      {recentUserMasters.length > 0 && (
        <>
          <div className="h-px bg-[#E5E5E0] my-1" />
          <div className="px-3 py-1">
            <span className="text-[11px] uppercase tracking-wide text-[#8A8A8A] font-mono">Project</span>
          </div>
          {recentUserMasters.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => handleMasterClick(m.id)}
              className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-[#1A1A1A] hover:bg-[#F5F5F0] transition-colors text-left"
            >
              <Layout size={14} strokeWidth={1.5} className="text-[#A0A0A0] shrink-0" />
              <span className="flex-1 truncate">{m.name}</span>
              <span className="text-[10px] text-[#8A8A8A] font-mono uppercase">{m.category}</span>
            </button>
          ))}
        </>
      )}

      {/* Legacy saved components */}
      {legacySaved.length > 0 && (
        <>
          <div className="h-px bg-[#E5E5E0] my-1" />
          <div className="px-3 py-1">
            <span className="text-[11px] uppercase tracking-wide text-[#8A8A8A] font-mono">Saved</span>
          </div>
          {legacySaved.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => handleLegacyClick(s)}
              className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-[#1A1A1A] hover:bg-[#F5F5F0] transition-colors text-left"
            >
              <Layout size={14} strokeWidth={1.5} className="text-[#A0A0A0] shrink-0" />
              <span className="flex-1 truncate">{s.name}</span>
              {s.projectName && (
                <span className="text-[10px] text-[#8A8A8A] font-mono truncate max-w-[60px]">{s.projectName}</span>
              )}
            </button>
          ))}
        </>
      )}

      {/* Browse All */}
      <div className="h-px bg-[#E5E5E0] my-1" />
      <button
        type="button"
        onClick={() => { onBrowseAll(); onDismiss(); }}
        className="flex w-full items-center justify-center px-3 py-2 text-[13px] text-[#6B6B6B] hover:text-[#4B57DB] transition-colors"
      >
        Browse All...
      </button>
    </div>,
    document.body
  );
}
