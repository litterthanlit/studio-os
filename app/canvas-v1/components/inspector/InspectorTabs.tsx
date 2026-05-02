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
  { id: "export", label: "Export" },
];

export function InspectorTabs({ activeTab, onTabChange }: InspectorTabsProps) {
  return (
    <div
      className="flex border-b border-[var(--inspector-border)] bg-[var(--inspector-bg)]"
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
            "flex h-10 flex-1 cursor-pointer items-center justify-center border-r border-[var(--inspector-border)] px-3 text-[12px] font-medium transition-colors last:border-r-0",
            activeTab === tab.id
              ? "bg-[var(--inspector-surface)] text-[var(--text-primary)]"
              : "bg-[var(--inspector-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
