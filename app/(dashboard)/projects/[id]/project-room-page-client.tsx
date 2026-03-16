'use client';

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Project } from "../projects-data";
import { getStoredProjects } from "@/components/new-project-modal";
import {
  getProjectState,
  listProjectReferences,
  PROJECT_REFERENCES_UPDATED_EVENT,
  PROJECT_STATE_UPDATED_EVENT,
} from "@/lib/project-store";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function applyStoredProjectState(project: Project): Project {
  const state = getProjectState(project.id);
  const palette =
    state.palette && state.palette.length > 0 ? state.palette : project.palette;
  const headingFont = state.typography?.headingFont;
  const bodyFont = state.typography?.bodyFont;

  return {
    ...project,
    leadImage: state.coverImage ?? project.leadImage,
    palette,
    headingFont,
    bodyFont,
    fontsSelected: [headingFont, bodyFont].filter(Boolean).length,
    references: listProjectReferences(project.id).length,
  };
}

function storedToProject(sp: {
  id: string;
  name: string;
  brief: string;
  color: string;
  createdAt: string;
}): Project {
  const state = getProjectState(sp.id);
  return {
    id: sp.id,
    name: sp.name,
    client: "—",
    phase: "Discovery",
    progress: 0,
    leadImage: state.coverImage ?? `https://picsum.photos/seed/${sp.id}/400/300`,
    palette: [sp.color, "#111111", "#222222", "#333333", "#999999"],
    lastActivity: "Just created",
    references: listProjectReferences(sp.id).length,
    fontsSelected: 0,
    daysActive: 0,
  };
}

type Tab = "Overview" | "Canvas" | "Assets" | "Settings";
const TABS: Tab[] = ["Overview", "Canvas", "Assets", "Settings"];

// Dummy data for variants preview
const DUMMY_VARIANTS = [
  "https://picsum.photos/seed/var1/600/400",
  "https://picsum.photos/seed/var2/600/400"
];

