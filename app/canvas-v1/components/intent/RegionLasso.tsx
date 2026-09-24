"use client";

// Region lasso (master plan 1.8): drag a rectangle on a reference to give that
// region its own role ("type from this headline"). Esc cancels.

import * as React from "react";
import { coverTransform, normalizeBBox, type BBox } from "@/lib/intent/reference-actions";
import type { ReferenceRole } from "@/lib/design-memory/types";

type RegionLassoProps = {
  role: ReferenceRole;
  natural: { width: number; height: number } | null;
  box: { width: number; height: number };
  /** Canvas zoom: pointer deltas are in screen px. */
  zoom: number;
  onCommit: (bbox: BBox) => void;
  onCancel: () => void;
};

export function RegionLasso({ role, natural, box, zoom, onCommit, onCancel }: RegionLassoProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [drag, setDrag] = React.useState<{ a: { x: number; y: number }; b: { x: number; y: number } } | null>(null);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCancel();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onCancel]);

  const local = (e: React.PointerEvent) => {
    const rect = ref.current!.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / zoom, y: (e.clientY - rect.top) / zoom };
  };

  const fit = coverTransform(natural ?? box, box);
  const rect = drag
    ? { left: Math.min(drag.a.x, drag.b.x), top: Math.min(drag.a.y, drag.b.y), width: Math.abs(drag.b.x - drag.a.x), height: Math.abs(drag.b.y - drag.a.y) }
    : null;

  return (
    <div
      ref={ref}
      role="application"
      aria-label={`Draw a ${role} region. Drag to draw, Escape to cancel.`}
      className="absolute inset-0 cursor-crosshair"
      onPointerDown={(e) => {
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        const p = local(e);
        setDrag({ a: p, b: p });
      }}
      onPointerMove={(e) => {
        if (!drag) return;
        e.stopPropagation();
        setDrag({ ...drag, b: local(e) });
      }}
      onPointerUp={(e) => {
        if (!drag) return;
        e.stopPropagation();
        const a = fit.toImage(drag.a.x, drag.a.y);
        const b = fit.toImage(drag.b.x, drag.b.y);
        setDrag(null);
        onCommit(normalizeBBox(a, b));
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {rect && (
        <div className="pointer-events-none absolute border border-[#4B57DB] bg-[#EDF1FE]/40" style={rect}>
          <span className="absolute -top-[15px] left-[-1px] whitespace-nowrap border border-[#4B57DB] bg-white px-1 font-mono text-[10px] leading-[14px] text-[#4B57DB]">
            {role.toUpperCase()}
          </span>
        </div>
      )}
    </div>
  );
}
