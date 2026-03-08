"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useDropzone } from "react-dropzone";
import {
  getStoredProjects,
  useNewProjectModal,
  type StoredProject,
} from "@/components/new-project-modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  appendProjectTask,
  getProjectState,
  listProjectReferences,
  PROJECTS_UPDATED_EVENT,
  setProjectReferences,
  type StoredReference,
} from "@/lib/project-store";
import { PROJECTS as STATIC_PROJECTS, type Phase } from "@/app/(dashboard)/projects/projects-data";
import { cn } from "@/lib/utils";

type HomeProject = StoredProject & {
  phase: Phase;
  leadImage: string;
  progress: number;
  lastEdited: string;
  referenceCount: number;
};

type ProjectDropdownOption =
  | { kind: "project"; project: HomeProject }
  | { kind: "create"; name: string };

type ReferenceForStorage = StoredReference;
type DropTarget = { id: string; name: string; color: string };

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function readProjectRefs(projectId: string): ReferenceForStorage[] {
  return listProjectReferences(projectId);
}

function writeProjectRefs(projectId: string, refs: ReferenceForStorage[]) {
  setProjectReferences(projectId, refs);
}

function getAllDropTargets(): DropTarget[] {
  return getStoredProjects().map((project) => ({
    id: project.id,
    name: project.name,
    color: project.color,
  }));
}

function scoreProjectMatch(projectName: string, query: string): number {
  const name = projectName.toLowerCase();
  const q = query.toLowerCase();
  if (name === q) return 100;
  if (name.startsWith(q)) return 80;
  if (name.includes(q)) return 60;
  let qi = 0;
  for (let i = 0; i < name.length && qi < q.length; i += 1) {
    if (name[i] === q[qi]) qi += 1;
  }
  return qi === q.length ? 40 : 0;
}

function formatRelativeTime(value: string | undefined) {
  if (!value) return "Just now";
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "Just now";
  const diff = Date.now() - timestamp;
  const minute = 60_000;
  const hour = minute * 60;
  const day = hour * 24;
  if (diff < hour) return `${Math.max(1, Math.round(diff / minute))} min ago`;
  if (diff < day) return `${Math.round(diff / hour)}h ago`;
  if (diff < day * 7) return `${Math.round(diff / day)}d ago`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    new Date(timestamp)
  );
}

function computeProjectProgress(projectId: string, fallback: number) {
  const state = getProjectState(projectId);
  let progress = 0;
  const references = listProjectReferences(projectId);
  if (references.length > 0) progress += 25;
  if (state.canvas?.designTokens) progress += 25;
  if ((state.canvas?.generatedVariants?.length ?? 0) > 0) progress += 25;
  if (state.canvas?.composeDocument?.artboards?.length) progress += 25;
  return progress || fallback;
}

function normalizeStoredProject(project: StoredProject): HomeProject {
  const staticMatch = STATIC_PROJECTS.find((item) => item.id === project.id);
  const state = getProjectState(project.id);
  const references = listProjectReferences(project.id);

  return {
    ...project,
    phase: staticMatch?.phase ?? "Discovery",
    leadImage:
      state.coverImage ??
      staticMatch?.leadImage ??
      `https://picsum.photos/seed/${project.id}/720/480`,
    progress: computeProjectProgress(project.id, staticMatch?.progress ?? 0),
    lastEdited: formatRelativeTime(state.updatedAt ?? project.createdAt),
    referenceCount: references.length,
  };
}

function DropProjectPicker({
  files,
  onSelect,
  onClose,
}: {
  files: File[];
  onSelect: (projectId: string, projectName: string) => void;
  onClose: () => void;
}) {
  const targets = React.useMemo(() => getAllDropTargets(), []);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="fixed inset-0 z-[61] flex items-center justify-center px-4"
        onClick={onClose}
      >
        <div
          className="w-full max-w-sm overflow-hidden rounded-3xl border border-card-border bg-card-bg shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="border-b border-card-border px-5 py-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-accent">
              Add to project
            </p>
            <p className="mt-1 text-xs text-text-muted">
              {files.length} image{files.length !== 1 ? "s" : ""} ready to import
            </p>
          </div>

          <div className="max-h-[300px] overflow-y-auto py-2">
            {targets.length === 0 ? (
              <p className="px-5 py-8 text-center text-xs text-text-muted">
                No projects yet. Create one first.
              </p>
            ) : (
              targets.map((target) => (
                <button
                  key={target.id}
                  type="button"
                  onClick={() => onSelect(target.id, target.name)}
                  className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors duration-100 hover:bg-sidebar-hover"
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: target.color }}
                  />
                  <span className="truncate text-sm text-text-primary">{target.name}</span>
                </button>
              ))
            )}
          </div>

          <div className="border-t border-card-border px-5 py-3">
            <button
              type="button"
              onClick={onClose}
              className="text-[10px] uppercase tracking-[0.12em] text-text-muted transition-colors hover:text-text-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

