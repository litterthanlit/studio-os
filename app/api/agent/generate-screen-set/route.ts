import { NextRequest, NextResponse } from "next/server";
import {
  agentConvexAuthFromResult,
  authorizeAgentProjectAccess,
} from "@/lib/agent/agent-api-auth";
import {
  applyCanvasAgentOperations,
  buildCanvasSummary,
  extractReferenceUrls,
} from "@/lib/agent/canvas-agent-ops";
import {
  agentLoadCanvas,
  agentSaveCanvas,
} from "@/lib/agent/convex-agent-client";
import { defaultDesignTokens } from "@/lib/agent/default-design-tokens";
import type { FidelityMode } from "@/lib/canvas/directive-compiler";
import { generateAppScreenSet } from "@/lib/canvas/generate-screen-set-core";
import { inferSiteName } from "@/lib/canvas/compose";
import { normalizeRemoteCanvasState } from "@/lib/canvas/canvas-convex-sync";
import type { TasteProfile } from "@/types/taste-profile";
import type { DesignSystemTokens } from "@/lib/canvas/generate-system";
import { API_LIMITS, readGuardedJson } from "@/lib/security/api-guard";
import { BREAKPOINT_WIDTHS } from "@/lib/canvas/compose";

/**
 * POST /api/agent/generate-screen-set
 * Plans and generates multiple app screens with shared shell context.
 */
export async function POST(req: NextRequest) {
  const guarded = await readGuardedJson<{
    projectId: string;
    prompt: string;
    breakpoint?: "desktop" | "mobile";
    fidelityMode?: FidelityMode;
    tasteProfile?: TasteProfile | null;
    designTokens?: DesignSystemTokens | null;
  }>(req, {
    requireAuth: false,
    maxBytes: API_LIMITS.aiRequestBytes,
    rateLimit: { namespace: "agent-generate-screen-set", limit: 10, windowMs: 60 * 60 * 1000 },
  });
  if (!guarded.ok) return guarded.response;

  const {
    projectId,
    prompt,
    breakpoint = "desktop",
    fidelityMode,
    tasteProfile,
    designTokens,
  } = guarded.body;

  if (!projectId || !prompt?.trim()) {
    return NextResponse.json({ error: "projectId and prompt are required" }, { status: 400 });
  }

  const auth = await authorizeAgentProjectAccess(req, projectId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const convexAuth = agentConvexAuthFromResult(auth);

  try {
    const doc = await agentLoadCanvas(convexAuth, auth.projectId!);
    const currentState = doc?.state
      ? normalizeRemoteCanvasState(doc.state)
      : normalizeRemoteCanvasState(null);
    const tokens = designTokens ?? defaultDesignTokens();
    const referenceUrls = extractReferenceUrls(currentState);

    const generation = await generateAppScreenSet({
      prompt: prompt.trim(),
      tokens,
      siteName: inferSiteName(prompt),
      tasteProfile: tasteProfile ?? null,
      referenceUrls,
      fidelityMode: fidelityMode ?? "balanced",
      breakpoint,
    });

    if (!generation.ok) {
      return NextResponse.json({
        error: generation.error,
        generationResult: generation.failure?.kind ?? "v6-failed",
      }, { status: generation.failure?.kind === "credit-exhaustion" ? 402 : 502 });
    }

    const siteId = `site-${Date.now()}`;
    const artboardWidth = BREAKPOINT_WIDTHS[breakpoint] ?? 1440;
    const gap = 80;
    const baseX = 120 + currentState.items.filter((item) => item.kind === "artboard").length * 40;

    const operations = generation.screens.map((screen, index) => ({
      type: "add_artboard" as const,
      name: screen.name,
      breakpoint,
      tree: screen.pageTree,
      siteId,
      screenRole: screen.screenRole,
      screenPurpose: screen.screenPurpose,
      x: baseX + index * (artboardWidth + gap),
      y: 100,
    }));

    const { state, applied, errors } = applyCanvasAgentOperations(currentState, operations);

    if (applied.length === 0) {
      return NextResponse.json(
        { error: "Failed to add generated screens", details: errors },
        { status: 500 },
      );
    }

    const saveResult = await agentSaveCanvas(convexAuth, {
      projectId: auth.projectId!,
      state,
      expectedRevision: doc?.revision,
      schemaVersion: state.schemaVersion,
    });

    const summary = buildCanvasSummary(state);

    return NextResponse.json({
      projectId,
      siteId,
      revision: saveResult.revision,
      siteName: generation.siteName,
      generationResult: "v6-screens",
      effectiveArchetype: generation.effectiveArchetype,
      plan: generation.plan,
      screens: generation.screens.map((screen, index) => ({
        id: summary.artboards.at(-generation.screens.length + index)?.id ?? screen.id,
        name: screen.name,
        screenRole: screen.screenRole,
        screenPurpose: screen.screenPurpose,
      })),
      summary,
      applied,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate screen set";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
