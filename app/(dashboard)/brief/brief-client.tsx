"use client";

import * as React from "react";
import Link from "next/link";
import { nanoid } from "nanoid";
import {
  FlameIcon as Flame,
  ImageIcon,
  ClockIcon as Clock,
  CheckIcon as Check,
} from "@/components/ui/icon";
import { SectionLabel } from "@/components/ui/section-label";
import { DitherSurface } from "@/components/ui/dither-surface";
import { cn } from "@/lib/utils";
import {
  getStoredProjects,
  type StoredProject,
} from "@/components/new-project-modal";
import { createClient } from "@/lib/supabase/client";

// ─── Ideas types & storage ────────────────────────────────────────────────────

interface Idea {
  id: string;
  text: string;
  createdAt: string;
  reminder: "none" | "today" | "tomorrow" | "this-week";
  projectId: string | null;
  projectName?: string;
  status: "active" | "done" | "dismissed";
}

const IDEAS_KEY = "studio-os-ideas";
const COLLAPSE_THRESHOLD = 5;
const COLLAPSE_SHOW = 3;

const REMINDER_LABELS: Record<Idea["reminder"], string> = {
  none: "No reminder",
  today: "Today",
  tomorrow: "Tomorrow",
  "this-week": "This week",
};

function loadIdeas(): Idea[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(IDEAS_KEY) ?? "[]") as Idea[];
  } catch { return []; }
}

