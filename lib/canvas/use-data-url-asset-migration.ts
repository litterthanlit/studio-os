"use client";

// Lazy migration: reference images still stored inline as data URLs are uploaded
// to Convex file storage (downscaled to 2048px) once the editor is signed in, and
// the item is rewritten to `{ imageUrl, storageId, contentHash }`. Not an undoable
// edit — no PUSH_HISTORY.

import { useEffect, useRef, type Dispatch } from "react";
import type { CanvasAction } from "./canvas-reducer";
import type { CanvasItem, ReferenceItem } from "./unified-canvas-state";
import { dataUrlToBlob, isDataUrl, type UploadedCanvasAsset } from "./reference-upload";
import type { CanvasImageUploader } from "./use-canvas-asset-upload";

export function withAssetIdentity(item: ReferenceItem, asset: UploadedCanvasAsset): ReferenceItem {
  return {
    ...item,
    imageUrl: asset.imageUrl,
    ...(asset.storageId ? { storageId: asset.storageId, contentHash: asset.contentHash } : {}),
  };
}

/** Reference items that still carry inline image bytes. */
export function referencesNeedingUpload(items: CanvasItem[]): ReferenceItem[] {
  return items.filter(
    (item): item is ReferenceItem => item.kind === "reference" && isDataUrl(item.imageUrl) && !item.storageId,
  );
}

export function useDataUrlAssetMigration(args: {
  items: CanvasItem[];
  uploader: CanvasImageUploader;
  dispatch: Dispatch<CanvasAction>;
}) {
  const { items, uploader, dispatch } = args;
  const attemptedRef = useRef(new Set<string>());
  const runningRef = useRef(false);

  useEffect(() => {
    if (!uploader.serverBacked || runningRef.current) return;
    const pending = referencesNeedingUpload(items).filter((ref) => !attemptedRef.current.has(ref.id));
    if (pending.length === 0) return;

    runningRef.current = true;
    void (async () => {
      for (const ref of pending) {
        attemptedRef.current.add(ref.id);
        try {
          const asset = await uploader.upload(dataUrlToBlob(ref.imageUrl));
          if (!asset.storageId) continue;
          dispatch({
            type: "UPDATE_ITEM",
            itemId: ref.id,
            changes: { imageUrl: asset.imageUrl, storageId: asset.storageId, contentHash: asset.contentHash },
          } as CanvasAction);
        } catch (error) {
          console.warn("[assets] Data-URL reference migration skipped:", ref.id, error);
        }
      }
      runningRef.current = false;
    })();
  }, [dispatch, items, uploader]);
}