export function ProjectRoomPageClient({
  id,
  staticProject,
}: {
  id: string;
  staticProject: Project | null;
}) {
  const router = useRouter();
  const [project, setProject] = React.useState<Project | null>(null);
  const [checked, setChecked] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<Tab>("Overview");

  // Load project
  React.useEffect(() => {
    if (staticProject) {
      setProject(applyStoredProjectState(staticProject));
      setChecked(true);
      return;
    }
    const stored = getStoredProjects();
    const found = stored.find((p) => p.id === id);
    if (found) {
      setProject(applyStoredProjectState(storedToProject(found)));
    }
    setChecked(true);
  }, [id, staticProject]);

  React.useEffect(() => {
    if (checked && !project) {
      router.replace("/projects");
    }
  }, [checked, project, router]);

  React.useEffect(() => {
    if (!project) return;
    const syncProjectState = () => {
      setProject((prev) => {
        if (!prev) return prev;
        return applyStoredProjectState(prev);
      });
    };

    window.addEventListener(PROJECT_REFERENCES_UPDATED_EVENT, syncProjectState);
    window.addEventListener(PROJECT_STATE_UPDATED_EVENT, syncProjectState);
    return () => {
      window.removeEventListener(PROJECT_REFERENCES_UPDATED_EVENT, syncProjectState);
      window.removeEventListener(PROJECT_STATE_UPDATED_EVENT, syncProjectState);
    };
  }, [project, project?.id]);

  if (!project) {
    return (
      <div className="flex h-48 items-center justify-center text-[13px] text-text-muted">
        Loading project…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[960px] animate-in fade-in duration-300 py-10">
      
      {/* Header Area */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-[24px] font-semibold text-text-primary">
            {project.name}
          </h1>
          <span className="rounded-full bg-[var(--accent-pill)] px-2.5 py-0.5 text-[11px] uppercase tracking-wide text-[var(--accent)] font-medium">
            {project.phase}
          </span>
        </div>
        
        {/* Actions Dropdown Trigger (3 dots) */}
        <button className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-sidebar-hover text-text-secondary transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="1"></circle>
            <circle cx="19" cy="12" r="1"></circle>
            <circle cx="5" cy="12" r="1"></circle>
          </svg>
        </button>
      </header>

      {/* Tab Bar */}
      <div className="mt-8 flex items-center gap-8 border-b border-border-primary">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "pb-3 text-[13px] font-medium transition-colors relative",
              activeTab === tab
                ? "text-[var(--accent)]"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            {tab}
            {activeTab === tab && (
              <div className="absolute left-0 right-0 bottom-[-1px] h-[2px] bg-[var(--accent)]" />
            )}
          </button>
        ))}
      </div>

      {/* Overview Tab Content */}
      {activeTab === "Overview" && (
        <div className="mt-8 space-y-8">
          
          {/* Description Block */}
          <section className="space-y-4">
            <h2 className="text-[13px] font-medium text-text-secondary uppercase tracking-wide">Overview</h2>
            <Card>
              <CardContent className="pt-6">
                <p className="text-[14px] text-text-primary leading-relaxed">
                  The {project.name} initiative focuses on delivering a clinical, minimal, and premium aesthetic. The goal is to strip away visual noise and construct a workspace that respects the user&apos;s attention. All tokens and stylistic directions will be generated and validated in Canvas.
                </p>
              </CardContent>
            </Card>
          </section>

          {/* Design System Preview */}
          <section className="space-y-4">
            <h2 className="text-[13px] font-medium text-text-secondary uppercase tracking-wide">Design System</h2>
            <Card>
              <CardContent className="pt-6 flex flex-col sm:flex-row gap-8">
                <div className="space-y-3">
                  <span className="text-[12px] text-text-secondary">Colors</span>
                  <div className="flex gap-2">
                    {(project.palette.length > 0 ? project.palette : ["#FAFBFE", "#FFFFFF", "#F4F8FF", "#D1E4FC", "#2430AD"]).slice(0, 5).map((color, i) => (
                      <div 
                        key={i} 
                        className="w-6 h-6 rounded-full border border-border-primary shadow-sm"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
                <div className="w-px bg-border-primary hidden sm:block" />
                <div className="space-y-3">
                  <span className="text-[12px] text-text-secondary">Typography</span>
                  <div className="flex flex-col gap-1">
                    <span className="text-[14px] font-medium text-text-primary">{project.headingFont?.family || "Geist Sans"} (Heading)</span>
                    <span className="text-[14px] font-medium text-text-primary">{project.bodyFont?.family || "Geist Mono"} (Mono)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Generated Variants Mini-grid */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[13px] font-medium text-text-secondary uppercase tracking-wide">Generated Variants</h2>
              <Link href={`/canvas?project=${project.id}`} className="text-[13px] font-medium text-[var(--accent)] hover:underline">
                Open in Canvas →
              </Link>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              {DUMMY_VARIANTS.map((src, i) => (
                <Card key={i} className="overflow-hidden p-0">
                  <div className="aspect-[16/10] bg-bg-tertiary relative border-b border-border-primary">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="Variant Preview" className="w-full h-full object-cover" />
                  </div>
                  <div className="p-3">
                    <p className="text-[12px] font-medium text-text-secondary uppercase tracking-wide">Variant {String.fromCharCode(65 + i)}</p>
                  </div>
                </Card>
              ))}
            </div>
          </section>

        </div>
      )}

      {/* Other Tabs (Empty States) */}
      {activeTab !== "Overview" && (
        <div className="mt-16 flex flex-col items-center justify-center text-center">
          <p className="text-[14px] text-text-secondary">
            The {activeTab} view is currently empty.
          </p>
          <button 
            onClick={() => router.push(`/canvas?project=${project.id}`)}
            className="mt-6 rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-white hover:bg-[var(--accent-hover)] transition-colors shadow-sm"
          >
            Enter Canvas
          </button>
        </div>
      )}

    </div>
  );
}
