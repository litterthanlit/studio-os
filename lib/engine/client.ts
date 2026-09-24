"use client";

// lib/engine/client.ts
// Editor side of the engine pipeline: start a run, follow it through real
// progress events (the Convex generationRuns row when signed in, otherwise the
// run route), and decode the editor payload when it completes.

import type { ConvexReactClient } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { DesignNode } from "@/lib/canvas/design-node";
import type { DesignSystemTokens } from "@/lib/canvas/generate-system";
import type { CompositionAnalysis } from "@/types/composition-analysis";
import type { TasteProfile } from "@/types/taste-profile";
import type { IntentCardBrief, PerceptionSummary } from "@/lib/intent/reference-actions";
import type { RunRecord } from "./run-store";
import type { EngineReference } from "./types";

export type EngineEditorPayload = {
  kind: "screen" | "screen-set";
  siteName: string;
  variants: Array<{
    id?: string;
    name: string;
    pageTree: DesignNode;
    strategy?: string;
    pageTreeSource?: string;
    compiledCode?: string | null;
    screenRole?: string;
    screenPurpose?: string;
    [key: string]: unknown;
  }>;
  generationResult?: string;
  tasteProfile: TasteProfile | null;
  designTokens: DesignSystemTokens;
  sources: { tasteProfile: string; designTokens: string };
  analyses: Array<{ referenceId: string; analysis: CompositionAnalysis }>;
  /** X-ray facts per reference (1.8). */
  perceptions?: Array<{ referenceId: string; summary: PerceptionSummary }>;
  /** What the run understood, for the Intent Card (1.8). */
  brief?: IntentCardBrief;
  intent: { outputType: string; businessGoal: string; confidence: number; alternatives: unknown[] };
  breakpoint: "desktop" | "mobile";
  briefId: string | null;
  warnings: string[];
};

const STEP_LABELS: Record<string, string> = {
  "loading-context": "Preparing references...",
  "analyzing-reference": "Analyzing references...",
  brief: "Understanding the brief...",
  taste: "Compiling taste...",
  generating: "Generating design...",
  "section-ready": "Building sections...",
  planned: "Planning screens...",
  "screen-complete": "Building screens...",
  verifying: "Checking the output...",
  "writing-canvas": "Writing to canvas...",
  rebased: "Merging with your latest edits...",
  resumed: "Resuming...",
};

/** Progress labels from the run's real events (deduplicated, in order). */
export function progressLabels(run: Pick<RunRecord, "progress">): string[] {
  const labels: string[] = [];
  for (const row of run.progress ?? []) {
    const label = STEP_LABELS[row.step];
    if (label && labels[labels.length - 1] !== label && !labels.includes(label)) labels.push(label);
  }
  return labels;
}

export async function startEngineRun(body: {
  projectId: string;
  prompt: string;
  mode?: "auto" | "screen" | "screen-set";
  siteType?: string;
  siteName?: string;
  fidelityMode?: string;
  references: EngineReference[];
  tasteProfile?: TasteProfile | null;
  designTokens?: DesignSystemTokens | null;
  /** Answers to brief questions (Intent Card). */
  answers?: Record<string, string>;
}): Promise<{ runId: string; serverBacked: boolean }> {
  const res = await fetch("/api/engine/runs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "auto", ...body }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.runId) throw new Error(data.error || `Could not start generation (${res.status})`);
  return { runId: data.runId, serverBacked: Boolean(data.serverBacked) };
}

const TERMINAL = new Set(["complete", "partial", "failed"]);

/**
 * Follow a run to a terminal status. Signed in: subscribe to the Convex row
 * (watchQuery). Otherwise poll the run route. `onUpdate` fires on every change.
 */
export function waitForEngineRun(args: {
  runId: string;
  projectId: string;
  convex?: ConvexReactClient | null;
  serverBacked: boolean;
  onUpdate?: (run: RunRecord) => void;
  timeoutMs?: number;
}): Promise<RunRecord> {
  const { runId, projectId, onUpdate } = args;
  const timeoutMs = args.timeoutMs ?? 6 * 60_000;

  return new Promise<RunRecord>((resolve, reject) => {
    let settled = false;
    let unsubscribe: (() => void) | null = null;
    const finish = (run: RunRecord | null, error?: Error) => {
      if (settled) return;
      settled = true;
      unsubscribe?.();
      clearTimeout(timer);
      if (error || !run) reject(error ?? new Error("Run not found"));
      else resolve(run);
    };
    const handle = (run: RunRecord | null | undefined) => {
      if (!run) return;
      onUpdate?.(run);
      if (TERMINAL.has(run.status)) finish(run);
    };
    const timer = setTimeout(() => finish(null, new Error("Generation timed out")), timeoutMs);

    if (args.serverBacked && args.convex) {
      const watch = args.convex.watchQuery(api.generationRuns.get, { runId: runId as Id<"generationRuns"> });
      unsubscribe = watch.onUpdate(() => {
        try {
          handle(watch.localQueryResult() as RunRecord | null | undefined);
        } catch (error) {
          finish(null, error instanceof Error ? error : new Error(String(error)));
        }
      });
      handle(watch.localQueryResult() as RunRecord | null | undefined);
      return;
    }

    const poll = async () => {
      while (!settled) {
        try {
          const res = await fetch(`/api/engine/runs/${encodeURIComponent(runId)}?projectId=${encodeURIComponent(projectId)}`);
          if (res.ok) handle((await res.json()) as RunRecord);
          else if (res.status === 404) return finish(null, new Error("Run not found"));
        } catch {
          // transient; keep polling
        }
        await new Promise((r) => setTimeout(r, 900));
      }
    };
    void poll();
  });
}

/** Decode the editor payload of a completed run. */
export function editorPayloadFromRun(run: RunRecord): EngineEditorPayload | null {
  const result = run.result as { target?: string; json?: string } | null;
  if (!result || (result.target !== "editor" && result.target !== "benchmark") || typeof result.json !== "string") return null;
  return JSON.parse(result.json) as EngineEditorPayload;
}

/**
 * Live Build (1.9): the sections that have landed on a running screen run, in
 * order. Empty once none have streamed (screen sets report whole screens).
 */
export function partialSectionsFromRun(run: Pick<RunRecord, "outputs"> | null | undefined): DesignNode[] {
  return (run?.outputs ?? [])
    .filter((output) => output.kind === "section" && typeof output.data === "string")
    .map((output) => {
      try {
        return JSON.parse(output.data as string) as { index: number; node: DesignNode };
      } catch {
        return null;
      }
    })
    .filter((entry): entry is { index: number; node: DesignNode } => Boolean(entry?.node))
    .sort((a, b) => a.index - b.index)
    .map((entry) => entry.node);
}
