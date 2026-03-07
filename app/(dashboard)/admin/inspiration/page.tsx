"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

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

const SOURCE_COLORS: Record<string, string> = {
  pinterest: "bg-rose-500/80",
  lummi: "bg-violet-500/80",
  sample: "bg-neutral-500/80",
};

export default function AdminInspirationPage() {
  const [images, setImages] = useState<ScoredImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected" | "featured">("all");
  const [minScore, setMinScore] = useState(0);
  const [batchScoring, setBatchScoring] = useState(false);

  // Pinterest board import state
  const [boards, setBoards] = useState<{ id: string; name: string; pin_count: number }[]>([]);
  const [boardsLoading, setBoardsLoading] = useState(false);
  const [selectedBoardId, setSelectedBoardId] = useState("");
  const [boardImporting, setBoardImporting] = useState(false);
  const [boardResult, setBoardResult] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Pinterest search state (kept for when Standard access is approved)
  const [searchQuery, setSearchQuery] = useState("");
  const [pinterestScoring, setPinterestScoring] = useState(false);
  const [pinterestResult, setPinterestResult] = useState<string | null>(null);

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
      const res = await fetch("/api/inspiration/admin/batch-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "lummi", useLummi: true, limit: 6 }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`Error ${res.status}: ${data.error || "Unknown error"}`);
      } else {
        alert(`Scored ${data.scored}/${data.total} images · ${data.approved} approved (75+)`);
      }
      fetchImages();
    } catch (error) {
      alert(`Batch scoring failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setBatchScoring(false);
    }
  }

  async function loadBoards() {
    setBoardsLoading(true);
    setBoardResult(null);
    try {
      const res = await fetch("/api/inspiration/admin/list-boards");
      const data = await res.json();
      if (!res.ok) {
        setBoardResult(`Error: ${data.error}`);
      } else {
        setBoards(data.boards || []);
        if (data.boards?.length > 0) setSelectedBoardId(data.boards[0].id);
      }
    } catch (err) {
      setBoardResult(`Failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setBoardsLoading(false);
    }
  }

  async function importBoard() {
    if (!selectedBoardId || boardImporting) return;
    setBoardImporting(true);
    setBoardResult(null);
    const board = boards.find((b) => b.id === selectedBoardId);
    try {
      const res = await fetch("/api/inspiration/admin/import-pinterest-board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardId: selectedBoardId, boardName: board?.name, limit: 5 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBoardResult(`Error: ${data.error}`);
      } else if (data.scored === 0) {
        setBoardResult(data.message || "No new pins scored");
      } else {
        setBoardResult(`✓ Scored ${data.scored} pins · ${data.approved} approved and added to Daily Inspiration`);
        fetchImages();
      }
    } catch (err) {
      setBoardResult(`Failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setBoardImporting(false);
    }
  }

  async function runPinterestSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim() || pinterestScoring) return;
    setPinterestScoring(true);
    setPinterestResult(null);

    try {
      const res = await fetch("/api/inspiration/admin/score-pinterest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery.trim(), limit: 5 }),
      });
      const data = await res.json();

      if (!res.ok) {
        setPinterestResult(`Error: ${data.error}`);
      } else if (data.scored === 0) {
        setPinterestResult(data.message || "No new pins scored");
      } else {
        setPinterestResult(
          `✓ Scored ${data.scored} pins · ${data.approved} approved and added to Daily Inspiration`
        );
        fetchImages();
      }
    } catch (error) {
      setPinterestResult(`Failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setPinterestScoring(false);
    }
  }

  async function updateStatus(imageId: string, status: ScoredImage["curationStatus"]) {
    try {
      const res = await fetch("/api/inspiration/admin/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId, status }),
      });
      if (res.ok) fetchImages();
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

  const stats = {
    total: images.length,
    high: images.filter((i) => i.scoreOverall >= 75).length,
    approved: images.filter((i) => i.curationStatus === "approved").length,
    pending: images.filter((i) => i.curationStatus === "pending").length,
  };

  return (
    <div className="min-h-screen px-8 py-8">
      <div className="max-w-7xl mx-auto">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-medium text-text-primary">Curated Inspiration Admin</h1>
            <p className="text-sm text-text-tertiary mt-0.5">
              Approved images (score ≥ 75) appear automatically in Daily Inspiration
            </p>
          </div>
          <button
            onClick={runBatchScore}
            disabled={batchScoring}
            className="px-4 py-2 bg-bg-secondary border border-border-primary text-text-secondary rounded-lg text-sm hover:bg-bg-tertiary disabled:opacity-40 transition-colors"
          >
            {batchScoring ? "Scoring Lummi..." : "Batch Score Lummi"}
          </button>
        </div>

        {/* ── Pinterest Board Import ── */}
        <div className="mb-8 rounded-xl border border-border-primary bg-bg-secondary p-5">
          <div className="flex items-center gap-2 mb-3">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-rose-500" fill="currentColor">
              <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
            </svg>
            <span className="text-sm font-medium text-text-primary">Import Pinterest Board → Score → Daily Inspiration</span>
          </div>

          <div className="flex gap-3">
            {boards.length === 0 ? (
              <button
                onClick={loadBoards}
                disabled={boardsLoading}
                className="px-4 py-2.5 bg-bg-primary border border-border-primary text-text-secondary rounded-lg text-sm hover:bg-bg-tertiary disabled:opacity-40 transition-colors flex items-center gap-2"
              >
                {boardsLoading ? (
                  <>
                    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Loading boards...
                  </>
                ) : (
                  "Load My Pinterest Boards"
                )}
              </button>
            ) : (
              <>
                <select
                  value={selectedBoardId}
                  onChange={(e) => setSelectedBoardId(e.target.value)}
                  disabled={boardImporting}
                  className="flex-1 px-4 py-2.5 bg-bg-primary border border-border-primary rounded-lg text-sm text-text-primary outline-none focus:border-accent transition-colors disabled:opacity-50"
                >
                  {boards.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.pin_count} pins)
                    </option>
                  ))}
                </select>
                <button
                  onClick={importBoard}
                  disabled={boardImporting || !selectedBoardId}
                  className="px-5 py-2.5 bg-rose-500 text-white rounded-lg text-sm font-medium hover:bg-rose-600 disabled:opacity-40 transition-colors flex items-center gap-2 shrink-0"
                >
                  {boardImporting ? (
                    <>
                      <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Importing (~30s)
                    </>
                  ) : (
                    "Import & Score"
                  )}
                </button>
                <button
                  onClick={loadBoards}
                  disabled={boardsLoading || boardImporting}
                  className="px-3 py-2.5 bg-bg-primary border border-border-primary text-text-secondary rounded-lg text-sm hover:bg-bg-tertiary disabled:opacity-40 transition-colors"
                  title="Refresh boards"
                >
                  ↺
                </button>
              </>
            )}
          </div>

          <AnimatePresence>
            {boardResult && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`mt-3 text-sm ${boardResult.startsWith("✓") ? "text-emerald-500" : "text-red-500"}`}
              >
                {boardResult}
              </motion.p>
            )}
          </AnimatePresence>

          <p className="mt-3 text-xs text-text-muted">
            Scores up to 5 pins per import · Auto-approves ≥ 75 · Save pins to a board on Pinterest first
          </p>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Images", value: stats.total, color: "text-text-primary" },
            { label: "Score 75+", value: stats.high, color: "text-emerald-500" },
            { label: "Approved", value: stats.approved, color: "text-blue-500" },
            { label: "Pending", value: stats.pending, color: "text-amber-500" },
          ].map((s) => (
            <div key={s.label} className="bg-bg-secondary p-4 rounded-lg border border-border-primary">
              <div className={`text-3xl font-medium ${s.color}`}>{s.value}</div>
              <div className="text-sm text-text-tertiary mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Filters ── */}
        <div className="flex gap-3 mb-6">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="px-3 py-2 bg-bg-secondary border border-border-primary rounded-lg text-sm text-text-primary"
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
            className="px-3 py-2 bg-bg-secondary border border-border-primary rounded-lg text-sm text-text-primary"
          >
            <option value={0}>All Scores</option>
            <option value={75}>75+ only</option>
            <option value={85}>85+ only</option>
          </select>
        </div>

        {/* ── Image Grid ── */}
        {loading ? (
          <div className="text-center py-16 text-text-tertiary text-sm">Loading...</div>
        ) : images.length === 0 ? (
          <div className="text-center py-16 text-text-tertiary text-sm">
            No images yet — try &quot;Search &amp; Score&quot; above to pull from Pinterest
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image) => (
              <motion.div
                key={image.id}
                layout
                className="group relative aspect-[3/4] bg-bg-tertiary rounded-lg overflow-hidden"
              >
                <img
                  src={image.thumbnailUrl || image.imageUrl}
                  alt={image.title || "Untitled"}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {/* Score */}
                  <div className="absolute top-2 right-2">
                    <span className={`text-lg font-bold ${scoreColor(image.scoreOverall)}`}>
                      {image.scoreOverall}
                    </span>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    {/* Score breakdown */}
                    <div className="grid grid-cols-2 gap-1 text-[10px] text-white/80 mb-2">
                      <div>Comp: {image.scoreComposition}</div>
                      <div>Color: {image.scoreColor}</div>
                      <div>Mood: {image.scoreMood}</div>
                      <div>Unique: {image.scoreUniqueness}</div>
                    </div>

                    {/* Tags */}
                    {image.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {image.tags.slice(0, 4).map((tag) => (
                          <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-white/20 rounded text-white">
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
                          className={`text-[9px] px-2 py-1 rounded capitalize transition-colors ${
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

                {/* Source badge */}
                <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span
                    className={`text-[9px] px-2 py-1 rounded-full text-white ${
                      SOURCE_COLORS[image.source] ?? "bg-neutral-500/80"
                    }`}
                  >
                    {image.source}
                  </span>
                </div>

                {/* Display count */}
                <div className="absolute bottom-2 right-2">
                  <span className="text-[9px] px-2 py-1 bg-black/50 text-white rounded">
                    {image.displayCount}×
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
