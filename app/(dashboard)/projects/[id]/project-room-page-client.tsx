"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PHASE_STYLES } from "../projects-data";
import type { Project } from "../projects-data";
import { ProjectRoomSections } from "../project-room";
import { getStoredProjects } from "@/components/new-project-modal";
import {
  getProjectState,
  listProjectReferences,
  PROJECT_REFERENCES_UPDATED_EVENT,
  PROJECT_STATE_UPDATED_EVENT,
  saveProject,
} from "@/lib/project-store";

function getStoredReferenceCount(projectId: string): number {
  return listProjectReferences(projectId).length;
}

function applyStoredProjectState(project: Project): Project {
  const state = getProjectState(project.id);
  const palette =
    state.palette && state.palette.length > 0 ? state.palette : project.palette;
  const headingFont = state.typography?.headingFont;
  const bodyFont = state.typography?.bodyFont;

  return {
    ...project,
    leadImage: state.coverImage ?? project.leadImage,
    palette,
    headingFont,
    bodyFont,
    fontsSelected: [headingFont, bodyFont].filter(Boolean).length,
    references: getStoredReferenceCount(project.id),
  };
}

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
    leadImage: getProjectCover(sp.id) ?? `https://picsum.photos/seed/${sp.id}/400/300`,
    palette: [sp.color, "#111111", "#222222", "#333333", "#999999"],
    lastActivity: "Just created",
    references: getStoredReferenceCount(sp.id),
    fontsSelected: 0,
    daysActive: 0,
  };
}

function sameProjectSnapshot(a: Project | null, b: Project | null): boolean {
  if (!a || !b) return a === b;
  return (
    a.id === b.id &&
    a.name === b.name &&
    a.client === b.client &&
    a.phase === b.phase &&
    a.progress === b.progress &&
    a.leadImage === b.leadImage &&
    a.lastActivity === b.lastActivity &&
    a.references === b.references &&
    a.fontsSelected === b.fontsSelected &&
    a.daysActive === b.daysActive &&
    a.headingFont?.family === b.headingFont?.family &&
    a.bodyFont?.family === b.bodyFont?.family &&
    a.palette.join("|") === b.palette.join("|")
  );
}

export function ProjectRoomPageClient({
  id,
  staticProject,
}: {
  id: string;
  staticProject: Project | null;
}) {
  const router = useRouter();
  const [project, setProject] = React.useState<Project | null>(staticProject);
  const [checked, setChecked] = React.useState(staticProject !== null);
  const [draftName, setDraftName] = React.useState(staticProject?.name ?? "");

  // For localStorage-created projects, look them up on mount
  React.useEffect(() => {
    if (staticProject) {
      setProject(applyStoredProjectState(staticProject));
      setDraftName(staticProject.name);
      return;
    }
    const stored = getStoredProjects();
    const found = stored.find((p) => p.id === id);
    if (found) {
      setProject(applyStoredProjectState(storedToProject(found)));
      setDraftName(found.name);
    }
    setChecked(true);
  }, [id, staticProject]);

  // Not found — send back to /projects after a beat
  React.useEffect(() => {
    if (checked && !project) {
      router.replace("/projects");
    }
  }, [checked, project, router]);

  React.useEffect(() => {
    if (!project) return;
    setDraftName(project.name);
  }, [project]);

  React.useEffect(() => {
    if (!project) return;
    const syncProjectState = () => {
      setProject((prev) => {
        if (!prev) return prev;
        const next = applyStoredProjectState(prev);
        return sameProjectSnapshot(prev, next) ? prev : next;
      });
    };

    syncProjectState();
    window.addEventListener(PROJECT_REFERENCES_UPDATED_EVENT, syncProjectState);
    window.addEventListener(PROJECT_STATE_UPDATED_EVENT, syncProjectState);
    return () => {
      window.removeEventListener(PROJECT_REFERENCES_UPDATED_EVENT, syncProjectState);
      window.removeEventListener(PROJECT_STATE_UPDATED_EVENT, syncProjectState);
    };
    // `syncProjectState` already reads the latest project snapshot from state.
    // Re-subscribing on every derived field change would reintroduce noisy rerenders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id]);

  function persistName() {
    if (!project) return;
    const nextName = draftName.trim();
    if (!nextName || nextName === project.name) {
      setDraftName(project.name);
      return;
    }
    const stored = getStoredProjects().find((item) => item.id === project.id);
    saveProject({
      id: project.id,
      name: nextName,
      brief: stored?.brief ?? "",
      color: stored?.color ?? project.palette[1] ?? "#2430AD",
      createdAt: stored?.createdAt ?? new Date().toISOString(),
    });
    setProject((prev) => (prev ? { ...prev, name: nextName } : prev));
  }

  if (!project) {
    return (
      <div className="flex h-48 items-center justify-center text-[11px] text-gray-500">
        Loading…
      </div>
    );
  }

  return (
    <section className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[10px] text-gray-500 transition-colors duration-300">
        <Link
          href="/projects"
          className="transition-colors duration-300 ease-out hover:text-white"
        >
          Projects
        </Link>
        <span className="transition-colors duration-300">/</span>
        <span className="text-gray-400 transition-colors duration-300">{project.name}</span>
      </div>

      <div className="rounded-[32px] border border-card-border bg-card-bg px-6 py-6 shadow-[0_18px_50px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <input
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                onBlur={persistName}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    persistName();
                  }
                  if (event.key === "Escape") {
                    event.preventDefault();
                    setDraftName(project.name);
                  }
                }}
                className="min-w-0 flex-1 bg-transparent text-3xl font-semibold tracking-tight text-[var(--text-primary)] outline-none transition-colors duration-300"
                aria-label="Project name"
              />
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-sans font-semibold uppercase tracking-[0.12em] transition-colors duration-300 ${PHASE_STYLES[project.phase]}`}
              >
                {project.phase}
              </span>
            </div>
            <div className="mt-3 text-sm text-gray-400 transition-colors duration-300">
              {project.client}
            </div>
            <div className="mt-4 max-w-2xl text-sm leading-relaxed text-text-secondary">
              This page mirrors the state of the project across Board, System, and Site. Editing happens in Canvas.
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div className="hidden rounded-full border border-border-primary bg-bg-secondary px-3 py-2 text-[11px] uppercase tracking-[0.12em] text-text-tertiary sm:block">
              Last activity · {project.lastActivity}
            </div>
            <button
              type="button"
              onClick={() =>
                router.push(`/canvas?project=${encodeURIComponent(project.id)}`)
              }
              className="inline-flex h-11 items-center gap-2 rounded-full border border-[#3B5EFC] bg-[#3B5EFC] px-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white transition-colors duration-200 hover:bg-[#2f4fe3]"
            >
              <span>Enter Canvas</span>
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 8h8.5" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 3.5 13 8l-4.5 4.5" />
              </svg>
            </button>
          </div>
        </div>

        <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-tertiary)] transition-colors duration-300">
          <div
            className="h-full bg-accent transition-[width] duration-500 ease-out"
            style={{ width: `${project.progress}%` }}
          />
        </div>
      </div>

      <ProjectRoomSections project={project} />
    </section>
  );
}
