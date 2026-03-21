"use client";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { motion } from "framer-motion";
import {
  Sparkles,
  Copy,
  ChevronUp,
  ChevronDown,
  Clipboard,
  ClipboardPaste,
  Trash2,
  Type,
  ImageUp,
} from "lucide-react";
import type { PageNode } from "@/lib/canvas/compose";

type ContextMenuProps = {
  node: PageNode;
  position: { x: number; y: number };
  onEditText?: () => void;
  onEditWithAI: () => void;
  onReplaceImage?: () => void;
  onDuplicate: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onCopyStyle: () => void;
  onPasteStyle: () => void;
  onDelete: () => void;
  onDismiss: () => void;
  isFirstSection?: boolean;
  isLastSection?: boolean;
};

function isTextNode(node: PageNode) {
  return node.type === "heading" || node.type === "paragraph" || node.type === "button";
}

function isMediaNode(node: PageNode) {
  return Boolean(node.content?.mediaUrl);
}

export function ContextMenu({
  node,
  position,
  onEditText,
  onEditWithAI,
  onReplaceImage,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onCopyStyle,
  onPasteStyle,
  onDelete,
  onDismiss,
  isFirstSection,
  isLastSection,
}: ContextMenuProps) {
  const menuRef = React.useRef<HTMLDivElement>(null);
  const [clampedPosition, setClampedPosition] = React.useState(position);
  const textNode = isTextNode(node);
  const mediaNode = isMediaNode(node);

  React.useLayoutEffect(() => {
    setClampedPosition(position);

    const frame = requestAnimationFrame(() => {
      const menu = menuRef.current;
      if (!menu) return;

      const rect = menu.getBoundingClientRect();
      const left = Math.min(
        Math.max(position.x, 8),
        Math.max(8, window.innerWidth - rect.width - 8)
      );
      const top = Math.min(
        Math.max(position.y, 8),
        Math.max(8, window.innerHeight - rect.height - 8)
      );

      setClampedPosition({ x: left, y: top });
    });

    return () => cancelAnimationFrame(frame);
  }, [position]);

  React.useEffect(() => {
    function handleMouseDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onDismiss();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onDismiss();
      }
    }

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onDismiss]);

  const rowClass =
    "px-3 py-2 text-[12px] text-[#1A1A1A] hover:bg-[#F5F5F0] cursor-pointer flex items-center gap-2 w-full text-left transition-colors";
  const shortcutClass = "ml-auto text-[11px] text-[#A0A0A0]";
  const iconProps = { size: 14, className: "text-[#A0A0A0]", strokeWidth: 1.5 };

  const runAction = (action: () => void) => () => {
    action();
    onDismiss();
  };

  return ReactDOM.createPortal(
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.95, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -4 }}
      transition={{ duration: 0.1 }}
      style={{
        position: "fixed",
        left: clampedPosition.x,
        top: clampedPosition.y,
        zIndex: 50,
      }}
      className="min-w-[180px] max-w-[240px] rounded-[4px] border border-[#E5E5E0] bg-white shadow-md py-1"
    >
      {textNode ? (
        <button type="button" className={rowClass} onClick={runAction(onEditText ?? (() => {}))}>
          <Type {...iconProps} />
          Edit Text
          <span className={shortcutClass}>Enter</span>
        </button>
      ) : mediaNode ? (
        <button type="button" className={rowClass} onClick={runAction(onReplaceImage ?? (() => {}))}>
          <ImageUp {...iconProps} />
          Replace Image
        </button>
      ) : null}

      <button type="button" className={rowClass} onClick={runAction(onEditWithAI)}>
        <Sparkles {...iconProps} />
        Edit With AI
      </button>

      <div className="my-1 border-t border-[#E5E5E0]" />

      <button type="button" className={rowClass} onClick={runAction(onDuplicate)}>
        <Copy {...iconProps} />
        Duplicate
        <span className={shortcutClass}>⌘D</span>
      </button>

      {!textNode && !mediaNode ? (
        <>
          {!isFirstSection && onMoveUp ? (
            <button type="button" className={rowClass} onClick={runAction(onMoveUp)}>
              <ChevronUp {...iconProps} />
              Move Up
              <span className={shortcutClass}>⌘[</span>
            </button>
          ) : null}
          {!isLastSection && onMoveDown ? (
            <button type="button" className={rowClass} onClick={runAction(onMoveDown)}>
              <ChevronDown {...iconProps} />
              Move Down
              <span className={shortcutClass}>⌘]</span>
            </button>
          ) : null}
          <div className="my-1 border-t border-[#E5E5E0]" />
        </>
      ) : null}

      <button type="button" className={rowClass} onClick={runAction(onCopyStyle)}>
        <Clipboard {...iconProps} />
        Copy Style
        <span className={shortcutClass}>⌥⌘C</span>
      </button>

      <button type="button" className={rowClass} onClick={runAction(onPasteStyle)}>
        <ClipboardPaste {...iconProps} />
        Paste Style
        <span className={shortcutClass}>⌥⌘V</span>
      </button>

      <div className="my-1 border-t border-[#E5E5E0]" />

      <button
        type="button"
        className="px-3 py-2 text-[12px] text-red-500 hover:bg-[#F5F5F0] hover:text-red-600 cursor-pointer flex items-center gap-2 w-full text-left transition-colors"
        onClick={runAction(onDelete)}
      >
        <Trash2 size={14} strokeWidth={1.5} className="text-red-400" />
        Delete
        <span className="ml-auto text-[11px] text-[#A0A0A0]">⌫</span>
      </button>
    </motion.div>,
    document.body
  );
}
