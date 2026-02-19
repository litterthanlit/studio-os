"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { AiSparkIcon, PlusIcon } from "@/components/ui/icon";
import {
  getStoredProjects,
  useNewProjectModal,
  type StoredProject,
} from "@/components/new-project-modal";
import { PROJECTS as STATIC_PROJECTS } from "@/app/(dashboard)/projects/projects-data";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type RecentRef = {
  id: string;
  imageUrl: string;
  source?: string;
  board?: string;
};

type Suggestion = {
  project: StoredProject | null;
  label: string;
  action: string;
  href: string;
  isNew?: boolean;
};

type Capture = {
  id: string;
  text: string;
  createdAt: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const USER_NAME = "Nick";
const CAPTURES_KEY = "studio-os:captures";

const TAB_KEYWORDS: { keywords: string[]; tab: string; path: string }[] = [
  {
    keywords: ["color", "palette", "hue", "swatch", "brand color"],
    tab: "Color Palette",
    path: "?tab=palette",
  },
  {
    keywords: ["font", "type", "typeface", "typography", "serif", "sans"],
    tab: "Type",
    path: "?tab=type",
  },
  {
    keywords: ["moodboard", "reference", "image", "vision", "mood", "board", "inspire", "inspo"],
    tab: "Vision",
    path: "/vision",
  },
  {
    keywords: ["task", "todo", "kanban", "checklist"],
    tab: "Tasks",
    path: "?tab=tasks",
  },
  {
    keywords: ["focus", "flow", "deep work", "session", "concentrate"],
    tab: "Flow",
    path: "/flow",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTimeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function getDateString(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

function matchQuery(query: string, projects: StoredProject[]): Suggestion | null {
  const q = query.toLowerCase().trim();
  if (q.length < 2) return null;

  const nameMatch = projects.find(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      q.includes(p.name.toLowerCase().split(" ")[0])
  );

  if (nameMatch) {
    for (const { keywords, tab, path } of TAB_KEYWORDS) {
      if (keywords.some((kw) => q.includes(kw))) {
        const href = path.startsWith("/") ? path : `/projects/${nameMatch.id}${path}`;
        return { project: nameMatch, label: nameMatch.name, action: `→ ${tab}`, href };
      }
    }
    return { project: nameMatch, label: nameMatch.name, action: "→ Open", href: `/projects/${nameMatch.id}` };
  }

  const recentProject = projects[0];
  for (const { keywords, tab, path } of TAB_KEYWORDS) {
    if (keywords.some((kw) => q.includes(kw)) && recentProject) {
      const href = path.startsWith("/") ? path : `/projects/${recentProject.id}${path}`;
      return { project: recentProject, label: recentProject.name, action: `→ ${tab}`, href };
    }
  }

  return { project: null, label: `"${query}"`, action: "Create new project", href: "", isNew: true };
}

function toStoredProject(p: (typeof STATIC_PROJECTS)[0]): StoredProject {
  return {
    id: p.id,
    name: p.name,
    brief: p.client,
    color: p.palette[1] ?? "#0070F3",
    createdAt: new Date(Date.now() - p.daysActive * 24 * 60 * 60 * 1000).toISOString(),
  };
}

function saveCapture(text: string): void {
  if (typeof window === "undefined") return;
  try {
    const existing: Capture[] = JSON.parse(localStorage.getItem(CAPTURES_KEY) ?? "[]");
    localStorage.setItem(
      CAPTURES_KEY,
      JSON.stringify([{ id: Date.now().toString(), text, createdAt: new Date().toISOString() }, ...existing])
    );
  } catch { /* ignore */ }
}

function openCommandPalette() {
  window.dispatchEvent(new KeyboardEvent("keydown", { metaKey: true, key: "k", bubbles: true }));
}

// ─── Section label ────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] text-[#2a2a2a] leading-none">■</span>
      <span className="text-[10px] text-[#3a3a3a] uppercase tracking-[0.18em] font-medium">
        {children}
      </span>
    </div>
  );
}

// ─── Project card ─────────────────────────────────────────────────────────────

function ProjectCard({ project, onClick }: { project: StoredProject; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col justify-between shrink-0 w-[156px] h-[112px]",
        "bg-[#080808] border border-[#1a1a1a] rounded-lg p-4 text-left cursor-pointer",
        "hover:border-[#2a2a2a] hover:bg-[#0d0d0d] transition-colors duration-150 ease-out"
      )}
    >
      <div className="flex items-start gap-2">
        <span
          className="mt-[3px] w-[7px] h-[7px] rounded-full shrink-0"
          style={{ backgroundColor: project.color }}
        />
        <span className="text-sm font-medium text-[#ccc] leading-tight line-clamp-2">
          {project.name}
        </span>
      </div>
      <span className="text-[10px] text-[#2a2a2a] font-mono">{timeAgo(project.createdAt)}</span>
    </button>
  );
}

