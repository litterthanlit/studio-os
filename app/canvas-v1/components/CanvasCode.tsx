"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useCanvas } from "@/lib/canvas/canvas-context";
import type { CodeItem } from "@/lib/canvas/unified-canvas-state";

type CanvasCodeProps = {
  item: CodeItem;
  isDragging?: boolean;
  onPointerDown?: (e: React.PointerEvent, itemId: string, x: number, y: number) => void;
};

export function CanvasCode({ item, isDragging, onPointerDown }: CanvasCodeProps) {
  const { state, dispatch } = useCanvas();
  const isSelected = state.selection.selectedItemIds.includes(item.id);
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(item.content);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (!editing) setDraft(item.content);
  }, [item.content, editing]);

  React.useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  const commit = React.useCallback(() => {
    setEditing(false);
    if (draft === item.content) return;
    dispatch({ type: "PUSH_HISTORY", description: "Edit code" });
    dispatch({
      type: "UPDATE_ITEM",
      itemId: item.id,
      changes: { content: draft } as Partial<CodeItem>,
    });
  }, [dispatch, draft, item.content, item.id]);

  return (
    <div
      data-canvas-item-id={item.id}
      data-code-item="true"
      className={cn(
        "absolute flex flex-col overflow-hidden rounded-[4px] border bg-white transition-[border-color,box-shadow] duration-150",
        isSelected
          ? "border-[#4B57DB] outline outline-1 outline-[#4B57DB]"
          : "border-[#EFEFEC] hover:outline hover:outline-1 hover:outline-[#4B57DB]/40",
        isDragging ? "shadow-md" : "shadow-sm",
      )}
      style={{
        left: item.x,
        top: item.y,
        width: item.width,
        height: item.height,
        zIndex: item.zIndex,
      }}
      onPointerDown={(e) => {
        if (editing) {
          e.stopPropagation();
          return;
        }
        onPointerDown?.(e, item.id, item.x, item.y);
      }}
      onClick={(e) => {
        e.stopPropagation();
        dispatch({
          type: "SELECT_ITEM",
          itemId: item.id,
          addToSelection: e.shiftKey,
        });
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setDraft(item.content);
        setEditing(true);
      }}
    >
      <div className="flex h-7 shrink-0 items-center justify-between border-b border-[#EFEFEC] bg-[#FAFAF8] px-2.5">
        <span className="truncate text-[12px] font-medium text-[#1A1A1A]">{item.name}</span>
        <span className="mono-kicker ml-2 shrink-0">{item.language}</span>
      </div>
      {editing ? (
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setDraft(item.content);
              setEditing(false);
            }
            e.stopPropagation();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          spellCheck={false}
          className="min-h-0 flex-1 resize-none bg-white px-2.5 py-2 font-mono text-[11px] leading-relaxed text-[#1A1A1A] outline-none"
        />
      ) : (
        <pre className="min-h-0 flex-1 overflow-hidden whitespace-pre-wrap break-words px-2.5 py-2 font-mono text-[11px] leading-relaxed text-[#1A1A1A]">
          {item.content || (
            <span className="text-[#A0A0A0]">Double-click to edit</span>
          )}
        </pre>
      )}
    </div>
  );
}
