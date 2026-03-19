"use client";

/**
 * Auto-extraction hook — when reference items appear on the canvas without
 * `extracted` data, queue an analysis call via /api/ai/tag.
 *
 * On completion, dispatches UPDATE_ITEM to set `item.extracted`.
 * If the API is unavailable, skips silently.
 */

import { useEffect, useRef } from "react";
import type { ReferenceItem, CanvasItem } from "@/lib/canvas/unified-canvas-state";
import type { CanvasAction } from "@/lib/canvas/canvas-reducer";

export function useReferenceExtractor(
  items: CanvasItem[],
  dispatch: React.Dispatch<CanvasAction>
) {
  // Track which items we've already queued extraction for
  const processedRef = useRef<Set<string>>(new Set());
  // Track which items are currently being analyzed
  const analyzingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const references = items.filter(
      (item): item is ReferenceItem =>
        item.kind === "reference" && !item.extracted
    );

    for (const ref of references) {
      if (processedRef.current.has(ref.id) || analyzingRef.current.has(ref.id)) continue;

      // Skip blob URLs (can't be fetched server-side) and data URLs over 100KB
      // (too large for the tagger API)
      if (ref.imageUrl.startsWith("blob:")) {
        processedRef.current.add(ref.id);
        continue;
      }

      processedRef.current.add(ref.id);
      analyzingRef.current.add(ref.id);

      // Fire and forget — non-blocking
      (async () => {
        try {
          const res = await fetch("/api/ai/tag", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageUrl: ref.imageUrl,
              referenceId: ref.id,
            }),
          });

          if (!res.ok) return;

          const data = await res.json();
          if (data.skipped) return;

          const extracted = {
            colors: Array.isArray(data.colors) ? data.colors.slice(0, 6) : [],
            fonts: typeof data.typography === "string" && data.typography
              ? [data.typography]
              : [],
            tags: Array.isArray(data.tags) ? data.tags.slice(0, 10) : [],
          };

          dispatch({
            type: "UPDATE_ITEM",
            itemId: ref.id,
            changes: { extracted } as Partial<ReferenceItem>,
          });
        } catch {
          // API unavailable — skip silently
        } finally {
          analyzingRef.current.delete(ref.id);
        }
      })();
    }
  }, [items, dispatch]);

  return {
    isAnalyzing: (itemId: string) => analyzingRef.current.has(itemId),
  };
}
