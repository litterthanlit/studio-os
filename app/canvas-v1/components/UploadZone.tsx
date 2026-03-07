"use client";

import * as React from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { springs, fadeIn } from "@/lib/animations";

type UploadZoneProps = {
  onFilesAdded: (files: File[]) => void;
  disabled?: boolean;
};

export function UploadZone({ onFilesAdded, disabled }: UploadZoneProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/webp": [".webp"],
      "image/gif": [".gif"],
    },
    multiple: true,
    disabled,
    onDrop: (accepted) => {
      if (accepted.length > 0) onFilesAdded(accepted);
    },
  });

  return (
    <motion.div
      {...(getRootProps() as React.HTMLAttributes<HTMLDivElement>)}
      whileHover={disabled ? {} : { scale: 1.005, transition: springs.smooth }}
      whileTap={disabled ? {} : { scale: 0.995, transition: springs.snappy }}
      className={cn(
        "relative flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-4 py-8 cursor-pointer",
        "transition-colors duration-200",
        isDragActive
          ? "border-accent bg-accent-subtle"
          : "border-border-primary bg-bg-secondary hover:border-border-hover",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <input {...getInputProps()} />

      <AnimatePresence mode="wait">
        {isDragActive ? (
          <motion.div
            key="drag-active"
            {...fadeIn}
            transition={springs.smooth}
            className="flex flex-col items-center gap-2 text-center"
          >
            <span className="text-2xl">↓</span>
            <span className="text-xs font-medium uppercase tracking-[0.15em] text-accent">
              Drop to add references
            </span>
          </motion.div>
        ) : (
          <motion.div
            key="drag-idle"
            {...fadeIn}
            transition={springs.smooth}
            className="flex flex-col items-center gap-2 text-center"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-lg border border-border-primary bg-bg-tertiary">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5 text-text-muted"
              >
                <rect x="5" y="6" width="14" height="12" rx="1.5" />
                <circle cx="9.5" cy="10" r="1.5" fill="currentColor" stroke="none" opacity="0.6" />
                <path d="M5 15.5l4-3.5 3.5 3 2-2.5 4.5 4" opacity="0.7" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">
                Drop images or click to browse
              </p>
              <p className="text-[10px] text-text-muted mt-0.5">
                PNG, JPG, WebP — Pinterest, Are.na, local files
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
