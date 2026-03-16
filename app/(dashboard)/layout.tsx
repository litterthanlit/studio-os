import type { ReactNode } from "react";
import { Sidebar } from "@/components/navigation/sidebar";
import { CommandPalette } from "@/components/navigation/command-palette";
import { NewProjectModalProvider } from "@/components/new-project-modal";
import { AsciiHoverBackground } from "@/components/animations/ascii-hover";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <NewProjectModalProvider>
      <div className="flex h-screen bg-[#FAFAF8]">
        {/* Left Sidebar — collapsible */}
        <Sidebar />

        {/* Main Content Area — fills remaining space */}
        <main className="flex-1 overflow-y-auto bg-[#FAFAF8]">
          <div className="mx-auto max-w-7xl px-8 py-8">
            {children}
          </div>
        </main>

        {/* Command Palette — fixed overlay, keyboard-triggered */}
        <CommandPalette showTrigger={false} />

        {/* Global Ascii Cursor Hover Effect */}
        <AsciiHoverBackground />
      </div>
    </NewProjectModalProvider>
  );
}
