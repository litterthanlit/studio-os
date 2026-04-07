"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import {
  readEditorThemePreference,
  writeEditorThemePreference,
  type EditorThemePreference,
} from "@/lib/editor-theme-preference";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LS_PROFILE_KEY = "studio-os:profile";

function getStoredProfile(): { name: string } {
  if (typeof window === "undefined") return { name: "Nick" };
  try {
    return JSON.parse(localStorage.getItem(LS_PROFILE_KEY) ?? '{"name":"Nick"}');
  } catch {
    return { name: "Nick" };
  }
}

function saveProfile(profile: { name: string }) {
  localStorage.setItem(LS_PROFILE_KEY, JSON.stringify(profile));
}

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
    <label className="mb-1.5 block text-[12px] font-medium text-[#6B6B6B]">
      {children}
    </label>
  );
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-[11px] text-[#A0A0A0]">{children}</p>;
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
      <div className="rounded-[6px] border border-[#E5E5E0] bg-white p-6 space-y-5">
        {children}
      </div>
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
        <div className="text-[13px] text-[#1A1A1A]">{name}</div>
        <div className="text-[11px] text-[#A0A0A0] mt-0.5">{description}</div>
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
          className="rounded-[4px] border border-[#E5E5E0] px-3 py-2 text-[12px] text-[#6B6B6B] transition-colors duration-150 hover:border-[#D1E4FC] hover:text-[#4B57DB]"
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

  React.useEffect(() => {
    const profile = getStoredProfile();
    setName(profile.name);
    setLummiKey(localStorage.getItem("studio-os:lummi-key") ?? "");
    setEditorChromeTheme(readEditorThemePreference());
    setMounted(true);
  }, []);

  function saveName() {
    saveProfile({ name });
    setNameDirty(false);
  }

  function handleTheme(value: string) {
    setTheme(value);
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute(
        "data-theme",
        value === "system"
          ? window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
          : value
      );
    }
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
  }

  const lummiConnected = !!lummiKey.trim();
  const activeTheme = mounted ? (resolvedTheme ?? "system") : null;
  const themeOptions = ["light", "dark", "system"] as const;

  return (
    <div className="relative z-10 mx-auto max-w-[600px] animate-in fade-in slide-in-from-bottom-2 pt-16 pb-20 duration-300 ease-out">
      {/* ── Header ── */}
      <div className="mb-12">
        <span className="mono-kicker mb-3 block">Studio OS</span>
        <h1 className="font-serif text-[28px] font-normal tracking-[-0.02em] text-[#1A1A1A] leading-[1.1]">
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
                className="w-48 border border-[#E5E5E0] rounded-[2px] bg-white px-3 py-2 text-[13px] text-[#1A1A1A] placeholder:text-[#A0A0A0] outline-none transition-colors focus:border-[#D1E4FC] focus:ring-2 focus:ring-[#D1E4FC]/40"
              />
              {nameDirty && (
                <button
                  type="button"
                  onClick={saveName}
                  className="rounded-[4px] bg-[#4B57DB] px-3 py-2 text-[12px] font-medium text-white transition-colors hover:bg-[#3D49C7]"
                >
                  Save
                </button>
              )}
            </div>
          </div>
          <div>
            <FieldLabel>Email</FieldLabel>
            <span className="text-[13px] text-[#A0A0A0]">Sign in to set your email</span>
          </div>
        </SectionGroup>

        {/* ── Appearance ── */}
        <SectionGroup label="Appearance">
          <div>
            <FieldLabel>Dashboard & marketing theme</FieldLabel>
            <FieldHint>Applies to home, projects, and this settings page.</FieldHint>
            <div className="inline-flex mt-2">
              {themeOptions.map((t, i) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTheme(t)}
                  className={cn(
                    "border px-4 py-2 text-[13px] transition-colors duration-150",
                    i === 0 && "rounded-l-[4px] rounded-r-none",
                    i === 1 && "rounded-none border-x-0",
                    i === 2 && "rounded-r-[4px] rounded-l-none",
                    activeTheme === t
                      ? "border-[#4B57DB] bg-[#4B57DB] text-white"
                      : "border-[#E5E5E0] bg-white text-[#6B6B6B] hover:border-[#D1E4FC]"
                  )}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <FieldLabel>Editor chrome</FieldLabel>
            <FieldHint>
              Fullscreen canvas: panel chrome and the infinite workspace follow light or dark; frames stay a light
              “paper” surface. Syncs with the rail theme control.
            </FieldHint>
            <div className="inline-flex mt-2">
              {themeOptions.map((t, i) => (
                <button
                  key={`editor-${t}`}
                  type="button"
                  onClick={() => {
                    writeEditorThemePreference(t);
                    setEditorChromeTheme(t);
                  }}
                  className={cn(
                    "border px-4 py-2 text-[13px] transition-colors duration-150",
                    i === 0 && "rounded-l-[4px] rounded-r-none",
                    i === 1 && "rounded-none border-x-0",
                    i === 2 && "rounded-r-[4px] rounded-l-none",
                    editorChromeTheme === t
                      ? "border-[#4B57DB] bg-[#4B57DB] text-white"
                      : "border-[#E5E5E0] bg-white text-[#6B6B6B] hover:border-[#D1E4FC]"
                  )}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </SectionGroup>

        {/* ── Integrations ── */}
        <SectionGroup label="Integrations">
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
                className="flex-1 border border-[#E5E5E0] rounded-[2px] bg-white px-3 py-2 text-[13px] text-[#1A1A1A] font-mono placeholder:text-[#A0A0A0] outline-none transition-colors focus:border-[#D1E4FC] focus:ring-2 focus:ring-[#D1E4FC]/40"
              />
              <button
                type="button"
                onClick={saveLummiKey}
                className="rounded-[4px] bg-[#4B57DB] px-3 py-2 text-[12px] font-medium text-white transition-colors hover:bg-[#3D49C7]"
              >
                Save
              </button>
            </div>
          )}
          <IntegrationRow
            name="Are.na"
            description="Import channels as reference boards"
            connected={false}
            onConnect={() => window.open("https://www.are.na", "_blank")}
          />
          <IntegrationRow
            name="Pinterest"
            description="Import boards and pins as references"
            connected={false}
            onConnect={() => { window.location.href = "/api/auth/pinterest"; }}
          />
        </SectionGroup>

        {/* ── Data ── */}
        <SectionGroup label="Data">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[13px] text-[#1A1A1A]">Export all projects</div>
              <FieldHint>Downloads a JSON file with all your projects and tasks</FieldHint>
            </div>
            <button
              type="button"
              onClick={exportAllProjects}
              className="shrink-0 rounded-[4px] border border-[#E5E5E0] px-3 py-2 text-[12px] text-[#6B6B6B] transition-colors duration-150 hover:border-[#D1E4FC] hover:text-[#4B57DB]"
            >
              Export JSON
            </button>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[13px] text-[#1A1A1A]">Clear all data</div>
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
            <span className="text-[13px] text-[#1A1A1A]">Version</span>
            <span className="font-mono text-[12px] text-[#A0A0A0]">0.1.0</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-[#1A1A1A]">Studio OS</span>
            <span className="text-[12px] text-[#A0A0A0]">Built for designers who think in systems.</span>
          </div>
        </SectionGroup>
      </div>
    </div>
  );
}
