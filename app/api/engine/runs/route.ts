import { after, NextRequest, NextResponse } from "next/server";
import { createEngineDeps } from "@/lib/engine/deps";
import { startPipelineRun } from "@/lib/engine/pipeline";
import { engineAuthFor, parseEngineInput, type EngineRunRequestBody } from "@/lib/engine/request";
import { API_LIMITS, readGuardedJson } from "@/lib/security/api-guard";

/**
 * POST /api/engine/runs — start a design pipeline run (editor, benchmarks).
 * Answers 202 { runId } at once; the run executes after the response and
 * reports real progress on its generationRuns row (poll /api/engine/runs/:id or
 * subscribe to the Convex row).
 */
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const guarded = await readGuardedJson<EngineRunRequestBody>(req, {
    requireAuth: true,
    maxBytes: API_LIMITS.aiRequestBytes,
    rateLimit: { namespace: "canvas-generate", limit: 20, windowMs: 60 * 60 * 1000 },
  });
  if (!guarded.ok) return guarded.response;

  const parsed = parseEngineInput(guarded.body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const auth = engineAuthFor(guarded.userId, parsed.input.projectId);
  try {
    const deps = createEngineDeps({ auth, projectId: parsed.input.projectId });
    const started = await startPipelineRun({ input: parsed.input, deps, schedule: (task) => after(task) });
    return NextResponse.json({ ...started, serverBacked: Boolean(auth.serviceSecret) }, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start run";
    const status = /FORBIDDEN|NOT_FOUND/.test(message) ? 403 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
