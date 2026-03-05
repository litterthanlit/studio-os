import type { ReactNode } from "react";
import { Sidebar } from "@/components/navigation/sidebar";
import { CommandPalette } from "@/components/navigation/command-palette";
import { NewProjectModalProvider } from "@/components/new-project-modal";

export default function CanvasLayout({ children }: { children: ReactNode }) {
  return (
    <NewProjectModalProvider>
      <div className="flex h-screen bg-bg-primary">
        <Sidebar />
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
        <CommandPalette showTrigger={false} />
      </div>
    </NewProjectModalProvider>
  );
}
