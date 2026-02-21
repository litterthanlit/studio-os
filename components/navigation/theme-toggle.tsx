'use client';

import * as React from "react";
import { useTheme } from "next-themes";
import { SunIcon, MoonIcon } from "@/components/ui/icon";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Keep DOM in sync with next-themes (guards against anything reverting data-theme)
  React.useEffect(() => {
    if (!mounted || typeof document === "undefined" || !resolvedTheme) return;
    const current = document.documentElement.getAttribute("data-theme");
    if (current !== resolvedTheme) {
      document.documentElement.setAttribute("data-theme", resolvedTheme);
    }
  }, [mounted, resolvedTheme]);

  if (!mounted) {
    return (
      <div className="flex items-center gap-3 h-9 px-3 w-full text-text-tertiary">
        <div className="w-[18px] h-[18px]" />
        <span className="text-sm">Theme</span>
      </div>
    );
  }

  const isDark = resolvedTheme === "dark";

  const handleToggle = () => {
    const next = isDark ? "light" : "dark";
    setTheme(next);
    // Apply theme to DOM immediately so UI updates before next-themes' effect runs
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", next);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="flex items-center gap-3 h-9 px-3 w-full text-text-tertiary hover:text-text-primary hover:bg-sidebar-hover transition-colors duration-150"
    >
      {isDark ? (
        <SunIcon className="w-[18px] h-[18px] shrink-0" bare />
      ) : (
        <MoonIcon className="w-[18px] h-[18px] shrink-0" bare />
      )}
      <span className="text-sm">{isDark ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}
