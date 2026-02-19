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
  Discovery:
    "border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-900/40 dark:text-amber-200",
  Concept:
    "border border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-500/40 dark:bg-purple-900/40 dark:text-purple-200",
  Refine:
    "border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/40 dark:bg-sky-900/40 dark:text-sky-200",
  Deliver:
    "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-900/40 dark:text-emerald-200",
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
  { time: "9:00 AM", title: "Deep work block", type: "Focus Time" },
  { time: "12:00 PM", title: "Lunch & walk", type: "Break" },
  { time: "2:00 PM", title: "Acme Rebrand — client review", type: "Client Call" },
  { time: "3:30 PM", title: "Design review with team", type: "Review" },
  { time: "5:00 PM", title: "Wrap & tomorrow prep", type: "Focus Time" },
];

const EVENT_BADGE: Record<EventType, string> = {
  "Client Call":
    "bg-orange-50 text-orange-700 dark:bg-orange-900/40 dark:text-orange-200",
  "Focus Time":
    "bg-[#111111] text-blue-700 dark:bg-blue-900/40 dark:text-blue-200",
  Review:
    "bg-purple-50 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200",
  Break:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
};

const EVENT_BORDER: Record<EventType, string> = {
  "Client Call": "border-l-orange-500",
  "Focus Time": "border-l-accent",
  Review: "border-l-purple-500",
  Break: "border-l-emerald-500",
};

const INSPIRATION_IMAGES = [
  "https://picsum.photos/seed/brief-1/320/200",
  "https://picsum.photos/seed/brief-2/320/200",
  "https://picsum.photos/seed/brief-3/320/200",
  "https://picsum.photos/seed/brief-4/320/200",
  "https://picsum.photos/seed/brief-5/320/200",
];

const STATS = [
  { value: "5", label: "day streak", icon: Flame },
  { value: "12", label: "references", icon: ImageIcon },
  { value: "3.2h", label: "focus", icon: Clock },
  { value: "2", label: "reviews", icon: Check },
];

const PENDING_ITEMS = [
  {
    icon: MessageSquare,
    text: "3 unresolved Figma comments on Acme Rebrand",
    project: "Acme Rebrand",
    time: "2 hours ago",
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

const SECTION_LABEL =
  "text-[9px] font-medium uppercase tracking-[0.15em] text-accent";

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
        <div className="space-y-0.5">
          <p className="text-xs font-light text-gray-500">{dateStr}</p>
          <h1 className="text-[32px] font-medium leading-tight text-white tracking-[-0.7px]">
            {greeting}, {USER_NAME}.
          </h1>
        </div>
        <p className="text-sm text-[#b5b5b5] leading-relaxed">
          {FOCUS_SUMMARY}
        </p>
      </header>

      {/* Section 1 — Today's Focus */}
      <div className="space-y-3">
        <div className={SECTION_LABEL}>Today&apos;s Focus</div>
        <div className="flex items-center justify-between gap-4 rounded-lg border border-[#222222] bg-[#111111] p-4 transition-[border-color] duration-200 ease-out hover:border-white/20">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <div className="relative h-16 w-24 flex-none overflow-hidden rounded-md border border-[#333333] bg-[#0a0a0a]">
              <Image
                src={ACTIVE_PROJECT.leadImage}
                alt={ACTIVE_PROJECT.name}
                width={96}
                height={64}
                className="h-full w-full object-cover"
                unoptimized
              />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="text-base font-medium text-white">
                {ACTIVE_PROJECT.name}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.15em]",
                    PHASE_STYLES[ACTIVE_PROJECT.phase]
                  )}
                >
                  {ACTIVE_PROJECT.phase}
                </span>
                <span className="text-[11px] text-gray-400">
                  {ACTIVE_PROJECT.progress}% complete
                </span>
              </div>
              <div className="h-0.5 w-24 bg-[#333333]">
                <div
                  className="h-full bg-accent"
                  style={{ width: `${ACTIVE_PROJECT.progress}%` }}
                />
              </div>
            </div>
          </div>
          <Link
            href="/projects"
            className="shrink-0 text-sm font-medium text-accent transition-[border-color] duration-200 ease-out hover:text-accent/90"
          >
            Continue →
          </Link>
        </div>
      </div>

      {/* Section 2 — Schedule */}
      <div className="space-y-3">
        <div className={SECTION_LABEL}>Schedule</div>
        <div className="space-y-0 rounded-lg border border-[#222222] bg-[#111111]">
          {SCHEDULE.map((event, index) => (
            <div
              key={`${event.time}-${event.title}`}
              className={cn(
                "group flex items-start gap-4 border-l-2 border-transparent py-3 pl-4 pr-4 transition-colors duration-150 hover:bg-white/[0.03] cursor-default",
                index < SCHEDULE.length - 1 && "border-b border-[#333333]",
                EVENT_BORDER[event.type]
              )}
            >
              <div className="w-14 shrink-0 text-sm text-gray-400 transition-colors duration-150 group-hover:text-gray-300">
                {event.time}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="text-sm font-normal text-white">
                  {event.title}
                </div>
                <span
                  className={cn(
                    "inline-block rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.15em]",
                    EVENT_BADGE[event.type]
                  )}
                >
                  {event.type}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3 — Inspiration Pulse */}
      <div className="space-y-3">
        <div className={SECTION_LABEL}>Inspiration Pulse</div>
        <p className="text-[11px] text-gray-400">
          Recent references from {ACTIVE_PROJECT.name}
        </p>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {INSPIRATION_IMAGES.map((src, i) => (
            <Link
              key={src}
              href="/vision"
              className="relative h-24 w-32 shrink-0 overflow-hidden rounded-lg border border-[#222222] bg-[#111111] transition-[border-color] duration-200 ease-out hover:border-white/20"
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

      {/* Section 4 — Creative Pulse (Stats) */}
      <div className="space-y-3">
        <div className={SECTION_LABEL}>Creative Pulse</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STATS.map(({ value, label, icon: Icon }) => (
            <div
              key={label}
              className="flex flex-col gap-1 rounded-lg border border-[#222222] bg-[#111111] p-3"
            >
              <Icon className="h-4 w-4 text-gray-500" />
              <div className="text-2xl font-medium text-white">
                {value}
              </div>
              <div className="text-[11px] text-gray-400">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 5 — Needs Attention */}
      <div className="space-y-3">
        <div className={SECTION_LABEL}>Needs Attention</div>
        <ul className="space-y-2">
          {PENDING_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <li
                key={item.text}
                className="flex items-center gap-3 rounded-lg border border-[#222222] bg-[#111111] px-3 py-2 transition-[border-color] duration-200 ease-out hover:border-white/20"
              >
                <Icon className="h-4 w-4 shrink-0 text-gray-500" />
                <span className="min-w-0 flex-1 text-sm font-light text-white">
                  {item.text}
                </span>
                <span className="shrink-0 rounded border border-[#333333] bg-black px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.15em] text-gray-400">
                  {item.project}
                </span>
                <span className="shrink-0 text-[11px] text-gray-500">
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
