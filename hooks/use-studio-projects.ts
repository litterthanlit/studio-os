"use client";

import { useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import { isConvexConfigured } from "@/lib/convex/is-configured";
import {
  getProjects,
  PROJECTS_UPDATED_EVENT,
  setProjectConvexId,
  type StoredProject,
} from "@/lib/project-store";
import {
  mergeStudioProjects,
  type RemoteStudioProject,
  type StudioProjectListItem,
} from "@/lib/studio-projects";

export function useStudioProjects(): {
  projects: StudioProjectListItem[];
  signedIn: boolean;
  loading: boolean;
} {
  const configured = isConvexConfigured();
  const currentUser = useQuery(api.users.current, configured ? {} : "skip");
  const remote = useQuery(
    api.projects.listMine,
    configured && currentUser ? {} : "skip",
  );
  const [local, setLocal] = useState<StoredProject[]>([]);

  useEffect(() => {
    const sync = () => setLocal(getProjects());
    sync();
    window.addEventListener(PROJECTS_UPDATED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(PROJECTS_UPDATED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const signedIn = Boolean(currentUser);
  const projects = useMemo(
    () => mergeStudioProjects(local, remote as RemoteStudioProject[] | undefined, signedIn),
    [local, remote, signedIn],
  );

  useEffect(() => {
    if (!signedIn || !remote) return;
    for (const project of remote as RemoteStudioProject[]) {
      const match = local.find((item) => item.id === project.slug);
      if (match && match.convexProjectId !== project._id) {
        setProjectConvexId(project.slug, project._id);
      }
    }
  }, [local, remote, signedIn]);

  return {
    projects,
    signedIn,
    loading: Boolean(configured && currentUser === undefined),
  };
}
