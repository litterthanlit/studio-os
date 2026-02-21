"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { SectionLabel } from "@/components/ui/section-label";

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

// ─── Row primitives ───────────────────────────────────────────────────────────

function SettingRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-[var(--border-subtle)] last:border-0">
      <div className="min-w-0">
        <div className="text-sm text-[var(--text-primary)]">{label}</div>
        {hint && <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-[var(--border-primary)] bg-[var(--card-bg)] px-4">
      {children}
    </div>
  );
}

// ─── Integration badge ────────────────────────────────────────────────────────

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
    <div className="flex items-center justify-between gap-4 py-3 border-b border-[var(--border-subtle)] last:border-0">
      <div className="min-w-0">
        <div className="text-sm text-[var(--text-primary)]">{name}</div>
        <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">{description}</div>
      </div>
      {connected ? (
        <span className="text-[11px] font-mono text-emerald-500 flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 bg-emerald-500" />
          Connected
        </span>
      ) : (
        <button
          type="button"
          onClick={onConnect}
          className="text-[11px] font-mono uppercase tracking-[0.1em] text-[var(--text-tertiary)] border border-[var(--border-primary)] px-2.5 py-1 transition-colors duration-150 hover:text-[var(--text-primary)] hover:border-[var(--border-hover)]"
        >
          Connect →
        </button>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { resolvedTheme, setTheme } = useTheme();
  const [name, setName] = React.useState("Nick");
  const [nameDirty, setNameDirty] = React.useState(false);
  const [clearConfirm, setClearConfirm] = React.useState(false);
  const [lummiKey, setLummiKey] = React.useState("");
  const [showLummiInput, setShowLummiInput] = React.useState(false);

  // Read stored profile and Lummi key on mount
  React.useEffect(() => {
    const profile = getStoredProfile();
    setName(profile.name);
    const envLummi = typeof window !== "undefined"
      ? document.cookie.includes("lummi") || !!localStorage.getItem("studio-os:lummi-key")
      : false;
    setLummiKey(localStorage.getItem("studio-os:lummi-key") ?? "");
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

  return (
    <section className="space-y-8 pb-20 max-w-[600px]">
      <h1 className="text-lg font-medium text-[var(--text-primary)]">Settings</h1>

      {/* ── Profile ── */}
      <div className="space-y-3">
        <SectionLabel>Profile</SectionLabel>
        <SectionCard>
          <SettingRow label="Name">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setNameDirty(true); }}
                onKeyDown={(e) => { if (e.key === "Enter") saveName(); }}
                className="w-36 border border-[var(--border-primary)] bg-[var(--bg-input)] px-2.5 py-1.5 text-sm text-[var(--text-primary)] outline-none transition-[border-color] duration-150 focus:border-[var(--accent)]"
              />
              {nameDirty && (
                <button
                  type="button"
                  onClick={saveName}
                  className="text-[11px] font-mono uppercase tracking-[0.1em] text-[var(--accent)] border border-[var(--accent)]/30 px-2.5 py-1.5 transition-colors duration-150 hover:bg-[var(--accent)]/10"
                >
                  Save
                </button>
              )}
            </div>
          </SettingRow>
          <SettingRow label="Email" hint="Sign in to set your email">
            <span className="text-[11px] font-mono text-[var(--text-tertiary)]">Not signed in</span>
          </SettingRow>
        </SectionCard>
      </div>

      {/* ── Appearance ── */}
      <div className="space-y-3">
        <SectionLabel>Appearance</SectionLabel>
        <SectionCard>
          <SettingRow label="Theme">
            <div className="flex items-center gap-1">
              {(["light", "dark", "system"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTheme(t)}
                  className={`px-3 py-1.5 text-[11px] font-mono uppercase tracking-[0.1em] border transition-colors duration-150 ${
                    resolvedTheme === t || (!resolvedTheme && t === "system")
                      ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/5"
                      : "border-[var(--border-primary)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </SettingRow>
        </SectionCard>
      </div>

      {/* ── Integrations ── */}
      <div className="space-y-3">
        <SectionLabel>Integrations</SectionLabel>
        <SectionCard>
          <div className="py-1">
            <IntegrationRow
              name="Lummi API"
              description="Powers the daily inspiration grid"
              connected={lummiConnected}
              onConnect={() => setShowLummiInput(true)}
            />
            {showLummiInput && (
              <div className="pb-3 pt-1 flex items-center gap-2">
                <input
                  type="text"
                  value={lummiKey}
                  onChange={(e) => setLummiKey(e.target.value)}
                  placeholder="Paste Lummi API key..."
                  autoFocus
                  className="flex-1 border border-[var(--border-primary)] bg-[var(--bg-input)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none transition-[border-color] duration-150 focus:border-[var(--accent)] font-mono"
                />
                <button
                  type="button"
                  onClick={saveLummiKey}
                  className="text-[11px] font-mono uppercase tracking-[0.1em] text-[var(--accent)] border border-[var(--accent)]/30 px-2.5 py-1.5 transition-colors duration-150 hover:bg-[var(--accent)]/10"
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
          </div>
        </SectionCard>
      </div>

      {/* ── Data ── */}
      <div className="space-y-3">
        <SectionLabel>Data</SectionLabel>
        <SectionCard>
          <SettingRow
            label="Export all projects"
            hint="Downloads a JSON file with all your projects and tasks"
          >
            <button
              type="button"
              onClick={exportAllProjects}
              className="text-[11px] font-mono uppercase tracking-[0.1em] text-[var(--text-tertiary)] border border-[var(--border-primary)] px-2.5 py-1.5 transition-colors duration-150 hover:text-[var(--text-primary)] hover:border-[var(--border-hover)]"
            >
              Export JSON
            </button>
          </SettingRow>
          <SettingRow
            label="Clear all data"
            hint="Removes all projects, tasks, and preferences from this browser"
          >
            <button
              type="button"
              onClick={handleClearData}
              className={`text-[11px] font-mono uppercase tracking-[0.1em] border px-2.5 py-1.5 transition-colors duration-150 ${
                clearConfirm
                  ? "border-red-500/50 text-red-500 hover:bg-red-500/10"
                  : "border-[var(--border-primary)] text-[var(--text-tertiary)] hover:text-red-400 hover:border-red-500/40"
              }`}
            >
              {clearConfirm ? "Confirm clear" : "Clear"}
            </button>
          </SettingRow>
        </SectionCard>
      </div>

      {/* ── About ── */}
      <div className="space-y-3">
        <SectionLabel>About</SectionLabel>
        <SectionCard>
          <SettingRow label="Version">
            <span className="font-mono text-[11px] text-[var(--text-tertiary)]">0.1.0</span>
          </SettingRow>
          <SettingRow label="Studio OS">
            <span className="text-[11px] text-[var(--text-tertiary)]">Built for designers who think in systems.</span>
          </SettingRow>
        </SectionCard>
      </div>
    </section>
  );
}
