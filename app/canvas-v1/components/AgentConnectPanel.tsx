"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexProjectId } from "@/lib/canvas/use-convex-project-id";
import { isConvexCanvasSyncConfigured } from "@/lib/canvas/canvas-convex-sync";
import { InspectorSection } from "./inspector/InspectorField";
import { StudioButton } from "@/components/ui/studio-button";

type AgentConnectPanelProps = {
  projectId?: string;
};

export function AgentConnectPanel({ projectId }: AgentConnectPanelProps) {
  const currentUser = useQuery(api.users.current, {});
  const convexEnabled = isConvexCanvasSyncConfigured() && Boolean(currentUser);
  const convexProjectId = useConvexProjectId(projectId ?? "", Boolean(projectId) && convexEnabled);
  const [copied, setCopied] = React.useState(false);
  const displayId = convexProjectId ?? "";

  async function copyId() {
    if (!displayId) return;
    try {
      await navigator.clipboard.writeText(displayId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  return (
    <InspectorSection label="Connect">
      <p className="text-[11px] leading-relaxed text-[var(--text-secondary)]">
        Paste the snippet from Settings into Cursor, Claude Code, or Codex. Then call get_canvas and patch_node with this project id.
      </p>

      <div className="mt-2">
        <div className="mb-1 text-[10px] uppercase tracking-[1px] text-[var(--text-muted)]">
          Convex projectId
        </div>
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-[2px] border border-[var(--inspector-control-border)] bg-[var(--inspector-control-bg)] px-2 py-1.5 font-mono text-[11px] text-[var(--inspector-control-text)]">
            {displayId || (currentUser ? "Not synced yet" : "Sign in to sync")}
          </code>
          <StudioButton
            type="button"
            variant="secondary"
            className="h-7 shrink-0 px-2 text-[11px]"
            onClick={() => void copyId()}
            disabled={!displayId}
          >
            {copied ? "Copied" : "Copy"}
          </StudioButton>
        </div>
      </div>

      <a
        href="/settings"
        className="mt-2 inline-flex text-[11px] text-[#4B57DB] hover:underline"
      >
        Open Settings to generate a token
      </a>
    </InspectorSection>
  );
}
