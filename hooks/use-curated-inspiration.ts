// hooks/use-curated-inspiration.ts
// Hook for fetching and interacting with curated inspiration images

import { useState, useEffect, useCallback } from "react";

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

  const fetchInspiration = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/inspiration?limit=${limit}&minScore=${minScore}`);

      if (!res.ok) {
        throw new Error(`Failed to fetch inspiration (${res.status})`);
      }

      const data = await res.json();

      if (data.images) {
        setImages(data.images);
        setCollection(data.collection || "Daily Inspiration");
        setIsScored(data.scored || false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load inspiration");
      console.error("[useCuratedInspiration] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [limit, minScore]);

  const fetchLikes = useCallback(async () => {
    try {
      const res = await fetch("/api/inspiration/likes");

      if (!res.ok) {
        console.error("[useCuratedInspiration] Failed to fetch likes");
        return;
      }

      const data = await res.json();
      const likedIds = new Set<string>(data.likes?.map((like: { image_id: string }) => like.image_id) || []);
      setLikedImageIds(likedIds);
    } catch (err) {
      console.error("[useCuratedInspiration] Likes fetch error:", err);
    }
  }, []);

  const likeImage = useCallback(async (imageId: string, feedbackTags?: string[]) => {
    try {
      const res = await fetch("/api/inspiration/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId, feedbackTags }),
      });

      if (res.ok || res.status === 409) {
        setLikedImageIds((prev) => new Set([...prev, imageId]));
        return true;
      }

      console.error("[useCuratedInspiration] Failed to like image");
      return false;
    } catch (err) {
      console.error("[useCuratedInspiration] Like error:", err);
      return false;
    }
  }, []);

  const unlikeImage = useCallback(async (imageId: string) => {
    try {
      const res = await fetch(`/api/inspiration/likes?imageId=${encodeURIComponent(imageId)}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setLikedImageIds((prev) => {
          const next = new Set(prev);
          next.delete(imageId);
          return next;
        });
        return true;
      }

      return false;
    } catch (err) {
      console.error("[useCuratedInspiration] Unlike error:", err);
      return false;
    }
  }, []);

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
