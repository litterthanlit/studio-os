"use client";

import * as React from "react";
import type { CanvasStage } from "@/lib/canvas/compose";

interface CanvasStageContextValue {
  stage: CanvasStage;
  setStage: (stage: CanvasStage) => void;
  availability: Record<CanvasStage, { available: boolean; tooltip?: string }>;
  setAvailability: (a: Record<CanvasStage, { available: boolean; tooltip?: string }>) => void;
}

const CanvasStageContext = React.createContext<CanvasStageContextValue | null>(null);

export function CanvasStageProvider({ children }: { children: React.ReactNode }) {
  const [stage, setStage] = React.useState<CanvasStage>("collect");
  const [availability, setAvailability] = React.useState<
    Record<CanvasStage, { available: boolean; tooltip?: string }>
  >({
    collect: { available: true },
    compose: { available: false, tooltip: "Generate variants first" },
  });

  return (
    <CanvasStageContext.Provider value={{ stage, setStage, availability, setAvailability }}>
      {children}
    </CanvasStageContext.Provider>
  );
}

export function useCanvasStage() {
  return React.useContext(CanvasStageContext);
}
