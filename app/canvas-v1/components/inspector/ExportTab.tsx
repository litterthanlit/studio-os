"use client";

import * as React from "react";
import Link from "next/link";
import { InspectorSegmented } from "./InspectorSegmented";
import { designNodeToHTML } from "@/lib/canvas/design-node-to-html";
import { isDesignNodeTree } from "@/lib/canvas/compose";
import type { ArtboardItem } from "@/lib/canvas/unified-canvas-state";
import type { ComponentMaster, DesignNode } from "@/lib/canvas/design-node";
import { findDesignNodeById } from "@/lib/canvas/design-node";
import { resolveTree } from "@/lib/canvas/component-resolver";
import {
  DEFAULT_EXPORT_OPTIONS,
  type ExportOptions,
  countExternalImageReferences,
} from "@/lib/canvas/export-options";
import { runExportPreflight } from "@/lib/canvas/export-preflight";
import { buildExportZipBlob } from "@/lib/canvas/build-export-zip";
import { OnboardingHint } from "../OnboardingHint";
import { StudioButton } from "@/components/ui/studio-button";

type ExportTabProps = {
  artboard: ArtboardItem | null;
  /** All artboards in the project (for desktop vs active export source). */
  artboards: ArtboardItem[];
  components: ComponentMaster[];
  selectedNodeId: string | null;
};

