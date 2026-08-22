import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import {
  originFromRequest,
  registerStudioOsMcpTools,
  studioOsMcpContextFromAuth,
} from "@/lib/agent/mcp-tool-registry";

/**
 * Hosted Streamable HTTP for Cursor / Claude Code / Codex.
 *
 * mcp-handler's createMcpHandler (1.0.x) builds a fake IncomingMessage without
 * rawHeaders and reuses one stateless transport. SDK 1.29 then 406s (empty Accept)
 * and 500s on the next request ("Stateless transport cannot be reused").
 *
 * Use the Web Standard transport with a fresh server per request instead.
 * Keep withMcpAuth from mcp-handler for Bearer verification.
 */
export function createStudioOsMcpServer(req: Request): McpServer {
  const server = new McpServer({
    name: "studio-os",
    version: "0.3.0",
  });
  const fallbackOrigin = originFromRequest(req);
  registerStudioOsMcpTools(server, (extra) =>
    studioOsMcpContextFromAuth(extra, fallbackOrigin),
  );
  return server;
}

export async function handleStudioOsMcpHttpRequest(
  req: Request,
  authInfo?: AuthInfo,
): Promise<Response> {
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  const server = createStudioOsMcpServer(req);
  await server.connect(transport);
  try {
    return await transport.handleRequest(req, { authInfo });
  } finally {
    await server.close().catch(() => undefined);
  }
}
