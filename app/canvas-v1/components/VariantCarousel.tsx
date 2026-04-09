"use client";

import React from "react";
import { useCanvas } from "@/lib/canvas/canvas-context";

type VariantCarouselProps = {
  itemId: string;
};

export function VariantCarousel({ itemId }: VariantCarouselProps) {
  const { state, dispatch } = useCanvas();
  const { variantPreview } = state;

  if (!variantPreview || variantPreview.itemId !== itemId) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: -40,
        left: 0,
        display: "flex",
        alignItems: "center",
        gap: 4,
        zIndex: 10,
      }}
    >
      {variantPreview.variants.map((variant, i) => {
        const isActive = i === variantPreview.activeIndex;
        return (
          <button
            key={i}
            onClick={() => {
              dispatch({ type: "SET_ACTIVE_VARIANT", index: i });
            }}
            title={variant.changesSummary}
            style={{
              padding: "4px 12px",
              fontSize: 11,
              fontFamily: "var(--font-geist-mono), 'IBM Plex Mono', monospace",
              borderRadius: 4,
              border: "1px solid",
              borderColor: isActive ? "#4B57DB" : "rgba(255,255,255,0.15)",
              background: isActive ? "#4B57DB" : "rgba(26,26,26,0.8)",
              color: isActive ? "#FFFFFF" : "#A0A0A0",
              cursor: "pointer",
              transition: "all 0.15s",
              letterSpacing: "0.04em",
              textTransform: "uppercase" as const,
            }}
          >
            {variant.label}
          </button>
        );
      })}

      {/* Separator */}
      <div
        style={{
          width: 1,
          height: 16,
          background: "rgba(255,255,255,0.15)",
          marginLeft: 4,
          marginRight: 4,
        }}
      />

      {/* Use This button */}
      <button
        onClick={() => {
          dispatch({ type: "PUSH_HISTORY", description: "Pick variant" });
          dispatch({ type: "PICK_VARIANT", variantIndex: variantPreview.activeIndex });
        }}
        style={{
          padding: "4px 12px",
          fontSize: 11,
          fontFamily: "var(--font-geist-mono), 'IBM Plex Mono', monospace",
          borderRadius: 4,
          background: "#4B57DB",
          color: "#FFFFFF",
          border: "1px solid #3D49C7",
          cursor: "pointer",
          letterSpacing: "0.04em",
          textTransform: "uppercase" as const,
          fontWeight: 600,
        }}
      >
        Use This
      </button>

      {/* Dismiss (keep base, clear carousel) */}
      <button
        onClick={() => {
          dispatch({ type: "PICK_VARIANT", variantIndex: 0 });
        }}
        title="Keep base and dismiss"
        style={{
          padding: "4px 8px",
          fontSize: 11,
          fontFamily: "var(--font-geist-mono), 'IBM Plex Mono', monospace",
          borderRadius: 4,
          background: "transparent",
          color: "#666666",
          border: "1px solid rgba(255,255,255,0.08)",
          cursor: "pointer",
          marginLeft: 2,
        }}
      >
        ✕
      </button>
    </div>
  );
}
