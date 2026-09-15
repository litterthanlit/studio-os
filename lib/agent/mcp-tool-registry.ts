import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { z } from "zod";

export type McpToolExtra = {
  authInfo?: AuthInfo;
};

export type StudioOsMcpContext = {
  apiBase: string;
  headers: Record<string, string>;
  defaultProjectId?: string;
};

type JsonRecord = Record<string, unknown>;

function textResult(payload: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
  };
}

function errorResult(message: string) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify({ error: message }, null, 2) }],
    isError: true as const,
  };
}

async function callStudioApi<T>(
  context: StudioOsMcpContext,
  path: string,
  body: unknown,
): Promise<T> {
  const response = await fetch(`${context.apiBase}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...context.headers,
    },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    const message = typeof data?.error === "string" ? data.error : `HTTP ${response.status}`;
    throw new Error(message);
  }
  return data;
}

function resolveProjectId(
  context: StudioOsMcpContext,
  projectId?: string | null,
): string {
  const resolved = projectId?.trim() || context.defaultProjectId?.trim() || "";
  if (!resolved) {
    throw new Error("projectId is required (or bind the token to a project)");
  }
  return resolved;
}

export function registerStudioOsMcpTools(
  server: McpServer,
  resolveContext: (extra: McpToolExtra) => StudioOsMcpContext,
) {
  const withContext = async <T>(
    extra: McpToolExtra,
    fn: (context: StudioOsMcpContext) => Promise<T>,
  ) => {
    try {
      const result = await fn(resolveContext(extra));
      return textResult(result);
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : "Tool failed");
    }
  };

  server.registerTool(
    "list_projects",
    {
      description: "List Convex projects for the authenticated user.",
      inputSchema: {},
    },
    async (_args, extra) => withContext(extra, (context) => callStudioApi(context, "/api/agent/projects", {})),
  );

  server.registerTool(
    "get_canvas",
    {
      description:
        "Load a project canvas. Returns a compact summary by default. Set includeState true for the full canvas JSON.",
      inputSchema: {
        projectId: z.string().optional(),
        includeState: z.boolean().optional(),
      },
    },
    async (args, extra) =>
      withContext(extra, async (context) => {
        const result = await callStudioApi<JsonRecord>(context, "/api/agent/canvas", {
          action: "get",
          projectId: resolveProjectId(context, args.projectId),
        });
        if (args.includeState) return result;
        const { canvasState: _canvasState, ...rest } = result;
        return rest;
      }),
  );

  server.registerTool(
    "get_node",
    {
      description: "Read one DesignNode from the canvas without loading the full tree.",
      inputSchema: {
        projectId: z.string().optional(),
        itemId: z.string(),
        nodeId: z.string(),
      },
    },
    async (args, extra) =>
      withContext(extra, (context) =>
        callStudioApi(context, "/api/agent/canvas", {
          action: "get_node",
          projectId: resolveProjectId(context, args.projectId),
          itemId: args.itemId,
          nodeId: args.nodeId,
        }),
      ),
  );

  server.registerTool(
    "get_screen_design",
    {
      description: "Get a screen artboard as DesignNode JSON, rendered HTML, or React + Tailwind TSX.",
      inputSchema: {
        projectId: z.string().optional(),
        artboardId: z.string(),
        format: z.enum(["designnode", "html", "tsx"]).optional(),
      },
    },
    async (args, extra) =>
      withContext(extra, (context) =>
        callStudioApi(context, "/api/agent/screen-design", {
          ...args,
          projectId: resolveProjectId(context, args.projectId),
        }),
      ),
  );

  server.registerTool(
    "generate_screen",
    {
      description:
        "Generate a taste-calibrated screen from project context and write it to the canvas.",
      inputSchema: {
        projectId: z.string().optional(),
        prompt: z.string(),
        breakpoint: z.enum(["desktop", "mobile"]).optional(),
        name: z.string().optional(),
        fidelityMode: z.enum(["close", "balanced", "push"]).optional(),
      },
    },
    async (args, extra) =>
      withContext(extra, (context) =>
        callStudioApi(context, "/api/agent/generate-screen", {
          ...args,
          projectId: resolveProjectId(context, args.projectId),
        }),
      ),
  );

  server.registerTool(
    "generate_screen_set",
    {
      description:
        "Plan and generate multiple app screens (settings, billing, etc.) with shared shell context.",
      inputSchema: {
        projectId: z.string().optional(),
        prompt: z.string(),
        breakpoint: z.enum(["desktop", "mobile"]).optional(),
        fidelityMode: z.enum(["close", "balanced", "push"]).optional(),
      },
    },
    async (args, extra) =>
      withContext(extra, (context) =>
        callStudioApi(context, "/api/agent/generate-screen-set", {
          ...args,
          projectId: resolveProjectId(context, args.projectId),
        }),
      ),
  );

  server.registerTool(
    "review_implementation",
    {
      description:
        "Score an implementation screenshot against the project's stored references and canvas.",
      inputSchema: {
        projectId: z.string().optional(),
        artboardId: z.string(),
        screenshotDataUrl: z.string(),
        projectName: z.string().optional(),
        tasteProfile: z.record(z.string(), z.unknown()).optional(),
      },
    },
    async (args, extra) =>
      withContext(extra, (context) =>
        callStudioApi(context, "/api/agent/review-implementation", {
          ...args,
          projectId: resolveProjectId(context, args.projectId),
        }),
      ),
  );

  server.registerTool(
    "write_canvas",
    {
      description:
        "Apply validated canvas operations (patch_node, patch_code, add_code_item, move_item, set_selection, delete_item, rename_item, add_artboard, replace_artboard_tree, add_reference).",
      inputSchema: {
        projectId: z.string().optional(),
        operations: z.array(z.record(z.string(), z.unknown())),
        expectedRevision: z.number().optional(),
      },
    },
    async (args, extra) =>
      withContext(extra, (context) =>
        callStudioApi(context, "/api/agent/canvas", {
          action: "write",
          projectId: resolveProjectId(context, args.projectId),
          operations: args.operations,
          expectedRevision: args.expectedRevision,
        }),
      ),
  );

  server.registerTool(
    "patch_node",
    {
      description: "Merge style, text content, and/or name on one node inside an artboard, frame, or text item.",
      inputSchema: {
        projectId: z.string().optional(),
        itemId: z.string(),
        nodeId: z.string(),
        style: z.record(z.string(), z.unknown()).optional(),
        content: z.record(z.string(), z.unknown()).optional(),
        name: z.string().optional(),
      },
    },
    async (args, extra) =>
      withContext(extra, (context) =>
        callStudioApi(context, "/api/agent/canvas", {
          action: "write",
          projectId: resolveProjectId(context, args.projectId),
          operations: [
            {
              type: "patch_node",
              itemId: args.itemId,
              nodeId: args.nodeId,
              style: args.style,
              content: args.content,
              name: args.name,
            },
          ],
        }),
      ),
  );

  server.registerTool(
    "move_item",
    {
      description: "Set canvas x,y on any item.",
      inputSchema: {
        projectId: z.string().optional(),
        itemId: z.string(),
        x: z.number(),
        y: z.number(),
      },
    },
    async (args, extra) =>
      withContext(extra, (context) =>
        callStudioApi(context, "/api/agent/canvas", {
          action: "write",
          projectId: resolveProjectId(context, args.projectId),
          operations: [{ type: "move_item", itemId: args.itemId, x: args.x, y: args.y }],
        }),
      ),
  );

  server.registerTool(
    "select_on_canvas",
    {
      description: "Set the open editor selection (active item and node ids).",
      inputSchema: {
        projectId: z.string().optional(),
        activeItemId: z.string().nullable().optional(),
        selectedNodeId: z.string().nullable().optional(),
        selectedNodeIds: z.array(z.string()).optional(),
      },
    },
    async (args, extra) =>
      withContext(extra, (context) =>
        callStudioApi(context, "/api/agent/canvas", {
          action: "write",
          projectId: resolveProjectId(context, args.projectId),
          operations: [
            {
              type: "set_selection",
              activeItemId: args.activeItemId,
              selectedNodeId: args.selectedNodeId,
              selectedNodeIds: args.selectedNodeIds,
            },
          ],
        }),
      ),
  );

  server.registerTool(
    "add_code_item",
    {
      description:
        "Create a code/spec item on the canvas (no DesignNode tree). Persists on the same Convex document as other items.",
      inputSchema: {
        projectId: z.string().optional(),
        name: z.string().optional(),
        language: z.string().optional(),
        content: z.string().optional(),
        x: z.number().optional(),
        y: z.number().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
      },
    },
    async (args, extra) =>
      withContext(extra, (context) =>
        callStudioApi(context, "/api/agent/canvas", {
          action: "write",
          projectId: resolveProjectId(context, args.projectId),
          operations: [
            {
              type: "add_code_item",
              name: args.name,
              language: args.language,
              content: args.content,
              x: args.x,
              y: args.y,
              width: args.width,
              height: args.height,
            },
          ],
        }),
      ),
  );

  server.registerTool(
    "patch_code",
    {
      description: "Update content, language, and/or label on a canvas code item.",
      inputSchema: {
        projectId: z.string().optional(),
        itemId: z.string(),
        content: z.string().optional(),
        language: z.string().optional(),
        name: z.string().optional(),
      },
    },
    async (args, extra) =>
      withContext(extra, (context) =>
        callStudioApi(context, "/api/agent/canvas", {
          action: "write",
          projectId: resolveProjectId(context, args.projectId),
          operations: [
            {
              type: "patch_code",
              itemId: args.itemId,
              content: args.content,
              language: args.language,
              name: args.name,
            },
          ],
        }),
      ),
  );

  server.registerTool(
    "get_code",
    {
      description: "Read one code/spec canvas item (name, language, content) without loading the full canvas.",
      inputSchema: {
        projectId: z.string().optional(),
        itemId: z.string(),
      },
    },
    async (args, extra) =>
      withContext(extra, (context) =>
        callStudioApi(context, "/api/agent/canvas", {
          action: "get_code",
          projectId: resolveProjectId(context, args.projectId),
          itemId: args.itemId,
        }),
      ),
  );

  server.registerTool(
    "delete_item",
    {
      description: "Remove a canvas item by id.",
      inputSchema: {
        projectId: z.string().optional(),
        itemId: z.string(),
      },
    },
    async (args, extra) =>
      withContext(extra, (context) =>
        callStudioApi(context, "/api/agent/canvas", {
          action: "write",
          projectId: resolveProjectId(context, args.projectId),
          operations: [{ type: "delete_item", itemId: args.itemId }],
        }),
      ),
  );

  server.registerTool(
    "get_design_contract",
    {
      description:
        "Build a Design Contract (JSON + markdown) from canvas state, taste profile, and tokens.",
      inputSchema: {
        projectId: z.string().optional(),
        projectName: z.string(),
        canvasState: z.record(z.string(), z.unknown()),
        tasteProfile: z.record(z.string(), z.unknown()).optional(),
        designTokens: z.record(z.string(), z.unknown()).optional(),
        projectContext: z.record(z.string(), z.unknown()).optional(),
        format: z.enum(["json", "markdown", "both"]).optional(),
      },
    },
    async (args, extra) =>
      withContext(extra, (context) =>
        callStudioApi(context, "/api/agent/design-contract", {
          ...args,
          projectId: resolveProjectId(context, args.projectId),
        }),
      ),
  );

  server.registerTool(
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
    async (args, extra) =>
      withContext(extra, (context) => callStudioApi(context, "/api/agent/request-design", args)),
  );

  server.registerTool(
    "submit_screenshot_for_review",
    {
      description:
        "Score an implementation screenshot against references using the production visual benchmark scorer.",
      inputSchema: {
        projectId: z.string().optional(),
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
    async (args, extra) =>
      withContext(extra, (context) =>
        callStudioApi(context, "/api/agent/visual-review", {
          ...args,
          projectId: resolveProjectId(context, args.projectId),
        }),
      ),
  );
}

export function studioOsMcpContextFromEnv(): StudioOsMcpContext {
  const apiBase = (process.env.STUDIO_OS_API_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const token = process.env.STUDIO_OS_API_TOKEN?.trim() ?? "";
  const serviceSecret = process.env.CONVEX_INTERNAL_API_SECRET?.trim() ?? "";
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (serviceSecret) headers["x-studio-os-service-secret"] = serviceSecret;
  return {
    apiBase,
    headers,
    defaultProjectId: process.env.STUDIO_OS_PROJECT_ID?.trim() || undefined,
  };
}

export function originFromRequest(req: Request): string {
  const url = new URL(req.url);
  const proto = req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host;
  return `${proto}://${host}`;
}

export function studioOsMcpContextFromAuth(extra: McpToolExtra, fallbackOrigin: string): StudioOsMcpContext {
  const auth = extra.authInfo;
  const extraData = (auth?.extra ?? {}) as {
    apiBase?: string;
    boundProjectId?: string;
  };
  const token = auth?.token?.trim() ?? "";
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return {
    apiBase: extraData.apiBase || fallbackOrigin,
    headers,
    defaultProjectId: extraData.boundProjectId,
  };
}
