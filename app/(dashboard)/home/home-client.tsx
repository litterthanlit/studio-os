'use client';

import * as React from "react";
import { useRouter } from "next/navigation";
import { useNewProjectModal } from "@/components/new-project-modal";
import { Search, Plus, ArrowRight, Folder, Sparkles, Compass } from "lucide-react";
import { PROFILE_STORAGE_KEY, PROFILE_UPDATED_EVENT, readStoredProfile } from "@/lib/profile-store";

const RECENT_PROJECTS = [
  {
    id: "proj-1",
    name: "Acme Rebrand",
    date: "2 hours ago",
    status: "Generating",
    refs: 24,
    image: "https://picsum.photos/seed/acme/96/96"
  },
  {
    id: "proj-2",
    name: "Aura Skincare",
    date: "Yesterday",
    status: "Review",
    refs: 18,
    image: "https://picsum.photos/seed/aura/96/96"
  },
  {
    id: "proj-3",
    name: "Nexus API Docs",
    date: "3 days ago",
    status: "Completed",
    refs: 7,
    image: "https://picsum.photos/seed/nexus/96/96"
  },
  {
    id: "proj-4",
    name: "Lumina Portfolio",
    date: "Last week",
    status: "Draft",
    refs: 31,
    image: "https://picsum.photos/seed/lumina/96/96"
  },
  {
    id: "proj-5",
    name: "Vertex Dashboard",
    date: "2 weeks ago",
    status: "Completed",
    refs: 12,
    image: "https://picsum.photos/seed/vertex/96/96"
  },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function StatusDot({ status }: { status: string }) {
  const color = status === "Generating" ? "bg-[#4B57DB]" :
                status === "Review" ? "bg-amber-400" :
                status === "Completed" ? "bg-emerald-400" :
                "bg-[#A0A0A0]";
  return (
    <span className={`inline-block h-1.5 w-1.5 rounded-full ${color}`} />
  );
}

export function HomeClient() {
  const router = useRouter();
  const { openModal } = useNewProjectModal();
  const [profileName, setProfileName] = React.useState("Nick");

  React.useEffect(() => {
    setProfileName(readStoredProfile().name);

    const onProfileUpdated = () => setProfileName(readStoredProfile().name);
    const onStorage = (e: StorageEvent) => {
      if (e.key === PROFILE_STORAGE_KEY) onProfileUpdated();
    };

    window.addEventListener(PROFILE_UPDATED_EVENT, onProfileUpdated);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(PROFILE_UPDATED_EVENT, onProfileUpdated);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return (
    <div className="relative z-10 mx-auto max-w-[860px] animate-in fade-in slide-in-from-bottom-2 pt-24 pb-16 duration-300 ease-out">

      {/* ── Header ── */}
      <div className="mb-10">
        <span className="mono-kicker mb-3 block">Studio OS</span>
        <h1 className="font-serif text-[36px] font-normal tracking-[-0.02em] text-text-primary leading-[1.1]">
          {getGreeting()}, {profileName}
        </h1>
        <p className="mt-3 text-[14px] text-text-secondary max-w-[480px] leading-relaxed">
          Collect references, read the signal, and move into composition.
        </p>
      </div>

      {/* ── Search / Command Bar ── */}
      <div className="group relative rounded-[4px] border border-border bg-card-bg transition-all duration-200 focus-within:border-border-hover focus-within:ring-2 focus-within:ring-accent-light/40">
        <div className="flex items-center gap-3 px-4 py-3">
          <Search size={15} strokeWidth={1.5} className="shrink-0 text-text-muted" />
          <input
            type="text"
            placeholder="Search projects, generate a brief, explore fonts..."
            className="flex-1 bg-transparent text-[14px] text-text-primary outline-none placeholder:text-text-muted"
          />
          <div className="flex items-center gap-1">
            <kbd className="rounded-[2px] border border-border bg-surface-hover px-1.5 py-0.5 font-mono text-[9px] text-text-muted">⌘</kbd>
            <kbd className="rounded-[2px] border border-border bg-surface-hover px-1.5 py-0.5 font-mono text-[9px] text-text-muted">K</kbd>
          </div>
        </div>

        <div className="flex items-center gap-1 border-t border-border px-2 py-1.5">
          <button
            type="button"
            onClick={openModal}
            className="flex items-center gap-1.5 rounded-[4px] px-2.5 py-1.5 text-[11px] text-text-secondary transition-colors duration-150 hover:bg-surface-hover hover:text-text-primary"
          >
            <Plus size={12} strokeWidth={1.5} className="text-text-muted" />
            New Project
          </button>
          <button
            type="button"
            onClick={() => router.push('/explore')}
            className="flex items-center gap-1.5 rounded-[4px] px-2.5 py-1.5 text-[11px] text-text-secondary transition-colors duration-150 hover:bg-surface-hover hover:text-text-primary"
          >
            <Compass size={12} strokeWidth={1.5} className="text-text-muted" />
            Explore
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-[4px] px-2.5 py-1.5 text-[11px] text-text-secondary transition-colors duration-150 hover:bg-surface-hover hover:text-text-primary"
          >
            <Sparkles size={12} strokeWidth={1.5} className="text-text-muted" />
            Generate Brief
          </button>
        </div>
      </div>

      {/* ── Recent Projects ── */}
      <div className="mt-14">
        <div className="flex items-center justify-between mb-4">
          <h2 className="mono-kicker">Recent Projects</h2>
          <button
            onClick={() => router.push('/projects')}
            className="flex items-center gap-1 text-[11px] text-text-muted transition-colors duration-150 hover:text-accent"
          >
            View all
            <ArrowRight size={11} strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex flex-col gap-1">
          {RECENT_PROJECTS.map((project) => (
            <div
              key={project.id}
              onClick={() => router.push(`/canvas?project=${project.name.toLowerCase().replace(/\s+/g, '-')}`)}
              role="button"
              tabIndex={0}
              className="group/row flex items-center gap-4 rounded-[4px] border border-transparent px-3 py-2.5 transition-all duration-150 ease-out cursor-pointer hover:border-border hover:bg-card-bg/70"
            >
              {/* Thumbnail */}
              <div className="thumb-halftone-placeholder h-10 w-10 shrink-0 rounded-[4px] overflow-hidden border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={project.image}
                  alt={project.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Name + date */}
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-[14px] font-medium text-text-primary truncate">
                  {project.name}
                </span>
                <span className="text-[11px] text-text-muted">
                  {project.date} · {project.refs} references
                </span>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2 shrink-0">
                <StatusDot status={project.status} />
                <span className="text-[11px] text-text-secondary font-mono">
                  {project.status}
                </span>
              </div>

              {/* Arrow on hover */}
              <ArrowRight
                size={14}
                strokeWidth={1.5}
                className="shrink-0 text-border transition-all duration-150 group-hover/row:text-accent group-hover/row:translate-x-0.5"
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div className="mt-14">
        <h2 className="mono-kicker mb-4">Quick Actions</h2>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={openModal}
            className="group/action flex flex-col items-start gap-3 rounded-[4px] border border-border bg-card-bg/60 p-4 text-left transition-all duration-150 hover:border-border-hover hover:bg-card-bg/90"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-[4px] bg-surface-hover transition-colors duration-150 group-hover/action:bg-accent-light/40">
              <Folder size={16} strokeWidth={1.5} className="text-text-secondary group-hover/action:text-accent" />
            </div>
            <div>
              <div className="text-[13px] font-medium text-text-primary">New Project</div>
              <div className="text-[11px] text-text-muted mt-0.5">Start collecting references</div>
            </div>
          </button>
          <button
            onClick={() => router.push('/type')}
            className="group/action flex flex-col items-start gap-3 rounded-[4px] border border-border bg-card-bg/60 p-4 text-left transition-all duration-150 hover:border-border-hover hover:bg-card-bg/90"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-[4px] bg-surface-hover transition-colors duration-150 group-hover/action:bg-accent-light/40">
              <span className="font-serif text-[16px] text-text-secondary group-hover/action:text-accent">Aa</span>
            </div>
            <div>
              <div className="text-[13px] font-medium text-text-primary">Type Explorer</div>
              <div className="text-[11px] text-text-muted mt-0.5">Browse and pair typefaces</div>
            </div>
          </button>
          <button
            onClick={() => router.push('/explore')}
            className="group/action flex flex-col items-start gap-3 rounded-[4px] border border-border bg-card-bg/60 p-4 text-left transition-all duration-150 hover:border-border-hover hover:bg-card-bg/90"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-[4px] bg-surface-hover transition-colors duration-150 group-hover/action:bg-accent-light/40">
              <Compass size={16} strokeWidth={1.5} className="text-text-secondary group-hover/action:text-accent" />
            </div>
            <div>
              <div className="text-[13px] font-medium text-text-primary">Explore</div>
              <div className="text-[11px] text-text-muted mt-0.5">Daily inspiration feed</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
