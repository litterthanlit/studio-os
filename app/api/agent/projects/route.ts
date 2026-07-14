import { NextRequest, NextResponse } from "next/server";
import type { Doc } from "@/convex/_generated/dataModel";
import {
  agentConvexAuthFromResult,
  authorizeAgentRequest,
} from "@/lib/agent/agent-api-auth";
import { agentListProjects } from "@/lib/agent/convex-agent-client";
import { API_LIMITS, readGuardedJson } from "@/lib/security/api-guard";

/**
 * POST /api/agent/projects
 * List Convex projects for the authenticated user.
 */
export async function POST(req: NextRequest) {
  const auth = await authorizeAgentRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const guarded = await readGuardedJson<Record<string, never>>(req, {
    requireAuth: false,
    maxBytes: API_LIMITS.aiRequestBytes,
    rateLimit: { namespace: "agent-projects", limit: 60, windowMs: 60 * 60 * 1000 },
  });
  if (!guarded.ok) return guarded.response;

  if (auth.devBypass || auth.serviceSecret) {
    return NextResponse.json({
      projects: [],
      note: "list_projects requires a user Bearer token",
    });
  }

  try {
    const projects = await agentListProjects(agentConvexAuthFromResult(auth));
    return NextResponse.json({
      projects: projects.map((project: Doc<"projects">) => ({
        id: project._id,
        name: project.name,
        slug: project.slug,
        brief: project.brief ?? null,
        updatedAt: project.updatedAt,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list projects";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
