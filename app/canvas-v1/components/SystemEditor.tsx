"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { springs, slideUp, staggerContainer, staggerItem } from "@/lib/animations";
import { ColorPickerPanel } from "@/components/color-picker";
import type { DesignSystemTokens } from "@/lib/canvas/generate-system";

type SystemEditorProps = {
  markdown: string;
  tokens: DesignSystemTokens | null;
  onMarkdownChange: (md: string) => void;
  onTokensChange: (tokens: DesignSystemTokens) => void;
  loading: boolean;
};

type PickerState = {
  key: keyof DesignSystemTokens["colors"];
  position: { top: number; left: number };
} | null;

const PANEL_H = 360;
const PANEL_W = 248;

function computePickerPos(triggerEl: HTMLElement): { top: number; left: number } {
  const rect = triggerEl.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom - 8;
  const top = spaceBelow >= PANEL_H ? rect.bottom + 8 : rect.top - PANEL_H - 8;
  const left = Math.min(rect.left, window.innerWidth - PANEL_W - 8);
  return { top, left };
}

function TokenColorRow({
  label,
  value,
  onOpenPicker,
  onChange,
}: {
  label: string;
  value: string;
  onOpenPicker: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 group">
      <button
        type="button"
        onClick={onOpenPicker}
        className="w-5 h-5 shrink-0 border border-[#E5E5E0] cursor-pointer rounded-sm transition-[box-shadow] duration-150 hover:ring-2 hover:ring-white/20 hover:ring-offset-1 hover:ring-offset-white"
        style={{ backgroundColor: value }}
        aria-label={`Pick color for ${label}`}
      />
      <span className="text-[10px] text-[#A0A0A0] flex-1 truncate">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-[72px] bg-[#E5E5E0] border border-[#E5E5E0] px-1.5 py-0.5 text-[10px] font-mono text-[#6B6B6B] focus:border-[#D1E4FC] focus:outline-none"
      />
    </div>
  );
}

export function SystemEditor({
  markdown,
  tokens,
  onMarkdownChange,
  onTokensChange,
  loading,
}: SystemEditorProps) {
  const [mode, setMode] = React.useState<"visual" | "markdown">("visual");
  const [picker, setPicker] = React.useState<PickerState>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => { setMounted(true); }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="w-5 h-5 border-2 border-[#4B57DB] border-t-transparent rounded-full"
        />
        <span className="text-[11px] uppercase tracking-[0.12em] text-[#A0A0A0]">
          Generating design system...
        </span>
      </div>
    );
  }

  if (!tokens) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <span className="font-mono text-lg text-[#A0A0A0]">{"{ }"}</span>
        <p className="text-[11px] text-[#A0A0A0]">
          Analyze references first to generate a design system
        </p>
      </div>
    );
  }

  function updateColor(key: keyof DesignSystemTokens["colors"], value: string) {
    if (!tokens) return;
    onTokensChange({
      ...tokens,
      colors: { ...tokens.colors, [key]: value },
    });
  }

  function handleOpenPicker(
    key: keyof DesignSystemTokens["colors"],
    e: React.MouseEvent<HTMLButtonElement>
  ) {
    const pos = computePickerPos(e.currentTarget);
    setPicker({ key, position: pos });
  }

  return (
    <motion.div {...slideUp} transition={springs.smooth} className="space-y-3">
      {/* Mode toggle */}
      <div className="flex border border-[#E5E5E0] rounded-sm overflow-hidden">
        {(["visual", "markdown"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              "flex-1 py-1.5 text-[10px] uppercase tracking-[0.12em] font-medium transition-colors",
              mode === m
                ? "bg-[#E5E5E0] text-[#1A1A1A]"
                : "text-[#A0A0A0] hover:text-[#6B6B6B]"
            )}
          >
            {m}
          </button>
        ))}
      </div>

      {mode === "visual" ? (
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="space-y-4"
        >
          {/* Colors */}
          <motion.div variants={staggerItem} className="space-y-2">
            <h4 className="text-[11px] uppercase tracking-[0.15em] font-medium text-[#A0A0A0]">
              Colors
            </h4>
            <div className="space-y-1.5">
              {(Object.keys(tokens.colors) as (keyof DesignSystemTokens["colors"])[]).map((key) => (
                <TokenColorRow
                  key={key}
                  label={key}
                  value={tokens.colors[key]}
                  onOpenPicker={(e) => handleOpenPicker(key, e)}
                  onChange={(v) => updateColor(key, v)}
                />
              ))}
            </div>
          </motion.div>

          {/* Typography preview */}
          <motion.div variants={staggerItem} className="space-y-2">
            <h4 className="text-[11px] uppercase tracking-[0.15em] font-medium text-[#A0A0A0]">
              Typography
            </h4>
            <div
              className="border border-[#E5E5E0] bg-[#E5E5E0] p-3 space-y-1"
              style={{ fontFamily: tokens.typography.fontFamily }}
            >
              {Object.entries(tokens.typography.scale)
                .reverse()
                .map(([name, size]) => (
                  <div key={name} className="flex items-baseline gap-2">
                    <span className="text-[9px] font-mono text-[#A0A0A0] w-6 shrink-0 text-right">
                      {name}
                    </span>
                    <span style={{ fontSize: size, lineHeight: 1.3, color: tokens.colors.text }}>
                      Aa
                    </span>
                  </div>
                ))}
            </div>
          </motion.div>

          {/* Spacing */}
          <motion.div variants={staggerItem} className="space-y-2">
            <h4 className="text-[11px] uppercase tracking-[0.15em] font-medium text-[#A0A0A0]">
              Spacing &middot; {tokens.spacing.unit}px base
            </h4>
            <div className="flex items-end gap-0.5">
              {Object.entries(tokens.spacing.scale)
                .filter(([k]) => k !== "0")
                .map(([name, value]) => {
                  const px = parseInt(value);
                  return (
                    <div key={name} className="flex flex-col items-center gap-0.5">
                      <div
                        className="bg-accent/30 border border-[#4B57DB]/50"
                        style={{ width: 12, height: Math.min(px, 60) }}
                      />
                      <span className="text-[8px] font-mono text-[#A0A0A0]">{name}</span>
                    </div>
                  );
                })}
            </div>
          </motion.div>

          {/* Component preview */}
          <motion.div variants={staggerItem} className="space-y-2">
            <h4 className="text-[11px] uppercase tracking-[0.15em] font-medium text-[#A0A0A0]">
              Component Preview
            </h4>
            <div
              className="border border-[#E5E5E0] p-4 space-y-3"
              style={{ backgroundColor: tokens.colors.background }}
            >
              <button
                type="button"
                style={{
                  backgroundColor: tokens.colors.primary,
                  color: tokens.colors.background,
                  padding: `${tokens.spacing.scale["2"]} ${tokens.spacing.scale["4"]}`,
                  borderRadius: tokens.radii.md,
                  fontWeight: tokens.typography.weights.medium,
                  fontSize: tokens.typography.scale.sm,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Primary Button
              </button>
              <div
                style={{
                  backgroundColor: tokens.colors.surface,
                  border: `1px solid ${tokens.colors.border}`,
                  padding: tokens.spacing.scale["4"],
                  borderRadius: tokens.radii.lg,
                  boxShadow: tokens.shadows.sm,
                }}
              >
                <p style={{ color: tokens.colors.text, fontSize: tokens.typography.scale.sm, margin: 0 }}>
                  Card component preview
                </p>
              </div>
              <input
                type="text"
                placeholder="Input component"
                style={{
                  width: "100%",
                  backgroundColor: tokens.colors.background,
                  border: `1px solid ${tokens.colors.border}`,
                  padding: `${tokens.spacing.scale["2"]} ${tokens.spacing.scale["3"]}`,
                  borderRadius: tokens.radii.md,
                  fontSize: tokens.typography.scale.sm,
                  color: tokens.colors.text,
                  outline: "none",
                }}
              />
            </div>
          </motion.div>
        </motion.div>
      ) : (
        <div className="relative">
          <textarea
            value={markdown}
            onChange={(e) => onMarkdownChange(e.target.value)}
            className={cn(
              "w-full min-h-[400px] bg-[#E5E5E0] border border-[#E5E5E0] p-3",
              "font-mono text-[11px] text-[#6B6B6B] leading-relaxed",
              "resize-y focus:border-[#D1E4FC] focus:outline-none"
            )}
            spellCheck={false}
          />
        </div>
      )}

      {/* Color picker panel — portalled to body */}
      {mounted && picker && typeof document !== "undefined" &&
        createPortal(
          <ColorPickerPanel
            value={tokens.colors[picker.key]}
            position={picker.position}
            onChange={(c) => updateColor(picker.key, c)}
            onClose={() => setPicker(null)}
          />,
          document.body
        )
      }
    </motion.div>
  );
}
