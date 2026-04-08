"use client";

import Link from "next/link";
import {
  Layers,
  SlidersHorizontal,
  Boxes,
  Home,
  Settings,
  ChevronsRight,
  HelpCircle,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import type { EditorThemePreference } from "@/lib/editor-theme-preference";
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
  layersVisible: boolean;
  onToggleLayers: () => void;
  inspectorVisible: boolean;
  onToggleInspector: () => void;
  componentGalleryVisible?: boolean;
  onToggleComponentGallery?: () => void;
  onShowWelcome?: () => void;
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
  layersVisible,
  onToggleLayers,
  inspectorVisible,
  onToggleInspector,
  componentGalleryVisible = false,
  onToggleComponentGallery,
  onShowWelcome,
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

  return (
    <div className="w-[52px] h-full bg-sidebar-bg border-r-[0.5px] border-sidebar-border flex flex-col items-center pt-[12px] pb-[12px] flex-shrink-0 z-30">
      {/* Studio OS logo mark */}
      <Link
        href="/home"
        title="Studio OS"
        aria-label="Studio OS Home"
        className="flex items-center justify-center mb-4"
      >
        <LogoMark size={24} />
      </Link>

      {/* Panel toggles group */}
      <div className="flex flex-col items-center">
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

        {onToggleComponentGallery && (
          <RailButton
            active={componentGalleryVisible}
            onClick={onToggleComponentGallery}
            title="Toggle Component Library"
          >
            <Boxes size={16} strokeWidth={1.5} />
          </RailButton>
        )}
      </div>

      {/* Navigation group - 16px gap from toggles */}
      <div className="flex flex-col items-center mt-4">
        <RailLink href="/home" title="Home">
          <Home size={16} strokeWidth={1.5} />
        </RailLink>

        <RailLink href="/settings" title="Settings">
          <Settings size={16} strokeWidth={1.5} />
        </RailLink>

        {/* Show welcome overlay */}
        {onShowWelcome && (
          <RailButton
            onClick={onShowWelcome}
            title="Show welcome guide"
          >
            <HelpCircle size={16} strokeWidth={1.5} />
          </RailButton>
        )}

        {onOpenShortcuts && (
          <RailButton onClick={onOpenShortcuts} title="Keyboard shortcuts (?)" active={false}>
            <span className="font-mono text-[10px] font-medium">?</span>
          </RailButton>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom group - 16px gap implied by spacer */}
      <div className="flex flex-col items-center gap-0">
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
      </div>
    </div>
  );
}
