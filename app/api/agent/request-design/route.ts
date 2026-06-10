import { NextRequest, NextResponse } from "next/server";
import type { CompositionAnalysis } from "@/types/composition-analysis";
import type { TasteProfile } from "@/types/taste-profile";
import type { DesignSystemTokens } from "@/lib/canvas/generate-system";
import type { SiteType } from "@/lib/canvas/templates";
import type { FidelityMode } from "@/lib/canvas/directive-compiler";
import { authorizeAgentRequest } from "@/lib/agent/agent-api-auth";
import { API_LIMITS, capStringArray, readGuardedJson } from "@/lib/security/api-guard";

/**
 * POST /api/agent/request-design
 *
 * Agent-facing wrapper around /api/canvas/generate-component (V6 variants).
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

  const origin = req.nextUrl.origin;
  const headers = new Headers({ "Content-Type": "application/json" });
  const bearer = req.headers.get("authorization");
  if (bearer) headers.set("authorization", bearer);
  const serviceSecret = req.headers.get("x-studio-os-service-secret");
  if (serviceSecret) headers.set("x-studio-os-service-secret", serviceSecret);

  const generateRes = await fetch(`${origin}/api/canvas/generate-component`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      mode: "variants",
      useDesignNode: true,
      prompt: body.prompt.trim(),
      tokens: body.tokens,
      tasteProfile: body.tasteProfile ?? null,
      referenceUrls: capStringArray(body.referenceUrls, API_LIMITS.maxReferenceUrls),
      siteType: body.siteType,
      siteName: body.siteName,
      fidelityMode: body.fidelityMode ?? "balanced",
      compositionData: body.compositionData,
      compositionContext: body.compositionContext,
    }),
  });

  const data = await generateRes.json();
  if (!generateRes.ok) {
    return NextResponse.json(data, { status: generateRes.status });
  }

  return NextResponse.json({
    ...data,
    agentSurface: "request_design",
    toolsVersion: "2026-06-10",
  });
}
