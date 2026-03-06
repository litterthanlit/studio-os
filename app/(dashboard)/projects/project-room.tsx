"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ColorPickerPanel } from "@/components/color-picker";
import { DotSeparator } from "@/components/ui/dot-separator";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  ImportReferenceModal,
  type Reference as MoodboardReference,
} from "@/components/modals/import-reference-modal";
import { FontPicker } from "@/components/font-picker";
import { getFontCssFamily } from "@/lib/fonts/load-font";
import type { Project, ProjectFont } from "./projects-data";

export type { Phase, Project } from "./projects-data";
export { PROJECTS, PHASE_STYLES } from "./projects-data";

// ─── Project room sections ───────────────────────────────────────────────────

export function ProjectRoomSections({ project }: { project: Project }) {
  return (
    <div className="pb-16">
      <section id="board" className="py-8 border-b border-card-border">
        <BoardTab project={project} />
      </section>

      <section id="type" className="py-8 border-b border-card-border">
        <TypeTab project={project} />
      </section>

      <section id="palette" className="py-8 border-b border-card-border">
        <PaletteTab project={project} />
      </section>

      {/* Canvas — generate a site from this project's references + palette */}
      <section id="canvas" className="py-8 border-b border-card-border">
        <CanvasLauncher project={project} />
      </section>

      <section id="tasks" className="py-8 border-b border-card-border">
        <TasksTab projectId={project.id} />
      </section>

      <section id="overview" className="py-8">
        <OverviewTab project={project} />
      </section>
    </div>
  );
}

function CanvasLauncher({ project }: { project: Project }) {
  const refCount = readProjectReferences(project.id).length;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[8px] leading-none text-text-tertiary transition-colors duration-300">■</span>
            <span className="text-[11px] uppercase tracking-[0.15em] font-medium text-text-tertiary transition-colors duration-300">
              Canvas
            </span>
          </div>
          <p className="text-xs text-text-muted transition-colors duration-300">
            Generate a full site from your references, palette, and typography
          </p>
        </div>
        <a
          href={`/canvas?project=${encodeURIComponent(project.id)}`}
          className="inline-flex items-center gap-2 border border-accent bg-accent/10 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.12em] text-accent transition-colors duration-200 hover:bg-accent/20"
        >
          Open Canvas
          <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3">
            <path d="M2 10L10 2M10 2H4M10 2v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      </div>
      <div className="flex items-center gap-4 text-[10px] text-text-muted font-mono transition-colors duration-300">
        <span>{refCount} reference{refCount !== 1 ? "s" : ""} ready</span>
        <span className="text-text-muted/30">·</span>
        <span>{project.palette.length} palette colors</span>
        {project.headingFont && (
          <>
            <span className="text-text-muted/30">·</span>
            <span>{project.headingFont.family}</span>
          </>
        )}
      </div>
    </div>
  );
}

function OverviewTab({ project: _project }: { project: Project }) {
  const [notes, setNotes] = React.useState(
    "Capture the core constraints, success criteria, and non-negotiables here."
  );

  return (
    <div className="space-y-2">
      <div className="text-[11px] font-medium uppercase tracking-[0.15em] text-gray-400 transition-colors duration-300">
        Brief
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="h-32 w-full border border-card-border bg-transparent px-3 py-2 text-sm text-text-primary outline-none transition-[border-color,background-color,color] duration-300 ease-out focus:border-accent rounded-md resize-none leading-relaxed placeholder:text-gray-600"
        placeholder="Capture the core constraints, success criteria, and non-negotiables here."
      />
    </div>
  );
}

type LegacyStoredReference = { imageUrl: string; title?: string; tags?: string[] };

function referencesStorageKey(projectId: string) {
  return `studio-os:references:${projectId}`;
}

function isImageUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    if (!["http:", "https:"].includes(url.protocol)) return false;
    return /\.(png|jpe?g|gif|webp|avif|svg)(\?.*)?$/i.test(url.pathname + url.search);
  } catch {
    return false;
  }
}

