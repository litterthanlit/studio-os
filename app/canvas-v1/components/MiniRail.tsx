"use client";

import * as React from "react";
import Link from "next/link";
import {
  Layers,
  SlidersHorizontal,
  ChevronsRight,
  Sun,
  Moon,
  Monitor,
  Search,
  Plus,
  Share2,
  Download,
  MoreHorizontal,
} from "lucide-react";
import type { EditorThemePreference } from "@/lib/editor-theme-preference";
import { getProjectById } from "@/lib/project-store";
import { cn } from "@/lib/utils";

function LogoMark({ size = 24 }: { size?: number }) {
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
      <g transform="translate(4.075 2)">
        <rect x="0" y="66" width="119.189" height="13" rx="2" fill="rgba(75, 87, 219, 0.67)" />
        <rect x="0" y="49" width="119.189" height="13" rx="2" fill="rgba(75, 87, 219, 0.67)" />
        <rect x="0" y="32" width="119.189" height="13" rx="2" fill="rgba(75, 87, 219, 0.67)" />
        <rect x="0" y="15" width="119.189" height="13" rx="2" fill="rgba(75, 87, 219, 0.67)" />
        <rect x="0" y="0" width="57" height="11" rx="2" fill="rgba(75, 87, 219, 0.67)" />
      </g>
      <g transform="translate(7.811 0)">
        <rect x="0" y="65" width="119.189" height="13" rx="2" fill="rgba(36, 48, 173, 0.3)" />
        <rect x="0" y="48" width="119.189" height="13" rx="2" fill="rgba(36, 48, 173, 0.3)" />
        <rect x="0" y="31" width="119.189" height="13" rx="2" fill="rgba(36, 48, 173, 0.3)" />
        <rect x="0" y="14" width="119.189" height="13" rx="2" fill="rgba(36, 48, 173, 0.3)" />
        <rect x="0" y="0" width="57" height="11" rx="2" fill="rgba(36, 48, 173, 0.3)" />
      </g>
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

type MiniRailProps = {
  projectId?: string;
  layersVisible: boolean;
  onToggleLayers: () => void;
  inspectorVisible: boolean;
  onToggleInspector: () => void;
  componentGalleryVisible?: boolean;
  onToggleComponentGallery?: () => void;
  editorThemePreference?: EditorThemePreference;
  onCycleEditorTheme?: () => void;
  onOpenShortcuts?: () => void;
};

function RailButton({
  active,
  onClick,
  title,
  className,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={cn(
        "flex size-9 items-center justify-center rounded-[6px] border-none bg-transparent transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40 2xl:size-10",
        active
          ? "text-[var(--accent)]"
          : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
        className
      )}
    >
      {children}
    </button>
  );
}

function RailLink({
  href,
  title,
  className,
  children,
}: {
  href: string;
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      title={title}
      aria-label={title}
      className={cn(
        "flex size-9 items-center justify-center rounded-[6px] text-[var(--text-muted)] transition-colors duration-150 cursor-pointer hover:text-[var(--text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40 2xl:size-10",
        className
      )}
    >
      {children}
    </Link>
  );
}

export function MiniRail({
  projectId,
  layersVisible,
  onToggleLayers,
  inspectorVisible,
  onToggleInspector,
  componentGalleryVisible = false,
  onToggleComponentGallery,
  editorThemePreference = "system",
  onCycleEditorTheme,
  onOpenShortcuts,
}: MiniRailProps) {
  const ThemeIcon =
    editorThemePreference === "light"
      ? Sun
      : editorThemePreference === "dark"
        ? Moon
        : Monitor;

  const projectName = React.useMemo(() => {
    if (!projectId) return "Project";
    return getProjectById(projectId)?.name ?? "Project";
  }, [projectId]);

  return (
    <div className="z-30 flex min-h-[48px] w-full min-w-0 max-w-full shrink-0 flex-row items-center justify-between gap-2 overflow-hidden border-b-[0.5px] border-sidebar-border bg-[var(--topbar-bg)] px-2 py-1.5 2xl:min-h-[54px] 2xl:gap-3 2xl:px-3 2xl:py-2">
      <div className="flex min-w-0 flex-1 flex-row items-center gap-1.5 2xl:gap-2">
        {/* Studio OS logo mark */}
        <Link
          href="/home"
          title="Studio OS"
          aria-label="Studio OS Home"
          className="mr-0.5 flex shrink-0 items-center gap-2.5 rounded-[6px] px-1.5 py-1 text-[var(--text-primary)] hover:bg-[var(--surface-hover)] 2xl:mr-1"
          style={{
            fontFamily: '"Noto Serif", Georgia, serif',
            fontWeight: 500,
            letterSpacing: "-0.015em",
            fontSynthesis: "none",
          }}
        >
          <LogoMark size={30} />
          <span className="studio-os-wordmark hidden lg:inline text-[13px]">studio OS</span>
        </Link>

        <div className="hidden h-8 items-center gap-1 rounded-[5px] border-[0.5px] border-sidebar-border bg-[var(--surface)] px-2 text-[12px] text-[var(--text-secondary)] 2xl:flex">
          <span className="truncate max-w-[150px]">{projectName}</span>
          <span className="text-[var(--text-muted)]">/</span>
          <span className="font-medium text-[var(--text-primary)]">System canvas</span>
        </div>

        {onToggleComponentGallery && (
          <RailButton onClick={onToggleComponentGallery} title="Add components" active={componentGalleryVisible}>
            <Plus size={16} strokeWidth={1.5} />
          </RailButton>
        )}

        {/* Panel toggles */}
        <div className="flex flex-row items-center gap-0.5">
          <RailButton
            active={layersVisible}
            onClick={onToggleLayers}
            title="Toggle Layers"
          >
            <Layers size={16} strokeWidth={1.5} />
          </RailButton>

          <RailButton
            active={inspectorVisible}
            onClick={onToggleInspector}
            title="Toggle Inspector"
          >
            <SlidersHorizontal size={16} strokeWidth={1.5} />
          </RailButton>

        </div>
      </div>

      {/* Center search */}
      <div className="hidden min-w-[220px] max-w-[380px] flex-[0.9] items-center justify-center 2xl:flex">
        <div className="flex h-8 w-full items-center gap-2 rounded-[6px] border-[0.5px] border-sidebar-border bg-[var(--surface)] px-3 text-[12px] text-[var(--text-muted)] shadow-sm">
          <Search size={15} strokeWidth={1.5} className="shrink-0" />
          <span className="truncate">Search components, files, notes...</span>
          <span className="ml-auto font-mono text-[10px] text-[var(--text-muted)]">⌘K</span>
        </div>
      </div>

      {/* Theme + quick exit — right side */}
      <div className="flex flex-row items-center gap-1 shrink-0">
        <button
          type="button"
          className="hidden h-8 items-center gap-2 rounded-[5px] px-2.5 text-[12px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] 2xl:flex"
        >
          <Share2 size={14} strokeWidth={1.5} />
          Share
        </button>
        <button
          type="button"
          className="flex h-8 items-center gap-1.5 rounded-[5px] bg-[var(--accent)] px-2.5 text-[11px] font-medium text-white transition-colors hover:bg-[var(--accent-hover)] 2xl:gap-2 2xl:px-3 2xl:text-[12px]"
          aria-label="Export"
        >
          <Download size={14} strokeWidth={1.5} />
          <span className="hidden lg:inline">Export</span>
        </button>
        {onCycleEditorTheme && (
          <RailButton
            onClick={onCycleEditorTheme}
            title={`Theme: ${editorThemePreference} (click to cycle)`}
            active={false}
          >
            <ThemeIcon size={16} strokeWidth={1.5} />
          </RailButton>
        )}
        <RailLink href="/home" title="Back to dashboard" className="hidden 2xl:flex">
          <ChevronsRight size={16} strokeWidth={1.5} />
        </RailLink>
        <RailButton onClick={onOpenShortcuts ?? (() => {})} title="More" active={false}>
          <MoreHorizontal size={16} strokeWidth={1.5} />
        </RailButton>
      </div>
    </div>
  );
}
