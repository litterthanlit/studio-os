"use client";

import { useEffect, useCallback } from "react";

export type RemoteCommandHandler = {
  onNavigateStage?: (stage: string) => void;
  onSelectBreakpoint?: (breakpoint: string) => void;
  onSelectNode?: (nodeId: string) => void;
  onScrollTo?: (direction: string, amount?: number) => void;
  onTogglePanel?: (panel: string) => void;
  onSelectVariant?: (direction: string) => void;
  onZoom?: (direction: string) => void;
};

export function useRemoteCommands(handlers: RemoteCommandHandler) {
  const handleCommand = useCallback(
    (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || !detail.type) return;

      switch (detail.type) {
        case "navigate-stage":
          handlers.onNavigateStage?.(detail.payload?.stage);
          break;
        case "select-breakpoint":
          handlers.onSelectBreakpoint?.(detail.payload?.breakpoint);
          break;
        case "select-node":
          handlers.onSelectNode?.(detail.payload?.nodeId);
          break;
        case "scroll-to":
          handlers.onScrollTo?.(
            detail.payload?.direction,
            detail.payload?.amount
          );
          break;
        case "toggle-panel":
          handlers.onTogglePanel?.(detail.payload?.panel);
          break;
        case "select-variant":
          handlers.onSelectVariant?.(detail.payload?.direction);
          break;
        case "zoom":
          handlers.onZoom?.(detail.payload?.direction);
          break;
      }
    },
    [handlers]
  );

  useEffect(() => {
    window.addEventListener("remote-command", handleCommand);
    return () => window.removeEventListener("remote-command", handleCommand);
  }, [handleCommand]);
}
