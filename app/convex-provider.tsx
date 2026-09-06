"use client";

import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode, useMemo } from "react";
import { ConvexUserSync } from "@/components/convex-user-sync";
import { getPublicConvexUrl } from "@/lib/convex/is-configured";

export function StudioConvexProvider({ children }: { children: ReactNode }) {
  const convexUrl = getPublicConvexUrl();
  const client = useMemo(
    () => new ConvexReactClient(convexUrl || "https://placeholder.convex.cloud"),
    [convexUrl],
  );

  if (!convexUrl) {
    return <ConvexProvider client={client}>{children}</ConvexProvider>;
  }

  return (
    <ConvexAuthProvider client={client}>
      <ConvexUserSync />
      {children}
    </ConvexAuthProvider>
  );
}
