import { NextRequest, NextResponse } from "next/server";
import {
  buildDesignContract,
  formatDesignContractMarkdown,
} from "@/lib/canvas/agent-design-contract";
import type { UnifiedCanvasState } from "@/lib/canvas/unified-canvas-state";
import type { DesignSystemTokens } from "@/lib/canvas/generate-system";
import type { TasteProfile } from "@/types/taste-profile";
import type { ProjectContext } from "@/types/agent-design-harness";
import { authorizeAgentRequest } from "@/lib/agent/agent-api-auth";
import { API_LIMITS, readGuardedJson } from "@/lib/security/api-guard";

export async function POST(req: NextRequest) {
  const auth = await authorizeAgentRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const guarded = await readGuardedJson<{
    projectId: string;
    projectName: string;
    canvasState: UnifiedCanvasState;
    tasteProfile?: TasteProfile | null;
    designTokens?: DesignSystemTokens | null;
    projectContext?: Partial<ProjectContext> | null;
    format?: "json" | "markdown" | "both";
  }>(req, {
    requireAuth: false,
    maxBytes: API_LIMITS.aiRequestBytes,
    rateLimit: { namespace: "agent-design-contract", limit: 60, windowMs: 60 * 60 * 1000 },
  });
  if (!guarded.ok) return guarded.response;

  const {
    projectId,
    projectName,
    canvasState,
    tasteProfile,
    designTokens,
    projectContext,
    format = "both",
  } = guarded.body;

  if (!projectId || !projectName || !canvasState) {
    return NextResponse.json(
      { error: "projectId, projectName, and canvasState are required" },
      { status: 400 },
    );
  }

  const contract = buildDesignContract({
    projectId,
    projectName,
    state: canvasState,
    tasteProfile: tasteProfile ?? null,
    designTokens: designTokens ?? null,
    projectContext: projectContext ?? null,
  });

  const markdown = format === "markdown" || format === "both"
    ? formatDesignContractMarkdown(contract)
    : undefined;

  return NextResponse.json({
    contract,
    markdown,
    recommendedAgentPrompt: contract.acceptanceCriteria.join("\n"),
  });
}
