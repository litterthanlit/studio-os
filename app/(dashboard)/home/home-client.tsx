"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DotSeparator } from "@/components/ui/dot-separator";
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

type InspirationImage = {
  id: string;
  imageUrl: string;
  thumbnailUrl?: string;
  title?: string;
  width?: number;
  height?: number;
  colors?: string[];
};

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
    color: p.palette[1] ?? "#0070F3",
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

const phaseColors: Record<string, { bg: string; text: string; border: string }> = {
  Discovery:   { bg: "bg-blue-500/10",    text: "text-blue-500",    border: "border-blue-500/20" },
  Concept:     { bg: "bg-violet-500/10",  text: "text-violet-500",  border: "border-violet-500/20" },
  Refine:      { bg: "bg-purple-500/10",  text: "text-purple-500",  border: "border-purple-500/20" },
  Deliver:     { bg: "bg-emerald-500/10", text: "text-emerald-500", border: "border-emerald-500/20" },
  Research:    { bg: "bg-violet-500/10",  text: "text-violet-500",  border: "border-violet-500/20" },
  Design:      { bg: "bg-purple-500/10",  text: "text-purple-500",  border: "border-purple-500/20" },
  Development: { bg: "bg-emerald-500/10", text: "text-emerald-500", border: "border-emerald-500/20" },
  Testing:     { bg: "bg-amber-500/10",   text: "text-amber-500",   border: "border-amber-500/20" },
  Launch:      { bg: "bg-rose-500/10",    text: "text-rose-500",    border: "border-rose-500/20" },
};

