"use client";

// Headless preference learning (master plan 1.6): drains the reducer's design
// signal queue (variant picks, section regenerations, edit boundaries), watches
// generated artboards for idle taste edits against their generation baseline,
// and writes `proposed` preferences to Design Memory. Renders nothing; signed-out
// projects only drain the queue (preferences live in Convex).

import { useEffect, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCanvas } from "@/lib/canvas/canvas-context";
import { getNodeTree } from "@/lib/canvas/canvas-item-conversion";
import { isConvexCanvasSyncConfigured } from "@/lib/canvas/canvas-convex-sync";
import { detectTasteEditsFromBaseline, isGenerationBaseline } from "@/lib/canvas/taste-edit-tracker";
import type { ArtboardItem } from "@/lib/canvas/unified-canvas-state";
import { useConvexProjectId } from "@/lib/canvas/use-convex-project-id";
import { createPreferenceRecorder, screenIdForArtboard, type KnownPreference } from "./preferences";

type PreferenceRecorder = ReturnType<typeof createPreferenceRecorder>;

const IDLE_MS = 1500;

export function usePreferenceLearning(projectId: string) {
  const { state, dispatch } = useCanvas();
  const configured = isConvexCanvasSyncConfigured();
  const currentUser = useQuery(api.users.current, configured ? {} : "skip");
  const convexProjectId = useConvexProjectId(projectId, configured && Boolean(currentUser));
  const known = useQuery(
    api.designMemory.listPreferences,
    convexProjectId ? { projectId: convexProjectId as Id<"projects">, includeOwnerEvidence: true } : "skip",
  ) as KnownPreference[] | undefined;
  const propose = useMutation(api.designMemory.proposePreference);
  const setStatus = useMutation(api.designMemory.setPreferenceStatus);

  const knownRef = useRef<KnownPreference[]>([]);
  useEffect(() => {
    knownRef.current = known ?? [];
  }, [known]);

  const recorderRef = useRef<PreferenceRecorder | null>(null);
  useEffect(() => {
    if (!convexProjectId) return;
    const projectArg = { projectId: convexProjectId as Id<"projects"> };
    const next = createPreferenceRecorder({
      projectId: convexProjectId,
      known: () => knownRef.current,
      propose: (proposal) => propose({ ...projectArg, ...proposal }).catch((error: unknown) => console.warn("[preferences] propose failed:", error)),
      retract: (preferenceId) =>
        setStatus({ ...projectArg, preferenceId: preferenceId as Id<"preferences">, status: "rejected" }).catch((error: unknown) =>
          console.warn("[preferences] retract failed:", error),
        ),
    });
    recorderRef.current = next;
    return () => {
      recorderRef.current = null;
      void next.flush();
    };
  }, [convexProjectId, propose, setStatus]);

  // Drain queued signals.
  const signals = state.designSignals;
  useEffect(() => {
    if (!signals || signals.length === 0) return;
    for (const signal of signals) void recorderRef.current?.record(signal);
    dispatch({ type: "CLEAR_DESIGN_SIGNALS", ids: signals.map((signal) => signal.id) });
  }, [dispatch, signals]);

  // Idle boundary: taste edits against each screen's generation baseline.
  const items = state.items;
  useEffect(() => {
    if (!convexProjectId) return;
    const handle = setTimeout(() => {
      const recorder = recorderRef.current;
      if (!recorder) return;
      const seen = new Set<string>();
      for (const item of items) {
        if (item.kind !== "artboard" || !isGenerationBaseline(item.generationBaseline)) continue;
        const screenId = screenIdForArtboard(item as ArtboardItem);
        if (seen.has(screenId)) continue; // one breakpoint per screen
        seen.add(screenId);
        const tree = getNodeTree(item);
        if (!tree) continue;
        const edits = detectTasteEditsFromBaseline(tree, item.generationBaseline);
        // Evidence id is stable per generation baseline: reloading the project adds no evidence.
        const id = `idle:${screenId}:${item.generationBaseline.capturedAt}`;
        void recorder.record({ kind: "edits", boundary: "idle", id, at: Date.now(), screenId, edits });
      }
    }, IDLE_MS);
    return () => clearTimeout(handle);
  }, [items, convexProjectId]);
}

export function PreferenceLearning({ projectId }: { projectId: string }) {
  usePreferenceLearning(projectId);
  return null;
}
