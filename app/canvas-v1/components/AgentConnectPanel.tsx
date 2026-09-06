"use client";

import * as React from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexProjectId } from "@/lib/canvas/use-convex-project-id";
import { isConvexCanvasSyncConfigured } from "@/lib/canvas/canvas-convex-sync";
import {
  CURSOR_CONNECT_TOKEN_NAME,
  CURSOR_PLUGIN_LOCAL_PATH,
  CURSOR_PLUGIN_RESTART_HINT,
  CURSOR_PLUGIN_SOURCE_PATH,
  STUDIO_OS_API_TOKEN_ENV,
  buildCursorPluginCopyCommand,
  buildCursorPluginEnvCommand,
  buildCursorPluginInstallScript,
  buildCursorPluginSymlinkCommand,
} from "@/lib/agent/mcp-config-snippets";
import { InspectorSection } from "./inspector/InspectorField";
import { StudioButton } from "@/components/ui/studio-button";

type AgentConnectPanelProps = {
  projectId?: string;
};

function CopyRow({
  label,
  value,
  copied,
  onCopy,
  accent,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
  accent?: boolean;
}) {
  return (
    <div className="mt-2">
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="text-[10px] uppercase tracking-[1px] text-[#A0A0A0]">{label}</div>
        <StudioButton
          type="button"
          variant="secondary"
          className="h-6 shrink-0 px-2 text-[10px]"
          onClick={onCopy}
          disabled={!value}
        >
          {copied ? "Copied" : "Copy"}
        </StudioButton>
      </div>
      <pre
        className={
          accent
            ? "max-h-24 overflow-auto rounded-[2px] border border-[#4B57DB] bg-white px-2 py-1.5 font-mono text-[10px] leading-relaxed text-[#1A1A1A] whitespace-pre-wrap break-all"
            : "max-h-28 overflow-auto rounded-[2px] border border-[var(--inspector-control-border)] bg-[var(--inspector-control-bg)] px-2 py-1.5 font-mono text-[10px] leading-relaxed text-[var(--inspector-control-text)] whitespace-pre-wrap"
        }
      >
        {value}
      </pre>
    </div>
  );
}

