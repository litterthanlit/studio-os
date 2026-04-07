/**
 * Persisted editor chrome theme (canvas route only).
 * Dashboard / marketing stay light unless widened later.
 */

export const EDITOR_THEME_STORAGE_KEY = "studio-os:editor-theme-preference";

export type EditorThemePreference = "light" | "dark" | "system";

export function readEditorThemePreference(): EditorThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    const raw = localStorage.getItem(EDITOR_THEME_STORAGE_KEY);
    if (raw === "light" || raw === "dark" || raw === "system") return raw;
  } catch {
    /* ignore */
  }
  return "system";
}

export function writeEditorThemePreference(value: EditorThemePreference): void {
  try {
    localStorage.setItem(EDITOR_THEME_STORAGE_KEY, value);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent<EditorThemePreference>("studio-os:editor-theme-preference", { detail: value })
      );
    }
  } catch {
    /* ignore */
  }
}

export function resolveEditorEffectiveTheme(
  preference: EditorThemePreference,
  prefersDark: boolean
): "light" | "dark" {
  if (preference === "system") return prefersDark ? "dark" : "light";
  return preference;
}
