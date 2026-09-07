export const CURSOR_PLUGIN_SOURCE_PATH = "extensions/cursor";
export const CURSOR_PLUGIN_LOCAL_PATH = "~/.cursor/plugins/local/studio-os";
export const STUDIO_OS_API_TOKEN_ENV = "STUDIO_OS_API_TOKEN";
export const CURSOR_CONNECT_TOKEN_NAME = "Cursor";

export const CURSOR_PLUGIN_RESTART_HINT =
  "Restart Cursor (Developer: Reload Window), then enable Studio OS under Customize → Plugins. If the env var is unset, paste the token in Plugins → Configure.";

function shellSingleQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function buildCursorPluginSymlinkCommand(): string {
  return [
    "mkdir -p ~/.cursor/plugins/local",
    `ln -sfn "$(pwd)/${CURSOR_PLUGIN_SOURCE_PATH}" ${CURSOR_PLUGIN_LOCAL_PATH}`,
  ].join("\n");
}

export function buildCursorPluginCopyCommand(): string {
  return [
    "mkdir -p ~/.cursor/plugins/local",
    `rm -rf ${CURSOR_PLUGIN_LOCAL_PATH}`,
    `cp -R ${CURSOR_PLUGIN_SOURCE_PATH} ${CURSOR_PLUGIN_LOCAL_PATH}`,
  ].join("\n");
}

export function buildCursorPluginEnvCommand(token?: string | null): string {
  if (!token) {
    return `export ${STUDIO_OS_API_TOKEN_ENV}=`;
  }
  return `export ${STUDIO_OS_API_TOKEN_ENV}=${shellSingleQuote(token)}`;
}

export function buildCursorPluginInstallScript(token?: string | null): string {
  const lines = [buildCursorPluginSymlinkCommand()];
  if (token) {
    lines.push(buildCursorPluginEnvCommand(token));
  }
  return `${lines.join("\n")}\n`;
}

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
bearer_token_env_var = "${STUDIO_OS_API_TOKEN_ENV}"
`;
}

export function formatJsonSnippet(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
