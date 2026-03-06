"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { springs, slideUp, staggerContainer, staggerItem } from "@/lib/animations";
import type { ImageAnalysis } from "@/lib/canvas/analyze-images";

type AnalysisPanelProps = {
  analysis: ImageAnalysis | null;
  loading: boolean;
};

function ColorSwatch({ color, label }: { color: string; label?: string }) {
  return (
    <motion.div
      whileHover={{ scale: 1.1, y: -2, transition: springs.bouncy }}
      className="flex flex-col items-center gap-1"
    >
      <div
        className="w-7 h-7 border border-border-primary"
        style={{ backgroundColor: color }}
        title={color}
      />
      <span className="text-[9px] font-mono text-text-muted">
        {label || color}
      </span>
    </motion.div>
  );
}

function VibeTag({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] uppercase tracking-[0.12em] text-text-muted">
        {label}
      </span>
      <span className="text-[10px] font-medium text-text-secondary border border-border-primary bg-bg-tertiary px-1.5 py-0.5">
        {value}
      </span>
    </div>
  );
}

export function AnalysisPanel({ analysis, loading }: AnalysisPanelProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full"
        />
        <span className="text-[11px] uppercase tracking-[0.12em] text-text-muted">
          Analyzing references...
        </span>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <span className="font-mono text-text-muted text-sm">⊘</span>
        <p className="text-[11px] text-text-tertiary">
          Select references and analyze to extract design patterns
        </p>
      </div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        {...slideUp}
        transition={springs.smooth}
        className="space-y-4"
      >
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="space-y-4"
        >
          {/* Colors */}
          <motion.div variants={staggerItem} className="space-y-2">
            <h4 className="text-[11px] uppercase tracking-[0.15em] font-medium text-text-tertiary">
              Color Palette
            </h4>
            <div className="space-y-2">
              <div>
                <span className="text-[9px] uppercase tracking-[0.1em] text-text-muted mb-1 block">
                  Dominant
                </span>
                <div className="flex gap-1.5">
                  {analysis.colors.dominant.map((c) => (
                    <ColorSwatch key={c} color={c} />
                  ))}
                </div>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-[0.1em] text-text-muted mb-1 block">
                  Accents
                </span>
                <div className="flex gap-1.5">
                  {analysis.colors.accents.map((c) => (
                    <ColorSwatch key={c} color={c} />
                  ))}
                </div>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-[0.1em] text-text-muted mb-1 block">
                  Neutrals
                </span>
                <div className="flex gap-1.5">
                  {analysis.colors.neutrals.map((c) => (
                    <ColorSwatch key={c} color={c} />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Typography */}
          <motion.div variants={staggerItem} className="space-y-2">
            <h4 className="text-[11px] uppercase tracking-[0.15em] font-medium text-text-tertiary">
              Typography
            </h4>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-text-muted">Category:</span>
                <span className="text-[10px] font-medium text-text-secondary">
                  {analysis.typography.category}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {analysis.typography.weights.map((w) => (
                  <span
                    key={w}
                    className="border border-border-primary bg-bg-tertiary px-1.5 py-0.5 text-[9px] font-mono text-text-muted"
                  >
                    {w}
                  </span>
                ))}
              </div>
              <p className="text-[10px] text-text-tertiary leading-relaxed">
                {analysis.typography.hierarchy}
              </p>
            </div>
          </motion.div>

          {/* Vibe */}
          <motion.div variants={staggerItem} className="space-y-2">
            <h4 className="text-[11px] uppercase tracking-[0.15em] font-medium text-text-tertiary">
              Vibe
            </h4>
            <div className="space-y-1.5">
              <VibeTag label="Density" value={analysis.vibe.density} />
              <VibeTag label="Tone" value={analysis.vibe.tone} />
              <VibeTag label="Energy" value={analysis.vibe.energy} />
            </div>
          </motion.div>

          {/* Spacing */}
          <motion.div variants={staggerItem} className="space-y-2">
            <h4 className="text-[11px] uppercase tracking-[0.15em] font-medium text-text-tertiary">
              Spacing
            </h4>
            <div className="space-y-1.5">
              <VibeTag label="Density" value={analysis.spacing.density} />
              <p className="text-[10px] text-text-tertiary leading-relaxed">
                {analysis.spacing.rhythm}
              </p>
            </div>
          </motion.div>

          {/* Summary */}
          <motion.div variants={staggerItem} className="space-y-2">
            <h4 className="text-[11px] uppercase tracking-[0.15em] font-medium text-text-tertiary">
              Summary
            </h4>
            <p className="text-xs text-text-secondary leading-relaxed">
              {analysis.summary}
            </p>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
