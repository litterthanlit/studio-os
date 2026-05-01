"use client";

import { cn } from "@/lib/utils";

export type InspectorTabId = "design" | "css" | "export";

type InspectorTabsProps = {
  activeTab: InspectorTabId;
  onTabChange: (tab: InspectorTabId) => void;
};

const tabs: Array<{ id: InspectorTabId; label: string }> = [
  { id: "design", label: "Design" },
  { id: "css", label: "Inspect" },
];

export function InspectorTabs({ activeTab, onTabChange }: InspectorTabsProps) {
  return (
    <div
      className="flex border-b border-[#26262c] bg-[#101014]"
      role="tablist"
      aria-label="Inspector"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          id={`inspector-tab-${tab.id}`}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "h-10 flex-1 justify-center border-r border-[#26262c] px-3 text-[12px] font-medium transition-colors cursor-pointer flex items-center last:border-r-0",
            activeTab === tab.id
              ? "bg-[#151519] text-[#f2f2f2]"
              : "bg-[#101014] text-[#8f8f98] hover:text-[#d7d7dc]"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
