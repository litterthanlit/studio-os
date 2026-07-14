import { NextRequest, NextResponse } from "next/server";
import type { CompositionAnalysis } from "@/types/composition-analysis";
import type { TasteProfile } from "@/types/taste-profile";
import type { DesignSystemTokens } from "@/lib/canvas/generate-system";
import type { SiteType } from "@/lib/canvas/templates";
import type { FidelityMode } from "@/lib/canvas/directive-compiler";
import { authorizeAgentRequest } from "@/lib/agent/agent-api-auth";
import { API_LIMITS, readGuardedJson } from "@/lib/security/api-guard";
import { generateV6DesignVariants } from "@/lib/canvas/generate-design-core";

/**
 * POST /api/agent/request-design
 *
 * Agent-facing V6 DesignNode variant generation.
 * Returns DesignNode trees + visual refine metadata when enabled.
 */
export async function POST(req: NextRequest) {
  const auth = await authorizeAgentRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const guarded = await readGuardedJson<{
    prompt: string;
    tokens: DesignSystemTokens;
    tasteProfile?: TasteProfile | null;
    referenceUrls?: string[];
    siteType?: SiteType;
    siteName?: string;
    fidelityMode?: FidelityMode;
    compositionData?: Array<{
      analysis: CompositionAnalysis;
      weight: "primary" | "default" | "muted";
      referenceIndex: number;
    }>;
    compositionContext?: string;
  }>(req, {
    requireAuth: false,
    maxBytes: API_LIMITS.aiRequestBytes,
    rateLimit: { namespace: "agent-request-design", limit: 20, windowMs: 60 * 60 * 1000 },
  });
  if (!guarded.ok) return guarded.response;

  const body = guarded.body;
  if (!body.prompt?.trim() || !body.tokens) {
    return NextResponse.json({ error: "prompt and tokens are required" }, { status: 400 });
  }

  const result = await generateV6DesignVariants({
    prompt: body.prompt.trim(),
    tokens: body.tokens,
    tasteProfile: body.tasteProfile ?? null,
    referenceUrls: body.referenceUrls,
    siteType: body.siteType,
    siteName: body.siteName,
    fidelityMode: body.fidelityMode ?? "balanced",
    compositionData: body.compositionData,
    compositionContext: body.compositionContext,
  });

  if (result.ok) {
    return NextResponse.json({
      siteName: result.siteName,
      generationResult: result.generationResult,
      fallbackUsed: false,
      v6Debug: result.v6Debug,
      variants: result.variants,
      agentSurface: "request_design",
      toolsVersion: "2026-06-10",
    });
  }

  if (result.strictError) {
    return NextResponse.json({
      error: result.strictError,
      generationResult: result.generationResult ?? "v6-failed",
      fallbackUsed: false,
      fallbackReason: result.v6Debug.fallbackReason,
      v6Debug: result.v6Debug,
    }, { status: result.strictStatus ?? 502 });
  }

  return NextResponse.json({
    error: result.v6Failure?.message ?? "V6 generation failed",
    generationResult: result.v6Failure?.kind ?? "v6-failed",
    fallbackUsed: true,
    fallbackReason: result.v6Debug.fallbackReason,
    v6Debug: result.v6Debug,
  }, { status: result.v6Failure?.kind === "credit-exhaustion" ? 402 : 502 });
}
