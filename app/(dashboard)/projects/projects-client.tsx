"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDownIcon as ChevronDown,
  ChevronRightIcon as ChevronRight,
  PlusIcon as Plus,
  CloseIcon as X,
} from "@/components/ui/icon";
import { SectionLabel } from "@/components/ui/section-label";
import { cn } from "@/lib/utils";
import { PROJECTS, PHASE_STYLES } from "./projects-data";
import type { Project } from "./projects-data";
import {
  useNewProjectModal,
  getStoredProjects,
} from "@/components/new-project-modal";
import {
  DEMO_PROJECT,
  DEMO_PROJECT_ID,
  DEMO_DISMISSED_KEY,
  isDemoDismissed,
  dismissDemo,
} from "@/lib/demo-project";

function storedToProject(sp: {
  id: string;
  name: string;
  brief: string;
  color: string;
  createdAt: string;
}): Project {
  return {
    id: sp.id,
    name: sp.name,
    client: "—",
    phase: "Discovery",
    progress: 0,
    leadImage: `https://picsum.photos/seed/${sp.id}/400/300`,
    palette: [sp.color, "#111111", "#222222", "#333333", "#999999"],
    lastActivity: "Just created",
    references: 0,
    fontsSelected: 0,
    daysActive: 0,
  };
}

// ─── Demo Project Card ────────────────────────────────────────────────────────

