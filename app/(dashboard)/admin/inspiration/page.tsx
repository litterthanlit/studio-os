// app/(dashboard)/admin/inspiration/page.tsx
// Admin view for managing curated inspiration images

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface ScoredImage {
  id: string;
  source: string;
  sourceId: string;
  imageUrl: string;
  thumbnailUrl?: string;
  title?: string;
  scoreComposition: number;
  scoreColor: number;
  scoreMood: number;
  scoreUniqueness: number;
  scoreOverall: number;
  tags: string[];
  colors: string[];
  mood?: string;
  style?: string;
  curationStatus: "pending" | "approved" | "rejected" | "featured";
  displayCount: number;
  createdAt: string;
}

export default function AdminInspirationPage() {
  const [images, setImages] = useState<ScoredImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected" | "featured">("all");
  const [minScore, setMinScore] = useState(0);
  const [batchScoring, setBatchScoring] = useState(false);

  useEffect(() => {
    fetchImages();
  }, [filter, minScore]);

  async function fetchImages() {
    setLoading(true);
    try {
      const res = await fetch(`/api/inspiration/admin/list?filter=${filter}&minScore=${minScore}`);
      const data = await res.json();
      setImages(data.images || []);
    } catch (error) {
      console.error("[admin/inspiration] Fetch error:", error);
    } finally {
      setLoading(false);
    }
  }

  async function runBatchScore() {
    setBatchScoring(true);
    try {
      // Default to sample images for testing (no API rate limits)
      // Set useLummi: true for production with Lummi API
      const res = await fetch("/api/inspiration/admin/batch-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "lummi", useLummi: false, limit: 6 }),
      });
      const data = await res.json();
      console.log("[batch-score] Response:", data);
      if (!res.ok) {
        alert(`Error ${res.status}: ${data.error || data.details || 'Unknown error'}`);
      } else if (data.scored === 0 && data.errors?.length > 0) {
        alert(`Scoring failed. Errors:\n${data.errors.slice(0, 3).join('\n')}`);
      } else if (data.scored === 0) {
        alert(`${data.message || "No images to score"}\nTotal available: ${data.total || 0}`);
      } else {
        alert(`Scored ${data.scored}/${data.total} images, ${data.approved} approved (75+ score)`);
      }
      fetchImages();
    } catch (error) {
      console.error("[admin/inspiration] Batch score error:", error);
      alert(`Batch scoring failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setBatchScoring(false);
    }
  }

  async function updateStatus(imageId: string, status: ScoredImage["curationStatus"]) {
    try {
      const res = await fetch(`/api/inspiration/admin/update-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId, status }),
      });
      if (res.ok) {
        fetchImages();
      }
    } catch (error) {
      console.error("[admin/inspiration] Update error:", error);
    }
  }

  const scoreColor = (score: number) => {
    if (score >= 85) return "text-emerald-500";
    if (score >= 75) return "text-blue-500";
    if (score >= 60) return "text-amber-500";
    return "text-red-500";
  };

  return (
    <div className="min-h-screen px-8 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-medium text-text-primary">Curated Inspiration Admin</h1>
          <button
            onClick={runBatchScore}
            disabled={batchScoring}
            className="px-4 py-2 bg-accent text-white rounded hover:bg-accent/90 disabled:opacity-50"
          >
            {batchScoring ? "Scoring..." : "Batch Score New Images"}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-bg-secondary p-4 rounded border border-border-primary">
            <div className="text-3xl font-medium text-text-primary">{images.length}</div>
            <div className="text-sm text-text-tertiary">Total Images</div>
          </div>
          <div className="bg-bg-secondary p-4 rounded border border-border-primary">
            <div className="text-3xl font-medium text-emerald-500">
              {images.filter((i) => i.scoreOverall >= 75).length}
            </div>
            <div className="text-sm text-text-tertiary">Score 75+</div>
          </div>
          <div className="bg-bg-secondary p-4 rounded border border-border-primary">
            <div className="text-3xl font-medium text-blue-500">
              {images.filter((i) => i.curationStatus === "approved").length}
            </div>
            <div className="text-sm text-text-tertiary">Approved</div>
          </div>
          <div className="bg-bg-secondary p-4 rounded border border-border-primary">
            <div className="text-3xl font-medium text-amber-500">
              {images.filter((i) => i.curationStatus === "pending").length}
            </div>
            <div className="text-sm text-text-tertiary">Pending</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="px-3 py-2 bg-bg-secondary border border-border-primary rounded text-text-primary"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="featured">Featured</option>
          </select>
          <select
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
            className="px-3 py-2 bg-bg-secondary border border-border-primary rounded text-text-primary"
          >
            <option value={0}>All Scores</option>
            <option value={75}>75+ only</option>
            <option value={85}>85+ only</option>
          </select>
        </div>

        {/* Image Grid */}
        {loading ? (
          <div className="text-center py-12 text-text-tertiary">Loading...</div>
        ) : images.length === 0 ? (
          <div className="text-center py-12 text-text-tertiary">No images found</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image) => (
              <motion.div
                key={image.id}
                layout
                className="group relative aspect-[3/4] bg-bg-tertiary rounded overflow-hidden"
              >
                <img
                  src={image.thumbnailUrl || image.imageUrl}
                  alt={image.title || "Untitled"}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />

                {/* Score overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute top-2 right-2">
                    <span className={`text-lg font-bold ${scoreColor(image.scoreOverall)}`}>
                      {image.scoreOverall}
                    </span>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <div className="grid grid-cols-2 gap-2 text-[10px] text-white mb-2">
                      <div>Comp: {image.scoreComposition}</div>
                      <div>Color: {image.scoreColor}</div>
                      <div>Mood: {image.scoreMood}</div>
                      <div>Unique: {image.scoreUniqueness}</div>
                    </div>

                    {image.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {image.tags.slice(0, 4).map((tag) => (
                          <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-white/20 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Status buttons */}
                    <div className="flex gap-1">
                      {(["pending", "approved", "rejected", "featured"] as const).map((status) => (
                        <button
                          key={status}
                          onClick={() => updateStatus(image.id, status)}
                          className={`text-[9px] px-2 py-1 rounded capitalize ${
                            image.curationStatus === status
                              ? "bg-accent text-white"
                              : "bg-white/20 text-white hover:bg-white/30"
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Status badge */}
                <div className="absolute top-2 left-2">
                  <span
                    className={`text-[9px] px-2 py-1 rounded-full capitalize ${
                      image.curationStatus === "approved"
                        ? "bg-emerald-500/80 text-white"
                        : image.curationStatus === "rejected"
                        ? "bg-red-500/80 text-white"
                        : image.curationStatus === "featured"
                        ? "bg-purple-500/80 text-white"
                        : "bg-amber-500/80 text-white"
                    }`}
                  >
                    {image.curationStatus}
                  </span>
                </div>

                {/* Display count */}
                <div className="absolute bottom-2 right-2">
                  <span className="text-[9px] px-2 py-1 bg-black/50 text-white rounded">
                    {image.displayCount} views
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
