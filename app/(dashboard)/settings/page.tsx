"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import {
  EDITOR_THEME_STORAGE_KEY,
  readEditorThemePreference,
  writeEditorThemePreference,
  type EditorThemePreference,
} from "@/lib/editor-theme-preference";
import { readStoredProfile, writeStoredProfile } from "@/lib/profile-store";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function exportAllProjects() {
  try {
    const projects = JSON.parse(localStorage.getItem("studio-os:projects") ?? "[]");
    const tasks = JSON.parse(localStorage.getItem("studio-os-tasks") ?? "[]");
    const blob = new Blob(
      [JSON.stringify({ projects, tasks, exportedAt: new Date().toISOString() }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `studio-os-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch { /* ignore */ }
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-[12px] font-medium text-text-secondary">
      {children}
    </label>
  );
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-[11px] text-text-muted">{children}</p>;
}

function SectionGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span className="mono-kicker mb-3 block">{label}</span>
      <div className="rounded-[6px] border border-border bg-card-bg p-6 space-y-5">
        {children}
      </div>
    </div>
  );
}

function SegmentedThemeControl({
  value,
  onChange,
  options,
}: {
  value: string | null;
  onChange: (v: string) => void;
  options: readonly string[];
}) {
  return (
    <div className="inline-flex mt-2 rounded-[6px] border border-border bg-card-bg p-0.5">
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            aria-pressed={active}
            className={cn(
              "rounded-[4px] px-4 py-2 text-[13px] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4B57DB]/30",
              active
                ? "bg-[#4B57DB] text-white"
                : "bg-transparent text-text-secondary hover:bg-surface-hover"
            )}
          >
            {opt.charAt(0).toUpperCase() + opt.slice(1)}
          </button>
        );
      })}
    </div>
  );
}

function IntegrationRow({
  name,
  description,
  connected,
  onConnect,
}: {
  name: string;
  description: string;
  connected: boolean;
  onConnect?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-[#E5E5E0] last:border-0">
      <div className="min-w-0">
        <div className="text-[13px] text-text-primary">{name}</div>
        <div className="text-[11px] text-text-muted mt-0.5">{description}</div>
      </div>
      {connected ? (
        <span className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-600">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Connected
        </span>
      ) : (
        <button
          type="button"
          onClick={onConnect}
          className="rounded-[4px] border border-border px-3 py-2 text-[12px] text-text-secondary transition-colors duration-150 hover:border-border-hover hover:text-accent"
        >
          Connect
        </button>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [name, setName] = React.useState("Nick");
  const [nameDirty, setNameDirty] = React.useState(false);
  const [clearConfirm, setClearConfirm] = React.useState(false);
  const [lummiKey, setLummiKey] = React.useState("");
  const [showLummiInput, setShowLummiInput] = React.useState(false);
  const [editorChromeTheme, setEditorChromeTheme] = React.useState<EditorThemePreference>("system");
  const [savedNotice, setSavedNotice] = React.useState<"" | "name" | "lummi">("");

  React.useEffect(() => {
    const profile = readStoredProfile();
    setName(profile.name);
    setLummiKey(localStorage.getItem("studio-os:lummi-key") ?? "");
    setEditorChromeTheme(readEditorThemePreference());
    setMounted(true);
  }, []);

  React.useEffect(() => {
    const onThemePref = (e: Event) => {
      const ce = e as CustomEvent<EditorThemePreference>;
      if (ce.detail === "light" || ce.detail === "dark" || ce.detail === "system") {
        setEditorChromeTheme(ce.detail);
      }
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key !== EDITOR_THEME_STORAGE_KEY || e.storageArea !== localStorage) return;
      if (e.newValue === "light" || e.newValue === "dark" || e.newValue === "system") {
        setEditorChromeTheme(e.newValue);
      }
    };
    window.addEventListener("studio-os:editor-theme-preference", onThemePref);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("studio-os:editor-theme-preference", onThemePref);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  React.useEffect(() => {
    if (!savedNotice) return;
    const timeout = setTimeout(() => setSavedNotice(""), 1500);
    return () => clearTimeout(timeout);
  }, [savedNotice]);

  function saveName() {
    writeStoredProfile({ name: name.trim() || "Nick" });
    setName((prev) => prev.trim() || "Nick");
    setNameDirty(false);
    setSavedNotice("name");
  }

  function handleTheme(value: string) {
    setTheme(value);
  }

  function handleClearData() {
    if (!clearConfirm) {
      setClearConfirm(true);
      return;
    }
    const keysToRemove = Object.keys(localStorage).filter((k) =>
      k.startsWith("studio-os")
    );
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    setClearConfirm(false);
    window.location.reload();
  }

  function saveLummiKey() {
    if (lummiKey.trim()) {
      localStorage.setItem("studio-os:lummi-key", lummiKey.trim());
    } else {
      localStorage.removeItem("studio-os:lummi-key");
    }
    setShowLummiInput(false);
    setSavedNotice("lummi");
  }

  const lummiConnected = !!lummiKey.trim();
  const activeTheme = mounted ? (resolvedTheme ?? "system") : null;
  const themeOptions = ["light", "dark", "system"] as const;

  return (
    <div className="relative z-10 mx-auto max-w-[600px] animate-in fade-in slide-in-from-bottom-2 pt-16 pb-20 duration-300 ease-out text-text-primary">
      {/* ── Header ── */}
      <div className="mb-12">
        <span className="mono-kicker mb-3 block">Studio OS</span>
        <h1 className="font-serif text-[28px] font-normal tracking-[-0.02em] text-text-primary leading-[1.1]">
          Settings
        </h1>
      </div>

      <div className="space-y-12">
        {/* ── Account ── */}
        <SectionGroup label="Account">
          <div>
            <FieldLabel>Name</FieldLabel>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setNameDirty(true); }}
                onKeyDown={(e) => { if (e.key === "Enter") saveName(); }}
                className="w-56 border border-border rounded-[2px] bg-bg-input px-3 py-2 text-[13px] text-text-primary placeholder:text-text-muted outline-none transition-colors focus:border-border-hover focus:ring-2 focus:ring-accent-light/50"
              />
              {nameDirty && (
                <button
                  type="button"
                  onClick={saveName}
                  className="rounded-[4px] bg-button-primary-bg px-3 py-2 text-[12px] font-medium text-button-primary-text transition-colors hover:bg-accent-hover"
                >
                  Save
                </button>
              )}
              {savedNotice === "name" && (
                <span className="text-[11px] font-mono text-emerald-600">Saved</span>
              )}
            </div>
          </div>
        </SectionGroup>

        {/* ── Appearance ── */}
        <SectionGroup label="Appearance">
          <div>
            <FieldLabel>Dashboard & marketing theme</FieldLabel>
            <FieldHint>Applies to home, projects, and this settings page.</FieldHint>
            <SegmentedThemeControl value={activeTheme} onChange={handleTheme} options={themeOptions} />
          </div>
          <div>
            <FieldLabel>Editor chrome</FieldLabel>
            <FieldHint>
              Fullscreen canvas: panel chrome and the infinite workspace follow light or dark; frames stay a light
              “paper” surface. Syncs with the rail theme control.
            </FieldHint>
            <SegmentedThemeControl
              value={editorChromeTheme}
              onChange={(v) => {
                const next = v as EditorThemePreference;
                writeEditorThemePreference(next);
                setEditorChromeTheme(next);
              }}
              options={themeOptions}
            />
          </div>
        </SectionGroup>

        {/* ── Connections ── */}
        <SectionGroup label="Connections">
          <IntegrationRow
            name="Lummi API"
            description="Powers the daily inspiration grid"
            connected={lummiConnected}
            onConnect={() => setShowLummiInput(true)}
          />
          {showLummiInput && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={lummiKey}
                onChange={(e) => setLummiKey(e.target.value)}
                placeholder="Paste Lummi API key..."
                autoFocus
                className="flex-1 border border-border rounded-[2px] bg-bg-input px-3 py-2 text-[13px] text-text-primary font-mono placeholder:text-text-muted outline-none transition-colors focus:border-border-hover focus:ring-2 focus:ring-accent-light/50"
              />
              <button
                type="button"
                onClick={saveLummiKey}
                className="rounded-[4px] bg-button-primary-bg px-3 py-2 text-[12px] font-medium text-button-primary-text transition-colors hover:bg-accent-hover"
              >
                Save
              </button>
              {savedNotice === "lummi" && (
                <span className="text-[11px] font-mono text-emerald-600">Saved</span>
              )}
            </div>
          )}
        </SectionGroup>

        {/* ── Data ── */}
        <SectionGroup label="Data">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[13px] text-text-primary">Export all projects</div>
              <FieldHint>Downloads a JSON file with all your projects and tasks</FieldHint>
            </div>
            <button
              type="button"
              onClick={exportAllProjects}
              className="shrink-0 rounded-[4px] border border-border px-3 py-2 text-[12px] text-text-secondary transition-colors duration-150 hover:border-border-hover hover:text-accent"
            >
              Export JSON
            </button>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[13px] text-text-primary">Clear all data</div>
              <FieldHint>Removes all projects, tasks, and preferences from this browser</FieldHint>
            </div>
            <button
              type="button"
              onClick={handleClearData}
              className={cn(
                "shrink-0 text-[13px] transition-colors duration-150",
                clearConfirm
                  ? "text-red-600 hover:text-red-700"
                  : "text-red-500 hover:text-red-600"
              )}
            >
              {clearConfirm ? "Confirm clear" : "Clear data"}
            </button>
          </div>
        </SectionGroup>

        {/* ── About ── */}
        <SectionGroup label="About">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-text-primary">Version</span>
            <span className="font-mono text-[12px] text-text-muted">0.1.0</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-text-primary">Studio OS</span>
            <span className="text-[12px] text-text-muted">Built for designers who think in systems.</span>
          </div>
        </SectionGroup>
      </div>
    </div>
  );
}
