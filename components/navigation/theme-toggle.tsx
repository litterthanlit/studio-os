'use client';

import * as React from "react";
import { MoonIcon as Moon } from "@/components/ui/icon";

/**
 * Studio OS is a dark-mode-only tool — the entire component library is built
 * with hardcoded dark values. This indicator communicates that intentionally
 * instead of showing a broken toggle.
 */
export function ThemeToggle() {
  return (
    <div
      aria-label="Dark mode"
      title="Studio OS is dark mode only"
      className="flex h-8 w-8 items-center justify-center opacity-30"
    >
      <Moon className="h-4 w-4 text-gray-400" />
    </div>
  );
}
