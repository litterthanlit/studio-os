"use client";

/**
 * Shared inspector field primitives — Framer-style V3.
 *
 * Design system:
 * - Two-column layout: label left (Geist Sans 13px #6B6B6B), value right (Geist Mono 12px #1A1A1A)
 * - min 32px row height; rows grow for multi-line controls (e.g. grid template picker)
 * - 24px section gap, 16px section padding
 * - Input height: 24px, bg: #F8F8F6, border: 1px #E5E5E0, radius: 2px
 * - Accent: #4B57DB
 */

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ColorPickerPopover } from "../ColorPickerPopover";

// ─── InspectorFieldRow — Two-column layout primitive ─────────────────────────

export function InspectorFieldRow({
  label,
  children,
  className,
  hasOverride,
  onResetOverride,
  disabled,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  hasOverride?: boolean;
  onResetOverride?: () => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn("flex items-start min-h-8 gap-3 py-1", className)}
      title={disabled ? "Controlled by master component" : undefined}
    >
      <span className={cn(
        "w-16 shrink-0 pt-0.5 text-[13px] font-normal flex items-start gap-1.5",
        disabled ? "text-[#A0A0A0]" : "text-[#6B6B6B] dark:text-[#999999]"
      )}>
        {hasOverride && !disabled && (
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
        {label}
      </span>
      <div className={cn("flex-1 min-w-0", disabled && "opacity-50 pointer-events-none")}>
        {children}
      </div>
    </div>
  );
}

// ─── InspectorLabel — Legacy (kept for compatibility) ────────────────────────

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
        "w-full h-7 border border-[#E5E5E0] dark:border-[#333333] rounded-[2px] bg-[#F8F8F6] dark:bg-[#2A2A2A] px-2.5 font-mono text-[13px] text-[#1A1A1A] dark:text-[#D0D0D0] placeholder:text-[#A0A0A0] dark:placeholder:text-[#555555] outline-none transition-colors focus:border-[#4B57DB] focus:ring-1 focus:ring-[#4B57DB]/20",
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
        "w-full border border-[#E5E5E0] dark:border-[#333333] rounded-[2px] bg-[#F8F8F6] dark:bg-[#2A2A2A] px-2 py-1 font-mono text-[12px] text-[#1A1A1A] dark:text-[#D0D0D0] placeholder:text-[#A0A0A0] dark:placeholder:text-[#555555] outline-none transition-colors resize-none min-h-[60px] focus:border-[#4B57DB] focus:ring-1 focus:ring-[#4B57DB]/20",
        className
      )}
    />
  );
}

// ─── InspectorNumberInput ────────────────────────────────────────────────────

