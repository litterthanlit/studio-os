export function buildCursorMcpConfig(mcpUrl: string, token: string) {
  return {
    mcpServers: {
      "studio-os": {
        url: mcpUrl,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    },
  };
}

export function buildClaudeCodeMcpConfig(mcpUrl: string, token: string) {
  return {
    mcpServers: {
      "studio-os": {
        type: "http",
        url: mcpUrl,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    },
  };
}

export function buildCodexMcpConfig(mcpUrl: string) {
  return `[mcp_servers.studio-os]
url = "${mcpUrl}"
bearer_token_env_var = "STUDIO_OS_API_TOKEN"
`;
}

export function formatJsonSnippet(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
