"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, Wand2, Home, FolderOpen, Zap, Image, Settings, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvasStage } from "@/lib/canvas-stage-context";

// ─── Studio OS Logo ────────────────────────────────────────────────────────────

function StudioOSLogo({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="4" y="8" width="24" height="18" rx="3" fill="#1E5DF2" opacity="0.2" />
      <path
        d="M4 11C4 9.34315 5.34315 8 7 8H13L15.5 5.5H25C26.6569 5.5 28 6.84315 28 8.5V23C28 24.6569 26.6569 26 25 26H7C5.34315 26 4 24.6569 4 23V11Z"
        fill="#1E5DF2"
        opacity="0.45"
      />
      <rect x="4" y="12" width="24" height="14" rx="3" fill="#1E5DF2" />
      <line x1="10" y1="18" x2="22" y2="18" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />
      <line x1="10" y1="22" x2="22" y2="22" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.4" />
    </svg>
  );
}

// ─── User Avatar ──────────────────────────────────────────────────────────────

function UserAvatar({ size = 28 }: { size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-[#D1E4FC] font-medium text-[#1E5DF2] select-none"
      style={{ width: size, height: size, fontSize: size * 0.38, letterSpacing: "0.02em" }}
    >
      NG
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
    "flex h-8 w-full items-center rounded-[4px] transition-colors duration-150",
    expanded ? "px-2" : "justify-center px-0",
    active
      ? "bg-[#D1E4FC]"
      : disabled
      ? "opacity-40 cursor-not-allowed"
      : "hover:bg-[#F5F5F0]"
  );

  const iconEl = (
    <Icon
      size={18}
      strokeWidth={1}
      className={cn(
        "shrink-0 transition-colors duration-150",
        active ? "text-[#1E5DF2]" : "text-[#A0A0A0]"
      )}
    />
  );

  const labelEl = (
    <AnimatePresence initial={false}>
      {expanded ? (
        <motion.span
          key="label"
          initial={{ opacity: 0, width: 0, marginLeft: 0 }}
          animate={{ opacity: 1, width: "auto", marginLeft: 10 }}
          exit={{ opacity: 0, width: 0, marginLeft: 0 }}
          transition={{ duration: 0.12 }}
          className={cn(
            "overflow-hidden whitespace-nowrap text-[13px]",
            active ? "font-medium text-[#1E5DF2]" : "text-[#6B6B6B]"
          )}
        >
          {label}
        </motion.span>
      ) : null}
    </AnimatePresence>
  );

  if (href && !disabled) {
    return (
      <Link href={href} className={cls} title={!expanded ? label : undefined}>
        {iconEl}
        {labelEl}
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
      {iconEl}
      {labelEl}
    </button>
  );
}

// ─── Dashboard Sidebar Content ─────────────────────────────────────────────────

const DASH_NAV = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/projects", label: "Projects", icon: FolderOpen },
  { href: "/canvas-v1", label: "Canvas", icon: Zap },
  { href: "/explore", label: "Explore", icon: Image },
];

interface SidebarProject {
  id: string;
  name: string;
  color: string;
}

const SIDEBAR_PROJECTS: SidebarProject[] = [
  { id: "acme-rebrand", name: "Acme Rebrand", color: "#F97316" },
  { id: "fintech-dashboard", name: "FinTech Dashboard", color: "#1E5DF2" },
  { id: "editorial-magazine", name: "Editorial Magazine", color: "#8B5CF6" },
  { id: "personal-portfolio", name: "Personal Portfolio", color: "#1A1A1A" },
];

function DashboardSidebarContent({
  expanded,
  onCmdK,
}: {
  expanded: boolean;
  onCmdK?: () => void;
}) {
  const pathname = usePathname();
  const railPadding = expanded ? "px-2" : "px-1";

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Logo */}
      <div className="flex h-[56px] shrink-0 items-center px-[13px]">
        <Link href="/home" aria-label="Studio OS Home" className="flex shrink-0 items-center">
          <StudioOSLogo size={24} />
          <AnimatePresence initial={false}>
            {expanded ? (
              <motion.span
                key="logo-label"
                initial={{ opacity: 0, width: 0, marginLeft: 0 }}
                animate={{ opacity: 1, width: "auto", marginLeft: 10 }}
                exit={{ opacity: 0, width: 0, marginLeft: 0 }}
                transition={{ duration: 0.12 }}
                className="overflow-hidden whitespace-nowrap text-[13px] font-semibold text-[#1A1A1A]"
              >
                Studio OS
              </motion.span>
            ) : null}
          </AnimatePresence>
        </Link>
      </div>

      {/* Main nav */}
      <div className={cn("flex flex-col gap-0.5", railPadding)}>
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

      {/* Projects section */}
      <div className="mt-5 px-[13px]">
        <motion.span
          animate={{ opacity: expanded ? 1 : 0 }}
          transition={{ duration: 0.12 }}
          className="whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.1em] text-[#A0A0A0] select-none"
        >
          Projects
        </motion.span>
      </div>
      <div className={cn("mt-1 flex flex-col gap-0.5", railPadding)}>
        {SIDEBAR_PROJECTS.map((project) => {
          const href = `/projects/${project.id}`;
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={project.id}
              href={href}
              className={cn(
                "flex h-8 items-center rounded-[4px] transition-colors duration-150",
                expanded ? "gap-2.5 px-2" : "justify-center px-0",
                active ? "bg-[#D1E4FC]" : "hover:bg-[#F5F5F0]"
              )}
            >
              <span
                className="h-[6px] w-[6px] shrink-0 rounded-full"
                style={{ backgroundColor: project.color }}
              />
              <AnimatePresence initial={false}>
                {expanded ? (
                  <motion.span
                    key={`${project.id}-label`}
                    initial={{ opacity: 0, width: 0, marginLeft: 0 }}
                    animate={{ opacity: 1, width: "auto", marginLeft: 0 }}
                    exit={{ opacity: 0, width: 0, marginLeft: 0 }}
                    transition={{ duration: 0.12 }}
                    className={cn(
                      "overflow-hidden whitespace-nowrap text-[13px] truncate",
                      active ? "font-medium text-[#1E5DF2]" : "text-[#6B6B6B]"
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

      {/* Bottom: Search + Settings + Avatar */}
      <div className={cn("flex flex-col gap-0.5 border-t border-[#E5E5E0] pt-2 pb-3", railPadding)}>
        {/* Search / Cmd+K */}
        <button
          type="button"
          onClick={onCmdK}
          title={!expanded ? "Search (⌘K)" : undefined}
          className="flex h-8 w-full items-center rounded-[4px] transition-colors duration-150 hover:bg-[#F5F5F0]"
          style={{ justifyContent: expanded ? undefined : "center", paddingLeft: expanded ? 8 : 0 }}
        >
          <Search
            size={18}
            strokeWidth={1}
            className="shrink-0 text-[#A0A0A0] transition-colors duration-150"
          />
          <AnimatePresence initial={false}>
            {expanded ? (
              <motion.span
                key="search-label"
                initial={{ opacity: 0, width: 0, marginLeft: 0 }}
                animate={{ opacity: 1, width: "auto", marginLeft: 10 }}
                exit={{ opacity: 0, width: 0, marginLeft: 0 }}
                transition={{ duration: 0.12 }}
                className="flex min-w-0 flex-1 items-center justify-between overflow-hidden whitespace-nowrap text-[13px] text-[#6B6B6B]"
              >
                Search
                <kbd className="ml-2 rounded-[2px] border border-[#E5E5E0] bg-[#F5F5F0] px-1 py-0.5 font-mono text-[9px] text-[#A0A0A0]">
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
          active={false}
          expanded={expanded}
          href="/settings"
        />

        {/* User row */}
        <div
          className={cn(
            "flex h-9 items-center rounded-[4px] transition-colors duration-150 hover:bg-[#F5F5F0] cursor-pointer",
            expanded ? "gap-2.5 px-2" : "justify-center px-0",
            !expanded && "justify-center px-0"
          )}
        >
          <UserAvatar size={24} />
          <AnimatePresence initial={false}>
            {expanded ? (
              <motion.div
                key="user-label"
                initial={{ opacity: 0, width: 0, marginLeft: 0 }}
                animate={{ opacity: 1, width: "auto", marginLeft: 0 }}
                exit={{ opacity: 0, width: 0, marginLeft: 0 }}
                transition={{ duration: 0.12 }}
                className="flex min-w-0 flex-col overflow-hidden"
              >
                <span className="whitespace-nowrap text-[13px] font-medium leading-tight text-[#1A1A1A]">
                  Nick G
                </span>
                <span className="whitespace-nowrap text-[11px] leading-tight text-[#A0A0A0]">
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

// ─── Canvas Sidebar Content ────────────────────────────────────────────────────

function CanvasSidebarContent({ expanded }: { expanded: boolean }) {
  const ctx = useCanvasStage();
  const railPadding = expanded ? "px-2" : "px-1";

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
      {/* Logo → back to home */}
      <div className="flex h-[56px] shrink-0 items-center px-[13px]">
        <Link href="/home" aria-label="Studio OS Home" className="flex shrink-0 items-center">
          <StudioOSLogo size={24} />
          <AnimatePresence initial={false}>
            {expanded ? (
              <motion.span
                key="canvas-logo-label"
                initial={{ opacity: 0, width: 0, marginLeft: 0 }}
                animate={{ opacity: 1, width: "auto", marginLeft: 10 }}
                exit={{ opacity: 0, width: 0, marginLeft: 0 }}
                transition={{ duration: 0.12 }}
                className="overflow-hidden whitespace-nowrap text-[13px] font-semibold text-[#1A1A1A]"
              >
                Studio OS
              </motion.span>
            ) : null}
          </AnimatePresence>
        </Link>
      </div>

      {/* Canvas stage nav */}
      <div className={cn("flex flex-col gap-0.5 pt-1", railPadding)}>
        {items.map(({ label, icon, stage, activeStages }) => {
          const isActive = ctx ? activeStages.includes(ctx.stage) : false;
          const isAvailable = ctx ? (ctx.availability[stage]?.available ?? true) : true;
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
      <div className={cn("border-t border-[#E5E5E0] pt-2 pb-3", railPadding)}>
        <NavItem
          icon={Settings}
          label="Settings"
          active={false}
          expanded={expanded}
          href="/settings"
        />
      </div>
    </div>
  );
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────

export function Sidebar() {
  const [expanded, setExpanded] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const pathname = usePathname();

  const isCanvasRoute =
    pathname === "/canvas" ||
    pathname.startsWith("/canvas/") ||
    pathname === "/canvas-v1" ||
    pathname.startsWith("/canvas-v1/");

  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Trigger Cmd+K from sidebar search button
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

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <motion.aside
        animate={{ width: expanded ? 200 : 48 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        className={cn(
          "relative z-20 hidden md:flex shrink-0 flex-col h-screen sticky top-0 overflow-hidden",
          "bg-[#FAFAF8] border-r border-[#E5E5E0]"
        )}
      >
        {isCanvasRoute ? (
          <CanvasSidebarContent expanded={expanded} />
        ) : (
          <DashboardSidebarContent expanded={expanded} onCmdK={fireCmdK} />
        )}
      </motion.aside>

      {/* ── Mobile hamburger trigger ── */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open sidebar"
        className="md:hidden fixed top-4 left-4 z-50 flex h-9 w-9 items-center justify-center rounded-[4px] border border-[#E5E5E0] bg-[#FAFAF8] text-[#A0A0A0] shadow-sm transition-colors duration-150 hover:border-[#D1E4FC] hover:text-[#1E5DF2]"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
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

      {/* ── Mobile drawer ── */}
      <aside
        className={cn(
          "md:hidden fixed inset-y-0 left-0 z-40 flex flex-col w-[200px]",
          "bg-[#FAFAF8] border-r border-[#E5E5E0]",
          "transform transition-transform duration-200 ease-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {isCanvasRoute ? (
          <CanvasSidebarContent expanded />
        ) : (
          <DashboardSidebarContent expanded onCmdK={() => { setMobileOpen(false); fireCmdK(); }} />
        )}
      </aside>
    </>
  );
}
