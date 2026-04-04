"use client";

import * as React from "react";
import { useEffect, useState } from "react";

type SizingModeToastProps = {
  /** Which axes were converted: "width", "height", or "both" */
  axes: "width" | "height" | "both" | null;
  /** Called when the toast has finished displaying */
  onDismiss: () => void;
};

export function SizingModeToast({ axes, onDismiss }: SizingModeToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!axes) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 200); // Wait for fade-out
    }, 3000);
    return () => clearTimeout(timer);
  }, [axes, onDismiss]);

  if (!axes) return null;

  const label =
    axes === "both" ? "Size" : axes === "width" ? "Width" : "Height";

  return (
    <div
      style={{
        position: "fixed",
        bottom: 48,
        left: "50%",
        transform: "translateX(-50%)",
        backgroundColor: "#1A1A1A",
        color: "#FFFFFF",
        fontSize: 12,
        borderRadius: 4,
        padding: "6px 12px",
        zIndex: 9999,
        pointerEvents: "none",
        opacity: visible ? 1 : 0,
        transition: "opacity 200ms ease",
        whiteSpace: "nowrap",
      }}
    >
      {label} converted to Fixed · ⌘Z to undo
    </div>
  );
}
