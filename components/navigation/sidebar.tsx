"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
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
import { PROJECTS as STATIC_PROJECTS } from "@/app/(dashboard)/projects/projects-data";
import { ThemeToggleAscii } from "@/components/navigation/theme-toggle-ascii";
import { springs, staggerContainer, staggerItem } from "@/lib/animations";

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
    <motion.div
      whileHover={{ x: 2, transition: springs.smooth }}
      whileTap={{ scale: 0.98 }}
    >
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
          className="w-2 h-2 shrink-0 rounded-full"
          style={{ backgroundColor: project.color }}
        />
        <span className="text-sm truncate transition-colors duration-300">{project.name}</span>
      </Link>
    </motion.div>
  );
}

// ─── Sidebar inner content ────────────────────────────────────────────────────

const sidebarSlideIn = {
  hidden: { x: -20, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 300, damping: 30, mass: 0.9 },
  },
};

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { openModal: openNewProject } = useNewProjectModal();
  const [projects, setProjects] = React.useState<StoredProject[]>([]);

  React.useEffect(() => {
    function refresh() {
      const stored = getStoredProjects();
      if (stored.length > 0) {
        setProjects(stored);
      } else {
        // Fall back to static demo projects (same source as home screen)
        setProjects(
          STATIC_PROJECTS.map((p) => ({
            id: p.id,
            name: p.name,
            brief: p.client,
            color: p.palette[1] ?? "#2430AD",
            createdAt: new Date(
              Date.now() - p.daysActive * 24 * 60 * 60 * 1000
            ).toISOString(),
          }))
        );
      }
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
    <motion.div
      initial="hidden"
      animate="visible"
      variants={sidebarSlideIn}
      className="flex flex-col h-full px-3 py-4"
    >
      {/* ── Section 1: Logo ── */}
      <div className="flex items-center gap-2.5 px-3 mb-4 h-10">
        <motion.div whileHover={{ scale: 1.02, transition: springs.smooth }} whileTap={{ scale: 0.98 }}>
          <Link
            href="/home"
            className="flex items-center text-text-tertiary hover:text-text-secondary transition-colors duration-150 ease-out"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-icon.svg" alt="Studio OS" className="w-7 h-7 shrink-0" />
          </Link>
        </motion.div>

        {/* Close button — mobile only */}
        {onClose && (
          <motion.button
            type="button"
            onClick={onClose}
            whileHover={{ scale: 1.1, transition: springs.smooth }}
            whileTap={{ scale: 0.95 }}
            aria-label="Close sidebar"
            className="ml-auto text-text-muted hover:text-text-secondary transition-colors duration-150"
          >
            <CloseIcon className="w-4 h-4" />
          </motion.button>
        )}
      </div>

      {/* ── Section 2: Projects ── */}
      <div>
        <div className="flex items-center px-3 mb-1">
          <span className="text-[11px] font-sans text-section-label uppercase tracking-[0.1em] font-medium flex-1 transition-colors duration-300">
            Projects
          </span>
          <button
            type="button"
            onClick={() => openNewProject()}
            aria-label="New project"
            className="flex items-center justify-center w-6 h-6 rounded-md text-text-muted hover:text-text-secondary hover:bg-sidebar-hover transition-colors duration-150"
          >
            <PlusIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className={cn(
            "flex flex-col gap-0.5",
            projects.length > 7 && "overflow-y-auto max-h-[260px]"
          )}
        >
          {projects.length === 0 ? (
            <p className="px-3 text-[11px] text-text-muted py-1 transition-colors duration-300">No projects yet</p>
          ) : (
            projects.map((p) => (
              <motion.div key={p.id} variants={staggerItem}>
                <ProjectDot
                  project={p}
                  active={pathname === `/projects/${p.id}`}
                />
              </motion.div>
            ))
          )}
        </motion.div>
      </div>

      {/* ── Section 4: Bottom ── */}
      <div className="mt-auto">
        <div className="border-t border-[var(--border-primary)] mb-2" />

        {/* Search / ⌘K */}
        <motion.button
          type="button"
          onClick={openCommandPalette}
          whileHover={{ x: 2, transition: springs.smooth }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            "flex items-center gap-3 w-full h-9 px-3 cursor-pointer",
            "text-text-tertiary hover:text-text-secondary hover:bg-sidebar-hover",
            "transition-colors duration-150 ease-out"
          )}
        >
          <SearchIcon className="w-[18px] h-[18px] shrink-0" bare />
          <span className="text-sm flex-1 text-left">Search</span>
          <span className="font-mono text-[11px] text-text-placeholder bg-bg-tertiary px-1.5 py-0.5 border border-border-primary rounded-sm">
            ⌘K
          </span>
        </motion.button>

        {/* Theme toggle */}
        <ThemeToggleAscii />

        {/* Settings */}
        <motion.div whileHover={{ x: 2, transition: springs.smooth }} whileTap={{ scale: 0.98 }}>
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
        </motion.div>

        <div className="border-t border-[var(--border-primary)] my-2" />

        {/* User row */}
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
          <div
            className={cn(
              "w-7 h-7 shrink-0 rounded-lg",
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
    </motion.div>
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
