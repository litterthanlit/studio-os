"use client";

import * as React from "react";
import {
  EDITOR_THEME_STORAGE_KEY,
  readEditorThemePreference,
  writeEditorThemePreference,
  resolveEditorEffectiveTheme,
  type EditorThemePreference,
} from "@/lib/editor-theme-preference";

export function useEditorTheme() {
  const [preference, setPreferenceState] = React.useState<EditorThemePreference>("system");
  const [effectiveTheme, setEffectiveTheme] = React.useState<"light" | "dark">("light");
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setPreferenceState(readEditorThemePreference());
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    const onPref = (e: Event) => {
      const ce = e as CustomEvent<EditorThemePreference>;
      const v = ce.detail;
      if (v === "light" || v === "dark" || v === "system") setPreferenceState(v);
    };
    window.addEventListener("studio-os:editor-theme-preference", onPref);
    return () => window.removeEventListener("studio-os:editor-theme-preference", onPref);
  }, []);

  /** Other tabs / windows: localStorage changes do not fire `storage` in the writer's tab. */
  React.useEffect(() => {
    if (!hydrated) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== EDITOR_THEME_STORAGE_KEY || e.storageArea !== localStorage) return;
      if (e.newValue === "light" || e.newValue === "dark" || e.newValue === "system") {
        setPreferenceState(e.newValue);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [hydrated]);

  React.useEffect(() => {
    if (!hydrated) return;

    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      setEffectiveTheme(resolveEditorEffectiveTheme(preference, mql.matches));
    };
    apply();
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, [preference, hydrated]);

  const setPreference = React.useCallback((next: EditorThemePreference) => {
    writeEditorThemePreference(next);
    setPreferenceState(next);
  }, []);

  const cyclePreference = React.useCallback(() => {
    const order: EditorThemePreference[] = ["light", "dark", "system"];
    const i = order.indexOf(preference);
    setPreference(order[(i + 1) % order.length]);
  }, [preference, setPreference]);

  return { preference, effectiveTheme, setPreference, cyclePreference, hydrated };
}
