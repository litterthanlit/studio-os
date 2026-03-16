'use client';

import { useRouter } from "next/navigation";
import { useNewProjectModal } from "@/components/new-project-modal";

// Dummy data to ensure we have the exact visual state requested.
const RECENT_PROJECTS = [
  {
    id: "proj-1",
    name: "Acme Rebrand",
    date: "Modified 2 hours ago",
    status: "Generating",
    image: "https://picsum.photos/seed/acme/96/96"
  },
  {
    id: "proj-2",
    name: "Aura Skincare",
    date: "Modified yesterday",
    status: "Review",
    image: "https://picsum.photos/seed/aura/96/96"
  },
  {
    id: "proj-3",
    name: "Nexus API Docs",
    date: "Modified 3 days ago",
    status: "Completed",
    image: "https://picsum.photos/seed/nexus/96/96"
  },
  {
    id: "proj-4",
    name: "Lumina Portfolio",
    date: "Modified last week",
    status: "Draft",
    image: "https://picsum.photos/seed/lumina/96/96"
  },
];

export function HomeClient() {
  const router = useRouter();
  const { openModal } = useNewProjectModal();
  
  return (
    <div className="relative z-10 mx-auto max-w-[960px] animate-in fade-in slide-in-from-bottom-2 pt-20 pb-12 duration-300 ease-out before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:bg-pattern-ascii before:opacity-[0.03]">
      {/* Header Section */}
      <div className="mx-auto flex max-w-[760px] flex-col items-center text-center">
        <h1 className="text-[28px] font-semibold tracking-[-0.015em] text-text-primary">
          Good evening, Nick
        </h1>
      </div>

      {/* Search / Command Block */}
      <div className="mx-auto mt-7 w-full max-w-[760px] rounded-[4px] border border-[#E5E5E0] bg-white p-2 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-3 px-3 py-2">
          <input
            type="text"
            placeholder="What are you working on today?"
            className="flex-1 bg-transparent text-[14px] text-[#1A1A1A] outline-none placeholder:text-[#A0A0A0]"
          />
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[2px] border border-[#E5E5E0] text-[#6B6B6B] transition-colors duration-150 hover:border-[#D1E4FC] hover:text-[#1E5DF2] cursor-pointer">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </div>
        </div>

        <div className="flex items-center gap-1 mt-1 border-t border-[#E5E5E0] px-1 pt-1.5 pb-1">
          <button
            type="button"
            onClick={openModal}
            className="flex items-center gap-1.5 rounded-[4px] px-2.5 py-1.5 text-[11px] text-[#6B6B6B] transition-colors duration-150 hover:bg-[#F5F5F0]"
          >
            <span className="font-mono text-[10px] text-[#A0A0A0]">+</span>
            New Project
          </button>
          <button
            type="button"
            onClick={() => router.push('/projects')}
            className="flex items-center gap-1.5 rounded-[4px] px-2.5 py-1.5 text-[11px] text-[#6B6B6B] transition-colors duration-150 hover:bg-[#F5F5F0]"
          >
            Browse All
          </button>
          <button
            type="button"
            onClick={() => router.push('/explore')}
            className="flex items-center gap-1.5 rounded-[4px] px-2.5 py-1.5 text-[11px] text-[#6B6B6B] transition-colors duration-150 hover:bg-[#F5F5F0]"
          >
            Daily Inspiration
          </button>

          <div className="ml-auto flex items-center gap-1 px-1">
            <kbd className="rounded-[2px] border border-[#E5E5E0] bg-[#F5F5F0] px-1.5 py-0.5 font-mono text-[9px] text-[#A0A0A0]">⌘</kbd>
            <kbd className="rounded-[2px] border border-[#E5E5E0] bg-[#F5F5F0] px-1.5 py-0.5 font-mono text-[9px] text-[#A0A0A0]">K</kbd>
          </div>
        </div>
      </div>

      {/* Recent Projects list */}
      <div className="mt-14">
        <h2 className="text-[13px] font-medium uppercase tracking-[0.08em] text-text-secondary mb-4">
          Recent Projects
        </h2>
        <div className="flex flex-col gap-2">
          {RECENT_PROJECTS.map((project) => (
            <div 
              key={project.id}
              onClick={() => router.push(`/canvas?project=${project.name.toLowerCase().replace(/\\s+/g, '-')}`)}
              className="group flex items-center justify-between p-3 rounded-md bg-card-bg border border-transparent hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:border-border-hover transition-all duration-150 ease-out cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 shrink-0 rounded-lg overflow-hidden border border-border-primary bg-bg-secondary">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={project.image} 
                    alt={project.name} 
                    className="w-full h-full object-cover" 
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-[14px] font-semibold text-text-primary">
                    {project.name}
                  </span>
                  <span className="text-[13px] text-text-secondary">
                    {project.date}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-4 pr-2">
                <span className="rounded-sm bg-[var(--accent-pill)] px-2.5 py-0.5 text-[11px] uppercase tracking-wide text-[var(--accent)] font-medium">
                  {project.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>


      
    </div>
  );
}
