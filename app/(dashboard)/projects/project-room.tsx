"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ColorPicker } from "@/components/color-picker";
import { DotSeparator } from "@/components/ui/dot-separator";
import type { Project } from "./projects-data";

export type { Phase, Project } from "./projects-data";
export { PROJECTS, PHASE_STYLES } from "./projects-data";

// ─── Project room sections ───────────────────────────────────────────────────

export function ProjectRoomSections({ project }: { project: Project }) {
  return (
    <div className="space-y-8 pb-16">
      <section id="board">
        <BoardTab project={project} />
      </section>

      <DotSeparator />

      <section id="type">
        <TypeTab />
      </section>

      <DotSeparator />

      <section id="palette">
        <PaletteTab project={project} />
      </section>

      <DotSeparator />

      <section id="tasks">
        <TasksTab projectId={project.id} />
      </section>

      <DotSeparator />

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
        <div className="text-[11px] font-medium uppercase tracking-[0.15em] text-gray-400">
          Brief
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="h-24 w-full border border-card-border bg-transparent px-2 py-1 text-sm text-text-primary outline-none transition-[border-color] duration-200 ease-out focus:border-accent"
        />
      </div>

      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="border border-card-border bg-bg-secondary p-2">
          <div className="text-[9px] font-medium uppercase tracking-[0.15em] text-gray-400">
            References
          </div>
          <div className="mt-1 text-sm font-bold text-text-primary">
            {project.references}
          </div>
        </div>
        <div className="border border-card-border bg-bg-secondary p-2">
          <div className="text-[9px] font-medium uppercase tracking-[0.15em] text-gray-400">
            Fonts
          </div>
          <div className="mt-1 text-sm font-bold text-text-primary">
            {project.fontsSelected}
          </div>
        </div>
        <div className="border border-card-border bg-bg-secondary p-2">
          <div className="text-[9px] font-medium uppercase tracking-[0.15em] text-gray-400">
            Days Active
          </div>
          <div className="mt-1 text-sm font-bold text-text-primary">
            {project.daysActive}
          </div>
        </div>
      </div>
    </div>
  );
}

type StoredReference = { imageUrl: string; title: string; tags: string[] };

function useProjectReferences(projectId: string): StoredReference[] {
  const [refs, setRefs] = React.useState<StoredReference[]>([]);
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(`studio-os:references:${projectId}`);
      if (raw) setRefs(JSON.parse(raw));
    } catch { /* ignore */ }
  }, [projectId]);
  return refs;
}

function BoardTab({ project }: { project: Project }) {
  const refs = useProjectReferences(project.id);

  return (
    <div className="space-y-3">
      <div className="text-[11px] font-medium uppercase tracking-[0.15em] text-gray-400">
        Connected Moodboard
      </div>

      {refs.length > 0 ? (
        <div className="columns-2 gap-2 lg:columns-3">
          {refs.map((ref, i) => (
            <div
              key={`${ref.imageUrl}-${i}`}
              className="group relative mb-2 overflow-hidden border border-card-border bg-card-bg"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ref.imageUrl}
                alt={ref.title}
                className="h-auto w-full object-cover"
                loading="lazy"
              />
              <div className="pointer-events-none absolute inset-0 flex items-end bg-black/0 p-2 opacity-0 transition-[opacity,background-color] duration-200 group-hover:bg-black/40 group-hover:opacity-100">
                <span className="truncate text-[10px] text-white">{ref.title}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-400">
            This will mirror a filtered view of Vision scoped to this project&apos;s
            references. For now, treat this as a conceptual placeholder.
          </p>
          <div className="border border-[#1a1a1a] bg-bg-secondary p-4 text-xs text-gray-500">
            {project.references} references connected · future state: live Vision
            subset with same masonry grid UX.
          </div>
        </>
      )}
    </div>
  );
}

function TypeTab() {
  return (
    <div className="space-y-3">
      <div className="text-[11px] font-medium uppercase tracking-[0.15em] text-gray-400">
        Typography Spine
      </div>
      <p className="text-xs text-gray-400">
        Lock the heading/body pairing that defines this project. This will sync
        with the Type Library.
      </p>
      <div className="border border-card-border bg-bg-secondary p-3">
        <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
          <span>Heading: Inter</span>
          <span>Body: Sora</span>
        </div>
        <div className="space-y-1 text-sm text-text-primary">
          <div className="text-lg font-bold">Studio OS project spine</div>
          <div className="text-xs">
            The quick brown fox jumps over the lazy dog.
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            className="border border-card-border bg-transparent px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.15em] text-gray-400 transition-[border-color] duration-200 ease-out hover:border-white/20 hover:text-text-primary"
          >
            Change Font
          </button>
        </div>
      </div>
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
      <div className="text-[11px] font-medium uppercase tracking-[0.15em] text-gray-400">
        Color System
      </div>

      {swatches.length === 0 && (
        <p className="text-xs text-gray-600">
          No colors yet. Add one below.
        </p>
      )}

      {/* Swatch list */}
      <div className="space-y-1.5">
        {swatches.map((swatch) => (
          <div
            key={swatch.id}
            className="group flex items-center gap-3 border border-transparent px-2 py-1.5 transition-[border-color,background] duration-150 hover:border-card-border hover:bg-sidebar-hover"
          >
            {/* Color picker trigger */}
            <ColorPicker
              value={swatch.color}
              onChange={(c) => updateColor(swatch.id, c)}
            />

            {/* Hex display */}
            <span className="w-[68px] flex-shrink-0 font-mono text-[11px] text-gray-500">
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
                className="flex-1 bg-transparent text-xs text-text-primary outline-none placeholder:text-gray-700"
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingId(swatch.id)}
                className="flex-1 text-left text-xs text-gray-600 transition-colors duration-150 hover:text-gray-300"
              >
                {swatch.name || (
                  <span className="italic text-gray-700">Untitled</span>
                )}
              </button>
            )}

            {/* Remove */}
            <button
              type="button"
              onClick={() => removeSwatch(swatch.id)}
              aria-label="Remove swatch"
              className="ml-auto flex-shrink-0 p-1 text-text-placeholder opacity-0 transition-[opacity,color] duration-150 group-hover:opacity-100 hover:text-red-400"
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
          className="border border-card-border bg-transparent px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.15em] text-gray-400 transition-[border-color,color] duration-200 ease-out hover:border-white/20 hover:text-text-primary"
        >
          + Add Color
        </button>
        <button
          type="button"
          className="border border-card-border bg-transparent px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.15em] text-gray-400 transition-[border-color,color] duration-200 ease-out hover:border-white/20 hover:text-text-primary"
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
      <div className="text-[11px] font-medium uppercase tracking-[0.15em] text-gray-400">
        Tasks
      </div>

      <div className="space-y-2">
        {tasks.map((task) => (
          <label
            key={task.id}
            className="flex items-center gap-2 text-xs text-text-primary cursor-pointer"
          >
            <input
              type="checkbox"
              checked={task.completed}
              onChange={() => toggleTask(task.id)}
              className="h-3 w-3 border border-gray-500 bg-transparent"
            />
            <span className={cn(task.completed && "line-through text-gray-400")}>
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
          className="flex-1 border border-card-border bg-transparent px-2 py-1 text-xs text-text-primary outline-none transition-[border-color] duration-200 ease-out focus:border-accent"
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
          className="border border-card-border bg-transparent px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.15em] text-gray-400 transition-[border-color] duration-200 ease-out hover:border-white/20 hover:text-text-primary"
        >
          Add
        </button>
      </div>
    </div>
  );
}
