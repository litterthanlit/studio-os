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
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "w-10 h-10 rounded-[6px] flex items-center justify-center transition-colors duration-150 cursor-pointer border-none bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40",
        active
          ? "text-[var(--accent)]"
          : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
      )}
    >
      {children}
    </button>
  );
}

function RailLink({
  href,
  title,
  children,
}: {
  href: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      title={title}
      className="w-10 h-10 rounded-[6px] flex items-center justify-center transition-colors duration-150 cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40"
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
    <div className="w-full shrink-0 bg-[#111116] border-b-[0.5px] border-sidebar-border flex flex-row items-center justify-between gap-3 px-3 py-2 z-30 min-h-[54px]">
      <div className="flex flex-row items-center gap-2 min-w-0 flex-1">
        {/* Studio OS logo mark */}
        <Link
          href="/home"
          title="Studio OS"
          aria-label="Studio OS Home"
          className="flex items-center gap-2 shrink-0 mr-1 rounded-[6px] px-1.5 py-1 text-[13px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
        >
          <LogoMark size={22} />
          <span>Studio OS</span>
        </Link>

        <div className="hidden h-8 items-center gap-1 rounded-[5px] border-[0.5px] border-sidebar-border bg-[#18181e] px-2 text-[12px] text-[var(--text-secondary)] md:flex">
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
      <div className="hidden min-w-[240px] max-w-[440px] flex-[1.2] items-center justify-center md:flex">
        <div className="flex h-9 w-full items-center gap-2 rounded-[6px] border-[0.5px] border-sidebar-border bg-[#1b1b20] px-3 text-[12px] text-[var(--text-muted)] shadow-sm">
          <Search size={15} strokeWidth={1.5} className="shrink-0" />
          <span className="truncate">Search components, files, notes...</span>
          <span className="ml-auto font-mono text-[10px] text-[var(--text-muted)]">⌘K</span>
        </div>
      </div>

      {/* Theme + quick exit — right side */}
      <div className="flex flex-row items-center gap-1 shrink-0">
        <button
          type="button"
          className="hidden h-9 items-center gap-2 rounded-[5px] px-3 text-[12px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] sm:flex"
        >
          <Share2 size={14} strokeWidth={1.5} />
          Share
        </button>
        <button
          type="button"
          className="flex h-9 items-center gap-2 rounded-[5px] bg-[var(--accent)] px-3 text-[12px] font-medium text-white transition-colors hover:bg-[var(--accent-hover)]"
        >
          <Download size={14} strokeWidth={1.5} />
          Export
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
        <RailLink href="/home" title="Back to dashboard">
          <ChevronsRight size={16} strokeWidth={1.5} />
        </RailLink>
        <RailButton onClick={onOpenShortcuts ?? (() => {})} title="More" active={false}>
          <MoreHorizontal size={16} strokeWidth={1.5} />
        </RailButton>
      </div>
    </div>
  );
}
