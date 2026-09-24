"use client";

// Role chips (master plan 1.8): what a reference is for. Toggle buttons with
// aria-pressed; keys 1–7 do the same on the selected reference.

import * as React from "react";
import { REFERENCE_ROLES } from "@/lib/intent/reference-actions";
import type { ReferenceRole } from "@/lib/design-memory/types";

type RoleChipsProps = {
  roles: ReferenceRole[];
  onToggle: (role: ReferenceRole) => void;
  /** Accessible group name, e.g. "Roles for reference A". */
  label: string;
  /** Roles offered (default: all seven). */
  only?: ReferenceRole[];
  /** Show the 1–7 key hint in the title. */
  showKeys?: boolean;
};

export function RoleChips({ roles, onToggle, label, only, showKeys = true }: RoleChipsProps) {
  const options = only ? REFERENCE_ROLES.filter((entry) => only.includes(entry.role)) : REFERENCE_ROLES;
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1">
      {options.map((entry) => {
        const pressed = roles.includes(entry.role);
        return (
          <button
            key={entry.role}
            type="button"
            aria-pressed={pressed}
            title={showKeys ? `${entry.label} (${entry.key})` : entry.label}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onToggle(entry.role);
            }}
            className={
              "rounded-[2px] border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.5px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#D1E4FC] " +
              (pressed
                ? "border-[#4B57DB] bg-[#4B57DB] text-white"
                : "border-[#E5E5E0] bg-white text-[#6B6B6B] hover:border-[#4B57DB] hover:text-[#1A1A1A] dark:border-[#333333] dark:bg-[#222222] dark:text-[#A0A0A0]")
            }
          >
            {entry.label}
          </button>
        );
      })}
    </div>
  );
}