function getPhaseBadgeClass(phase: Phase): string {
  const colors = phaseColors[phase] ?? {
    bg: "bg-[var(--bg-tertiary)]",
    text: "text-[var(--text-secondary)]",
    border: "border-[var(--border-primary)]",
  };
  return `${colors.bg} ${colors.text} ${colors.border}`;
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
      className={`flex w-full items-center gap-3 border-b border-[var(--border-primary)] py-2 text-left last:border-b-0 transition-colors duration-100 ${
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
          <span className="truncate text-sm text-[var(--text-primary)]">
            {option.project.name}
          </span>
        </>
      ) : (
        <span className="truncate text-sm text-[var(--text-secondary)]">
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
  const [inspiration, setInspiration] = React.useState<InspirationImage[]>([]);
  const [inspirationLoading, setInspirationLoading] = React.useState(true);
  const [inspirationError, setInspirationError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!window.matchMedia("(hover: hover)").matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let cols = 0;
    let rows = 0;
    let grid: number[][] = [];

    function buildGrid() {
      cols = Math.ceil(canvas.width / CELL_SIZE);
      rows = Math.ceil(canvas.height / CELL_SIZE);
      grid = Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () =>
          Math.floor(Math.random() * ASCII_CHARS.length)
        )
      );
    }

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      buildGrid();
    }

    resize();
    window.addEventListener("resize", resize);

    let mouseX = -1000;
    let mouseY = -1000;
    let prevX = -1001;
    let prevY = -1001;
    let raf = 0;

    function draw() {
      raf = requestAnimationFrame(draw);
      if (mouseX === prevX && mouseY === prevY) return;
      prevX = mouseX;
      prevY = mouseY;

      const theme = getComputedStyle(document.documentElement);
      const asciiColor =
        theme.getPropertyValue("--text-tertiary").trim() ||
        "rgba(120,120,120,1)";

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${FONT_SIZE}px "Geist Mono", monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = asciiColor;

      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const x = col * CELL_SIZE + CELL_SIZE / 2;
          const y = row * CELL_SIZE + CELL_SIZE / 2;
          const dist = Math.sqrt((x - mouseX) ** 2 + (y - mouseY) ** 2);
          if (dist < REVEAL_RADIUS) {
            const t = 1 - dist / REVEAL_RADIUS;
            ctx.globalAlpha = t * t * 0.22;
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

  React.useEffect(() => {
    async function fetchInspiration() {
      setInspirationLoading(true);
      setInspirationError(null);
      try {
        const queryRes = await fetch("/api/lummi?query=minimal+branding&limit=12");
        if (!queryRes.ok) {
          throw new Error(`Lummi query request failed (${queryRes.status})`);
        }

        const queryData = await queryRes.json();
        const queriedImages = Array.isArray(queryData?.images)
          ? queryData.images
          : [];

        if (queriedImages.length > 0) {
          setInspiration(queriedImages);
          return;
        }

        const fallbackRes = await fetch("/api/lummi?limit=12");
        if (!fallbackRes.ok) {
          throw new Error(`Lummi fallback request failed (${fallbackRes.status})`);
        }
        const fallbackData = await fallbackRes.json();
        const fallbackImages = Array.isArray(fallbackData?.images)
          ? fallbackData.images
          : [];
        setInspiration(fallbackImages);
      } catch (error) {
        console.error("[home] Failed to fetch daily inspiration:", error);
        setInspirationError("Could not load inspiration");
      } finally {
        setInspirationLoading(false);
      }
    }

    fetchInspiration();
  }, []);

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

  React.useEffect(() => {
    if (!taskConfirmation) return;
    const timeout = window.setTimeout(() => {
      setTaskConfirmation(null);
      setSelectedProject(null);
      setInputValue("");
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
    setTaskConfirmation(`Added to ${selectedProject.name}`);
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

  const recentProjects = projects.slice(0, 4);

  return (
    <div
      className="relative min-h-screen px-8 pb-20 pt-[13vh]"
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

      <div className="relative z-10 mx-auto w-full max-w-[980px]">
        <section className="mb-14">
          <div className="mb-8 text-center text-3xl sm:text-4xl font-semibold text-[var(--text-primary)]">
            Good {timeOfDay}, Nick
          </div>
          <SectionLabel>Command Bar</SectionLabel>
          <div className="relative mt-3">
            <div className="border border-[var(--border-primary)] bg-[var(--bg-secondary)] rounded-none transition-all duration-200 focus-within:shadow-[var(--shadow-glow)] focus-within:border-[var(--accent)]">
              <div className="flex items-center gap-2 px-3 py-2">
                {selectedProject ? (
                  <button
                    type="button"
                    onClick={resetToProjectSearch}
                    className="inline-flex items-center gap-1 border border-[var(--border-primary)] px-2 py-0.5 text-[11px] font-mono uppercase tracking-[0.12em] text-[var(--text-secondary)] rounded-none"
                  >
                    <span aria-hidden>×</span>
                    <span>{selectedProject.name}</span>
                  </button>
                ) : null}
                <input
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
                  className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] rounded-none"
                />
              </div>
            </div>

            {showDropdown ? (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 border border-[var(--border-primary)] bg-[var(--bg-secondary)] shadow-[var(--shadow-lg)] rounded-none">
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
          {taskConfirmation ? (
            <p className="mt-2 text-[11px] font-mono text-[var(--text-secondary)]">
              ✓ {taskConfirmation}
            </p>
          ) : null}
        </section>

        <DotSeparator />

        <section className="my-14">
          <div className="mb-5 flex items-center justify-between">
            <SectionLabel>Recent Projects</SectionLabel>
            <Link
              href="/projects"
              className="text-[10px] font-mono uppercase tracking-[0.12em] text-[var(--text-tertiary)] transition-colors duration-150 ease-out hover:text-[var(--text-primary)]"
            >
              View all
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {recentProjects.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => router.push(`/projects/${project.id}`)}
                className="group overflow-hidden border border-[var(--border-primary)] bg-[var(--card-bg)] text-left transition-all duration-200 ease-out hover:border-[var(--text-tertiary)] hover:shadow-[var(--shadow-md)] hover:-translate-y-[1px] rounded-none"
              >
                <div className="relative h-36 w-full overflow-hidden bg-[var(--bg-tertiary)] animate-pulse">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={project.leadImage}
                    alt={project.name}
                    onLoad={(e) => {
                      e.currentTarget.classList.add("opacity-100");
                      e.currentTarget.parentElement?.classList.remove("animate-pulse");
                    }}
                    className="h-full w-full object-cover opacity-0 transition-all duration-500 ease-out group-hover:scale-[1.02]"
                    loading="lazy"
                  />
                </div>
                <div className="space-y-2 px-3 py-3">
                  <div className="text-sm font-medium text-[var(--text-primary)]">
                    {project.name}
                  </div>
                  <span
                    className={`inline-flex border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] rounded-none ${getPhaseBadgeClass(
                      project.phase
                    )}`}
                  >
                    {project.phase}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <DotSeparator />

        <section className="mt-14">
          <SectionLabel>Daily Inspiration</SectionLabel>
          <div className="mt-4">
            {inspirationLoading ? (
              <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
                {Array.from({ length: 12 }).map((_, index) => (
                  <div
                    key={`skeleton-${index}`}
                    className="mb-4 h-48 w-full border border-[var(--border-primary)] bg-[var(--bg-tertiary)] rounded-none"
                  />
                ))}
              </div>
            ) : null}

            {!inspirationLoading && inspirationError ? (
              <p className="text-sm text-[var(--text-secondary)]">
                {inspirationError}
              </p>
            ) : null}

            {!inspirationLoading && !inspirationError ? (
              <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
                {inspiration.map((item, index) => (
                  <div
                    key={item.id}
                    className="group relative mb-4 overflow-hidden border border-[var(--border-primary)] bg-[var(--bg-tertiary)] animate-pulse rounded-none"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.thumbnailUrl || item.imageUrl}
                      alt={item.title ?? ""}
                      onLoad={(e) => {
                        e.currentTarget.classList.add("opacity-100");
                        e.currentTarget.parentElement?.classList.remove("animate-pulse");
                      }}
                      className="h-auto w-full object-cover opacity-0 transition-opacity duration-500 ease-out"
                      style={{ transitionDelay: `${index * 60}ms` }}
                      loading="lazy"
                    />
                    <div className="pointer-events-none absolute inset-0 flex items-end bg-black/0 p-3 opacity-0 transition-[opacity,background-color] duration-200 ease-out group-hover:bg-black/20 group-hover:opacity-100">
                      <div className="w-full">
                        <p className="truncate text-xs text-[var(--text-primary)]">
                          {item.title || "Lummi reference"}
                        </p>
                        <button
                          type="button"
                          className="pointer-events-auto mt-2 border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-2 py-1 text-[10px] font-mono uppercase tracking-[0.12em] text-[var(--text-primary)] rounded-none"
                        >
                          Save to project
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
