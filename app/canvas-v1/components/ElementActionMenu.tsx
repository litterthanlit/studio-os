"use client";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { motion } from "framer-motion";
import { Sparkles, ImageUp, Plus, ChevronUp, ChevronDown, Copy, Trash2 } from "lucide-react";
import type { PageNode } from "@/lib/canvas/compose";

type ElementActionMenuProps = {
  node: PageNode;
  anchorRef: React.RefObject<HTMLDivElement | null>;
  onEditWithAI: () => void;
  onReplaceImage: () => void;
  onAddSectionBelow: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onDismiss: () => void;
  isFirstSection?: boolean;
  isLastSection?: boolean;
};

export function ElementActionMenu({
  node,
  anchorRef,
  onEditWithAI,
  onReplaceImage,
  onAddSectionBelow,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  onDismiss,
  isFirstSection,
  isLastSection,
}: ElementActionMenuProps) {
  const menuRef = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);

  const isSectionNode = node.type === "section";
  const isMediaNode = Boolean(node.content?.mediaUrl);

  // Position the menu below-right of anchor, clamped to viewport
  React.useLayoutEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    let top = rect.bottom + 8;
    let left = rect.left;

    // Defer clamping to next frame so menuRef has dimensions
    requestAnimationFrame(() => {
      const menu = menuRef.current;
      if (!menu) return;
      const menuRect = menu.getBoundingClientRect();
      if (left + menuRect.width > window.innerWidth - 8) {
        left = window.innerWidth - menuRect.width - 8;
      }
      if (top + menuRect.height > window.innerHeight - 8) {
        top = rect.top - menuRect.height - 8;
      }
      setPos({ top, left });
    });

    setPos({ top, left });
  }, [anchorRef]);

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

  // Dismiss on Escape
  React.useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onDismiss();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onDismiss]);

  if (!pos) return null;

  const rowClass =
    "px-3 py-2 text-[12px] text-[#1A1A1A] hover:bg-[#F5F5F0] cursor-pointer flex items-center gap-2 w-full text-left";
  const iconProps = { size: 14, className: "text-[#A0A0A0]", strokeWidth: 1.5 };

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
      className="bg-white border border-[#E5E5E0] rounded-[4px] shadow-md min-w-[160px] max-w-[200px] py-1"
    >
      {isMediaNode && (
        <button className={rowClass} onClick={onReplaceImage}>
          <ImageUp {...iconProps} /> Replace Image
        </button>
      )}

      <button className={rowClass} onClick={onEditWithAI}>
        <Sparkles {...iconProps} /> Edit With AI
      </button>

      {isSectionNode && (
        <>
          <div className="my-1 border-t border-[#E5E5E0]" />
          <button className={rowClass} onClick={onAddSectionBelow}>
            <Plus {...iconProps} /> Add Section Below
          </button>
          {!isFirstSection && (
            <button className={rowClass} onClick={onMoveUp}>
              <ChevronUp {...iconProps} /> Move Up
            </button>
          )}
          {!isLastSection && (
            <button className={rowClass} onClick={onMoveDown}>
              <ChevronDown {...iconProps} /> Move Down
            </button>
          )}
          <button className={rowClass} onClick={onDuplicate}>
            <Copy {...iconProps} /> Duplicate
          </button>
          <button
            className="px-3 py-2 text-[12px] text-red-500 hover:text-red-600 hover:bg-[#F5F5F0] cursor-pointer flex items-center gap-2 w-full text-left"
            onClick={onDelete}
          >
            <Trash2 size={14} strokeWidth={1.5} className="text-red-400" /> Delete
          </button>
        </>
      )}
    </motion.div>,
    document.body
  );
}
