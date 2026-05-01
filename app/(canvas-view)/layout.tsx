import type { ReactNode } from "react";
import { NewProjectModalProvider } from "@/components/new-project-modal";
import { CommandPalette } from "@/components/navigation/command-palette";

export default function CanvasLayout({ children }: { children: ReactNode }) {
  return (
    <NewProjectModalProvider>
      <div className="flex h-screen overflow-clip bg-[#121218]">
        {/* MiniRail is rendered inside UnifiedCanvasView (where panel toggle state lives) */}

        {/* Canvas area — fills remaining space, NO max-width, NO scroll */}
        <main className="flex-1 overflow-hidden flex flex-col">
          {children}
        </main>

        <CommandPalette showTrigger={false} />
      </div>
    </NewProjectModalProvider>
  );
}
