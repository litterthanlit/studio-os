import type { ReactNode } from "react";
import { Sidebar } from "@/components/navigation/sidebar";
import { CommandPalette } from "@/components/navigation/command-palette";
import { NewProjectModalProvider } from "@/components/new-project-modal";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <NewProjectModalProvider>
      <div className="app-shell flex h-screen">
        {/* Left Sidebar — collapsible */}
        <Sidebar />

        {/* Main Content Area — fills remaining space */}
        <main className="relative flex-1 overflow-y-auto bg-transparent">
          <div className="mx-auto max-w-7xl px-8 py-8">
            {children}
          </div>
        </main>

        {/* Command Palette — fixed overlay, keyboard-triggered */}
        <CommandPalette showTrigger={false} />
      </div>
    </NewProjectModalProvider>
  );
}
