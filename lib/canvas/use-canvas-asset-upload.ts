"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { isConvexCanvasSyncConfigured } from "./canvas-convex-sync";
import { useConvexProjectId } from "./use-convex-project-id";
import {
  uploadCanvasImage,
  type CanvasAssetTransport,
  type UploadedCanvasAsset,
} from "./reference-upload";

export type CanvasImageUploader = {
  /** Upload (signed in) or downscale to a data URL (local-only). */
  upload: (image: Blob) => Promise<UploadedCanvasAsset>;
  /** True when uploads land in Convex file storage. */
  serverBacked: boolean;
  transport: CanvasAssetTransport | null;
};

export function useCanvasAssetUpload(projectId: string): CanvasImageUploader {
  const configured = isConvexCanvasSyncConfigured();
  const currentUser = useQuery(api.users.current, configured ? {} : "skip");
  const signedIn = configured && Boolean(currentUser);
  const convexProjectId = useConvexProjectId(projectId, signedIn);
  const generateUploadUrl = useMutation(api.assets.generateUploadUrl);
  const register = useMutation(api.assets.register);

  const transport = useMemo<CanvasAssetTransport | null>(() => {
    if (!signedIn || !convexProjectId) return null;
    return {
      generateUploadUrl: () => generateUploadUrl({ projectId: convexProjectId }),
      register: (args) => register({ projectId: convexProjectId, ...args }),
    };
  }, [convexProjectId, generateUploadUrl, register, signedIn]);

  const upload = useCallback((image: Blob) => uploadCanvasImage(image, transport), [transport]);
  return { upload, serverBacked: Boolean(transport), transport };
}

/** Provided by UnifiedCanvasView so nested surfaces (artboards) upload the same way. */
export const CanvasAssetUploadContext = createContext<CanvasImageUploader | null>(null);

export function useCanvasImageUploader(): CanvasImageUploader | null {
  return useContext(CanvasAssetUploadContext);
}
