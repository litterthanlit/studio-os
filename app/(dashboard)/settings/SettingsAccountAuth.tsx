"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { isConvexConfigured } from "@/lib/convex/is-configured";

export function SettingsAccountAuth() {
  if (!isConvexConfigured()) {
    return (
      <p className="text-[13px] text-text-muted">
        Cloud auth isn’t configured. Set NEXT_PUBLIC_CONVEX_URL and Convex Auth env vars.
      </p>
    );
  }
  return <SettingsAccountAuthInner />;
}

function SettingsAccountAuthInner() {
  const { signOut } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const currentUser = useQuery(api.users.current, {});

  if (isLoading || (isAuthenticated && currentUser === undefined)) {
    return <p className="text-[13px] text-text-muted">Checking sign-in…</p>;
  }

  if (!currentUser) {
    return (
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-[13px] text-text-primary">Not signed in</div>
          <p className="mt-1 text-[11px] text-text-muted">
            Sign in to sync projects and mint agent tokens.
          </p>
        </div>
        <a
          href="/auth/login?next=/settings"
          className="shrink-0 rounded-[4px] bg-button-primary-bg px-3 py-2 text-[12px] font-medium text-button-primary-text hover:bg-accent-hover"
        >
          Sign in
        </a>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="text-[13px] text-text-primary">Signed in</div>
        <p className="mt-1 truncate font-mono text-[11px] text-text-muted">
          {currentUser.email ?? currentUser.name ?? currentUser._id}
        </p>
      </div>
      <button
        type="button"
        onClick={() => void signOut()}
        className="shrink-0 rounded-[4px] border border-border px-3 py-2 text-[12px] text-text-secondary hover:border-border-hover hover:text-accent"
      >
        Sign out
      </button>
    </div>
  );
}
