"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { DesignNode } from "@/lib/canvas/design-node";
import { designNodeToPreviewDocument } from "@/lib/canvas/design-node-preview-html";

type DesignNodeIframePreviewProps = {
  node: DesignNode;
  /** Design-space width represented in the iframe (px). */
  contentWidth?: number;
  /** Design-space height represented in the iframe (px). */
  contentHeight?: number;
  /** Visible viewport height of the preview box (px). */
  height: number;
  className?: string;
  title?: string;
};

/**
 * Renders a DesignNode as a scaled-down static HTML preview inside a sandboxed iframe.
 * Uses ResizeObserver so scale fits the container width.
 */
export function DesignNodeIframePreview({
  node,
  contentWidth = 1200,
  contentHeight = 520,
  height,
  className,
  title = "Component preview",
}: DesignNodeIframePreviewProps) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const [boxW, setBoxW] = React.useState(280);

  React.useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setBoxW(Math.max(1, el.clientWidth));
    });
    ro.observe(el);
    setBoxW(Math.max(1, el.clientWidth));
    return () => ro.disconnect();
  }, []);

  const srcDoc = React.useMemo(() => designNodeToPreviewDocument(node), [node]);

  const scale = Math.min(boxW / contentWidth, height / contentHeight);

  return (
    <div
      ref={wrapRef}
      className={cn("relative w-full overflow-hidden rounded-[4px] border border-[#E5E5E0] bg-[#FAFAF8]", className)}
      style={{ height }}
    >
      <iframe
        title={title}
        srcDoc={srcDoc}
        sandbox="allow-same-origin"
        className="pointer-events-none select-none"
        style={{
          width: contentWidth,
          height: contentHeight,
          border: 0,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          position: "absolute",
          top: 0,
          left: 0,
        }}
      />
    </div>
  );
}
