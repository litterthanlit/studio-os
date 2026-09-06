"use client";

import { useMutation } from "convex/react";
import { useConvexAuth } from "convex/react";
import { useEffect, useRef } from "react";
import { api } from "@/convex/_generated/api";
import { isConvexConfigured } from "@/lib/convex/is-configured";

export function ConvexUserSync() {
  const configured = isConvexConfigured();
  const { isAuthenticated } = useConvexAuth();
  const storeCurrent = useMutation(api.users.storeCurrent);
  const syncedForSession = useRef(false);

  useEffect(() => {
    if (!configured || !isAuthenticated) {
      syncedForSession.current = false;
      return;
    }
    if (syncedForSession.current) return;
    syncedForSession.current = true;
    void storeCurrent({}).catch(() => {
      syncedForSession.current = false;
    });
  }, [configured, isAuthenticated, storeCurrent]);

  return null;
}
