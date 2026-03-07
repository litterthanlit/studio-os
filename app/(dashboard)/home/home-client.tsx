"use client";

import * as React from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { AsciiSeparator } from "@/components/ui/ascii-separator";
import { SectionLabel } from "@/components/ui/section-label";
import {
  getStoredProjects,
  useNewProjectModal,
  type StoredProject,
} from "@/components/new-project-modal";
import {
  PROJECTS as STATIC_PROJECTS,
  type Phase,
} from "@/app/(dashboard)/projects/projects-data";
import { slideUp, staggerContainer, staggerItem, springs } from "@/lib/animations";
import { useCuratedInspiration } from "@/hooks/use-curated-inspiration";
import { cn } from "@/lib/utils";
import {
  appendProjectTask,
  listProjectReferences,
  PROJECTS_UPDATED_EVENT,
  setProjectReferences,
  type StoredReference,
} from "@/lib/project-store";

type ProjectTask = {
  id: string;
  text: string;
  projectId: string;
  createdAt: string;
  completed: boolean;
};

type HomeProject = StoredProject & {
  phase: Phase;
  leadImage: string;
};

type ProjectDropdownOption =
  | { kind: "project"; project: HomeProject }
  | { kind: "create"; name: string };

const ASCII_CHARS = [
  "■",
  "□",
  "▪",
  "▫",
  "●",
  "○",
  "◆",
  "◇",
  "△",
  "▽",
  "▲",
  "▼",
  "◁",
  "▷",
  "◀",
  "▶",
  "+",
  "×",
  "÷",
  "=",
  "~",
  "·",
  ":",
  ";",
  "/",
  "\\",
  "|",
  "-",
  "_",
  "#",
  "*",
  ".",
];
const CELL_SIZE = 18;
const FONT_SIZE = 9;
const REVEAL_RADIUS = 200;

function getTimeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function toStoredProject(p: (typeof STATIC_PROJECTS)[0]): HomeProject {
  return {
    id: p.id,
    name: p.name,
    brief: p.client,
    color: p.palette[1] ?? "#2430AD",
    createdAt: new Date(
      Date.now() - p.daysActive * 24 * 60 * 60 * 1000
    ).toISOString(),
    phase: p.phase,
    leadImage: p.leadImage,
  };
}

function normalizeStoredProject(project: StoredProject): HomeProject {
  const staticMatch = STATIC_PROJECTS.find((p) => p.id === project.id);
  return {
    ...project,
    phase: staticMatch?.phase ?? "Discovery",
    leadImage:
      staticMatch?.leadImage ??
      `https://picsum.photos/seed/${project.id}/400/300`,
  };
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

const phaseColors: Record<string, { bg: string; text: string }> = {
  Discovery:   { bg: "bg-[#FF4400]/15",   text: "text-[#CC3300]" },
  Concept:     { bg: "bg-violet-500/25",  text: "text-violet-700" },
  Refine:      { bg: "bg-sky-500/25",     text: "text-sky-700" },
  Deliver:     { bg: "bg-emerald-500/25", text: "text-emerald-700" },
  Research:    { bg: "bg-violet-500/25",  text: "text-violet-700" },
  Design:      { bg: "bg-purple-500/25",  text: "text-purple-700" },
  Development: { bg: "bg-emerald-500/25", text: "text-emerald-700" },
  Testing:     { bg: "bg-amber-500/25",   text: "text-amber-700" },
  Launch:      { bg: "bg-rose-500/25",    text: "text-rose-700" },
};

function getPhaseBadgeClass(phase: Phase): string {
  const colors = phaseColors[phase] ?? {
    bg: "bg-[var(--bg-tertiary)]",
    text: "text-[var(--text-secondary)]",
  };
  return `${colors.bg} ${colors.text} transition-colors duration-300`;
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
      className={`flex w-full items-center gap-3 border-b border-[var(--border-primary)] py-2 text-left last:border-b-0 transition-colors duration-300 ${
        active
          ? "bg-[var(--bg-tertiary)] border-l-2 border-l-[var(--accent)] pl-[10px] pr-3"
          : "bg-[var(--bg-secondary)] border-l-2 border-l-transparent pl-[10px] pr-3 hover:bg-[var(--bg-tertiary)]"
      }`}
    >
      {option.kind === "project" ? (
        <>
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: option.project.color }}
          />
          <span className="truncate text-sm text-[var(--text-primary)] transition-colors duration-300">
            {option.project.name}
          </span>
        </>
      ) : (
        <span className="truncate text-sm text-[var(--text-secondary)] transition-colors duration-300">
          Create new project: {option.name}
        </span>
      )}
    </button>
  );
}