export function ExportTab({
  artboard,
  artboards,
  components,
  selectedNodeId,
}: ExportTabProps) {
  const [opts, setOpts] = React.useState<ExportOptions>(DEFAULT_EXPORT_OPTIONS);
  const [copied, setCopied] = React.useState(false);
  const [clipboardError, setClipboardError] = React.useState<string | null>(null);
  const [zipLoading, setZipLoading] = React.useState(false);
  const [publishLoading, setPublishLoading] = React.useState(false);
  const [publishError, setPublishError] = React.useState<string | null>(null);
  const [publishNeedsSignIn, setPublishNeedsSignIn] = React.useState(false);
  const [publishUrl, setPublishUrl] = React.useState<string | null>(null);
  const [linkCopied, setLinkCopied] = React.useState(false);

  const desktopArtboard = React.useMemo(
    () => artboards.find((a) => a.breakpoint === "desktop") ?? null,
    [artboards]
  );

  const sourceArtboard = React.useMemo(() => {
    if (opts.breakpointSource === "desktop") {
      return desktopArtboard ?? artboard;
    }
    return artboard;
  }, [opts.breakpointSource, desktopArtboard, artboard]);

  const rawTree =
    sourceArtboard && isDesignNodeTree(sourceArtboard.pageTree)
      ? (sourceArtboard.pageTree as DesignNode)
      : null;

  const resolvedTree = React.useMemo(
    () => (rawTree ? resolveTree(rawTree, components) : null),
    [rawTree, components]
  );

  const exportRoot = React.useMemo(() => {
    if (!resolvedTree) return null;
    if (opts.scope === "full") return resolvedTree;
    if (!selectedNodeId) return null;
    return findDesignNodeById(resolvedTree, selectedNodeId) ?? null;
  }, [resolvedTree, opts.scope, selectedNodeId]);

  const selectionNotOnSourceTree = Boolean(
    opts.scope === "selection" &&
      resolvedTree &&
      selectedNodeId &&
      !findDesignNodeById(resolvedTree, selectedNodeId)
  );

  const htmlString = React.useMemo(
    () =>
      exportRoot
        ? designNodeToHTML(exportRoot, { outputMode: opts.outputMode })
        : "",
    [exportRoot, opts.outputMode]
  );

  const externalImageCount = React.useMemo(
    () => (exportRoot ? countExternalImageReferences(exportRoot) : 0),
    [exportRoot]
  );
  const preflight = React.useMemo(
    () => runExportPreflight(exportRoot),
    [exportRoot]
  );

  const v6ArtboardCount = React.useMemo(
    () => artboards.filter((a) => isDesignNodeTree(a.pageTree)).length,
    [artboards]
  );
  const showBreakpointRow = v6ArtboardCount > 1;

  const handleCopy = React.useCallback(async () => {
    if (!htmlString) return;
    setClipboardError(null);
    try {
      await navigator.clipboard.writeText(htmlString);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setClipboardError(
        "Clipboard unavailable — use HTTPS or Download ZIP."
      );
    }
  }, [htmlString]);

  const handleDownloadZip = React.useCallback(async () => {
    if (!htmlString) return;
    setZipLoading(true);
    try {
      const blob = await buildExportZipBlob(htmlString);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "studio-export.zip";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setZipLoading(false);
    }
  }, [htmlString]);

  const handlePublish = React.useCallback(async () => {
    if (!htmlString) return;
    setPublishLoading(true);
    setPublishError(null);
    setPublishNeedsSignIn(false);
    try {
      const res = await fetch("/api/export/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ html: htmlString }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        publishUrl?: string;
      };
      if (!res.ok) {
        if (res.status === 401) {
          setPublishNeedsSignIn(true);
          return;
        }
        setPublishError(
          typeof data.error === "string" ? data.error : "Publish failed"
        );
        return;
      }
      if (data.publishUrl) {
        setPublishUrl(data.publishUrl);
      }
    } catch {
      setPublishError("Network error — try again.");
    } finally {
      setPublishLoading(false);
    }
  }, [htmlString]);

  const handleCopyPublishUrl = React.useCallback(async () => {
    if (!publishUrl) return;
    try {
      await navigator.clipboard.writeText(publishUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1500);
    } catch {
      setPublishError("Could not copy link — copy manually.");
    }
  }, [publishUrl]);

  if (!rawTree) {
    return (
      <div className="p-4">
        <p className="text-[11px] text-text-muted">
          Export is available for V6 layouts. Generate a new site to use this feature.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col gap-3 h-full min-h-0">
      <OnboardingHint
        hintKey="export-seen"
        text="Copy HTML, download a ZIP, or publish a read-only link (sign-in required)"
      />

      <div>
        <span className="text-[10px] uppercase tracking-wide text-[#8A8A8A] dark:text-[#666666] font-mono mb-1 block">
          Scope
        </span>
        <InspectorSegmented
          value={opts.scope}
          options={[
            { value: "full", label: "Full page" },
            { value: "selection", label: "Selection" },
          ]}
          onChange={(v) =>
            setOpts((o) => ({ ...o, scope: v as ExportOptions["scope"] }))
          }
        />
      </div>

      <div>
        <span className="text-[10px] uppercase tracking-wide text-[#8A8A8A] dark:text-[#666666] font-mono mb-1 block">
          Output
        </span>
        <InspectorSegmented
          value={opts.outputMode}
          options={[
            { value: "fragment", label: "HTML fragment" },
            { value: "document", label: "HTML document" },
          ]}
          onChange={(v) =>
            setOpts((o) => ({ ...o, outputMode: v as ExportOptions["outputMode"] }))
          }
        />
      </div>

      {showBreakpointRow && (
        <div>
          <span className="text-[10px] uppercase tracking-wide text-[#8A8A8A] dark:text-[#666666] font-mono mb-1 block">
            Breakpoint source
          </span>
          <InspectorSegmented
            value={opts.breakpointSource}
            options={[
              { value: "desktop", label: "Desktop" },
              { value: "active", label: "Active artboard" },
            ]}
            onChange={(v) =>
              setOpts((o) => ({
                ...o,
                breakpointSource: v as ExportOptions["breakpointSource"],
              }))
            }
          />
        </div>
      )}

      {externalImageCount > 0 && (
        <p
          className="text-[11px] text-amber-800 dark:text-amber-200/90 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/50 rounded-[4px] px-2 py-2"
          role="status"
        >
          This export references {externalImageCount} external{" "}
          {externalImageCount === 1 ? "image" : "images"} — they require
          internet access to display.
        </p>
      )}

      <div className="rounded-[4px] border border-[var(--border-primary)] bg-[var(--surface-secondary)] px-2.5 py-2">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wide text-[#8A8A8A] dark:text-[#666666]">
            Publish preflight
          </span>
          <span className={preflight.ready ? "text-[10px] text-emerald-600 dark:text-emerald-400" : "text-[10px] text-amber-700 dark:text-amber-300"}>
            {preflight.ready ? "Ready" : "Needs review"}
          </span>
        </div>
        {preflight.issues.length === 0 ? (
          <p className="text-[11px] text-text-muted">
            No blocking issues found. Preview the page before sending it to a client.
          </p>
        ) : (
          <div className="space-y-1.5">
            {preflight.issues.slice(0, 4).map((issue) => (
              <div key={issue.id} className="text-[11px] leading-snug">
                <span
                  className={
                    issue.severity === "error"
                      ? "text-red-600 dark:text-red-400"
                      : issue.severity === "warning"
                        ? "text-amber-700 dark:text-amber-300"
                        : "text-text-muted"
                  }
                >
                  {issue.label}
                </span>
                <span className="text-text-muted"> — {issue.detail}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectionNotOnSourceTree && (
        <p className="text-[11px] text-text-muted">
          This selection is not on the{" "}
          {opts.breakpointSource === "desktop" ? "desktop" : "active"} artboard
          tree. Switch to Full page, change breakpoint source, or select a node
          on that artboard.
        </p>
      )}

      {opts.scope === "selection" && !selectedNodeId && !selectionNotOnSourceTree ? (
        <p className="text-[11px] text-text-muted">Select a node to export</p>
      ) : htmlString && !selectionNotOnSourceTree ? (
        <>
          <pre
            className="text-[11px] text-[#6B6B6B] dark:text-[#D0D0D0] bg-[#F5F5F0] dark:bg-[#222222] rounded-[4px] p-3 overflow-x-auto whitespace-pre-wrap break-all overflow-y-auto flex-1 min-h-0"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            {htmlString}
          </pre>

          {clipboardError && (
            <p className="text-[11px] text-red-600 dark:text-red-400">{clipboardError}</p>
          )}

          <StudioButton
            type="button"
            variant="primary"
            className="w-full shrink-0 text-[12px]"
            onClick={handleCopy}
          >
            {copied ? "Copied!" : "Copy HTML"}
          </StudioButton>

          <StudioButton
            type="button"
            variant="secondary"
            className="w-full shrink-0 text-[12px]"
            onClick={handleDownloadZip}
            disabled={zipLoading || publishLoading}
          >
            {zipLoading ? "Building ZIP…" : "Download ZIP"}
          </StudioButton>

          <div className="border-t border-[var(--border-primary)] pt-3 mt-1 space-y-2">
            <span className="text-[10px] uppercase tracking-wide text-[#8A8A8A] dark:text-[#666666] font-mono block">
              Publish
            </span>
            {opts.outputMode === "fragment" && (
              <p className="text-[10px] text-text-muted leading-snug">
                Tip: switch Output to &quot;HTML document&quot; for a full page when
                sharing in the browser.
              </p>
            )}
            <StudioButton
              type="button"
              variant="secondary"
              className="w-full shrink-0 text-[12px]"
              onClick={handlePublish}
              disabled={publishLoading || zipLoading || !preflight.ready}
            >
              {publishLoading ? "Publishing…" : "Publish link"}
            </StudioButton>
            {publishNeedsSignIn && (
              <p className="text-[11px] text-text-muted">
                <Link
                  href="/auth/login"
                  className="text-[#4B57DB] dark:text-[#7B8CFF] underline underline-offset-2"
                >
                  Sign in
                </Link>{" "}
                to publish a shareable link.
              </p>
            )}
            {publishError && !publishNeedsSignIn && (
              <p className="text-[11px] text-red-600 dark:text-red-400 break-words">
                {publishError}
              </p>
            )}
            {publishUrl && (
              <div className="space-y-2">
                <p className="text-[10px] text-text-muted font-mono break-all">
                  {publishUrl}
                </p>
                <div className="flex gap-2">
                  <StudioButton
                    type="button"
                    variant="secondary"
                    className="flex-1 text-[12px]"
                    onClick={handleCopyPublishUrl}
                  >
                    {linkCopied ? "Copied!" : "Copy link"}
                  </StudioButton>
                  <StudioButton
                    type="button"
                    variant="ghost"
                    className="flex-1 text-[12px]"
                    onClick={() =>
                      window.open(publishUrl, "_blank", "noopener,noreferrer")
                    }
                  >
                    Open
                  </StudioButton>
                </div>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
