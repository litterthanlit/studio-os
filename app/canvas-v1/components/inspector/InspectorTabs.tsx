"use client";

import { cn } from "@/lib/utils";

export type InspectorTabId = "design" | "css" | "ai";

type InspectorTabsProps = {
  activeTab: InspectorTabId;
  onTabChange: (tab: InspectorTabId) => void;
  isGenerating?: boolean;
};

const tabs: Array<{ id: InspectorTabId; label: string }> = [
  { id: "design", label: "Design" },
  { id: "css", label: "CSS" },
  { id: "ai", label: "AI" },
];

export function InspectorTabs({ activeTab, onTabChange, isGenerating }: InspectorTabsProps) {
  return (
    <div className="flex border-b border-[#E5E5E0] px-4 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "py-2.5 px-3 text-[12px] font-medium transition-colors cursor-pointer border-b-2 flex items-center gap-1.5",
            activeTab === tab.id
              ? "text-[#1A1A1A] border-[#1E5DF2]"
              : "text-[#A0A0A0] hover:text-[#6B6B6B] border-transparent"
          )}
        >
          {tab.label}
          {/* Generating pulse dot on AI tab */}
          {tab.id === "ai" && isGenerating && (
            <span className="relative flex h-[6px] w-[6px]">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1E5DF2] opacity-75" />
              <span className="relative inline-flex rounded-full h-[6px] w-[6px] bg-[#1E5DF2]" />
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
