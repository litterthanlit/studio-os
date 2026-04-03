"use client";

import * as React from "react";
import * as ReactDOM from "react-dom";
import {
  Layout, Columns2, Grid3x3, Quote, Award, Megaphone, PanelBottom,
} from "lucide-react";
import {
  getTemplateList,
  createTemplateById,
  loadSavedComponents,
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

type ComponentQuickPickerProps = {
  anchorRect: DOMRect;
  onInsert: (node: DesignNode) => void;
  onBrowseAll: () => void;
  onDismiss: () => void;
};

export function ComponentQuickPicker({
  anchorRect,
  onInsert,
  onBrowseAll,
  onDismiss,
}: ComponentQuickPickerProps) {
  const menuRef = React.useRef<HTMLDivElement>(null);
  const templates = getTemplateList();
  const saved = React.useMemo(() => loadSavedComponents().slice(-3).reverse(), []);

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

  function handleTemplateClick(templateId: string) {
    const component = createTemplateById(templateId);
    if (component) {
      onInsert(component.node);
    }
  }

  function handleSavedClick(component: DesignComponent) {
    onInsert(cloneDesignNode(component.node));
  }

  return ReactDOM.createPortal(
    <div
      ref={menuRef}
      className="fixed z-[9999] w-[220px] rounded-[4px] border border-[#E5E5E0] bg-white py-1 shadow-lg"
      style={{ left, top }}
    >
      {/* Templates */}
      <div className="px-3 py-1">
        <span className="text-[10px] uppercase tracking-wide text-[#8A8A8A] font-mono">Templates</span>
      </div>
      {templates.map((t) => {
        const Icon = TEMPLATE_ICONS[t.id] ?? Layout;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => handleTemplateClick(t.id)}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-[12px] text-[#1A1A1A] hover:bg-[#F5F5F0] transition-colors text-left"
          >
            <Icon size={14} strokeWidth={1.5} className="text-[#A0A0A0] shrink-0" />
            <span className="flex-1 truncate">{t.name}</span>
            <span className="text-[9px] text-[#A0A0A0] font-mono uppercase">{t.category}</span>
          </button>
        );
      })}

      {/* Recent saved */}
      {saved.length > 0 && (
        <>
          <div className="h-px bg-[#E5E5E0] my-1" />
          <div className="px-3 py-1">
            <span className="text-[10px] uppercase tracking-wide text-[#8A8A8A] font-mono">Saved</span>
          </div>
          {saved.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => handleSavedClick(s)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-[12px] text-[#1A1A1A] hover:bg-[#F5F5F0] transition-colors text-left"
            >
              <Layout size={14} strokeWidth={1.5} className="text-[#A0A0A0] shrink-0" />
              <span className="flex-1 truncate">{s.name}</span>
              {s.projectName && (
                <span className="text-[9px] text-[#A0A0A0] font-mono truncate max-w-[60px]">{s.projectName}</span>
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
        className="flex w-full items-center justify-center px-3 py-1.5 text-[12px] text-[#6B6B6B] hover:text-[#1E5DF2] transition-colors"
      >
        Browse All...
      </button>
    </div>,
    document.body
  );
}