function ProjectSearchRow({
  option,
  active,
  onMouseDown,
}: {
  option: ProjectDropdownOption;
  active: boolean;
  onMouseDown: () => void;
}) {
  return (
    <button
      type="button"
      onMouseDown={onMouseDown}
      className={cn(
        "flex w-full items-center gap-3 border-b border-border-primary px-4 py-3 text-left last:border-b-0",
        active ? "bg-bg-tertiary" : "bg-bg-secondary hover:bg-bg-tertiary"
      )}
    >
      {option.kind === "project" ? (
        <>
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: option.project.color }}
          />
          <div className="min-w-0">
            <p className="truncate text-sm text-text-primary">{option.project.name}</p>
            <p className="mt-0.5 truncate text-[11px] text-text-muted">
              {option.project.lastEdited} · {option.project.progress}% ready
            </p>
          </div>
        </>
      ) : (
        <span className="truncate text-sm text-text-secondary">
          Create new project: {option.name}
        </span>
      )}
    </button>
  );
}

function EmptyProjectsState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[32px] border border-dashed border-border-primary bg-bg-secondary px-8 py-16 text-center">
      <div className="relative mb-8 h-28 w-40">
        <div className="absolute left-0 top-4 h-20 w-24 rounded-[24px] border border-border-secondary bg-bg-tertiary" />
        <div className="absolute right-0 top-0 h-24 w-28 rounded-[28px] border border-[#3B5EFC]/20 bg-[#3B5EFC]/8 shadow-[0_20px_60px_rgba(59,94,252,0.12)]" />
        <div className="absolute bottom-0 left-10 h-16 w-20 rounded-[20px] border border-border-secondary bg-card-bg" />
      </div>
      <h2 className="text-2xl font-semibold tracking-tight text-text-primary">
        Start your first project
      </h2>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-text-secondary">
        Drop references, extract taste, generate designs, and refine everything in one studio flow.
      </p>
      <Button
        type="button"
        className="mt-6 h-11 rounded-full bg-[#3B5EFC] px-5 text-[11px] uppercase tracking-[0.14em] text-white hover:bg-[#4a69fc]"
        onClick={onCreate}
      >
        + New Project
      </Button>
    </div>
  );
}

