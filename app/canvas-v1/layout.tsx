import type { ReactNode } from "react";
import { Sidebar } from "@/components/navigation/sidebar";
import { CommandPalette } from "@/components/navigation/command-palette";
import { NewProjectModalProvider } from "@/components/new-project-modal";
import { CanvasStageProvider } from "@/lib/canvas-stage-context";

export default function CanvasLayout({ children }: { children: ReactNode }) {
  return (
    <NewProjectModalProvider>
      <CanvasStageProvider>
        <div className="app-shell flex h-screen">
          <Sidebar />
          <main className="relative flex-1 overflow-hidden">
            {children}
          </main>
          <CommandPalette showTrigger={false} />
        </div>
      </CanvasStageProvider>
    </NewProjectModalProvider>
  );
}
