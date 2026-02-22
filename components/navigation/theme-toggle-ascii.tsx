'use client';

import * as React from "react";
import { useTheme } from "next-themes";
import { AsciiThemeRipple } from "@/components/animations/AsciiThemeRipple";

export function ThemeToggleAscii() {
  const { resolvedTheme, setTheme } = useTheme();
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

  const handleToggle = () => {
    const next = isDark ? "light" : "dark";
    setTheme(next);
    // Apply theme to DOM immediately so UI updates before next-themes' effect runs
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", next);
    }
  };

  return (
    <AsciiThemeRipple 
      isDark={isDark} 
      onToggle={handleToggle} 
    />
  );
}
