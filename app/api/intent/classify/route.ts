import { NextRequest, NextResponse } from "next/server";
import { classifyIntent } from "@/lib/canvas/intent-classifier";
import type { IntentReferenceInput } from "@/types/intent-profile";
import { readGuardedJson } from "@/lib/security/api-guard";

/**
 * POST /api/intent/classify — model intent classification with heuristic fallback.
 * The editor routes screens vs variants on this, then passes the classification
 * to /api/canvas/generate-component so generation uses the same reading.
 */
export async function POST(req: NextRequest) {
  const guarded = await readGuardedJson<{
    prompt?: string;
    siteType?: string;
    references?: IntentReferenceInput[];
  }>(req, {
    requireAuth: true,
    maxBytes: 64 * 1024,
    rateLimit: { namespace: "intent-classify", limit: 120, windowMs: 60 * 60 * 1000 },
  });
  if (!guarded.ok) return guarded.response;

  const prompt = typeof guarded.body.prompt === "string" ? guarded.body.prompt.trim().slice(0, 4000) : "";
  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  const references = Array.isArray(guarded.body.references)
    ? guarded.body.references.slice(0, 12).map((ref) => ({
        id: typeof ref?.id === "string" ? ref.id.slice(0, 120) : undefined,
        weight: ref?.weight === "primary" || ref?.weight === "muted" ? ref.weight : ("default" as const),
        annotation: typeof ref?.annotation === "string" ? ref.annotation.slice(0, 500) : undefined,
      }))
    : undefined;

  const intentProfile = await classifyIntent({
    prompt,
    siteType: typeof guarded.body.siteType === "string" ? guarded.body.siteType.slice(0, 60) : undefined,
    references,
  });

  return NextResponse.json({ intentProfile });
}