export function AgentConnectPanel({ projectId }: AgentConnectPanelProps) {
  const convexReady = isConvexCanvasSyncConfigured();
  const currentUser = useQuery(api.users.current, convexReady ? {} : "skip");
  const convexEnabled = convexReady && Boolean(currentUser);
  const convexProjectId = useConvexProjectId(projectId ?? "", Boolean(projectId) && convexEnabled);
  const createToken = useMutation(api.agentTokens.create);

  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [plaintext, setPlaintext] = React.useState<string | null>(null);
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  const displayId = convexProjectId ?? "";
  const canConnect = Boolean(currentUser && displayId);
  const loginNext = projectId ? `/canvas?project=${encodeURIComponent(projectId)}` : "/canvas";
  const loginHref = `/auth/login?next=${encodeURIComponent(loginNext)}`;

  const symlinkCommand = buildCursorPluginSymlinkCommand();
  const copyCommand = buildCursorPluginCopyCommand();
  const envCommand = buildCursorPluginEnvCommand(plaintext);
  const installScript = buildCursorPluginInstallScript(plaintext);

  async function copyValue(key: string, value: string) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 1400);
    } catch {
      setCopiedKey(null);
    }
  }

  async function handleConnect() {
    if (!canConnect || busy || !convexProjectId) return;
    setBusy(true);
    setError(null);
    try {
      const result = await createToken({
        name: CURSOR_CONNECT_TOKEN_NAME,
        projectId: convexProjectId,
      });
      setPlaintext(result.token);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not create token";
      if (message.includes("TOKEN_LIMIT_REACHED")) {
        setError("Token limit reached. Revoke an unused token in Settings first.");
      } else if (message.includes("UNAUTHENTICATED") || message.includes("UNAUTHORIZED")) {
        setError("Sign in to connect Cursor.");
      } else if (message.includes("PROJECT_NOT_FOUND") || message.includes("PROJECT_FORBIDDEN")) {
        setError("This project is not synced yet. Reopen it while signed in.");
      } else {
        setError(message);
      }
    } finally {
      setBusy(false);
    }
  }

  if (convexReady && currentUser === undefined) {
    return (
      <InspectorSection label="Connect">
        <p className="text-[11px] leading-relaxed text-[#6B6B6B] dark:text-[#999999]">
          Checking account…
        </p>
      </InspectorSection>
    );
  }

  return (
    <InspectorSection label="Connect">
      {!currentUser ? (
        <p className="text-[11px] leading-relaxed text-[#6B6B6B] dark:text-[#999999]">
          Sign in to connect Cursor. One click mints a project-bound token and shows install steps for the local plugin.
        </p>
      ) : !displayId ? (
        <p className="text-[11px] leading-relaxed text-[#6B6B6B] dark:text-[#999999]">
          This project is not synced yet — create or reopen it while signed in, then connect Cursor.
        </p>
      ) : (
        <p className="text-[11px] leading-relaxed text-[#6B6B6B] dark:text-[#999999]">
          Connect Cursor with a project-bound token. Install the plugin at{" "}
          <code className="font-mono text-[10px]">{CURSOR_PLUGIN_SOURCE_PATH}</code>
          {" "}and set{" "}
          <code className="font-mono text-[10px]">{STUDIO_OS_API_TOKEN_ENV}</code>
          . No Settings MCP paste.
        </p>
      )}

      {!currentUser ? (
        <a
          href={loginHref}
          className="mt-2 inline-flex rounded-[4px] bg-[#4B57DB] px-3 py-1.5 text-[11px] font-medium text-white hover:bg-[#3D49C7]"
        >
          Sign in to connect Cursor
        </a>
      ) : (
        <StudioButton
          type="button"
          variant="primary"
          className="mt-2 h-8 w-full px-3 text-[12px]"
          onClick={() => void handleConnect()}
          disabled={!canConnect || busy}
        >
          {busy ? "Connecting…" : plaintext ? "Generate another token" : "Connect Cursor"}
        </StudioButton>
      )}

      {error && <p className="mt-2 text-[11px] text-red-600">{error}</p>}

      {plaintext && (
        <div className="mt-3">
          <p className="text-[11px] leading-relaxed text-[#6B6B6B] dark:text-[#999999]">
            Copy this token now. It cannot be shown again.
          </p>
          <CopyRow
            label="Token"
            value={plaintext}
            copied={copiedKey === "token"}
            onCopy={() => void copyValue("token", plaintext)}
            accent
          />
          <CopyRow
            label={`1. Symlink ${CURSOR_PLUGIN_SOURCE_PATH} → ${CURSOR_PLUGIN_LOCAL_PATH}`}
            value={symlinkCommand}
            copied={copiedKey === "symlink"}
            onCopy={() => void copyValue("symlink", symlinkCommand)}
          />
          <CopyRow
            label="Or copy instead of symlink"
            value={copyCommand}
            copied={copiedKey === "copy"}
            onCopy={() => void copyValue("copy", copyCommand)}
          />
          <CopyRow
            label={`2. Set ${STUDIO_OS_API_TOKEN_ENV}`}
            value={envCommand}
            copied={copiedKey === "env"}
            onCopy={() => void copyValue("env", envCommand)}
          />
          <CopyRow
            label="Copy install commands"
            value={installScript}
            copied={copiedKey === "all"}
            onCopy={() => void copyValue("all", installScript)}
          />
          <p className="mt-2 text-[11px] leading-relaxed text-[#6B6B6B] dark:text-[#999999]">
            3. {CURSOR_PLUGIN_RESTART_HINT} Run symlink/copy from a studio-os repo checkout.
          </p>
        </div>
      )}

      <a
        href="/settings"
        className="mt-2 inline-flex text-[11px] text-[#4B57DB] hover:underline"
      >
        Manage tokens in Settings
      </a>
    </InspectorSection>
  );
}