function toSafeReference(
  value: unknown,
  projectId: string
): MoodboardReference | null {
  if (!value || typeof value !== "object") return null;
  const ref = value as Partial<MoodboardReference> & LegacyStoredReference;
  if (!ref.imageUrl) return null;

  const allowedSources: MoodboardReference["source"][] = [
    "upload",
    "arena",
    "pinterest",
    "url",
  ];
  const safeSource =
    typeof ref.source === "string" &&
    allowedSources.includes(ref.source as MoodboardReference["source"])
      ? (ref.source as MoodboardReference["source"])
      : null;

  if (
    typeof ref.id === "string" &&
    safeSource &&
    typeof ref.addedAt === "string" &&
    typeof ref.projectId === "string"
  ) {
    return {
      id: ref.id,
      imageUrl: ref.imageUrl,
      source: safeSource,
      sourceUrl: ref.sourceUrl,
      title: ref.title,
      addedAt: ref.addedAt,
      projectId: ref.projectId,
    };
  }

  return {
    id: `legacy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    imageUrl: ref.imageUrl,
    source: "url",
    sourceUrl: ref.imageUrl,
    title: ref.title ?? "Reference",
    addedAt: new Date().toISOString(),
    projectId,
  };
}

function readProjectReferences(projectId: string): MoodboardReference[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(referencesStorageKey(projectId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => toSafeReference(item, projectId))
      .filter((item): item is MoodboardReference => item !== null);
  } catch {
    return [];
  }
}

function writeProjectReferences(projectId: string, references: MoodboardReference[]) {
  localStorage.setItem(referencesStorageKey(projectId), JSON.stringify(references));
  window.dispatchEvent(new Event("project-references-updated"));
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Failed to read image"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read image"));
    reader.readAsDataURL(file);
  });
}

function BoardTab({ project }: { project: Project }) {
  const [references, setReferences] = React.useState<MoodboardReference[]>([]);
  const [loadedProjectId, setLoadedProjectId] = React.useState<string | null>(null);
  const [isDragActive, setIsDragActive] = React.useState(false);
  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [initialImportMode, setInitialImportMode] = React.useState<
    "upload" | "arena" | "pinterest" | "url"
  >("upload");
  const [initialImportUrl, setInitialImportUrl] = React.useState("");
  const [notice, setNotice] = React.useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = React.useState<{
    done: number;
    total: number;
  } | null>(null);
  const [activeLightboxRef, setActiveLightboxRef] =
    React.useState<MoodboardReference | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    setReferences(readProjectReferences(project.id));
    setLoadedProjectId(project.id);
  }, [project.id]);

  React.useEffect(() => {
    if (loadedProjectId !== project.id) return;
    writeProjectReferences(project.id, references);
  }, [loadedProjectId, project.id, references]);

  React.useEffect(() => {
    function onDocumentPaste(e: ClipboardEvent) {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (!e.clipboardData) return;

      const items = Array.from(e.clipboardData.items);
      const imageFiles = items
        .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
        .map((item) => item.getAsFile())
        .filter((f): f is File => f !== null);

      if (imageFiles.length > 0) {
        e.preventDefault();
        void importFiles(imageFiles);
        return;
      }

      const text = e.clipboardData.getData("text");
      if (text && isImageUrl(text)) {
        e.preventDefault();
        openImport("url", text);
      }
    }

    document.addEventListener("paste", onDocumentPaste);
    return () => document.removeEventListener("paste", onDocumentPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  function openImport(mode: "upload" | "arena" | "pinterest" | "url", initialUrl = "") {
    setInitialImportMode(mode);
    setInitialImportUrl(initialUrl);
    setIsImportOpen(true);
  }

  function handleImport(payload: { references: MoodboardReference[]; notice?: string }) {
    if (payload.references.length === 0) return;
    setReferences((prev) => [...payload.references, ...prev]);
    setNotice(payload.notice ?? null);
  }

  async function importFiles(files: File[]) {
    const validFiles = files.filter((file) =>
      ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type)
    );
    if (validFiles.length === 0) return;

    setUploadProgress({ done: 0, total: validFiles.length });
    const now = new Date().toISOString();
    const next: MoodboardReference[] = [];

    for (let i = 0; i < validFiles.length; i += 1) {
      const file = validFiles[i];
      const dataUrl = await fileToDataUrl(file);
      next.push({
        id: `upload-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
        imageUrl: dataUrl,
        source: "upload",
        title: file.name,
        addedAt: now,
        projectId: project.id,
      });
      setUploadProgress({ done: i + 1, total: validFiles.length });
    }

    setReferences((prev) => [...next, ...prev]);
    setNotice(`Added ${next.length} upload${next.length === 1 ? "" : "s"}.`);
    setTimeout(() => setUploadProgress(null), 600);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragActive(false);
    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) void importFiles(files);
  }

  function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    const items = Array.from(event.clipboardData.items);
    const imageFiles = items
      .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((f): f is File => f !== null);

    if (imageFiles.length > 0) {
      event.preventDefault();
      void importFiles(imageFiles);
      return;
    }

    const text = event.clipboardData.getData("text");
    if (!text || !isImageUrl(text)) return;
    event.preventDefault();
    openImport("url", text);
  }

  function removeReference(id: string) {
    setReferences((prev) => prev.filter((ref) => ref.id !== id));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-medium uppercase tracking-[0.15em] text-gray-400 transition-colors duration-300">
          References
        </div>
        {references.length > 0 && (
          <button
            type="button"
            onClick={() => openImport("upload")}
            aria-label="Quick add references"
            className="border border-card-border bg-bg-secondary px-2 py-1 text-xs text-text-secondary transition-colors duration-300 hover:border-white/30 hover:text-white rounded-lg"
          >
            +
          </button>
        )}
      </div>

      {notice && (
        <p className="text-xs text-gray-500 transition-colors duration-300">{notice}</p>
      )}

      {uploadProgress && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-gray-500 transition-colors duration-300">
            <span>Processing uploads</span>
            <span>
              {uploadProgress.done}/{uploadProgress.total}
            </span>
          </div>
          <div className="h-1 bg-sidebar-active transition-colors duration-300">
            <div
              className="h-full bg-accent transition-[width] duration-200"
              style={{
                width: `${Math.round((uploadProgress.done / uploadProgress.total) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (files.length > 0) void importFiles(files);
          event.currentTarget.value = "";
        }}
      />

      {/* ── Drop zone wrapper ─────────────────────────────────────────── */}
      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!isDragActive) setIsDragActive(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) {
            setIsDragActive(false);
          }
        }}
        onDrop={handleDrop}
        onPaste={handlePaste}
        className="relative"
      >
        {references.length === 0 ? (
          /* ── Empty state: large Notion-style drop zone ── */
          <motion.div
            animate={isDragActive ? { scale: 1.01 } : { scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "relative flex cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed px-8 py-16 text-center transition-colors duration-200",
              isDragActive
                ? "border-[var(--accent)] bg-[var(--accent)]/5"
                : "border-[var(--border-secondary)] bg-[var(--bg-secondary)] hover:border-[var(--accent)]/50 hover:bg-[var(--bg-tertiary)]"
            )}
          >
            {/* Upload icon */}
            <motion.div
              animate={isDragActive ? { y: -6 } : { y: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-xl border transition-colors duration-200",
                isDragActive
                  ? "border-[var(--accent)]/40 bg-[var(--accent)]/10 text-[var(--accent)]"
                  : "border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-tertiary)]"
              )}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13V4M10 4L7 7M10 4L13 7" />
                <path d="M3 14v1a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1" />
              </svg>
            </motion.div>

            {/* Text */}
            <div className="space-y-1">
              <p className={cn(
                "text-sm font-medium transition-colors duration-200",
                isDragActive ? "text-[var(--accent)]" : "text-[var(--text-primary)]"
              )}>
                {isDragActive ? "Release to drop" : "Drop images here"}
              </p>
              <p className="text-[11px] text-[var(--text-tertiary)]">
                PNG, JPG, WEBP, GIF · or click to browse
              </p>
            </div>

            {/* Divider */}
            <div className="flex w-full max-w-[240px] items-center gap-3">
              <div className="h-px flex-1 bg-[var(--border-primary)]" />
              <span className="text-[10px] font-sans uppercase tracking-[0.1em] text-[var(--text-tertiary)]">or import from</span>
              <div className="h-px flex-1 bg-[var(--border-primary)]" />
            </div>

            {/* Source buttons */}
            <div
              className="flex flex-wrap items-center justify-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              {[
                { label: "Are.na", mode: "arena" as const },
                { label: "Pinterest", mode: "pinterest" as const },
                { label: "URL", mode: "url" as const },
              ].map(({ label, mode }) => (
                <button
                  key={mode}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); openImport(mode); }}
                  className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-1.5 text-[11px] font-sans uppercase tracking-[0.08em] text-[var(--text-secondary)] transition-colors duration-150 hover:border-[var(--accent)]/50 hover:text-[var(--text-primary)]"
                >
                  {label}
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          /* ── Has content: grid + drag overlay ── */
          <div className="relative">
            {/* Drag overlay */}
            <AnimatePresence>
            {isDragActive && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[var(--accent)] bg-[var(--accent)]/8 backdrop-blur-[2px]"
              >
                <motion.div
                  animate={{ y: [-4, 0, -4] }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--accent)]/40 bg-[var(--accent)]/15 text-[var(--accent)]"
                >
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13V4M10 4L7 7M10 4L13 7" />
                    <path d="M3 14v1a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1" />
                  </svg>
                </motion.div>
                <p className="text-xs font-sans font-medium uppercase tracking-[0.1em] text-[var(--accent)]">
                  Release to add
                </p>
              </motion.div>
            )}
            </AnimatePresence>

            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
              {references.map((ref) => (
                <article
                  key={ref.id}
                  className="group relative overflow-hidden border border-card-border bg-card-bg transition-colors duration-300 rounded-xl"
                >
                  <button
                    type="button"
                    onClick={() => setActiveLightboxRef(ref)}
                    className="block w-full"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ref.imageUrl}
                      alt={ref.title ?? "Reference"}
                      className="h-40 w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      loading="lazy"
                    />
                  </button>

                  <div className="pointer-events-none absolute left-2 top-2 rounded border border-white/20 bg-black/70 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.1em] text-white backdrop-blur-sm">
                    {ref.source}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeReference(ref.id)}
                    aria-label="Delete reference"
                    className="absolute right-2 top-2 rounded border border-red-500/40 bg-black/80 px-1.5 py-0.5 text-[10px] text-red-300 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"
                  >
                    ×
                  </button>

                  <div className="space-y-1 p-2">
                    <p className="truncate text-[11px] text-[var(--text-secondary)] transition-colors duration-300">
                      {ref.title || "Untitled"}
                    </p>
                    {ref.sourceUrl && (
                      <a
                        href={ref.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-[var(--accent)] transition-opacity hover:opacity-80"
                      >
                        Open source
                      </a>
                    )}
                  </div>
                </article>
              ))}

              {/* ── Add more tile ── */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="group flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--border-secondary)] bg-[var(--bg-secondary)] transition-colors duration-200 hover:border-[var(--accent)]/50 hover:bg-[var(--bg-tertiary)]"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-tertiary)] transition-colors duration-200 group-hover:border-[var(--accent)]/40 group-hover:text-[var(--accent)]">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M7 2v10M2 7h10" />
                  </svg>
                </div>
                <span className="text-[10px] font-sans uppercase tracking-[0.1em] text-[var(--text-tertiary)] transition-colors duration-200 group-hover:text-[var(--text-secondary)]">
                  Add more
                </span>
              </motion.div>
            </div>

            {/* Import from source buttons when board has content */}
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                { label: "Are.na", mode: "arena" as const },
                { label: "Pinterest", mode: "pinterest" as const },
                { label: "URL", mode: "url" as const },
              ].map(({ label, mode }) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => openImport(mode)}
                  className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-3 py-1.5 text-[11px] font-sans uppercase tracking-[0.08em] text-[var(--text-tertiary)] transition-colors duration-150 hover:border-[var(--accent)]/50 hover:text-[var(--text-primary)]"
                >
                  + {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <ImportReferenceModal
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        projectId={project.id}
        onImport={handleImport}
        initialMode={initialImportMode}
        initialUrl={initialImportUrl}
      />

      <Dialog open={Boolean(activeLightboxRef)} onOpenChange={(open) => !open && setActiveLightboxRef(null)}>
        <DialogContent className="max-w-[900px] transition-colors duration-300">
          <div className="space-y-3">
            <DialogTitle className="text-sm uppercase tracking-[0.12em] text-text-tertiary transition-colors duration-300">
              Reference preview
            </DialogTitle>
            {activeLightboxRef && (
              <>
                <div className="border border-card-border bg-bg-secondary p-2 transition-colors duration-300 rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activeLightboxRef.imageUrl}
                    alt={activeLightboxRef.title ?? "Reference"}
                    className="max-h-[72vh] w-full object-contain"
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-text-secondary transition-colors duration-300">
                  <span className="truncate pr-4 transition-colors duration-300">
                    {activeLightboxRef.title || "Untitled"} · {activeLightboxRef.source}
                  </span>
                  <div className="flex items-center gap-2">
                    {activeLightboxRef.sourceUrl && (
                      <a
                        href={activeLightboxRef.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="border border-card-border bg-bg-secondary px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] text-text-secondary transition-colors duration-300 hover:text-white rounded-lg"
                      >
                        Open source
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setActiveLightboxRef(null)}
                      className="border border-card-border bg-bg-secondary px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] text-text-secondary transition-colors duration-300 hover:text-white rounded-lg"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TypeTab({ project }: { project: Project }) {
  const [isPickerOpen, setIsPickerOpen] = React.useState(false);
  const [headingFont, setHeadingFont] = React.useState<ProjectFont | undefined>(
    project.headingFont
  );
  const [bodyFont, setBodyFont] = React.useState<ProjectFont | undefined>(
    project.bodyFont
  );

  const handleFontSelect = (newHeading: ProjectFont, newBody: ProjectFont) => {
    setHeadingFont(newHeading);
    setBodyFont(newBody);
    // Here you would typically save to your backend/state management
    // For now, we'll just update local state
  };

  const headingStyle = headingFont
    ? { fontFamily: getFontCssFamily({ family: headingFont.family, source: headingFont.source, category: headingFont.category, variants: ["400", "700"] }) }
    : {};
  const bodyStyle = bodyFont
    ? { fontFamily: getFontCssFamily({ family: bodyFont.family, source: bodyFont.source, category: bodyFont.category, variants: ["400"] }) }
    : {};

  return (
    <div className="space-y-3">
      <div className="text-[11px] font-medium uppercase tracking-[0.15em] text-gray-400 transition-colors duration-300">
        Typography
      </div>
      <div className="border border-card-border bg-bg-secondary p-3 transition-colors duration-300 rounded-lg">
        <div className="flex items-start gap-6">
          {/* Left: Preview text */}
          <div className="flex-1 space-y-1 text-sm text-text-primary transition-colors duration-300">
            <div className="text-lg font-bold transition-colors duration-300" style={headingStyle}>
              Studio OS project spine
            </div>
            <div className="text-xs transition-colors duration-300" style={bodyStyle}>
              The quick brown fox jumps over the lazy dog.
            </div>
          </div>
          {/* Right: Labels */}
          <div className="flex flex-col items-end gap-0.5 text-[11px] font-light text-gray-500 transition-colors duration-300 text-right">
            <span className="transition-colors duration-300">Heading: {headingFont?.family || "Not selected"}</span>
            <span className="transition-colors duration-300">Body: {bodyFont?.family || "Not selected"}</span>
          </div>
        </div>
        {/* Button on the left */}
        <div className="mt-4 flex justify-start">
          <button
            type="button"
            onClick={() => setIsPickerOpen(true)}
            className="border border-card-border bg-transparent px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.07em] text-gray-400 transition-[border-color,color,background-color] duration-300 ease-out hover:border-white/20 hover:text-text-primary rounded-md"
          >
            Change Font
          </button>
        </div>
      </div>

      <FontPicker
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelect={handleFontSelect}
        initialHeadingFont={headingFont}
        initialBodyFont={bodyFont}
      />
    </div>
  );
}

// ─── Palette Types ────────────────────────────────────────────────────────────

type Swatch = { id: string; color: string; name: string };

// Auto-name colors based on hex value
function getColorName(hex: string): string {
  const normalized = hex.toLowerCase().replace('#', '');
  
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  
  // Grays (where R, G, B are very similar)
  const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
  
  if (maxDiff < 20) {
    const avg = Math.round((r + g + b) / 3);
    if (avg < 30) return "Black";
    if (avg < 80) return "Near Black";
    if (avg < 140) return "Dark Gray";
    if (avg < 200) return "Medium Gray";
    if (avg < 240) return "Light Gray";
    return "White";
  }
  
  // Convert to HSL for better color naming
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const delta = max - min;
  
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  
  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    
    switch (max) {
      case rNorm:
        h = ((gNorm - bNorm) / delta + (gNorm < bNorm ? 6 : 0)) / 6;
        break;
      case gNorm:
        h = ((bNorm - rNorm) / delta + 2) / 6;
        break;
      case bNorm:
        h = ((rNorm - gNorm) / delta + 4) / 6;
        break;
    }
  }
  
  const hue = h * 360;
  const saturation = s;
  const lightness = l;
  
  // Determine lightness modifier
  let modifier = "";
  if (lightness > 0.85) modifier = "Light ";
  else if (lightness > 0.65) modifier = "";
  else if (lightness > 0.45) modifier = "Medium ";
  else if (lightness > 0.25) modifier = "Dark ";
  else modifier = "Deep ";
  
  // Very low saturation - treat as grayish
  if (saturation < 0.1) {
    return modifier.trim() + " Gray";
  }
  
  // Determine base color from hue
  let baseColor = "";
  
  if (hue >= 355 || hue < 10) {
    baseColor = "Red";
  } else if (hue >= 10 && hue < 20) {
    baseColor = "Red-Orange";
  } else if (hue >= 20 && hue < 38) {
    baseColor = "Orange";
  } else if (hue >= 38 && hue < 50) {
    baseColor = "Amber";
  } else if (hue >= 50 && hue < 60) {
    baseColor = "Gold";
  } else if (hue >= 60 && hue < 75) {
    baseColor = "Yellow";
  } else if (hue >= 75 && hue < 90) {
    baseColor = "Lime";
  } else if (hue >= 90 && hue < 140) {
    baseColor = "Green";
  } else if (hue >= 140 && hue < 165) {
    baseColor = "Emerald";
  } else if (hue >= 165 && hue < 185) {
    baseColor = "Teal";
  } else if (hue >= 185 && hue < 200) {
    baseColor = "Cyan";
  } else if (hue >= 200 && hue < 220) {
    baseColor = "Sky";
  } else if (hue >= 220 && hue < 240) {
    baseColor = "Blue";
  } else if (hue >= 240 && hue < 260) {
    baseColor = "Indigo";
  } else if (hue >= 260 && hue < 280) {
    baseColor = "Violet";
  } else if (hue >= 280 && hue < 300) {
    baseColor = "Purple";
  } else if (hue >= 300 && hue < 315) {
    baseColor = "Magenta";
  } else if (hue >= 315 && hue < 330) {
    baseColor = "Pink";
  } else if (hue >= 330 && hue < 345) {
    baseColor = "Rose";
  } else {
    baseColor = "Red";
  }
  
  return (modifier + baseColor).trim();
}

function PaletteTab({ project }: { project: Project }) {
  const [swatches, setSwatches] = React.useState<Swatch[]>(() =>
    project.palette.map((color, i) => ({
      id: `swatch-${i}`,
      color,
      name: getColorName(color),
    }))
  );
  const [openPickerId, setOpenPickerId] = React.useState<string | null>(null);
  const [pickerPosition, setPickerPosition] = React.useState({ top: 0, left: 0 });

  function addSwatch() {
    const id = `swatch-${Date.now()}`;
    setSwatches((prev) => [...prev, { id, color: "#2430AD", name: "" }]);
  }

  function updateColor(id: string, color: string) {
    setSwatches((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, color, name: getColorName(color) } : s
      )
    );
  }

  function removeSwatch(id: string) {
    setSwatches((prev) => prev.filter((s) => s.id !== id));
    if (openPickerId === id) setOpenPickerId(null);
  }

  function openPicker(swatchId: string, triggerEl: HTMLElement) {
    const rect = triggerEl.getBoundingClientRect();
    const PANEL_H = 360;
    const PANEL_W = 248;
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const top = spaceBelow >= PANEL_H ? rect.bottom + 8 : rect.top - PANEL_H - 8;
    const left = Math.min(rect.left, window.innerWidth - PANEL_W - 8);
    setPickerPosition({ top, left });
    setOpenPickerId(swatchId);
  }

  // Helper to determine if a color is light or dark
  function isLightColor(hex: string): boolean {
    const normalized = hex.toLowerCase().replace("#", "");
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128;
  }

  return (
    <div className="space-y-5">
      {/* ── Color tokens ── */}
      <div>
        <div className="mb-2.5 font-mono text-[9px] uppercase tracking-widest text-[var(--text-tertiary)] transition-colors duration-300">
          Color tokens
        </div>

        {/* Horizontal swatch row */}
        <div className="flex gap-1.5">
          {swatches.map((swatch) => (
            <motion.div
              key={swatch.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="group relative flex flex-1 cursor-pointer flex-col gap-1.5"
              onClick={(e) => openPicker(swatch.id, e.currentTarget as HTMLElement)}
            >
              {/* Swatch tile */}
              <div
                className="h-12 rounded-md border border-[var(--border-primary)] transition-[border-color,opacity] duration-150 group-hover:border-[var(--border-secondary)]"
                style={{ backgroundColor: swatch.color }}
              />
              {/* Hex label */}
              <div className="font-mono text-[9px] leading-none text-[var(--text-tertiary)] transition-colors duration-150 group-hover:text-[var(--text-secondary)]">
                {swatch.color.toUpperCase()}
              </div>
              {/* Name label */}
              {swatch.name && (
                <div className="truncate text-[9px] leading-none text-[var(--text-tertiary)] opacity-60">
                  {swatch.name}
                </div>
              )}
              {/* Remove overlay — appears on hover */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeSwatch(swatch.id); }}
                className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded bg-black/60 opacity-0 backdrop-blur-sm transition-opacity duration-150 group-hover:opacity-100"
                aria-label="Remove colour"
              >
                <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </motion.div>
          ))}

          {/* Add colour tile */}
          <button
            type="button"
            onClick={addSwatch}
            className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-[var(--border-secondary)] transition-colors duration-150 hover:border-[var(--border-tertiary)] hover:bg-[var(--bg-tertiary)]"
            style={{ minHeight: 48 }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-[var(--text-tertiary)]">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Export row ── */}
      <div className="flex items-center justify-between rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-3 py-2 transition-colors duration-300">
        <span className="font-mono text-[10px] text-[var(--text-tertiary)] transition-colors duration-300">
          design-system.md
        </span>
        <button
          type="button"
          className="flex items-center gap-1 rounded bg-[var(--accent)]/15 px-2 py-0.5 transition-colors duration-150 hover:bg-[var(--accent)]/25"
        >
          <svg viewBox="0 0 10 10" fill="none" className="h-2 w-2 text-[var(--accent)]">
            <path d="M5 1v6M2 5l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="font-mono text-[9px] text-[var(--accent)]">Export</span>
        </button>
      </div>

      {/* Portal-mounted color picker panel */}
      {openPickerId && typeof document !== "undefined" && (
        <>
          {React.createElement(
            ColorPickerPanel,
            {
              value: swatches.find((s) => s.id === openPickerId)?.color ?? "#2430AD",
              position: pickerPosition,
              onChange: (c: string) => updateColor(openPickerId, c),
              onClose: () => setOpenPickerId(null),
            }
          )}
        </>
      )}
    </div>
  );
}

const TASKS_LS_KEY = "studio-os-tasks";

type PersistedTask = {
  id: string;
  text: string;
  projectId: string;
  createdAt: string;
  completed: boolean;
};

function readAllTasks(): PersistedTask[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(TASKS_LS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeAllTasks(tasks: PersistedTask[]) {
  localStorage.setItem(TASKS_LS_KEY, JSON.stringify(tasks));
}

function TasksTab({ projectId }: { projectId: string }) {
  const [tasks, setTasks] = React.useState<PersistedTask[]>([]);
  const [draft, setDraft] = React.useState("");

  // Load tasks for this project from localStorage on mount
  React.useEffect(() => {
    const all = readAllTasks();
    const projectTasks = all.filter((t) => t.projectId === projectId);
    // Seed default tasks if none exist for this project
    if (projectTasks.length === 0) {
      const defaults: PersistedTask[] = [
        { id: `t-${projectId}-1`, text: "Define success criteria with client", projectId, createdAt: new Date().toISOString(), completed: false },
        { id: `t-${projectId}-2`, text: "First Vision pass for this room",      projectId, createdAt: new Date().toISOString(), completed: false },
        { id: `t-${projectId}-3`, text: "Lock heading/body pairing",             projectId, createdAt: new Date().toISOString(), completed: false },
      ];
      const updated = [...defaults, ...all];
      writeAllTasks(updated);
      setTasks(defaults);
    } else {
      setTasks(projectTasks);
    }
  }, [projectId]);

  function toggleTask(id: string) {
    const all = readAllTasks();
    const updated = all.map((t) =>
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    writeAllTasks(updated);
    setTasks(updated.filter((t) => t.projectId === projectId));
  }

  function addTask() {
    const text = draft.trim();
    if (!text) return;
    const newTask: PersistedTask = {
      id: `t-${Date.now()}`,
      text,
      projectId,
      createdAt: new Date().toISOString(),
      completed: false,
    };
    const all = readAllTasks();
    writeAllTasks([...all, newTask]);
    setTasks((prev) => [...prev, newTask]);
    setDraft("");
  }

  return (
    <div className="space-y-3">
      <div className="text-[11px] font-medium uppercase tracking-[0.15em] text-gray-400 transition-colors duration-300">
        Tasks
      </div>

      <div className="space-y-0.5">
        {tasks.map((task) => (
          <motion.div
            key={task.id}
            whileHover={{ x: 3 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            onClick={() => toggleTask(task.id)}
            className="flex items-center gap-2 px-2 py-1.5 text-xs text-text-primary cursor-pointer transition-colors duration-300 hover:bg-neutral-800/50 rounded-md"
          >
            <input
              type="checkbox"
              checked={task.completed}
              onChange={() => toggleTask(task.id)}
              onClick={(e) => e.stopPropagation()}
              className="h-3 w-3 border border-gray-500 bg-transparent transition-colors duration-300"
            />
            <span className={cn(task.completed && "line-through text-gray-400 transition-colors duration-300")}>
              {task.text}
            </span>
          </motion.div>
        ))}
      </div>

      <div className="flex items-center gap-2 pt-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add task..."
            className="w-full border border-card-border bg-transparent px-2 py-1.5 pr-8 text-xs text-text-primary outline-none transition-[border-color,color,background-color] duration-300 ease-out focus:border-accent rounded-md"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTask();
              }
            }}
          />
          <button
            type="button"
            onClick={addTask}
            disabled={!draft.trim()}
            className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 transition-colors duration-300 hover:text-text-primary disabled:opacity-30 disabled:hover:text-gray-500"
            aria-label="Add task"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
