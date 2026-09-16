"use client";

import { CanvasProvider } from "@/lib/canvas/canvas-context";
import { UnifiedCanvasView } from "./components/UnifiedCanvasView";

export function UnifiedCanvasPage({
  projectId,
}: {
  projectId: string;
}) {
  return (
    <CanvasProvider projectId={projectId}>
      <div className="relative flex h-full w-full min-w-0 flex-col overflow-hidden">
        <UnifiedCanvasView projectId={projectId} />
      </div>
    </CanvasProvider>
  );
}
