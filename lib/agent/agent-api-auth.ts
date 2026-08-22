import { NextRequest } from "next/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getConvexClient } from "@/lib/convex/server";
import { hashAgentAccessToken, isAgentPersonalAccessToken } from "@/lib/agent/agent-token";

export type AgentAuthResult =
  | {
      ok: true;
      userId: string | null;
      actingUserId?: string;
      boundProjectId?: string;
      devBypass: boolean;
      bearerToken?: string;
      serviceSecret?: string;
    }
  | { ok: false; status: number; error: string };

export function isDevAuthBypassEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.STUDIO_OS_DEV_AUTH_BYPASS !== "false"
  );
}

function extractBearerToken(req: NextRequest | Request): string | null {
  const header = req.headers.get("authorization");
  return header?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;
}

async function authorizeAgentPersonalAccessToken(token: string): Promise<AgentAuthResult> {
  const serviceSecret = process.env.CONVEX_INTERNAL_API_SECRET?.trim();
  const client = getConvexClient();
  if (!client || !serviceSecret) {
    return { ok: false, status: 503, error: "Convex is not configured" };
  }

  try {
    const tokenHash = await hashAgentAccessToken(token);
    const resolved = await client.mutation(api.agentTokens.resolve, {
      tokenHash,
      serviceSecret,
    });
    if (!resolved?.userId) {
      return { ok: false, status: 401, error: "Invalid auth token" };
    }
    return {
      ok: true,
      userId: resolved.userId,
      actingUserId: resolved.userId,
      boundProjectId: resolved.projectId ?? undefined,
      devBypass: false,
      bearerToken: token,
      serviceSecret,
    };
  } catch {
    return { ok: false, status: 401, error: "Invalid auth token" };
  }
}

async function authorizeConvexJwt(token: string): Promise<AgentAuthResult> {
  const client = getConvexClient();
  if (!client) {
    return { ok: false, status: 503, error: "Convex is not configured" };
  }

  client.setAuth(token);
  try {
    const user = await client.query(api.users.current, {});
    if (!user) {
      return { ok: false, status: 401, error: "Invalid auth token" };
    }
    return { ok: true, userId: user._id, actingUserId: user._id, devBypass: false, bearerToken: token };
  } catch {
    return { ok: false, status: 401, error: "Invalid auth token" };
  } finally {
    client.clearAuth();
  }
}

export async function authorizeAgentBearerToken(token: string | null | undefined): Promise<AgentAuthResult> {
  if (token && isAgentPersonalAccessToken(token)) {
    return authorizeAgentPersonalAccessToken(token);
  }

  if (token) {
    return authorizeConvexJwt(token);
  }

  if (isDevAuthBypassEnabled()) {
    return { ok: true, userId: null, devBypass: true };
  }

  return { ok: false, status: 401, error: "Sign in required (Bearer token or service secret)" };
}

export async function authorizeAgentRequest(req: NextRequest | Request): Promise<AgentAuthResult> {
  const serviceSecret = process.env.CONVEX_INTERNAL_API_SECRET?.trim();
  const providedSecret = req.headers.get("x-studio-os-service-secret")?.trim();
  if (serviceSecret && providedSecret && serviceSecret === providedSecret) {
    return { ok: true, userId: null, devBypass: false, serviceSecret: providedSecret };
  }

  const token = extractBearerToken(req);
  if (token && isAgentPersonalAccessToken(token)) {
    return authorizeAgentPersonalAccessToken(token);
  }

  if (isDevAuthBypassEnabled()) {
    return { ok: true, userId: null, devBypass: true };
  }

  if (!token) {
    return { ok: false, status: 401, error: "Sign in required (Bearer token or service secret)" };
  }

  return authorizeConvexJwt(token);
}

export async function authorizeAgentProjectAccess(
  req: NextRequest | Request,
  projectId: string,
): Promise<AgentAuthResult & { projectId?: Id<"projects"> }> {
  const auth = await authorizeAgentRequest(req);
  if (!auth.ok) return auth;

  if (!projectId?.trim()) {
    return { ok: false, status: 400, error: "projectId is required" };
  }

  if (auth.boundProjectId && auth.boundProjectId !== projectId) {
    return { ok: false, status: 403, error: "Token is scoped to a different project" };
  }

  if (auth.devBypass) {
    return { ...auth, projectId: projectId as Id<"projects"> };
  }

  const client = getConvexClient();
  if (!client) {
    return { ok: false, status: 503, error: "Convex is not configured" };
  }

  if (auth.actingUserId && auth.serviceSecret) {
    try {
      await client.query(api.projects.assertProjectAccessForUserAgent, {
        projectId: projectId as Id<"projects">,
        actingUserId: auth.actingUserId as Id<"users">,
        serviceSecret: auth.serviceSecret,
      });
      return { ...auth, projectId: projectId as Id<"projects"> };
    } catch {
      return { ok: false, status: 403, error: "Project not found or access denied" };
    }
  }

  if (auth.serviceSecret) {
    try {
      await client.query(api.projects.assertProjectAccessForAgent, {
        projectId: projectId as Id<"projects">,
        serviceSecret: auth.serviceSecret,
      });
      return { ...auth, projectId: projectId as Id<"projects"> };
    } catch {
      return { ok: false, status: 403, error: "Project not found or access denied" };
    }
  }

  if (!auth.bearerToken) {
    return { ok: false, status: 401, error: "Sign in required" };
  }

  client.setAuth(auth.bearerToken);
  try {
    await client.query(api.projects.loadCanvas, { projectId: projectId as Id<"projects"> });
    return { ...auth, projectId: projectId as Id<"projects"> };
  } catch {
    return { ok: false, status: 403, error: "Project not found or access denied" };
  } finally {
    client.clearAuth();
  }
}

export function agentConvexAuthFromResult(auth: Extract<AgentAuthResult, { ok: true }>) {
  return {
    bearerToken: auth.actingUserId ? null : (auth.bearerToken ?? null),
    serviceSecret: auth.serviceSecret ?? null,
    actingUserId: auth.actingUserId ?? null,
  };
}
