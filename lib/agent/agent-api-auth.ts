import { NextRequest } from "next/server";
import { api } from "@/convex/_generated/api";
import { getConvexClient } from "@/lib/convex/server";

export type AgentAuthResult =
  | { ok: true; userId: string | null; devBypass: boolean }
  | { ok: false; status: number; error: string };

function isDevAuthBypassEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.STUDIO_OS_DEV_AUTH_BYPASS !== "false"
  );
}

export async function authorizeAgentRequest(req: NextRequest): Promise<AgentAuthResult> {
  const serviceSecret = process.env.CONVEX_INTERNAL_API_SECRET?.trim();
  const providedSecret = req.headers.get("x-studio-os-service-secret")?.trim();
  if (serviceSecret && providedSecret && serviceSecret === providedSecret) {
    return { ok: true, userId: null, devBypass: false };
  }

  const devBypass = isDevAuthBypassEnabled();
  if (devBypass) {
    return { ok: true, userId: null, devBypass: true };
  }

  const header = req.headers.get("authorization");
  const token = header?.match(/^Bearer\s+(.+)$/i)?.[1];
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
    return { ok: true, userId: user._id, devBypass: false };
  } catch {
    return { ok: false, status: 401, error: "Invalid auth token" };
  } finally {
    client.clearAuth();
  }
}
