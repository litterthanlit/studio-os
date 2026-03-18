"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  ArrowRight,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PROJECTS, PHASE_STYLES } from "./projects-data";
import type { Project, Phase } from "./projects-data";
import {
  useNewProjectModal,
  getStoredProjects,
} from "@/components/new-project-modal";
import {
  PROJECTS_UPDATED_EVENT,
  deleteProject,
  getProjectState,
  listProjectReferences,
} from "@/lib/project-store";
import {
  DEMO_PROJECT_ID,
  isDemoDismissed,
  dismissDemo,
} from "@/lib/demo-project";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function storedToProject(sp: {
  id: string;
  name: string;
  brief: string;
  color: string;
  createdAt: string;
}): Project {
  const state = getProjectState(sp.id);
  const refs = listProjectReferences(sp.id);
  const palette =
    state.palette && state.palette.length > 0
      ? state.palette
      : ["#111111", sp.color, "#222222", "#333333", "#999999"];

  // Calculate relative time
  const created = new Date(sp.createdAt);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  let lastActivity = "Just created";
  if (diffDays > 7) lastActivity = `${Math.floor(diffDays / 7)}w ago`;
  else if (diffDays > 0) lastActivity = `${diffDays}d ago`;
  else {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours > 0) lastActivity = `${diffHours}h ago`;
  }

  return {
    id: sp.id,
    name: sp.name,
    client: "—",
    phase: "Discovery",
    progress: 0,
    leadImage:
      state.coverImage ?? `https://picsum.photos/seed/${sp.id}/400/300`,
    palette,
    lastActivity,
    references: refs.length,
    fontsSelected: [
      state.typography?.headingFont,
      state.typography?.bodyFont,
    ].filter(Boolean).length,
    daysActive: diffDays,
  };
}

