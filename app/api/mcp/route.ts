import { withMcpAuth } from "mcp-handler";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import {
  authorizeAgentBearerToken,
  isDevAuthBypassEnabled,
} from "@/lib/agent/agent-api-auth";
import { handleStudioOsMcpHttpRequest } from "@/lib/agent/mcp-http-server";
import { originFromRequest } from "@/lib/agent/mcp-tool-registry";

export const runtime = "nodejs";
export const maxDuration = 60;

type AuthedRequest = Request & { auth?: AuthInfo };

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Accept, Authorization, mcp-session-id, mcp-protocol-version, Last-Event-ID",
  "Access-Control-Expose-Headers": "mcp-session-id, mcp-protocol-version",
  "Access-Control-Max-Age": "86400",
};

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function verifyMcpToken(req: Request, bearerToken?: string): Promise<AuthInfo | undefined> {
  const apiBase = originFromRequest(req);

  if (bearerToken) {
    const auth = await authorizeAgentBearerToken(bearerToken);
    if (!auth.ok) return undefined;
    return {
      token: bearerToken,
      clientId: auth.actingUserId ?? auth.userId ?? "studio-os",
      scopes: ["studio-os"],
      extra: {
        apiBase,
        actingUserId: auth.actingUserId ?? auth.userId,
        boundProjectId: auth.boundProjectId,
        devBypass: auth.devBypass,
      },
    };
  }

  if (isDevAuthBypassEnabled()) {
    return {
      token: "",
      clientId: "dev-bypass",
      scopes: ["studio-os"],
      extra: { apiBase, devBypass: true },
    };
  }

  return undefined;
}

const authedHandler = withMcpAuth(
  (req) => handleStudioOsMcpHttpRequest(req, (req as AuthedRequest).auth),
  verifyMcpToken,
  { required: true },
);

async function handle(req: Request): Promise<Response> {
  return withCors(await authedHandler(req));
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export { handle as GET, handle as POST, handle as DELETE };
