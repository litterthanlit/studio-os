// lib/agent/agent-design-state-route.ts
// For agent routes authorized without a project scope (design contract, visual
// review, request design): when a projectId is present and taste or tokens were
// not passed, load the project's stored design state if the caller may access it.

import type { NextRequest } from "next/server";
import type { DesignSystemTokens } from "@/lib/canvas/generate-system";
import type { TasteProfile } from "@/types/taste-profile";
import { agentConvexAuthFromResult, authorizeAgentProjectAccess } from "./agent-api-auth";
import { resolveAgentDesignState } from "./agent-design-state";

export async function resolveDesignStateForOptionalProject(
  req: NextRequest | Request,
  projectId: string | null | undefined,
  passed: { tasteProfile?: TasteProfile | null; designTokens?: DesignSystemTokens | null },
): Promise<{ tasteProfile: TasteProfile | null; designTokens: DesignSystemTokens | null }> {
  const tasteProfile = passed.tasteProfile ?? null;
  const designTokens = passed.designTokens ?? null;
  if ((tasteProfile && designTokens) || !projectId?.trim()) {
    return { tasteProfile, designTokens };
  }

  const auth = await authorizeAgentProjectAccess(req, projectId);
  if (!auth.ok || !auth.projectId) return { tasteProfile, designTokens };

  const design = await resolveAgentDesignState({
    auth: agentConvexAuthFromResult(auth),
    projectId: auth.projectId,
    tasteProfile,
    designTokens,
  });
  return { tasteProfile: design.tasteProfile, designTokens: design.storedDesignTokens };
}
