"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { CollageLayout } from "@/lib/export/collage-export";

export type ExportReference = {
  id: string;
  imageUrl: string;
  board: string;
  notes?: string;
  tags: {
    style: string[];
    colors: string[];
    contentType: string[];
    mood: string[];
    ai: string[];
  };
  curationStatus?: string | null;
};

type ExportMenuProps = {
  references: ExportReference[];
  projectName?: string;
  onToast?: (message: string, type?: "success" | "error" | "loading") => void;
};

type ExportStep =
  | "idle"
  | "pdf-loading"
  | "png-layout"
  | "png-loading"
  | "share-loading"
  | "share-done"
  | "pro-prompt";

export function ExportMenu({
  references,
  projectName = "Studio Moodboard",
  onToast,
}: ExportMenuProps) {
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState<ExportStep>("idle");
  const [shareUrl, setShareUrl] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
        if (step !== "share-done") setStep("idle");
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, step]);

  // Filter out rejected references
  const exportable = references.filter((r) => r.curationStatus !== "reject");

  async function handlePDF() {
    setStep("pdf-loading");
    onToast?.("Generating PDF…", "loading");
    try {
      const { exportMoodboardPDF } = await import("@/lib/export/pdf-export");
      await exportMoodboardPDF(exportable, projectName);
      onToast?.("PDF downloaded ✓");
    } catch (e) {
      console.error(e);
      onToast?.("PDF export failed", "error");
    } finally {
      setStep("idle");
      setOpen(false);
    }
  }

  async function handleCollage(layout: CollageLayout) {
    setStep("png-loading");
    onToast?.("Generating collage…", "loading");
    try {
      const { exportMoodboardCollage } = await import(
        "@/lib/export/collage-export"
      );
      await exportMoodboardCollage(exportable, layout, projectName);
      onToast?.("PNG downloaded ✓");
    } catch (e) {
      console.error(e);
      onToast?.("PNG export failed", "error");
    } finally {
      setStep("idle");
      setOpen(false);
    }
  }

  async function handleShareLink() {
    setStep("share-loading");
    onToast?.("Creating share link…", "loading");
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ references: exportable, projectName }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // Not configured yet
        if (res.status === 503 || res.status === 401) {
          onToast?.("Share links require Supabase + the shares migration", "error");
          setStep("idle");
          return;
        }
        throw new Error(data.error ?? "Failed to create share");
      }

      const data = await res.json();
      setShareUrl(data.shareUrl);
      setStep("share-done");
      onToast?.("Share link ready ✓");
    } catch (e) {
      console.error(e);
      onToast?.("Failed to create share link", "error");
      setStep("idle");
    }
  }

  async function copyShareUrl() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      onToast?.("Link copied ✓");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onToast?.("Could not copy — try manually", "error");
    }
  }

  const isLoading =
    step === "pdf-loading" ||
    step === "png-loading" ||
    step === "share-loading";

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => {
          setOpen((prev) => !prev);
          if (!open) {
            setStep("idle");
            setShareUrl(null);
            setCopied(false);
          }
        }}
        disabled={exportable.length === 0}
        className={cn(
          "flex items-center gap-1.5 border border-border-primary bg-bg-secondary px-3 py-1.5",
          "text-[11px] font-medium uppercase tracking-[0.15em] text-gray-400",
          "transition-[border-color,color] duration-200 ease-out hover:border-white/20 hover:text-white",
          "disabled:cursor-not-allowed disabled:opacity-40",
          open && "border-white/20 text-white"
        )}
        title="Export moodboard"
      >
        {/* Download arrow icon */}
        <svg
          viewBox="0 0 16 16"
          className="h-3 w-3 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8 1v9M4.5 7l3.5 3.5L11.5 7" />
          <path d="M2 13h12" />
        </svg>
        Export
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className={cn(
            "absolute right-0 top-[calc(100%+6px)] z-50 min-w-[220px]",
            "border border-border-primary bg-bg-secondary p-2 shadow-2xl"
          )}
        >
          <p className="mb-1 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.15em] text-gray-600">
            Export Moodboard
          </p>

          {/* ── PDF ── */}
          {step !== "png-layout" && step !== "share-done" && (
            <button
              type="button"
              onClick={handlePDF}
              disabled={isLoading}
              className={cn(
                "flex w-full items-center justify-between px-3 py-2.5",
                "text-sm text-gray-300 transition-colors duration-150 hover:bg-sidebar-active hover:text-white",
                "disabled:cursor-not-allowed disabled:opacity-40"
              )}
            >
              <span className="flex items-center gap-2.5">
                <span className="text-base leading-none">📄</span>
                <span>PDF Document</span>
              </span>
              {step === "pdf-loading" ? (
                <span className="h-3 w-3 animate-spin rounded-full border border-white/20 border-t-white" />
              ) : (
                <svg
                  viewBox="0 0 16 16"
                  className="h-3 w-3 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M6 4l4 4-4 4" />
                </svg>
              )}
            </button>
          )}

          {/* ── PNG — layout picker ── */}
          {step !== "share-done" && (
            <>
              {step !== "png-layout" ? (
                <button
                  type="button"
                  onClick={() => setStep("png-layout")}
                  disabled={isLoading}
                  className={cn(
                    "flex w-full items-center justify-between px-3 py-2.5",
                    "text-sm text-gray-300 transition-colors duration-150 hover:bg-sidebar-active hover:text-white",
                    "disabled:cursor-not-allowed disabled:opacity-40"
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <span className="text-base leading-none">🖼</span>
                    <span>PNG Collage</span>
                  </span>
                  {step === "png-loading" ? (
                    <span className="h-3 w-3 animate-spin rounded-full border border-white/20 border-t-white" />
                  ) : (
                    <svg
                      viewBox="0 0 16 16"
                      className="h-3 w-3 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path d="M6 4l4 4-4 4" />
                    </svg>
                  )}
                </button>
              ) : (
                /* Layout picker sub-menu */
                <div className="border border-card-border bg-bg-tertiary p-2">
                  <div className="mb-1.5 flex items-center gap-2 px-2">
                    <button
                      type="button"
                      onClick={() => setStep("idle")}
                      className="text-gray-600 hover:text-white"
                    >
                      ←
                    </button>
                    <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-gray-600">
                      Choose layout
                    </span>
                  </div>
                  {(
                    [
                      { id: "grid", label: "Grid", desc: "Equal-size cells" },
                      { id: "masonry", label: "Masonry", desc: "Varied heights" },
                      { id: "minimal", label: "Minimal", desc: "2×2 with whitespace" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleCollage(opt.id)}
                      className={cn(
                        "flex w-full items-center justify-between px-3 py-2",
                        "text-sm text-gray-300 transition-colors duration-150 hover:bg-sidebar-active hover:text-white",
                        "disabled:cursor-not-allowed disabled:opacity-40"
                      )}
                    >
                      <span className="font-medium">{opt.label}</span>
                      <span className="text-[11px] text-gray-600">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── Share link ── */}
          {step !== "png-layout" && (
            <>
              {step !== "share-done" ? (
                <button
                  type="button"
                  onClick={handleShareLink}
                  disabled={isLoading}
                  className={cn(
                    "flex w-full items-center justify-between px-3 py-2.5",
                    "text-sm text-gray-300 transition-colors duration-150 hover:bg-sidebar-active hover:text-white",
                    "disabled:cursor-not-allowed disabled:opacity-40"
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <span className="text-base leading-none">🔗</span>
                    <span>Share Link</span>
                  </span>
                  {step === "share-loading" ? (
                    <span className="h-3 w-3 animate-spin rounded-full border border-white/20 border-t-white" />
                  ) : (
                    <svg
                      viewBox="0 0 16 16"
                      className="h-3 w-3 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path d="M6 4l4 4-4 4" />
                    </svg>
                  )}
                </button>
              ) : (
                /* Share URL display */
                <div className="border border-card-border bg-bg-tertiary p-3">
                  <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.12em] text-gray-600">
                    Share link ready
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={shareUrl ?? ""}
                      className="min-w-0 flex-1 rounded border border-border-primary bg-bg-secondary px-2 py-1.5 font-mono text-[10px] text-gray-400 outline-none focus:border-white/20"
                    />
                    <button
                      type="button"
                      onClick={copyShareUrl}
                      className={cn(
                        "shrink-0 rounded border border-border-primary px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                        copied
                          ? "border-green-700/50 bg-green-950 text-green-400"
                          : "bg-sidebar-active text-gray-300 hover:border-white/20 hover:text-white"
                      )}
                    >
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("idle");
                      setShareUrl(null);
                    }}
                    className="mt-2 text-[10px] text-gray-700 hover:text-gray-400"
                  >
                    ← Back
                  </button>
                </div>
              )}
            </>
          )}

          {/* ── Divider ── */}
          {step !== "png-layout" && step !== "share-done" && (
            <div className="my-1 h-px bg-bg-input" />
          )}

          {/* ── Brand Package (PRO) ── */}
          {step !== "png-layout" && step !== "share-done" && (
            <button
              type="button"
              onClick={() => setStep("pro-prompt")}
              className={cn(
                "flex w-full items-center justify-between px-3 py-2.5",
                "text-sm text-gray-500 transition-colors duration-150 hover:bg-sidebar-active hover:text-gray-400"
              )}
            >
              <span className="flex items-center gap-2.5">
                <span className="text-base leading-none">📦</span>
                <span>Brand Package</span>
              </span>
              <span className="rounded-full bg-[#2430AD]/10 px-2 py-0.5 text-[10px] font-medium text-[#2430AD]">
                PRO
              </span>
            </button>
          )}

          {/* PRO upgrade prompt */}
          {step === "pro-prompt" && (
            <div className="mt-1 border border-card-border bg-bg-tertiary p-3">
              <p className="mb-1 text-xs font-medium text-white">
                Brand Package
              </p>
              <p className="mb-3 text-[11px] leading-relaxed text-gray-500">
                Export a ZIP with your moodboard PDF, color palette, font
                pairings, and project brief in one bundle.
              </p>
              <button
                type="button"
                className="w-full bg-[#2430AD] px-3 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90"
                onClick={() => {
                  setStep("idle");
                  setOpen(false);
                }}
              >
                Upgrade to Pro →
              </button>
              <button
                type="button"
                onClick={() => setStep("idle")}
                className="mt-2 w-full text-center text-[10px] text-gray-700 hover:text-gray-400"
              >
                Not now
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
