"use client";

import Link from "next/link";
import {
  Layers,
  SlidersHorizontal,
  Home,
  Settings,
  ChevronsRight,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type MiniRailProps = {
  layersVisible: boolean;
  onToggleLayers: () => void;
  inspectorVisible: boolean;
  onToggleInspector: () => void;
  onShowWelcome?: () => void;
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
          ? "text-[#4B57DB] bg-[#F5F5F0]"
          : "text-[#C0C0C0] hover:text-[#6B6B6B] hover:bg-[#F5F5F0]"
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
      className="w-8 h-8 rounded-[4px] flex items-center justify-center transition-colors duration-150 cursor-pointer text-[#C0C0C0] hover:text-[#6B6B6B] hover:bg-[#F5F5F0]"
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
}: MiniRailProps) {
  return (
    <div className="w-12 h-full bg-[#FAFAF8] border-r-[0.5px] border-[#EFEFEC] flex flex-col items-center py-3 flex-shrink-0 z-30">
      {/* Logo mark */}
      <Link
        href="/home"
        title="Studio OS"
        className="w-8 h-8 flex items-center justify-center mb-4"
      >
        <svg
          width="20"
          height="13"
          viewBox="0 0 119 79"
          fill="none"
          aria-hidden="true"
        >
          <rect y="66" width="119" height="13" rx="2" fill="rgb(75, 87, 219)" />
          <rect y="49" width="119" height="13" rx="2" fill="rgb(75, 87, 219)" />
          <rect y="32" width="119" height="13" rx="2" fill="rgb(75, 87, 219)" />
          <rect y="15" width="119" height="13" rx="2" fill="rgb(75, 87, 219)" />
          <rect y="0" width="57" height="11" rx="2" fill="rgb(75, 87, 219)" />
        </svg>
      </Link>

      {/* Panel toggles */}
      <div className="flex flex-col items-center gap-0.5">
        <RailButton
          active={layersVisible}
          onClick={onToggleLayers}
          title="Toggle Layers"
        >
          <Layers size={18} strokeWidth={1} />
        </RailButton>

        <RailButton
          active={inspectorVisible}
          onClick={onToggleInspector}
          title="Toggle Inspector"
        >
          <SlidersHorizontal size={18} strokeWidth={1} />
        </RailButton>
      </div>

      {/* Navigation */}
      <div className="flex flex-col items-center gap-0.5 mt-4">
        <RailLink href="/home" title="Home">
          <Home size={18} strokeWidth={1} />
        </RailLink>

        <RailLink href="/settings" title="Settings">
          <Settings size={18} strokeWidth={1} />
        </RailLink>

        {/* Show welcome overlay */}
        {onShowWelcome && (
          <RailButton
            onClick={onShowWelcome}
            title="Show welcome guide"
          >
            <HelpCircle size={18} strokeWidth={1} />
          </RailButton>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Expand to dashboard */}
      <RailLink href="/home" title="Back to dashboard">
        <ChevronsRight size={18} strokeWidth={1} />
      </RailLink>
    </div>
  );
}
