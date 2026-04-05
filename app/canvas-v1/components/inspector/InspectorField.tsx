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
    <div className="mt-4">
      <span className="mono-kicker mb-2 block">{label}</span>
      {children}
    </div>
  );
}

// ─── InspectorLabel ──────────────────────────────────────────────────────────

export function InspectorLabel({
  children,
  className,
  hasOverride,
  onResetOverride,
}: {
  children: React.ReactNode;
  className?: string;
  hasOverride?: boolean;
  onResetOverride?: () => void;
}) {
  return (
    <span
      className={cn(
        "flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-[#8A8A8A] dark:text-[#666666] font-mono mb-1",
        className
      )}
    >
      {hasOverride && (
        <button
          type="button"
          title="Overridden — click to reset to desktop"
          className="w-1.5 h-1.5 rounded-full bg-[#4B57DB] shrink-0 hover:ring-2 hover:ring-[#D1E4FC] dark:hover:ring-[#222244] transition-shadow"
          onClick={(e) => {
            e.stopPropagation();
            onResetOverride?.();
          }}
        />
      )}
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
        "w-full h-7 border border-[#EFEFEC] dark:border-[#333333] rounded-[2px] bg-[#F8F8F6] dark:bg-[#222222] px-2 font-mono text-[11px] font-medium text-[#1A1A1A] dark:text-[#D0D0D0] placeholder:text-[#A0A0A0] dark:placeholder:text-[#555555] outline-none transition-colors focus:border-[#D1E4FC] focus:ring-2 focus:ring-[#D1E4FC]/30 dark:focus:border-[#4B57DB] dark:focus:ring-2 dark:focus:ring-[#4B57DB]/30",
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
        "w-full border border-[#EFEFEC] dark:border-[#333333] rounded-[2px] bg-[#F8F8F6] dark:bg-[#222222] px-2 py-1 font-mono text-[11px] font-medium text-[#1A1A1A] dark:text-[#D0D0D0] placeholder:text-[#A0A0A0] dark:placeholder:text-[#555555] outline-none transition-colors resize-none min-h-[60px] focus:border-[#D1E4FC] focus:ring-2 focus:ring-[#D1E4FC]/30 dark:focus:border-[#4B57DB] dark:focus:ring-2 dark:focus:ring-[#4B57DB]/30",
        className
      )}
    />
  );
}

// ─── InspectorNumberInput ────────────────────────────────────────────────────

/**
 * Figma-style scrubby numeric input.
 *
 * Hover shows an ew-resize cursor. Click-and-drag left/right adjusts the
 * value live. Click without dragging focuses the input for keyboard entry.
 * Shift+drag gives 0.1× fine-control sensitivity. Escape while typing
 * reverts to the value before focus.
 */
