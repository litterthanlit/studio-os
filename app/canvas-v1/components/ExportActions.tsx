"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { springs } from "@/lib/animations";
import {
  copyToClipboard,
  downloadTSX,
  toFramerPasteReady,
} from "@/lib/canvas/export-formats";

type ExportActionsProps = {
  code: string | null;
  componentName: string;
};

export function ExportActions({ code, componentName }: ExportActionsProps) {
  const [copied, setCopied] = React.useState<string | null>(null);

  async function handleCopy(format: "tsx" | "framer") {
    if (!code) return;
    const text = format === "framer" ? toFramerPasteReady(code) : code;
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(format);
      setTimeout(() => setCopied(null), 2000);
    }
  }

  function handleDownload() {
    if (!code) return;
    downloadTSX(code, componentName);
  }

  if (!code) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      <ExportButton
        label={copied === "tsx" ? "Copied!" : "Copy TSX"}
        onClick={() => handleCopy("tsx")}
        active={copied === "tsx"}
      />
      <ExportButton
        label={copied === "framer" ? "Copied!" : "Framer Paste"}
        onClick={() => handleCopy("framer")}
        active={copied === "framer"}
      />
      <ExportButton
        label="Download .tsx"
        onClick={handleDownload}
      />
    </div>
  );
}

function ExportButton({
  label,
  onClick,
  active,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.02, transition: springs.smooth }}
      whileTap={{ scale: 0.97, transition: springs.snappy }}
      className={cn(
        "px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] font-medium border transition-colors",
        active
          ? "border-green-500/50 bg-green-500/10 text-green-400"
          : "border-[#E5E5E0] bg-white text-[#A0A0A0] hover:border-[#D1E4FC] hover:text-[#6B6B6B]"
      )}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={label}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={springs.snappy}
        >
          {label}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
