import { after, NextRequest, NextResponse } from "next/server";
import { createEngineDeps } from "@/lib/engine/deps";
import { executePipeline } from "@/lib/engine/pipeline";
import { engineAuthFor } from "@/lib/engine/request";
import { runStoreFor } from "@/lib/engine/run-store";
import type { EngineInput } from "@/lib/engine/types";
import { guardRequest } from "@/lib/security/api-guard";

const RUN_ID = /^[A-Za-z0-9_-]{6,64}$/;
export const maxDuration = 300;

async function context(req: NextRequest, params: Promise<{ id: string }>) {
  const guarded = await guardRequest(req, {
    requireAuth: true,
    rateLimit: { namespace: "engine-runs", limit: 2400, windowMs: 60 * 60 * 1000 },
  });
  if (!guarded.ok) return { error: guarded.response } as const;
  const { id } = await params;
  if (!RUN_ID.test(id)) return { error: NextResponse.json({ error: "Invalid run id" }, { status: 400 }) } as const;
  const projectId = req.nextUrl.searchParams.get("projectId") ?? "";
  const auth = engineAuthFor(guarded.userId, projectId);
  return { id, auth, projectId } as const;
}

/** GET /api/engine/runs/:id?projectId= — run status, steps, progress and result. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await context(req, params);
  if ("error" in ctx) return ctx.error;
  try {
    const run = await runStoreFor(ctx.auth).get(ctx.id);
    return run ? NextResponse.json(run) : NextResponse.json({ error: "Run not found" }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }
}

/** POST /api/engine/runs/:id?projectId= { action: "resume" } — resume a failed run from its last checkpoint. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await context(req, params);
  if ("error" in ctx) return ctx.error;
  const store = runStoreFor(ctx.auth);
  const run = await store.get(ctx.id).catch(() => null);
  if (!run || !run.input) return NextResponse.json({ error: "Run not found" }, { status: 404 });
  if (run.status !== "failed") return NextResponse.json({ error: `Run is ${run.status}` }, { status: 409 });

  const input = run.input as unknown as EngineInput;
  const deps = createEngineDeps({ auth: ctx.auth, projectId: input.projectId, store });
  after(async () => {
    await executePipeline({ runId: ctx.id, input, deps });
  });
  return NextResponse.json({ runId: ctx.id, status: "resuming" }, { status: 202 });
}
