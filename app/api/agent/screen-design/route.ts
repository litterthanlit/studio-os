import { NextRequest, NextResponse } from "next/server";
import {
  agentConvexAuthFromResult,
  authorizeAgentProjectAccess,
} from "@/lib/agent/agent-api-auth";
import {
  buildCanvasSummary,
  getArtboardTree,
} from "@/lib/agent/canvas-agent-ops";
import { agentLoadCanvas } from "@/lib/agent/convex-agent-client";
import { designNodeToHTML } from "@/lib/canvas/design-node-to-html";
import { designNodeToTSX } from "@/lib/canvas/design-node-to-tsx";
import { normalizeRemoteCanvasState } from "@/lib/canvas/canvas-convex-sync";
import { API_LIMITS, readGuardedJson } from "@/lib/security/api-guard";

/**
 * POST /api/agent/screen-design
 * Returns a screen's DesignNode tree or rendered HTML.
 */
export async function POST(req: NextRequest) {
  const guarded = await readGuardedJson<{
    projectId: string;
    artboardId: string;
    format?: "designnode" | "html" | "tsx";
  }>(req, {
    requireAuth: false,
    maxBytes: API_LIMITS.aiRequestBytes,
    rateLimit: { namespace: "agent-screen-design", limit: 120, windowMs: 60 * 60 * 1000 },
  });
  if (!guarded.ok) return guarded.response;

  const { projectId, artboardId, format = "designnode" } = guarded.body;
  if (!projectId || !artboardId) {
    return NextResponse.json({ error: "projectId and artboardId are required" }, { status: 400 });
  }

  const auth = await authorizeAgentProjectAccess(req, projectId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const doc = await agentLoadCanvas(agentConvexAuthFromResult(auth), auth.projectId!);
    const canvasState = doc?.state
      ? normalizeRemoteCanvasState(doc.state)
      : normalizeRemoteCanvasState(null);
    const tree = getArtboardTree(canvasState, artboardId);
    if (!tree) {
      return NextResponse.json({ error: "Artboard not found or not a DesignNode tree" }, { status: 404 });
    }

    if (format === "html") {
      const html = designNodeToHTML(tree);
      return NextResponse.json({
        projectId,
        artboardId,
        format,
        html,
        summary: buildCanvasSummary(canvasState),
      });
    }

    if (format === "tsx") {
      const artboard = canvasState.items.find(
        (item) => item.kind === "artboard" && item.id === artboardId,
      );
      const componentName =
        artboard && artboard.kind === "artboard"
          ? artboard.name.replace(/[^a-zA-Z0-9]+/g, "") || "StudioExport"
          : "StudioExport";
      const safeName = /^[A-Z]/.test(componentName)
        ? componentName
        : `Studio${componentName}`;
      const tsx = designNodeToTSX(tree, { componentName: safeName });
      return NextResponse.json({
        projectId,
        artboardId,
        format,
        tsx,
        componentName: safeName,
        summary: buildCanvasSummary(canvasState),
      });
    }

    return NextResponse.json({
      projectId,
      artboardId,
      format,
      pageTree: tree,
      summary: buildCanvasSummary(canvasState),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load screen design";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