// ─── Image drop helpers ──────────────────────────────────────────────────────

type ReferenceForStorage = StoredReference;

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

type DropTarget = { id: string; name: string; color: string };

function getAllDropTargets(): DropTarget[] {
  const stored = getStoredProjects().map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
  }));
  const staticTargets = STATIC_PROJECTS.map((p) => ({
    id: p.id,
    name: p.name,
    color: p.palette[1] || p.palette[0],
  }));
  const seenIds = new Set(stored.map((p) => p.id));
  return [...stored, ...staticTargets.filter((p) => !seenIds.has(p.id))];
}

// ─── Project picker modal for image drops ────────────────────────────────────

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
          className="w-full max-w-sm border border-card-border bg-card-bg rounded-xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-4 py-3 border-b border-card-border">
            <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-accent">
              Add to project
            </p>
            <p className="text-xs text-text-muted mt-0.5">
              {files.length} image{files.length !== 1 ? "s" : ""} ready to import
            </p>
          </div>

          <div className="max-h-[300px] overflow-y-auto py-1">
            {targets.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-text-muted">
                No projects yet. Create one first.
              </p>
            ) : (
              targets.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onSelect(t.id, t.name)}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors duration-100 hover:bg-sidebar-hover"
                >
                  <span
                    className="w-3 h-3 shrink-0 rounded-full"
                    style={{ backgroundColor: t.color }}
                  />
                  <span className="text-sm text-text-primary truncate">{t.name}</span>
                </button>
              ))
            )}
          </div>

          <div className="px-4 py-2.5 border-t border-card-border">
            <button
              type="button"
              onClick={onClose}
              className="text-[10px] text-text-muted hover:text-text-secondary transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ─── Home page ───────────────────────────────────────────────────────────────

