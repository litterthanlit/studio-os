"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ColorPicker } from "@/components/color-picker";
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
    <div className="space-y-8 pb-16">
      <section id="board">
        <BoardTab project={project} />
      </section>

      <section id="type">
        <TypeTab project={project} />
      </section>

      <section id="palette">
        <PaletteTab project={project} />
      </section>

      <section id="tasks">
        <TasksTab projectId={project.id} />
      </section>

      <section id="overview">
        <OverviewTab project={project} />
      </section>
    </div>
  );
}

function OverviewTab({ project }: { project: Project }) {
  const [notes, setNotes] = React.useState(
    "Capture the core constraints, success criteria, and non-negotiables here."
  );

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="text-[11px] font-medium uppercase tracking-[0.15em] text-gray-400 transition-colors duration-300">
          Brief
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="h-24 w-full border border-card-border bg-transparent px-2 py-1 text-sm text-text-primary outline-none transition-[border-color,background-color,color] duration-300 ease-out focus:border-accent"
        />
      </div>

      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="border border-card-border bg-bg-secondary p-2 transition-colors duration-300">
          <div className="text-[9px] font-medium uppercase tracking-[0.15em] text-gray-400 transition-colors duration-300">
            References
          </div>
          <div className="mt-1 text-sm font-bold text-text-primary transition-colors duration-300">
            {project.references}
          </div>
        </div>
        <div className="border border-card-border bg-bg-secondary p-2 transition-colors duration-300">
          <div className="text-[9px] font-medium uppercase tracking-[0.15em] text-gray-400 transition-colors duration-300">
            Fonts
          </div>
          <div className="mt-1 text-sm font-bold text-text-primary transition-colors duration-300">
            {project.fontsSelected}
          </div>
        </div>
        <div className="border border-card-border bg-bg-secondary p-2 transition-colors duration-300">
          <div className="text-[9px] font-medium uppercase tracking-[0.15em] text-gray-400 transition-colors duration-300">
            Days Active
          </div>
          <div className="mt-1 text-sm font-bold text-text-primary transition-colors duration-300">
            {project.daysActive}
          </div>
        </div>
      </div>
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
          Connected Moodboard
        </div>
        {references.length > 0 && (
          <button
            type="button"
            onClick={() => openImport("upload")}
            aria-label="Quick add references"
            className="border border-card-border bg-bg-secondary px-2 py-1 text-xs text-text-secondary transition-colors duration-300 hover:border-white/30 hover:text-white"
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

      <div
        className={cn(
          "relative border bg-bg-secondary p-3 transition-colors duration-300",
          isDragActive
            ? "border-accent"
            : references.length === 0
            ? "border-dashed border-card-border"
            : "border-card-border"
        )}
        onDragOver={(event) => {
          event.preventDefault();
          if (!isDragActive) setIsDragActive(true);
        }}
        onDragLeave={(event) => {
          if (event.currentTarget === event.target) setIsDragActive(false);
        }}
        onDrop={handleDrop}
        onPaste={handlePaste}
      >
        {isDragActive && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center border border-accent bg-accent/10 text-xs uppercase tracking-[0.12em] text-accent transition-colors duration-300">
            Drop images to import
          </div>
        )}

        {references.length === 0 ? (
          <div className="space-y-4 py-10 text-center">
            <p className="text-sm text-text-secondary transition-colors duration-300">
              Drop images, paste URL, or click to import
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="border border-card-border bg-card-bg px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] text-text-tertiary transition-colors duration-300 hover:border-white/30 hover:text-white"
              >
                Upload files
              </button>
              <button
                type="button"
                className="border border-card-border bg-card-bg px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] text-text-tertiary transition-colors duration-300"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  openImport("arena");
                }}
              >
                From Are.na
              </button>
              <button
                type="button"
                className="border border-card-border bg-card-bg px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] text-text-tertiary transition-colors duration-300"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  openImport("pinterest");
                }}
              >
                From Pinterest
              </button>
              <button
                type="button"
                className="border border-card-border bg-card-bg px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] text-text-tertiary transition-colors duration-300"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  openImport("url");
                }}
              >
                Paste image URL
              </button>
            </div>
            <p className="text-[11px] text-text-placeholder transition-colors duration-300">
              Drop images or import from Are.na/Pinterest
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
            {references.map((ref) => (
              <article
                key={ref.id}
                className="group relative border border-card-border bg-card-bg transition-colors duration-300"
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
                    className="h-40 w-full object-cover"
                    loading="lazy"
                  />
                </button>

                <div className="pointer-events-none absolute left-2 top-2 border border-white/20 bg-black/80 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.1em] text-white transition-colors duration-300">
                  {ref.source}
                </div>

                <button
                  type="button"
                  onClick={() => removeReference(ref.id)}
                  aria-label="Delete reference"
                  className="absolute right-2 top-2 border border-red-500/40 bg-black/80 px-1.5 py-0.5 text-[10px] text-red-300 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  Delete
                </button>

                <div className="space-y-1 p-2">
                  <p className="truncate text-[11px] text-text-secondary transition-colors duration-300">
                    {ref.title || "Untitled"}
                  </p>
                  {ref.sourceUrl && (
                    <a
                      href={ref.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-accent transition-opacity hover:opacity-80"
                    >
                      Open source
                    </a>
                  )}
                </div>
              </article>
            ))}
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
                <div className="border border-card-border bg-bg-secondary p-2 transition-colors duration-300">
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
                        className="border border-card-border bg-bg-secondary px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] text-text-secondary transition-colors duration-300 hover:text-white"
                      >
                        Open source
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setActiveLightboxRef(null)}
                      className="border border-card-border bg-bg-secondary px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] text-text-secondary transition-colors duration-300 hover:text-white"
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
        Typography Spine
      </div>
      <p className="text-xs text-gray-400 transition-colors duration-300">
        Lock the heading/body pairing that defines this project. This will sync
        with the Type Library.
      </p>
      <div className="border border-card-border bg-bg-secondary p-3 transition-colors duration-300">
        <div className="mb-2 flex items-center justify-between text-xs text-gray-500 transition-colors duration-300">
          <span className="transition-colors duration-300">Heading: {headingFont?.family || "Not selected"}</span>
          <span className="transition-colors duration-300">Body: {bodyFont?.family || "Not selected"}</span>
        </div>
        <div className="space-y-1 text-sm text-text-primary transition-colors duration-300">
          <div className="text-lg font-bold transition-colors duration-300" style={headingStyle}>
            Studio OS project spine
          </div>
          <div className="text-xs transition-colors duration-300" style={bodyStyle}>
            The quick brown fox jumps over the lazy dog.
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => setIsPickerOpen(true)}
            className="border border-card-border bg-transparent px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.15em] text-gray-400 transition-[border-color,color,background-color] duration-300 ease-out hover:border-white/20 hover:text-text-primary"
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

