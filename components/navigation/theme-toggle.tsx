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

  if (!mounted) {
    return (
      <div className="flex items-center gap-3 h-9 px-3 w-full text-text-tertiary">
        <div className="w-[18px] h-[18px]" />
        <span className="text-sm">Theme</span>
      </div>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
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
