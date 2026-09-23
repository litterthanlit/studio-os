import { NextRequest, NextResponse } from "next/server";
import {
  agentConvexAuthFromResult,
  authorizeAgentProjectAccess,
} from "@/lib/agent/agent-api-auth";
import { executeAgentGenerateScreen } from "@/lib/agent/agent-generation";
import type { FidelityMode } from "@/lib/canvas/directive-compiler";
import type { TasteProfile } from "@/types/taste-profile";
import type { DesignSystemTokens } from "@/lib/canvas/generate-system";
import { API_LIMITS, readGuardedJson } from "@/lib/security/api-guard";

/**
 * POST /api/agent/generate-screen
 * Generates a screen from project context and writes it to the canvas.
 * Taste and tokens: request body, else the project's stored design state, else defaults.
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

  const { projectId, prompt } = guarded.body;
  if (!projectId || !prompt?.trim()) {
    return NextResponse.json({ error: "projectId and prompt are required" }, { status: 400 });
  }

  const auth = await authorizeAgentProjectAccess(req, projectId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const outcome = await executeAgentGenerateScreen({
      auth: agentConvexAuthFromResult(auth),
      projectId: auth.projectId!,
      prompt,
      breakpoint: guarded.body.breakpoint,
      name: guarded.body.name,
      fidelityMode: guarded.body.fidelityMode,
      tasteProfile: guarded.body.tasteProfile,
      designTokens: guarded.body.designTokens,
    });
    return NextResponse.json(outcome.body, { status: outcome.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate screen";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
