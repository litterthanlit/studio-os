"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PHASE_STYLES } from "../projects-data";
import type { Project } from "../projects-data";
import { ProjectRoomTabs } from "../project-room";
import { getStoredProjects } from "@/components/new-project-modal";

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
      <div className="flex items-center gap-2 text-[10px] text-gray-500">
        <Link
          href="/projects"
          className="transition-colors duration-200 ease-out hover:text-white"
        >
          Projects
        </Link>
        <span>/</span>
        <span className="text-gray-400">{project.name}</span>
      </div>

      {/* Room header */}
      <div className="flex gap-4">
        <div className="relative h-20 w-32 flex-none overflow-hidden border border-[#222222] bg-[#0a0a0a]">
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
              <h1 className="text-lg font-semibold text-white">
                {project.name}
              </h1>
              <span
                className={`px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.15em] ${PHASE_STYLES[project.phase]}`}
              >
                {project.phase}
              </span>
            </div>
            <div className="text-[12px] text-gray-400">{project.client}</div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="h-0.5 w-full bg-[#333333]">
              <div
                className="h-full bg-accent"
                style={{ width: `${project.progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-gray-500">
              <span>{project.progress}% complete</span>
              <span>Last activity · {project.lastActivity}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 border-b border-[#222222] pb-4 text-[11px] text-gray-500">
        <span>{project.references} references</span>
        <span>·</span>
        <span>{project.fontsSelected} fonts selected</span>
        <span>·</span>
        <span>{project.daysActive} days active</span>
        <span className="ml-auto flex items-center gap-1">
          {project.palette.slice(0, 5).map((color, i) => (
            <span
              key={`${color}-${i}`}
              className="h-3 w-3 border border-white/10"
              style={{ backgroundColor: color }}
            />
          ))}
        </span>
      </div>

      {/* Tabs */}
      <ProjectRoomTabs project={project} />
    </section>
  );
}
