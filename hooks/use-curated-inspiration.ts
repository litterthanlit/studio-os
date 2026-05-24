// hooks/use-curated-inspiration.ts
// Hook for fetching and interacting with curated inspiration images

import { useState, useEffect, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export interface InspirationImage {
  id: string;
  sourceId: string;
  imageUrl: string;
  thumbnailUrl?: string;
  title?: string;
  scores?: {
    composition: number;
    color: number;
    mood: number;
    uniqueness: number;
    overall: number;
  };
  tags: string[];
  colors: string[];
  mood?: string;
  style?: string;
  displayCount?: number;
}

export interface InspirationLike {
  imageId: string;
  likedAt: string;
}

interface UseCuratedInspirationOptions {
  limit?: number;
  minScore?: number;
  autoFetch?: boolean;
}

export function useCuratedInspiration(options: UseCuratedInspirationOptions = {}) {
  const { limit = 9, minScore = 75, autoFetch = true } = options;

  const [images, setImages] = useState<InspirationImage[]>([]);
  const [likedImageIds, setLikedImageIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collection, setCollection] = useState<string>("");
  const [isScored, setIsScored] = useState(false);
  const publicImages = useQuery(api.inspiration.listPublic, { limit, minScore });
  const likes = useQuery(api.inspiration.listLikes, {});
  const likeMutation = useMutation(api.inspiration.like);
  const unlikeMutation = useMutation(api.inspiration.unlike);

  const fetchInspiration = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setImages((publicImages ?? []) as InspirationImage[]);
      setCollection("Daily Inspiration");
      setIsScored(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load inspiration");
      console.error("[useCuratedInspiration] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [publicImages]);

  const fetchLikes = useCallback(async () => {
    try {
      const likedIds = new Set<string>((likes ?? []).map((like: { imageId: string; image_id?: string }) => like.imageId ?? like.image_id) || []);
      setLikedImageIds(likedIds);
    } catch (err) {
      console.error("[useCuratedInspiration] Likes fetch error:", err);
    }
  }, [likes]);

  const likeImage = useCallback(async (imageId: string, feedbackTags?: string[]) => {
    try {
      await likeMutation({ imageId: imageId as never, feedbackTags });
      setLikedImageIds((prev) => new Set([...prev, imageId]));
      return true;
    } catch (err) {
      console.error("[useCuratedInspiration] Like error:", err);
      return false;
    }
  }, [likeMutation]);

  const unlikeImage = useCallback(async (imageId: string) => {
    try {
      await unlikeMutation({ imageId: imageId as never });
      setLikedImageIds((prev) => {
        const next = new Set(prev);
        next.delete(imageId);
        return next;
      });
      return true;
    } catch (err) {
      console.error("[useCuratedInspiration] Unlike error:", err);
      return false;
    }
  }, [unlikeMutation]);

  const toggleLike = useCallback(
    async (imageId: string) => {
      if (likedImageIds.has(imageId)) {
        return unlikeImage(imageId);
      } else {
        return likeImage(imageId);
      }
    },
    [likedImageIds, likeImage, unlikeImage]
  );

  useEffect(() => {
    if (autoFetch) {
      fetchInspiration();
      fetchLikes();
    }
  }, [autoFetch, fetchInspiration, fetchLikes]);

  return {
    images,
    likedImageIds,
    loading,
    error,
    collection,
    isScored,
    fetchInspiration,
    likeImage,
    unlikeImage,
    toggleLike,
    isLiked: (imageId: string) => likedImageIds.has(imageId),
  };
}
