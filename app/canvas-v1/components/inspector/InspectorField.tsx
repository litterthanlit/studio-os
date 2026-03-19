"use client";

/**
 * Shared inspector field primitives — V2 styling.
 *
 * Every inspector section (text, media, container, reference, artboard, empty)
 * uses these components for visual consistency.
 */

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ColorPickerPopover } from "../ColorPickerPopover";

// ─── InspectorSection ────────────────────────────────────────────────────────

export function InspectorSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5">
      <span className="mono-kicker mb-2 block">{label}</span>
      {children}
    </div>
  );
}

// ─── InspectorLabel ──────────────────────────────────────────────────────────

export function InspectorLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "block text-[10px] uppercase tracking-wide text-[#A0A0A0] font-mono mb-1",
        className
      )}
    >
      {children}
    </span>
  );
}

// ─── InspectorTextInput ──────────────────────────────────────────────────────

export function InspectorTextInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="text"
      {...props}
      className={cn(
        "w-full border border-[#E5E5E0] rounded-[2px] bg-white px-2 py-1.5 text-[13px] text-[#1A1A1A] placeholder:text-[#A0A0A0] outline-none transition-colors focus:border-[#D1E4FC] focus:ring-2 focus:ring-[#D1E4FC]/40",
        className
      )}
    />
  );
}

// ─── InspectorTextarea ───────────────────────────────────────────────────────

export function InspectorTextarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = React.useRef<HTMLTextAreaElement>(null);

  const autoGrow = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.max(60, el.scrollHeight) + "px";
  }, []);

  React.useEffect(() => {
    autoGrow();
  }, [props.value, autoGrow]);

  return (
    <textarea
      ref={ref}
      {...props}
      onInput={(e) => {
        autoGrow();
        props.onInput?.(e);
      }}
      className={cn(
        "w-full border border-[#E5E5E0] rounded-[2px] bg-white px-2 py-1.5 text-[13px] text-[#1A1A1A] placeholder:text-[#A0A0A0] outline-none transition-colors resize-none min-h-[60px] focus:border-[#D1E4FC] focus:ring-2 focus:ring-[#D1E4FC]/40",
        className
      )}
    />
  );
}

// ─── InspectorNumberInput ────────────────────────────────────────────────────

export function InspectorNumberInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="number"
      {...props}
      className={cn(
        "w-[60px] text-center border border-[#E5E5E0] rounded-[2px] bg-white px-2 py-1.5 text-[12px] text-[#1A1A1A] font-mono outline-none transition-colors focus:border-[#D1E4FC] focus:ring-2 focus:ring-[#D1E4FC]/40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none",
        className
      )}
    />
  );
}

// ─── InspectorSelect ─────────────────────────────────────────────────────────

export function InspectorSelect({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        className={cn(
          "w-full appearance-none border border-[#E5E5E0] rounded-[2px] bg-white px-2 py-1.5 pr-7 text-[13px] text-[#1A1A1A] outline-none transition-colors cursor-pointer focus:border-[#D1E4FC] focus:ring-2 focus:ring-[#D1E4FC]/40",
          className
        )}
      >
        {children}
      </select>
      <ChevronDown
        size={10}
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#A0A0A0]"
      />
    </div>
  );
}

// ─── InspectorColorField ─────────────────────────────────────────────────────

function isValidHex(hex: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex);
}

function normalizeHex(hex: string): string | null {
  const value = hex.trim();
  if (!isValidHex(value)) return null;

  const raw = value.slice(1);
  const expanded =
    raw.length === 3
      ? raw
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : raw;

  return `#${expanded.toUpperCase()}`;
}

export function InspectorColorField({
  color,
  documentColors,
  onChange,
  onCommit,
}: {
  color: string;
  documentColors?: string[];
  onChange: (color: string) => void;
  onCommit?: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState(color || "");
  const [isDraftFocused, setIsDraftFocused] = React.useState(false);
  const [swatchEl, setSwatchEl] = React.useState<HTMLButtonElement | null>(null);
  const isEmpty = !color || color === "transparent" || color === "none";

  React.useEffect(() => {
    if (!isDraftFocused) {
      setDraft(color || "");
    }
  }, [color, isDraftFocused]);

  return (
    <div className="flex items-center gap-2">
      {/* Swatch */}
      <div className="relative">
        <button
          ref={setSwatchEl}
          type="button"
          className={cn(
            "h-4 w-4 rounded-[2px] border shrink-0",
            isEmpty
              ? "border-dashed border-[#E5E5E0]"
              : "border-[#E5E5E0]"
          )}
          style={isEmpty ? undefined : { backgroundColor: color }}
          onClick={() => setOpen(!open)}
        />
        <ColorPickerPopover
          open={open}
          value={color || "#FFFFFF"}
          anchorEl={swatchEl}
          documentColors={documentColors}
          onSelect={(c) => {
            setDraft(c);
            onChange(c);
          }}
          onClose={() => {
            setOpen(false);
            onCommit?.();
          }}
        />
      </div>

      {/* Hex input */}
      <input
        type="text"
        value={draft}
        placeholder="none"
        onFocus={() => setIsDraftFocused(true)}
        onChange={(e) => {
          const nextValue = e.target.value;
          setDraft(nextValue);

          if (nextValue === "" || nextValue === "transparent") {
            onChange(nextValue);
            return;
          }

          const normalized = normalizeHex(nextValue);
          if (normalized) {
            onChange(normalized);
          }
        }}
        onBlur={() => {
          setIsDraftFocused(false);
          onCommit?.();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onCommit?.();
            e.currentTarget.blur();
          }
        }}
        className="flex-1 border border-[#E5E5E0] rounded-[2px] bg-white px-2 py-1.5 text-[12px] text-[#1A1A1A] font-mono outline-none transition-colors focus:border-[#D1E4FC] focus:ring-2 focus:ring-[#D1E4FC]/40"
      />
    </div>
  );
}

// ─── InspectorRow ────────────────────────────────────────────────────────────

export function InspectorRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-2", className)}>
      {children}
    </div>
  );
}

// ─── InspectorDivider ────────────────────────────────────────────────────────

export function InspectorDivider() {
  return <div className="h-px bg-[#E5E5E0] my-4" />;
}
