/**
 * Studio OS MCP Server
 *
 * Exposes agent-addressable tools that wrap the production HTTP APIs.
 *
 * Cursor setup (.cursor/mcp.json):
 * {
 *   "mcpServers": {
 *     "studio-os": {
 *       "command": "npm",
 *       "args": ["run", "mcp:server"],
 *       "cwd": "/absolute/path/to/studio-os",
 *       "env": {
 *         "STUDIO_OS_API_URL": "http://localhost:3000",
 *         "STUDIO_OS_API_TOKEN": "<your-bearer-token>",
 *         "CONVEX_INTERNAL_API_SECRET": "<optional-service-secret>"
 *       }
 *     }
 *   }
 * }
 *
 * Usage:
 *   STUDIO_OS_API_URL=http://localhost:3000 \
 *   STUDIO_OS_API_TOKEN=<bearer-or-leave-empty-with-dev-bypass> \
 *   CONVEX_INTERNAL_API_SECRET=<optional> \
 *   npm run mcp:server
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_BASE = (process.env.STUDIO_OS_API_URL ?? "http://localhost:3000").replace(/\/$/, "");
const API_TOKEN = process.env.STUDIO_OS_API_TOKEN?.trim() ?? "";
const SERVICE_SECRET = process.env.CONVEX_INTERNAL_API_SECRET?.trim() ?? "";

async function callStudioApi<T>(path: string, body: unknown): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (API_TOKEN) {
    headers.Authorization = `Bearer ${API_TOKEN}`;
  }
  if (SERVICE_SECRET) {
    headers["x-studio-os-service-secret"] = SERVICE_SECRET;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!response.ok) {
    const message = typeof data?.error === "string" ? data.error : `HTTP ${response.status}`;
    throw new Error(message);
  }
  return data as T;
}

const mcpServer = new McpServer({
  name: "studio-os",
  version: "0.2.0",
});

mcpServer.registerTool(
  "list_projects",
  {
    description: "List Convex projects for the authenticated user.",
    inputSchema: {},
  },
  async () => {
    const result = await callStudioApi<Record<string, unknown>>("/api/agent/projects", {});
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

mcpServer.registerTool(
  "get_canvas",
  {
    description: "Load a project canvas summary and state from Convex.",
    inputSchema: {
      projectId: z.string(),
    },
  },
  async (args) => {
    const result = await callStudioApi<Record<string, unknown>>("/api/agent/canvas", {
      action: "get",
      projectId: args.projectId,
    });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

mcpServer.registerTool(
  "get_screen_design",
  {
    description: "Get a screen artboard as DesignNode JSON or rendered HTML.",
    inputSchema: {
      projectId: z.string(),
      artboardId: z.string(),
      format: z.enum(["designnode", "html"]).optional(),
    },
  },
  async (args) => {
    const result = await callStudioApi<Record<string, unknown>>("/api/agent/screen-design", args);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

mcpServer.registerTool(
  "generate_screen",
  {
    description:
      "Generate a taste-calibrated screen from project context and write it to the canvas.",
    inputSchema: {
      projectId: z.string(),
      prompt: z.string(),
      breakpoint: z.enum(["desktop", "mobile"]).optional(),
      name: z.string().optional(),
      fidelityMode: z.enum(["close", "balanced", "push"]).optional(),
    },
  },
  async (args) => {
    const result = await callStudioApi<Record<string, unknown>>("/api/agent/generate-screen", args);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

mcpServer.registerTool(
  "review_implementation",
  {
    description:
      "Score an implementation screenshot against the project's stored references and canvas.",
    inputSchema: {
      projectId: z.string(),
      artboardId: z.string(),
      screenshotDataUrl: z.string(),
      projectName: z.string().optional(),
      tasteProfile: z.record(z.string(), z.unknown()).optional(),
    },
  },
  async (args) => {
    const result = await callStudioApi<Record<string, unknown>>(
      "/api/agent/review-implementation",
      args,
    );
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

mcpServer.registerTool(
  "get_design_contract",
  {
    description:
      "Build a Design Contract (JSON + markdown) from canvas state, taste profile, and tokens.",
    inputSchema: {
      projectId: z.string(),
      projectName: z.string(),
      canvasState: z.record(z.string(), z.unknown()),
      tasteProfile: z.record(z.string(), z.unknown()).optional(),
      designTokens: z.record(z.string(), z.unknown()).optional(),
      projectContext: z.record(z.string(), z.unknown()).optional(),
      format: z.enum(["json", "markdown", "both"]).optional(),
    },
  },
  async (args) => {
    const result = await callStudioApi<Record<string, unknown>>("/api/agent/design-contract", args);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

mcpServer.registerTool(
  "request_design",
  {
    description:
      "Request a taste-calibrated V6 design generation (returns DesignNode variant trees).",
    inputSchema: {
      prompt: z.string(),
      tokens: z.record(z.string(), z.unknown()),
      tasteProfile: z.record(z.string(), z.unknown()).optional(),
      referenceUrls: z.array(z.string()).optional(),
      siteType: z.string().optional(),
      siteName: z.string().optional(),
      fidelityMode: z.enum(["close", "balanced", "push"]).optional(),
      compositionContext: z.string().optional(),
      compositionData: z.array(z.record(z.string(), z.unknown())).optional(),
    },
  },
  async (args) => {
    const result = await callStudioApi<Record<string, unknown>>("/api/agent/request-design", args);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

mcpServer.registerTool(
  "submit_screenshot_for_review",
  {
    description:
      "Score an implementation screenshot against references using the production visual benchmark scorer.",
    inputSchema: {
      projectId: z.string(),
      projectName: z.string(),
      canvasState: z.record(z.string(), z.unknown()),
      tasteProfile: z.record(z.string(), z.unknown()),
      screenId: z.string(),
      screenshotDataUrl: z.string(),
      referenceUrls: z.array(z.string()),
      comparedAgainstArtboard: z.string().optional(),
      projectContext: z.record(z.string(), z.unknown()).optional(),
    },
  },
  async (args) => {
    const result = await callStudioApi<Record<string, unknown>>("/api/agent/visual-review", args);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  console.error(`[studio-os-mcp] Connected — API ${API_BASE}`);
}

main().catch((error) => {
  console.error("[studio-os-mcp] Fatal:", error);
  process.exit(1);
});
