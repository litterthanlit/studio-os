import { NextRequest } from "next/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getConvexClient } from "@/lib/convex/server";

export type AgentAuthResult =
  | { ok: true; userId: string | null; devBypass: boolean; bearerToken?: string; serviceSecret?: string }
  | { ok: false; status: number; error: string };

function isDevAuthBypassEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.STUDIO_OS_DEV_AUTH_BYPASS !== "false"
  );
}

function extractBearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  return header?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;
}

export async function authorizeAgentRequest(req: NextRequest): Promise<AgentAuthResult> {
  const serviceSecret = process.env.CONVEX_INTERNAL_API_SECRET?.trim();
  const providedSecret = req.headers.get("x-studio-os-service-secret")?.trim();
  if (serviceSecret && providedSecret && serviceSecret === providedSecret) {
    return { ok: true, userId: null, devBypass: false, serviceSecret: providedSecret };
  }

  const devBypass = isDevAuthBypassEnabled();
  if (devBypass) {
    return { ok: true, userId: null, devBypass: true };
  }

  const token = extractBearerToken(req);
  if (!token) {
    return { ok: false, status: 401, error: "Sign in required (Bearer token or service secret)" };
  }

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
    return { ok: true, userId: user._id, devBypass: false, bearerToken: token };
  } catch {
    return { ok: false, status: 401, error: "Invalid auth token" };
  } finally {
    client.clearAuth();
  }
}

export async function authorizeAgentProjectAccess(
  req: NextRequest,
  projectId: string,
): Promise<AgentAuthResult & { projectId?: Id<"projects"> }> {
  const auth = await authorizeAgentRequest(req);
  if (!auth.ok) return auth;

  if (!projectId?.trim()) {
    return { ok: false, status: 400, error: "projectId is required" };
  }

  if (auth.devBypass) {
    return { ...auth, projectId: projectId as Id<"projects"> };
  }

  if (auth.serviceSecret) {
    const client = getConvexClient();
    if (!client) {
      return { ok: false, status: 503, error: "Convex is not configured" };
    }
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

  const client = getConvexClient();
  if (!client) {
    return { ok: false, status: 503, error: "Convex is not configured" };
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
    bearerToken: auth.bearerToken ?? null,
    serviceSecret: auth.serviceSecret ?? null,
  };
}
