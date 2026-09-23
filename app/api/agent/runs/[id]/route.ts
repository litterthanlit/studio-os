import { NextRequest, NextResponse } from "next/server";
import { agentConvexAuthFromResult, authorizeAgentRequest } from "@/lib/agent/agent-api-auth";
import { agentRunStoreFor } from "@/lib/agent/agent-runs";
import { guardRequest } from "@/lib/security/api-guard";

const RUN_ID = /^[A-Za-z0-9_-]{6,64}$/;

/**
 * GET|POST /api/agent/runs/:id — poll an async agent run (MCP `get_run`).
 * Access is enforced by the run store (project owner / agent token scope).
 */
async function handle(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const guarded = await guardRequest(req, {
    requireAuth: false,
    rateLimit: { namespace: "agent-runs", limit: 1200, windowMs: 60 * 60 * 1000 },
  });
  if (!guarded.ok) return guarded.response;

  const { id } = await context.params;
  if (!RUN_ID.test(id)) {
    return NextResponse.json({ error: "Invalid run id" }, { status: 400 });
  }

  const auth = await authorizeAgentRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const run = await agentRunStoreFor(agentConvexAuthFromResult(auth)).get(id);
    if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });
    if (auth.boundProjectId && auth.boundProjectId !== run.projectId) {
      return NextResponse.json({ error: "Token is scoped to a different project" }, { status: 403 });
    }
    return NextResponse.json(run);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load run";
    const status = /FORBIDDEN|NOT_FOUND/.test(message) ? 404 : 502;
    return NextResponse.json({ error: status === 404 ? "Run not found" : message }, { status });
  }
}

export const GET = handle;
export const POST = handle;
