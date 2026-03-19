"use client";

import * as React from "react";
import type { HandlePosition } from "../hooks/useResize";

type ResizeHandlesProps = {
  width: number;
  height: number;
  onHandlePointerDown: (e: React.PointerEvent, handle: HandlePosition) => void;
};

const HANDLE_SIZE = 6;
const HALF = HANDLE_SIZE / 2;

const HANDLES: Array<{
  position: HandlePosition;
  cursor: string;
  getStyle: (w: number, h: number) => React.CSSProperties;
}> = [
  {
    position: "top-left",
    cursor: "nwse-resize",
    getStyle: () => ({ top: -HALF, left: -HALF }),
  },
  {
    position: "top",
    cursor: "ns-resize",
    getStyle: (w) => ({ top: -HALF, left: w / 2 - HALF }),
  },
  {
    position: "top-right",
    cursor: "nesw-resize",
    getStyle: (w) => ({ top: -HALF, left: w - HALF }),
  },
  {
    position: "right",
    cursor: "ew-resize",
    getStyle: (w, h) => ({ top: h / 2 - HALF, left: w - HALF }),
  },
  {
    position: "bottom-right",
    cursor: "nwse-resize",
    getStyle: (w, h) => ({ top: h - HALF, left: w - HALF }),
  },
  {
    position: "bottom",
    cursor: "ns-resize",
    getStyle: (w, h) => ({ top: h - HALF, left: w / 2 - HALF }),
  },
  {
    position: "bottom-left",
    cursor: "nesw-resize",
    getStyle: (_, h) => ({ top: h - HALF, left: -HALF }),
  },
  {
    position: "left",
    cursor: "ew-resize",
    getStyle: (_, h) => ({ top: h / 2 - HALF, left: -HALF }),
  },
];

/**
 * 8 resize handles (4 corners + 4 edge midpoints) rendered around a selected item.
 * Positioned absolutely relative to the item's bounding box.
 */
export function ResizeHandles({ width, height, onHandlePointerDown }: ResizeHandlesProps) {
  return (
    <>
      {HANDLES.map(({ position, cursor, getStyle }) => (
        <div
          key={position}
          style={{
            position: "absolute",
            width: HANDLE_SIZE,
            height: HANDLE_SIZE,
            borderRadius: "50%",
            border: "1px solid #1E5DF2",
            backgroundColor: "white",
            cursor,
            zIndex: 10,
            ...getStyle(width, height),
          }}
          onPointerDown={(e) => onHandlePointerDown(e, position)}
        />
      ))}
    </>
  );
}
