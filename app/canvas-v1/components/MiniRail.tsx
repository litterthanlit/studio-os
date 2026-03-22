"use client";

import Link from "next/link";
import {
  Layers,
  SlidersHorizontal,
  Home,
  Settings,
  ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

type MiniRailProps = {
  layersVisible: boolean;
  onToggleLayers: () => void;
  inspectorVisible: boolean;
  onToggleInspector: () => void;
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
          ? "text-[#1E5DF2] bg-[#F5F5F0]"
          : "text-[#A0A0A0] hover:text-[#6B6B6B] hover:bg-[#F5F5F0]"
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
      className="w-8 h-8 rounded-[4px] flex items-center justify-center transition-colors duration-150 cursor-pointer text-[#A0A0A0] hover:text-[#6B6B6B] hover:bg-[#F5F5F0]"
    >
      {children}
    </Link>
  );
}

function Separator() {
  return <div className="w-6 h-px bg-[#E5E5E0] my-1.5" />;
}

export function MiniRail({
  layersVisible,
  onToggleLayers,
  inspectorVisible,
  onToggleInspector,
}: MiniRailProps) {
  return (
    <div className="w-12 h-full bg-[#FAFAF8] border-r border-[#E5E5E0] flex flex-col items-center py-3 gap-0.5 flex-shrink-0 z-30">
      {/* Logo mark */}
      <Link
        href="/home"
        title="Studio OS"
        className="w-8 h-8 flex items-center justify-center mb-0.5"
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

      <Separator />

      {/* Panel toggles */}
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

      <Separator />

      {/* Navigation */}
      <RailLink href="/home" title="Home">
        <Home size={18} strokeWidth={1} />
      </RailLink>

      <RailLink href="/settings" title="Settings">
        <Settings size={18} strokeWidth={1} />
      </RailLink>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Expand to dashboard */}
      <RailLink href="/home" title="Back to dashboard">
        <ChevronsRight size={18} strokeWidth={1} />
      </RailLink>
    </div>
  );
}
