"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { springs, slideUp, staggerContainer, staggerItem } from "@/lib/animations";
import type { DesignSystemTokens } from "@/lib/canvas/generate-system";

type SystemEditorProps = {
  markdown: string;
  tokens: DesignSystemTokens | null;
  onMarkdownChange: (md: string) => void;
  onTokensChange: (tokens: DesignSystemTokens) => void;
  loading: boolean;
};

function TokenColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 group">
      <div
        className="w-5 h-5 shrink-0 border border-border-primary cursor-pointer relative overflow-hidden"
        style={{ backgroundColor: value }}
      >
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
      <span className="text-[10px] text-text-muted flex-1 truncate">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-[72px] bg-bg-tertiary border border-border-primary px-1.5 py-0.5 text-[10px] font-mono text-text-secondary focus:border-accent focus:outline-none"
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

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full"
        />
        <span className="text-[11px] uppercase tracking-[0.12em] text-text-muted">
          Generating design system...
        </span>
      </div>
    );
  }

  if (!tokens) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <span className="font-mono text-lg text-text-muted">{ }</span>
        <p className="text-[11px] text-text-tertiary">
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

  return (
    <motion.div {...slideUp} transition={springs.smooth} className="space-y-3">
      {/* Mode toggle */}
      <div className="flex border border-border-primary rounded-sm overflow-hidden">
        {(["visual", "markdown"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              "flex-1 py-1.5 text-[10px] uppercase tracking-[0.12em] font-medium transition-colors",
              mode === m
                ? "bg-bg-tertiary text-text-primary"
                : "text-text-muted hover:text-text-secondary"
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
            <h4 className="text-[11px] uppercase tracking-[0.15em] font-medium text-text-tertiary">
              Colors
            </h4>
            <div className="space-y-1.5">
              {(Object.keys(tokens.colors) as (keyof DesignSystemTokens["colors"])[]).map((key) => (
                <TokenColorRow
                  key={key}
                  label={key}
                  value={tokens.colors[key]}
                  onChange={(v) => updateColor(key, v)}
                />
              ))}
            </div>
          </motion.div>

          {/* Typography preview */}
          <motion.div variants={staggerItem} className="space-y-2">
            <h4 className="text-[11px] uppercase tracking-[0.15em] font-medium text-text-tertiary">
              Typography
            </h4>
            <div
              className="border border-border-primary bg-bg-tertiary p-3 space-y-1"
              style={{ fontFamily: tokens.typography.fontFamily }}
            >
              {Object.entries(tokens.typography.scale)
                .reverse()
                .map(([name, size]) => (
                  <div
                    key={name}
                    className="flex items-baseline gap-2"
                  >
                    <span className="text-[9px] font-mono text-text-muted w-6 shrink-0 text-right">
                      {name}
                    </span>
                    <span
                      style={{ fontSize: size, lineHeight: 1.3, color: tokens.colors.text }}
                    >
                      Aa
                    </span>
                  </div>
                ))}
            </div>
          </motion.div>

          {/* Spacing */}
          <motion.div variants={staggerItem} className="space-y-2">
            <h4 className="text-[11px] uppercase tracking-[0.15em] font-medium text-text-tertiary">
              Spacing · {tokens.spacing.unit}px base
            </h4>
            <div className="flex items-end gap-0.5">
              {Object.entries(tokens.spacing.scale)
                .filter(([k]) => k !== "0")
                .map(([name, value]) => {
                  const px = parseInt(value);
                  return (
                    <div
                      key={name}
                      className="flex flex-col items-center gap-0.5"
                    >
                      <div
                        className="bg-accent/30 border border-accent/50"
                        style={{ width: 12, height: Math.min(px, 60) }}
                      />
                      <span className="text-[8px] font-mono text-text-muted">{name}</span>
                    </div>
                  );
                })}
            </div>
          </motion.div>

          {/* Component preview */}
          <motion.div variants={staggerItem} className="space-y-2">
            <h4 className="text-[11px] uppercase tracking-[0.15em] font-medium text-text-tertiary">
              Component Preview
            </h4>
            <div
              className="border border-border-primary p-4 space-y-3"
              style={{ backgroundColor: tokens.colors.background }}
            >
              {/* Button */}
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

              {/* Card */}
              <div
                style={{
                  backgroundColor: tokens.colors.surface,
                  border: `1px solid ${tokens.colors.border}`,
                  padding: tokens.spacing.scale["4"],
                  borderRadius: tokens.radii.lg,
                  boxShadow: tokens.shadows.sm,
                }}
              >
                <p
                  style={{
                    color: tokens.colors.text,
                    fontSize: tokens.typography.scale.sm,
                    margin: 0,
                  }}
                >
                  Card component preview
                </p>
              </div>

              {/* Input */}
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
              "w-full min-h-[400px] bg-bg-tertiary border border-border-primary p-3",
              "font-mono text-[11px] text-text-secondary leading-relaxed",
              "resize-y focus:border-accent focus:outline-none"
            )}
            spellCheck={false}
          />
        </div>
      )}
    </motion.div>
  );
}
