import { NextRequest, NextResponse } from "next/server";
import {
  agentConvexAuthFromResult,
  authorizeAgentProjectAccess,
} from "@/lib/agent/agent-api-auth";
import { extractReferenceUrls } from "@/lib/agent/canvas-agent-ops";
import { agentLoadCanvas } from "@/lib/agent/convex-agent-client";
import { buildDesignContract } from "@/lib/canvas/agent-design-contract";
import { scoreDesignBenchmarkFidelity } from "@/lib/canvas/design-taste-evaluator";
import { createVisualReviewFromBenchmarkScore } from "@/lib/agent/visual-review-from-score";
import { normalizeRemoteCanvasState } from "@/lib/canvas/canvas-convex-sync";
import type { TasteProfile } from "@/types/taste-profile";
import { API_LIMITS, readGuardedJson } from "@/lib/security/api-guard";

/**
 * POST /api/agent/review-implementation
 * Project-scoped screenshot review against stored canvas + references.
 */
export async function POST(req: NextRequest) {
  const guarded = await readGuardedJson<{
    projectId: string;
    projectName?: string;
    artboardId: string;
    screenshotDataUrl: string;
    tasteProfile?: TasteProfile | null;
  }>(req, {
    requireAuth: false,
    maxBytes: API_LIMITS.publishRequestBytes,
    rateLimit: { namespace: "agent-review-implementation", limit: 30, windowMs: 60 * 60 * 1000 },
  });
  if (!guarded.ok) return guarded.response;

  const {
    projectId,
    projectName,
    artboardId,
    screenshotDataUrl,
    tasteProfile,
  } = guarded.body;

  if (!projectId || !artboardId || !screenshotDataUrl) {
    return NextResponse.json(
      { error: "projectId, artboardId, and screenshotDataUrl are required" },
      { status: 400 },
    );
  }

  const auth = await authorizeAgentProjectAccess(req, projectId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const doc = await agentLoadCanvas(agentConvexAuthFromResult(auth), auth.projectId!);
    const canvasState = doc?.state
      ? normalizeRemoteCanvasState(doc.state)
      : normalizeRemoteCanvasState(null);
    const referenceUrls = extractReferenceUrls(canvasState);

    if (referenceUrls.length === 0) {
      return NextResponse.json(
        { error: "Project canvas has no references for visual scoring" },
        { status: 400 },
      );
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY is required for screenshot scoring" },
        { status: 400 },
      );
    }

    if (!tasteProfile) {
      return NextResponse.json(
        { error: "tasteProfile is required for screenshot scoring" },
        { status: 400 },
      );
    }

    const contract = buildDesignContract({
      projectId,
      projectName: projectName ?? projectId,
      state: canvasState,
      tasteProfile,
    });

    const benchmarkScore = await scoreDesignBenchmarkFidelity(
      referenceUrls,
      screenshotDataUrl,
      tasteProfile,
    );

    const result = createVisualReviewFromBenchmarkScore({
      contract,
      screenId: artboardId,
      sourceScreenshot: screenshotDataUrl,
      comparedAgainstArtboard: artboardId,
      score: benchmarkScore,
    });

    return NextResponse.json({
      mode: "benchmark",
      projectId,
      artboardId,
      benchmarkScore,
      visualReview: result.review,
      observedIssues: result.observedIssues,
      recommendedAgentPrompt: result.review.recommendedAgentPrompt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Visual review failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
