// lib/engine/request.ts
// Shared request handling for the engine run routes: validate the body into an
// EngineInput and derive the caller's run-store / design-memory auth.

import type { AgentConvexAuth } from "@/lib/agent/convex-agent-client";
import { isConvexConfigured } from "@/lib/convex/is-configured";
import type { EngineInput, EngineReference } from "./types";

const CONVEX_ID = /^[a-z0-9]{16,40}$/;

export type EngineRunRequestBody = {
  projectId?: string;
  mode?: "auto" | "screen" | "screen-set";
  target?: "editor" | "benchmark";
  prompt?: string;
  siteType?: string;
  siteName?: string;
  fidelityMode?: "close" | "balanced" | "push";
  breakpoint?: "desktop" | "mobile";
  references?: Array<Partial<EngineReference>>;
  tasteProfile?: EngineInput["tasteProfile"];
  designTokens?: EngineInput["designTokens"];
};

export function parseEngineInput(body: EngineRunRequestBody): { ok: true; input: EngineInput } | { ok: false; error: string } {
  const projectId = typeof body.projectId === "string" ? body.projectId.trim().slice(0, 120) : "";
  const prompt = typeof body.prompt === "string" ? body.prompt.trim().slice(0, 4000) : "";
  if (!projectId || !prompt) return { ok: false, error: "projectId and prompt are required" };

  const references: EngineReference[] = (Array.isArray(body.references) ? body.references : [])
    .filter((ref): ref is Partial<EngineReference> & { url: string } => Boolean(ref) && typeof ref.url === "string" && ref.url.length > 0)
    .slice(0, 12)
    .map((ref, index) => ({
      id: typeof ref.id === "string" && ref.id ? ref.id.slice(0, 120) : `reference-${index + 1}`,
      url: ref.url.slice(0, 4096),
      weight: ref.weight === "primary" || ref.weight === "muted" ? ref.weight : "default",
      ...(typeof ref.annotation === "string" && ref.annotation.trim() ? { annotation: ref.annotation.trim().slice(0, 500) } : {}),
      ...(typeof ref.contentHash === "string" ? { contentHash: ref.contentHash.slice(0, 64) } : {}),
    }));

  return {
    ok: true,
    input: {
      projectId,
      mode: body.mode === "screen" || body.mode === "screen-set" ? body.mode : "auto",
      target: body.target === "benchmark" ? "benchmark" : "editor",
      prompt,
      ...(body.siteType ? { siteType: String(body.siteType).slice(0, 60) } : {}),
      ...(body.siteName ? { siteName: String(body.siteName).slice(0, 80) } : {}),
      fidelityMode: body.fidelityMode === "close" || body.fidelityMode === "push" ? body.fidelityMode : "balanced",
      ...(body.breakpoint === "mobile" || body.breakpoint === "desktop" ? { breakpoint: body.breakpoint } : {}),
      references,
      ...(body.tasteProfile && typeof body.tasteProfile === "object" ? { tasteProfile: body.tasteProfile } : {}),
      ...(body.designTokens && typeof body.designTokens === "object" ? { designTokens: body.designTokens } : {}),
    },
  };
}

/**
 * Signed-in editor on a Convex project → owner-scoped server access (service
 * secret + acting user), so runs land in `generationRuns` and read design
 * memory. Otherwise (local project / dev bypass) → no credentials: in-memory
 * run store and request-supplied taste.
 */
export function engineAuthFor(userId: string | null, projectId: string): AgentConvexAuth {
  const serviceSecret = process.env.CONVEX_INTERNAL_API_SECRET?.trim();
  if (userId && serviceSecret && isConvexConfigured() && CONVEX_ID.test(projectId)) {
    return { serviceSecret, actingUserId: userId };
  }
  return {};
}
