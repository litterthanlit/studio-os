"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  HomeIcon,
  ProjectsIcon,
  VisionIcon,
  SettingsIcon,
  CloseIcon,
} from "@/components/ui/icon";
import { springs } from "@/lib/animations";

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
  const items = [
    { href: "/home", label: "Home", Icon: HomeIcon },
    { href: "/projects", label: "Projects", Icon: ProjectsIcon },
    { href: "/explore", label: "Explore", Icon: VisionIcon },
    { href: "/settings", label: "Settings", Icon: SettingsIcon },
  ] as const;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={sidebarSlideIn}
      className="flex h-full flex-col px-3 py-4"
    >
      <div className="mb-8 flex h-10 items-center gap-2.5 px-3">
        <motion.div whileHover={{ scale: 1.02, transition: springs.smooth }} whileTap={{ scale: 0.98 }}>
          <Link
            href="/home"
            className="flex items-center gap-[6px] text-text-tertiary hover:text-text-secondary transition-colors duration-150 ease-out"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-icon.svg" alt="Studio OS" className="shrink-0" style={{ width: 36, height: 28 }} />
            <span
              className="text-[17px] font-semibold leading-none"
              style={{
                fontFamily: "var(--font-instrument-sans)",
                background: "linear-gradient(180deg, #2430AD 0%, #6E79F5 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              studio OS
            </span>
          </Link>
        </motion.div>

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

      <nav className="flex flex-col gap-1">
        {items.map(({ href, label, Icon }) => {
          const active =
            href === "/home"
              ? pathname === "/home"
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <motion.div
              key={href}
              whileHover={{ x: 2, transition: springs.smooth }}
              whileTap={{ scale: 0.98 }}
            >
              <Link
                href={href}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-2xl px-3 transition-colors duration-150 ease-out",
                  active
                    ? "bg-sidebar-active text-text-primary"
                    : "text-text-tertiary hover:bg-sidebar-hover hover:text-text-secondary"
                )}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" bare />
                <span className="text-sm">{label}</span>
              </Link>
            </motion.div>
          );
        })}
      </nav>

    </motion.div>
  );
}

function CanvasSidebarContent({
  projectHref,
}: {
  projectHref: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-between px-3 py-4">
      <div className="group relative mt-1">
        <Link
          href={projectHref}
          aria-label="Back to projects"
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-sidebar-border bg-sidebar-bg shadow-[0_12px_32px_rgba(0,0,0,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#3B5EFC]/25 hover:bg-white"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-icon.svg" alt="Studio OS" className="h-7 w-7" />
        </Link>
        <div className="pointer-events-none absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-border-primary bg-bg-primary px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] text-text-secondary opacity-0 shadow-[0_12px_24px_rgba(0,0,0,0.08)] transition-opacity duration-150 group-hover:opacity-100">
          Back to projects
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar (desktop + mobile) ───────────────────────────────────────────────

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [canvasSidebarVisible, setCanvasSidebarVisible] = React.useState(true);
  const [canvasProjectHref, setCanvasProjectHref] = React.useState("/home");
  const pathname = usePathname();
  const isCanvasRoute = pathname === "/canvas" || pathname === "/canvas-v1";

  // Close mobile sidebar on route change
  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    if (!isCanvasRoute || typeof window === "undefined") {
      setCanvasProjectHref("/home");
      return;
    }

    const updateProjectHref = () => {
      const params = new URLSearchParams(window.location.search);
      const projectId = params.get("project");
      setCanvasProjectHref(projectId ? `/projects/${projectId}` : "/home");
    };

    updateProjectHref();
    window.addEventListener("popstate", updateProjectHref);
    return () => window.removeEventListener("popstate", updateProjectHref);
  }, [isCanvasRoute, pathname]);

  React.useEffect(() => {
    if (!isCanvasRoute) {
      setCanvasSidebarVisible(true);
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "\\") {
        event.preventDefault();
        setCanvasSidebarVisible((current) => !current);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCanvasRoute]);

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside
        className={cn(
          "hidden md:flex flex-col",
          isCanvasRoute
            ? canvasSidebarVisible
              ? "w-[72px]"
              : "w-0"
            : "w-[220px]",
          "shrink-0 h-screen",
          "bg-sidebar-bg border-r border-sidebar-border",
          "sticky top-0 overflow-hidden transition-[width] duration-200 ease-out",
          isCanvasRoute && !canvasSidebarVisible && "border-r-transparent"
        )}
      >
        {isCanvasRoute ? (
          canvasSidebarVisible ? (
            <CanvasSidebarContent projectHref={canvasProjectHref} />
          ) : null
        ) : (
          <SidebarContent />
        )}
      </aside>

      {/* ── Mobile hamburger ── */}
      {isCanvasRoute ? (
        canvasSidebarVisible ? (
          <div className="fixed left-4 top-4 z-50 md:hidden">
            <CanvasSidebarContent projectHref={canvasProjectHref} />
          </div>
        ) : null
      ) : (
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
      )}

      {/* ── Mobile overlay ── */}
      {!isCanvasRoute && mobileOpen && (
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
        {!isCanvasRoute ? <SidebarContent onClose={() => setMobileOpen(false)} /> : null}
      </aside>
    </>
  );
}
