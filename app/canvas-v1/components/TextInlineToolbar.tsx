"use client";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useCanvas } from "@/lib/canvas/canvas-context";
import type { DesignNode, DesignNodeStyle } from "@/lib/canvas/design-node";

type TextInlineToolbarProps = {
  node: DesignNode;
  artboardId: string;
  zoom: number;
  onDismiss: () => void;
  anchorEl: HTMLElement | null;
};

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 30, 36, 48, 72];

export function TextInlineToolbar({
  node,
  artboardId,
  zoom,
  onDismiss,
  anchorEl,
}: TextInlineToolbarProps) {
  const { dispatch } = useCanvas();
  const toolbarRef = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);

  const style = node.style ?? {};

  // Position centered above anchor, clamped to viewport, flips below if needed
  React.useLayoutEffect(() => {
    if (!anchorEl) return;

    function reposition() {
      const rect = anchorEl!.getBoundingClientRect();
      const toolbar = toolbarRef.current;
      const toolbarWidth = toolbar?.offsetWidth ?? 180;
      const toolbarHeight = toolbar?.offsetHeight ?? 32;

      let top = rect.top - toolbarHeight - 8;
      let left = rect.left + rect.width / 2 - toolbarWidth / 2;

      // Clamp left/right to viewport edges (8px margin)
      left = Math.max(8, Math.min(left, window.innerWidth - toolbarWidth - 8));

      // Flip below if not enough room above (min 8px margin)
      if (top < 8) {
        top = rect.bottom + 8;
      }

      setPos({ top, left });
    }

    reposition();
    // Reposition on next frame to get accurate toolbar dimensions
    requestAnimationFrame(reposition);
  }, [anchorEl, zoom]);

  // Re-position on scroll, resize, zoom changes
  React.useEffect(() => {
    if (!anchorEl) return;

    const handleScroll = () => {
      // Use RAF to batch with layout calculations
      requestAnimationFrame(() => {
        const rect = anchorEl.getBoundingClientRect();
        const toolbar = toolbarRef.current;
        const toolbarWidth = toolbar?.offsetWidth ?? 180;
        const toolbarHeight = toolbar?.offsetHeight ?? 32;

        let top = rect.top - toolbarHeight - 8;
        let left = rect.left + rect.width / 2 - toolbarWidth / 2;

        left = Math.max(8, Math.min(left, window.innerWidth - toolbarWidth - 8));
        if (top < 8) {
          top = rect.bottom + 8;
        }

        setPos({ top, left });
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true, capture: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll, { capture: true });
      window.removeEventListener("resize", handleScroll);
    };
  }, [anchorEl]);

  // Escape key dismisses toolbar
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onDismiss();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onDismiss]);

  // Click outside dismisses toolbar
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        toolbarRef.current &&
        !toolbarRef.current.contains(e.target as Node)
      ) {
        onDismiss();
      }
    };

    // Use capture phase to catch clicks before they bubble
    window.addEventListener("mousedown", handleClickOutside, { capture: true });
    return () => window.removeEventListener("mousedown", handleClickOutside, { capture: true });
  }, [onDismiss]);

  // Dismiss when entering edit mode (data-v6-text-editing attribute appears)
  React.useEffect(() => {
    if (!anchorEl) return;

    const checkEditMode = () => {
      const nodeId = anchorEl.getAttribute("data-node-id");
      if (!nodeId) return;
      const editingEl = document.querySelector<HTMLElement>(
        `[data-node-id="${nodeId}"][data-v6-text-editing="true"]`
      );
      if (editingEl) {
        onDismiss();
      }
    };

    // Check immediately
    checkEditMode();

    // Watch for attribute changes
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes" && mutation.attributeName === "data-v6-text-editing") {
          checkEditMode();
        }
      }
    });

    observer.observe(document.body, {
      attributes: true,
      subtree: true,
      attributeFilter: ["data-v6-text-editing"],
    });

    return () => observer.disconnect();
  }, [anchorEl, onDismiss]);

  function updateNodeStyle(patch: Partial<DesignNodeStyle>, description: string) {
    dispatch({ type: "PUSH_HISTORY", description });
    dispatch({
      type: "UPDATE_NODE_STYLE",
      artboardId,
      nodeId: node.id,
      style: patch as Record<string, unknown>,
    });
  }

  const isBold = (style.fontWeight ?? 400) >= 700;
  const isItalic = style.fontStyle === "italic";
  const currentFontSize = style.fontSize ?? 16;

  if (!pos) return null;

  return ReactDOM.createPortal(
    <motion.div
      ref={toolbarRef}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.15 }}
      style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 50 }}
      className="bg-white border border-[#E5E5E0] rounded-[4px] shadow-sm flex items-center h-8"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Bold toggle */}
      <div className="flex items-center px-1 border-r border-[#E5E5E0]">
        <button
          className={cn(
            "w-7 h-7 flex items-center justify-center rounded-[2px] text-[13px] font-semibold transition-colors",
            isBold
              ? "bg-[#D1E4FC]/40 text-[#4B57DB]"
              : "text-[#6B6B6B] hover:bg-[#F5F5F0] hover:text-[#1A1A1A]"
          )}
          style={{ fontWeight: 700 }}
          onClick={() =>
            updateNodeStyle({ fontWeight: isBold ? 400 : 700 }, "Toggled bold")
          }
          title="Bold"
        >
          B
        </button>
      </div>

      {/* Italic toggle */}
      <div className="flex items-center px-1 border-r border-[#E5E5E0]">
        <button
          className={cn(
            "w-7 h-7 flex items-center justify-center rounded-[2px] text-[13px] font-semibold transition-colors",
            isItalic
              ? "bg-[#D1E4FC]/40 text-[#4B57DB]"
              : "text-[#6B6B6B] hover:bg-[#F5F5F0] hover:text-[#1A1A1A]"
          )}
          style={{ fontStyle: "italic" }}
          onClick={() =>
            updateNodeStyle(
              { fontStyle: isItalic ? "normal" : "italic" },
              "Toggled italic"
            )
          }
          title="Italic"
        >
          I
        </button>
      </div>

      {/* Font size dropdown */}
      <div className="px-1">
        <select
          value={currentFontSize}
          onChange={(e) =>
            updateNodeStyle(
              { fontSize: parseInt(e.target.value, 10) },
              "Changed font size"
            )
          }
          className="h-7 px-2 text-[11px] text-[#6B6B6B] bg-transparent border-none outline-none cursor-pointer hover:text-[#1A1A1A] min-w-[50px]"
        >
          {FONT_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>
    </motion.div>,
    document.body
  );
}
