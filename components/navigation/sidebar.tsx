"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  HomeIcon,
  BriefIcon,
  VisionIcon,
  TypeIcon,
  ProjectsIcon,
  FlowIcon,
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
import { getStoredArchetype, type Archetype } from "@/app/onboarding/onboarding-client";

// ─── Nav items ────────────────────────────────────────────────────────────────

const BASE_NAV_ITEMS = [
  { href: "/home",     label: "Home",     Icon: HomeIcon     },
  { href: "/brief",    label: "Brief",    Icon: BriefIcon    },
  { href: "/vision",   label: "Vision",   Icon: VisionIcon   },
  { href: "/type",     label: "Type",     Icon: TypeIcon     },
  { href: "/projects", label: "Projects", Icon: ProjectsIcon },
  { href: "/flow",     label: "Flow",     Icon: FlowIcon     },
] as const;

type NavItem = (typeof BASE_NAV_ITEMS)[number];

const ARCHETYPE_PRIORITY: Record<Archetype, string> = {
  visual:     "/vision",
  typography: "/type",
  systems:    "/projects",
};

function getNavItems(archetype: Archetype | null): NavItem[] {
  if (!archetype) return [...BASE_NAV_ITEMS];
  const priorityHref = ARCHETYPE_PRIORITY[archetype];
  const priority = BASE_NAV_ITEMS.find((i) => i.href === priorityHref);
  if (!priority) return [...BASE_NAV_ITEMS];
  return [
    BASE_NAV_ITEMS[0], // Home always first
    priority,
    ...BASE_NAV_ITEMS.slice(1).filter((i) => i.href !== priorityHref),
  ] as NavItem[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function openCommandPalette() {
  window.dispatchEvent(
    new KeyboardEvent("keydown", { metaKey: true, key: "k", bubbles: true })
  );
}

// ─── NavItem ──────────────────────────────────────────────────────────────────

function NavItem({
  href,
  label,
  Icon,
  active,
}: {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 h-9 px-3 cursor-pointer",
        "transition-colors duration-150 ease-out",
        active
          ? "bg-[#1a1a1a] text-white font-medium"
          : "text-[#666] hover:text-[#999] hover:bg-[#111]"
      )}
    >
      <Icon className="w-[18px] h-[18px] shrink-0" />
      <span className="text-sm truncate">{label}</span>
    </Link>
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
        "flex items-center gap-3 h-9 px-3 cursor-pointer",
        "transition-colors duration-150 ease-out",
        active
          ? "bg-[#1a1a1a] text-white"
          : "text-[#666] hover:text-[#999] hover:bg-[#111]"
      )}
    >
      <span
        className="w-2 h-2 rounded-full shrink-0"
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
  const [navItems, setNavItems] = React.useState<NavItem[]>([...BASE_NAV_ITEMS]);

  React.useEffect(() => {
    function refresh() {
      setProjects(getStoredProjects());
      setNavItems(getNavItems(getStoredArchetype()));
    }
    refresh();
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, []);

  function isActive(href: string) {
    if (href === "/home") return pathname === "/home";
    return pathname.startsWith(href);
  }

  return (
    <div className="flex flex-col h-full px-3 py-4">
      {/* ── Section 1: Logo ── */}
      <div className="flex items-center gap-2.5 px-3 mb-4 h-10">
        <div className="w-4 h-4 bg-white shrink-0" />
        <span className="text-sm font-medium text-[#999]">Studio OS</span>

        {/* Close button — mobile only */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            className="ml-auto text-[#555] hover:text-[#999] transition-colors duration-150"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Section 2: Primary Nav ── */}
      <nav className="flex flex-col gap-0.5">
        {navItems.map(({ href, label, Icon }) => (
          <NavItem
            key={href}
            href={href}
            label={label}
            Icon={Icon}
            active={isActive(href)}
          />
        ))}
      </nav>

      {/* ── Section 3: Projects ── */}
      <div className="mt-4">
        <div className="border-t border-dashed border-[#1a1a1a] mb-3" />
        <div className="flex items-center px-3 mb-1">
          <span className="text-[11px] text-[#444] uppercase tracking-wider font-medium flex-1">
            Projects
          </span>
          <button
            type="button"
            onClick={() => openNewProject()}
            aria-label="New project"
            className="text-[#444] hover:text-[#999] transition-colors duration-150"
          >
            <PlusIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        <div
          className={cn(
            "flex flex-col gap-0.5",
            projects.length > 6 && "overflow-y-auto max-h-[200px]"
          )}
        >
          {projects.length === 0 ? (
            <p className="px-3 text-[11px] text-[#333] py-1">No projects yet</p>
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
        <div className="border-t border-dashed border-[#1a1a1a] mb-2" />

        {/* Search / ⌘K */}
        <button
          type="button"
          onClick={openCommandPalette}
          className={cn(
            "flex items-center gap-3 w-full h-9 px-3 cursor-pointer",
            "text-[#666] hover:text-[#999] hover:bg-[#111]",
            "transition-colors duration-150 ease-out"
          )}
        >
          <SearchIcon className="w-[18px] h-[18px] shrink-0" bare />
          <span className="text-sm flex-1 text-left">Search</span>
          <span className="text-[11px] text-[#444] bg-[#0a0a0a] px-1.5 py-0.5 border border-[#333]">
            ⌘K
          </span>
        </button>

        {/* Settings */}
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 h-9 px-3 cursor-pointer",
            "transition-colors duration-150 ease-out",
            pathname === "/settings"
              ? "bg-[#1a1a1a] text-white"
              : "text-[#666] hover:text-[#999] hover:bg-[#111]"
          )}
        >
          <SettingsIcon className="w-[18px] h-[18px] shrink-0" />
          <span className="text-sm">Settings</span>
        </Link>

        <div className="border-t border-dashed border-[#1a1a1a] my-2" />

        {/* User row */}
        <div className="flex items-center gap-3 px-3 py-2">
          <div
            className={cn(
              "w-7 h-7 rounded-full shrink-0",
              "bg-[#222] border border-[#333]",
              "flex items-center justify-center",
              "text-[11px] font-medium text-[#666]"
            )}
          >
            N
          </div>
          <span className="text-sm text-[#666]">Nick</span>
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
          "bg-[#0a0a0a] border-r border-[#1a1a1a]",
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
        className="md:hidden fixed top-4 left-4 z-50 flex items-center justify-center w-8 h-8 text-[#666] hover:text-white transition-colors duration-150"
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
          "w-[220px] bg-[#0a0a0a] border-r border-[#1a1a1a]",
          "transform transition-transform duration-200 ease-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent onClose={() => setMobileOpen(false)} />
      </aside>
    </>
  );
}
