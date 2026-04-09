"use client";

import * as React from "react";
import * as ReactDOM from "react-dom";
import {
  Copy, Trash2, ChevronUp, ChevronDown, Eye, EyeOff, Type, Bookmark,
  Group, Ungroup, ArrowUp, ArrowRight, ArrowLeft, Home, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DesignNode, Breakpoint } from "@/lib/canvas/design-node";
import { getParent, cycleSiblingSelection } from "@/lib/canvas/nested-selection";

type DesignNodeContextMenuProps = {
  node: DesignNode;
  rootNode: DesignNode;
  selectedNodeId: string | null;
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
  onSaveToLibrary?: (name: string) => void;
  onGroup?: () => void;
  onUngroup?: () => void;
  isGroupNode?: boolean;
  multiSelectCount?: number;
  onSelectNode?: (nodeId: string) => void;
  onRegenerateSimilar?: () => void;
  onRegenerateDifferent?: () => void;
  onDismiss: () => void;
};

function MenuItem({
  icon,
  label,
  shortcut,
  onClick,
  danger,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
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
      <span className="flex-1">{label}</span>
      {shortcut && <span className="ml-auto text-[10px] text-[#A0A0A0]">{shortcut}</span>}
    </button>
  );
}

function Divider() {
  return <div className="h-px bg-[#E5E5E0] my-1" />;
}

export function DesignNodeContextMenu({
  node,
  rootNode,
  selectedNodeId,
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
  onSaveToLibrary,
  onGroup,
  onUngroup,
  isGroupNode,
  multiSelectCount,
  onSelectNode,
  onRegenerateSimilar,
  onRegenerateDifferent,
  onDismiss,
}: DesignNodeContextMenuProps) {
  const menuRef = React.useRef<HTMLDivElement>(null);
  const [saveMode, setSaveMode] = React.useState(false);
  const [saveName, setSaveName] = React.useState(node.name);

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

  // Compute selection navigation state
  const parent = selectedNodeId ? getParent({ id: selectedNodeId } as DesignNode, rootNode) : null;
  const hasSiblings = parent ? (parent.children && parent.children.length > 1) : false;

  // Check if the node is a direct child of the root (section-level)
  const isRootChild = rootNode?.children?.some((c) => c.id === node.id) ?? false;

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

      {/* Select Navigation */}
      <MenuItem
        icon={<ArrowUp {...iconProps} />}
        label="Select Parent"
        shortcut="⌘↑"
        onClick={() => { 
          if (parent && onSelectNode) {
            onSelectNode(parent.id);
            onDismiss();
          }
        }}
        disabled={!parent || !onSelectNode}
      />
      <MenuItem
        icon={<ArrowRight {...iconProps} />}
        label="Select Next Sibling"
        shortcut="⌘]"
        onClick={() => { 
          if (parent && selectedNodeId && onSelectNode) {
            const nextId = cycleSiblingSelection(selectedNodeId, parent, 'next');
            if (nextId) {
              onSelectNode(nextId);
            }
            onDismiss();
          }
        }}
        disabled={!hasSiblings || !onSelectNode}
      />
      <MenuItem
        icon={<ArrowLeft {...iconProps} />}
        label="Select Previous Sibling"
        shortcut="⌘["
        onClick={() => { 
          if (parent && selectedNodeId && onSelectNode) {
            const prevId = cycleSiblingSelection(selectedNodeId, parent, 'previous');
            if (prevId) {
              onSelectNode(prevId);
            }
            onDismiss();
          }
        }}
        disabled={!hasSiblings || !onSelectNode}
      />
      <MenuItem
        icon={<Home {...iconProps} />}
        label="Select Root"
        shortcut="⇧Esc"
        onClick={() => { 
          if (onSelectNode) {
            onSelectNode(rootNode.id);
            onDismiss();
          }
        }}
        disabled={!onSelectNode}
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

      {/* Regenerate (root-level frame sections only) */}
      {isRootChild && node.type === "frame" && onRegenerateSimilar && (
        <>
          <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "4px 0" }} />
          <MenuItem
            icon={<RefreshCw {...iconProps} />}
            label="Regenerate — similar"
            onClick={() => { onRegenerateSimilar(); onDismiss(); }}
          />
          {onRegenerateDifferent && (
            <MenuItem
              icon={<RefreshCw {...iconProps} />}
              label="Regenerate — different"
              onClick={() => { onRegenerateDifferent(); onDismiss(); }}
            />
          )}
        </>
      )}

      {/* Save to Library (non-root frames only) */}
      {onSaveToLibrary && (
        <>
          {saveMode ? (
            <div className="px-3 py-1.5 flex items-center gap-1.5">
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && saveName.trim()) {
                    onSaveToLibrary(saveName.trim());
                  }
                }}
                className="flex-1 border border-[#E5E5E0] rounded-[2px] bg-[#FAFAF8] px-2 py-1 text-[12px] outline-none focus:border-[#D1E4FC]"
                autoFocus
                placeholder="Component name"
              />
              <button
                type="button"
                onClick={() => {
                  if (saveName.trim()) {
                    onSaveToLibrary(saveName.trim());
                  }
                }}
                className="text-[12px] text-[#4B57DB] font-medium shrink-0 px-1"
              >
                Save
              </button>
            </div>
          ) : (
            <MenuItem
              icon={<Bookmark {...iconProps} />}
              label="Save to Library"
              onClick={() => setSaveMode(true)}
            />
          )}
        </>
      )}

      {/* Group / Ungroup */}
      {(onGroup && (multiSelectCount ?? 0) >= 2) || (onUngroup && isGroupNode) ? (
        <>
          <Divider />
          {onGroup && (multiSelectCount ?? 0) >= 2 && (
            <MenuItem
              icon={<Group {...iconProps} />}
              label={`Group ${multiSelectCount} nodes`}
              shortcut="\u2318G"
              onClick={() => { onGroup(); onDismiss(); }}
            />
          )}
          {onUngroup && isGroupNode && (
            <MenuItem
              icon={<Ungroup {...iconProps} />}
              label="Ungroup"
              shortcut="\u2318\u21E7G"
              onClick={() => { onUngroup(); onDismiss(); }}
            />
          )}
        </>
      ) : null}

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
