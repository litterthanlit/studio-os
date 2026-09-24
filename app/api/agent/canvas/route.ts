import { NextRequest, NextResponse } from "next/server";
import { writeCanvasWithRebase } from "@/lib/agent/canvas-write-rebase";
import { resolveAgentDesignState } from "@/lib/agent/agent-design-state";
import {
  agentConvexAuthFromResult,
  authorizeAgentProjectAccess,
} from "@/lib/agent/agent-api-auth";
import {
  buildCanvasSummary,
  getCanvasCode,
  getCanvasNode,
  type CanvasAgentOperation,
} from "@/lib/agent/canvas-agent-ops";
import {
  agentLoadCanvas,
  agentSaveCanvas,
} from "@/lib/agent/convex-agent-client";
import type { DesignSystemTokens } from "@/lib/canvas/generate-system";
import { normalizeRemoteCanvasState } from "@/lib/canvas/canvas-convex-sync";
import type { TasteProfile } from "@/types/taste-profile";
import { API_LIMITS, readGuardedJson } from "@/lib/security/api-guard";

/**
 * POST /api/agent/canvas
 *
 * Read: { action: "get", projectId }
 * Node: { action: "get_node", projectId, itemId, nodeId }
 * Code: { action: "get_code", projectId, itemId }
 * Write: { action: "write", projectId, operations, expectedRevision? }
 *
 * Writes apply via `applyCanvasDocumentWrite` then `agentSaveCanvas`, which
 * hits the same Convex `persistCanvasState` / revision counter as the editor.
 */
export async function POST(req: NextRequest) {
  const guarded = await readGuardedJson<{
    action: "get" | "get_node" | "get_code" | "write";
    projectId: string;
    itemId?: string;
    nodeId?: string;
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

  const {
    action,
    projectId,
    itemId,
    nodeId,
    operations,
    expectedRevision,
    tasteProfile,
    designTokens,
  } = guarded.body;

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
      const [doc, design] = await Promise.all([
        agentLoadCanvas(convexAuth, auth.projectId!),
        resolveAgentDesignState({
          auth: convexAuth,
          projectId: auth.projectId!,
          tasteProfile,
          designTokens,
        }),
      ]);
      const canvasState = doc?.state
        ? normalizeRemoteCanvasState(doc.state)
        : normalizeRemoteCanvasState(null);

      // Taste + tokens: request body, else the project's stored design state, else defaults.
      return NextResponse.json({
        projectId,
        revision: doc?.revision ?? null,
        canvasState,
        summary: buildCanvasSummary(canvasState),
        tasteProfile: design.tasteProfile,
        designTokens: design.designTokens,
        designState: design.source,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load canvas";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  if (action === "get_node") {
    if (!itemId || !nodeId) {
      return NextResponse.json({ error: "itemId and nodeId are required" }, { status: 400 });
    }
    try {
      const doc = await agentLoadCanvas(convexAuth, auth.projectId!);
      const canvasState = doc?.state
        ? normalizeRemoteCanvasState(doc.state)
        : normalizeRemoteCanvasState(null);
      const result = getCanvasNode(canvasState, itemId, nodeId);
      if (!result) {
        return NextResponse.json({ error: "Node not found" }, { status: 404 });
      }
      return NextResponse.json({
        projectId,
        revision: doc?.revision ?? null,
        ...result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load node";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  if (action === "get_code") {
    if (!itemId) {
      return NextResponse.json({ error: "itemId is required" }, { status: 400 });
    }
    try {
      const doc = await agentLoadCanvas(convexAuth, auth.projectId!);
      const canvasState = doc?.state
        ? normalizeRemoteCanvasState(doc.state)
        : normalizeRemoteCanvasState(null);
      const item = getCanvasCode(canvasState, itemId);
      if (!item) {
        return NextResponse.json({ error: "Code item not found" }, { status: 404 });
      }
      return NextResponse.json({
        projectId,
        revision: doc?.revision ?? null,
        item: {
          id: item.id,
          kind: item.kind,
          name: item.name,
          language: item.language,
          content: item.content,
          x: item.x,
          y: item.y,
          width: item.width,
          height: item.height,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load code item";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  if (action === "write") {
    if (!Array.isArray(operations) || operations.length === 0) {
      return NextResponse.json({ error: "operations array is required" }, { status: 400 });
    }

    try {
      // Without a caller-pinned expectedRevision, a designer save between load and
      // save is rebased: reload, re-apply the same operations, retry (up to 3).
      const write = await writeCanvasWithRebase({
        load: () => agentLoadCanvas(convexAuth, auth.projectId!),
        save: (payload) => agentSaveCanvas(convexAuth, { projectId: auth.projectId!, ...payload }),
        buildOperations: () => operations,
        pinnedRevision: typeof expectedRevision === "number" ? expectedRevision : undefined,
      });
      if (write.applied.length === 0 || !write.save) {
        return NextResponse.json(
          { error: "No operations applied", details: write.errors },
          { status: 400 },
        );
      }

      return NextResponse.json({
        projectId,
        revision: write.save.revision,
        applied: write.applied,
        errors: write.errors,
        rebased: write.rebased,
        // false when nothing in the saved canvas changed (e.g. a selection-only write).
        persisted: !write.save.unchanged,
        // Agent selection never reaches the open editor yet; report it honestly.
        ...(write.selection ? { selection: write.selection } : {}),
        summary: buildCanvasSummary(write.state),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to write canvas";
      const status = message.includes("CANVAS_REVISION_CONFLICT") ? 409 : 502;
      return NextResponse.json({ error: message }, { status });
    }
  }

  return NextResponse.json({ error: "action must be get, get_node, get_code, or write" }, { status: 400 });
}
