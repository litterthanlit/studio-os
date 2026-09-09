import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getConvexClient } from "@/lib/convex/server";

export type AgentConvexAuth = {
  bearerToken?: string | null;
  serviceSecret?: string | null;
  actingUserId?: string | null;
};

function usesOwnerScopedAgentAuth(auth: AgentConvexAuth): boolean {
  return Boolean(auth.actingUserId && auth.serviceSecret);
}

export function createAgentConvexClient(auth: AgentConvexAuth): ConvexHttpClient | null {
  const client = getConvexClient();
  if (!client) return null;
  if (auth.bearerToken && !usesOwnerScopedAgentAuth(auth)) {
    client.setAuth(auth.bearerToken);
  }
  return client;
}

export async function agentListProjects(auth: AgentConvexAuth) {
  const client = createAgentConvexClient(auth);
  if (!client) throw new Error("Convex is not configured");

  try {
    if (usesOwnerScopedAgentAuth(auth)) {
      return await client.query(api.projects.listMineForUserAgent, {
        actingUserId: auth.actingUserId as Id<"users">,
        serviceSecret: auth.serviceSecret!,
      });
    }
    if (!auth.bearerToken) {
      throw new Error("Bearer token required to list projects");
    }
    return await client.query(api.projects.listMine, {});
  } finally {
    client.clearAuth();
  }
}

export async function agentLoadCanvas(
  auth: AgentConvexAuth,
  projectId: Id<"projects">,
) {
  const client = createAgentConvexClient(auth);
  if (!client) throw new Error("Convex is not configured");

  try {
    if (usesOwnerScopedAgentAuth(auth)) {
      return await client.query(api.projects.loadCanvasForUserAgent, {
        projectId,
        actingUserId: auth.actingUserId as Id<"users">,
        serviceSecret: auth.serviceSecret!,
      });
    }
    if (auth.serviceSecret) {
      return await client.query(api.projects.loadCanvasForAgent, {
        projectId,
        serviceSecret: auth.serviceSecret,
      });
    }
    if (!auth.bearerToken) {
      throw new Error("Bearer token or service secret required");
    }
    return await client.query(api.projects.loadCanvas, { projectId });
  } finally {
    client.clearAuth();
  }
}

export async function agentSaveCanvas(
  auth: AgentConvexAuth,
  args: {
    projectId: Id<"projects">;
    state: unknown;
    expectedRevision?: number;
    schemaVersion?: number;
  },
) {
  // Same persist mutation family as the editor (`saveCanvas` → persistCanvasState).
  // expectedRevision is the shared canvasDocuments.revision agents and UI bump.
  const client = createAgentConvexClient(auth);
  if (!client) throw new Error("Convex is not configured");

  try {
    if (usesOwnerScopedAgentAuth(auth)) {
      return await client.mutation(api.projects.saveCanvasForUserAgent, {
        projectId: args.projectId,
        actingUserId: auth.actingUserId as Id<"users">,
        state: args.state,
        expectedRevision: args.expectedRevision,
        schemaVersion: args.schemaVersion,
        serviceSecret: auth.serviceSecret!,
      });
    }
    if (auth.serviceSecret) {
      return await client.mutation(api.projects.saveCanvasForAgent, {
        projectId: args.projectId,
        state: args.state,
        expectedRevision: args.expectedRevision,
        schemaVersion: args.schemaVersion,
        serviceSecret: auth.serviceSecret,
      });
    }
    if (!auth.bearerToken) {
      throw new Error("Bearer token or service secret required");
    }
    return await client.mutation(api.projects.saveCanvas, {
      projectId: args.projectId,
      state: args.state,
      expectedRevision: args.expectedRevision,
      schemaVersion: args.schemaVersion,
    });
  } finally {
    client.clearAuth();
  }
}

export async function agentAssertProjectAccess(
  auth: AgentConvexAuth,
  projectId: Id<"projects">,
) {
  const client = createAgentConvexClient(auth);
  if (!client) throw new Error("Convex is not configured");

  try {
    if (usesOwnerScopedAgentAuth(auth)) {
      await client.query(api.projects.assertProjectAccessForUserAgent, {
        projectId,
        actingUserId: auth.actingUserId as Id<"users">,
        serviceSecret: auth.serviceSecret!,
      });
      return;
    }
    if (auth.serviceSecret) {
      await client.query(api.projects.assertProjectAccessForAgent, {
        projectId,
        serviceSecret: auth.serviceSecret,
      });
      return;
    }
    if (!auth.bearerToken) {
      throw new Error("Bearer token or service secret required");
    }
    await client.query(api.projects.loadCanvas, { projectId });
  } finally {
    client.clearAuth();
  }
}
