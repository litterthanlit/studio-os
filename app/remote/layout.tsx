import type { ReactNode } from "react";

export default function RemoteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen w-screen overflow-hidden">
      {children}
    </div>
  );
}
