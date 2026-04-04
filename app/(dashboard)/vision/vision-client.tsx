"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { TagResult, TagTiers } from "@/lib/ai/tagger";
import { buildEmbeddingText } from "@/lib/ai/embeddings";
import {
  PinterestImportDialog,
  type ImportedPinterestRef,
} from "@/components/pinterest-import-dialog";
import { ExportMenu } from "@/components/vision/export-menu";

type CurationStatus = "flag" | "reject" | null;

type Reference = {
  id: string;
  imageUrl: string;
  board: string;
  tags: {
    style: string[];
    colors: string[];
    contentType: string[];
    mood: string[];
    ai: string[];       // flat union of all tiers for search
    era?: string;
    composition?: string;
    typography?: string;
    tiers?: TagTiers;
  };
  createdAt: Date;
  notes?: string;
  source?: "arena" | "local" | "pinterest" | "lummi";
  curationStatus?: CurationStatus;
  isTagging?: boolean;
};

type LummiResult = {
  id: string;
  imageUrl: string;
  thumbnailUrl: string;
  title: string;
  source: "lummi";
  sourceUrl: string;
  tags: string[];
  colors: string[];
  width?: number;
  height?: number;
};

const BOARDS = [
  "All",
  "Brand",
  "Typography",
  "Color",
  "Layout",
  "Photography",
  "Motion",
] as const;

const INITIAL_REFERENCES: Reference[] = [
  {
    id: "ref-1",
    imageUrl: "https://picsum.photos/seed/studio-brand-1/800/1200",
    board: "Brand",
    tags: {
      style: ["minimal", "grid", "editorial"],
      colors: ["#0b1120", "#e5e7eb", "#3b82f6", "#f97316", "#f1f5f9"],
      contentType: ["layout", "brand"],
      mood: ["calm", "structured"],
      ai: [],
    },
    createdAt: new Date(),
    notes: "Dark brand system with strong typographic hierarchy.",
  },
  {
    id: "ref-2",
    imageUrl: "https://picsum.photos/seed/studio-type-1/900/700",
    board: "Typography",
    tags: {
      style: ["serif", "editorial"],
      colors: ["#020617", "#e4e4e7", "#94a3b8", "#3b82f6", "#0ea5e9"],
      contentType: ["typography"],
      mood: ["sharp", "quiet"],
      ai: [],
    },
    createdAt: new Date(),
    notes: "High-contrast serif pairing for hero headlines.",
  },
  {
    id: "ref-3",
    imageUrl: "https://picsum.photos/seed/studio-color-1/1200/900",
    board: "Color",
    tags: {
      style: ["poster", "bold"],
      colors: ["#020617", "#3b82f6", "#22c55e", "#eab308", "#f97316"],
      contentType: ["color"],
      mood: ["vibrant", "confident"],
      ai: [],
    },
    createdAt: new Date(),
    notes: "Primary palette exploration for product marketing.",
  },
  {
    id: "ref-4",
    imageUrl: "https://picsum.photos/seed/studio-layout-1/1000/1400",
    board: "Layout",
    tags: {
      style: ["grid", "system"],
      colors: ["#f9fafb", "#d4d4d8", "#0f172a", "#9ca3af", "#64748b"],
      contentType: ["layout"],
      mood: ["precise", "architectural"],
      ai: [],
    },
    createdAt: new Date(),
    notes: "12-column layout with asymmetric hero block.",
  },
  {
    id: "ref-5",
    imageUrl: "https://picsum.photos/seed/studio-photo-1/1100/900",
    board: "Photography",
    tags: {
      style: ["studio", "product"],
      colors: ["#020617", "#ecfeff", "#fbbf24", "#f97316", "#0ea5e9"],
      contentType: ["photography"],
      mood: ["warm", "crisp"],
      ai: [],
    },
    createdAt: new Date(),
    notes: "High-key product shot with strong shadows.",
  },
  {
    id: "ref-6",
    imageUrl: "https://picsum.photos/seed/studio-motion-1/900/1200",
    board: "Motion",
    tags: {
      style: ["ui", "timeline"],
      colors: ["#020617", "#1e293b", "#38bdf8", "#a855f7", "#e11d48"],
      contentType: ["motion"],
      mood: ["dynamic", "playful"],
      ai: [],
    },
    createdAt: new Date(),
    notes: "Motion study for onboarding transitions.",
  },
  {
    id: "ref-7",
    imageUrl: "https://picsum.photos/seed/studio-brand-2/1200/800",
    board: "Brand",
    tags: {
      style: ["wordmark", "minimal"],
      colors: ["#020617", "#e5e7eb", "#f97316", "#22d3ee", "#a855f7"],
      contentType: ["brand"],
      mood: ["bold", "expressive"],
      ai: [],
    },
    createdAt: new Date(),
    notes: "Wordmark explorations for SaaS studio.",
  },
  {
    id: "ref-8",
    imageUrl: "https://picsum.photos/seed/studio-type-2/1000/800",
    board: "Typography",
    tags: {
      style: ["mono", "system"],
      colors: ["#020617", "#0f172a", "#e5e7eb", "#3b82f6", "#22c55e"],
      contentType: ["typography"],
      mood: ["technical", "precise"],
      ai: [],
    },
    createdAt: new Date(),
    notes: "Type scale for interface and code snippets.",
  },
  {
    id: "ref-9",
    imageUrl: "https://picsum.photos/seed/studio-color-2/900/1100",
    board: "Color",
    tags: {
      style: ["palette", "swatches"],
      colors: ["#020617", "#1e293b", "#f97316", "#22c55e", "#facc15"],
      contentType: ["color"],
      mood: ["warm", "balanced"],
      ai: [],
    },
    createdAt: new Date(),
    notes: "Muted warm palette for editorial surfaces.",
  },
  {
    id: "ref-10",
    imageUrl: "https://picsum.photos/seed/studio-layout-2/800/900",
    board: "Layout",
    tags: {
      style: ["grid", "cards"],
      colors: ["#f9fafb", "#e5e7eb", "#0f172a", "#3b82f6", "#22c55e"],
      contentType: ["layout"],
      mood: ["organized", "calm"],
      ai: [],
    },
    createdAt: new Date(),
    notes: "Dashboard card layout with asymmetric hero.",
  },
  {
    id: "ref-11",
    imageUrl: "https://picsum.photos/seed/studio-photo-2/1100/1000",
    board: "Photography",
    tags: {
      style: ["candid", "studio"],
      colors: ["#020617", "#0f172a", "#e2e8f0", "#f97316", "#22c55e"],
      contentType: ["photography"],
      mood: ["human", "focused"],
      ai: [],
    },
    createdAt: new Date(),
    notes: "Portrait for founder story hero.",
  },
  {
    id: "ref-12",
    imageUrl: "https://picsum.photos/seed/studio-motion-2/900/1000",
    board: "Motion",
    tags: {
      style: ["timeline", "curves"],
      colors: ["#020617", "#1f2937", "#3b82f6", "#22c55e", "#f97316"],
      contentType: ["motion"],
      mood: ["smooth", "precise"],
      ai: [],
    },
    createdAt: new Date(),
    notes: "Motion arcs for navigation transitions.",
  },
];