function PaletteTab({ project }: { project: Project }) {
  const [swatches, setSwatches] = React.useState<Swatch[]>(() =>
    project.palette.map((color, i) => ({
      id: `swatch-${i}`,
      color,
      name: "",
    }))
  );
  const [editingId, setEditingId] = React.useState<string | null>(null);

  function addSwatch() {
    const id = `swatch-${Date.now()}`;
    setSwatches((prev) => [...prev, { id, color: "#0070F3", name: "" }]);
    setEditingId(id);
  }

  function updateColor(id: string, color: string) {
    setSwatches((prev) =>
      prev.map((s) => (s.id === id ? { ...s, color } : s))
    );
  }

  function updateName(id: string, name: string) {
    setSwatches((prev) =>
      prev.map((s) => (s.id === id ? { ...s, name } : s))
    );
  }

  function removeSwatch(id: string) {
    setSwatches((prev) => prev.filter((s) => s.id !== id));
    if (editingId === id) setEditingId(null);
  }

  return (
    <div className="space-y-4">
      <div className="text-[11px] font-medium uppercase tracking-[0.15em] text-gray-400 transition-colors duration-300">
        Color System
      </div>

      {swatches.length === 0 && (
        <p className="text-xs text-gray-600 transition-colors duration-300">
          No colors yet. Add one below.
        </p>
      )}

      {/* Swatch list */}
      <div className="space-y-1.5">
        {swatches.map((swatch) => (
          <div
            key={swatch.id}
            className="group flex items-center gap-3 border border-transparent px-2 py-1.5 transition-[border-color,background] duration-300 hover:border-card-border hover:bg-sidebar-hover"
          >
            {/* Color picker trigger */}
            <ColorPicker
              value={swatch.color}
              onChange={(c) => updateColor(swatch.id, c)}
            />

            {/* Hex display */}
            <span className="w-[68px] flex-shrink-0 font-mono text-[11px] text-gray-500 transition-colors duration-300">
              {swatch.color.toUpperCase()}
            </span>

            {/* Name input */}
            {editingId === swatch.id ? (
              <input
                type="text"
                value={swatch.name}
                onChange={(e) => updateName(swatch.id, e.target.value)}
                onBlur={() => setEditingId(null)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === "Escape")
                    setEditingId(null);
                }}
                placeholder="Name this swatch…"
                autoFocus
                className="flex-1 bg-transparent text-xs text-text-primary outline-none placeholder:text-gray-700 transition-colors duration-300"
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingId(swatch.id)}
                className="flex-1 text-left text-xs text-gray-600 transition-colors duration-300 hover:text-gray-300"
              >
                {swatch.name || (
                  <span className="italic text-gray-700 transition-colors duration-300">Untitled</span>
                )}
              </button>
            )}

            {/* Remove */}
            <button
              type="button"
              onClick={() => removeSwatch(swatch.id)}
              aria-label="Remove swatch"
              className="ml-auto flex-shrink-0 p-1 text-text-placeholder opacity-0 transition-[opacity,color] duration-300 group-hover:opacity-100 hover:text-red-400"
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Preview strip */}
      {swatches.length > 0 && (
        <div className="flex h-8 overflow-hidden">
          {swatches.map((s) => (
            <div
              key={s.id}
              className="flex-1"
              style={{ backgroundColor: s.color }}
              title={s.name || s.color}
            />
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={addSwatch}
          className="border border-card-border bg-transparent px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.15em] text-gray-400 transition-[border-color,color,background-color] duration-300 ease-out hover:border-white/20 hover:text-text-primary"
        >
          + Add Color
        </button>
        <button
          type="button"
          className="border border-card-border bg-transparent px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.15em] text-gray-400 transition-[border-color,color,background-color] duration-300 ease-out hover:border-white/20 hover:text-text-primary"
        >
          Extract from Reference
        </button>
      </div>
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

      <div className="space-y-2">
        {tasks.map((task) => (
          <label
            key={task.id}
            className="flex items-center gap-2 text-xs text-text-primary cursor-pointer transition-colors duration-300"
          >
            <input
              type="checkbox"
              checked={task.completed}
              onChange={() => toggleTask(task.id)}
              className="h-3 w-3 border border-gray-500 bg-transparent transition-colors duration-300"
            />
            <span className={cn(task.completed && "line-through text-gray-400 transition-colors duration-300")}>
              {task.text}
            </span>
          </label>
        ))}
      </div>

      <div className="flex items-center gap-2 pt-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add task..."
          className="flex-1 border border-card-border bg-transparent px-2 py-1 text-xs text-text-primary outline-none transition-[border-color,color,background-color] duration-300 ease-out focus:border-accent"
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
          className="border border-card-border bg-transparent px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.15em] text-gray-400 transition-[border-color,color,background-color] duration-300 ease-out hover:border-white/20 hover:text-text-primary"
        >
          Add
        </button>
      </div>
    </div>
  );
}
