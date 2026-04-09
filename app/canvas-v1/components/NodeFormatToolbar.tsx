"use client";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvas } from "@/lib/canvas/canvas-context";
import { ColorPickerPopover } from "./ColorPickerPopover";
import { getFontsByCategory } from "@/lib/canvas/font-library";
import type { PageNode, PageNodeStyle } from "@/lib/canvas/compose";
import type { ReferenceItem } from "@/lib/canvas/unified-canvas-state";

type NodeFormatToolbarProps = {
  node: PageNode;
  anchorRef: React.RefObject<HTMLDivElement | null>;
  onAIClick: () => void;
};

export function NodeFormatToolbar({ node, anchorRef, onAIClick }: NodeFormatToolbarProps) {
  const { state, dispatch } = useCanvas();
  const itemId = state.selection.activeItemId;
  const toolbarRef = React.useRef<HTMLDivElement>(null);
  const [colorEl, setColorEl] = React.useState<HTMLButtonElement | null>(null);
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);
  const [showColorPicker, setShowColorPicker] = React.useState(false);

  const style = node.style ?? {};
  const documentColors = React.useMemo(
    () =>
      state.items
        .filter((item): item is ReferenceItem => item.kind === "reference")
        .flatMap((item) => item.extracted?.colors ?? []),
    [state.items]
  );

  // Position centered above anchor, clamped to viewport
  React.useLayoutEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    function reposition() {
      const rect = anchor!.getBoundingClientRect();
      const toolbar = toolbarRef.current;
      const toolbarWidth = toolbar?.offsetWidth ?? 260;
      const toolbarHeight = toolbar?.offsetHeight ?? 32;

      let top = rect.top - toolbarHeight - 8;
      let left = rect.left + rect.width / 2 - toolbarWidth / 2;

      // Clamp left
      left = Math.max(8, Math.min(left, window.innerWidth - toolbarWidth - 8));
      // Flip below if not enough room above
      if (top < 8) top = rect.bottom + 8;

      setPos({ top, left });
    }

    reposition();
    // Reposition on next frame to get accurate toolbar dimensions
    requestAnimationFrame(reposition);
  }, [anchorRef]);

  function updateNodeStyle(patch: Record<string, unknown>, description: string) {
    if (!itemId) return;
    dispatch({ type: "PUSH_HISTORY", description });
    dispatch({
      type: "UPDATE_TEXT_STYLE_SITE",
      itemId,
      nodeId: node.id,
      style: patch as Partial<PageNodeStyle>,
    });
  }

  const isBold = (style.fontWeight ?? 400) >= 700;
  const isItalic = style.fontStyle === "italic";
  const isUnderline = style.textDecoration === "underline";

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
      {/* B / I / U toggles */}
      <div className="flex items-center px-1 border-r border-[#E5E5E0]">
        <button
          className={cn(
            "w-7 h-7 flex items-center justify-center rounded-[2px] text-[13px] font-semibold transition-colors",
            isBold
              ? "bg-[#D1E4FC]/40 text-[#4B57DB]"
              : "text-[#6B6B6B] hover:bg-[#F5F5F0] hover:text-[#1A1A1A]"
          )}
          style={{ fontWeight: 700 }}
          onClick={() => updateNodeStyle({ fontWeight: isBold ? 400 : 700 }, "Toggled bold")}
        >
          B
        </button>
        <button
          className={cn(
            "w-7 h-7 flex items-center justify-center rounded-[2px] text-[13px] font-semibold transition-colors",
            isItalic
              ? "bg-[#D1E4FC]/40 text-[#4B57DB]"
              : "text-[#6B6B6B] hover:bg-[#F5F5F0] hover:text-[#1A1A1A]"
          )}
          style={{ fontStyle: "italic" }}
          onClick={() => updateNodeStyle({ fontStyle: isItalic ? "normal" : "italic" }, "Toggled italic")}
        >
          I
        </button>
        <button
          className={cn(
            "w-7 h-7 flex items-center justify-center rounded-[2px] text-[13px] font-semibold transition-colors",
            isUnderline
              ? "bg-[#D1E4FC]/40 text-[#4B57DB]"
              : "text-[#6B6B6B] hover:bg-[#F5F5F0] hover:text-[#1A1A1A]"
          )}
          style={{ textDecoration: "underline" }}
          onClick={() => updateNodeStyle({ textDecoration: isUnderline ? "none" : "underline" }, "Toggled underline")}
        >
          U
        </button>
      </div>

      {/* Font dropdown */}
      <div className="px-1 border-r border-[#E5E5E0]">
        <select
          value={style.fontFamily || "'Inter', sans-serif"}
          onChange={(e) => updateNodeStyle({ fontFamily: e.target.value }, "Changed font")}
          className="h-7 px-2 text-[11px] text-[#6B6B6B] bg-transparent border-none outline-none cursor-pointer hover:text-[#1A1A1A] max-w-[110px] truncate"
        >
          <option value="">Default</option>
          {getFontsByCategory().map(({ category, label, fonts }) => (
            <optgroup key={category} label={label}>
              {fonts.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.family}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Color swatch */}
      <div className="px-1 border-r border-[#E5E5E0] flex items-center justify-center">
        <button
          ref={setColorEl}
          className="w-4 h-4 rounded-[2px] border border-[#E5E5E0]"
          style={{ background: style.foreground || "#1A1A1A" }}
          onClick={() => setShowColorPicker(!showColorPicker)}
        />
        <ColorPickerPopover
          open={showColorPicker}
          value={style.foreground || "#1A1A1A"}
          anchorEl={colorEl}
          documentColors={documentColors}
          onSelect={(c) => {
            updateNodeStyle({ foreground: c }, "Changed text color");
          }}
          onClose={() => setShowColorPicker(false)}
        />
      </div>

      {/* AI button */}
      <div className="px-1">
        <button
          className="w-7 h-7 flex items-center justify-center rounded-[2px] text-[#A0A0A0] hover:text-[#4B57DB] hover:bg-[#F5F5F0] transition-colors"
          onClick={onAIClick}
        >
          <Sparkles size={14} strokeWidth={1.5} />
        </button>
      </div>
    </motion.div>,
    document.body
  );
}