function getArchetype(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem("studio_os_onboarding");
    if (!raw) return undefined;
    return (JSON.parse(raw) as { archetype?: string }).archetype ?? undefined;
  } catch { return undefined; }
}

async function triggerAutoTag(
  referenceId: string,
  imageUrl: string,
  title: string | undefined,
  board: string,
  onComplete: (id: string, result: TagResult) => void
) {
  try {
    const res = await fetch("/api/ai/tag", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referenceId, imageUrl, archetype: getArchetype() }),
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data.skipped) return;

    const result = data as TagResult;
    onComplete(referenceId, result);

    // Generate and store embedding immediately after tagging, fire-and-forget
    const embeddingText = buildEmbeddingText({
      title,
      board,
      tags: result.tags,
      mood: result.mood,
      style: result.style,
      contentType: result.contentType,
      era: result.era,
      composition: result.composition,
      typography: result.typography,
    });
    fetch("/api/ai/embed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referenceId, text: embeddingText }),
    }).catch(() => {});
  } catch {
    // Non-fatal — silently skip
  }
}

// ─── Tag overlay shown on reference card hover ────────────────────────────────

type TagOverlayProps = {
  referenceId: string;
  tags: {
    ai: string[];
    style: string[];
    contentType: string[];
    mood: string[];
    tiers?: TagTiers;
  };
};

function TagOverlay({ referenceId, tags }: TagOverlayProps) {
  const [showMore, setShowMore] = React.useState(false);

  // Prefer tiered confirmed tags; fall back to legacy flat ai[] slice
  const confirmed: string[] = tags.tiers?.confirmed?.length
    ? tags.tiers.confirmed
    : tags.ai.slice(0, 5);

  const suggested: string[] = tags.tiers?.suggested?.length
    ? tags.tiers.suggested
    : [...tags.style, ...tags.contentType, ...tags.mood].slice(0, 3);

  const possible: string[] = tags.tiers?.possible ?? [];

  // Max 5 visible on card; show confirmed first, then suggested
  const MAX_VISIBLE = 5;
  const primaryVisible = [...confirmed, ...suggested].slice(0, MAX_VISIBLE);
  const primaryOverflow = Math.max(
    0,
    confirmed.length + suggested.length - MAX_VISIBLE
  );

  if (primaryVisible.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {primaryVisible.map((tag, i) => {
        const isConfirmed = i < confirmed.length;
        return (
          <span
            key={`${referenceId}-tag-${tag}`}
            className={cn(
              "border bg-[#F5F5F0] px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em]",
              isConfirmed ? "border-[#E5E5E0] text-[#6B6B6B]" : "border-[#E5E5E0] text-[#A0A0A0]"
            )}
          >
            {tag}
          </span>
        );
      })}

      {/* Possible tags — hidden until toggled */}
      {showMore &&
        possible.map((tag) => (
          <span
            key={`${referenceId}-possible-${tag}`}
            className="border border-[#222] bg-[#F5F5F0] px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em] text-[#A0A0A0]"
          >
            {tag}
          </span>
        ))}

      {/* Overflow count / show more toggle */}
      {(primaryOverflow > 0 || possible.length > 0) && !showMore && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowMore(true);
          }}
          className="pointer-events-auto px-1 text-[10px] text-[#A0A0A0] transition-colors hover:text-[#6B6B6B]"
        >
          +{primaryOverflow + possible.length} more
        </button>
      )}
      {showMore && possible.length > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowMore(false);
          }}
          className="pointer-events-auto px-1 text-[10px] text-[#A0A0A0] transition-colors hover:text-[#6B6B6B]"
        >
          less
        </button>
      )}
    </div>
  );
}

