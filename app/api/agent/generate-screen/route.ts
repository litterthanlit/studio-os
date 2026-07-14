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
import { generateV6DesignVariants } from "@/lib/canvas/generate-design-core";
import { inferSiteName } from "@/lib/canvas/compose";
import { normalizeRemoteCanvasState } from "@/lib/canvas/canvas-convex-sync";
import type { TasteProfile } from "@/types/taste-profile";
import type { DesignSystemTokens } from "@/lib/canvas/generate-system";
import { API_LIMITS, readGuardedJson } from "@/lib/security/api-guard";

/**
 * POST /api/agent/generate-screen
 * Generates a screen from project context and writes it to the canvas.
 */
export async function POST(req: NextRequest) {
  const guarded = await readGuardedJson<{
    projectId: string;
    prompt: string;
    breakpoint?: "desktop" | "mobile";
    name?: string;
    fidelityMode?: FidelityMode;
    tasteProfile?: TasteProfile | null;
    designTokens?: DesignSystemTokens | null;
  }>(req, {
    requireAuth: false,
    maxBytes: API_LIMITS.aiRequestBytes,
    rateLimit: { namespace: "agent-generate-screen", limit: 20, windowMs: 60 * 60 * 1000 },
  });
  if (!guarded.ok) return guarded.response;

  const {
    projectId,
    prompt,
    breakpoint = "desktop",
    name,
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

    const generation = await generateV6DesignVariants({
      prompt: prompt.trim(),
      tokens,
      siteName: name ?? inferSiteName(prompt),
      tasteProfile: tasteProfile ?? null,
      referenceUrls,
      fidelityMode: fidelityMode ?? "balanced",
    });

    if (!generation.ok || !generation.variants?.[0]?.pageTree) {
      const failureMessage = generation.ok
        ? "Generation returned no variants"
        : generation.v6Failure?.message ?? "Generation failed";
      const failureKind = generation.ok
        ? "v6-failed"
        : generation.v6Failure?.kind ?? generation.generationResult ?? "v6-failed";
      return NextResponse.json({
        error: failureMessage,
        generationResult: failureKind,
        v6Debug: generation.v6Debug,
      }, { status: !generation.ok && generation.v6Failure?.kind === "credit-exhaustion" ? 402 : 502 });
    }

    const artboardName = name ?? generation.siteName ?? "Generated Screen";
    const { state, applied, errors } = applyCanvasAgentOperations(currentState, [
      {
        type: "add_artboard",
        name: artboardName,
        breakpoint,
        tree: generation.variants[0].pageTree,
      },
    ]);

    if (applied.length === 0) {
      return NextResponse.json(
        { error: "Failed to add generated artboard", details: errors },
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
    const artboardId = summary.artboards.at(-1)?.id ?? null;

    return NextResponse.json({
      projectId,
      artboardId,
      revision: saveResult.revision,
      siteName: generation.siteName,
      generationResult: generation.generationResult,
      v6Debug: generation.v6Debug,
      summary,
      variant: {
        id: generation.variants[0].id,
        name: generation.variants[0].name,
        description: generation.variants[0].description,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate screen";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
