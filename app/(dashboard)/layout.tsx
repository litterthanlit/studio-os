import type { ReactNode } from "react";
import { Sidebar } from "@/components/navigation/sidebar";
import { CommandPalette } from "@/components/navigation/command-palette";
import { NewProjectModalProvider } from "@/components/new-project-modal";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <NewProjectModalProvider>
      <div className="flex h-screen bg-bg-primary">
        {/* Left Sidebar — fixed width */}
        <Sidebar />

        {/* Main Content Area — fills remaining space */}
        <main
          className="flex-1 overflow-y-auto"
          style={{
            backgroundImage:
              "radial-gradient(circle, var(--dot-grid-color) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        >
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
