import type { ReactNode } from "react";
import { Dock } from "@/components/navigation/dock";
import { CommandPalette } from "@/components/navigation/command-palette";
import { NewProjectModalProvider } from "@/components/new-project-modal";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <NewProjectModalProvider>
      <>
        <div className="flex w-full flex-1 justify-center px-6 pt-8 pb-24 md:px-16 md:pt-12">
          <div className="w-full max-w-[800px]">
            <main className="pb-8">{children}</main>
          </div>
        </div>

        <div className="flex min-h-screen flex-col items-center bg-black">
          {/* Fixed top-right search */}
          <div className="fixed right-5 top-5 z-30">
            <CommandPalette />
          </div>

          <Dock />
        </div>
      </>
    </NewProjectModalProvider>
  );
}
