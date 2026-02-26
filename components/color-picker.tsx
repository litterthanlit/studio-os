"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

// ─── Color Math ───────────────────────────────────────────────────────────────

function hsbToHex(h: number, s: number, b: number): string {
  h = ((h % 360) + 360) % 360;
  const i = Math.floor(h / 60);
  const f = h / 60 - i;
  const p = b * (1 - s);
  const q = b * (1 - f * s);
  const t = b * (1 - (1 - f) * s);
  let r: number, g: number, bl: number;
  switch (i) {
    case 0: [r, g, bl] = [b, t, p]; break;
    case 1: [r, g, bl] = [q, b, p]; break;
    case 2: [r, g, bl] = [p, b, t]; break;
    case 3: [r, g, bl] = [p, q, b]; break;
    case 4: [r, g, bl] = [t, p, b]; break;
    default: [r, g, bl] = [b, p, q];
  }
  const toHex = (v: number) =>
    Math.round(Math.max(0, Math.min(1, v)) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(bl)}`;
}

function hexToHsb(hex: string): { h: number; s: number; b: number } | null {
  let clean = hex.replace("#", "").trim();
  if (clean.length === 3)
    clean = clean
      .split("")
      .map((c) => c + c)
      .join("");
  if (clean.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(clean)) return null;

  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + 6) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return { h, s: max === 0 ? 0 : d / max, b: max };
}

function isValidHex(v: string): boolean {
  return /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(v);
}

function expandHex(hex: string): string {
  const clean = hex.replace("#", "");
  if (clean.length === 3)
    return `#${clean[0]}${clean[0]}${clean[1]}${clean[1]}${clean[2]}${clean[2]}`;
  return hex.startsWith("#") ? hex : `#${hex}`;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const PICKER_PRESETS = [
  "#000000",
  "#FFFFFF",
  "#FF0000",
  "#FF5733",
  "#F5A623",
  "#FFDD00",
  "#50E3C2",
  "#2430AD",
  "#7928CA",
  "#FF0080",
  "#79FFE1",
  "#999999",
] as const;

const RECENT_KEY = "studio-os:recent-colors";
const MAX_RECENT = 8;
const SQUARE = 216;

function getRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function pushRecent(color: string): string[] {
  const norm = expandHex(color).toUpperCase();
  const list = getRecent().filter((c) => c.toUpperCase() !== norm);
  const updated = [norm, ...list].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  return updated;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  className?: string;
}

// ─── ColorPicker (Trigger + Popover) ─────────────────────────────────────────

export function ColorPicker({
  value,
  onChange,
  label,
  className,
}: ColorPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [panelPos, setPanelPos] = React.useState({ top: 0, left: 0 });
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  function openPicker() {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const PANEL_H = 360;
    const PANEL_W = 248;
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const top =
      spaceBelow >= PANEL_H ? rect.bottom + 8 : rect.top - PANEL_H - 8;
    const left = Math.min(rect.left, window.innerWidth - PANEL_W - 8);
    setPanelPos({ top, left });
    setOpen(true);
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {label && (
        <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-gray-500">
          {label}
        </span>
      )}
      <button
        ref={triggerRef}
        type="button"
        onClick={openPicker}
        aria-label={`Color: ${value}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="relative h-6 w-6 flex-shrink-0 rounded-full border border-border-primary transition-[box-shadow] duration-200 hover:ring-2 hover:ring-white/20 hover:ring-offset-1 hover:ring-offset-[#111]"
        style={{ backgroundColor: value }}
      />
      {mounted &&
        typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && (
              <ColorPickerPanel
                value={value}
                position={panelPos}
                onChange={onChange}
                onClose={() => setOpen(false)}
              />
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export function ColorPickerPanel({
  value,
  position,
  onChange,
  onClose,
}: {
  value: string;
  position: { top: number; left: number };
  onChange: (color: string) => void;
  onClose: () => void;
}) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const gradRef = React.useRef<HTMLCanvasElement>(null);
  const hueSliderRef = React.useRef<HTMLCanvasElement>(null);

  // One-time init from value prop
  const initRef = React.useRef(
    hexToHsb(value) ?? { h: 217, s: 0.97, b: 0.95 }
  );
  const init = initRef.current;

  const [hue, _setHue] = React.useState(init.h);
  const [sat, _setSat] = React.useState(init.s);
  const [bri, _setBri] = React.useState(init.b);
  const [hexInput, setHexInput] = React.useState(
    expandHex(value).toUpperCase()
  );
  const [recent, setRecent] = React.useState<string[]>([]);

  // Stable refs so drag handlers don't go stale
  const hueRef = React.useRef(init.h);
  const satRef = React.useRef(init.s);
  const briRef = React.useRef(init.b);
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;

  const setHue = (v: number) => {
    hueRef.current = v;
    _setHue(v);
  };
  const setSat = (v: number) => {
    satRef.current = v;
    _setSat(v);
  };
  const setBri = (v: number) => {
    briRef.current = v;
    _setBri(v);
  };

  const currentColor = React.useMemo(
    () => hsbToHex(hue, sat, bri),
    [hue, sat, bri]
  );

  // Sync hex input + fire onChange when internal color changes
  React.useEffect(() => {
    setHexInput(currentColor.toUpperCase());
    onChangeRef.current(currentColor);
  }, [currentColor]);

  React.useEffect(() => {
    setRecent(getRecent());
  }, []);

  // ── Draw gradient square ──────────────────────────────────────────────────

  React.useEffect(() => {
    const canvas = gradRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { width, height } = canvas;

    const hueColor = hsbToHex(hue, 1, 1);
    const gH = ctx.createLinearGradient(0, 0, width, 0);
    gH.addColorStop(0, "#ffffff");
    gH.addColorStop(1, hueColor);
    ctx.fillStyle = gH;
    ctx.fillRect(0, 0, width, height);

    const gV = ctx.createLinearGradient(0, 0, 0, height);
    gV.addColorStop(0, "rgba(0,0,0,0)");
    gV.addColorStop(1, "#000000");
    ctx.fillStyle = gV;
    ctx.fillRect(0, 0, width, height);
  }, [hue]);

  // ── Draw hue slider ───────────────────────────────────────────────────────

  React.useEffect(() => {
    const canvas = hueSliderRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const g = ctx.createLinearGradient(0, 0, canvas.width, 0);
    for (let i = 0; i <= 12; i++) {
      g.addColorStop(i / 12, `hsl(${i * 30},100%,50%)`);
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  // ── Gradient drag ─────────────────────────────────────────────────────────

  const gradDragging = React.useRef(false);

  function pickFromGrad(cx: number, cy: number) {
    const canvas = gradRef.current;
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    setSat(Math.max(0, Math.min((cx - r.left) / r.width, 1)));
    setBri(Math.max(0, Math.min(1 - (cy - r.top) / r.height, 1)));
  }

  React.useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (gradDragging.current) pickFromGrad(e.clientX, e.clientY);
    };
    const onUp = () => {
      gradDragging.current = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Hue drag ──────────────────────────────────────────────────────────────

  const hueDragging = React.useRef(false);

  function pickFromHue(cx: number) {
    const canvas = hueSliderRef.current;
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    setHue(
      Math.round(Math.max(0, Math.min((cx - r.left) / r.width, 1)) * 360)
    );
  }

  React.useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (hueDragging.current) pickFromHue(e.clientX);
    };
    const onUp = () => {
      hueDragging.current = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Close on outside click / Escape ──────────────────────────────────────

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function onPointer(e: PointerEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [onClose]);

  // ── Hex input ─────────────────────────────────────────────────────────────

  function onHexChange(raw: string) {
    const v = raw.startsWith("#") ? raw : `#${raw}`;
    setHexInput(v.toUpperCase());
    if (isValidHex(v)) {
      const hsb = hexToHsb(v);
      if (hsb) {
        setHue(hsb.h);
        setSat(hsb.s);
        setBri(hsb.b);
      }
    }
  }

  // ── Select a color directly ───────────────────────────────────────────────

  function selectColor(hex: string) {
    const norm = expandHex(hex);
    const hsb = hexToHsb(norm);
    if (hsb) {
      setHue(hsb.h);
      setSat(hsb.s);
      setBri(hsb.b);
    }
    const updated = pushRecent(norm);
    setRecent(updated);
  }

  // ── Eyedropper ────────────────────────────────────────────────────────────

  const hasEyedropper =
    typeof window !== "undefined" && "EyeDropper" in window;

  async function activateEyedropper() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const picker = new (window as any).EyeDropper();
      const { sRGBHex } = await picker.open();
      selectColor(sRGBHex);
    } catch {
      // user cancelled
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, scale: 0.95, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -4 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        zIndex: 9999,
      }}
      className="w-[248px] space-y-3 rounded-xl border border-border-primary bg-bg-secondary p-4 shadow-2xl"
      role="dialog"
      aria-label="Color picker"
    >
      {/* ── Gradient square ── */}
      <div
        className="relative select-none"
        style={{ width: SQUARE, height: SQUARE }}
      >
        <canvas
          ref={gradRef}
          width={SQUARE}
          height={SQUARE}
          className="h-full w-full cursor-crosshair rounded-lg"
          onMouseDown={(e) => {
            gradDragging.current = true;
            pickFromGrad(e.clientX, e.clientY);
          }}
        />
        {/* Cursor dot */}
        <div
          className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
          style={{
            left: sat * SQUARE,
            top: (1 - bri) * SQUARE,
            boxShadow: "0 0 0 1px rgba(0,0,0,0.55), 0 2px 6px rgba(0,0,0,0.4)",
          }}
        />
      </div>

      {/* ── Hue slider + preview + eyedropper ── */}
      <div className="flex items-center gap-2.5">
        {/* Hue rail */}
        <div className="relative flex-1 select-none py-1">
          <canvas
            ref={hueSliderRef}
            width={200}
            height={10}
            className="h-2.5 w-full cursor-ew-resize rounded-full"
            onMouseDown={(e) => {
              hueDragging.current = true;
              pickFromHue(e.clientX);
            }}
          />
          {/* Thumb */}
          <div
            className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
            style={{
              left: `${(hue / 360) * 100}%`,
              boxShadow: "0 0 0 1px rgba(0,0,0,0.4), 0 1px 4px rgba(0,0,0,0.3)",
            }}
          />
        </div>

        {/* Live preview swatch */}
        <div
          className="h-6 w-6 flex-shrink-0 rounded-full border border-border-primary shadow-inner"
          style={{ backgroundColor: currentColor }}
        />

        {/* Eyedropper */}
        {hasEyedropper && (
          <button
            type="button"
            onClick={activateEyedropper}
            title="Pick color from screen"
            className="flex-shrink-0 rounded p-1 text-text-tertiary transition-colors duration-150 hover:bg-white/[0.05] hover:text-white"
          >
            <PipetteIcon />
          </button>
        )}
      </div>

      {/* ── Hex input ── */}
      <div className="flex items-center gap-1.5 rounded-lg border border-[#2a2a2a] bg-black/50 px-2.5 py-1.5">
        <span className="select-none font-mono text-[11px] text-text-tertiary">#</span>
        <input
          type="text"
          value={hexInput.replace("#", "")}
          onChange={(e) => onHexChange(e.target.value)}
          onBlur={() => {
            // revert to last valid on blur
            if (!isValidHex(hexInput)) {
              setHexInput(currentColor.toUpperCase());
            }
          }}
          maxLength={6}
          spellCheck={false}
          aria-label="Hex color value"
          className={cn(
            "flex-1 bg-transparent font-mono text-[12px] tracking-wider outline-none",
            isValidHex(hexInput) ? "text-white" : "text-red-400"
          )}
        />
      </div>

      {/* ── Preset swatches ── */}
      <div className="space-y-1.5">
        <p className="text-[9px] font-medium uppercase tracking-[0.15em] text-text-placeholder">
          Presets
        </p>
        <div className="flex flex-wrap gap-1.5">
          {PICKER_PRESETS.map((c) => (
            <SwatchButton
              key={c}
              color={c}
              selected={currentColor.toUpperCase() === c.toUpperCase()}
              onClick={() => selectColor(c)}
            />
          ))}
        </div>
      </div>

      {/* ── Recent colors ── */}
      {recent.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[9px] font-medium uppercase tracking-[0.15em] text-text-placeholder">
            Recent
          </p>
          <div className="flex flex-wrap gap-1.5">
            {recent.map((c) => (
              <SwatchButton
                key={c}
                color={c}
                selected={currentColor.toUpperCase() === c.toUpperCase()}
                onClick={() => selectColor(c)}
              />
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SwatchButton({
  color,
  selected,
  onClick,
}: {
  color: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={color}
      title={color}
      className={cn(
        "h-5 w-5 rounded-full transition-[transform,box-shadow] duration-100",
        color.toUpperCase() === "#FFFFFF"
          ? "border border-[#3a3a3a]"
          : "border border-transparent",
        selected
          ? "scale-110 ring-2 ring-white ring-offset-2 ring-offset-[#111]"
          : "hover:scale-110"
      )}
      style={{ backgroundColor: color }}
    />
  );
}

function PipetteIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m2 22 1-1h3l9-9" />
      <path d="M3 21v-3l9-9" />
      <path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z" />
    </svg>
  );
}