export function HomeClient() {
  const router = useRouter();
  const { openModal: openNewProject } = useNewProjectModal();
  const [projects, setProjects] = React.useState<HomeProject[]>([]);
  const [selectedProject, setSelectedProject] = React.useState<HomeProject | null>(null);
  const [inputValue, setInputValue] = React.useState("");
  const [isFocused, setIsFocused] = React.useState(false);
  const [activeOptionIndex, setActiveOptionIndex] = React.useState(0);
  const [taskConfirmation, setTaskConfirmation] = React.useState<string | null>(null);
  const [sortBy, setSortBy] = React.useState<"recent" | "name">("recent");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [droppedFiles, setDroppedFiles] = React.useState<File[] | null>(null);
  const [dropToast, setDropToast] = React.useState<string | null>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "image/png": [], "image/jpeg": [], "image/webp": [], "image/gif": [] },
    noClick: true,
    noKeyboard: true,
    onDrop: (accepted) => {
      if (accepted.length > 0) setDroppedFiles(accepted);
    },
  });

  React.useEffect(() => {
    function load() {
      setProjects(getStoredProjects().map(normalizeStoredProject));
    }
    load();
    window.addEventListener("storage", load);
    window.addEventListener(PROJECTS_UPDATED_EVENT, load);
    return () => {
      window.removeEventListener("storage", load);
      window.removeEventListener(PROJECTS_UPDATED_EVENT, load);
    };
  }, []);

  React.useEffect(() => {
    function handleGlobalKeyDown(event: KeyboardEvent) {
      const meta = event.metaKey || event.ctrlKey;
      if (!meta) return;
      if (event.key === "n" || event.key === "N") {
        event.preventDefault();
        openNewProject();
      } else if (event.key === "/") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [openNewProject]);

  React.useEffect(() => {
    if (!taskConfirmation) return;
    const timeout = window.setTimeout(() => setTaskConfirmation(null), 1800);
    return () => window.clearTimeout(timeout);
  }, [taskConfirmation]);

  React.useEffect(() => {
    setActiveOptionIndex(0);
  }, [inputValue]);

  const projectOptions = React.useMemo<ProjectDropdownOption[]>(() => {
    if (selectedProject || inputValue.trim().length < 1) return [];
    const query = inputValue.trim();
    const matches = projects
      .map((project) => ({
        project,
        score: scoreProjectMatch(project.name, query),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((item) => ({ kind: "project", project: item.project }) as const);

    return matches.length > 0 ? matches : [{ kind: "create", name: query }];
  }, [inputValue, projects, selectedProject]);

  const sortedProjects = React.useMemo(() => {
    const list = [...projects];
    if (sortBy === "name") {
      return list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return list.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [projects, sortBy]);

  async function handleDropToProject(projectId: string, projectName: string) {
    if (!droppedFiles || droppedFiles.length === 0) return;
    const existingRefs = readProjectRefs(projectId);
    const newRefs: ReferenceForStorage[] = [];

    for (const file of droppedFiles) {
      const dataUrl = await fileToDataUrl(file);
      newRefs.push({
        id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        imageUrl: dataUrl,
        source: "upload",
        title: file.name,
        addedAt: new Date().toISOString(),
        projectId,
      });
    }

    writeProjectRefs(projectId, [...newRefs, ...existingRefs]);
    setDroppedFiles(null);
    setDropToast(`Added ${droppedFiles.length} image${droppedFiles.length !== 1 ? "s" : ""} to ${projectName}`);
  }

  function selectOption(option: ProjectDropdownOption) {
    if (option.kind === "create") {
      openNewProject();
      return;
    }
    setSelectedProject(option.project);
    setInputValue("");
  }

  function submitTask() {
    if (!selectedProject) return;
    const text = inputValue.trim();
    if (!text) return;
    appendProjectTask({
      id: crypto.randomUUID(),
      text,
      projectId: selectedProject.id,
      createdAt: new Date().toISOString(),
      completed: false,
    });
    setInputValue("");
    setTaskConfirmation(`Added to ${selectedProject.name}`);
    inputRef.current?.focus();
  }

  function resetToProjectSearch() {
    setSelectedProject(null);
    setInputValue("");
    setTaskConfirmation(null);
  }

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (selectedProject) {
      if (event.key === "Enter") {
        event.preventDefault();
        submitTask();
      } else if (event.key === "Escape") {
        event.preventDefault();
        resetToProjectSearch();
      }
      return;
    }

    if (event.key === "ArrowDown" && projectOptions.length > 0) {
      event.preventDefault();
      setActiveOptionIndex((prev) => (prev + 1) % projectOptions.length);
      return;
    }
    if (event.key === "ArrowUp" && projectOptions.length > 0) {
      event.preventDefault();
      setActiveOptionIndex((prev) => (prev - 1 + projectOptions.length) % projectOptions.length);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (projectOptions.length > 0) {
        selectOption(projectOptions[activeOptionIndex]);
      }
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setInputValue("");
    }
  }

  return (
    <div
      {...(getRootProps() as React.HTMLAttributes<HTMLDivElement>)}
      className="relative min-h-screen px-6 pb-16 sm:px-8"
      style={{
        backgroundImage:
          "radial-gradient(circle, var(--dot-grid-color) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }}
    >
      <input {...getInputProps()} />

      <AnimatePresence>
        {isDragActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center border-2 border-dashed border-accent bg-bg-primary/88 backdrop-blur-sm"
          >
            <div className="text-center">
              <div className="mb-3 text-3xl">↓</div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-accent">
                Drop references to add them to a project
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {droppedFiles ? (
          <DropProjectPicker
            files={droppedFiles}
            onSelect={handleDropToProject}
            onClose={() => setDroppedFiles(null)}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {dropToast ? (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="pointer-events-none fixed bottom-8 left-1/2 z-[200] -translate-x-1/2"
          >
            <div className="rounded-full border border-border-primary bg-card-bg px-4 py-2 text-sm text-text-primary shadow-xl">
              {dropToast}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="relative z-10 mx-auto w-full max-w-7xl py-16 sm:py-20">
        <section className="mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">
              Studio OS
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-text-primary sm:text-5xl">
              What are you working on?
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary sm:text-base">
              Start with a project, drop in references, and move straight into generation.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05, ease: "easeOut" }}
            className="relative mt-8"
          >
            <div className="rounded-[28px] border border-border-primary bg-card-bg/95 p-3 shadow-[0_24px_80px_rgba(0,0,0,0.06)] backdrop-blur">
              <div className="flex items-center gap-3 rounded-[22px] border border-border-secondary bg-bg-primary px-4 py-3 focus-within:border-[#3B5EFC]/50">
                {selectedProject ? (
                  <button
                    type="button"
                    onClick={resetToProjectSearch}
                    className="inline-flex items-center gap-2 rounded-full border border-border-primary bg-bg-secondary px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-text-secondary"
                  >
                    <span aria-hidden>×</span>
                    <span>{selectedProject.name}</span>
                  </button>
                ) : null}
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                  onKeyDown={handleInputKeyDown}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => window.setTimeout(() => setIsFocused(false), 100)}
                  placeholder={
                    selectedProject
                      ? `Add a task to ${selectedProject.name}...`
                      : "Choose a project or type a new one"
                  }
                  className="h-11 flex-1 border-none bg-transparent px-0 text-sm text-text-primary shadow-none focus-visible:ring-0"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (selectedProject) {
                      submitTask();
                    } else if (projectOptions.length > 0) {
                      selectOption(projectOptions[activeOptionIndex]);
                    }
                  }}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#3B5EFC] text-white transition-colors hover:bg-[#4a69fc]"
                  aria-label="Submit"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M14 7l5 5-5 5" />
                  </svg>
                </button>
              </div>

              {isFocused && !selectedProject && projectOptions.length > 0 ? (
                <div className="mt-3 overflow-hidden rounded-[22px] border border-border-primary bg-bg-secondary shadow-[0_18px_48px_rgba(0,0,0,0.08)]">
                  {projectOptions.map((option, index) => (
                    <ProjectSearchRow
                      key={option.kind === "project" ? option.project.id : `create-${option.name}`}
                      option={option}
                      active={index === activeOptionIndex}
                      onMouseDown={() => selectOption(option)}
                    />
                  ))}
                </div>
              ) : null}
            </div>

            <div className="mt-4 flex items-center justify-center">
              <Button
                type="button"
                variant="secondary"
                className="h-11 rounded-full border border-border-primary bg-bg-secondary px-5 text-[11px] uppercase tracking-[0.16em] text-text-primary"
                onClick={openNewProject}
              >
                + New Project
              </Button>
            </div>

            {taskConfirmation ? (
              <p className="mt-3 text-[11px] uppercase tracking-[0.12em] text-text-secondary">
                {taskConfirmation}
              </p>
            ) : null}
          </motion.div>
        </section>

        <section className="mt-16 sm:mt-20">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-text-tertiary">
                Projects
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-text-primary">
                Recent projects
              </h2>
            </div>
            <label className="flex items-center gap-3 text-[11px] uppercase tracking-[0.14em] text-text-tertiary">
              Sort
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as "recent" | "name")}
                className="h-10 rounded-full border border-border-primary bg-bg-secondary px-4 text-[11px] uppercase tracking-[0.12em] text-text-primary"
              >
                <option value="recent">Recent first</option>
                <option value="name">By name</option>
              </select>
            </label>
          </div>

          {sortedProjects.length === 0 ? (
            <EmptyProjectsState onCreate={openNewProject} />
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {sortedProjects.map((project, index) => (
                <motion.button
                  key={project.id}
                  type="button"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.04, ease: "easeOut" }}
                  whileHover={{ y: -4 }}
                  onClick={() => router.push(`/projects/${project.id}`)}
                  className="group overflow-hidden rounded-[30px] border border-border-primary bg-card-bg text-left shadow-[0_12px_30px_rgba(0,0,0,0.04)] transition-[border-color,box-shadow] duration-200 hover:border-border-hover hover:shadow-[0_22px_60px_rgba(0,0,0,0.08)]"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-bg-tertiary">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={project.leadImage}
                      alt={project.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-5">
                      <span className="rounded-full border border-white/15 bg-black/35 px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-white opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100">
                        Open
                      </span>
                      <div className="h-10 w-10 rounded-full border border-white/15 bg-black/35 opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100" />
                    </div>
                  </div>
                  <div className="space-y-4 px-5 py-5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: project.color }}
                        />
                        <h3 className="truncate text-lg font-semibold tracking-tight text-text-primary">
                          {project.name}
                        </h3>
                      </div>
                      <p className="mt-2 text-sm text-text-secondary">
                        {project.lastEdited}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.12em] text-text-tertiary">
                        <span>Progress</span>
                        <span>{project.progress}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-bg-tertiary">
                        <div
                          className="h-full rounded-full bg-[#3B5EFC]"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-text-tertiary">
                      <span>{project.referenceCount} references</span>
                      <span>{project.phase}</span>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
