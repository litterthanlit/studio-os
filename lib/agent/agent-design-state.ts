// lib/agent/agent-design-state.ts
// Every agent route resolves taste + tokens the same way: what the caller passed
// wins; otherwise the project's stored design state (Convex); otherwise defaults.

import type { Id } from "@/convex/_generated/dataModel";
import type { DesignSystemTokens } from "@/lib/canvas/generate-system";
import type { TasteProfile } from "@/types/taste-profile";
import { defaultDesignTokens } from "./default-design-tokens";
import {
  agentLoadDesignState,
  type AgentConvexAuth,
  type AgentDesignStateRow,
} from "./convex-agent-client";

export type DesignStateSource = "request" | "project" | "default" | "none";

export type ResolvedAgentDesignState = {
  tasteProfile: TasteProfile | null;
  designTokens: DesignSystemTokens;
  /** Tokens exactly as stored/passed (null when defaults were used). */
  storedDesignTokens: DesignSystemTokens | null;
  source: { tasteProfile: DesignStateSource; designTokens: DesignStateSource };
};

function isTasteProfile(value: unknown): value is TasteProfile {
  return Boolean(value) && typeof value === "object" && typeof (value as TasteProfile).summary === "string";
}

function isDesignTokens(value: unknown): value is DesignSystemTokens {
  return Boolean(value) && typeof value === "object" && typeof (value as DesignSystemTokens).colors === "object";
}

export async function resolveAgentDesignState(args: {
  auth: AgentConvexAuth;
  projectId: Id<"projects">;
  tasteProfile?: TasteProfile | null;
  designTokens?: DesignSystemTokens | null;
  /** Injection point for proofs; defaults to the Convex loader. */
  load?: (auth: AgentConvexAuth, projectId: Id<"projects">) => Promise<AgentDesignStateRow>;
}): Promise<ResolvedAgentDesignState> {
  const passedTaste = isTasteProfile(args.tasteProfile) ? args.tasteProfile : null;
  const passedTokens = isDesignTokens(args.designTokens) ? args.designTokens : null;

  let stored: AgentDesignStateRow = null;
  if (!passedTaste || !passedTokens) {
    try {
      stored = await (args.load ?? agentLoadDesignState)(args.auth, args.projectId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn("[agent-design-state] Could not load project design state:", message);
    }
  }

  const storedTaste = isTasteProfile(stored?.tasteProfile) ? stored.tasteProfile : null;
  const storedTokens = isDesignTokens(stored?.designTokens) ? stored.designTokens : null;

  const tasteProfile = passedTaste ?? storedTaste;
  const tokens = passedTokens ?? storedTokens;
  return {
    tasteProfile,
    designTokens: tokens ?? defaultDesignTokens(),
    storedDesignTokens: tokens,
    source: {
      tasteProfile: passedTaste ? "request" : storedTaste ? "project" : "none",
      designTokens: passedTokens ? "request" : storedTokens ? "project" : "default",
    },
  };
}
