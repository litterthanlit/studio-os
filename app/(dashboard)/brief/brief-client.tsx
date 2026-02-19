"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
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

  React.useEffect(() => {
    setGreeting(getGreeting());
    setDateStr(getDateString());
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
