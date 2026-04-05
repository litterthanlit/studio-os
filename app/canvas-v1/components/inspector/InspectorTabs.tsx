"use client";

import { cn } from "@/lib/utils";

export type InspectorTabId = "design" | "css" | "export";

type InspectorTabsProps = {
  activeTab: InspectorTabId;
  onTabChange: (tab: InspectorTabId) => void;
};

const tabs: Array<{ id: InspectorTabId; label: string }> = [
  { id: "design", label: "Design" },
  { id: "css", label: "CSS" },
  { id: "export", label: "Export" },
];

export function InspectorTabs({ activeTab, onTabChange }: InspectorTabsProps) {
  return (
    <div className="flex border-b-[0.5px] border-[#EFEFEC] dark:border-[#333333] px-4 sticky top-0 bg-white dark:bg-[#1A1A1A] z-10">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "py-2.5 px-3 text-[10px] font-mono uppercase tracking-[1px] transition-colors cursor-pointer flex items-center gap-1.5",
            activeTab === tab.id
              ? "text-[#0A0A0A] dark:text-[#FFFFFF] font-semibold border-b-[1.5px] border-[#4B57DB]"
              : "text-[#A0A0A0] dark:text-[#666666] hover:text-[#6B6B6B] dark:hover:text-[#D0D0D0] border-b-[1.5px] border-transparent"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
