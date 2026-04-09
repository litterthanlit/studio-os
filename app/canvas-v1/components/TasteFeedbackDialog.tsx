"use client";

import React from "react";
import type { TasteEdit } from "@/lib/canvas/taste-edit-tracker";

interface TasteFeedbackDialogProps {
  edits: TasteEdit[];
  onApplyAll: () => void;
  onSkip: () => void;
  onDismiss: () => void;
}

export function TasteFeedbackDialog({ edits, onApplyAll, onSkip, onDismiss }: TasteFeedbackDialogProps) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
        background: "rgba(0,0,0,0.5)",
      }}
      onClick={onDismiss}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#1A1A1A",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 8,
          padding: 24,
          maxWidth: 440,
          width: "100%",
          color: "#E5E5E0",
        }}
      >
        <h3 style={{
          fontSize: 14,
          fontWeight: 600,
          marginBottom: 4,
          fontFamily: "var(--font-geist-sans)",
          margin: "0 0 4px 0",
        }}>
          Taste changes detected
        </h3>
        <p style={{
          fontSize: 12,
          color: "#6B6B6B",
          marginBottom: 16,
          fontFamily: "var(--font-geist-sans)",
          margin: "0 0 16px 0",
        }}>
          Since your last generation, you made {edits.length} change{edits.length !== 1 ? "s" : ""} that differ from what was generated:
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {edits.map((edit, i) => (
            <div
              key={i}
              style={{
                fontSize: 12,
                fontFamily: "var(--font-geist-mono)",
                color: "#A0A0A0",
                padding: "6px 10px",
                background: "rgba(255,255,255,0.04)",
                borderRadius: 4,
              }}
            >
              {edit.description}
            </div>
          ))}
        </div>

        <p style={{
          fontSize: 12,
          color: "#6B6B6B",
          marginBottom: 16,
          fontFamily: "var(--font-geist-sans)",
          margin: "0 0 16px 0",
        }}>
          Apply to future generations?
        </p>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onApplyAll}
            style={{
              flex: 1,
              padding: "8px 16px",
              fontSize: 12,
              fontFamily: "var(--font-geist-sans)",
              fontWeight: 500,
              background: "#4B57DB",
              color: "#FFF",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Apply All
          </button>
          <button
            onClick={onSkip}
            style={{
              flex: 1,
              padding: "8px 16px",
              fontSize: 12,
              fontFamily: "var(--font-geist-sans)",
              fontWeight: 500,
              background: "transparent",
              color: "#A0A0A0",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
