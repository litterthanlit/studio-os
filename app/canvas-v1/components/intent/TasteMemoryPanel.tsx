"use client";

// Taste Memory (master plan 1.8): preferences learned from design actions, as
// sentences with scope and evidence. Accept feeds the learned layer of the next
// compile; Reject drops it; scope can be widened or narrowed.

import * as React from "react";
import { useMutation, useQuery } from "convex/react";
import { Check, X } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { preferenceSentence } from "@/lib/intent/reference-actions";
import type { Preference, PreferenceScopeLevel } from "@/lib/design-memory/types";

const SCOPES: Array<{ level: PreferenceScopeLevel; label: string }> = [
  { level: "screen", label: "This screen" },
  { level: "project", label: "This project" },
  { level: "user", label: "All projects" },
];

export function TasteMemoryPanel({ convexProjectId }: { convexProjectId: string }) {
  const projectId = convexProjectId as Id<"projects">;
  const rows = useQuery(api.designMemory.listPreferences, { projectId }) as Preference[] | undefined;
  const setStatus = useMutation(api.designMemory.setPreferenceStatus);
  const [open, setOpen] = React.useState(true);
  const panelId = React.useId();

  const visible = (rows ?? [])
    .filter((p) => p.status !== "rejected" && p.scope.level !== "node")
    .sort((a, b) => (a.status === b.status ? b.evidence.count - a.evidence.count : a.status === "proposed" ? -1 : 1));
  if (visible.length === 0) return null;
  const proposed = visible.filter((p) => p.status === "proposed").length;

  const update = (p: Preference, status: Preference["status"], scope?: Preference["scope"]) =>
    void setStatus({ projectId, preferenceId: p.id as Id<"preferences">, status, ...(scope ? { scope } : {}) }).catch((error: unknown) =>
      console.warn("[taste-memory] update failed:", error),
    );

  return (
    <section aria-label="Taste memory" className="border-b border-[#E5E5E0] dark:border-[#333333]">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#D1E4FC]"
      >
        <span className="mono-kicker">Taste memory</span>
        {proposed > 0 && <span className="font-mono text-[10px] text-[#4B57DB]">{`${proposed} to review`}</span>}
      </button>
      {open && (
        <ul id={panelId} className="flex flex-col px-3 pb-2">
          {visible.map((p) => (
            <li key={p.id} className="flex flex-col gap-1 border-b border-[#EFEFEC] py-2 last:border-b-0 dark:border-[#2A2A2A]">
              <p className="text-[12px] leading-[16px] text-[#1A1A1A] dark:text-[#D0D0D0]">{preferenceSentence(p)}</p>
              <div className="flex items-center gap-1.5">
                {p.status === "accepted" ? (
                  <span className="font-mono text-[10px] uppercase text-[#4B57DB]">Accepted</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => update(p, "accepted")}
                    className="flex items-center gap-1 rounded-[4px] border border-[#E5E5E0] bg-white px-1.5 py-0.5 text-[11px] text-[#1A1A1A] outline-none hover:border-[#4B57DB] focus-visible:ring-2 focus-visible:ring-[#D1E4FC] dark:border-[#333333] dark:bg-[#222222] dark:text-[#D0D0D0]"
                  >
                    <Check size={16} strokeWidth={1.5} aria-hidden="true" />
                    Accept
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => update(p, "rejected")}
                  aria-label={p.status === "accepted" ? `Forget: ${p.rule}` : `Reject: ${p.rule}`}
                  className="flex items-center gap-1 rounded-[4px] border border-[#E5E5E0] bg-white px-1.5 py-0.5 text-[11px] text-[#6B6B6B] outline-none hover:border-[#4B57DB] focus-visible:ring-2 focus-visible:ring-[#D1E4FC] dark:border-[#333333] dark:bg-[#222222] dark:text-[#A0A0A0]"
                >
                  <X size={16} strokeWidth={1.5} aria-hidden="true" />
                  {p.status === "accepted" ? "Forget" : "Reject"}
                </button>
                <label className="sr-only" htmlFor={`${panelId}-${p.id}`}>
                  Scope
                </label>
                <select
                  id={`${panelId}-${p.id}`}
                  value={p.scope.level}
                  onChange={(e) => {
                    const level = e.target.value as PreferenceScopeLevel;
                    update(p, p.status, level === "screen" ? { level, ...(p.scope.targetId ? { targetId: p.scope.targetId } : {}) } : { level });
                  }}
                  className="ml-auto rounded-[2px] border border-[#E5E5E0] bg-white px-1 py-0.5 text-[10px] text-[#6B6B6B] outline-none focus:border-[#D1E4FC] focus:ring-2 focus:ring-[#D1E4FC]/40 dark:border-[#333333] dark:bg-[#2A2A2A] dark:text-[#D0D0D0]"
                >
                  {SCOPES.filter((s) => s.level !== "screen" || p.scope.level === "screen").map((s) => (
                    <option key={s.level} value={s.level}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