function StatusDot({ phase }: { phase: Phase }) {
  const color =
    phase === "Discovery"
      ? "bg-amber-400"
      : phase === "Concept"
      ? "bg-purple-400"
      : phase === "Refine"
      ? "bg-sky-400"
      : "bg-emerald-400";
  return <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${color}`} />;
}

// ─── Logo Mark (muted, for empty state) ───────────────────────────────────────

function LogoMarkMuted({ size = 48 }: { size?: number }) {
  const id = React.useId();
  const clipId = `folderClip-empty-${id}`;
  const h = Math.round(size / 1.53);
  return (
    <svg
      width={size}
      height={h}
      viewBox="0 0 127 83"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="opacity-20"
    >
      <defs>
        <clipPath id={clipId}>
          <path d="M2 0 H53 Q57 0 57 4 V11 H119 Q121 11 121 13 V79 Q121 81 119 81 H2 Q0 81 0 79 V2 Q0 0 2 0Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <polygon points="2,0 4,0 4,81 2,81" fill="#071D5C" />
        <polygon points="7,0 10,0 11,40 10,81 7,81 6,40" fill="#0A2A7A" />
        <polygon points="14,0 18,0 20,40 18,81 14,81 12,40" fill="#0D3BA8" />
        <polygon points="23,0 28,0 31,40 28,81 23,81 20,40" fill="#1045BA" />
        <polygon points="33,0 39,0 42,40 39,81 33,81 30,40" fill="#1248C4" />
        <polygon points="44,0 51,0 54,40 51,81 44,81 41,40" fill="#1652D6" />
        <polygon points="56,0 64,0 67,40 64,81 56,81 53,40" fill="#1A58E0" />
        <polygon points="69,0 77,0 80,40 77,81 69,81 66,40" fill="#1E5DF2" />
        <polygon points="82,0 90,0 92,40 90,81 82,81 80,40" fill="#1E5DF2" />
        <polygon points="95,0 101,0 103,40 101,81 95,81 93,40" fill="#1A58E0" />
        <polygon points="106,0 111,0 112,40 111,81 106,81 105,40" fill="#1652D6" />
        <polygon points="114,0 118,0 119,40 118,81 114,81 113,40" fill="#1248C4" />
        <polygon points="120,0 121,0 121,81 120,81" fill="#0D3BA8" />
      </g>
    </svg>
  );
}

// ─── Filter Pill ──────────────────────────────────────────────────────────────

type FilterStatus = "All" | "Draft" | "Active" | "Completed";

function FilterPill({
  label,
  active,
  count,
  onClick,
}: {
  label: string;
  active: boolean;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-[4px] px-2.5 py-1.5 text-[12px] font-medium transition-colors duration-150",
        active
          ? "bg-[#1E5DF2] text-white"
          : "bg-[#F5F5F0] text-[#6B6B6B] hover:bg-[#E5E5E0] hover:text-[#1A1A1A]"
      )}
    >
      {label}
      {count !== undefined && count > 0 ? (
        <span
          className={cn(
            "font-mono text-[10px]",
            active ? "text-white/70" : "text-[#A0A0A0]"
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

// ─── Project Row ──────────────────────────────────────────────────────────────

function ProjectRow({
  project,
  canDelete,
  onDelete,
}: {
  project: Project;
  canDelete: boolean;
  onDelete: () => void;
}) {
  return (
    <div className="group/row flex items-center gap-4 rounded-[4px] border border-transparent px-3 py-2.5 transition-all duration-150 ease-out hover:border-[#E5E5E0] hover:bg-white/70">
      <Link
        href={`/projects/${project.id}`}
        className="flex flex-1 items-center gap-4 min-w-0"
      >
        {/* Thumbnail */}
        <div className="thumb-halftone-placeholder h-10 w-10 shrink-0 overflow-hidden rounded-[4px] border border-[#E5E5E0]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={project.leadImage}
            alt={project.name}
            className="h-full w-full object-cover"
          />
        </div>

        {/* Name + meta */}
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[14px] font-medium text-[#1A1A1A]">
            {project.name}
          </span>
          <span className="text-[11px] text-[#A0A0A0]">
            {project.lastActivity} · {project.references} refs
          </span>
        </div>

        {/* Phase badge */}
        <div className="flex shrink-0 items-center gap-2">
          <StatusDot phase={project.phase} />
          <span className="font-mono text-[11px] text-[#6B6B6B]">
            {project.phase}
          </span>
        </div>

        {/* Arrow */}
        <ArrowRight
          size={14}
          strokeWidth={1.5}
          className="shrink-0 text-[#E5E5E0] transition-all duration-150 group-hover/row:translate-x-0.5 group-hover/row:text-[#1E5DF2]"
        />
      </Link>

      {/* Delete */}
      {canDelete ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="shrink-0 rounded-[4px] p-1.5 text-[#A0A0A0] opacity-0 transition-all duration-150 hover:bg-red-50 hover:text-red-500 group-hover/row:opacity-100"
          aria-label={`Delete ${project.name}`}
        >
          <Trash2 size={14} strokeWidth={1.5} />
        </button>
      ) : null}
    </div>
  );
}

// ─── Projects Page ────────────────────────────────────────────────────────────

export function ProjectsPage() {
  const { openModal } = useNewProjectModal();
  const [localProjects, setLocalProjects] = React.useState<Project[]>([]);
  const [showDemo, setShowDemo] = React.useState(false);
  const [filter, setFilter] = React.useState<FilterStatus>("All");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [projectPendingDelete, setProjectPendingDelete] =
    React.useState<Project | null>(null);

  React.useEffect(() => {
    setLocalProjects(getStoredProjects().map(storedToProject));
    setShowDemo(!isDemoDismissed());

    function syncProjects() {
      setLocalProjects(getStoredProjects().map(storedToProject));
    }

    window.addEventListener(PROJECTS_UPDATED_EVENT, syncProjects);
    window.addEventListener("storage", syncProjects);
    return () => {
      window.removeEventListener(PROJECTS_UPDATED_EVENT, syncProjects);
      window.removeEventListener("storage", syncProjects);
    };
  }, []);

  function handleDismissDemo() {
    dismissDemo();
    setShowDemo(false);
  }

  function handleConfirmDelete() {
    if (!projectPendingDelete) return;
    deleteProject(projectPendingDelete.id);
    setLocalProjects((current) =>
      current.filter((p) => p.id !== projectPendingDelete.id)
    );
    setProjectPendingDelete(null);
  }

  const allProjects = [...localProjects, ...PROJECTS];
  const localProjectIds = new Set(localProjects.map((p) => p.id));

  // Map phase to filter status
  function phaseToFilter(phase: Phase): FilterStatus {
    if (phase === "Deliver") return "Completed";
    if (phase === "Discovery") return "Draft";
    return "Active";
  }

  // Filter + search
  const filteredProjects = allProjects.filter((p) => {
    if (filter !== "All" && phaseToFilter(p.phase) !== filter) return false;
    if (
      searchQuery &&
      !p.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !p.client.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

  // Counts for filter pills
  const counts = {
    All: allProjects.length,
    Draft: allProjects.filter((p) => phaseToFilter(p.phase) === "Draft").length,
    Active: allProjects.filter((p) => phaseToFilter(p.phase) === "Active")
      .length,
    Completed: allProjects.filter(
      (p) => phaseToFilter(p.phase) === "Completed"
    ).length,
  };

  const isEmpty = allProjects.length === 0 && !showDemo;

  return (
    <>
      <div className="relative z-10 mx-auto max-w-[860px] animate-in fade-in slide-in-from-bottom-2 pt-16 pb-16 duration-300 ease-out">
        {/* ── Header ── */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <span className="mono-kicker mb-3 block">Studio OS</span>
            <h1 className="font-serif text-[28px] font-normal tracking-[-0.02em] text-[#1A1A1A] leading-[1.1]">
              Projects
            </h1>
            <p className="mt-2 text-[14px] text-[#6B6B6B] leading-relaxed">
              Each project is a self-contained workspace — references, palette,
              typography, and canvas in one room.
            </p>
          </div>
          <button
            type="button"
            onClick={openModal}
            className="flex shrink-0 items-center gap-1.5 rounded-[4px] bg-[#1E5DF2] px-4 py-2 text-[13px] font-medium text-white transition-colors duration-150 hover:bg-[#1A4FD6]"
          >
            <Plus size={14} strokeWidth={2} />
            New Project
          </button>
        </div>

        {/* ── Filter Bar ── */}
        {!isEmpty ? (
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Status pills */}
            <div className="flex items-center gap-1.5">
              {(["All", "Draft", "Active", "Completed"] as FilterStatus[]).map(
                (status) => (
                  <FilterPill
                    key={status}
                    label={status}
                    active={filter === status}
                    count={counts[status]}
                    onClick={() => setFilter(status)}
                  />
                )
              )}
            </div>

            {/* Search */}
            <div className="relative">
              <Search
                size={14}
                strokeWidth={1.5}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#A0A0A0]"
              />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-full rounded-[2px] border border-[#E5E5E0] bg-white pl-8 pr-3 text-[13px] text-[#1A1A1A] outline-none placeholder:text-[#A0A0A0] transition-colors duration-150 focus:border-[#D1E4FC] focus:ring-2 focus:ring-[#D1E4FC]/40 sm:w-[200px]"
              />
            </div>
          </div>
        ) : null}

        {/* ── Empty State ── */}
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-24">
            <LogoMarkMuted size={48} />
            <p className="mt-5 text-[14px] font-medium text-[#1A1A1A]">
              No projects yet
            </p>
            <p className="mt-1 text-[13px] text-[#A0A0A0]">
              Create your first project to start collecting references.
            </p>
            <button
              type="button"
              onClick={openModal}
              className="mt-5 flex items-center gap-1.5 rounded-[4px] bg-[#1E5DF2] px-4 py-2 text-[13px] font-medium text-white transition-colors duration-150 hover:bg-[#1A4FD6]"
            >
              <Plus size={14} strokeWidth={2} />
              Create Project
            </button>
          </div>
        ) : null}

        {/* ── Project List ── */}
        {!isEmpty ? (
          <div className="flex flex-col gap-0.5">
            {/* Demo project row */}
            <AnimatePresence>
              {showDemo ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <div className="group/row flex items-center gap-4 rounded-[4px] border border-transparent px-3 py-2.5 transition-all duration-150 ease-out hover:border-[#E5E5E0] hover:bg-white/70">
                    <Link
                      href={`/projects/${DEMO_PROJECT_ID}`}
                      className="flex flex-1 items-center gap-4 min-w-0"
                    >
                      {/* Demo thumbnail */}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[4px] border border-[#D1E4FC] bg-[#D1E4FC]/20">
                        <span className="font-mono text-[9px] font-medium uppercase tracking-wider text-[#1E5DF2]">
                          Demo
                        </span>
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-[14px] font-medium text-[#1A1A1A]">
                          Studio OS Demo
                        </span>
                        <span className="text-[11px] text-[#A0A0A0]">
                          Explore the full workflow
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#1E5DF2]" />
                        <span className="font-mono text-[11px] text-[#6B6B6B]">
                          Demo
                        </span>
                      </div>
                      <ArrowRight
                        size={14}
                        strokeWidth={1.5}
                        className="shrink-0 text-[#E5E5E0] transition-all duration-150 group-hover/row:translate-x-0.5 group-hover/row:text-[#1E5DF2]"
                      />
                    </Link>
                    <button
                      type="button"
                      onClick={handleDismissDemo}
                      className="shrink-0 rounded-[4px] p-1.5 text-[#A0A0A0] opacity-0 transition-all duration-150 hover:bg-[#F5F5F0] hover:text-[#6B6B6B] group-hover/row:opacity-100"
                      aria-label="Dismiss demo"
                    >
                      <Trash2 size={14} strokeWidth={1.5} />
                    </button>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            {/* Project rows */}
            {filteredProjects.map((project) => (
              <ProjectRow
                key={project.id}
                project={project}
                canDelete={localProjectIds.has(project.id)}
                onDelete={() => setProjectPendingDelete(project)}
              />
            ))}

            {/* No results from filter */}
            {filteredProjects.length === 0 && allProjects.length > 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <p className="text-[13px] text-[#A0A0A0]">
                  No projects match{" "}
                  {searchQuery
                    ? `"${searchQuery}"`
                    : `the "${filter}" filter`}
                  .
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setFilter("All");
                    setSearchQuery("");
                  }}
                  className="mt-2 text-[13px] text-[#1E5DF2] transition-opacity hover:opacity-70"
                >
                  Clear filters
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog
        open={projectPendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setProjectPendingDelete(null);
        }}
      >
        <DialogContent className="max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Delete project?</DialogTitle>
            <DialogDescription>
              {projectPendingDelete
                ? `This will permanently remove "${projectPendingDelete.name}" from local storage, including its references, canvas state, generated variants, and tasks.`
                : "This will permanently remove the project from local storage."}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setProjectPendingDelete(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleConfirmDelete}
            >
              Delete Project
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
