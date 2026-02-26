"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PHASE_STYLES } from "../projects-data";
import type { Project } from "../projects-data";
import { ProjectRoomSections } from "../project-room";
import { getStoredProjects } from "@/components/new-project-modal";

function getStoredReferenceCount(projectId: string): number {
  try {
    const raw = localStorage.getItem(`studio-os:references:${projectId}`);
    if (!raw) return 0;
    const refs = JSON.parse(raw);
    return Array.isArray(refs) ? refs.length : 0;
  } catch {
    return 0;
  }
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
    leadImage: `https://picsum.photos/seed/${sp.id}/400/300`,
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
  const [project, setProject] = React.useState<Project | null>(staticProject);
  const [checked, setChecked] = React.useState(staticProject !== null);

  // For localStorage-created projects, look them up on mount
  React.useEffect(() => {
    if (staticProject) return;
    const stored = getStoredProjects();
    const found = stored.find((p) => p.id === id);
    if (found) {
      setProject(storedToProject(found));
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
    const syncReferenceCount = () => {
      setProject((prev) => {
        if (!prev) return prev;
        const nextCount = getStoredReferenceCount(prev.id);
        if (prev.references === nextCount) return prev;
        return {
          ...prev,
          references: nextCount,
        };
      });
    };

    syncReferenceCount();
    window.addEventListener("project-references-updated", syncReferenceCount);
    return () => {
      window.removeEventListener("project-references-updated", syncReferenceCount);
    };
  }, [project?.id]);

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

      {/* Room header */}
      <div className="flex gap-4">
        <div className="relative h-20 w-32 flex-none overflow-hidden border border-card-border bg-card-bg transition-colors duration-300 rounded-xl">
          <Image
            src={project.leadImage}
            alt={project.name}
            width={160}
            height={120}
            className="h-full w-full object-cover"
            unoptimized
          />
        </div>

        <div className="flex flex-1 flex-col justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-[var(--text-primary)] transition-colors duration-300">
                {project.name}
              </h1>
              <span
                className={`px-1.5 py-0.5 text-[10px] font-sans font-semibold uppercase transition-colors duration-300 ${PHASE_STYLES[project.phase]}`}
              >
                {project.phase}
              </span>
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
              className="h-3 w-3 border border-white/10 transition-colors duration-300"
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
