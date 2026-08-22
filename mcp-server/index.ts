/**
 * Studio OS MCP Server (stdio fallback)
 *
 * Hosted Streamable HTTP is the supported path: Settings → Connections → Agents.
 * Keep this process for local stdio clients that cannot reach /api/mcp.
 *
 *   STUDIO_OS_API_URL=http://localhost:3000 \
 *   STUDIO_OS_API_TOKEN=sos_live_… \
 *   npm run mcp:server
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  registerStudioOsMcpTools,
  studioOsMcpContextFromEnv,
} from "../lib/agent/mcp-tool-registry";

const mcpServer = new McpServer({
  name: "studio-os",
  version: "0.3.0",
});

const envContext = studioOsMcpContextFromEnv();
registerStudioOsMcpTools(mcpServer, () => envContext);

async function main() {
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  console.error(`[studio-os-mcp] Connected — API ${envContext.apiBase}`);
}

main().catch((error) => {
  console.error("[studio-os-mcp] Fatal:", error);
  process.exit(1);
});
