"use client";

import { cn } from "@/lib/utils";

export type InspectorTabId = "design" | "prompt" | "css" | "export";

type InspectorTabsProps = {
  activeTab: InspectorTabId;
  onTabChange: (tab: InspectorTabId) => void;
};

const tabs: Array<{ id: InspectorTabId; label: string }> = [
  { id: "design", label: "Design" },
  { id: "prompt", label: "Prompt" },
  { id: "css", label: "CSS" },
  { id: "export", label: "Export" },
];

export function InspectorTabs({ activeTab, onTabChange }: InspectorTabsProps) {
  return (
    <div
      className="flex border-b-[0.5px] border-sidebar-border px-3 sticky top-0 bg-card-bg z-10"
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
            "min-h-[40px] flex-1 justify-center py-3 px-2 text-[10px] font-mono uppercase tracking-[1px] transition-colors cursor-pointer flex items-center gap-1.5",
            activeTab === tab.id
              ? "text-text-primary font-semibold border-b-[1.5px] border-accent"
              : "text-text-muted hover:text-text-secondary border-b-[1.5px] border-transparent"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
