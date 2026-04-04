"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_COLORS = [
  "#000000",
  "#333333",
  "#666666",
  "#D4D4D4",
  "#F5F5F0",
  "#FFFFFF",
  "#EF4444",
  "#F97316",
  "#EAB308",
  "#22C55E",
  "#4B57DB",
  "#8B5CF6",
];

const POPOVER_WIDTH = 240;
const VIEWPORT_PADDING = 8;
const GRADIENT_WIDTH = 216;
const GRADIENT_HEIGHT = 160;
const SLIDER_HEIGHT = 12;

// ─── Color Math ──────────────────────────────────────────────────────────────

function hsvToHex(h: number, s: number, v: number): string {
  h = ((h % 360) + 360) % 360;
  const i = Math.floor(h / 60);
  const f = h / 60 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  let r: number, g: number, b: number;
  switch (i) {
    case 0:
      [r, g, b] = [v, t, p];
      break;
    case 1:
      [r, g, b] = [q, v, p];
      break;
    case 2:
      [r, g, b] = [p, v, t];
      break;
    case 3:
      [r, g, b] = [p, q, v];
      break;
    case 4:
      [r, g, b] = [t, p, v];
      break;
    default:
      [r, g, b] = [v, p, q];
  }
  const toHex = (n: number) =>
    Math.round(Math.max(0, Math.min(1, n)) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function hexToHsv(hex: string): { h: number; s: number; v: number } | null {
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
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

function normalizeHexColor(value: string): string | null {
  const hex = value.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(hex)) return null;

  const expanded =
    hex.length === 3
      ? hex
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : hex;

  return `#${expanded.toUpperCase()}`;
}

function dedupeColors(colors: string[]): string[] {
  const uniqueColors = new Map<string, string>();
  for (const color of colors) {
    const normalized = normalizeHexColor(color);
    if (!normalized || uniqueColors.has(normalized)) continue;
    uniqueColors.set(normalized, normalized);
  }
  return [...uniqueColors.values()];
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  h = ((h % 360) + 360) % 360;
  const i = Math.floor(h / 60);
  const f = h / 60 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  let r: number, g: number, b: number;
  switch (i) {
    case 0:
      [r, g, b] = [v, t, p];
      break;
    case 1:
      [r, g, b] = [q, v, p];
      break;
    case 2:
      [r, g, b] = [p, v, t];
      break;
    case 3:
      [r, g, b] = [p, q, v];
      break;
    case 4:
      [r, g, b] = [t, p, v];
      break;
    default:
      [r, g, b] = [v, p, q];
  }
  return [
    Math.round(r * 255),
    Math.round(g * 255),
    Math.round(b * 255),
  ];
}

// ─── Gradient Drawing ────────────────────────────────────────────────────────

function drawSaturationBrightness(
  canvas: HTMLCanvasElement,
  hue: number
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { width, height } = canvas;

  // Base hue color
  const hueColor = hsvToHex(hue, 1, 1);

  // White → hue (left to right)
  const gH = ctx.createLinearGradient(0, 0, width, 0);
  gH.addColorStop(0, "#FFFFFF");
  gH.addColorStop(1, hueColor);
  ctx.fillStyle = gH;
  ctx.fillRect(0, 0, width, height);

  // Transparent → black (top to bottom)
  const gV = ctx.createLinearGradient(0, 0, 0, height);
  gV.addColorStop(0, "rgba(0,0,0,0)");
  gV.addColorStop(1, "#000000");
  ctx.fillStyle = gV;
  ctx.fillRect(0, 0, width, height);
}

function drawHueStrip(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const g = ctx.createLinearGradient(0, 0, canvas.width, 0);
  for (let i = 0; i <= 12; i++) {
    g.addColorStop(i / 12, `hsl(${i * 30},100%,50%)`);
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawOpacityStrip(
  canvas: HTMLCanvasElement,
  hex: string
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { width, height } = canvas;

  // Checkerboard pattern
  const checkSize = 4;
  for (let y = 0; y < height; y += checkSize) {
    for (let x = 0; x < width; x += checkSize) {
      const isLight =
        (Math.floor(x / checkSize) + Math.floor(y / checkSize)) % 2 === 0;
      ctx.fillStyle = isLight ? "#FFFFFF" : "#CCCCCC";
      ctx.fillRect(x, y, checkSize, checkSize);
    }
  }

  // Gradient from transparent → current color
  const parsed = hexToHsv(hex);
  const [r, g, b] = parsed
    ? hsvToRgb(parsed.h, parsed.s, parsed.v)
    : [0, 0, 0];

  const grad = ctx.createLinearGradient(0, 0, width, 0);
  grad.addColorStop(0, `rgba(${r},${g},${b},0)`);
  grad.addColorStop(1, `rgba(${r},${g},${b},1)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
}

// ─── Types ───────────────────────────────────────────────────────────────────

type ColorPickerPopoverProps = {
  open: boolean;
  value: string;
  anchorEl: HTMLElement | null;
  documentColors?: string[];
  onSelect: (color: string) => void;
  onClose: () => void;
};

// ─── Component ───────────────────────────────────────────────────────────────

export function ColorPickerPopover({
  open,
  value,
  anchorEl,
  documentColors = [],
  onSelect,
  onClose,
}: ColorPickerPopoverProps) {
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const gradientRef = React.useRef<HTMLCanvasElement>(null);
  const hueRef = React.useRef<HTMLCanvasElement>(null);
  const opacityRef = React.useRef<HTMLCanvasElement>(null);

  const [mounted, setMounted] = React.useState(false);
  const [position, setPosition] = React.useState<{
    top: number;
    left: number;
  } | null>(null);

  // HSV state
  const initialHsv = React.useMemo(
    () => hexToHsv(value) ?? { h: 0, s: 0, v: 1 },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [hue, _setHue] = React.useState(initialHsv.h);
  const [sat, _setSat] = React.useState(initialHsv.s);
  const [bri, _setBri] = React.useState(initialHsv.v);
  const [opacity, setOpacity] = React.useState(100);
  const [hexInput, setHexInput] = React.useState(
    (normalizeHexColor(value) ?? "#FFFFFF").slice(1)
  );

  // Refs so drag handlers don't go stale
  const hueValRef = React.useRef(initialHsv.h);
  const satValRef = React.useRef(initialHsv.s);
  const briValRef = React.useRef(initialHsv.v);
  const onSelectRef = React.useRef(onSelect);
  onSelectRef.current = onSelect;

  const setHue = (v: number) => {
    hueValRef.current = v;
    _setHue(v);
  };
  const setSat = (v: number) => {
    satValRef.current = v;
    _setSat(v);
  };
  const setBri = (v: number) => {
    briValRef.current = v;
    _setBri(v);
  };

  const currentHex = React.useMemo(() => hsvToHex(hue, sat, bri), [hue, sat, bri]);

  // ── Mount ──────────────────────────────────────────────────────────────
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // ── Sync HSV from value prop when popover opens ────────────────────────
  const wasOpenRef = React.useRef(false);

  React.useEffect(() => {
    if (open && !wasOpenRef.current) {
      const hsv = hexToHsv(value);
      if (hsv) {
        setHue(hsv.h);
        setSat(hsv.s);
        setBri(hsv.v);
      }
      const norm = normalizeHexColor(value) ?? "#FFFFFF";
      setHexInput(norm.slice(1));
      setOpacity(100);
    }
    wasOpenRef.current = open;
  }, [open, value]);

  // ── Sync hex input + fire onChange when internal color changes ─────────
  React.useEffect(() => {
    setHexInput(currentHex.slice(1));
    onSelectRef.current(currentHex);
  }, [currentHex]);

  // ── Draw gradient canvas ───────────────────────────────────────────────
  React.useEffect(() => {
    if (!gradientRef.current || !open) return;
    drawSaturationBrightness(gradientRef.current, hue);
  }, [hue, open]);

  // ── Draw hue strip ────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!hueRef.current || !open) return;
    drawHueStrip(hueRef.current);
  }, [open]);

  // ── Draw opacity strip ─────────────────────────────────────────────────
  React.useEffect(() => {
    if (!opacityRef.current || !open) return;
    drawOpacityStrip(opacityRef.current, currentHex);
  }, [currentHex, open]);

  // ── Document colors ────────────────────────────────────────────────────
  const documentSwatches = React.useMemo(
    () => dedupeColors(documentColors).slice(0, 8),
    [documentColors]
  );

  // ── Positioning ────────────────────────────────────────────────────────
  const updatePosition = React.useCallback(() => {
    if (!open || !anchorEl) return;

    const anchorRect = anchorEl.getBoundingClientRect();
    const popoverWidth = popoverRef.current?.offsetWidth ?? POPOVER_WIDTH;
    const popoverHeight = popoverRef.current?.offsetHeight ?? 400;

    let left = anchorRect.left;
    left = Math.min(
      Math.max(VIEWPORT_PADDING, left),
      window.innerWidth - popoverWidth - VIEWPORT_PADDING
    );

    let top = anchorRect.bottom + 8;
    if (top + popoverHeight > window.innerHeight - VIEWPORT_PADDING) {
      top = anchorRect.top - popoverHeight - 8;
    }
    top = Math.min(
      Math.max(VIEWPORT_PADDING, top),
      window.innerHeight - popoverHeight - VIEWPORT_PADDING
    );

    setPosition({ top, left });
  }, [anchorEl, open]);

  React.useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, updatePosition, documentSwatches.length]);

  React.useEffect(() => {
    if (!open) return;
    const handler = () => updatePosition();
    window.addEventListener("resize", handler);
    window.addEventListener("scroll", handler, true);
    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("scroll", handler, true);
    };
  }, [open, updatePosition]);

  // ── Close on outside click ──────────────────────────────────────────────
  React.useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (popoverRef.current?.contains(target)) return;
      if (anchorEl?.contains(target)) return;
      onClose();
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [anchorEl, onClose, open]);

  // ── Close on Escape ────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  // ── Gradient drag ──────────────────────────────────────────────────────
  const gradDragging = React.useRef(false);

  function pickFromGradient(cx: number, cy: number) {
    const canvas = gradientRef.current;
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    setSat(Math.max(0, Math.min((cx - r.left) / r.width, 1)));
    setBri(Math.max(0, Math.min(1 - (cy - r.top) / r.height, 1)));
  }

  React.useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (gradDragging.current) pickFromGradient(e.clientX, e.clientY);
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

  // ── Hue drag ───────────────────────────────────────────────────────────
  const hueDragging = React.useRef(false);

  function pickFromHue(cx: number) {
    const canvas = hueRef.current;
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

  // ── Opacity drag ───────────────────────────────────────────────────────
  const opacityDragging = React.useRef(false);

  function pickFromOpacity(cx: number) {
    const canvas = opacityRef.current;
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    const val = Math.max(0, Math.min((cx - r.left) / r.width, 1));
    setOpacity(Math.round(val * 100));
  }

  React.useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (opacityDragging.current) pickFromOpacity(e.clientX);
    };
    const onUp = () => {
      opacityDragging.current = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Hex input handler ──────────────────────────────────────────────────
  function onHexInputChange(raw: string) {
    const sanitized = raw
      .replace(/[^0-9a-fA-F]/g, "")
      .slice(0, 6)
      .toUpperCase();
    setHexInput(sanitized);

    const normalized = normalizeHexColor(sanitized);
    if (!normalized) return;
    const hsv = hexToHsv(normalized);
    if (hsv) {
      setHue(hsv.h);
      setSat(hsv.s);
      setBri(hsv.v);
    }
  }

  // ── Apply a swatch color ───────────────────────────────────────────────
  function applySwatchColor(color: string) {
    const normalized = normalizeHexColor(color);
    if (!normalized) return;
    const hsv = hexToHsv(normalized);
    if (hsv) {
      setHue(hsv.h);
      setSat(hsv.s);
      setBri(hsv.v);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────
  if (!mounted || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open && anchorEl ? (
        <motion.div
          ref={popoverRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
          style={{
            position: "fixed",
            top: position?.top ?? VIEWPORT_PADDING,
            left: position?.left ?? VIEWPORT_PADDING,
            width: POPOVER_WIDTH,
          }}
          className="z-[100] rounded-[8px] border border-[#333] bg-[#1A1A1A] p-3 shadow-xl"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* ── 1. Saturation x Brightness Gradient ─────────────────── */}
          <div
            className="relative select-none"
            style={{
              width: GRADIENT_WIDTH,
              height: GRADIENT_HEIGHT,
            }}
          >
            <canvas
              ref={gradientRef}
              width={GRADIENT_WIDTH}
              height={GRADIENT_HEIGHT}
              className="h-full w-full cursor-crosshair rounded-[4px]"
              onMouseDown={(e) => {
                gradDragging.current = true;
                pickFromGradient(e.clientX, e.clientY);
              }}
            />
            {/* Indicator dot */}
            <div
              className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
              style={{
                left: sat * GRADIENT_WIDTH,
                top: (1 - bri) * GRADIENT_HEIGHT,
                boxShadow:
                  "0 0 0 1px rgba(0,0,0,0.6), 0 2px 6px rgba(0,0,0,0.4)",
              }}
            />
          </div>

          {/* ── 2. Hue Slider ───────────────────────────────────────── */}
          <div className="relative mt-2.5 select-none" style={{ height: SLIDER_HEIGHT }}>
            <canvas
              ref={hueRef}
              width={GRADIENT_WIDTH}
              height={SLIDER_HEIGHT}
              className="h-full w-full cursor-pointer rounded-full"
              onMouseDown={(e) => {
                hueDragging.current = true;
                pickFromHue(e.clientX);
              }}
            />
            {/* Hue thumb */}
            <div
              className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
              style={{
                left: `${(hue / 360) * 100}%`,
                boxShadow:
                  "0 0 0 1px rgba(0,0,0,0.4), 0 1px 4px rgba(0,0,0,0.3)",
              }}
            />
          </div>

          {/* ── 3. Opacity Slider ───────────────────────────────────── */}
          <div className="relative mt-2 select-none" style={{ height: SLIDER_HEIGHT }}>
            <canvas
              ref={opacityRef}
              width={GRADIENT_WIDTH}
              height={SLIDER_HEIGHT}
              className="h-full w-full cursor-pointer rounded-full"
              onMouseDown={(e) => {
                opacityDragging.current = true;
                pickFromOpacity(e.clientX);
              }}
            />
            {/* Opacity thumb */}
            <div
              className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
              style={{
                left: `${opacity}%`,
                boxShadow:
                  "0 0 0 1px rgba(0,0,0,0.4), 0 1px 4px rgba(0,0,0,0.3)",
              }}
            />
          </div>

          {/* ── 4. Hex Input + Opacity Display ──────────────────────── */}
          <div className="mt-2.5 flex items-center gap-1.5">
            <div className="flex flex-1 items-center gap-1 rounded-[4px] border border-[#444] bg-[#2A2A2A] px-2 py-1">
              <span className="select-none text-[11px] text-[#888]">HEX</span>
              <span className="text-[12px] text-[#666]">#</span>
              <input
                type="text"
                value={hexInput}
                onChange={(e) => onHexInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const normalized = normalizeHexColor(hexInput);
                    if (normalized) onSelectRef.current(normalized);
                  }
                }}
                maxLength={6}
                spellCheck={false}
                className="w-full bg-transparent text-[12px] font-mono text-white outline-none placeholder:text-[#555]"
              />
            </div>
            <div className="flex items-center rounded-[4px] border border-[#444] bg-[#2A2A2A] px-2 py-1">
              <span className="text-[12px] font-mono text-white">
                {opacity}%
              </span>
            </div>
          </div>

          {/* ── 5. Document Colors ──────────────────────────────────── */}
          {documentSwatches.length > 0 && (
            <>
              <div className="my-2 h-px bg-[#333]" />
              <div>
                <span className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.18em] text-[#666]">
                  Document Colors
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {documentSwatches.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className="h-5 w-5 rounded-full border border-[#444] transition-shadow hover:ring-2 hover:ring-[#555]"
                      style={{ backgroundColor: color }}
                      onClick={() => applySwatchColor(color)}
                      aria-label={`Select ${color}`}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── 6. Default Colors ──────────────────────────────────── */}
          <div className="my-2 h-px bg-[#333]" />
          <div>
            <span className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.18em] text-[#666]">
              Defaults
            </span>
            <div className="grid grid-cols-6 gap-1.5">
              {DEFAULT_COLORS.map((color) => {
                const isWhite = color.toUpperCase() === "#FFFFFF";
                return (
                  <button
                    key={color}
                    type="button"
                    className="h-5 w-5 cursor-pointer rounded-[2px] border border-[#444] transition-shadow hover:ring-2 hover:ring-[#555]"
                    style={{
                      backgroundColor: color,
                      borderColor: isWhite ? "#555" : "#444",
                    }}
                    onClick={() => applySwatchColor(color)}
                    aria-label={`Select ${color}`}
                  />
                );
              })}
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
