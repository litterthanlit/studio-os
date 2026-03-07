import type { ReactNode } from "react";
import { Sidebar } from "@/components/navigation/sidebar";
import { NewProjectModalProvider } from "@/components/new-project-modal";
import { CommandPalette } from "@/components/navigation/command-palette";

export default function CanvasLayout({ children }: { children: ReactNode }) {
  return (
    <NewProjectModalProvider>
      <div className="flex h-screen overflow-hidden bg-bg-primary">
        {/* Left Sidebar — fixed width, same as dashboard */}
        <Sidebar />

        {/* Canvas area — fills remaining space, NO max-width, NO scroll */}
        <main className="flex-1 overflow-hidden flex flex-col">
          {children}
        </main>

        <CommandPalette showTrigger={false} />
      </div>
    </NewProjectModalProvider>
  );
}
