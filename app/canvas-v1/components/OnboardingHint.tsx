"use client";

/**
 * Lightweight one-time hint tooltip for onboarding cues.
 * Shows once, dismissed on click or when the relevant action is taken.
 * State is persisted per hint key in localStorage.
 */

import * as React from "react";

const HINT_PREFIX = "studio-os:hint-";

type OnboardingHintProps = {
  hintKey: string;
  text: string;
  className?: string;
};

/**
 * Check if a hint has been seen (useful in parent components to conditionally render).
 */
export function isHintSeen(hintKey: string): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(`${HINT_PREFIX}${hintKey}`) === "true";
}

/**
 * Mark a hint as seen.
 */
export function markHintSeen(hintKey: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`${HINT_PREFIX}${hintKey}`, "true");
}

/**
 * A small floating hint that appears once and is dismissed on click.
 */
export function OnboardingHint({ hintKey, text, className }: OnboardingHintProps) {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (!isHintSeen(hintKey)) {
      setVisible(true);
    }
  }, [hintKey]);

  const handleDismiss = React.useCallback(() => {
    markHintSeen(hintKey);
    setVisible(false);
  }, [hintKey]);

  if (!visible) return null;

  return (
    <div
      role="status"
      onClick={handleDismiss}
      className={`
        text-[12px] text-[#6B6B6B] bg-[#FFFFFF] border border-[#E5E5E0]
        rounded-[4px] px-3 py-1.5 shadow-sm cursor-pointer
        transition-opacity duration-200
        ${className ?? ""}
      `.trim()}
      style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}
    >
      {text}
    </div>
  );
}
