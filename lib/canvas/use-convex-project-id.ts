"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  getProjectById,
  PROJECTS_UPDATED_EVENT,
  setProjectConvexId,
} from "@/lib/project-store";

export function useConvexProjectId(
  slug: string,
  enabled: boolean
): Id<"projects"> | null {
  const [storedId, setStoredId] = useState<Id<"projects"> | null>(() => {
    const id = getProjectById(slug)?.convexProjectId;
    return id ? (id as Id<"projects">) : null;
  });

  useEffect(() => {
    const syncStoredId = () => {
      const id = getProjectById(slug)?.convexProjectId;
      setStoredId(id ? (id as Id<"projects">) : null);
    };
    syncStoredId();
    window.addEventListener(PROJECTS_UPDATED_EVENT, syncStoredId);
    return () => window.removeEventListener(PROJECTS_UPDATED_EVENT, syncStoredId);
  }, [slug]);

  const remoteProject = useQuery(
    api.projects.getBySlug,
    enabled && !storedId ? { slug } : "skip"
  );

  useEffect(() => {
    if (!enabled || storedId || !remoteProject?._id) return;
    setProjectConvexId(slug, remoteProject._id);
  }, [enabled, remoteProject?._id, slug, storedId]);

  return storedId ?? remoteProject?._id ?? null;
}