function DemoProjectCard({ onDismiss }: { onDismiss: () => void }) {
  return (
    <Link
      href={`/projects/${DEMO_PROJECT_ID}`}
          className={cn(
            "group relative flex w-full flex-col border border-[#1a1a1a] bg-card-bg text-left rounded-xl",
            "transition-[border-color] duration-200 ease-out hover:border-accent/40"
          )}
    >
      {/* Demo badge */}
      <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5 border border-accent/25 bg-accent/10 px-2 py-0.5">
        <span className="text-[9px] font-medium uppercase tracking-[0.15em] text-accent">
          Demo Project
        </span>
      </div>

      {/* Dismiss */}
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDismiss(); }}
        aria-label="Dismiss demo project"
        className="absolute right-2 top-2 z-10 rounded p-1 text-text-muted transition-colors duration-150 hover:bg-white/[0.05] hover:text-white"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="flex gap-3 p-3 pt-10">
        {/* Color palette strip as "lead image" */}
        <div className="relative h-20 w-32 flex-none overflow-hidden border border-border-subtle bg-card-bg">
          <div className="flex h-full">
            {DEMO_PROJECT.palette.map((c, i) => (
              <div key={i} className="flex-1" style={{ backgroundColor: c }} />
            ))}
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="grid grid-cols-3 gap-0.5 p-1">
              {DEMO_PROJECT.references.slice(0, 6).map((ref) => (
                <div
                  key={ref.imageUrl}
                  className="h-4 w-6 overflow-hidden bg-bg-secondary"
                >
                  <Image src={ref.imageUrl} alt="" width={24} height={16} className="h-full w-full object-cover opacity-70" unoptimized />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-between gap-1">
          <div>
            <div className="text-sm font-bold text-text-primary">{DEMO_PROJECT.name}</div>
            <div className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-gray-500">
              {DEMO_PROJECT.brief}
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
            <span>Explore Studio OS →</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border-subtle px-3 py-2 text-[11px] text-text-muted">
        <div className="flex items-center gap-3">
          <span>{DEMO_PROJECT.references.length} references</span>
          <span>·</span>
          <span>{DEMO_PROJECT.fonts.length} font pairings</span>
          <span>·</span>
          <span>Full palette included</span>
        </div>
        <div className="flex items-center gap-1">
          {DEMO_PROJECT.palette.slice(0, 6).map((color) => (
            <span
              key={color}
              className="h-3 w-3 rounded-full border border-white/5"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>
    </Link>
  );
}

// ─── Projects Page ────────────────────────────────────────────────────────────

export function ProjectsPage() {
  const { openModal } = useNewProjectModal();
  const [showArchived, setShowArchived] = React.useState(false);
  const [localProjects, setLocalProjects] = React.useState<Project[]>([]);
  const [showDemo, setShowDemo] = React.useState(false);

  React.useEffect(() => {
    setLocalProjects(getStoredProjects().map(storedToProject));
    setShowDemo(!isDemoDismissed());
  }, []);

  function handleDismissDemo() {
    dismissDemo();
    setShowDemo(false);
  }

  const allProjects = [...localProjects, ...PROJECTS];

  return (
    <section className="space-y-6">
      <SectionLabel>Projects</SectionLabel>

      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-3xl font-semibold text-text-primary tracking-tight">Project Rooms</h2>
          <p className="text-sm text-text-secondary">
            Each room is a self-contained project spine — context, decisions,
            references and tasks in one place, without the Notion overhead.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <SectionLabel>Active Projects</SectionLabel>
            <button
              type="button"
              onClick={openModal}
              className="flex items-center gap-1 border border-border-primary bg-card-bg px-2.5 py-1.5 text-[10px] font-medium text-text-tertiary font-mono transition-[border-color,color] duration-150 hover:border-border-hover hover:text-white rounded-lg"
            >
              <Plus className="h-3 w-3" />
              New Project
            </button>
          </div>

          {/* Empty state */}
          {allProjects.length === 0 && !showDemo && (
            <div className="flex flex-col items-center gap-3 border border-dashed border-card-border bg-card-bg py-10 text-center rounded-xl">
              <p className="text-sm text-text-tertiary">No projects yet.</p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={openModal}
                  className="border border-border-primary bg-bg-secondary px-4 py-2 text-[12px] font-medium text-white transition-[border-color] duration-150 hover:border-white/30 rounded-lg"
                >
                  + Create Project
                </button>
                <span className="text-[11px] text-gray-700">or</span>
                <button
                  type="button"
                  onClick={() => setShowDemo(true)}
                  className="text-[12px] text-accent transition-opacity hover:opacity-70"
                >
                  Explore Demo →
                </button>
              </div>
            </div>
          )}

          {/* Demo project card */}
          <AnimatePresence>
            {showDemo && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <DemoProjectCard onDismiss={handleDismissDemo} />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid gap-4 sm:grid-cols-2">
            {allProjects.map((project) => {
              return (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className={cn(
                    "flex w-full flex-col overflow-hidden border border-[#1a1a1a] bg-card-bg text-left rounded-xl",
                    "transition-[border-color] duration-200 ease-out hover:border-[#252525]"
                  )}
                >
                  {/* Full-width thumbnail */}
                  <div className="relative aspect-video w-full overflow-hidden bg-card-bg">
                    <Image
                      src={project.leadImage}
                      alt={project.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>

                  {/* Card content */}
                  <div className="flex flex-col gap-2 p-4">
                    {/* Name */}
                    <div className="text-sm font-semibold text-text-primary">
                      {project.name}
                    </div>

                    {/* Client + Phase on same line */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-text-tertiary">
                        {project.client}
                      </span>
                      <span
                        className={cn(
                          "px-1.5 py-0.5 text-[10px] font-mono font-medium uppercase tracking-[0.12em]",
                          PHASE_STYLES[project.phase]
                        )}
                      >
                        {project.phase}
                      </span>
                    </div>

                    {/* Progress bar + % */}
                    <div className="space-y-1">
                      <div className="h-0.5 w-full bg-bg-input">
                        <div
                          className="h-full bg-accent"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                      <div className="text-[11px] text-text-secondary">
                        {project.progress}%
                      </div>
                    </div>

                    {/* Palette + ref count + time */}
                    <div className="flex items-center justify-between pt-0.5">
                      <div className="flex items-center gap-1">
                        {project.palette.slice(0, 5).map((color) => (
                          <span
                            key={`${project.id}-${color}`}
                            className="h-3 w-3 rounded-full border border-white/10"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <span className="text-[11px] text-text-muted font-mono">
                        {project.references} refs · {project.lastActivity}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="border-t border-[#151515] pt-4">
          <button
            type="button"
            onClick={() => setShowArchived((prev) => !prev)}
            className="flex w-full items-center justify-between text-left text-xs text-gray-500 transition-colors duration-200 hover:text-white"
          >
            <SectionLabel>Archived</SectionLabel>
            {showArchived ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
          <AnimatePresence initial={false}>
            {showArchived && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="mt-3 overflow-hidden text-[11px] text-gray-500"
              >
                No archived projects yet. Rooms you mark as complete will land
                here.
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </section>
  );
}
