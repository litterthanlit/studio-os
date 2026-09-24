"use client";

// Reference X-ray keyboard (master plan 1.8): X toggles the X-ray, 1–7 toggle
// role chips on the single selected reference, Esc exits the X-ray. Ignored
// while typing and with modifier keys (Cmd+X / Cmd+1 keep their meaning).

import * as React from "react";
import { useCanvas } from "@/lib/canvas/canvas-context";
import { roleForKey, toggleReferenceRole } from "@/lib/intent/reference-actions";

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable;
}

export function useReferenceXray(): [boolean, (on: boolean) => void] {
  const { state, dispatch } = useCanvas();
  const [xray, setXray] = React.useState(false);
  const stateRef = React.useRef(state);
  React.useEffect(() => {
    stateRef.current = state;
  }, [state]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      if (e.key === "x" || e.key === "X") {
        e.preventDefault();
        setXray((on) => !on);
        return;
      }
      if (e.key === "Escape") {
        setXray(false);
        return;
      }
      const role = roleForKey(e.key);
      if (!role) return;
      const current = stateRef.current;
      if (current.selection.activeItemId || current.selection.selectedItemIds.length !== 1) return;
      const item = current.items.find((i) => i.id === current.selection.selectedItemIds[0]);
      if (item?.kind !== "reference") return;
      e.preventDefault();
      dispatch({ type: "UPDATE_ITEM", itemId: item.id, changes: { roles: toggleReferenceRole(item.roles, role) } });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch]);

  return [xray, setXray];
}
