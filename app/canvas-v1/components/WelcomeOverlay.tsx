"use client";

/**
 * Welcome Overlay — shown on first visit when `studio-os:onboarding-seen`
 * is not set in localStorage. Teaches the core loop in 5 scannable steps
 * and offers two paths: open a sample project or start from scratch.
 */

import * as React from "react";
import { persistSampleProject } from "@/lib/canvas/sample-project";

// ── Constants ────────────────────────────────────────────────────────────────

const ONBOARDING_KEY = "studio-os:onboarding-seen";

const STEPS = [
  { num: "1", text: "Drop in references", desc: "screenshots, moodboards, anything that represents the vibe" },
  { num: "2", text: "Generate", desc: "AI builds a site that matches your taste" },
  { num: "3", text: "Edit", desc: "select, move, resize, restyle. It's a real editor." },
  { num: "4", text: "Refine", desc: "use the Prompt tab to push the design further" },
  { num: "5", text: "Export", desc: "copy the HTML and ship it" },
];

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useWelcomeOverlay() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = window.localStorage.getItem(ONBOARDING_KEY);
    if (!seen) {
      setVisible(true);
    }
  }, []);

  const dismiss = React.useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ONBOARDING_KEY, "true");
    }
    setVisible(false);
  }, []);

  const show = React.useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(ONBOARDING_KEY);
    }
    setVisible(true);
  }, []);

  return { visible, dismiss, show };
}

// ── Component ────────────────────────────────────────────────────────────────

type WelcomeOverlayProps = {
  visible: boolean;
  onDismiss: () => void;
};

export function WelcomeOverlay({ visible, onDismiss }: WelcomeOverlayProps) {
  // Handle Escape key
  React.useEffect(() => {
    if (!visible) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onDismiss();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [visible, onDismiss]);

  if (!visible) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onDismiss();
    }
  };

  const handleOpenSample = () => {
    const projectId = persistSampleProject();
    onDismiss();
    // Navigate to the sample project canvas
    window.location.href = `/canvas?project=${encodeURIComponent(projectId)}`;
  };

  const handleStartScratch = () => {
    onDismiss();
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}
      onClick={handleBackdropClick}
    >
      <div
        className="bg-[#FFFFFF] border border-[#E5E5E0] rounded-[4px] w-full max-w-[480px] mx-4 shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
      >
        {/* Content */}
        <div className="px-8 pt-8 pb-6">
          <h2
            id="welcome-title"
            className="text-[22px] font-semibold text-[#1A1A1A] mb-6"
            style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}
          >
            Welcome to Studio OS
          </h2>

          {/* Steps */}
          <ol className="space-y-3.5 mb-0 list-none p-0 m-0">
            {STEPS.map((step) => (
              <li key={step.num} className="flex gap-3 items-baseline">
                <span
                  className="text-[14px] font-medium text-[#1A1A1A] tabular-nums shrink-0"
                  style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}
                >
                  {step.num}.
                </span>
                <span
                  className="text-[14px] text-[#1A1A1A]"
                  style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}
                >
                  <span className="font-medium">{step.text}</span>
                  <span className="text-[#6B6B6B]"> — {step.desc}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        {/* CTAs */}
        <div className="px-8 pb-8 pt-2 flex gap-3">
          <button
            type="button"
            onClick={handleOpenSample}
            className="flex-1 h-10 rounded-[4px] bg-[#1E5DF2] text-white text-[14px] font-medium cursor-pointer border-none transition-colors duration-150 hover:bg-[#1A4FD6]"
            style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}
          >
            Open sample project
          </button>
          <button
            type="button"
            onClick={handleStartScratch}
            className="flex-1 h-10 rounded-[4px] border border-[#E5E5E0] bg-transparent text-[#6B6B6B] text-[14px] font-medium cursor-pointer transition-colors duration-150 hover:border-[#D1E4FC] hover:text-[#1E5DF2]"
            style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}
          >
            Start from scratch
          </button>
        </div>
      </div>
    </div>
  );
}
