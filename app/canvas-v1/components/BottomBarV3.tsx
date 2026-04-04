"use client";

/**
 * V3 Bottom Bar — zoom display with click-to-edit and double-click-to-fit.
 */

import * as React from "react";

type BottomBarV3Props = {
  zoom: number;
  onZoomChange: (z: number) => void;
  onZoomToFit: () => void;
};

export function BottomBarV3({ zoom, onZoomChange, onZoomToFit }: BottomBarV3Props) {
  const [editing, setEditing] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  const displayPercent = Math.round(zoom * 100);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: "#FFFFFF",
        border: "0.5px solid #EFEFEC",
        borderRadius: 4,
        padding: "4px 12px",
        fontSize: 11,
        fontFamily: "'IBM Plex Mono', monospace",
        color: "#6B6B6B",
        zIndex: 100,
        userSelect: "none",
      }}
    >
      {editing ? (
        <input
          autoFocus
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const val = parseInt(inputValue, 10);
              if (!isNaN(val) && val >= 10 && val <= 800) {
                onZoomChange(val / 100);
              }
              setEditing(false);
            }
            if (e.key === "Escape") setEditing(false);
          }}
          onBlur={() => setEditing(false)}
          style={{
            width: 40,
            border: "none",
            outline: "none",
            background: "transparent",
            fontSize: 11,
            fontFamily: "inherit",
            color: "#1A1A1A",
            textAlign: "center",
          }}
        />
      ) : (
        <span
          onClick={() => {
            setEditing(true);
            setInputValue(String(displayPercent));
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            onZoomToFit();
          }}
          style={{ cursor: "pointer" }}
        >
          {displayPercent}%
        </span>
      )}
    </div>
  );
}