export function InspectorNumberInput({
  className,
  unit,
  mixed,
  onMouseDown: externalMouseDown,
  onFocus: externalFocus,
  onBlur: externalBlur,
  onKeyDown: externalKeyDown,
  onChange,
  value,
  placeholder,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { unit?: string; mixed?: boolean }) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [focused, setFocused] = React.useState(false);
  const valueOnFocusRef = React.useRef<string>("");
  const [mixedCleared, setMixedCleared] = React.useState(false);

  // Handle mixed state - clear when user types
  const handleChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (mixed && !mixedCleared) {
      setMixedCleared(true);
    }
    onChange?.(e);
  }, [mixed, mixedCleared, onChange]);

  const DRAG_THRESHOLD = 3;

  const fireSyntheticChange = React.useCallback(
    (nextValue: string) => {
      const input = inputRef.current;
      if (!input || !onChange) return;

      const nativeSetter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value"
      )?.set;
      if (nativeSetter) {
        nativeSetter.call(input, nextValue);
      }
      const syntheticEvent = new Event("input", { bubbles: true });
      input.dispatchEvent(syntheticEvent);

      onChange({
        target: input,
        currentTarget: input,
      } as React.ChangeEvent<HTMLInputElement>);
    },
    [onChange]
  );

  function handleMouseDown(e: React.MouseEvent<HTMLInputElement>) {
    if (e.button !== 0) {
      externalMouseDown?.(e);
      return;
    }

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
        inputRef.current?.focus();
        inputRef.current?.select();
      } else {
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
      fireSyntheticChange(valueOnFocusRef.current);
      inputRef.current?.blur();
      return;
    }
    externalKeyDown?.(e);
  }

  // Reset mixedCleared when mixed prop changes
  React.useEffect(() => {
    setMixedCleared(false);
  }, [mixed]);

  const isMixed = mixed && !mixedCleared;
  const displayValue = isMixed ? "" : value;
  const displayPlaceholder = isMixed ? "—" : placeholder;

  return (
    <div className="relative flex items-center">
      <input
        ref={inputRef}
        type="number"
        {...props}
        value={displayValue}
        placeholder={displayPlaceholder}
        onMouseDown={handleMouseDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onChange={handleChange}
        className={cn(
          "w-full h-7 text-left border border-[#E5E5E0] dark:border-[#333333] rounded-[2px] bg-[#F8F8F6] dark:bg-[#2A2A2A] px-2.5 pr-6 font-mono text-[13px] text-[#1A1A1A] dark:text-[#D0D0D0] outline-none transition-colors focus:border-[#4B57DB] focus:ring-1 focus:ring-[#4B57DB]/20 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none",
          focused ? "cursor-text" : "cursor-ew-resize",
          isMixed && "placeholder:text-[#8A8A8A] dark:placeholder:text-[#666666]",
          className
        )}
      />
      {unit && (
        <span className="absolute right-2 text-[11px] font-mono text-[#A0A0A0] dark:text-[#666666] pointer-events-none">
          {unit}
        </span>
      )}
    </div>
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
          "w-full h-7 appearance-none border border-[#E5E5E0] dark:border-[#333333] rounded-[2px] bg-[#F8F8F6] dark:bg-[#2A2A2A] px-2.5 pr-7 font-mono text-[13px] text-[#1A1A1A] dark:text-[#D0D0D0] outline-none transition-colors cursor-pointer focus:border-[#4B57DB] focus:ring-1 focus:ring-[#4B57DB]/20",
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

// ─── InspectorColorField — Swatch + Hex + Opacity ────────────────────────────

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

function parseRgba(rgba: string): { r: number; g: number; b: number; a: number } | null {
  const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!match) return null;
  return {
    r: parseInt(match[1], 10),
    g: parseInt(match[2], 10),
    b: parseInt(match[3], 10),
    a: match[4] ? parseFloat(match[4]) : 1,
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

export function InspectorColorField({
  color,
  mixed,
  documentColors,
  onChange,
  onCommit,
}: {
  color: string;
  mixed?: boolean;
  documentColors?: string[];
  onChange: (color: string) => void;
  onCommit?: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [swatchEl, setSwatchEl] = React.useState<HTMLButtonElement | null>(null);
  const isEmpty = !color || color === "transparent" || color === "none";
  const isMixed = mixed === true;
  
  // Parse color for hex/opacity split
  const parsed = React.useMemo(() => parseRgba(color), [color]);
  const hexValue = React.useMemo(() => {
    if (isMixed) return "";
    if (isEmpty) return "";
    if (parsed) return rgbToHex(parsed.r, parsed.g, parsed.b);
    if (color.startsWith("#")) return normalizeHex(color) || color;
    return color;
  }, [color, isEmpty, isMixed, parsed]);
  const opacityValue = React.useMemo(() => {
    if (isMixed) return 100;
    if (isEmpty) return 100;
    if (parsed) return Math.round(parsed.a * 100);
    return 100;
  }, [isEmpty, isMixed, parsed]);

  const [hexDraft, setHexDraft] = React.useState(hexValue);
  const [opacityDraft, setOpacityDraft] = React.useState(String(opacityValue));
  const [hexFocused, setHexFocused] = React.useState(false);
  const [opacityFocused, setOpacityFocused] = React.useState(false);

  React.useEffect(() => {
    if (!hexFocused) setHexDraft(hexValue);
  }, [hexValue, hexFocused]);

  React.useEffect(() => {
    if (!opacityFocused) setOpacityDraft(String(opacityValue));
  }, [opacityValue, opacityFocused]);

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = e.target.value;
    setHexDraft(nextValue);

    if (nextValue === "" || nextValue === "transparent") {
      onChange(nextValue);
      return;
    }

    const normalized = normalizeHex(nextValue);
    if (normalized) {
      const opacity = parseInt(opacityDraft, 10) || 100;
      if (opacity < 100) {
        const r = parseInt(normalized.slice(1, 3), 16);
        const g = parseInt(normalized.slice(3, 5), 16);
        const b = parseInt(normalized.slice(5, 7), 16);
        onChange(`rgba(${r}, ${g}, ${b}, ${opacity / 100})`);
      } else {
        onChange(normalized);
      }
    }
  };

  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setOpacityDraft(val);
    
    const opacity = parseInt(val, 10);
    if (Number.isFinite(opacity)) {
      const clamped = Math.max(0, Math.min(100, opacity));
      const hex = hexDraft || "#FFFFFF";
      if (hex.startsWith("#") && hex.length === 7) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        if (clamped < 100) {
          onChange(`rgba(${r}, ${g}, ${b}, ${clamped / 100})`);
        } else {
          onChange(hex);
        }
      }
    }
  };

  // Checkerboard pattern for mixed state
  const checkerboardStyle: React.CSSProperties | undefined = isMixed
    ? {
        backgroundImage: `repeating-conic-gradient(#E5E5E5 0% 25%, #FFFFFF 0% 50%)`,
        backgroundSize: "8px 8px",
      }
    : isEmpty
    ? undefined
    : { backgroundColor: color };

  return (
    <div className="flex items-center gap-2">
      {/* Swatch */}
      <div className="relative shrink-0">
        <button
          ref={setSwatchEl}
          type="button"
          className={cn(
            "h-6 w-6 rounded-[2px] border shrink-0",
            isMixed
              ? "border-[#E5E5E0] dark:border-[#333333]"
              : isEmpty
              ? "border-dashed border-[#E5E5E0] dark:border-[#333333] bg-[#F8F8F6] dark:bg-[#2A2A2A]"
              : "border-[#E5E5E0] dark:border-[#333333]"
          )}
          style={checkerboardStyle}
          onClick={() => setOpen(!open)}
        />
        <ColorPickerPopover
          open={open}
          value={color || "#FFFFFF"}
          anchorEl={swatchEl}
          documentColors={documentColors}
          onSelect={(c) => {
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
        value={isMixed ? "" : hexDraft}
        placeholder={isMixed ? "Mixed" : "none"}
        disabled={isMixed}
        onFocus={() => setHexFocused(true)}
        onChange={handleHexChange}
        onBlur={() => {
          setHexFocused(false);
          onCommit?.();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onCommit?.();
            e.currentTarget.blur();
          }
        }}
        className={cn(
          "flex-1 h-7 border border-[#E5E5E0] dark:border-[#333333] rounded-[2px] bg-[#F8F8F6] dark:bg-[#2A2A2A] px-2.5 font-mono text-[13px] text-[#1A1A1A] dark:text-[#D0D0D0] outline-none transition-colors focus:border-[#4B57DB] focus:ring-1 focus:ring-[#4B57DB]/20",
          isMixed && "bg-[#F0F0EC] dark:bg-[#252525] text-[#8A8A8A] dark:text-[#666666] cursor-not-allowed"
        )}
      />

      {/* Opacity input */}
      <div className="relative w-14 shrink-0">
        <input
          type="number"
          min={0}
          max={100}
          value={opacityDraft}
          onFocus={() => setOpacityFocused(true)}
          onChange={handleOpacityChange}
          onBlur={() => {
            setOpacityFocused(false);
            onCommit?.();
          }}
          className="w-full h-7 border border-[#E5E5E0] dark:border-[#333333] rounded-[2px] bg-[#F8F8F6] dark:bg-[#2A2A2A] px-2.5 pr-4 font-mono text-[13px] text-[#1A1A1A] dark:text-[#D0D0D0] outline-none transition-colors focus:border-[#4B57DB] focus:ring-1 focus:ring-[#4B57DB]/20 text-right"
        />
        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#A0A0A0] dark:text-[#666666]">%</span>
      </div>
    </div>
  );
}

// ─── InspectorRow — Legacy grid primitive ────────────────────────────────────

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
  return <div className="h-px bg-[#E5E5E0] dark:bg-[#333333] my-4" />;
}

// ─── InspectorSliderField — Legacy (kept for compatibility) ──────────────────

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
  const [draft, setDraft] = React.useState<string>(() =>
    showPercent ? String(Math.round(value * 100)) : String(value ?? "")
  );
  const [isFocused, setIsFocused] = React.useState(false);
  const valueOnFocusRef = React.useRef<string>("");

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
    setDraft(showPercent ? String(Math.round(value * 100)) : String(value ?? ""));
  }

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
    ? Math.round(value * 100) / 100
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
            "w-[52px] h-7 text-center border border-[#E5E5E0] dark:border-[#333333] rounded-[2px] bg-[#F8F8F6] dark:bg-[#2A2A2A] px-1.5 font-mono text-[11px] text-[#1A1A1A] dark:text-[#D0D0D0] outline-none transition-colors focus:border-[#4B57DB] focus:ring-1 focus:ring-[#4B57DB]/20 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none shrink-0",
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

// ─── InspectorSection — Legacy section primitive ─────────────────────────────

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