function NewProjectCard({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex flex-col items-center justify-center gap-2 shrink-0 w-[156px] h-[112px]",
        "bg-transparent border border-dashed border-[#1a1a1a] rounded-lg",
        "hover:border-[#2a2a2a] hover:bg-[#080808] transition-colors duration-150 ease-out cursor-pointer"
      )}
    >
      <PlusIcon className="w-3.5 h-3.5 text-[#2a2a2a]" />
      <span className="text-[10px] text-[#2a2a2a] uppercase tracking-wider">New</span>
    </button>
  );
}

// ─── Reference thumbnail ──────────────────────────────────────────────────────

function RefThumbnail({ item, onClick }: { item: RecentRef; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative w-[72px] h-[72px] shrink-0 rounded-md overflow-hidden",
        "bg-[#0d0d0d] border border-[#1a1a1a]",
        "hover:border-[#2a2a2a] hover:scale-[1.03] transition-all duration-150 ease-out"
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
    </button>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  React.useEffect(() => {
    const t = setTimeout(onDone, 2400);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#222] bg-[#111] text-xs text-[#777] whitespace-nowrap font-mono"
    >
      <span className="text-[9px] text-[#444]">■</span>
      {message}
    </motion.div>
  );
}

const QUICK_ACTIONS = [
  { label: "Search references", sub: "vision", href: "/vision" },
  { label: "Browse stock", sub: "lummi", href: "/vision?import=lummi" },
  { label: "Enter flow", sub: "focus", href: "/flow" },
  { label: "Connect Pinterest", sub: "import", href: "/vision?connect=pinterest" },
] as const;

// ─── Main ─────────────────────────────────────────────────────────────────────

export function HomeClient() {
  const router = useRouter();
  const { openModal: openNewProject } = useNewProjectModal();

  const [timeOfDay, setTimeOfDay] = React.useState(getTimeOfDay);
  const [dateStr, setDateStr] = React.useState(getDateString);
  const [query, setQuery] = React.useState("");
  const [suggestion, setSuggestion] = React.useState<Suggestion | null>(null);
  const [projects, setProjects] = React.useState<StoredProject[]>([]);
  const [recentRefs, setRecentRefs] = React.useState<RecentRef[]>([]);
  const [toast, setToast] = React.useState<string | null>(null);

  // ── Load projects ──────────────────────────────────────────────────────────
  React.useEffect(() => {
    function load() {
      const stored = getStoredProjects();
      setProjects(stored.length > 0 ? stored : STATIC_PROJECTS.map(toStoredProject));
    }
    load();
    window.addEventListener("storage", load);
    return () => window.removeEventListener("storage", load);
  }, []);

  // ── Fetch recent refs (silent) ─────────────────────────────────────────────
  React.useEffect(() => {
    async function fetchRefs() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("references")
          .select("id, image_url, source, board_id")
          .order("created_at", { ascending: false })
          .limit(8);
        if (data && data.length > 0) {
          setRecentRefs(data.map((r) => ({ id: r.id, imageUrl: r.image_url, source: r.source, board: r.board_id })));
        }
      } catch { /* Supabase not configured */ }
    }
    fetchRefs();
  }, []);

  // ── Update greeting every minute ───────────────────────────────────────────
  React.useEffect(() => {
    const iv = setInterval(() => { setTimeOfDay(getTimeOfDay()); setDateStr(getDateString()); }, 60_000);
    return () => clearInterval(iv);
  }, []);

  // ── Debounced AI match ─────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!query.trim()) { setSuggestion(null); return; }
    const t = setTimeout(() => setSuggestion(matchQuery(query, projects)), 500);
    return () => clearTimeout(t);
  }, [query, projects]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  function commit() {
    if (suggestion) {
      if (suggestion.isNew) { openNewProject(); }
      else { router.push(suggestion.href); }
      setQuery("");
      setSuggestion(null);
    } else if (query.trim()) {
      saveCapture(query.trim());
      setToast("Saved to Quick Captures");
      setQuery("");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") return;
    if (e.key === "Enter") { e.preventDefault(); commit(); return; }
    if (e.key === "Escape") { setSuggestion(null); setQuery(""); }
  }

  const visibleProjects = projects.slice(0, 5);
  const showQuickActions = projects.length < 3;

  return (
    <div
      className="flex flex-col items-center justify-start pt-[14vh] min-h-screen px-6 pb-16"
      style={{
        backgroundImage:
          "radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }}
    >
      <div className="w-full max-w-[580px]">

        {/* ── Studio OS label ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="text-[9px] text-[#222]">■</span>
          <span className="text-[9px] text-[#252525] uppercase tracking-[0.25em] font-mono">
            Studio OS
          </span>
        </div>

        {/* ── Greeting ────────────────────────────────────────────────────── */}
        <div className="text-center mb-9">
          <h1 className="text-[28px] font-semibold text-white tracking-tight leading-tight">
            Good {timeOfDay}, {USER_NAME}
          </h1>
          <p className="text-[13px] text-[#3a3a3a] mt-1.5 font-mono">{dateStr}</p>
        </div>

        {/* ── Chat input box ───────────────────────────────────────────────── */}
        <div className="w-full mx-auto mb-3">
          <div
            className={cn(
              "border border-[#1c1c1c] rounded-xl overflow-hidden",
              "bg-[#070707]",
              "transition-[border-color] duration-150",
              "focus-within:border-[#272727]"
            )}
          >
            {/* Input row */}
            <div className="px-4 pt-[14px] pb-3 flex items-center gap-3">
              <AiSparkIcon className="w-[15px] h-[15px] text-[#2a2a2a] shrink-0" bare />
              <input
                type="text"
                placeholder="What are you building today?"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
                className="flex-1 bg-transparent text-sm text-white placeholder:text-[#282828] outline-none"
              />
            </div>

            {/* Bottom toolbar */}
            <div className="flex items-center justify-between px-3 pt-1 pb-3 border-t border-[#111]">
              <div className="flex items-center gap-0.5">
                {/* + new project */}
                <button
                  type="button"
                  onClick={() => openNewProject()}
                  title="New project"
                  className="w-7 h-7 rounded-md flex items-center justify-center text-[#2a2a2a] hover:text-[#555] hover:bg-[#111] transition-colors duration-150"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                </button>
                {/* ⌘K */}
                <button
                  type="button"
                  onClick={openCommandPalette}
                  title="Search (⌘K)"
                  className="h-7 px-2 rounded-md flex items-center text-[#252525] hover:text-[#555] hover:bg-[#111] transition-colors duration-150"
                >
                  <span className="text-[10px] font-mono tracking-tight">⌘K</span>
                </button>
              </div>

              {/* Submit */}
              <button
                type="button"
                onClick={commit}
                disabled={!query.trim()}
                title="Submit (↵)"
                className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-medium",
                  "transition-[background-color,opacity] duration-150",
                  query.trim()
                    ? "bg-white text-black hover:bg-[#e0e0e0]"
                    : "bg-[#111] text-[#2a2a2a] cursor-not-allowed"
                )}
              >
                ↑
              </button>
            </div>
          </div>
        </div>

        {/* ── Suggestion chip ──────────────────────────────────────────────── */}
        <AnimatePresence>
          {suggestion && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 2 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="mb-4"
            >
              <div className="border border-[#1a1a1a] rounded-lg px-4 py-3 flex items-center justify-between gap-4 bg-[#070707]">
                <div className="flex items-center gap-3 min-w-0">
                  {suggestion.project && (
                    <span
                      className="w-[6px] h-[6px] rounded-full shrink-0"
                      style={{ backgroundColor: suggestion.project.color }}
                    />
                  )}
                  <span className="text-sm text-[#999] truncate">{suggestion.label}</span>
                  <span className="text-sm text-[#333] shrink-0 font-mono">{suggestion.action}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={commit}
                    className="text-[11px] bg-white text-black px-3 py-1 rounded-md font-medium hover:bg-[#e0e0e0] transition-colors duration-150"
                  >
                    {suggestion.isNew ? "Create" : "Open"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSuggestion(null)}
                    className="text-[11px] text-[#333] hover:text-[#777] transition-colors duration-150 font-mono"
                  >
                    skip
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Dashed separator ─────────────────────────────────────────────── */}
        <div className="my-10 border-t border-dashed border-[#161616]" />

        {/* ── Recent Projects ──────────────────────────────────────────────── */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <Label>Recent Projects</Label>
            <Link
              href="/projects"
              className="text-[10px] text-[#252525] hover:text-[#555] transition-colors duration-150 font-mono uppercase tracking-wider"
            >
              All →
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
            {visibleProjects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onClick={() => router.push(`/projects/${p.id}`)}
              />
            ))}
            <NewProjectCard onOpen={openNewProject} />
          </div>
        </section>

        {/* ── Recently Saved ───────────────────────────────────────────────── */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <Label>Recently Saved</Label>
            <Link
              href="/vision"
              className="text-[10px] text-[#252525] hover:text-[#555] transition-colors duration-150 font-mono uppercase tracking-wider"
            >
              Vision →
            </Link>
          </div>
          {recentRefs.length === 0 ? (
            <p className="text-[11px] text-[#222] font-mono py-1">
              · · · save your first reference from Vision or Pinterest · · ·
            </p>
          ) : (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {recentRefs.map((r) => (
                <RefThumbnail key={r.id} item={r} onClick={() => router.push("/vision")} />
              ))}
            </div>
          )}
        </section>

        {/* ── Quick Actions (new users) ─────────────────────────────────────── */}
        {showQuickActions && (
          <section className="mb-4">
            <div className="flex gap-2 flex-wrap">
              {QUICK_ACTIONS.map(({ label, sub, href }) => (
                <Link
                  key={label}
                  href={href}
                  className={cn(
                    "border border-[#141414] rounded-lg px-4 py-2.5 bg-[#070707]",
                    "text-[12px] text-[#3a3a3a] hover:text-[#777] hover:border-[#222]",
                    "transition-colors duration-150 ease-out"
                  )}
                >
                  {label}
                  <span className="ml-2 text-[10px] text-[#1e1e1e] font-mono">{sub}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && <Toast key="toast" message={toast} onDone={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  );
}
