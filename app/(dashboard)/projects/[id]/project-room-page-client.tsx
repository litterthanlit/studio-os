"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PHASE_STYLES } from "../projects-data";
import type { Project } from "../projects-data";
import { ProjectRoomSections } from "../project-room";
import { getStoredProjects, getProjectCover, setProjectCover } from "@/components/new-project-modal";
import {
  getProjectState,
  listProjectReferences,
  PROJECT_REFERENCES_UPDATED_EVENT,
  PROJECT_STATE_UPDATED_EVENT,
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

export function ProjectRoomPageClient({
  id,
  staticProject,
}: {
  id: string;
  staticProject: Project | null;
}) {
  const router = useRouter();
  const coverInputRef = React.useRef<HTMLInputElement>(null);

  const [project, setProject] = React.useState<Project | null>(() => {
    if (!staticProject) return null;
    if (typeof window === "undefined") return staticProject;
    return applyStoredProjectState(staticProject);
  });
  const [checked, setChecked] = React.useState(staticProject !== null);

  // For localStorage-created projects, look them up on mount
  React.useEffect(() => {
    if (staticProject) {
      setProject(applyStoredProjectState(staticProject));
      return;
    }
    const stored = getStoredProjects();
    const found = stored.find((p) => p.id === id);
    if (found) {
      setProject(applyStoredProjectState(storedToProject(found)));
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
    const syncProjectState = () => {
      setProject((prev) => {
        if (!prev) return prev;
        return applyStoredProjectState(prev);
      });
    };

    syncProjectState();
    window.addEventListener(PROJECT_REFERENCES_UPDATED_EVENT, syncProjectState);
    window.addEventListener(PROJECT_STATE_UPDATED_EVENT, syncProjectState);
    return () => {
      window.removeEventListener(PROJECT_REFERENCES_UPDATED_EVENT, syncProjectState);
      window.removeEventListener(PROJECT_STATE_UPDATED_EVENT, syncProjectState);
    };
  }, [project?.id]);

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !project) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setProjectCover(project.id, dataUrl);
      setProject((prev) => prev ? { ...prev, leadImage: dataUrl } : prev);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
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

      {/* Hidden file input for cover photo */}
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleCoverChange}
      />

      {/* Room header */}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => coverInputRef.current?.click()}
          className="group relative h-20 w-32 flex-none overflow-hidden border border-card-border bg-card-bg transition-colors duration-300 rounded-xl cursor-pointer"
        >
          <Image
            src={project.leadImage}
            alt={project.name}
            width={160}
            height={120}
            className="h-full w-full object-cover"
            unoptimized
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/50 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
            </svg>
            <span className="text-[9px] font-medium text-white">Change cover</span>
          </div>
        </button>

        <div className="flex flex-1 flex-col justify-between gap-2">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-[var(--text-primary)] transition-colors duration-300">
                {project.name}
              </h1>
              <span
                className={`px-1.5 py-0.5 text-[10px] font-sans font-semibold uppercase transition-colors duration-300 ${PHASE_STYLES[project.phase]}`}
              >
                {project.phase}
              </span>
              <Link
                href={`/canvas?project=${project.id}`}
                className="inline-flex h-9 items-center gap-2 rounded-full border border-[#3B5EFC] bg-[#3B5EFC] px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-white transition-colors duration-200 hover:bg-[#2f4fe3]"
              >
                <span>Open Canvas</span>
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
              </Link>
            </div>
            <div className="text-[12px] text-gray-400 transition-colors duration-300">{project.client}</div>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-gray-500 transition-colors duration-300">
              <span className="transition-colors duration-300">Progress</span>
              <span className="transition-colors duration-300">{project.progress}%</span>
            </div>
            <div className="h-1.5 w-full bg-[var(--bg-tertiary)] transition-colors duration-300 overflow-hidden">
              <div
                className="h-full bg-accent transition-[width] duration-500 ease-out"
                style={{ width: `${project.progress}%` }}
              />
            </div>
            <div className="text-[11px] text-gray-500 transition-colors duration-300">
              Last activity · {project.lastActivity}
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 border-b border-card-border pb-4 text-[11px] text-gray-500 transition-colors duration-300">
        <span className="transition-colors duration-300">{project.references} references</span>
        <span className="transition-colors duration-300">·</span>
        <span className="transition-colors duration-300">{project.fontsSelected} fonts selected</span>
        <span className="transition-colors duration-300">·</span>
        <span className="transition-colors duration-300">{project.daysActive} days active</span>
        <span className="ml-auto flex items-center gap-1">
          {project.palette.slice(0, 5).map((color, i) => (
            <span
              key={`${color}-${i}`}
              className="h-3 w-3 rounded-full border border-white/10 transition-colors duration-300"
              style={{ backgroundColor: color }}
            />
          ))}
        </span>
      </div>

      {/* Project sections */}
      <ProjectRoomSections project={project} />
    </section>
  );
}
