"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Layers, Wand2, Settings, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CanvasStage } from "@/lib/canvas/compose";

interface NavItem {
  label: string;
  icon: React.ElementType;
  stage: CanvasStage;
  activeStages: CanvasStage[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Collect",
    icon: Layers,
    stage: "collect",
    activeStages: ["collect"],
  },
  {
    label: "Compose",
    icon: Wand2,
    stage: "compose",
    activeStages: ["compose"],
  },
];

interface AppSidebarProps {
  stage: CanvasStage;
  onStageChange: (stage: CanvasStage) => void;
  availability: Record<CanvasStage, { available: boolean; tooltip?: string }>;
}

export function AppSidebar({ stage, onStageChange, availability }: AppSidebarProps) {
  const [expanded, setExpanded] = React.useState(false);

  function handleNavClick(item: NavItem) {
    if (availability[item.stage]?.available) {
      onStageChange(item.stage);
    }
  }

  return (
    <motion.nav
      animate={{ width: expanded ? 200 : 48 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className="relative z-10 flex shrink-0 flex-col overflow-hidden border-r border-[#E5E5E0] bg-[#FAFAF8]"
      style={{ height: "100%" }}
    >
      {/* Logo mark */}
      <div className="flex h-[56px] shrink-0 items-center px-[13px]">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center">
          <FolderOpen size={20} strokeWidth={1} className="text-[#1A1A1A]" />
        </div>
        <motion.span
          animate={{ opacity: expanded ? 1 : 0 }}
          transition={{ duration: 0.15 }}
          className="ml-3 whitespace-nowrap text-[13px] font-medium text-[#1A1A1A]"
        >
          Studio OS
        </motion.span>
      </div>

      {/* Nav items */}
      <div className="flex flex-col gap-0.5 px-2 pt-1">
        {NAV_ITEMS.map((item) => {
          const isActive = item.activeStages.includes(stage);
          const isAvailable = availability[item.stage]?.available ?? true;
          const Icon = item.icon;

          return (
            <button
              key={item.stage}
              type="button"
              onClick={() => handleNavClick(item)}
              title={!isAvailable ? (availability[item.stage]?.tooltip ?? item.label) : item.label}
              className={cn(
                "flex h-8 w-full items-center rounded-[4px] transition-colors duration-150",
                expanded ? "px-2" : "justify-center px-0",
                isActive
                  ? "bg-[#D1E4FC]"
                  : isAvailable
                  ? ""
                  : "cursor-not-allowed opacity-40"
              )}
            >
              <Icon
                size={18}
                strokeWidth={1}
                className={cn(
                  "shrink-0 transition-colors duration-150",
                  isActive ? "text-[#4B57DB]" : "text-[#A0A0A0]"
                )}
              />
              <motion.span
                animate={{ opacity: expanded ? 1 : 0 }}
                transition={{ duration: 0.15 }}
                className={cn(
                  "ml-2.5 whitespace-nowrap text-[13px]",
                  isActive ? "font-medium text-[#4B57DB]" : "text-[#6B6B6B]"
                )}
              >
                {item.label}
              </motion.span>
            </button>
          );
        })}
      </div>

      {/* Settings at bottom */}
      <div className="mt-auto px-2 pb-3">
        <button
          type="button"
          className={cn(
            "flex h-8 w-full items-center rounded-[4px] transition-colors duration-150",
            expanded ? "px-2" : "justify-center px-0"
          )}
        >
          <Settings
            size={18}
            strokeWidth={1}
            className="shrink-0 text-[#A0A0A0] transition-colors duration-150"
          />
          <motion.span
            animate={{ opacity: expanded ? 1 : 0 }}
            transition={{ duration: 0.15 }}
            className="ml-2.5 whitespace-nowrap text-[13px] text-[#6B6B6B]"
          >
            Settings
          </motion.span>
        </button>
      </div>
    </motion.nav>
  );
}
