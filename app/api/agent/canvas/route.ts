import { NextRequest, NextResponse } from "next/server";
import {
  agentConvexAuthFromResult,
  authorizeAgentProjectAccess,
} from "@/lib/agent/agent-api-auth";
import {
  applyCanvasAgentOperations,
  buildCanvasSummary,
  type CanvasAgentOperation,
} from "@/lib/agent/canvas-agent-ops";
import {
  agentLoadCanvas,
  agentSaveCanvas,
} from "@/lib/agent/convex-agent-client";
import { defaultDesignTokens } from "@/lib/agent/default-design-tokens";
import type { DesignSystemTokens } from "@/lib/canvas/generate-system";
import { normalizeRemoteCanvasState } from "@/lib/canvas/canvas-convex-sync";
import type { TasteProfile } from "@/types/taste-profile";
import { API_LIMITS, readGuardedJson } from "@/lib/security/api-guard";

/**
 * POST /api/agent/canvas
 *
 * Read: { action: "get", projectId }
 * Write: { action: "write", projectId, operations, expectedRevision? }
 */
export async function POST(req: NextRequest) {
  const guarded = await readGuardedJson<{
    action: "get" | "write";
    projectId: string;
    operations?: CanvasAgentOperation[];
    expectedRevision?: number;
    tasteProfile?: TasteProfile | null;
    designTokens?: DesignSystemTokens | null;
  }>(req, {
    requireAuth: false,
    maxBytes: API_LIMITS.aiRequestBytes,
    rateLimit: { namespace: "agent-canvas", limit: 120, windowMs: 60 * 60 * 1000 },
  });
  if (!guarded.ok) return guarded.response;

  const { action, projectId, operations, expectedRevision, tasteProfile, designTokens } =
    guarded.body;

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  const auth = await authorizeAgentProjectAccess(req, projectId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const convexAuth = agentConvexAuthFromResult(auth);

  if (action === "get") {
    try {
      const doc = await agentLoadCanvas(convexAuth, auth.projectId!);
      const canvasState = doc?.state
        ? normalizeRemoteCanvasState(doc.state)
        : normalizeRemoteCanvasState(null);

      return NextResponse.json({
        projectId,
        revision: doc?.revision ?? null,
        canvasState,
        summary: buildCanvasSummary(canvasState),
        tasteProfile: tasteProfile ?? null,
        designTokens: designTokens ?? defaultDesignTokens(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load canvas";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  if (action === "write") {
    if (!Array.isArray(operations) || operations.length === 0) {
      return NextResponse.json({ error: "operations array is required" }, { status: 400 });
    }

    try {
      const doc = await agentLoadCanvas(convexAuth, auth.projectId!);
      const currentState = doc?.state
        ? normalizeRemoteCanvasState(doc.state)
        : normalizeRemoteCanvasState(null);

      const { state, applied, errors } = applyCanvasAgentOperations(currentState, operations);
      if (applied.length === 0) {
        return NextResponse.json(
          { error: "No operations applied", details: errors },
          { status: 400 },
        );
      }

      const saveResult = await agentSaveCanvas(convexAuth, {
        projectId: auth.projectId!,
        state,
        expectedRevision: expectedRevision ?? doc?.revision,
        schemaVersion: state.schemaVersion,
      });

      return NextResponse.json({
        projectId,
        revision: saveResult.revision,
        applied,
        errors,
        summary: buildCanvasSummary(state),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to write canvas";
      const status = message.includes("CANVAS_REVISION_CONFLICT") ? 409 : 502;
      return NextResponse.json({ error: message }, { status });
    }
  }

  return NextResponse.json({ error: "action must be get or write" }, { status: 400 });
}