export function HomeClient() {
  const router = useRouter();
  const { openModal: openNewProject } = useNewProjectModal();
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const [projects, setProjects] = React.useState<HomeProject[]>([]);
  const [timeOfDay, setTimeOfDay] = React.useState(getTimeOfDay());
  const [selectedProject, setSelectedProject] = React.useState<HomeProject | null>(
    null
  );
  const [inputValue, setInputValue] = React.useState("");
  const [isFocused, setIsFocused] = React.useState(false);
  const [activeOptionIndex, setActiveOptionIndex] = React.useState(0);
  const [taskConfirmation, setTaskConfirmation] = React.useState<string | null>(
    null
  );
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Image drop state
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
    const count = droppedFiles.length;
    setDroppedFiles(null);
    setDropToast(`Added ${count} image${count !== 1 ? "s" : ""} to ${projectName}`);
    setTimeout(() => setDropToast(null), 3000);
  }

  React.useEffect(() => {
    if (!window.matchMedia("(hover: hover)").matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let cols = 0;
    let rows = 0;
    let grid: number[][] = [];
    let intensityGrid: number[][] = [];

    function buildGrid() {
      if (!canvas) return;
      cols = Math.ceil(canvas.width / CELL_SIZE);
      rows = Math.ceil(canvas.height / CELL_SIZE);
      grid = Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () =>
          Math.floor(Math.random() * ASCII_CHARS.length)
        )
      );
      intensityGrid = Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => 0)
      );
    }

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      buildGrid();
    }

    resize();
    window.addEventListener("resize", resize);

    let mouseX = -1000;
    let mouseY = -1000;
    let lastTime = performance.now();
    let raf = 0;

    const DECAY_RATE = 0.04;

    function draw(currentTime: number) {
      if (!canvas || !ctx) return;
      raf = requestAnimationFrame(draw);
      const deltaTime = (currentTime - lastTime) / 16.67;
      lastTime = currentTime;

      const theme = getComputedStyle(document.documentElement);
      const asciiColor =
        theme.getPropertyValue("--text-tertiary").trim() ||
        "rgba(120,120,120,1)";

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${FONT_SIZE}px "Geist Mono", monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const x = col * CELL_SIZE + CELL_SIZE / 2;
          const y = row * CELL_SIZE + CELL_SIZE / 2;
          const dist = Math.sqrt((x - mouseX) ** 2 + (y - mouseY) ** 2);

          let targetIntensity = 0;
          if (dist < REVEAL_RADIUS) {
            const t = 1 - dist / REVEAL_RADIUS;
            targetIntensity = t * t * 0.22;
          }

          const currentIntensity = intensityGrid[row][col];
          if (targetIntensity > currentIntensity) {
            intensityGrid[row][col] = targetIntensity;
          } else {
            intensityGrid[row][col] = Math.max(
              0,
              currentIntensity - DECAY_RATE * deltaTime
            );
          }

          const intensity = intensityGrid[row][col];
          if (intensity > 0.01) {
            ctx.globalAlpha = intensity;
            ctx.fillStyle = asciiColor;
            ctx.fillText(ASCII_CHARS[grid[row][col]], x, y);
          }
        }
      }
      ctx.globalAlpha = 1;
    }

    function onMouseMove(e: MouseEvent) {
      mouseX = e.clientX;
      mouseY = e.clientY;
    }

    function onMouseLeave() {
      mouseX = -1000;
      mouseY = -1000;
    }

    window.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseleave", onMouseLeave);
    raf = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseleave", onMouseLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  React.useEffect(() => {
    function load() {
      const stored = getStoredProjects();
      if (stored.length > 0) {
        setProjects(stored.map(normalizeStoredProject));
        return;
      }
      setProjects(STATIC_PROJECTS.map(toStoredProject));
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
    const interval = setInterval(() => setTimeOfDay(getTimeOfDay()), 60_000);
    return () => clearInterval(interval);
  }, []);

  // Global keyboard shortcuts: ⌘N → new project, ⌘I → inspiration, ⌘/ → focus command bar
  React.useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        openNewProject();
      } else if (e.key === "i" || e.key === "I") {
        e.preventDefault();
        router.push("/inspiration");
      } else if (e.key === "/") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [openNewProject, router]);

  // Curated inspiration with GPT-4 Vision scoring
  const {
    images: inspiration,
    likedImageIds,
    loading: inspirationLoading,
    error: inspirationError,
    collection: activeCollection,
    toggleLike,
    isLiked,
  } = useCuratedInspiration({ limit: 9, minScore: 75 });

  const projectOptions = React.useMemo<ProjectDropdownOption[]>(() => {
    if (selectedProject || inputValue.trim().length < 1) return [];
    const q = inputValue.trim();
    const matches = projects
      .map((project) => ({
        project,
        score: scoreProjectMatch(project.name, q),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((item) => ({ kind: "project", project: item.project }) as const);

    if (matches.length === 0) {
      return [{ kind: "create", name: q }];
    }
    return matches;
  }, [inputValue, projects, selectedProject]);

  React.useEffect(() => {
    setActiveOptionIndex(0);
  }, [projectOptions.length]);

  // Auto-focus input when project is selected (entering State 2)
  React.useEffect(() => {
    if (selectedProject) {
      window.setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [selectedProject]);

  // Clear confirmation after 1.5s, but keep project selected for more tasks
  React.useEffect(() => {
    if (!taskConfirmation) return;
    const timeout = window.setTimeout(() => {
      setTaskConfirmation(null);
    }, 1500);
    return () => window.clearTimeout(timeout);
  }, [taskConfirmation]);

  const showDropdown =
    !selectedProject && isFocused && inputValue.trim().length > 0;

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
    setInputValue(""); // clear immediately so input is ready for another task
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

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (projectOptions.length === 0) return;
      setActiveOptionIndex((prev) => (prev + 1) % projectOptions.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (projectOptions.length === 0) return;
      setActiveOptionIndex(
        (prev) => (prev - 1 + projectOptions.length) % projectOptions.length
      );
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

  const recentProjects = projects.slice(0, 3);

  return (
    <div
      {...(getRootProps() as React.HTMLAttributes<HTMLDivElement>)}
      className="relative min-h-screen px-8 pb-20"
      style={{
        backgroundImage:
          "radial-gradient(circle, var(--dot-grid-color) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }}
    >
      <input {...getInputProps()} />

      {/* Drag overlay */}
      <AnimatePresence>
        {isDragActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg-primary/90 backdrop-blur-sm border-2 border-dashed border-accent"
          >
            <motion.div
              initial={{ scale: 0.9, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="text-center space-y-2"
            >
              <div className="text-3xl mb-2">↓</div>
              <p className="text-sm font-medium text-accent uppercase tracking-[0.12em]">
                Drop to add to a project
              </p>
              <p className="text-xs text-text-muted">
                PNG, JPG, WebP, GIF
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Project selection modal after drop */}
      <AnimatePresence>
        {droppedFiles && (
          <DropProjectPicker
            files={droppedFiles}
            onSelect={handleDropToProject}
            onClose={() => setDroppedFiles(null)}
          />
        )}
      </AnimatePresence>

      {/* Success toast */}
      <AnimatePresence>
        {dropToast && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="pointer-events-none fixed bottom-8 left-1/2 z-[200] -translate-x-1/2"
          >
            <div className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium shadow-xl bg-card-bg text-text-primary border border-border-primary rounded-lg">
              <span className="text-[11px] text-green-400">✓</span>
              {dropToast}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-0"
        aria-hidden
      />

      <div className="relative z-10 mx-auto w-full max-w-7xl">
        <section className="pt-[20vh] pb-14">
          {/* Greeting - Pushed higher */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={slideUp}
            className="mb-8 text-center text-3xl sm:text-4xl font-medium text-[var(--text-primary)] transition-colors duration-300"
          >
            Good {timeOfDay}, Nick
          </motion.div>

          {/* Control Center Box - Command Bar + Quick Actions */}
          <div className="border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5 rounded-lg">
            {/* Command Bar */}
            <div className="relative">
              <div className="flex items-center gap-3 border border-[var(--border-secondary)] bg-[var(--bg-primary)] px-4 py-3 transition-[border-color,background-color,box-shadow] duration-300 focus-within:shadow-[var(--shadow-glow)] focus-within:border-[var(--accent)] rounded-md">
                {selectedProject ? (
                  <button
                    type="button"
                    onClick={resetToProjectSearch}
                    className="inline-flex items-center gap-1 border border-[var(--border-secondary)] px-2 py-0.5 text-[11px] font-mono uppercase tracking-[0.12em] text-[var(--text-secondary)] rounded transition-colors duration-300 hover:border-[var(--border-tertiary)]"
                  >
                    <span aria-hidden>×</span>
                    <span>{selectedProject.name}</span>
                  </button>
                ) : null}
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                  onKeyDown={handleInputKeyDown}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => {
                    window.setTimeout(() => setIsFocused(false), 100);
                  }}
                  placeholder={
                    selectedProject
                      ? `Add a task to ${selectedProject.name}...`
                      : "What are you working on today?"
                  }
                  className="flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] rounded font-mono tracking-tight transition-colors duration-300"
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
                  className="flex items-center justify-center text-neutral-500 hover:text-[#FF4400] transition-colors duration-300"
                  aria-label="Submit"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter">
                    <path d="M5 12h14M14 7l5 5-5 5" />
                  </svg>
                </button>
              </div>

              {showDropdown ? (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 border border-[var(--border-primary)] bg-[var(--bg-secondary)] shadow-[var(--shadow-lg)] rounded-lg transition-colors duration-300">
                  {projectOptions.map((option, index) => (
                    <ProjectSearchRow
                      key={
                        option.kind === "project"
                          ? option.project.id
                          : `create-${option.name}`
                      }
                      option={option}
                      active={index === activeOptionIndex}
                      onMouseDown={() => selectOption(option)}
                    />
                  ))}
                </div>
              ) : null}
            </div>

            {/* Quick Actions — connected to the input above via a divider */}
            <div className="mt-3 pt-3 border-t border-[var(--border-primary)] flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={openNewProject}
                title="New Project (⌘N)"
                className="group inline-flex items-center gap-1.5 border border-[var(--border-secondary)] px-2.5 py-1 text-[11px] tracking-tight text-[var(--text-secondary)] rounded transition-all duration-200 hover:border-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              >
                <span className="text-[10px]">+</span>
                New Project
                <kbd className="ml-0.5 inline-flex items-center rounded border border-[var(--border-primary)] bg-[var(--bg-tertiary)] px-1 py-px font-mono text-[9px] leading-none text-[var(--text-tertiary)] opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  ⌘N
                </kbd>
              </button>
              <Link
                href="/projects"
                className="inline-flex items-center gap-1.5 border border-[var(--border-secondary)] px-2.5 py-1 text-[11px] tracking-tight text-[var(--text-secondary)] rounded transition-all duration-200 hover:border-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              >
                Browse All
              </Link>
              <button
                type="button"
                onClick={() => router.push('/inspiration')}
                title="Daily Inspiration (⌘I)"
                className="group inline-flex items-center gap-1.5 border border-[var(--border-secondary)] px-2.5 py-1 text-[11px] tracking-tight text-[var(--text-secondary)] rounded transition-all duration-200 hover:border-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              >
                Daily Inspiration
                <kbd className="ml-0.5 inline-flex items-center rounded border border-[var(--border-primary)] bg-[var(--bg-tertiary)] px-1 py-px font-mono text-[9px] leading-none text-[var(--text-tertiary)] opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  ⌘I
                </kbd>
              </button>
              <button
                type="button"
                onClick={() => router.push('/projects?upload=true')}
                title="Upload image"
                className="inline-flex items-center gap-1 border border-[var(--border-secondary)] px-2.5 py-1 text-[11px] tracking-tight text-[var(--text-secondary)] rounded transition-all duration-200 hover:border-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              >
                <span className="text-[10px]">+</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square">
                  <rect x="3" y="3" width="18" height="18" rx="1" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
              </button>
              {/* Divider + command bar hint */}
              <div className="ml-auto hidden items-center gap-1.5 sm:flex">
                <span className="font-mono text-[9px] text-[var(--text-tertiary)]">Focus bar</span>
                <kbd className="inline-flex items-center rounded border border-[var(--border-primary)] bg-[var(--bg-tertiary)] px-1 py-px font-mono text-[9px] leading-none text-[var(--text-tertiary)]">
                  ⌘/
                </kbd>
              </div>
            </div>

            {taskConfirmation ? (
              <p className="mt-3 text-[11px] font-mono text-[var(--text-secondary)]">
                ✓ {taskConfirmation}
              </p>
            ) : null}
          </div>
        </section>

        <section className="py-12">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={slideUp}
            className="mb-5 flex items-center justify-between"
          >
            <SectionLabel>Recent Projects</SectionLabel>
            <Link
              href="/projects"
              className="text-[11px] font-sans uppercase tracking-[0.1em] text-[var(--text-tertiary)] transition-colors duration-300 ease-out hover:text-[var(--text-primary)]"
            >
              View all
            </Link>
          </motion.div>
          {recentProjects.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="rounded-xl border border-dashed border-[var(--border-primary)] bg-[var(--bg-secondary)] px-8 py-12 text-center transition-colors duration-300"
            >
              {/* Icon */}
              <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-secondary)] bg-[var(--bg-tertiary)]">
                <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5 text-[var(--text-tertiary)]">
                  <path d="M3 5a2 2 0 012-2h3.586a1 1 0 01.707.293l1.414 1.414A1 1 0 0011.414 5H15a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="mb-1 text-sm font-medium text-[var(--text-primary)] transition-colors duration-300">
                No projects yet
              </p>
              <p className="mb-6 mx-auto max-w-[260px] text-xs font-light leading-relaxed text-[var(--text-tertiary)] transition-colors duration-300">
                Create your first project to start organising references, briefs, and deliverables in one place.
              </p>
              <button
                type="button"
                onClick={openNewProject}
                className="inline-flex items-center gap-2 rounded-md border border-[var(--border-secondary)] bg-[var(--bg-tertiary)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-all duration-300 hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                <span>Create a project</span>
                <kbd className="inline-flex items-center rounded border border-[var(--border-primary)] px-1 py-px font-mono text-[9px] leading-none text-[var(--text-tertiary)]">
                  ⌘N
                </kbd>
              </button>
            </motion.div>
          ) : (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="grid grid-cols-2 gap-4 lg:grid-cols-3"
            >
              {recentProjects.slice(0, 3).map((project) => (
                <motion.button
                  key={project.id}
                  type="button"
                  onClick={() => router.push(`/projects/${project.id}`)}
                  variants={staggerItem}
                  whileHover={{ y: -4, boxShadow: "0 16px 40px rgba(0,0,0,0.15)", transition: { type: "spring", stiffness: 400, damping: 25 } }}
                  style={{ willChange: 'transform' }}
                  className="group overflow-hidden rounded-2xl border border-[var(--border-primary)] bg-[var(--card-bg)] text-left transition-[border-color] duration-200 hover:border-[var(--border-secondary)]"
                >
                  {/* Card — full image with overlay */}
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-[var(--bg-tertiary)] animate-pulse">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={project.leadImage}
                      alt={project.name}
                      onLoad={(e) => {
                        e.currentTarget.classList.remove("opacity-0");
                        e.currentTarget.parentElement?.classList.remove("animate-pulse");
                      }}
                      className="h-full w-full object-cover opacity-0 transition-[opacity,transform] duration-500 ease-out group-hover:scale-[1.03]"
                      loading="lazy"
                    />

                    {/* Bottom overlay — solid panel, 40% height, theme-aware */}
                    <div className="absolute inset-x-0 bottom-0 h-[40%] flex flex-col justify-center gap-1.5 px-3 bg-[var(--card-bg)]">
                      <span className="truncate w-full text-sm font-semibold text-[var(--text-primary)]">
                        {project.name}
                      </span>
                      <span className={`self-start px-2 py-0.5 text-[10px] font-sans font-semibold uppercase tracking-[0.08em] rounded transition-colors duration-200 ${getPhaseBadgeClass(project.phase)}`}>
                        {project.phase}
                      </span>
                    </div>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )}
        </section>

        {/* Separator */}
        <div className="border-t border-[var(--border-primary)] transition-colors duration-300" />

        <section className="py-12">
          <div className="flex items-center justify-between">
            <SectionLabel>Daily Inspiration</SectionLabel>
            {inspiration.length === 0 && !inspirationLoading && (
              <button
                type="button"
                onClick={() => router.push('/settings')}
                className="text-[11px] font-sans uppercase tracking-[0.1em] text-[var(--accent)] hover:text-[var(--text-primary)] transition-colors duration-300"
              >
                Enable →
              </button>
            )}
          </div>
          <div className="mt-4">
            {inspirationLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="aspect-[3/4] bg-bg-tertiary animate-pulse transition-colors duration-300" />
                ))}
              </div>
            ) : inspirationError ? (
              <p className="text-sm text-red-500 transition-colors duration-300">Error: {inspirationError}</p>
            ) : inspiration.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--border-primary)] bg-[var(--bg-secondary)] px-8 py-12 text-center transition-colors duration-300">
                <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-secondary)] bg-[var(--bg-tertiary)]">
                  <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5 text-[var(--text-tertiary)]">
                    <rect x="2" y="2" width="7" height="9" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                    <rect x="11" y="2" width="7" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                    <rect x="11" y="9" width="7" height="9" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                    <rect x="2" y="13" width="7" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                  </svg>
                </div>
                <p className="mb-1 text-sm font-medium text-[var(--text-primary)] transition-colors duration-300">
                  No inspiration yet
                </p>
                <p className="mb-5 max-w-xs mx-auto text-xs font-light leading-relaxed text-[var(--text-tertiary)] transition-colors duration-300">
                  Connect a Pinterest board or Are.na channel and Studio OS will curate your daily feed — scoring every image on composition, color, and mood.
                </p>
                <button
                  type="button"
                  onClick={() => router.push('/settings')}
                  className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border-secondary)] bg-[var(--bg-tertiary)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-all duration-300 hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  Connect a source
                  <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3"><path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {inspiration.map((item, index) => (
                  <motion.div
                    key={item.id}
                    className="relative aspect-[3/4] overflow-hidden bg-bg-tertiary group cursor-pointer"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <img
                      src={item.thumbnailUrl || item.imageUrl}
                      alt={item.title || ''}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    {/* Hover overlay with like button */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                      {/* Score badge */}
                      {item.scores && (
                        <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-sm text-[10px] font-mono text-white">
                          {item.scores.overall}
                        </div>
                      )}
                      {/* Like button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLike(item.id);
                        }}
                        className="absolute top-2 left-2 p-2 rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 transition-colors"
                      >
                        <svg
                          className={`w-4 h-4 ${isLiked(item.id) ? 'text-red-500 fill-red-500' : 'text-white'}`}
                          viewBox="0 0 24 24"
                          fill={isLiked(item.id) ? 'currentColor' : 'none'}
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                      </button>
                      {/* Tags */}
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-auto">
                          {item.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-white/20 text-white rounded-sm">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
