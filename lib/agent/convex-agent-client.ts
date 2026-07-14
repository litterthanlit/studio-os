import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getConvexClient } from "@/lib/convex/server";

export type AgentConvexAuth = {
  bearerToken?: string | null;
  serviceSecret?: string | null;
};

export function createAgentConvexClient(auth: AgentConvexAuth): ConvexHttpClient | null {
  const client = getConvexClient();
  if (!client) return null;
  if (auth.bearerToken) {
    client.setAuth(auth.bearerToken);
  }
  return client;
}

export async function agentListProjects(auth: AgentConvexAuth) {
  const client = createAgentConvexClient(auth);
  if (!client) throw new Error("Convex is not configured");
  if (!auth.bearerToken) {
    throw new Error("Bearer token required to list projects");
  }
  try {
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
  const client = createAgentConvexClient(auth);
  if (!client) throw new Error("Convex is not configured");

  try {
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