export function VisionPage() {
  const [query, setQuery] = React.useState("");
  const [activeBoard, setActiveBoard] =
    React.useState<(typeof BOARDS)[number]>("All");
  const [references, setReferences] =
    React.useState<Reference[]>(INITIAL_REFERENCES);
  // Toast notification
  const [toast, setToast] = React.useState<{
    message: string;
    type: "success" | "error" | "loading";
  } | null>(null);
  const toastTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isDragActive, setIsDragActive] = React.useState(false);
  const [hoveredRefId, setHoveredRefId] = React.useState<string | null>(null);
  const [curationHistory, setCurationHistory] = React.useState<
    { id: string; prev: CurationStatus }[]
  >([]);
  const [arenaOpen, setArenaOpen] = React.useState(false);
  const [arenaChannels, setArenaChannels] = React.useState<
    { id: number; title: string; slug: string; length: number; thumb: string | null }[]
  >([]);
  const [arenaLoading, setArenaLoading] = React.useState(false);
  const [arenaError, setArenaError] = React.useState<string | null>(null);
  const [arenaImporting, setArenaImporting] = React.useState<string | null>(null);
  const [pinterestOpen, setPinterestOpen] = React.useState(false);
  const [activeTags, setActiveTags] = React.useState<string[]>([]);
  // Lummi / Stock tab
  const [isStockActive, setIsStockActive] = React.useState(false);
  const [lummiConfigured, setLummiConfigured] = React.useState<boolean | null>(null);
  const [lummiQuery, setLummiQuery] = React.useState("");
  const [lummiResults, setLummiResults] = React.useState<LummiResult[]>([]);
  const [lummiLoading, setLummiLoading] = React.useState(false);
  const [lummiError, setLummiError] = React.useState<string | null>(null);
  const [lummiPage, setLummiPage] = React.useState(0);
  const [lummiHasMore, setLummiHasMore] = React.useState(false);
  const [lummiSavedIds, setLummiSavedIds] = React.useState<Set<string>>(new Set());
  const referencesRef = React.useRef(references);
  referencesRef.current = references;

  // Apply AI tags to a reference in state
  const applyAiTags = React.useCallback((id: string, result: TagResult) => {
    setReferences((prev) =>
      prev.map((ref) =>
        ref.id === id
          ? {
              ...ref,
              isTagging: false,
              tags: {
                ...ref.tags,
                style: result.style ? [result.style] : ref.tags.style,
                colors: result.colors.length ? result.colors : ref.tags.colors,
                contentType: result.contentType
                  ? [result.contentType]
                  : ref.tags.contentType,
                mood: result.mood ? [result.mood] : ref.tags.mood,
                ai: result.tags,
                era: result.era || ref.tags.era,
                composition: result.composition || ref.tags.composition,
                typography: result.typography || ref.tags.typography,
                tiers: result.tagTiers,
              },
            }
          : ref
      )
    );
  }, []);

  // Check if Lummi is configured (runs once on mount)
  React.useEffect(() => {
    fetch("/api/lummi?check=true")
      .then((r) => r.json())
      .then((d) => setLummiConfigured(Boolean(d.configured)))
      .catch(() => setLummiConfigured(false));
  }, []);

  // Load default Lummi images when Stock tab is first opened (no query)
  React.useEffect(() => {
    if (isStockActive && lummiResults.length === 0 && !lummiLoading) {
      fetchLummi("", 0, false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStockActive]);

  async function fetchLummi(q: string, page: number, append: boolean) {
    setLummiLoading(true);
    setLummiError(null);
    const limit = 12;
    const offset = page * limit;
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      });
      if (q.trim()) params.set("query", q.trim());
      const res = await fetch(`/api/lummi?${params}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Failed (${res.status})`);
      }
      const data = await res.json();
      const imgs: LummiResult[] = data.images ?? [];
      setLummiResults((prev) => (append ? [...prev, ...imgs] : imgs));
      setLummiPage(page);
      setLummiHasMore(imgs.length === limit);
    } catch (e) {
      setLummiError(e instanceof Error ? e.message : "Failed to load stock images");
    } finally {
      setLummiLoading(false);
    }
  }

  function saveLummiImage(img: LummiResult) {
    if (lummiSavedIds.has(img.id)) return;
    const targetBoard = activeBoard === "All" ? "Brand" : (activeBoard as (typeof BOARDS)[number]);
    const ref: Reference = {
      id: `lummi-${img.id}`,
      imageUrl: img.imageUrl,
      board: targetBoard,
      tags: {
        style: [],
        colors: img.colors,
        contentType: [],
        mood: [],
        ai: [],
      },
      createdAt: new Date(),
      notes: img.title,
      source: "lummi",
      isTagging: true,
    };
    setReferences((prev) => [ref, ...prev]);
    setLummiSavedIds((prev) => new Set([...prev, img.id]));
    triggerAutoTag(ref.id, ref.imageUrl, ref.notes, ref.board, applyAiTags);
  }

  const loadArenaChannels = React.useCallback(async () => {
    setArenaLoading(true);
    setArenaError(null);
    try {
      const res = await fetch("/api/arena");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Failed to load channels (${res.status})`);
      }
      const data = await res.json();
      setArenaChannels(data.channels ?? []);
    } catch (e) {
      setArenaError(e instanceof Error ? e.message : "Failed to load Are.na channels");
    } finally {
      setArenaLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (arenaOpen && arenaChannels.length === 0 && !arenaLoading) {
      loadArenaChannels();
    }
  }, [arenaOpen, arenaChannels.length, arenaLoading, loadArenaChannels]);

  // Load references from Supabase; fall back to hardcoded seed data if empty
  React.useEffect(() => {
    async function loadFromSupabase() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("references")
          .select("*")
          .order("created_at", { ascending: false });

        if (error || !data || data.length === 0) return;

        const mapped: Reference[] = data.map((row) => ({
          id: row.id,
          imageUrl: row.image_url,
          board: (row.board_id ?? "All") as (typeof BOARDS)[number],
          tags: {
            style: row.style ? [row.style] : [],
            colors: row.colors ?? [],
            contentType: row.content_type ? [row.content_type] : [],
            mood: row.mood ? [row.mood] : [],
            ai: row.tags ?? [],
            era: row.era ?? undefined,
            composition: row.composition ?? undefined,
            typography: row.typography ?? undefined,
            tiers: row.tag_tiers ?? undefined,
          },
          createdAt: new Date(row.created_at),
          notes: row.title ?? undefined,
          source: row.source as Reference["source"],
          curationStatus: (row.curation_status as CurationStatus) ?? null,
        }));

        setReferences(mapped);
      } catch {
        // Supabase not configured — keep using hardcoded seed data
      }
    }
    loadFromSupabase();
  }, []);

  async function importArenaChannel(slug: string) {
    setArenaImporting(slug);
    setArenaError(null);
    try {
      const res = await fetch(`/api/arena/${encodeURIComponent(slug)}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Failed to load channel (${res.status})`);
      }
      const data = await res.json();
      const blocks = data.blocks ?? [];
      const board = activeBoard === "All" ? "Brand" : activeBoard;
      const now = new Date();
      const next: Reference[] = blocks.map(
        (b: { id: string; imageUrl: string; title: string; tags?: string[] }) => ({
          id: b.id,
          imageUrl: b.imageUrl,
          board,
          tags: {
            style: [],
            colors: [],
            contentType: [],
            mood: [],
            ai: [],
          },
          createdAt: now,
          notes: b.title,
          source: "arena" as const,
          isTagging: true,
        })
      );
      setReferences((prev) => [...next, ...prev]);
      setArenaOpen(false);

      // Auto-tag all imported blocks, then embed
      for (const ref of next) {
        triggerAutoTag(ref.id, ref.imageUrl, ref.notes, ref.board, applyAiTags);
      }
    } catch (e) {
      setArenaError(e instanceof Error ? e.message : "Failed to import channel");
    } finally {
      setArenaImporting(null);
    }
  }

  React.useEffect(() => {
    return () => {
      referencesRef.current.forEach((ref) => {
        if (ref.imageUrl.startsWith("blob:")) {
          URL.revokeObjectURL(ref.imageUrl);
        }
      });
    };
  }, []);

  const allAiTags = React.useMemo(() => {
    const tagSet = new Set<string>();
    references.forEach((ref) => {
      ref.tags.ai.forEach((t) => tagSet.add(t));
      ref.tags.style.forEach((t) => tagSet.add(t));
      ref.tags.mood.forEach((t) => tagSet.add(t));
      ref.tags.contentType.forEach((t) => tagSet.add(t));
      if (ref.tags.era) tagSet.add(ref.tags.era);
      if (ref.tags.composition) tagSet.add(ref.tags.composition);
      if (ref.tags.typography) tagSet.add(ref.tags.typography);
    });
    return Array.from(tagSet).sort();
  }, [references]);

  const filtered = React.useMemo(() => {
    return references.filter((ref) => {
      if (activeBoard !== "All" && ref.board !== activeBoard) return false;

      // AND filter for active tag pills
      if (activeTags.length > 0) {
        const refAllTags = [
          ...ref.tags.ai,
          ...ref.tags.style,
          ...ref.tags.mood,
          ...ref.tags.contentType,
        ].map((t) => t.toLowerCase());
        const passes = activeTags.every((t) =>
          refAllTags.includes(t.toLowerCase())
        );
        if (!passes) return false;
      }

      if (!query.trim()) return true;
      const q = query.toLowerCase();
      // Search all tag tiers + metadata fields so any designer term finds a match
      const haystack = [
        ref.notes,
        ...ref.tags.style,
        ...ref.tags.colors,
        ...ref.tags.contentType,
        ...ref.tags.mood,
        ...ref.tags.ai,
        ref.tags.era,
        ref.tags.composition,
        ref.tags.typography,
        // Also include possible/suggested tiers explicitly (already in ai[], belt-and-suspenders)
        ...(ref.tags.tiers?.confirmed ?? []),
        ...(ref.tags.tiers?.suggested ?? []),
        ...(ref.tags.tiers?.possible ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      // Fuzzy: "brutalist" matches "brutalism" etc. via simple includes
      return haystack.includes(q);
    });
  }, [references, activeBoard, query, activeTags]);

  function handlePinterestImport(imported: ImportedPinterestRef[]) {
    const now = new Date();
    const next: Reference[] = imported.map((ref) => ({
      id: ref.id,
      imageUrl: ref.imageUrl,
      board: ref.board as (typeof BOARDS)[number],
      tags: { style: [], colors: [], contentType: [], mood: [], ai: [] },
      createdAt: now,
      notes: ref.title,
      source: "pinterest" as const,
      isTagging: true,
    }));
    setReferences((prev) => [...next, ...prev]);

    // Auto-tag + embed all imported pins
    for (const ref of next) {
      triggerAutoTag(ref.id, ref.imageUrl, ref.notes, ref.board, applyAiTags);
    }
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!isDragActive) setIsDragActive(true);
  }

  function handleDragLeave(event: React.DragEvent<HTMLDivElement>) {
    if (event.currentTarget === event.target) {
      setIsDragActive(false);
    }
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragActive(false);

    const files = Array.from(event.dataTransfer.files).filter((file) =>
      ["image/png", "image/jpeg", "image/webp"].includes(file.type)
    );

    if (!files.length) return;

    const now = new Date();
    const next: Reference[] = files.map((file, index) => ({
      id: `local-${now.getTime()}-${index}`,
      imageUrl: URL.createObjectURL(file),
      board: activeBoard === "All" ? "Brand" : activeBoard,
      tags: {
        style: [],
        colors: [],
        contentType: [],
        mood: [],
        ai: [],
      },
      createdAt: now,
      notes: file.name,
      isTagging: false, // blob: URLs can't be tagged server-side
    }));

    setReferences((prev) => [...next, ...prev]);
  }

  function setCurationStatus(id: string, status: CurationStatus) {
    setReferences((prev) =>
      prev.map((ref) =>
        ref.id === id ? { ...ref, curationStatus: status } : ref
      )
    );
  }

  function handleCurationKey(key: string) {
    const targetId = hoveredRefId;
    if (!targetId) return;
    if (key === "p") {
      const current = references.find((r) => r.id === targetId);
      if (!current) return;
      setCurationHistory((h) => [
        { id: targetId, prev: current.curationStatus ?? null },
        ...h.slice(0, 19),
      ]);
      setCurationStatus(
        targetId,
        current.curationStatus === "flag" ? null : "flag"
      );
    } else if (key === "x") {
      const current = references.find((r) => r.id === targetId);
      if (!current) return;
      setCurationHistory((h) => [
        { id: targetId, prev: current.curationStatus ?? null },
        ...h.slice(0, 19),
      ]);
      setCurationStatus(
        targetId,
        current.curationStatus === "reject" ? null : "reject"
      );
    } else if (key === "u") {
      const last = curationHistory[0];
      if (!last) return;
      setCurationStatus(last.id, last.prev);
      setCurationHistory((h) => h.slice(1));
    }
  }

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement ||
        (e.target as HTMLElement)?.isContentEditable
      )
        return;
      const key = e.key.toLowerCase();
      if (key === "p" || key === "x" || key === "u") {
        e.preventDefault();
        handleCurationKey(key);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoveredRefId, references, curationHistory]);

  function toggleTag(tag: string) {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function showToast(
    message: string,
    type: "success" | "error" | "loading" = "success"
  ) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    if (type !== "loading") {
      toastTimerRef.current = setTimeout(() => setToast(null), 3200);
    }
  }

  return (
    <section className="relative">
      {/* Board dot-grid background */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.04) 0.6px, transparent 0.6px)",
          backgroundSize: "20px 20px",
        }}
      />

      <div className="relative z-10 mx-auto max-w-[960px] animate-in fade-in slide-in-from-bottom-2 pt-16 pb-16 duration-300 ease-out space-y-6">
        {/* V2 Header */}
        <div className="mb-2">
          <span className="mono-kicker mb-3 block">Studio OS</span>
          <h1 className="font-serif text-[28px] font-normal tracking-[-0.02em] text-[#1A1A1A] leading-[1.1]">
            Vision Board
          </h1>
          <p className="mt-2 max-w-[520px] text-[14px] text-[#6B6B6B] leading-relaxed">
            Your evolving visual field — references, palettes, layouts
            and artifacts that define the studio&apos;s current gravity.
          </p>
        </div>

        <div className="space-y-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search references... try 'blue minimal serif'"
            className="w-full border border-[#E5E5E0] rounded-[2px] bg-white px-3 py-2.5 text-[13px] text-[#1A1A1A] placeholder:text-[#A0A0A0] outline-none transition-colors focus:border-[#D1E4FC] focus:ring-2 focus:ring-[#D1E4FC]/40"
          />

          {/* Board tabs + source imports */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
              {BOARDS.map((board) => {
                const active = !isStockActive && activeBoard === board;
                return (
                  <button
                    key={board}
                    type="button"
                    onClick={() => {
                      setActiveBoard(board);
                      setIsStockActive(false);
                    }}
                    className={cn(
                      "rounded-[4px] px-2.5 py-1.5 text-[12px] font-medium transition-colors duration-150",
                      active
                        ? "bg-[#4B57DB] text-white"
                        : "bg-[#F5F5F0] text-[#6B6B6B] hover:bg-[#E5E5E0] hover:text-[#1A1A1A]"
                    )}
                  >
                    {board}
                  </button>
                );
              })}

              {/* Stock tab */}
              {lummiConfigured && (
                <button
                  type="button"
                  onClick={() => setIsStockActive(true)}
                  className={cn(
                    "flex items-center gap-1 rounded-[4px] px-2.5 py-1.5 text-[12px] font-medium transition-colors duration-150",
                    isStockActive
                      ? "bg-[#4B57DB] text-white"
                      : "bg-[#F5F5F0] text-[#6B6B6B] hover:bg-[#E5E5E0] hover:text-[#1A1A1A]"
                  )}
                >
                  Stock
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setArenaOpen(true)}
              className="rounded-[4px] border border-[#E5E5E0] px-3 py-2 text-[12px] text-[#6B6B6B] transition-colors hover:border-[#D1E4FC] hover:text-[#4B57DB]"
            >
              Are.na
            </button>
            <button
              type="button"
              onClick={() => setPinterestOpen(true)}
              className="flex items-center gap-1.5 rounded-[4px] border border-[#E5E5E0] px-3 py-2 text-[12px] text-[#6B6B6B] transition-colors hover:border-[#E60023]/40 hover:text-[#E60023]"
            >
              <svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0" fill="currentColor">
                <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
              </svg>
              Pinterest
            </button>

            {/* Export button — far right of toolbar */}
            <div className="ml-auto shrink-0">
              <ExportMenu
                references={filtered}
                projectName="Studio Moodboard"
                onToast={showToast}
              />
            </div>
          </div>

          {/* AI tag pill filter row */}
          {allAiTags.length > 0 && (
            <div className="relative">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {activeTags.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTags([])}
                    className="shrink-0 border border-[#E5E5E0] bg-[#F5F5F0] px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-[#A0A0A0] transition-colors hover:border-[#D1E4FC] hover:text-white"
                  >
                    Clear
                  </button>
                )}
                {allAiTags.map((tag) => {
                  const isActive = activeTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={cn(
                        "shrink-0 border px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] transition-colors duration-150 whitespace-nowrap",
                        isActive
                          ? "border-white bg-white text-black"
                          : "border-[#E5E5E0] bg-[#F5F5F0] text-[#A0A0A0] hover:border-[#D1E4FC] hover:text-white"
                      )}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Keyboard curation hint */}
          <div className="flex items-center gap-4 text-[10px] text-[#A0A0A0]">
            <span className="flex items-center gap-1.5">
              <kbd className="border border-[#E5E5E0] bg-[#F5F5F0] px-1.5 py-0.5 font-mono text-[9px] text-[#A0A0A0]">P</kbd>
              Flag
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="border border-[#E5E5E0] bg-[#F5F5F0] px-1.5 py-0.5 font-mono text-[9px] text-[#A0A0A0]">X</kbd>
              Reject
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="border border-[#E5E5E0] bg-[#F5F5F0] px-1.5 py-0.5 font-mono text-[9px] text-[#A0A0A0]">U</kbd>
              Undo
            </span>
            <span className="text-[#A0A0A0]">— hover a card first</span>
          </div>
        </div>

        <Dialog open={arenaOpen} onOpenChange={setArenaOpen}>
          <DialogContent className="max-h-[80vh] overflow-hidden flex flex-col">
            <DialogTitle className="text-white">
              Import from Are.na
            </DialogTitle>
            <p className="text-sm text-gray-500">
              Choose a channel to import all image blocks into this board.
            </p>
            {arenaError && (
              <p className="border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {arenaError}
              </p>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto">
              {arenaLoading ? (
                <p className="py-8 text-center text-sm text-gray-500">
                  Loading your channels…
                </p>
              ) : arenaChannels.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500">
                  No channels found. Add ARENA_ACCESS_TOKEN to .env.local and try again.
                </p>
              ) : (
                <ul className="space-y-2">
                  {arenaChannels.map((ch) => (
                    <li key={ch.id}>
                      <button
                        type="button"
                        onClick={() => importArenaChannel(ch.slug)}
                        disabled={arenaImporting !== null}
                        className={cn(
                          "flex w-full items-center gap-3 border border-[#1a1a1a] bg-white p-3 text-left transition-[border-color] duration-200 ease-out hover:border-[#252525]",
                          arenaImporting === ch.slug && "opacity-60"
                        )}
                      >
                        {ch.thumb ? (
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden border border-[#E5E5E0] bg-white">
                            <Image
                              src={ch.thumb}
                              alt=""
                              width={48}
                              height={48}
                              className="h-full w-full object-cover"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-[#E5E5E0] bg-white text-[10px] uppercase text-[#A0A0A0]">
                            —
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-white">
                            {ch.title}
                          </div>
                          <div className="text-[11px] text-gray-500">
                            {ch.length} block{ch.length !== 1 ? "s" : ""}
                          </div>
                        </div>
                        {arenaImporting === ch.slug ? (
                          <span className="text-[11px] text-gray-500">Importing…</span>
                        ) : (
                          <span className="text-[11px] text-[#4B57DB]">Import</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <PinterestImportDialog
          open={pinterestOpen}
          onOpenChange={setPinterestOpen}
          activeBoard={activeBoard === "All" ? "Brand" : activeBoard}
          onImport={handlePinterestImport}
        />

        {/* ── Stock / Lummi browser ── */}
        {isStockActive ? (
          <div className="space-y-4">
            {/* Search bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                fetchLummi(lummiQuery, 0, false);
              }}
              className="flex gap-2"
            >
              <Input
                value={lummiQuery}
                onChange={(e) => setLummiQuery(e.target.value)}
                placeholder="Search AI stock images..."
                className="h-10 flex-1 text-sm"
              />
              <button
                type="submit"
                disabled={lummiLoading}
                className="border border-[#E5E5E0] bg-white px-4 py-2 text-[11px] font-medium uppercase tracking-[0.15em] text-[#A0A0A0] transition-colors hover:border-[#D1E4FC] hover:text-white disabled:opacity-50"
              >
                {lummiLoading ? "…" : "Search"}
              </button>
            </form>

            {/* Attribution note */}
            <p className="text-[10px] text-gray-600">
              AI-generated images by{" "}
              <a
                href="https://www.lummi.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 underline underline-offset-2 hover:text-white"
              >
                Lummi.ai
              </a>{" "}
              — free, royalty-free, no attribution required
            </p>

            {/* Error state */}
            {lummiError && (
              <p className="border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {lummiError}
              </p>
            )}

            {/* Results grid */}
            {lummiResults.length > 0 || lummiLoading ? (
              <>
                <div className="columns-2 gap-2 md:columns-4">
                  {lummiResults.map((img) => {
                    const saved = lummiSavedIds.has(img.id);
                    return (
                      <div
                        key={img.id}
                        className="group relative mb-2 break-inside-avoid overflow-hidden bg-white"
                      >
                        <Image
                          src={img.thumbnailUrl || img.imageUrl}
                          alt={img.title}
                          width={400}
                          height={500}
                          className="h-auto w-full object-cover"
                          unoptimized
                        />

                        {/* Save button — appears on hover */}
                        <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-200 group-hover:bg-black/40" />
                        <button
                          type="button"
                          onClick={() => saveLummiImage(img)}
                          disabled={saved}
                          title={saved ? "Saved" : "Add to board"}
                          className={cn(
                            "pointer-events-auto absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center border text-sm font-bold",
                            "opacity-0 transition-opacity duration-200 group-hover:opacity-100",
                            saved
                              ? "border-green-500/60 bg-green-950/90 text-green-400 cursor-default"
                              : "border-white/30 bg-black/80 text-white hover:border-white hover:bg-black"
                          )}
                        >
                          {saved ? "✓" : "+"}
                        </button>

                        {/* Lummi source badge */}
                        <span className="pointer-events-none absolute left-2 top-2 border border-white/10 bg-black/70 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.1em] text-gray-400 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                          Lummi ✦
                        </span>
                      </div>
                    );
                  })}

                  {/* Loading skeleton cards */}
                  {lummiLoading &&
                    Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={`skel-${i}`}
                        className="mb-2 break-inside-avoid bg-white"
                        style={{ height: `${140 + (i % 3) * 60}px` }}
                      >
                        <div className="h-full w-full animate-pulse bg-[#F5F5F0]" />
                      </div>
                    ))}
                </div>

                {/* Load more */}
                {lummiHasMore && !lummiLoading && (
                  <button
                    type="button"
                    onClick={() => fetchLummi(lummiQuery, lummiPage + 1, true)}
                    className="w-full border border-[#E5E5E0] bg-white py-2.5 text-[11px] font-medium uppercase tracking-[0.15em] text-[#A0A0A0] transition-colors hover:border-[#D1E4FC] hover:text-white"
                  >
                    Load more
                  </button>
                )}
              </>
            ) : !lummiLoading ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <span className="text-2xl text-gray-700">✦</span>
                <p className="text-sm text-gray-600">
                  Search for AI stock images, or leave blank for a curated selection.
                </p>
                  <button
                    type="button"
                    onClick={() => fetchLummi("", 0, false)}
                    className="border border-[#E5E5E0] bg-white px-4 py-2 text-[11px] font-medium uppercase tracking-[0.15em] text-[#A0A0A0] transition-colors hover:border-[#D1E4FC] hover:text-white"
                  >
                  Browse random images
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          /* ── Normal references masonry ── */
          <div
            className="relative"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <AnimatePresence>
              {isDragActive && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="absolute inset-0 z-20 flex items-center justify-center border-2 border-dashed border-[#4B57DB] bg-[#4B57DB]/10 text-xs font-medium uppercase tracking-[0.15em] text-[#4B57DB]"
                >
                  Drop images here
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── True empty state ── */}
            {references.length === 0 && (
              <div className="flex flex-col items-center gap-5 py-24 text-center">
                {/* Muted slat-logo SVG */}
                <svg width="48" height="32" viewBox="0 0 127 83" fill="none" className="opacity-20" aria-hidden>
                  <path d="M0 16C0 7.16 7.16 0 16 0h36l12 16h47c8.84 0 16 7.16 16 16v35c0 8.84-7.16 16-16 16H16C7.16 83 0 75.84 0 67V16z" fill="#A0A0A0"/>
                </svg>
                <p className="text-[14px] text-[#A0A0A0]">
                  Start collecting references
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setPinterestOpen(true)}
                    className="rounded-[4px] bg-[#4B57DB] px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-[#3D49C7]"
                  >
                    Upload Images
                  </button>
                  <button
                    type="button"
                    onClick={() => setArenaOpen(true)}
                    className="rounded-[4px] border border-[#E5E5E0] px-4 py-2.5 text-[13px] text-[#6B6B6B] transition-colors hover:border-[#D1E4FC] hover:text-[#4B57DB]"
                  >
                    Paste a URL
                  </button>
                </div>
              </div>
            )}

            {/* ── Filtered empty state ── */}
            {references.length > 0 && filtered.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-20 text-center">
                <p className="text-sm text-[#6B6B6B]">
                  No references
                  {activeBoard !== "All" ? ` in ${activeBoard}` : ""}
                  {activeTags.length > 0 ? " matching these tags" : ""}.
                </p>
                <div className="flex items-center gap-3">
                  {activeBoard !== "All" && (
                    <button
                      type="button"
                      onClick={() => setActiveBoard("All")}
                      className="text-xs text-[#4B57DB] transition-opacity hover:opacity-70"
                    >
                      Show all boards
                    </button>
                  )}
                  {activeTags.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTags([])}
                      className="text-xs text-[#4B57DB] transition-opacity hover:opacity-70"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="columns-2 gap-2 md:columns-3">
              <AnimatePresence>
                {filtered.map((ref) => (
                  <motion.article
                    key={ref.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="mb-2 break-inside-avoid overflow-hidden"
                    onMouseEnter={() => setHoveredRefId(ref.id)}
                    onMouseLeave={() => setHoveredRefId((prev) => prev === ref.id ? null : prev)}
                  >
                    <div
                      className={cn(
                        "group relative overflow-hidden rounded-[4px] border bg-white shadow-sm transition-all duration-150",
                        ref.curationStatus === "flag"
                          ? "border-amber-500/60"
                          : ref.curationStatus === "reject"
                          ? "border-red-700/50"
                          : hoveredRefId === ref.id
                          ? "border-[#4B57DB] shadow-md scale-[1.01]"
                          : "border-[#E5E5E0]"
                      )}
                    >
                      <div className="relative w-full">
                        <Image
                          src={ref.imageUrl}
                          alt={ref.notes ?? "Reference"}
                          width={800}
                          height={1000}
                          className={cn(
                            "h-auto w-full object-cover transition-opacity duration-200",
                            ref.curationStatus === "reject" && "opacity-30"
                          )}
                          unoptimized={ref.id.startsWith("local-") || ref.source === "arena"}
                        />

                        {/* Tagging indicator */}
                        {ref.isTagging && (
                          <div className="absolute right-2 top-2 z-10 flex items-center gap-1 border border-white/10 bg-black/80 px-1.5 py-0.5">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4B57DB] opacity-75" />
                              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#4B57DB]" />
                            </span>
                            <span className="text-[9px] font-medium uppercase tracking-[0.12em] text-gray-400">
                              tagging
                            </span>
                          </div>
                        )}

                        {/* Curation status badges */}
                        {ref.curationStatus === "flag" && (
                          <span className="absolute left-2 top-2 z-10 border border-amber-500/50 bg-amber-900/80 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.1em] text-amber-300">
                            Flagged
                          </span>
                        )}
                        {ref.curationStatus === "reject" && (
                          <span className="absolute left-2 top-2 z-10 border border-red-700/50 bg-red-950/80 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.1em] text-red-400">
                            Rejected
                          </span>
                        )}
                        {ref.source === "arena" && !ref.isTagging && (
                          <span className="absolute right-2 top-2 border border-white/20 bg-black/80 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.1em] text-white">
                            Are.na
                          </span>
                        )}
                        {ref.source === "pinterest" && !ref.isTagging && (
                          <span className="absolute right-2 top-2 flex items-center gap-1 border border-[#E60023]/40 bg-black/80 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.1em] text-[#E60023]">
                            <svg viewBox="0 0 24 24" className="h-2 w-2 shrink-0" fill="currentColor">
                              <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
                            </svg>
                            Pinterest
                          </span>
                        )}
                        {ref.source === "lummi" && !ref.isTagging && (
                          <span className="absolute right-2 top-2 border border-white/20 bg-black/80 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.1em] text-white">
                            Lummi ✦
                          </span>
                        )}

                        {/* Hover overlay */}
                        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between bg-black/0 opacity-0 transition-opacity duration-200 group-hover:bg-black/40 group-hover:opacity-100">
                          <div className="flex items-start justify-between gap-2 p-2">
                            <span className="inline-flex border border-white/20 bg-black/80 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.15em] text-white">
                              {ref.board}
                            </span>
                          </div>

                          <div className="space-y-1 p-2">
                            <TagOverlay referenceId={ref.id} tags={ref.tags} />

                            <div className="flex">
                              {ref.tags.colors.slice(0, 5).map((color) => (
                                <div
                                  key={`${ref.id}-${color}`}
                                  className="h-1.5 flex-1 border border-black/40"
                                  style={{ backgroundColor: color }}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.article>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      {/* ── Floating toolbar ── */}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-20 flex justify-center">
        <div className="pointer-events-auto flex h-10 items-center gap-1 rounded-[4px] border border-[#E5E5E0] bg-white px-2 shadow-sm max-w-[360px]">
          <label className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[2px] text-[#6B6B6B] transition-colors hover:bg-[#F5F5F0] hover:text-[#4B57DB]">
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (!files.length) return;
                const now = new Date();
                const next: Reference[] = files.map((file, i) => ({
                  id: `local-${now.getTime()}-${i}`,
                  imageUrl: URL.createObjectURL(file),
                  board: activeBoard === "All" ? "Brand" : activeBoard,
                  tags: { style: [], colors: [], contentType: [], mood: [], ai: [] },
                  createdAt: now,
                  notes: file.name,
                  isTagging: false,
                }));
                setReferences((prev) => [...next, ...prev]);
                e.target.value = "";
              }}
            />
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          </label>
          <button
            type="button"
            onClick={() => setArenaOpen(true)}
            title="Import from URL"
            className="flex h-8 w-8 items-center justify-center rounded-[2px] text-[#6B6B6B] transition-colors hover:bg-[#F5F5F0] hover:text-[#4B57DB]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          </button>
          <div className="mx-1 h-4 w-px bg-[#E5E5E0]" />
          <button
            type="button"
            onClick={() => setPinterestOpen(true)}
            title="Pinterest import"
            className="flex h-8 w-8 items-center justify-center rounded-[2px] text-[#6B6B6B] transition-colors hover:bg-[#F5F5F0] hover:text-[#4B57DB]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/></svg>
          </button>
          {lummiConfigured && (
            <button
              type="button"
              onClick={() => setIsStockActive(true)}
              title="Browse stock"
              className="flex h-8 w-8 items-center justify-center rounded-[2px] text-[#6B6B6B] transition-colors hover:bg-[#F5F5F0] hover:text-[#4B57DB]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Toast notification ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="pointer-events-none fixed bottom-8 left-1/2 z-[200] -translate-x-1/2"
          >
            <div
              className={cn(
                "flex items-center gap-2 rounded-[4px] border px-4 py-2.5 text-[13px] font-medium shadow-lg",
                toast.type === "error"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-[#E5E5E0] bg-white text-[#1A1A1A]"
              )}
            >
              {toast.type === "loading" && (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#E5E5E0] border-t-[#4B57DB]" />
              )}
              {toast.type === "success" && (
                <span className="text-[11px] text-emerald-600">✓</span>
              )}
              {toast.type === "error" && (
                <span className="text-[11px] text-red-500">✕</span>
              )}
              {toast.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
