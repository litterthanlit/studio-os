"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { nanoid } from "nanoid";
import {
  FlameIcon as Flame,
  ImageIcon,
  ClockIcon as Clock,
  CheckIcon as Check,
  MessageIcon as MessageSquare,
  FileTextIcon as FileText,
  CalendarIcon as Calendar,
} from "@/components/ui/icon";
import { SectionLabel } from "@/components/ui/section-label";
import { cn } from "@/lib/utils";
import {
  getStoredProjects,
  type StoredProject,
} from "@/components/new-project-modal";

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
      <div className="flex items-center border border-dashed border-[#222] bg-[#0a0a0a]">
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
          className="h-11 flex-1 bg-transparent px-4 text-sm text-white placeholder:text-[#333] focus:outline-none"
        />
        <span className="pr-3 font-mono text-[11px] text-[#333] select-none">↵</span>
      </div>

      {/* Empty state */}
      {sorted.length === 0 && (
        <p className="pt-0.5 font-mono text-[11px] text-[#333]">
          Capture ideas as they come. Set reminders so they resurface.
        </p>
      )}

      {/* List */}
      {sorted.length > 0 && (
        <div className="overflow-hidden border border-dashed border-[#222] bg-[#0a0a0a]">
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
                  !isLast && "border-b border-dashed border-[#1a1a1a]",
                  todayReminder && "border-l-2 border-[#0070F3]",
                  isFlash && "bg-[#111]",
                  idea.status === "done" && "opacity-30"
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm text-white leading-relaxed", idea.status === "done" && "line-through")}>
                    {idea.text}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-0 font-mono text-[11px] text-[#444]">
                    <span>{relativeTime(idea.createdAt)}</span>
                    {idea.reminder !== "none" && (
                      <span className="text-[#555]">&nbsp;· ⏰ {REMINDER_LABELS[idea.reminder]}</span>
                    )}
                    {idea.projectName && (
                      <span className="text-[#555]">&nbsp;· 📁 {idea.projectName}</span>
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
                    className="pt-0.5 text-sm leading-none text-[#333] opacity-0 transition-opacity hover:text-[#888] group-hover:opacity-100"
                  >
                    ···
                  </button>

                  {hasMenu && (
                    <div className="absolute right-0 top-full z-50 mt-1 w-48 border border-dashed border-[#333] bg-[#0d0d0d] shadow-xl">
                      {menu.sub === "main" && (
                        <>
                          <button
                            type="button"
                            onClick={() => setMenu({ ideaId: idea.id, sub: "reminder" })}
                            className="flex w-full items-center justify-between px-3 py-2 text-[12px] text-[#888] transition-colors hover:bg-white/[0.04] hover:text-white"
                          >
                            <span>⏰ Set reminder</span>
                            <span className="text-[#444]">→</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setMenu({ ideaId: idea.id, sub: "project" })}
                            className="flex w-full items-center justify-between px-3 py-2 text-[12px] text-[#888] transition-colors hover:bg-white/[0.04] hover:text-white"
                          >
                            <span>📁 Add to project</span>
                            <span className="text-[#444]">→</span>
                          </button>
                          <div className="my-1 border-t border-dashed border-[#222]" />
                          <button
                            type="button"
                            onClick={() => update(idea.id, { status: "done" })}
                            className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-[#888] transition-colors hover:bg-white/[0.04] hover:text-white"
                          >
                            ✓ Mark as done
                          </button>
                          <button
                            type="button"
                            onClick={() => update(idea.id, { status: "dismissed" })}
                            className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-[#555] transition-colors hover:bg-white/[0.04] hover:text-red-400"
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
                              "flex w-full items-center justify-between px-3 py-2 text-[12px] transition-colors hover:bg-white/[0.04]",
                              idea.reminder === r ? "text-white" : "text-[#888] hover:text-white"
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
                                "flex w-full items-center gap-2 px-3 py-2 text-[12px] transition-colors hover:bg-white/[0.04]",
                                idea.projectId === p.id ? "text-white" : "text-[#888] hover:text-white"
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
                            <p className="px-3 py-2 font-mono text-[11px] text-[#444]">No projects yet</p>
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
              className="w-full border-t border-dashed border-[#1a1a1a] px-4 py-2.5 text-left font-mono text-[11px] text-[#444] transition-colors hover:text-[#777]"
            >
              {expanded
                ? "↑ Collapse"
                : `↓ Show ${hiddenCount} more idea${hiddenCount !== 1 ? "s" : ""}`}
            </button>
          )}
        </div>
      )}

      {/* Summary */}
      {sorted.length > 0 && (
        <p className="font-mono text-[11px] text-[#333]">
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

const FOCUS_SUMMARY =
  "You have 3 hours of focus time before your 2pm client review.";

type Phase = "Discovery" | "Concept" | "Refine" | "Deliver";

const PHASE_STYLES: Record<Phase, string> = {
  Discovery: "bg-[rgba(187,77,0,0.1)] text-[#BB4D00]",
  Concept:   "border border-purple-500/30 bg-purple-900/20 text-purple-300",
  Refine:    "border border-sky-500/30 bg-sky-900/20 text-sky-300",
  Deliver:   "border border-emerald-500/30 bg-emerald-900/20 text-emerald-300",
};

const ACTIVE_PROJECT = {
  id: "acme-rebrand",
  name: "Acme Rebrand",
  phase: "Discovery" as Phase,
  progress: 40,
  leadImage: "https://picsum.photos/seed/acme-rebrand/400/300",
};

type EventType = "Client Call" | "Focus Time" | "Review" | "Break";

const SCHEDULE: { time: string; title: string; type: EventType }[] = [
  { time: "9:00",  title: "Deep work block",                type: "Focus Time"  },
  { time: "12:00", title: "Lunch & walk",                   type: "Break"       },
  { time: "14:00", title: "Acme Rebrand — client review",   type: "Client Call" },
  { time: "15:30", title: "Design review with team",        type: "Review"      },
  { time: "17:00", title: "Wrap & tomorrow prep",           type: "Focus Time"  },
];

const EVENT_DOT: Record<EventType, string> = {
  "Client Call": "bg-orange-400",
  "Focus Time":  "bg-accent",
  Review:        "bg-purple-400",
  Break:         "bg-emerald-400",
};

const INSPIRATION_IMAGES = [
  "https://picsum.photos/seed/brief-1/320/200",
  "https://picsum.photos/seed/brief-2/320/200",
  "https://picsum.photos/seed/brief-3/320/200",
  "https://picsum.photos/seed/brief-4/320/200",
  "https://picsum.photos/seed/brief-5/320/200",
];

const STATS = [
  { value: "5",   label: "day streak",  icon: Flame    },
  { value: "12",  label: "references",  icon: ImageIcon },
  { value: "3.2h",label: "focus",       icon: Clock    },
  { value: "2",   label: "reviews",     icon: Check    },
];

const PENDING_ITEMS = [
  {
    icon: MessageSquare,
    text: "3 unresolved Figma comments on Acme Rebrand",
    project: "Acme Rebrand",
    time: "2h ago",
  },
  {
    icon: FileText,
    text: "Font license for Playfair Display expires in 7 days",
    project: "Type Library",
    time: "Due soon",
  },
  {
    icon: Calendar,
    text: "Client review deck due Friday",
    project: "Acme Rebrand",
    time: "Feb 21",
  },
];

export function BriefPage() {
  const [greeting, setGreeting] = React.useState("Good morning");
  const [dateStr, setDateStr] = React.useState("");
  const [todayIdeaReminders, setTodayIdeaReminders] = React.useState<Idea[]>([]);

  React.useEffect(() => {
    setGreeting(getGreeting());
    setDateStr(getDateString());
  }, []);

  const handleTodayReminders = React.useCallback((ideas: Idea[]) => {
    setTodayIdeaReminders(ideas);
  }, []);

  return (
    <section className="space-y-12 pb-8">

      {/* Header */}
      <header className="space-y-3">
        <p className="text-[11px] text-[#555] font-mono tracking-wide">{dateStr}</p>
        <h1 className="text-[42px] font-semibold leading-tight text-white tracking-tight">
          {greeting}, {USER_NAME}.
        </h1>
        <p className="text-sm text-[#888] leading-relaxed">{FOCUS_SUMMARY}</p>
      </header>

      {/* Section 0 — Ideas */}
      <IdeasSection onTodayReminders={handleTodayReminders} />

      {/* Section 1 — Today's Focus */}
      <div className="space-y-3">
        <SectionLabel>Today&apos;s Focus</SectionLabel>
        <div className="flex items-center justify-between gap-4 border border-dashed border-[#222] bg-[#0a0a0a] p-5 transition-[border-color] duration-200 ease-out hover:border-[#444]">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <div className="relative h-16 w-24 flex-none overflow-hidden border border-[#1a1a1a] bg-[#050505]">
              <Image
                src={ACTIVE_PROJECT.leadImage}
                alt={ACTIVE_PROJECT.name}
                width={96}
                height={64}
                className="h-full w-full object-cover"
                unoptimized
              />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="text-sm font-medium text-white">
                {ACTIVE_PROJECT.name}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.15em]",
                    PHASE_STYLES[ACTIVE_PROJECT.phase]
                  )}
                >
                  {ACTIVE_PROJECT.phase}
                </span>
                <span className="text-[11px] text-[#555] font-mono">
                  {ACTIVE_PROJECT.progress}%
                </span>
              </div>
              <div className="h-px w-24 bg-[#1a1a1a]">
                <div
                  className="h-full bg-accent"
                  style={{ width: `${ACTIVE_PROJECT.progress}%` }}
                />
              </div>
            </div>
          </div>
          <Link
            href="/projects"
            className="shrink-0 text-sm font-medium text-accent transition-opacity duration-150 hover:opacity-70 font-mono"
          >
            Open →
          </Link>
        </div>
      </div>

      {/* Section 2 — Schedule */}
      <div className="space-y-3">
        <SectionLabel>Schedule</SectionLabel>
        <div className="border border-dashed border-[#222] bg-[#0a0a0a] overflow-hidden">
          {SCHEDULE.map((event, index) => (
            <div
              key={`${event.time}-${event.title}`}
              className={cn(
                "group flex items-center gap-4 py-3 pl-4 pr-4 transition-colors duration-150 hover:bg-white/[0.02]",
                index < SCHEDULE.length - 1 && "border-b border-dashed border-[#1a1a1a]"
              )}
            >
              <div className="w-10 shrink-0 text-[11px] text-[#555] font-mono">
                {event.time}
              </div>
              <div
                className={cn(
                  "w-1.5 h-1.5 rounded-full shrink-0",
                  EVENT_DOT[event.type]
                )}
              />
              <div className="min-w-0 flex-1 text-sm text-[#888]">
                {event.title}
              </div>
              <span className="shrink-0 text-[10px] text-[#555] font-mono uppercase tracking-wider">
                {event.type}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3 — Inspiration Pulse */}
      <div className="space-y-3">
        <SectionLabel>Inspiration Pulse</SectionLabel>
        <p className="text-[11px] text-[#555] font-mono">
          Recent references · {ACTIVE_PROJECT.name}
        </p>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
          {INSPIRATION_IMAGES.map((src, i) => (
            <Link
              key={src}
              href="/vision"
              className="relative h-24 w-32 shrink-0 overflow-hidden border border-dashed border-[#222] bg-[#0a0a0a] transition-[border-color] duration-150 hover:border-[#444]"
            >
              <Image
                src={src}
                alt={`Reference ${i + 1}`}
                width={128}
                height={96}
                className="h-full w-full object-cover"
                unoptimized
              />
            </Link>
          ))}
        </div>
      </div>

      {/* Section 4 — Creative Pulse */}
      <div className="space-y-3">
        <SectionLabel>Creative Pulse</SectionLabel>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {STATS.map(({ value, label, icon: Icon }) => (
            <div
              key={label}
              className="flex flex-col gap-1.5 border border-dashed border-[#222] bg-[#0a0a0a] p-5"
            >
              <Icon className="h-3.5 w-3.5 text-[#555]" />
              <div className="text-2xl font-medium text-white font-mono">
                {value}
              </div>
              <div className="text-[10px] text-[#555] uppercase tracking-wider">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 5 — Needs Attention */}
      <div className="space-y-3">
        <SectionLabel>Needs Attention</SectionLabel>
        <ul className="space-y-2">
          {/* Today-reminder ideas surface here */}
          {todayIdeaReminders.map((idea) => (
            <li
              key={`idea-${idea.id}`}
              className="flex items-start gap-3 border border-l-2 border-dashed border-[#222] border-l-[#0070F3] bg-[#0a0a0a] px-4 py-3"
            >
              <span className="mt-0.5 shrink-0 text-sm">💡</span>
              <div className="min-w-0 flex-1">
                <span className="block text-sm text-[#888]">&ldquo;{idea.text}&rdquo;</span>
                <span className="font-mono text-[11px] text-[#444]">
                  Idea from {relativeTime(idea.createdAt)} · Reminder: today
                </span>
              </div>
            </li>
          ))}

          {PENDING_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <li
                key={item.text}
                className="flex items-center gap-3 border border-dashed border-[#222] bg-[#0a0a0a] px-4 py-3 transition-[border-color] duration-150 hover:border-[#444]"
              >
                <Icon className="h-4 w-4 shrink-0 text-[#555]" />
                <span className="min-w-0 flex-1 text-sm text-[#888]">
                  {item.text}
                </span>
                <span className="shrink-0 border border-[#222] bg-black px-1.5 py-0.5 text-[10px] font-mono text-[#555]">
                  {item.project}
                </span>
                <span className="shrink-0 text-[10px] text-[#555] font-mono">
                  {item.time}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
