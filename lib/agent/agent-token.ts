/**
 * Personal access tokens for Cursor / Claude Code / Codex MCP.
 * Hash algorithm must stay in sync with convex/agentTokens.ts.
 */
export const AGENT_PAT_PREFIX = "sos_live_";

export function isAgentPersonalAccessToken(token: string): boolean {
  return token.startsWith(AGENT_PAT_PREFIX) && token.length >= AGENT_PAT_PREFIX.length + 16;
}

export async function hashAgentAccessToken(token: string): Promise<string> {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function agentTokenDisplayPrefix(token: string): string {
  return token.slice(0, Math.min(16, token.length));
}
