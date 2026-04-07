"use client";

import * as React from "react";

export type MeasurementLabelProps = {
  value: number;
  x: number; // screen coordinates (clientX)
  y: number; // screen coordinates (clientY)
  visible: boolean;
  label?: string; // optional prefix like "Gap" or "Padding"
};

export function MeasurementLabel({ value, x, y, visible, label }: MeasurementLabelProps) {
  if (!visible) return null;
  
  const displayValue = Math.round(value);
  const text = label ? `${label}: ${displayValue}px` : `${displayValue}px`;
  
  // Offset from pointer based on available space
  // Add 12px offset so label doesn't obscure the cursor/handle
  const offsetX = 12;
  const offsetY = -28; // above the cursor
  
  return (
    <div
      style={{
        position: "fixed", // Use fixed to stay at screen coordinates
        left: x + offsetX,
        top: y + offsetY,
        background: "#1A1A1A",
        color: "white",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
        fontSize: 11,
        padding: "2px 8px",
        borderRadius: 4,
        pointerEvents: "none",
        zIndex: 10000,
        whiteSpace: "nowrap",
        opacity: visible ? 1 : 0,
        transition: "opacity 150ms ease-out",
      }}
    >
      {text}
    </div>
  );
}
