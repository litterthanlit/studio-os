"use client";

import Link from "next/link";
import {
  Layers,
  SlidersHorizontal,
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

type MiniRailProps = {
  layersVisible: boolean;
  onToggleLayers: () => void;
  inspectorVisible: boolean;
  onToggleInspector: () => void;
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
        "w-8 h-8 rounded-[4px] flex items-center justify-center transition-colors duration-150 cursor-pointer border-none bg-transparent",
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
      className="w-8 h-8 rounded-[4px] flex items-center justify-center transition-colors duration-150 cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
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
    <div className="w-[44px] h-full bg-sidebar-bg border-r-[0.5px] border-sidebar-border flex flex-col items-center pt-[14px] pb-[14px] flex-shrink-0 z-30">
      {/* S Lettermark */}
      <Link
        href="/home"
        title="Studio OS"
        className="flex items-center justify-center mb-4"
      >
        <span className="text-[16px] font-semibold text-text-primary leading-none tracking-[-0.01em]">
          S
        </span>
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
