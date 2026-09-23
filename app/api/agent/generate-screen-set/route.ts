import { after, NextRequest, NextResponse } from "next/server";
import { agentRunStoreFor, startAgentRun } from "@/lib/agent/agent-runs";
import {
  agentConvexAuthFromResult,
  authorizeAgentProjectAccess,
} from "@/lib/agent/agent-api-auth";
import { executeAgentGenerateScreenSet } from "@/lib/agent/agent-generation";
import type { FidelityMode } from "@/lib/canvas/directive-compiler";
import type { TasteProfile } from "@/types/taste-profile";
import type { DesignSystemTokens } from "@/lib/canvas/generate-system";
import { API_LIMITS, readGuardedJson } from "@/lib/security/api-guard";

/**
 * POST /api/agent/generate-screen-set
 * Plans and generates multiple app screens with shared shell context.
 * Taste and tokens: request body, else the project's stored design state, else defaults.
 * `async: true` (the MCP default) queues a run and answers { runId, status } at once;
 * the run executes after the response and is polled via /api/agent/runs/:id.
 */
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const guarded = await readGuardedJson<{
    projectId: string;
    prompt: string;
    breakpoint?: "desktop" | "mobile";
    fidelityMode?: FidelityMode;
    tasteProfile?: TasteProfile | null;
    designTokens?: DesignSystemTokens | null;
    async?: boolean;
  }>(req, {
    requireAuth: false,
    maxBytes: API_LIMITS.aiRequestBytes,
    rateLimit: { namespace: "agent-generate-screen-set", limit: 10, windowMs: 60 * 60 * 1000 },
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

  const convexAuth = agentConvexAuthFromResult(auth);
  const { async: runAsync, ...runInput } = guarded.body;

  if (runAsync) {
    try {
      const store = agentRunStoreFor(convexAuth);
      const started = await startAgentRun({
        store,
        projectId: auth.projectId!,
        kind: "screen-set",
        // Compact run input (taste/tokens are resolved at execution; only record whether they were passed).
        input: JSON.parse(JSON.stringify({
          prompt: prompt.trim().slice(0, 2000),
          breakpoint: runInput.breakpoint,
          fidelityMode: runInput.fidelityMode,
          tasteProfilePassed: Boolean(runInput.tasteProfile),
          designTokensPassed: Boolean(runInput.designTokens),
        })),
        schedule: (task) => after(task),
        execute: (progress) =>
          executeAgentGenerateScreenSet({
            ...runInput,
            auth: convexAuth,
            projectId: auth.projectId!,
            prompt,
            onProgress: progress,
          }),
      });
      return NextResponse.json({ ...started, pollWith: "get_run" }, { status: 202 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to start run";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  try {
    const outcome = await executeAgentGenerateScreenSet({
      auth: convexAuth,
      projectId: auth.projectId!,
      prompt,
      breakpoint: guarded.body.breakpoint,
      fidelityMode: guarded.body.fidelityMode,
      tasteProfile: guarded.body.tasteProfile,
      designTokens: guarded.body.designTokens,
    });
    return NextResponse.json(outcome.body, { status: outcome.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate screen set";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
