"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { cn } from "@/lib/utils";
import { springs, slideUp } from "@/lib/animations";

type CodeViewerProps = {
  code: string | null;
  className?: string;
};

export function CodeViewer({ code, className }: CodeViewerProps) {
  if (!code) {
    return (
      <div className={cn("flex items-center justify-center py-12", className)}>
        <p className="text-[11px] text-text-muted font-mono">
          {"// No code generated yet"}
        </p>
      </div>
    );
  }

  return (
    <motion.div
      {...slideUp}
      transition={springs.smooth}
      className={cn("relative overflow-hidden", className)}
    >
      <div className="absolute top-0 left-0 right-0 flex items-center gap-1.5 px-3 py-2 bg-[#282c34] border-b border-white/5 z-10">
        <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
        <span className="flex-1 text-center text-[10px] text-white/30 font-mono">
          component.tsx
        </span>
      </div>
      <div className="pt-9 overflow-auto max-h-[500px]">
        <SyntaxHighlighter
          language="tsx"
          style={oneDark}
          customStyle={{
            margin: 0,
            padding: "16px",
            fontSize: "11px",
            lineHeight: "1.6",
            background: "#282c34",
            borderRadius: 0,
          }}
          showLineNumbers
          lineNumberStyle={{
            minWidth: "2.5em",
            paddingRight: "1em",
            color: "rgba(255,255,255,0.15)",
            fontSize: "10px",
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </motion.div>
  );
}
