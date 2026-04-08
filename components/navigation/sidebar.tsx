"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers,
  Wand2,
  Home,
  FolderOpen,
  Settings,
  Search,
  ChevronsLeft,
  ChevronsRight,
  LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvasStage } from "@/lib/canvas-stage-context";
import {
  PROFILE_STORAGE_KEY,
  PROFILE_UPDATED_EVENT,
  readStoredProfile,
} from "@/lib/profile-store";

// ─── V2 Logo Mark — Vertical-slat folder ─────────────────────────────────────

function LogoMark({ size = 28 }: { size?: number }) {
  // 3.0 logo: stacked horizontal bars with folder tab
  // Aspect ratio of viewBox: 127:83 ≈ 1.53:1
  const h = Math.round(size / 1.53);
  return (
    <svg
      width={size}
      height={h}
      viewBox="0 0 127 83"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="shrink-0"
      overflow="visible"
    >
      {/* Shadow layer (offset right+up) */}
      <g transform="translate(4.075 2)">
        <rect x="0" y="66" width="119.189" height="13" rx="2" fill="rgba(75, 87, 219, 0.67)" />
        <rect x="0" y="49" width="119.189" height="13" rx="2" fill="rgba(75, 87, 219, 0.67)" />
        <rect x="0" y="32" width="119.189" height="13" rx="2" fill="rgba(75, 87, 219, 0.67)" />
        <rect x="0" y="15" width="119.189" height="13" rx="2" fill="rgba(75, 87, 219, 0.67)" />
        <rect x="0" y="0" width="57" height="11" rx="2" fill="rgba(75, 87, 219, 0.67)" />
      </g>
      {/* Mid layer (offset further right) */}
      <g transform="translate(7.811 0)">
        <rect x="0" y="65" width="119.189" height="13" rx="2" fill="rgba(36, 48, 173, 0.3)" />
        <rect x="0" y="48" width="119.189" height="13" rx="2" fill="rgba(36, 48, 173, 0.3)" />
        <rect x="0" y="31" width="119.189" height="13" rx="2" fill="rgba(36, 48, 173, 0.3)" />
        <rect x="0" y="14" width="119.189" height="13" rx="2" fill="rgba(36, 48, 173, 0.3)" />
        <rect x="0" y="0" width="57" height="11" rx="2" fill="rgba(36, 48, 173, 0.3)" />
      </g>
      {/* Front layer (primary) */}
      <g transform="translate(0 4)">
        <rect x="0" y="66" width="119.189" height="13" rx="2" fill="rgb(75, 87, 219)" />
        <rect x="0" y="49" width="119.189" height="13" rx="2" fill="rgb(75, 87, 219)" />
        <rect x="0" y="32" width="119.189" height="13" rx="2" fill="rgb(75, 87, 219)" />
        <rect x="0" y="15" width="119.189" height="13" rx="2" fill="rgb(75, 87, 219)" />
        <rect x="0" y="0" width="57" height="11" rx="2" fill="rgb(75, 87, 219)" />
      </g>
    </svg>
  );
}

// ─── User Avatar ──────────────────────────────────────────────────────────────

function UserAvatar({ size = 24, initials = "NG" }: { size?: number; initials?: string }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-[#D1E4FC] font-medium text-accent select-none"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        letterSpacing: "0.02em",
      }}
    >
      {initials}
    </div>
  );
}

// ─── Nav Item ─────────────────────────────────────────────────────────────────

function NavItem({
  icon: Icon,
  label,
  active,
  disabled,
  expanded,
  onClick,
  href,
  tooltip,
}: {
  icon: React.ElementType;
  label: string;
  active: boolean;
  disabled?: boolean;
  expanded: boolean;
  onClick?: () => void;
  href?: string;
  tooltip?: string;
}) {
  const cls = cn(
    "group relative flex h-8 w-full items-center rounded-[4px] transition-colors duration-150",
    expanded ? "px-2 gap-2.5" : "justify-center px-0",
    active
      ? "bg-accent-light/40 text-accent"
      : disabled
      ? "opacity-40 cursor-not-allowed"
      : "hover:bg-surface-hover"
  );

  // 2px left accent bar for active state
  const accentBar = active ? (
    <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full bg-accent" />
  ) : null;

  const iconEl = (
    <Icon
      size={18}
      strokeWidth={1}
      className={cn(
        "shrink-0 transition-colors duration-150",
        active ? "text-accent" : "text-text-muted group-hover:text-text-secondary"
      )}
    />
  );

  const labelEl = (
    <AnimatePresence initial={false}>
      {expanded ? (
        <motion.span
          key="label"
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: "auto" }}
          exit={{ opacity: 0, width: 0 }}
          transition={{ duration: 0.15 }}
          className={cn(
            "overflow-hidden whitespace-nowrap text-[13px]",
            active ? "font-medium text-accent" : "text-text-secondary"
          )}
        >
          {label}
        </motion.span>
      ) : null}
    </AnimatePresence>
  );

  const content = (
    <>
      {accentBar}
      {iconEl}
      {labelEl}
    </>
  );

  if (href && !disabled) {
    return (
      <Link href={href} className={cls} title={!expanded ? label : undefined}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={!disabled ? onClick : undefined}
      title={(!expanded ? label : undefined) ?? tooltip}
      className={cls}
    >
      {content}
    </button>
  );
}

