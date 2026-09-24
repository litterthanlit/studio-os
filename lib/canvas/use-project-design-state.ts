"use client";

// Write-through for project design state (taste profile + design tokens).
// localStorage project state stays the cache; when signed in, Convex
// `projectDesignState` is the copy agents read (`convex/designState.ts`).

import { useCallback, useEffect, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { DesignSystemTokens } from "@/lib/canvas/generate-system";
import { getProjectState, upsertProjectState } from "@/lib/project-store";
import type { TasteProfile } from "@/types/taste-profile";
import { isConvexCanvasSyncConfigured } from "./canvas-convex-sync";
import { useConvexProjectId } from "./use-convex-project-id";

export type DesignStatePatch = {
  tasteProfile?: TasteProfile | null;
  designTokens?: DesignSystemTokens | null;
};

type RemoteDesignState = {
  tasteProfile: TasteProfile | null;
  designTokens: DesignSystemTokens | null;
} | null;

export function useProjectDesignState(
  projectId: string | null | undefined,
  options: { onRemoteTaste?: (taste: TasteProfile) => void } = {},
) {
  const configured = isConvexCanvasSyncConfigured();
  const currentUser = useQuery(api.users.current, configured ? {} : "skip");
  const signedIn = configured && Boolean(currentUser);
  const convexProjectId = useConvexProjectId(projectId ?? "", signedIn && Boolean(projectId));
  const serverBacked = signedIn && Boolean(convexProjectId);
  const remote = useQuery(
    api.designState.get,
    serverBacked ? { projectId: convexProjectId } : "skip",
  ) as RemoteDesignState | undefined;
  const saveDesignState = useMutation(api.designState.save);

  const pushRemote = useCallback(
    (patch: DesignStatePatch) => {
      if (!serverBacked || !convexProjectId) return;
      void saveDesignState({ projectId: convexProjectId, ...patch }).catch((error: unknown) => {
        console.warn("[design-state] Server write failed; kept local cache:", error);
      });
    },
    [convexProjectId, saveDesignState, serverBacked],
  );

  /**
   * Cache locally, then write through to Convex when signed in. `localOnly`
   * caches what the server already stored (e.g. taste an engine run derived,
   * which keeps its brief cache key server-side).
   */
  const persistDesignState = useCallback(
    (patch: DesignStatePatch, options: { localOnly?: boolean } = {}) => {
      if (!projectId) return;
      const canvas: Record<string, unknown> = {};
      if (patch.tasteProfile !== undefined) canvas.tasteProfile = patch.tasteProfile;
      if (patch.designTokens !== undefined) canvas.designTokens = patch.designTokens;
      upsertProjectState(projectId, { canvas });
      if (!options.localOnly) pushRemote(patch);
    },
    [projectId, pushRemote],
  );

  // First load per project: seed the server from the local cache where it has nothing,
  // and hydrate the local cache from the server where the cache is empty.
  const reconciledRef = useRef<string | null>(null);
  const onRemoteTaste = options.onRemoteTaste;
  useEffect(() => {
    if (!projectId || !serverBacked || remote === undefined) return;
    if (reconciledRef.current === projectId) return;
    reconciledRef.current = projectId;

    const local = getProjectState(projectId).canvas;
    const seed: DesignStatePatch = {};
    if (local?.tasteProfile && !remote?.tasteProfile) seed.tasteProfile = local.tasteProfile as TasteProfile;
    if (local?.designTokens && !remote?.designTokens) seed.designTokens = local.designTokens as DesignSystemTokens;
    if (Object.keys(seed).length > 0) pushRemote(seed);

    const hydrate: Record<string, unknown> = {};
    if (!local?.tasteProfile && remote?.tasteProfile) {
      hydrate.tasteProfile = remote.tasteProfile;
      onRemoteTaste?.(remote.tasteProfile);
    }
    if (!local?.designTokens && remote?.designTokens) hydrate.designTokens = remote.designTokens;
    if (Object.keys(hydrate).length > 0) upsertProjectState(projectId, { canvas: hydrate });
  }, [onRemoteTaste, projectId, pushRemote, remote, serverBacked]);

  return { persistDesignState, serverBacked, convexProjectId: serverBacked ? (convexProjectId as string) : null };
}
