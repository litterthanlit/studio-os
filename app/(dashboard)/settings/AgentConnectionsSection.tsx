"use client";

import * as React from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  buildClaudeCodeMcpConfig,
  buildCodexMcpConfig,
  buildCursorMcpConfig,
  formatJsonSnippet,
} from "@/lib/agent/mcp-config-snippets";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-[12px] font-medium text-text-secondary">
      {children}
    </label>
  );
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-[11px] text-text-muted">{children}</p>;
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

function CopyBlock({
  label,
  hint,
  value,
}: {
  label: string;
  hint: string;
  value: string;
}) {
  const [copied, setCopied] = React.useState(false);

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <FieldLabel>{label}</FieldLabel>
        <button
          type="button"
          onClick={async () => {
            try {
              await copyText(value);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1400);
            } catch {
              setCopied(false);
            }
          }}
          className="rounded-[4px] border border-border px-2 py-1 text-[11px] text-text-secondary transition-colors hover:border-border-hover hover:text-accent"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <FieldHint>{hint}</FieldHint>
      <pre className="mt-2 max-h-48 overflow-auto rounded-[4px] border border-border bg-bg-input p-3 text-[11px] leading-relaxed text-text-primary font-mono whitespace-pre-wrap">
        {value}
      </pre>
    </div>
  );
}

export function AgentConnectionsSection() {
  const currentUser = useQuery(api.users.current, {});
  const tokens = useQuery(api.agentTokens.listMine, currentUser ? {} : "skip");
  const projects = useQuery(api.projects.listMine, currentUser ? {} : "skip");
  const createToken = useMutation(api.agentTokens.create);
  const revokeToken = useMutation(api.agentTokens.revoke);

  const [name, setName] = React.useState("Cursor");
  const [projectId, setProjectId] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [plaintext, setPlaintext] = React.useState<string | null>(null);
  const [origin, setOrigin] = React.useState("");

  React.useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const mcpUrl = `${origin || "https://studio-os.io"}/api/mcp`;
  const snippetToken = plaintext ?? "sos_live_YOUR_TOKEN";
  const cursorSnippet = formatJsonSnippet(buildCursorMcpConfig(mcpUrl, snippetToken));
  const claudeSnippet = formatJsonSnippet(buildClaudeCodeMcpConfig(mcpUrl, snippetToken));
  const codexSnippet = buildCodexMcpConfig(mcpUrl);

  async function handleCreate() {
    if (!currentUser || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await createToken({
        name,
        projectId: projectId ? (projectId as Id<"projects">) : undefined,
      });
      setPlaintext(result.token);
      setName("Cursor");
      setProjectId("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not create token";
      if (message.includes("TOKEN_LIMIT_REACHED")) {
        setError("Token limit reached. Revoke an unused token first.");
      } else if (message.includes("UNAUTHENTICATED") || message.includes("UNAUTHORIZED")) {
        setError("Sign in to generate an agent token.");
      } else {
        setError(message);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke(tokenId: Id<"agentTokens">) {
    try {
      await revokeToken({ tokenId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not revoke token");
    }
  }

  if (currentUser === undefined) {
    return <p className="text-[13px] text-text-muted">Loading agent connections…</p>;
  }

  if (!currentUser) {
    return (
      <div>
        <p className="text-[13px] text-text-secondary">
          Sign in to generate a personal token and connect Cursor, Claude Code, or Codex to the live canvas.
        </p>
        <a
          href="/auth/login?next=/settings"
          className="mt-3 inline-flex rounded-[4px] bg-button-primary-bg px-3 py-2 text-[12px] font-medium text-button-primary-text transition-colors hover:bg-accent-hover"
        >
          Sign in
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[13px] text-text-secondary">
          Generate a token, paste a snippet into your agent, then use get_canvas and patch_node on the open project.
        </p>
        <FieldHint>
          Tokens are shown once. Bound tokens skip projectId on every tool call.
        </FieldHint>
      </div>

      <div>
        <FieldLabel>Token name</FieldLabel>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-40 border border-border rounded-[2px] bg-bg-input px-3 py-2 text-[13px] text-text-primary outline-none transition-colors focus:border-[#D1E4FC] focus:ring-2 focus:ring-[#D1E4FC]/40"
          />
          <select
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            className="min-w-[180px] border border-border rounded-[2px] bg-bg-input px-3 py-2 text-[13px] text-text-primary outline-none transition-colors focus:border-[#D1E4FC] focus:ring-2 focus:ring-[#D1E4FC]/40"
          >
            <option value="">All projects</option>
            {(projects ?? []).map((project: { _id: string; name: string; slug: string }) => (
              <option key={project._id} value={project._id}>
                {project.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={busy}
            className="rounded-[4px] bg-button-primary-bg px-3 py-2 text-[12px] font-medium text-button-primary-text transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {busy ? "Generating…" : "Generate token"}
          </button>
        </div>
      </div>

      {error && <p className="text-[12px] text-red-600">{error}</p>}

      {plaintext && (
        <div>
          <FieldLabel>New token</FieldLabel>
          <FieldHint>Copy this now. It cannot be shown again.</FieldHint>
          <pre className="mt-2 overflow-auto rounded-[4px] border border-[#4B57DB] bg-white p-3 text-[11px] font-mono text-text-primary">
            {plaintext}
          </pre>
        </div>
      )}

      <div>
        <FieldLabel>Active tokens</FieldLabel>
        {(tokens ?? []).length === 0 ? (
          <p className="text-[12px] text-text-muted">No tokens yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-[4px] border border-border">
            {(tokens ?? []).map((token: {
              _id: Id<"agentTokens">;
              name: string;
              prefix: string;
              projectId?: string;
              createdAt: number;
              lastUsedAt?: number;
            }) => {
              const bound = (projects ?? []).find((project: { _id: string }) => project._id === token.projectId);
              return (
                <li key={token._id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <div className="text-[13px] text-text-primary">{token.name}</div>
                    <div className="mt-0.5 font-mono text-[11px] text-text-muted">
                      {token.prefix}…{bound ? ` · ${bound.name}` : " · all projects"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleRevoke(token._id)}
                    className="shrink-0 text-[12px] text-red-500 transition-colors hover:text-red-600"
                  >
                    Revoke
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <CopyBlock
        label="Cursor"
        hint="~/.cursor/mcp.json"
        value={cursorSnippet}
      />
      <CopyBlock
        label="Claude Code"
        hint='Must include "type": "http" or Claude treats it as stdio.'
        value={claudeSnippet}
      />
      <CopyBlock
        label="Codex"
        hint='~/.codex/config.toml — then export STUDIO_OS_API_TOKEN with the token value.'
        value={codexSnippet}
      />
    </div>
  );
}
