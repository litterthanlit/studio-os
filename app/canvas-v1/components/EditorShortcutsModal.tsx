"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const ROWS: { keys: string; action: string }[] = [
  { keys: "V / H / M / F / K", action: "Select / Hand / Marquee / Frame / Prompt tools" },
  { keys: "Space + drag", action: "Pan canvas" },
  { keys: "⌘ 0 / ⌘ 1", action: "Zoom to fit / selection" },
  { keys: "⇧ + Click", action: "Add to selection (multi-select)" },
  { keys: "Marquee (M)", action: "Drag to box-select; ⇧ adds to selection" },
  { keys: "Frame (F)", action: "Drag on empty canvas to draw a new frame" },
  { keys: "⌥ drag", action: "Drag selected layer onto another frame to reparent (canvas)" },
  { keys: "⌘C / ⌘V", action: "Copy / paste DesignNode layers (V6); paste syncs across artboards in site" },
  { keys: "⌘ + Click", action: "Cycle nested selection depth" },
  { keys: "⌘ ⇧ + Click", action: "Cycle siblings at depth" },
  { keys: "⌘ [ / ]", action: "Previous / next sibling" },
  { keys: "⌘ ↑ / ↓", action: "Parent / child in hierarchy" },
  { keys: "⇧ Esc", action: "Jump to root selection" },
  { keys: "⌘ G / ⌘ ⇧ G", action: "Group / Ungroup" },
  { keys: "⌘ A", action: "Select all (canvas) / all text in edit mode" },
  { keys: "L / I", action: "Toggle Layers / Inspector" },
  { keys: "Layers tree", action: "Drag a row to reparent (top / middle / bottom zones)" },
  { keys: "Selection", action: "Resize handles; flex frames show gap & padding handles" },
  { keys: "Inspector", action: "Design · CSS · Export — Copy HTML on Export tab" },
  { keys: "⌘ Z / ⌘ ⇧ Z", action: "Undo / Redo" },
];

type EditorShortcutsModalProps = {
  open: boolean;
  onClose: () => void;
};

export function EditorShortcutsModal({ open, onClose }: EditorShortcutsModalProps) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="editor-shortcuts-title"
      onClick={onClose}
    >
      <div
        className={cn(
          "max-h-[85vh] w-full max-w-md overflow-hidden rounded-[6px] border border-[var(--border-subtle)] bg-[var(--card-bg)] shadow-lg"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
          <h2 id="editor-shortcuts-title" className="text-[14px] font-semibold text-[var(--text-primary)]">
            Keyboard shortcuts
          </h2>
          <button
            type="button"
            className="rounded-[4px] p-1 text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-4">
          <p className="mb-3 text-[11px] text-[var(--text-muted)]">
            Shortcuts use ⌘ on Mac; use Ctrl on Windows/Linux where noted.
          </p>
          <table className="w-full text-left text-[12px]">
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.keys} className="border-b border-[var(--border-subtle)] last:border-0">
                  <td className="py-2 pr-3 font-mono text-[11px] text-[var(--accent)] whitespace-nowrap">
                    {row.keys}
                  </td>
                  <td className="py-2 text-[var(--text-secondary)]">{row.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
