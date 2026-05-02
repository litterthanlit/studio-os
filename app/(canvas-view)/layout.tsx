import type { ReactNode } from "react";
import { NewProjectModalProvider } from "@/components/new-project-modal";
import { CommandPalette } from "@/components/navigation/command-palette";

export default function CanvasLayout({ children }: { children: ReactNode }) {
  return (
    <NewProjectModalProvider>
      <div className="flex h-dvh w-[100dvw] max-w-[100dvw] min-w-0 overflow-clip bg-[#121218]">
        {/* MiniRail is rendered inside UnifiedCanvasView (where panel toggle state lives) */}

        {/* Canvas area — fills remaining space, NO max-width, NO scroll */}
        <main className="flex w-full min-w-0 max-w-full flex-1 flex-col overflow-hidden">
          {children}
        </main>

        <CommandPalette showTrigger={false} />
      </div>
    </NewProjectModalProvider>
  );
}
