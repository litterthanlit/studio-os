"use client";

/**
 * V3 Bottom Bar — floating pill, centered bottom, 12px above viewport.
 * Height: 32px, padding 4px 14px.
 * Background: #FFFFFF, border 0.5px #EFEFEC, radius 4px.
 * NO shadows (per spec).
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
      className="absolute bottom-[12px] left-1/2 -translate-x-1/2 z-30 flex items-center h-[32px] px-[14px] py-1 gap-0 bg-white border-[0.5px] border-[#EFEFEC] rounded-[4px] dark:bg-[#1A1A1A] dark:border-[#333333]"
      style={{
        fontFamily: "'IBM Plex Mono', monospace",
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
          className="w-[40px] border-none outline-none bg-transparent text-[11px] text-[#1A1A1A] dark:text-[#FFFFFF] text-center"
          style={{
            fontFamily: "inherit",
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
          className="text-[11px] text-[#6B6B6B] dark:text-[#D0D0D0] cursor-pointer"
        >
          {displayPercent}%
        </span>
      )}
    </div>
  );
}
