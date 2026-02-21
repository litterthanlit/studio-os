"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  SearchIcon,
  SettingsIcon,
  PlusIcon,
  CloseIcon,
} from "@/components/ui/icon";
import {
  getStoredProjects,
  type StoredProject,
} from "@/components/new-project-modal";
import { useNewProjectModal } from "@/components/new-project-modal";
import { ThemeToggle } from "@/components/navigation/theme-toggle";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function openCommandPalette() {
  window.dispatchEvent(
    new KeyboardEvent("keydown", { metaKey: true, key: "k", bubbles: true })
  );
}

// ─── ProjectDot ───────────────────────────────────────────────────────────────

function ProjectDot({
  project,
  active,
}: {
  project: StoredProject;
  active: boolean;
}) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className={cn(
        "flex items-center gap-3 h-9 cursor-pointer",
        "transition-colors duration-150 ease-out",
        "border-l-2 pl-[10px] pr-3",
        active
          ? "bg-sidebar-active text-text-primary border-l-[var(--accent)]"
          : "text-text-tertiary hover:text-text-secondary hover:bg-sidebar-hover border-l-transparent"
      )}
    >
      <span
        className="w-2 h-2 shrink-0"
        style={{ backgroundColor: project.color }}
      />
      <span className="text-sm truncate">{project.name}</span>
    </Link>
  );
}

// ─── Sidebar inner content ────────────────────────────────────────────────────

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { openModal: openNewProject } = useNewProjectModal();
  const [projects, setProjects] = React.useState<StoredProject[]>([]);

  React.useEffect(() => {
    function refresh() {
      setProjects(getStoredProjects());
    }
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("projects-updated", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("projects-updated", refresh);
    };
  }, []);

  return (
    <div className="flex flex-col h-full px-3 py-4">
      {/* ── Section 1: Logo ── */}
      <div className="flex items-center gap-2.5 px-3 mb-4 h-10">
        <Link
          href="/home"
          className="flex items-center gap-2.5 text-text-tertiary hover:text-text-secondary transition-colors duration-150 ease-out"
        >
          <div className="w-4 h-4 bg-text-primary shrink-0" />
          <span className="text-sm font-medium">Studio OS</span>
        </Link>

        {/* Close button — mobile only */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            className="ml-auto text-text-muted hover:text-text-secondary transition-colors duration-150"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Section 2: Projects ── */}
      <div>
        <div className="flex items-center px-3 mb-1">
          <span className="text-[11px] font-mono text-section-label uppercase tracking-[0.12em] font-medium flex-1">
            Projects
          </span>
          <button
            type="button"
            onClick={() => openNewProject()}
            aria-label="New project"
            className="text-text-muted hover:text-text-secondary transition-colors duration-150"
          >
            <PlusIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        <div
          className={cn(
            "flex flex-col gap-0.5",
            projects.length > 7 && "overflow-y-auto max-h-[260px]"
          )}
        >
          {projects.length === 0 ? (
            <p className="px-3 text-[11px] text-text-muted py-1">No projects yet</p>
          ) : (
            projects.map((p) => (
              <ProjectDot
                key={p.id}
                project={p}
                active={pathname === `/projects/${p.id}`}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Section 4: Bottom ── */}
      <div className="mt-auto">
        <div className="border-t border-[var(--border-primary)] mb-2" />

        {/* Search / ⌘K */}
        <button
          type="button"
          onClick={openCommandPalette}
          className={cn(
            "flex items-center gap-3 w-full h-9 px-3 cursor-pointer",
            "text-text-tertiary hover:text-text-secondary hover:bg-sidebar-hover",
            "transition-colors duration-150 ease-out"
          )}
        >
          <SearchIcon className="w-[18px] h-[18px] shrink-0" bare />
          <span className="text-sm flex-1 text-left">Search</span>
          <span className="font-mono text-[11px] text-text-placeholder bg-bg-tertiary px-1.5 py-0.5 border border-border-primary rounded-none">
            ⌘K
          </span>
        </button>

        {/* Theme toggle */}
        <ThemeToggle />

        {/* Settings */}
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 h-9 px-3 cursor-pointer",
            "transition-colors duration-150 ease-out",
            pathname === "/settings"
              ? "bg-sidebar-active text-text-primary"
              : "text-text-tertiary hover:text-text-secondary hover:bg-sidebar-hover"
          )}
        >
          <SettingsIcon className="w-[18px] h-[18px] shrink-0" />
          <span className="text-sm">Settings</span>
        </Link>

        <div className="border-t border-[var(--border-primary)] my-2" />

        {/* User row */}
        <div className="flex items-center gap-3 px-3 py-2">
          <div
            className={cn(
              "w-7 h-7 shrink-0",
              "bg-bg-tertiary border border-border-primary",
              "flex items-center justify-center",
              "text-[11px] font-medium text-text-tertiary"
            )}
          >
            N
          </div>
          <span className="text-sm text-text-tertiary">Nick</span>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar (desktop + mobile) ───────────────────────────────────────────────

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const pathname = usePathname();

  // Close mobile sidebar on route change
  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside
        className={cn(
          "hidden md:flex flex-col",
          "w-[220px] shrink-0 h-screen",
          "bg-sidebar-bg border-r border-sidebar-border",
          "sticky top-0"
        )}
      >
        <SidebarContent />
      </aside>

      {/* ── Mobile hamburger ── */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open sidebar"
        className="md:hidden fixed top-4 left-4 z-50 flex items-center justify-center w-8 h-8 text-text-tertiary hover:text-text-primary transition-colors duration-150"
      >
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-5 h-5"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M3 5h14a1 1 0 010 2H3a1 1 0 010-2zm0 4h14a1 1 0 010 2H3a1 1 0 010-2zm0 4h14a1 1 0 010 2H3a1 1 0 010-2z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* ── Mobile overlay ── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      {/* ── Mobile drawer ── */}
      <aside
        className={cn(
          "md:hidden fixed inset-y-0 left-0 z-40 flex flex-col",
          "w-[220px] bg-sidebar-bg border-r border-sidebar-border",
          "transform transition-transform duration-200 ease-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent onClose={() => setMobileOpen(false)} />
      </aside>
    </>
  );
}