function persistIdeas(ideas: Idea[]): void {
  try { localStorage.setItem(IDEAS_KEY, JSON.stringify(ideas)); } catch { /* ignore */ }
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

// ─── Ideas Section ────────────────────────────────────────────────────────────

type MenuState = { ideaId: string; sub: "main" | "reminder" | "project" } | null;

function IdeasSection({
  onTodayReminders,
}: {
  onTodayReminders: (ideas: Idea[]) => void;
}) {
  const [ideas, setIdeas] = React.useState<Idea[]>([]);
  const [input, setInput] = React.useState("");
  const [flashId, setFlashId] = React.useState<string | null>(null);
  const [expanded, setExpanded] = React.useState(false);
  const [menu, setMenu] = React.useState<MenuState>(null);
  const [projects, setProjects] = React.useState<StoredProject[]>([]);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setIdeas(loadIdeas());
    setProjects(getStoredProjects());
  }, []);

  React.useEffect(() => {
    persistIdeas(ideas);
  }, [ideas]);

  React.useEffect(() => {
    onTodayReminders(ideas.filter((i) => i.status === "active" && i.reminder === "today"));
  }, [ideas, onTodayReminders]);

  // Close menu on outside click
  React.useEffect(() => {
    if (!menu) return;
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenu(null);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menu]);

  function addIdea(text: string) {
    const id = nanoid();
    const next: Idea[] = [
      { id, text, createdAt: new Date().toISOString(), reminder: "none", projectId: null, status: "active" },
      ...ideas,
    ];
    setIdeas(next);
    persistIdeas(next);
    setFlashId(id);
    setTimeout(() => setFlashId(null), 500);
  }

  function update(id: string, patch: Partial<Idea>) {
    setIdeas((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    setMenu(null);
  }

  const active = ideas.filter((i) => i.status === "active");
  const done = ideas.filter((i) => i.status === "done");
  const sorted = [
    ...active.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    ...done.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  ];

  const shouldCollapse = active.length > COLLAPSE_THRESHOLD;
  const visible = shouldCollapse && !expanded ? sorted.slice(0, COLLAPSE_SHOW) : sorted;
  const hiddenCount = sorted.length - COLLAPSE_SHOW;
  const todayCount = active.filter((i) => i.reminder === "today").length;

  return (
    <div className="space-y-3">
      <SectionLabel>Ideas</SectionLabel>

      {/* Input */}
      <DitherSurface
        patternVariant="grid"
        patternTone="warm"
        patternDensity="sm"
        muted
        className="flex items-center border-dashed"
      >
        <input
          type="text"
          placeholder="Quick idea..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && input.trim()) {
              addIdea(input.trim());
              setInput("");
            }
          }}
          className="h-11 flex-1 bg-transparent px-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
        />
        <span className="pr-3 font-mono text-[11px] text-text-muted select-none">↵</span>
      </DitherSurface>

      {/* Empty state */}
      {sorted.length === 0 && (
        <p className="pt-0.5 font-mono text-[11px] text-text-muted">
          Capture ideas as they come. Set reminders so they resurface.
        </p>
      )}

      {/* List */}
      {sorted.length > 0 && (
        <DitherSurface
          patternVariant="band"
          patternTone="warm"
          patternDensity="sm"
          muted
          className="overflow-hidden"
        >
          {visible.map((idea, idx) => {
            const isLast = idx === visible.length - 1 && !shouldCollapse;
            const hasMenu = menu?.ideaId === idea.id;
            const isFlash = flashId === idea.id;
            const todayReminder = idea.reminder === "today";

            return (
              <div
                key={idea.id}
                className={cn(
                  "group relative flex items-start justify-between gap-3 px-4 py-3 transition-colors duration-150",
                  !isLast && "editorial-divider border-b",
                  todayReminder && "border-l-2 border-accent",
                  isFlash && "bg-[#F3F7FF]",
                  idea.status === "done" && "opacity-30"
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm text-text-primary leading-relaxed", idea.status === "done" && "line-through")}>
                    {idea.text}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-0 font-mono text-[11px] text-text-placeholder">
                    <span>{relativeTime(idea.createdAt)}</span>
                    {idea.reminder !== "none" && (
                      <span className="text-text-tertiary">&nbsp;· ⏰ {REMINDER_LABELS[idea.reminder]}</span>
                    )}
                    {idea.projectName && (
                      <span className="text-text-tertiary">&nbsp;· 📁 {idea.projectName}</span>
                    )}
                  </div>
                </div>

                {/* Three-dot menu */}
                <div
                  className="relative shrink-0"
                  ref={hasMenu ? menuRef : undefined}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setMenu(hasMenu ? null : { ideaId: idea.id, sub: "main" })
                    }
                    className="pt-0.5 text-sm leading-none text-text-muted opacity-0 transition-opacity hover:text-text-secondary group-hover:opacity-100"
                  >
                    ···
                  </button>

                  {hasMenu && (
                    <div className="surface-panel surface-panel-muted absolute right-0 top-full z-50 mt-1 w-48 rounded-[4px] shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
                      {menu.sub === "main" && (
                        <>
                          <button
                            type="button"
                            onClick={() => setMenu({ ideaId: idea.id, sub: "reminder" })}
                            className="flex w-full items-center justify-between px-3 py-2 text-[12px] text-text-secondary transition-colors hover:bg-sidebar-hover hover:text-text-primary"
                          >
                            <span>⏰ Set reminder</span>
                            <span className="text-text-placeholder">→</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setMenu({ ideaId: idea.id, sub: "project" })}
                            className="flex w-full items-center justify-between px-3 py-2 text-[12px] text-text-secondary transition-colors hover:bg-sidebar-hover hover:text-text-primary"
                          >
                            <span>📁 Add to project</span>
                            <span className="text-text-placeholder">→</span>
                          </button>
                          <div className="editorial-divider my-1 border-t" />
                          <button
                            type="button"
                            onClick={() => update(idea.id, { status: "done" })}
                            className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-text-secondary transition-colors hover:bg-sidebar-hover hover:text-text-primary"
                          >
                            ✓ Mark as done
                          </button>
                          <button
                            type="button"
                            onClick={() => update(idea.id, { status: "dismissed" })}
                            className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-text-tertiary transition-colors hover:bg-sidebar-hover hover:text-red-400"
                          >
                            ✕ Dismiss
                          </button>
                        </>
                      )}

                      {menu.sub === "reminder" && (
                        (["today", "tomorrow", "this-week", "none"] as Idea["reminder"][]).map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => update(idea.id, { reminder: r })}
                            className={cn(
                              "flex w-full items-center justify-between px-3 py-2 text-[12px] transition-colors hover:bg-sidebar-hover",
                              idea.reminder === r ? "text-text-primary" : "text-text-secondary hover:text-text-primary"
                            )}
                          >
                            {REMINDER_LABELS[r]}
                            {idea.reminder === r && (
                              <span className="text-[10px] text-accent">✓</span>
                            )}
                          </button>
                        ))
                      )}

                      {menu.sub === "project" && (
                        <>
                          {projects.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => update(idea.id, { projectId: p.id, projectName: p.name })}
                              className={cn(
                                "flex w-full items-center gap-2 px-3 py-2 text-[12px] transition-colors hover:bg-sidebar-hover",
                                idea.projectId === p.id ? "text-text-primary" : "text-text-secondary hover:text-text-primary"
                              )}
                            >
                              <span
                                className="h-2 w-2 shrink-0 rounded-full"
                                style={{ backgroundColor: p.color }}
                              />
                              {p.name}
                            </button>
                          ))}
                          {projects.length === 0 && (
                            <p className="px-3 py-2 font-mono text-[11px] text-text-placeholder">No projects yet</p>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Expand / collapse */}
          {shouldCollapse && (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="editorial-divider w-full border-t px-4 py-2.5 text-left font-mono text-[11px] text-text-placeholder transition-colors hover:text-text-tertiary"
            >
              {expanded
                ? "↑ Collapse"
                : `↓ Show ${hiddenCount} more idea${hiddenCount !== 1 ? "s" : ""}`}
            </button>
          )}
        </DitherSurface>
      )}

      {/* Summary */}
      {sorted.length > 0 && (
        <p className="font-mono text-[11px] text-text-muted">
          {active.length} idea{active.length !== 1 ? "s" : ""}
          {todayCount > 0 && ` · ${todayCount} reminder${todayCount !== 1 ? "s" : ""} today`}
        </p>
      )}
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const USER_NAME = "Nick";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getDateString(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ─── Schedule (localStorage) ─────────────────────────────────────────────────

export type ScheduleTag = "Focus" | "Break" | "Client" | "Custom";

export interface ScheduleBlock {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  startTime: string;
  endTime: string;
  tag?: ScheduleTag;
}

const SCHEDULE_KEY = "studio-os-brief-schedule";
const TAG_DOT: Record<ScheduleTag, string> = {
  Focus:  "bg-accent",
  Break:  "bg-emerald-400",
  Client: "bg-orange-400",
  Custom: "bg-purple-400",
};

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadScheduleBlocks(date: string): ScheduleBlock[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(SCHEDULE_KEY) ?? "[]") as ScheduleBlock[];
    return raw.filter((b) => b.date === date).sort((a, b) => a.startTime.localeCompare(b.startTime));
  } catch { return []; }
}

function saveScheduleBlocks(all: ScheduleBlock[]): void {
  try { localStorage.setItem(SCHEDULE_KEY, JSON.stringify(all)); } catch { /* ignore */ }
}

const STAT_LABELS = [
  { key: "dayStreak", label: "day streak", icon: Flame },
  { key: "references", label: "references", icon: ImageIcon },
  { key: "focus", label: "focus", icon: Clock },
  { key: "reviews", label: "reviews", icon: Check },
] as const;

export function BriefPage() {
  const [greeting, setGreeting] = React.useState("Good morning");
  const [dateStr, setDateStr] = React.useState("");
  const [todayIdeaReminders, setTodayIdeaReminders] = React.useState<Idea[]>([]);
  const [projects, setProjects] = React.useState<StoredProject[]>([]);
  const [scheduleBlocks, setScheduleBlocks] = React.useState<ScheduleBlock[]>([]);
  const [recentRefs, setRecentRefs] = React.useState<{ id: string; image_url: string }[]>([]);
  const stats = { dayStreak: 0, references: 0, focus: "0h", reviews: 0 };
  const [scheduleAddOpen, setScheduleAddOpen] = React.useState(false);
  const todayDate = getTodayDate();

  React.useEffect(() => {
    setGreeting(getGreeting());
    setDateStr(getDateString());
  }, []);

  React.useEffect(() => {
    setProjects(getStoredProjects());
  }, []);

  React.useEffect(() => {
    setScheduleBlocks(loadScheduleBlocks(todayDate));
    const onStorage = () => setScheduleBlocks(loadScheduleBlocks(todayDate));
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [todayDate]);

  React.useEffect(() => {
    async function fetchRefs() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("references")
          .select("id, image_url")
          .order("created_at", { ascending: false })
          .limit(5);
        setRecentRefs(data ?? []);
      } catch { /* ignore */ }
    }
    fetchRefs();
  }, []);

  const handleTodayReminders = React.useCallback((ideas: Idea[]) => {
    setTodayIdeaReminders(ideas);
  }, []);

  function addScheduleBlock(block: Omit<ScheduleBlock, "id" | "date">) {
    let raw: ScheduleBlock[] = [];
    try {
      raw = JSON.parse(localStorage.getItem(SCHEDULE_KEY) ?? "[]") as ScheduleBlock[];
    } catch { /* ignore */ }
    const otherDates = raw.filter((b) => b.date !== todayDate);
    const todayBlocks = raw.filter((b) => b.date === todayDate);
    const newBlock: ScheduleBlock = { ...block, id: nanoid(), date: todayDate };
    const updated = [...otherDates, ...todayBlocks, newBlock].sort((a, b) =>
      a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date)
    );
    saveScheduleBlocks(updated);
    setScheduleBlocks(updated.filter((b) => b.date === todayDate));
    setScheduleAddOpen(false);
  }

  function removeScheduleBlock(id: string) {
    try {
      const raw = JSON.parse(localStorage.getItem(SCHEDULE_KEY) ?? "[]") as ScheduleBlock[];
      saveScheduleBlocks(raw.filter((b) => b.id !== id));
      setScheduleBlocks(loadScheduleBlocks(todayDate));
    } catch { /* ignore */ }
  }

  const activeProject = projects[0] ?? null;

  return (
    <section className="space-y-12 pb-8">

      {/* Header */}
      <DitherSurface
        patternVariant="fade"
        patternTone="warm"
        patternDensity="sm"
        muted
        className="space-y-3 px-6 py-6"
      >
        <p className="mono-kicker">{dateStr}</p>
        <h1 className="text-[42px] font-medium leading-tight text-text-primary tracking-tight">
          {greeting}, {USER_NAME}.
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-text-secondary">
          Briefing for the day: what needs focus, what needs taste, and what should resurface before momentum gets lost.
        </p>
      </DitherSurface>

      {/* Section 0 — Ideas */}
      <IdeasSection onTodayReminders={handleTodayReminders} />

      {/* Section 1 — Today's Focus */}
      <div className="space-y-3">
        <SectionLabel>Today&apos;s Focus</SectionLabel>
        {activeProject ? (
          <DitherSurface
            patternVariant="fade"
            patternTone="blue"
            patternDensity="sm"
            className="flex items-center justify-between gap-4 p-5 transition-transform duration-200 hover:-translate-y-0.5"
          >
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <div
                className="halftone-preview h-16 w-24 flex-none border border-border-subtle"
                style={{ backgroundColor: activeProject.color }}
              />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="text-sm font-medium text-text-primary">{activeProject.name}</div>
                <span className="mono-kicker text-text-tertiary">Open to add phase & progress</span>
              </div>
            </div>
            <Link
              href={`/projects/${activeProject.id}`}
              className="mono-kicker shrink-0 text-accent transition-opacity duration-150 hover:opacity-70"
            >
              Open →
            </Link>
          </DitherSurface>
        ) : (
          <DitherSurface
            patternVariant="grid"
            patternTone="warm"
            patternDensity="sm"
            muted
            className="border-dashed px-4 py-6 text-center text-[11px] text-text-muted font-mono"
          >
            No projects in progress. Create one from Home or Projects.
          </DitherSurface>
        )}
      </div>

      {/* Section 2 — Schedule (editable) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <SectionLabel>Schedule</SectionLabel>
          <button
            type="button"
            onClick={() => setScheduleAddOpen(true)}
            className="text-[11px] font-mono text-text-muted hover:text-text-secondary uppercase tracking-wider transition-colors"
          >
            + Add
          </button>
        </div>
        {scheduleBlocks.length === 0 ? (
          <DitherSurface
            patternVariant="grid"
            patternTone="warm"
            patternDensity="sm"
            muted
            className="border-dashed px-4 py-6 text-center text-[11px] text-text-muted font-mono"
          >
            No events today.{" "}
            <button
              type="button"
              onClick={() => setScheduleAddOpen(true)}
              className="text-accent hover:underline"
            >
              + Add time block
            </button>
          </DitherSurface>
        ) : (
          <DitherSurface
            patternVariant="band"
            patternTone="warm"
            patternDensity="sm"
            muted
            className="overflow-hidden"
          >
            {scheduleBlocks.map((block, index) => (
              <div
                key={block.id}
                className={cn(
                  "group flex items-center gap-4 py-3 pl-4 pr-4 transition-colors duration-150 hover:bg-sidebar-hover",
                  index < scheduleBlocks.length - 1 && "editorial-divider border-b"
                )}
              >
                <div className="w-10 shrink-0 text-[11px] text-text-tertiary font-mono">{block.startTime}</div>
                <div
                  className={cn(
                    "w-1.5 h-1.5 rounded-full shrink-0",
                    block.tag ? TAG_DOT[block.tag] : "bg-border-subtle"
                  )}
                />
                <div className="min-w-0 flex-1 text-sm text-text-secondary">{block.title}</div>
                <span className="shrink-0 text-[10px] text-text-tertiary font-mono">
                  {block.startTime}–{block.endTime}
                  {block.tag ? ` · ${block.tag}` : ""}
                </span>
                <button
                  type="button"
                  onClick={() => removeScheduleBlock(block.id)}
                  className="shrink-0 text-text-muted hover:text-red-400 text-[10px] font-mono opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Remove
                </button>
              </div>
            ))}
          </DitherSurface>
        )}
        {scheduleAddOpen && (
          <ScheduleBlockForm
            onSave={addScheduleBlock}
            onCancel={() => setScheduleAddOpen(false)}
          />
        )}
      </div>

      {/* Section 3 — Inspiration Pulse */}
      <div className="space-y-3">
        <SectionLabel>Inspiration Pulse</SectionLabel>
        {recentRefs.length === 0 ? (
          <DitherSurface
            patternVariant="grid"
            patternTone="blue"
            patternDensity="sm"
            muted
            className="border-dashed px-4 py-6 text-center text-[11px] text-text-muted font-mono"
          >
            No references yet. Save from Vision to see them here.
          </DitherSurface>
        ) : (
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            {recentRefs.map((r) => (
              <Link
                key={r.id}
                href="/vision"
                className="surface-panel relative h-24 w-32 shrink-0 overflow-hidden"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.image_url} alt="" className="h-full w-full object-cover" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Section 4 — Creative Pulse (real stats, 0 for new users) */}
      <div className="space-y-3">
        <SectionLabel>Creative Pulse</SectionLabel>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {STAT_LABELS.map(({ key, label, icon: Icon }) => (
            <DitherSurface
              key={key}
              patternVariant="grid"
              patternTone={key === "references" ? "blue" : "warm"}
              patternDensity="sm"
              muted
              className="flex flex-col gap-1.5 p-5"
            >
              <Icon className="h-3.5 w-3.5 text-text-tertiary" />
              <div className="text-2xl font-medium text-text-primary font-mono">
                {key === "focus" ? stats.focus : key === "references" ? stats.references : key === "reviews" ? stats.reviews : stats.dayStreak}
              </div>
              <div className="mono-kicker text-text-tertiary">{label}</div>
            </DitherSurface>
          ))}
        </div>
      </div>

      {/* Section 5 — Needs Attention (only real: today idea reminders) */}
      <div className="space-y-3">
        <SectionLabel>Needs Attention</SectionLabel>
        {todayIdeaReminders.length === 0 ? (
          <DitherSurface
            patternVariant="grid"
            patternTone="warm"
            patternDensity="sm"
            muted
            className="border-dashed px-4 py-6 text-center text-[11px] text-text-muted font-mono"
          >
            No items needing attention. Ideas with &ldquo;Today&rdquo; reminders will show here.
          </DitherSurface>
        ) : (
          <ul className="space-y-2">
            {todayIdeaReminders.map((idea) => (
              <li
                key={`idea-${idea.id}`}
                className="surface-panel flex items-start gap-3 border-l-2 border-l-accent bg-[#FDFDF9] px-4 py-3"
              >
                <span className="mt-0.5 shrink-0 text-sm">💡</span>
                <div className="min-w-0 flex-1">
                  <span className="block text-sm text-text-secondary">&ldquo;{idea.text}&rdquo;</span>
                  <span className="font-mono text-[11px] text-text-placeholder">
                    Idea from {relativeTime(idea.createdAt)} · Reminder: today
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

// ─── Schedule block add form ───────────────────────────────────────────────────

function ScheduleBlockForm({
  onSave,
  onCancel,
}: {
  onSave: (block: Omit<ScheduleBlock, "id" | "date">) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = React.useState("");
  const [startTime, setStartTime] = React.useState("09:00");
  const [endTime, setEndTime] = React.useState("10:00");
  const [tag, setTag] = React.useState<ScheduleTag | "">("");

  return (
    <DitherSurface
      patternVariant="grid"
      patternTone="warm"
      patternDensity="sm"
      muted
      className="space-y-3 p-4"
    >
      <input
        type="text"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-[2px] border border-border-primary bg-white/80 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none transition-colors focus:border-[#1E5DF2]"
      />
      <div className="flex gap-3 flex-wrap">
        <label className="flex items-center gap-2 text-[11px] text-text-tertiary font-mono">
          Start
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="rounded-[2px] border border-border-primary bg-white/80 px-2 py-1 text-text-primary outline-none transition-colors focus:border-[#1E5DF2]"
          />
        </label>
        <label className="flex items-center gap-2 text-[11px] text-text-tertiary font-mono">
          End
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="rounded-[2px] border border-border-primary bg-white/80 px-2 py-1 text-text-primary outline-none transition-colors focus:border-[#1E5DF2]"
          />
        </label>
        <label className="flex items-center gap-2 text-[11px] text-text-tertiary font-mono">
          Tag
          <select
            value={tag}
            onChange={(e) => setTag((e.target.value || "") as ScheduleTag | "")}
            className="rounded-[2px] border border-border-primary bg-white/80 px-2 py-1 text-text-primary outline-none transition-colors focus:border-[#1E5DF2]"
          >
            <option value="">—</option>
            <option value="Focus">Focus</option>
            <option value="Break">Break</option>
            <option value="Client">Client</option>
            <option value="Custom">Custom</option>
          </select>
        </label>
      </div>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-[11px] font-mono text-text-muted hover:text-text-secondary"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => {
            if (title.trim()) onSave({ title: title.trim(), startTime, endTime, tag: tag || undefined });
          }}
          disabled={!title.trim()}
          className="px-3 py-1.5 text-[11px] font-mono bg-button-primary-bg text-button-primary-text disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add block
        </button>
      </div>
    </DitherSurface>
  );
}
