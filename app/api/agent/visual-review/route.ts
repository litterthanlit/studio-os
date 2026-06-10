import { NextRequest, NextResponse } from "next/server";
import {
  buildDesignContract,
} from "@/lib/canvas/agent-design-contract";
import { scoreDesignBenchmarkFidelity } from "@/lib/canvas/design-taste-evaluator";
import { createVisualReviewFromBenchmarkScore } from "@/lib/agent/visual-review-from-score";
import type { UnifiedCanvasState } from "@/lib/canvas/unified-canvas-state";
import type { TasteProfile } from "@/types/taste-profile";
import type { ProjectContext } from "@/types/agent-design-harness";
import { authorizeAgentRequest } from "@/lib/agent/agent-api-auth";
import { API_LIMITS, capStringArray, readGuardedJson } from "@/lib/security/api-guard";

/**
 * POST /api/agent/visual-review
 *
 * Screenshot-based visual critique using the production benchmark scorer.
 * Agents call this after implementing UI to get drift detection + fix prompts.
 */
export async function POST(req: NextRequest) {
  const auth = await authorizeAgentRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const guarded = await readGuardedJson<{
    projectId: string;
    projectName: string;
    canvasState: UnifiedCanvasState;
    tasteProfile: TasteProfile;
    screenId: string;
    screenshotDataUrl: string;
    referenceUrls?: string[];
    comparedAgainstArtboard?: string;
    projectContext?: Partial<ProjectContext> | null;
  }>(req, {
    requireAuth: false,
    maxBytes: API_LIMITS.publishRequestBytes,
    rateLimit: { namespace: "agent-visual-review", limit: 30, windowMs: 60 * 60 * 1000 },
  });
  if (!guarded.ok) return guarded.response;

  const {
    projectId,
    projectName,
    canvasState,
    tasteProfile,
    screenId,
    screenshotDataUrl,
    referenceUrls,
    comparedAgainstArtboard,
    projectContext,
  } = guarded.body;

  if (!projectId || !projectName || !canvasState || !tasteProfile || !screenId || !screenshotDataUrl) {
    return NextResponse.json(
      { error: "projectId, projectName, canvasState, tasteProfile, screenId, and screenshotDataUrl are required" },
      { status: 400 },
    );
  }

  const contract = buildDesignContract({
    projectId,
    projectName,
    state: canvasState,
    tasteProfile,
    projectContext: projectContext ?? null,
  });

  const refs = capStringArray(referenceUrls, API_LIMITS.maxReferenceUrls);
  let benchmarkScore = null;
  if (refs.length > 0 && process.env.OPENROUTER_API_KEY) {
    try {
      benchmarkScore = await scoreDesignBenchmarkFidelity(
        refs,
        screenshotDataUrl,
        tasteProfile,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Visual scoring failed";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  } else {
    return NextResponse.json(
      { error: "referenceUrls and OPENROUTER_API_KEY are required for screenshot scoring" },
      { status: 400 },
    );
  }

  const result = createVisualReviewFromBenchmarkScore({
    contract,
    screenId,
    sourceScreenshot: screenshotDataUrl,
    comparedAgainstArtboard: comparedAgainstArtboard ?? screenId,
    score: benchmarkScore,
  });

  return NextResponse.json({
    mode: "benchmark",
    benchmarkScore,
    visualReview: result.review,
    observedIssues: result.observedIssues,
    recommendedAgentPrompt: result.review.recommendedAgentPrompt,
  });
}
