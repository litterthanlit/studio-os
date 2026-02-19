"use client";

import * as React from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { SectionLabel } from "@/components/ui/section-label";
import { PROJECTS } from "../projects/projects-data";

const FLOW_PROJECTS = PROJECTS.map((p) => ({
  id: p.id,
  name: p.name,
  phase: p.phase,
  palette: p.palette,
  references: p.references,
  leadImage: p.leadImage,
}));

const RECENT_ACTIONS = [
  "Added 3 references to Vision",
  "Updated heading font → Playfair Display",
  "Reviewed Figma comments",
  "Extracted palette from reference",
  "Wrote project brief notes",
];

type FlowState = "idle" | "warmup" | "active" | "exit";

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function FlowPage() {
  const [flowState, setFlowState] = React.useState<FlowState>("idle");
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>(
    FLOW_PROJECTS[0].id
  );
  const [warmupStep, setWarmupStep] = React.useState(0);
  const [elapsed, setElapsed] = React.useState(0);
  const [exitSummary, setExitSummary] = React.useState<{
    duration: number;
    actions: number;
  } | null>(null);

  const selectedProject = FLOW_PROJECTS.find((p) => p.id === selectedProjectId)!;

  // Warmup sequence — cycles through recent actions
  React.useEffect(() => {
    if (flowState !== "warmup") return;
    if (warmupStep >= RECENT_ACTIONS.length) {
      setFlowState("active");
      setWarmupStep(0);
      return;
    }
    const t = setTimeout(() => setWarmupStep((s) => s + 1), 500);
    return () => clearTimeout(t);
  }, [flowState, warmupStep]);

  // Elapsed timer while active
  React.useEffect(() => {
    if (flowState !== "active") return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [flowState]);

  function startFlow() {
    setElapsed(0);
    setWarmupStep(0);
    setExitSummary(null);
    setFlowState("warmup");
  }

  function endFlow() {
    setExitSummary({ duration: elapsed, actions: 5 });
    setFlowState("exit");
  }

  function resetFlow() {
    setFlowState("idle");
    setExitSummary(null);
    setElapsed(0);
  }

  // Ambient glow progress — max glow at 90 min (5400s)
  const glowProgress = Math.min(elapsed / 5400, 1);

  return (
    <>
      {/* Idle state — project selector + start button */}
      <AnimatePresence mode="wait">
        {flowState === "idle" && (
          <motion.section
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="space-y-6"
          >
            <div className="space-y-1">
              <SectionLabel>Flow</SectionLabel>
              <h2 className="text-[32px] font-semibold text-text-primary tracking-tight mt-1">
                Focus Mode
              </h2>
              <p className="text-sm text-text-secondary">
                Enter a distraction-free environment scoped to one project.
                All other context goes quiet.
              </p>
            </div>

            {/* Project selector */}
            <div className="space-y-2">
              <SectionLabel>Select Project</SectionLabel>
              <div className="space-y-2">
                {FLOW_PROJECTS.map((project) => {
                  const active = selectedProjectId === project.id;
                  return (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => setSelectedProjectId(project.id)}
                      className={cn(
                        "flex w-full items-center justify-between border bg-card-bg px-4 py-3 text-left transition-[border-color] duration-200 ease-out",
                        active
                          ? "border-accent/60"
                          : "border-[#1a1a1a] hover:border-[#252525]"
                      )}
                    >
                      <div>
                        <div className="text-sm font-medium text-text-primary">
                          {project.name}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {project.phase}
                        </div>
                      </div>
                      {active && (
                        <div className="h-1.5 w-1.5 rounded-full bg-accent" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected project preview */}
            <div className="border border-[#1a1a1a] bg-card-bg p-5 space-y-3">
              <SectionLabel>{selectedProject.name} — Preview</SectionLabel>

              {/* 4 thumbnails */}
              <div className="flex items-center gap-2">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="relative h-12 w-12 overflow-hidden border border-card-border bg-bg-tertiary"
                  >
                    <Image
                      src={`https://picsum.photos/seed/${selectedProject.id}-${i}/96/96`}
                      alt=""
                      fill
                      className="object-cover opacity-80"
                      unoptimized
                    />
                  </div>
                ))}
                <span className="ml-1 font-mono text-[11px] text-text-secondary">
                  {selectedProject.references} refs
                </span>
              </div>

              {/* Palette swatches */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {selectedProject.palette.slice(0, 6).map((color) => (
                    <span
                      key={color}
                      className="h-3.5 w-3.5 rounded-full border border-white/10"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <span className="text-[11px] text-text-secondary">{selectedProject.phase}</span>
              </div>
            </div>

            {/* Recent context preview */}
            <div className="space-y-2">
              <SectionLabel>Your Last 5 Actions</SectionLabel>
              <ul className="space-y-1">
                {RECENT_ACTIONS.map((action, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-3 text-[11px] text-text-muted font-mono"
                  >
                    <span className="text-text-muted">·</span>
                    {action}
                  </li>
                ))}
              </ul>
            </div>

            {/* Start button — centered, prominent */}
            <div className="flex flex-col items-center gap-2 pt-2">
              <button
                type="button"
                onClick={startFlow}
                className={cn(
                  "flex h-12 items-center justify-center border border-white bg-white",
                  "px-8 text-sm font-medium text-black",
                  "transition-[background-color] duration-200 ease-out",
                  "hover:bg-button-primary-bg/90"
                )}
              >
                Enter Flow — {selectedProject.name}
              </button>
              <span className="text-[11px] text-text-placeholder">⌘⇧F to enter instantly</span>
            </div>

            {/* Tips */}
            <div className="space-y-2 border-t border-[#151515] pt-4">
              <SectionLabel>Tips</SectionLabel>
              <ul className="space-y-1">
                {[
                  "Cmd+K is scoped to this project while in Flow",
                  "All import syncs queue silently — nothing interrupts",
                  "Exit any time — you'll see a summary of what you did",
                ].map((tip) => (
                  <li key={tip} className="text-[11px] text-text-muted font-mono">
                    · {tip}
                  </li>
                ))}
              </ul>
            </div>
          </motion.section>
        )}

        {/* Warmup state — shows recent actions one by one */}
        {flowState === "warmup" && (
          <motion.div
            key="warmup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex min-h-[60vh] flex-col items-center justify-center gap-6"
          >
          <SectionLabel>Getting you back in context</SectionLabel>
            <div className="h-12 text-center">
              <AnimatePresence mode="wait">
                <motion.p
                  key={warmupStep}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="text-sm text-gray-400"
                >
                  {RECENT_ACTIONS[warmupStep] ?? "Entering Flow..."}
                </motion.p>
              </AnimatePresence>
            </div>
            <div className="flex gap-1">
              {RECENT_ACTIONS.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-0.5 w-8 transition-[background-color] duration-300",
                    i < warmupStep ? "bg-accent" : "bg-[#333333]"
                  )}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Active state — immersive focus view */}
        {flowState === "active" && (
          <motion.div
            key="active"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex min-h-[70vh] flex-col"
          >
            {/* Ambient progress glow at top */}
            <div className="relative mb-8 h-px w-full bg-bg-input">
              <motion.div
                className="absolute inset-y-0 left-0 bg-accent"
                animate={{ width: `${glowProgress * 100}%` }}
                transition={{ duration: 1, ease: "linear" }}
                style={{ boxShadow: `0 0 8px 1px rgba(0, 112, 243, ${0.3 + glowProgress * 0.5})` }}
              />
            </div>

            <div className="flex flex-1 flex-col items-center justify-center gap-8 py-12 text-center">
              {/* Project name */}
              <div className="space-y-1">
                  <SectionLabel>Flow — {selectedProject.phase}</SectionLabel>
                <div className="text-2xl font-semibold text-text-primary">
                  {selectedProject.name}
                </div>
              </div>

              {/* Elapsed time */}
              <div className="font-mono text-5xl font-light tabular-nums text-text-primary">
                {formatElapsed(elapsed)}
              </div>

              {/* Flow Score ambient ring — placeholder */}
              <div className="relative flex h-24 w-24 items-center justify-center">
                <svg
                  className="absolute inset-0 -rotate-90"
                  viewBox="0 0 96 96"
                >
                  <circle
                    cx="48"
                    cy="48"
                    r="44"
                    fill="none"
                    stroke="#222222"
                    strokeWidth="2"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="44"
                    fill="none"
                    stroke="#0070F3"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 44}`}
                    strokeDashoffset={`${2 * Math.PI * 44 * (1 - Math.min(elapsed / 5400, 1))}`}
                    style={{
                      transition: "stroke-dashoffset 1s linear",
                      filter: "drop-shadow(0 0 4px rgba(0,112,243,0.6))",
                    }}
                  />
                </svg>
                <div className="text-center">
                  <div className="text-[9px] font-medium uppercase tracking-[0.15em] text-gray-500">
                    Flow
                  </div>
                  <div className="text-xs text-white">Score</div>
                </div>
              </div>

              {/* Active status */}
              <div className="flex items-center gap-2 text-[11px] text-gray-500">
                <div className="h-1.5 w-1.5 rounded-full bg-accent" style={{ boxShadow: "0 0 6px rgba(0,112,243,0.8)" }} />
                <span>Active — all syncs queued</span>
              </div>

              {/* End flow */}
              <button
                type="button"
                onClick={endFlow}
                className="border border-border-primary bg-transparent px-6 py-2 text-sm font-medium text-text-tertiary transition-[border-color,color] duration-200 ease-out hover:border-border-hover hover:text-white"
              >
                End Flow
              </button>
            </div>
          </motion.div>
        )}

        {/* Exit summary */}
        {flowState === "exit" && exitSummary && (
          <motion.div
            key="exit"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex min-h-[60vh] flex-col items-center justify-center gap-8 text-center"
          >
            <div className="space-y-1">
              <SectionLabel>Flow Complete</SectionLabel>
              <h2 className="text-2xl font-semibold text-text-primary">
                {selectedProject.name}
              </h2>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="space-y-1 border border-[#1a1a1a] bg-card-bg p-4">
                <div className="font-mono text-3xl font-light text-text-primary">
                  {formatElapsed(exitSummary.duration)}
                </div>
                <div className="text-[11px] text-text-tertiary font-mono uppercase tracking-wider">Focus time</div>
              </div>
              <div className="space-y-1 border border-[#1a1a1a] bg-card-bg p-4">
                <div className="font-mono text-3xl font-light text-text-primary">
                  {exitSummary.actions}
                </div>
                <div className="text-[11px] text-text-tertiary font-mono uppercase tracking-wider">Actions taken</div>
              </div>
            </div>

            {/* Exit summary actions */}
            <div className="space-y-2 w-full max-w-xs">
              <SectionLabel>What you did</SectionLabel>
              <ul className="space-y-1">
                {RECENT_ACTIONS.slice(0, exitSummary.actions).map(
                  (action, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-3 text-[11px] text-text-muted font-mono"
                    >
                      <span className="text-accent">·</span>
                      {action}
                    </li>
                  )
                )}
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={startFlow}
                className="flex h-10 items-center border border-white bg-white px-4 text-sm font-medium text-black transition-[background-color] duration-200 ease-out hover:bg-button-primary-bg/90"
              >
                Start Another Session
              </button>
              <button
                type="button"
                onClick={resetFlow}
                className="flex h-10 items-center border border-border-primary px-4 text-sm font-medium text-text-tertiary transition-[border-color,color] duration-200 ease-out hover:border-border-hover hover:text-white"
              >
                Done
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