// ─── Dashboard Sidebar Content ────────────────────────────────────────────────

const DASH_NAV = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/projects", label: "Projects", icon: FolderOpen },
  { href: "/component-gallery", label: "Components", icon: LayoutGrid },
];

interface SidebarProject {
  id: string;
  name: string;
  color: string;
}

const SIDEBAR_PROJECTS: SidebarProject[] = [
  { id: "acme-rebrand", name: "Acme Rebrand", color: "#F97316" },
  { id: "fintech-dashboard", name: "FinTech Dashboard", color: "#4B57DB" },
  { id: "editorial-magazine", name: "Editorial Magazine", color: "#8B5CF6" },
  { id: "personal-portfolio", name: "Personal Portfolio", color: "#1A1A1A" },
];

function DashboardSidebarContent({
  expanded,
  onCmdK,
  onToggle,
}: {
  expanded: boolean;
  onCmdK?: () => void;
  onToggle?: () => void;
}) {
  const pathname = usePathname();
  const railPx = expanded ? "px-3" : "px-1.5";
  const [profileName, setProfileName] = React.useState("Nick");
  const profileInitials = React.useMemo(() => {
    const parts = profileName
      .split(" ")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length === 0) return "N";
    return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
  }, [profileName]);

  React.useEffect(() => {
    setProfileName(readStoredProfile().name);

    const syncProfile = () => setProfileName(readStoredProfile().name);
    const onStorage = (e: StorageEvent) => {
      if (e.key === PROFILE_STORAGE_KEY) syncProfile();
    };

    window.addEventListener(PROFILE_UPDATED_EVENT, syncProfile);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(PROFILE_UPDATED_EVENT, syncProfile);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Logo area ── */}
      <div
        className={cn(
          "flex h-[52px] shrink-0 items-center border-b border-border/60",
          expanded ? "justify-between px-3" : "justify-center px-0"
        )}
      >
        <Link
          href="/home"
          aria-label="Studio OS Home"
          className="flex shrink-0 items-center gap-2.5"
        >
          <LogoMark size={expanded ? 32 : 24} />
          <AnimatePresence initial={false}>
            {expanded ? (
              <motion.span
                key="wordmark"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden whitespace-nowrap font-serif text-[15px] tracking-[-0.01em] text-text-primary"
              >
                Studio OS
              </motion.span>
            ) : null}
          </AnimatePresence>
        </Link>

        {/* Collapse toggle (expanded only) */}
        <AnimatePresence initial={false}>
          {expanded && onToggle ? (
            <motion.button
              key="collapse-btn"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              type="button"
              onClick={onToggle}
              title="Collapse sidebar"
              className="flex h-6 w-6 items-center justify-center rounded-[4px] text-text-muted transition-colors hover:bg-surface-hover hover:text-text-secondary"
            >
              <ChevronsLeft size={14} strokeWidth={1.5} />
            </motion.button>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Expand toggle (collapsed only) */}
      {!expanded && onToggle ? (
        <div className="flex justify-center pt-2 pb-1">
          <button
            type="button"
            onClick={onToggle}
            title="Expand sidebar"
            className="flex h-6 w-6 items-center justify-center rounded-[4px] text-text-muted transition-colors hover:bg-surface-hover hover:text-text-secondary"
          >
            <ChevronsRight size={14} strokeWidth={1.5} />
          </button>
        </div>
      ) : null}

      {/* ── Main nav ── */}
      <div className={cn("mt-2 flex flex-col gap-0.5", railPx)}>
        {DASH_NAV.map(({ href, label, icon }) => {
          const active =
            href === "/home"
              ? pathname === "/home"
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <NavItem
              key={href}
              icon={icon}
              label={label}
              active={active}
              expanded={expanded}
              href={href}
            />
          );
        })}
      </div>

      {/* ── Projects section ── */}
      {expanded ? (
        <div className="mt-5 px-3">
          <span className="mono-kicker whitespace-nowrap select-none">
            Projects
          </span>
        </div>
      ) : (
        <div className="mx-auto mt-5 mb-1 h-px w-5 bg-border" />
      )}

      <div className={cn("mt-1.5 flex flex-col gap-0.5", railPx)}>
        {SIDEBAR_PROJECTS.map((project) => {
          const href = `/projects/${project.id}`;
          const active =
            pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={project.id}
              href={href}
              title={!expanded ? project.name : undefined}
              className={cn(
                "group relative flex h-8 items-center rounded-[4px] transition-colors duration-150",
                expanded ? "gap-2.5 px-2" : "justify-center px-0",
                active
                  ? "bg-accent-light/40"
                  : "hover:bg-surface-hover"
              )}
            >
              {active ? (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full bg-accent" />
              ) : null}
              <span
                className="h-[6px] w-[6px] shrink-0 rounded-full"
                style={{ backgroundColor: project.color }}
              />
              <AnimatePresence initial={false}>
                {expanded ? (
                  <motion.span
                    key={`${project.id}-label`}
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.15 }}
                    className={cn(
                      "overflow-hidden whitespace-nowrap text-[13px] truncate",
                      active
                        ? "font-medium text-accent"
                        : "text-text-secondary"
                    )}
                  >
                    {project.name}
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </Link>
          );
        })}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* ── Bottom: Search + Settings + Avatar ── */}
      <div
        className={cn(
          "flex flex-col gap-0.5 border-t border-border pt-2 pb-3",
          railPx
        )}
      >
        {/* Search / Cmd+K */}
        <button
          type="button"
          onClick={onCmdK}
          title={!expanded ? "Search (⌘K)" : undefined}
          className={cn(
            "group flex h-8 w-full items-center rounded-[4px] transition-colors duration-150 hover:bg-surface-hover",
            expanded ? "px-2 gap-2.5" : "justify-center px-0"
          )}
        >
          <Search
            size={18}
            strokeWidth={1}
            className="shrink-0 text-text-muted transition-colors duration-150 group-hover:text-text-secondary"
          />
          <AnimatePresence initial={false}>
            {expanded ? (
              <motion.span
                key="search-label"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                className="flex min-w-0 flex-1 items-center justify-between overflow-hidden whitespace-nowrap text-[13px] text-text-secondary"
              >
                Search
                <kbd className="ml-2 rounded-[2px] border border-border bg-surface-hover px-1 py-0.5 font-mono text-[9px] text-text-muted">
                  ⌘K
                </kbd>
              </motion.span>
            ) : null}
          </AnimatePresence>
        </button>

        {/* Settings */}
        <NavItem
          icon={Settings}
          label="Settings"
          active={pathname === "/settings" || pathname.startsWith("/settings/")}
          expanded={expanded}
          href="/settings"
        />

        {/* User row */}
        <div
          className={cn(
            "flex h-9 items-center rounded-[4px] transition-colors duration-150 hover:bg-surface-hover cursor-pointer",
            expanded ? "gap-2.5 px-2" : "justify-center px-0"
          )}
        >
          <UserAvatar size={24} initials={profileInitials} />
          <AnimatePresence initial={false}>
            {expanded ? (
              <motion.div
                key="user-label"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                className="flex min-w-0 flex-col overflow-hidden"
              >
                <span className="whitespace-nowrap text-[13px] font-medium leading-tight text-text-primary">
                  {profileName}
                </span>
                <span className="whitespace-nowrap text-[11px] leading-tight text-text-muted">
                  Studio OS
                </span>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ─── Canvas Sidebar Content ─────────────────────────────────────────────────

function CanvasSidebarContent({
  expanded,
  onToggle,
}: {
  expanded: boolean;
  onToggle?: () => void;
}) {
  const ctx = useCanvasStage();
  const pathname = usePathname();
  const railPx = expanded ? "px-3" : "px-1.5";

  const items = [
    {
      label: "Collect",
      icon: Layers,
      stage: "collect" as const,
      activeStages: ["collect"] as string[],
    },
    {
      label: "Compose",
      icon: Wand2,
      stage: "compose" as const,
      activeStages: ["compose"] as string[],
    },
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Logo area ── */}
      <div
        className={cn(
          "flex h-[52px] shrink-0 items-center border-b border-border/60",
          expanded ? "justify-between px-3" : "justify-center px-0"
        )}
      >
        <Link
          href="/home"
          aria-label="Studio OS Home"
          className="flex shrink-0 items-center gap-2.5"
        >
          <LogoMark size={expanded ? 32 : 24} />
          <AnimatePresence initial={false}>
            {expanded ? (
              <motion.span
                key="canvas-wordmark"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden whitespace-nowrap font-serif text-[15px] tracking-[-0.01em] text-text-primary"
              >
                Studio OS
              </motion.span>
            ) : null}
          </AnimatePresence>
        </Link>

        {expanded && onToggle ? (
          <button
            type="button"
            onClick={onToggle}
            title="Collapse sidebar"
            className="flex h-6 w-6 items-center justify-center rounded-[4px] text-text-muted transition-colors hover:bg-surface-hover hover:text-text-secondary"
          >
            <ChevronsLeft size={14} strokeWidth={1.5} />
          </button>
        ) : null}
      </div>

      {!expanded && onToggle ? (
        <div className="flex justify-center pt-2 pb-1">
          <button
            type="button"
            onClick={onToggle}
            title="Expand sidebar"
            className="flex h-6 w-6 items-center justify-center rounded-[4px] text-text-muted transition-colors hover:bg-surface-hover hover:text-text-secondary"
          >
            <ChevronsRight size={14} strokeWidth={1.5} />
          </button>
        </div>
      ) : null}

      {/* Canvas stage nav */}
      <div className={cn("mt-2 flex flex-col gap-0.5", railPx)}>
        {items.map(({ label, icon, stage, activeStages }) => {
          const isActive = ctx ? activeStages.includes(ctx.stage) : false;
          const isAvailable = ctx
            ? (ctx.availability[stage]?.available ?? true)
            : true;
          const tooltip = ctx?.availability[stage]?.tooltip;

          return (
            <NavItem
              key={stage}
              icon={icon}
              label={label}
              active={isActive}
              disabled={!isAvailable}
              expanded={expanded}
              tooltip={tooltip}
              onClick={() => {
                if (ctx && isAvailable) ctx.setStage(stage);
              }}
            />
          );
        })}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Settings at bottom */}
      <div
        className={cn("border-t border-border pt-2 pb-3", railPx)}
      >
        <NavItem
          icon={Settings}
          label="Settings"
          active={pathname === "/settings" || pathname.startsWith("/settings/")}
          expanded={expanded}
          href="/settings"
        />
      </div>
    </div>
  );
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────

const COLLAPSED_WIDTH = 48;
const EXPANDED_WIDTH = 240;

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [desktopExpanded, setDesktopExpanded] = React.useState(true);
  const pathname = usePathname();

  const isCanvasRoute =
    pathname === "/canvas" ||
    pathname.startsWith("/canvas/") ||
    pathname === "/canvas-v1" ||
    pathname.startsWith("/canvas-v1/");

  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function fireCmdK() {
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "k",
        metaKey: true,
        bubbles: true,
        cancelable: true,
      })
    );
  }

  const toggleDesktop = React.useCallback(() => {
    setDesktopExpanded((prev) => !prev);
  }, []);

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <motion.aside
        className={cn(
          "relative z-20 hidden md:flex shrink-0 flex-col h-screen sticky top-0 overflow-hidden",
          "bg-bg-primary border-r border-border"
        )}
        animate={{ width: desktopExpanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH }}
        transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {isCanvasRoute ? (
          <CanvasSidebarContent
            expanded={desktopExpanded}
            onToggle={toggleDesktop}
          />
        ) : (
          <DashboardSidebarContent
            expanded={desktopExpanded}
            onCmdK={fireCmdK}
            onToggle={toggleDesktop}
          />
        )}
      </motion.aside>

      {/* ── Mobile hamburger trigger ── */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open sidebar"
        className="md:hidden fixed top-4 left-4 z-50 flex h-9 w-9 items-center justify-center rounded-[4px] border border-border bg-bg-primary text-text-muted shadow-sm transition-colors duration-150 hover:border-border-hover hover:text-accent"
      >
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4"
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
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="mobile-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
        )}
      </AnimatePresence>

      {/* ── Mobile drawer (always expanded) ── */}
      <aside
        className={cn(
          "md:hidden fixed inset-y-0 left-0 z-40 flex flex-col",
          "bg-bg-primary border-r border-border",
          "transform transition-transform duration-200 ease-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ width: EXPANDED_WIDTH }}
      >
        {isCanvasRoute ? (
          <CanvasSidebarContent expanded />
        ) : (
          <DashboardSidebarContent
            expanded
            onCmdK={() => {
              setMobileOpen(false);
              fireCmdK();
            }}
          />
        )}
      </aside>
    </>
  );
}