export function InspectorNumberInput({
  className,
  onMouseDown: externalMouseDown,
  onFocus: externalFocus,
  onBlur: externalBlur,
  onKeyDown: externalKeyDown,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [focused, setFocused] = React.useState(false);
  const valueOnFocusRef = React.useRef<string>("");

  const DRAG_THRESHOLD = 3;

  /**
   * Fire the caller's onChange with a value string, using the real input
   * element as event target so `e.target.value` works in call-sites.
   */
  const fireSyntheticChange = React.useCallback(
    (nextValue: string) => {
      const input = inputRef.current;
      if (!input || !props.onChange) return;

      // Use the native setter so React sees the update
      const nativeSetter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value"
      )?.set;
      if (nativeSetter) {
        nativeSetter.call(input, nextValue);
      }
      const syntheticEvent = new Event("input", { bubbles: true });
      input.dispatchEvent(syntheticEvent);

      // Also call the React onChange directly as a safety net
      props.onChange({
        target: input,
        currentTarget: input,
      } as React.ChangeEvent<HTMLInputElement>);
    },
    [props.onChange]
  );

  function handleMouseDown(e: React.MouseEvent<HTMLInputElement>) {
    // Only left-click
    if (e.button !== 0) {
      externalMouseDown?.(e);
      return;
    }

    // If already focused for typing, let normal input behavior work
    if (document.activeElement === inputRef.current) {
      externalMouseDown?.(e);
      return;
    }

    e.preventDefault();

    const startX = e.clientX;
    const rawStart = inputRef.current?.value ?? "";
    const startValue = rawStart === "" ? 0 : Number(rawStart);
    const safeStart = Number.isFinite(startValue) ? startValue : 0;
    let hasDragged = false;

    const step = props.step ? Number(props.step) : 1;
    const minVal =
      props.min !== undefined && props.min !== "" ? Number(props.min) : -Infinity;
    const maxVal =
      props.max !== undefined && props.max !== "" ? Number(props.max) : Infinity;

    const handleMouseMove = (moveE: MouseEvent) => {
      const dx = moveE.clientX - startX;
      if (!hasDragged && Math.abs(dx) < DRAG_THRESHOLD) return;

      if (!hasDragged) {
        hasDragged = true;
        document.body.style.cursor = "ew-resize";
        document.body.style.userSelect = "none";
      }

      const sensitivity = moveE.shiftKey ? 0.1 : 1;
      const rawNew = safeStart + Math.round(dx * sensitivity) * step;
      const clamped = Math.max(minVal, Math.min(maxVal, rawNew));
      // Round to avoid floating-point noise (match step precision)
      const precision = step < 1 ? String(step).split(".")[1]?.length ?? 0 : 0;
      const rounded = precision > 0
        ? Number(clamped.toFixed(precision))
        : Math.round(clamped);

      fireSyntheticChange(String(rounded));
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";

      if (!hasDragged) {
        // Was a click, not a drag — focus the input for typing
        inputRef.current?.focus();
        inputRef.current?.select();
      } else {
        // Drag ended — flush by blurring logic: fire onBlur so callers
        // that flush history on blur get the signal.
        if (externalBlur) {
          externalBlur({
            target: inputRef.current!,
            currentTarget: inputRef.current!,
          } as React.FocusEvent<HTMLInputElement>);
        }
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }

  function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
    setFocused(true);
    valueOnFocusRef.current = inputRef.current?.value ?? "";
    externalFocus?.(e);
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    setFocused(false);
    externalBlur?.(e);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      // Revert to value when focus started
      fireSyntheticChange(valueOnFocusRef.current);
      inputRef.current?.blur();
      return;
    }
    externalKeyDown?.(e);
  }

  return (
    <input
      ref={inputRef}
      type="number"
      {...props}
      onMouseDown={handleMouseDown}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={cn(
        "w-[60px] h-7 text-center border border-[#EFEFEC] dark:border-[#333333] rounded-[2px] bg-[#F8F8F6] dark:bg-[#222222] px-2 font-mono text-[11px] font-medium text-[#1A1A1A] dark:text-[#D0D0D0] outline-none transition-colors focus:border-[#D1E4FC] focus:ring-2 focus:ring-[#D1E4FC]/30 dark:focus:border-[#4B57DB] dark:focus:ring-2 dark:focus:ring-[#4B57DB]/30 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none",
        focused ? "cursor-text" : "cursor-ew-resize",
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
          "w-full h-7 appearance-none border border-[#EFEFEC] dark:border-[#333333] rounded-[2px] bg-[#F8F8F6] dark:bg-[#222222] px-2 pr-7 font-mono text-[11px] font-medium text-[#1A1A1A] dark:text-[#D0D0D0] outline-none transition-colors cursor-pointer focus:border-[#D1E4FC] focus:ring-2 focus:ring-[#D1E4FC]/30 dark:focus:border-[#4B57DB] dark:focus:ring-2 dark:focus:ring-[#4B57DB]/30",
          className
        )}
      >
        {children}
      </select>
      <ChevronDown
        size={10}
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#8A8A8A] dark:text-[#555555]"
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
              ? "border-dashed border-[#E5E5E0] dark:border-[#333333]"
              : "border-[#E5E5E0] dark:border-[#333333]"
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
        className="flex-1 h-7 border border-[#EFEFEC] dark:border-[#333333] rounded-[2px] bg-[#F8F8F6] dark:bg-[#222222] px-2 font-mono text-[11px] font-medium text-[#1A1A1A] dark:text-[#D0D0D0] outline-none transition-colors focus:border-[#D1E4FC] focus:ring-2 focus:ring-[#D1E4FC]/30 dark:focus:border-[#4B57DB] dark:focus:ring-2 dark:focus:ring-[#4B57DB]/30"
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
  return <div className="h-px bg-[#EFEFEC] dark:bg-[#333333] my-4" />;
}

// ─── InspectorSliderField ────────────────────────────────────────────────────

/**
 * A combined slider + number input field for numeric inspector properties.
 *
 * Layout: [Label]  [====●=====] [ 42 ]
 *
 * The slider and number input stay in sync — changing either updates the other
 * and calls onChange with the new value.
 *
 * When `showPercent` is true, the number input displays the value as a
 * percentage (value × 100) and converts back on change. The underlying
 * onChange always receives the raw numeric value passed in (no conversion —
 * callers decide their own scale via min/max).
 */
export function InspectorSliderField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  showPercent = false,
  hasOverride,
  onResetOverride,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  showPercent?: boolean;
  hasOverride?: boolean;
  onResetOverride?: () => void;
}) {
  const numberRef = React.useRef<HTMLInputElement>(null);

  // Internal draft for the number input so the user can type freely
  const [draft, setDraft] = React.useState<string>(() =>
    showPercent ? String(Math.round(value * 100)) : String(value ?? "")
  );
  const [isFocused, setIsFocused] = React.useState(false);
  const valueOnFocusRef = React.useRef<string>("");

  // Keep draft in sync when value changes externally (e.g. slider drag)
  React.useEffect(() => {
    if (!isFocused) {
      setDraft(showPercent ? String(Math.round(value * 100)) : String(value ?? ""));
    }
  }, [value, isFocused, showPercent]);

  function handleSliderChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = Number(e.target.value);
    onChange(raw);
    if (!isFocused) {
      setDraft(showPercent ? String(Math.round(raw * 100)) : String(raw));
    }
  }

  function handleNumberChange(e: React.ChangeEvent<HTMLInputElement>) {
    const text = e.target.value;
    setDraft(text);
    const parsed = Number(text);
    if (text !== "" && Number.isFinite(parsed)) {
      const clamped = Math.min(max, Math.max(min, showPercent ? parsed / 100 : parsed));
      onChange(clamped);
    }
  }

  function handleNumberBlur() {
    setIsFocused(false);
    // Snap draft to actual value on blur
    setDraft(showPercent ? String(Math.round(value * 100)) : String(value ?? ""));
  }

  // ── Scrubby drag for the number input ──
  const SLIDER_DRAG_THRESHOLD = 3;

  function handleNumberMouseDown(e: React.MouseEvent<HTMLInputElement>) {
    if (e.button !== 0) return;
    if (document.activeElement === numberRef.current) return;

    e.preventDefault();

    const startX = e.clientX;
    const displayStart = showPercent ? Math.round(value * 100) : value;
    let hasDragged = false;

    const effectiveStep = showPercent ? step * 100 : step;
    const effectiveMin = showPercent ? min * 100 : min;
    const effectiveMax = showPercent ? max * 100 : max;

    const handleMouseMove = (moveE: MouseEvent) => {
      const dx = moveE.clientX - startX;
      if (!hasDragged && Math.abs(dx) < SLIDER_DRAG_THRESHOLD) return;

      if (!hasDragged) {
        hasDragged = true;
        document.body.style.cursor = "ew-resize";
        document.body.style.userSelect = "none";
      }

      const sensitivity = moveE.shiftKey ? 0.1 : 1;
      const rawNew = displayStart + Math.round(dx * sensitivity) * effectiveStep;
      const clamped = Math.max(effectiveMin, Math.min(effectiveMax, rawNew));
      const precision = effectiveStep < 1 ? String(effectiveStep).split(".")[1]?.length ?? 0 : 0;
      const rounded = precision > 0 ? Number(clamped.toFixed(precision)) : Math.round(clamped);

      setDraft(String(rounded));
      const actual = showPercent ? rounded / 100 : rounded;
      onChange(Math.max(min, Math.min(max, actual)));
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";

      if (!hasDragged) {
        numberRef.current?.focus();
        numberRef.current?.select();
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }

  function handleNumberFocus() {
    setIsFocused(true);
    valueOnFocusRef.current = draft;
  }

  function handleNumberKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setDraft(valueOnFocusRef.current);
      // Revert the value
      const parsed = Number(valueOnFocusRef.current);
      if (valueOnFocusRef.current !== "" && Number.isFinite(parsed)) {
        const clamped = Math.min(max, Math.max(min, showPercent ? parsed / 100 : parsed));
        onChange(clamped);
      }
      numberRef.current?.blur();
      return;
    }
    if (e.key === "Enter") {
      handleNumberBlur();
      e.currentTarget.blur();
    }
  }

  const displayValue = showPercent
    ? Math.round(value * 100) / 100  // keep precision for slider
    : value;

  return (
    <div>
      <InspectorLabel hasOverride={hasOverride} onResetOverride={onResetOverride}>
        {label}
      </InspectorLabel>
      <div className="flex items-center gap-2">
        <div className="flex-1 relative flex items-center">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={displayValue}
            onChange={handleSliderChange}
            className="inspector-range-slider w-full"
          />
        </div>
        <input
          ref={numberRef}
          type="number"
          value={draft}
          min={showPercent ? min * 100 : min}
          max={showPercent ? max * 100 : max}
          step={showPercent ? step * 100 : step}
          onMouseDown={handleNumberMouseDown}
          onFocus={handleNumberFocus}
          onChange={handleNumberChange}
          onBlur={handleNumberBlur}
          onKeyDown={handleNumberKeyDown}
          className={cn(
            "w-[52px] h-7 text-center border border-[#EFEFEC] dark:border-[#333333] rounded-[2px] bg-[#F8F8F6] dark:bg-[#222222] px-1.5 font-mono text-[11px] font-medium text-[#1A1A1A] dark:text-[#D0D0D0] outline-none transition-colors focus:border-[#D1E4FC] focus:ring-2 focus:ring-[#D1E4FC]/30 dark:focus:border-[#4B57DB] dark:focus:ring-2 dark:focus:ring-[#4B57DB]/30 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none shrink-0",
            isFocused ? "cursor-text" : "cursor-ew-resize"
          )}
        />
        {showPercent && (
          <span className="text-[11px] text-[#8A8A8A] dark:text-[#666666] font-mono shrink-0">%</span>
        )}
      </div>
    </div>
  );
}
