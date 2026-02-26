"use client";

import * as React from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
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


const TASKS_STORAGE_KEY = "studio-os-tasks";
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
  Discovery:   { bg: "bg-[#FF4400]/15",   text: "text-[#FF4400]" },
  Concept:     { bg: "bg-violet-500/20",  text: "text-violet-600" },
  Refine:      { bg: "bg-sky-500/20",     text: "text-sky-600" },
  Deliver:     { bg: "bg-emerald-500/20", text: "text-emerald-600" },
  Research:    { bg: "bg-violet-500/20",  text: "text-violet-600" },
  Design:      { bg: "bg-purple-500/20",  text: "text-purple-600" },
  Development: { bg: "bg-emerald-500/20", text: "text-emerald-600" },
  Testing:     { bg: "bg-amber-500/20",   text: "text-amber-600" },
  Launch:      { bg: "bg-rose-500/20",    text: "text-rose-600" },
};

function getPhaseBadgeClass(phase: Phase): string {
  const colors = phaseColors[phase] ?? {
    bg: "bg-[var(--bg-tertiary)]",
    text: "text-[var(--text-secondary)]",
  };
  return `${colors.bg} ${colors.text} transition-colors duration-300`;
}

function saveTask(task: ProjectTask) {
  const stored = localStorage.getItem(TASKS_STORAGE_KEY);
  const allTasks: ProjectTask[] = stored ? JSON.parse(stored) : [];
  localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify([...allTasks, task]));
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
            className="h-2 w-2 shrink-0"
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
    return () => window.removeEventListener("storage", load);
  }, []);

  React.useEffect(() => {
    const interval = setInterval(() => setTimeOfDay(getTimeOfDay()), 60_000);
    return () => clearInterval(interval);
  }, []);

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
    saveTask({
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
      className="relative min-h-screen px-8 pb-20"
      style={{
        backgroundImage:
          "radial-gradient(circle, var(--dot-grid-color) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }}
    >
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

            {/* Quick Actions */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={openNewProject}
                className="inline-flex items-center gap-1.5 border border-[var(--border-secondary)] px-2.5 py-1 text-[11px] tracking-tight text-[var(--text-secondary)] rounded transition-all duration-300 hover:border-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              >
                <span className="text-[10px]">+</span> New Project
              </button>
              <Link
                href="/projects"
                className="inline-flex items-center gap-1.5 border border-[var(--border-secondary)] px-2.5 py-1 text-[11px] tracking-tight text-[var(--text-secondary)] rounded transition-all duration-300 hover:border-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              >
                Browse All
              </Link>
              <button
                type="button"
                onClick={() => router.push('/inspiration')}
                className="inline-flex items-center gap-1.5 border border-[var(--border-secondary)] px-2.5 py-1 text-[11px] tracking-tight text-[var(--text-secondary)] rounded transition-all duration-300 hover:border-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              >
                Daily Inspiration
              </button>
              <button
                type="button"
                onClick={() => router.push('/projects?upload=true')}
                className="inline-flex items-center gap-1 border border-[var(--border-secondary)] px-2.5 py-1 text-[11px] tracking-tight text-[var(--text-secondary)] rounded-lg transition-all duration-300 hover:border-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              >
                <span className="text-[10px]">+</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square">
                  <rect x="3" y="3" width="18" height="18" rx="1" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
              </button>
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
                      e.currentTarget.classList.add("opacity-100");
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
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="aspect-[3/4] bg-[var(--bg-tertiary)] border border-dashed border-[var(--border-primary)] flex items-center justify-center transition-colors duration-300">
                    <span className="text-[var(--text-tertiary)] text-xs">—</span>
                  </div>
                ))}
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
