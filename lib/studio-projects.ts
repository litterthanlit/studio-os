import type { StoredProject } from "@/lib/project-store";

export type RemoteStudioProject = {
  _id: string;
  name: string;
  slug: string;
  color?: string;
  createdAt?: number;
  updatedAt?: number;
};

export type StudioProjectListItem = {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  convexProjectId?: string;
  source: "convex" | "local";
};

function toIso(value: number | string | undefined): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }
  if (typeof value === "string" && value) return value;
  return new Date(0).toISOString();
}

export function mergeStudioProjects(
  local: StoredProject[],
  remote: RemoteStudioProject[] | undefined,
  signedIn: boolean,
): StudioProjectListItem[] {
  if (!signedIn) {
    return local.map((project) => ({
      id: project.id,
      name: project.name,
      color: project.color,
      createdAt: project.createdAt,
      convexProjectId: project.convexProjectId,
      source: "local" as const,
    }));
  }

  const byKey = new Map<string, StudioProjectListItem>();

  for (const project of remote ?? []) {
    byKey.set(project._id, {
      id: project.slug,
      name: project.name,
      color: project.color || "#4B57DB",
      createdAt: toIso(project.createdAt ?? project.updatedAt),
      convexProjectId: project._id,
      source: "convex",
    });
  }

  for (const project of local) {
    if (!project.convexProjectId) continue;
    const existing = byKey.get(project.convexProjectId);
    if (existing) {
      byKey.set(project.convexProjectId, {
        ...existing,
        id: project.id || existing.id,
        color: project.color || existing.color,
        createdAt: project.createdAt || existing.createdAt,
      });
      continue;
    }
    byKey.set(project.convexProjectId, {
      id: project.id,
      name: project.name,
      color: project.color,
      createdAt: project.createdAt,
      convexProjectId: project.convexProjectId,
      source: "local",
    });
  }

  return Array.from(byKey.values()).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export function relativeProjectTime(iso: string): string {
  const created = new Date(iso).getTime();
  if (!Number.isFinite(created) || created <= 0) return "Recently";
  const diffMs = Date.now() - created;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays > 7) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays > 0) return `${diffDays}d ago`;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours > 0) return `${diffHours}h ago`;
  return "Just now";
}
