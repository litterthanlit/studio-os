import { PROJECTS } from "../projects-data";
import { ProjectRoomPageClient } from "./project-room-page-client";

export function generateStaticParams() {
  return PROJECTS.map((p) => ({ id: p.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = PROJECTS.find((p) => p.id === id);
  return {
    title: project
      ? `${project.name} — Studio OS`
      : "Project Room — Studio OS",
  };
}

export default async function ProjectRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const staticProject = PROJECTS.find((p) => p.id === id) ?? null;

  // Pass null for localStorage-created projects; client resolves them
  return <ProjectRoomPageClient id={id} staticProject={staticProject} />;
}
