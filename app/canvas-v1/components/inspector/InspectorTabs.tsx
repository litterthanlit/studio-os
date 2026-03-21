"use client";

import { cn } from "@/lib/utils";

type InspectorTabsProps = {
  activeTab: "design" | "css";
  onTabChange: (tab: "design" | "css") => void;
};

const tabs: Array<{ id: "design" | "css"; label: string }> = [
  { id: "design", label: "Design" },
  { id: "css", label: "CSS" },
];

export function InspectorTabs({ activeTab, onTabChange }: InspectorTabsProps) {
  return (
    <div className="flex border-b border-[#E5E5E0] px-4 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "py-2.5 px-3 text-[12px] font-medium transition-colors cursor-pointer border-b-2",
            activeTab === tab.id
              ? "text-[#1A1A1A] border-[#1E5DF2]"
              : "text-[#A0A0A0] hover:text-[#6B6B6B] border-transparent"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
