import { createMcpHandler, withMcpAuth } from "mcp-handler";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import {
  authorizeAgentBearerToken,
  isDevAuthBypassEnabled,
} from "@/lib/agent/agent-api-auth";
import {
  originFromRequest,
  registerStudioOsMcpTools,
  studioOsMcpContextFromAuth,
} from "@/lib/agent/mcp-tool-registry";

export const runtime = "nodejs";
export const maxDuration = 60;

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

const mcpHandler = createMcpHandler(
  (server) => {
    registerStudioOsMcpTools(server, (extra) =>
      studioOsMcpContextFromAuth(extra, "http://localhost:3000"),
    );
  },
  {
    serverInfo: {
      name: "studio-os",
      version: "0.3.0",
    },
  },
  {
    basePath: "/api",
    disableSse: true,
    maxDuration: 60,
    verboseLogs: false,
  },
);

const handler = withMcpAuth(mcpHandler, verifyMcpToken, {
  required: true,
});

export { handler as GET, handler as POST, handler as DELETE };
