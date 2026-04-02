"use client";

import * as React from "react";
import * as ReactDOM from "react-dom";
import {
  Copy, Trash2, ChevronUp, ChevronDown, Eye, EyeOff, Type,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DesignNode, Breakpoint } from "@/lib/canvas/design-node";

type DesignNodeContextMenuProps = {
  node: DesignNode;
  position: { x: number; y: number };
  breakpoint: Breakpoint;
  isFirst: boolean;
  isLast: boolean;
  isHidden: boolean;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleVisibility: () => void;
  onEditText?: () => void;
  onDismiss: () => void;
};

function MenuItem({
  icon,
  label,
  onClick,
  danger,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onClick();
      }}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-2.5 px-3 py-1.5 text-[12px] text-left transition-colors",
        disabled
          ? "text-[#A0A0A0] cursor-default"
          : danger
            ? "text-red-500 hover:bg-red-50"
            : "text-[#1A1A1A] hover:bg-[#F5F5F0]"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function Divider() {
  return <div className="h-px bg-[#E5E5E0] my-1" />;
}

export function DesignNodeContextMenu({
  node,
  position,
  breakpoint,
  isFirst,
  isLast,
  isHidden,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onToggleVisibility,
  onEditText,
  onDismiss,
}: DesignNodeContextMenuProps) {
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Viewport clamping
  React.useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pad = 8;
    let x = position.x;
    let y = position.y;
    if (rect.right > window.innerWidth - pad) x = window.innerWidth - rect.width - pad;
    if (rect.bottom > window.innerHeight - pad) y = window.innerHeight - rect.height - pad;
    if (x < pad) x = pad;
    if (y < pad) y = pad;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  }, [position]);

  // Close on Escape or outside click
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onDismiss();
    }
    function handleMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onDismiss();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousedown", handleMouseDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", handleMouseDown, true);
    };
  }, [onDismiss]);

  const iconProps = { size: 14, strokeWidth: 1.5 } as const;

  return ReactDOM.createPortal(
    <div
      ref={menuRef}
      className="fixed z-[9999] min-w-[180px] rounded-[4px] border border-[#E5E5E0] bg-white py-1 shadow-lg"
      style={{ left: position.x, top: position.y }}
    >
      {/* Type label */}
      <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-[#A0A0A0]">
        {node.type} · {node.name}
      </div>
      <Divider />

      {/* Edit text (text nodes only) */}
      {node.type === "text" && onEditText && (
        <>
          <MenuItem
            icon={<Type {...iconProps} />}
            label="Edit Text"
            onClick={() => { onEditText(); onDismiss(); }}
          />
          <Divider />
        </>
      )}

      {/* Reorder */}
      <MenuItem
        icon={<ChevronUp {...iconProps} />}
        label="Move Up"
        onClick={() => { onMoveUp(); onDismiss(); }}
        disabled={isFirst}
      />
      <MenuItem
        icon={<ChevronDown {...iconProps} />}
        label="Move Down"
        onClick={() => { onMoveDown(); onDismiss(); }}
        disabled={isLast}
      />

      <Divider />

      {/* Visibility */}
      <MenuItem
        icon={isHidden ? <Eye {...iconProps} /> : <EyeOff {...iconProps} />}
        label={isHidden ? `Show on ${breakpoint}` : `Hide on ${breakpoint}`}
        onClick={() => { onToggleVisibility(); onDismiss(); }}
      />

      {/* Duplicate */}
      <MenuItem
        icon={<Copy {...iconProps} />}
        label="Duplicate"
        onClick={() => { onDuplicate(); onDismiss(); }}
      />

      <Divider />

      {/* Delete */}
      <MenuItem
        icon={<Trash2 {...iconProps} />}
        label="Delete"
        onClick={() => { onDelete(); onDismiss(); }}
        danger
      />
    </div>,
    document.body
  );
}
