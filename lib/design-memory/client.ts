// lib/design-memory/client.ts
// Server-side Design Memory client. Picks the Convex access variant from the
// caller's auth exactly like lib/agent/convex-agent-client.ts:
//   actingUserId + serviceSecret → …ForUserAgent
//   serviceSecret                → …ForAgent
//   bearer token                 → owner function (Convex identity)

import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { createAgentConvexClient, type AgentConvexAuth } from "@/lib/agent/convex-agent-client";
import type { DesignBrief, DesignMemorySnapshot, Preference, Provenance, TasteLayerKind } from "./types";

type Variant = "owner" | "agent" | "userAgent";

function variantFor(auth: AgentConvexAuth): Variant {
  if (auth.actingUserId && auth.serviceSecret) return "userAgent";
  if (auth.serviceSecret) return "agent";
  if (auth.bearerToken) return "owner";
  throw new Error("Bearer token or service secret required");
}

function functionName(base: string, variant: Variant): string {
  return variant === "owner" ? base : variant === "agent" ? `${base}ForAgent` : `${base}ForUserAgent`;
}

function accessArgs(auth: AgentConvexAuth, variant: Variant): Record<string, unknown> {
  if (variant === "userAgent") return { serviceSecret: auth.serviceSecret, actingUserId: auth.actingUserId };
  if (variant === "agent") return { serviceSecret: auth.serviceSecret };
  return {};
}

/** Which Convex function a call resolves to for this auth (exported for proofs). */
export function resolveDesignMemoryFunction(auth: AgentConvexAuth, base: string): { name: string; args: Record<string, unknown> } {
  const variant = variantFor(auth);
  return { name: functionName(base, variant), args: accessArgs(auth, variant) };
}

async function call<T>(
  auth: AgentConvexAuth,
  kind: "query" | "mutation",
  base: string,
  args: Record<string, unknown>,
): Promise<T> {
  const variant = variantFor(auth);
  const client = createAgentConvexClient(auth);
  if (!client) throw new Error("Convex is not configured");
  try {
    const fn = (api.designMemory as Record<string, unknown>)[functionName(base, variant)];
    const payload = { ...args, ...accessArgs(auth, variant) };
    return (kind === "query" ? await client.query(fn as never, payload as never) : await client.mutation(fn as never, payload as never)) as T;
  } finally {
    client.clearAuth();
  }
}

export type DesignMemoryClient = {
  getSnapshot(projectId: string): Promise<DesignMemorySnapshot>;
  saveBrief(projectId: string, brief: Omit<DesignBrief, "id" | "projectId" | "version" | "createdAt">): Promise<{ briefId: string; version: number; createdAt: number }>;
  saveTasteLayer(projectId: string, layer: { kind: TasteLayerKind; data: unknown; provenance: Provenance[]; cacheKey?: string }): Promise<{ layerId: string }>;
  saveTokenSet(projectId: string, set: { name?: string; tokens: unknown; dtcg?: unknown; modes?: unknown }): Promise<{ tokenSetId: string }>;
  getReferenceAnalysis(projectId: string, key: { assetHash: string; analyzerVersion: string }): Promise<{ measured: unknown; perceived: unknown; confidence: number } | null>;
  saveReferenceAnalysis(projectId: string, analysis: { assetHash: string; analyzerVersion: string; measured: unknown; perceived: unknown; confidence: number }): Promise<{ analysisId: string }>;
  listPreferences(projectId: string, status?: Preference["status"]): Promise<Preference[]>;
  proposePreference(projectId: string, proposal: { dimension: string; rule: string; value: unknown; scope: Preference["scope"]; eventIds: string[]; confidence: number; origin: Preference["origin"] }): Promise<{ preferenceId: string; merged: boolean }>;
  setPreferenceStatus(projectId: string, preferenceId: string, status: Preference["status"], scope?: Preference["scope"]): Promise<{ preferenceId: string; status: string }>;
  migrateProjectDesignState(projectId: string): Promise<{ migrated: boolean; layers: number; tokenSet: boolean }>;
};

export function createDesignMemoryClient(auth: AgentConvexAuth): DesignMemoryClient {
  const pid = (projectId: string) => projectId as Id<"projects">;
  return {
    getSnapshot: (projectId) => call(auth, "query", "getSnapshot", { projectId: pid(projectId) }),
    saveBrief: (projectId, brief) => call(auth, "mutation", "saveBrief", { projectId: pid(projectId), brief }),
    saveTasteLayer: (projectId, layer) => call(auth, "mutation", "saveTasteLayer", { projectId: pid(projectId), ...layer }),
    saveTokenSet: (projectId, set) => call(auth, "mutation", "saveTokenSet", { projectId: pid(projectId), ...set }),
    getReferenceAnalysis: (projectId, key) => call(auth, "query", "getReferenceAnalysis", { projectId: pid(projectId), ...key }),
    saveReferenceAnalysis: (projectId, analysis) =>
      call(auth, "mutation", "saveReferenceAnalysis", { projectId: pid(projectId), ...analysis }),
    listPreferences: (projectId, status) =>
      call(auth, "query", "listPreferences", { projectId: pid(projectId), ...(status ? { status } : {}) }),
    proposePreference: (projectId, proposal) => call(auth, "mutation", "proposePreference", { projectId: pid(projectId), ...proposal }),
    setPreferenceStatus: (projectId, preferenceId, status, scope) =>
      call(auth, "mutation", "setPreferenceStatus", { projectId: pid(projectId), preferenceId, status, ...(scope ? { scope } : {}) }),
    migrateProjectDesignState: (projectId) => call(auth, "mutation", "migrateProjectDesignState", { projectId: pid(projectId) }),
  };
}
