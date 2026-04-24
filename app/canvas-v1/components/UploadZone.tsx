"use client";

import * as React from "react";
import { useDropzone } from "react-dropzone";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { springs, fadeIn } from "@/lib/animations";

type UploadZoneProps = {
  onFilesAdded: (files: File[]) => void;
  disabled?: boolean;
  className?: string;
};

export function UploadZone({ onFilesAdded, disabled, className }: UploadZoneProps) {
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
    <div
      {...getRootProps()}
      className={cn(
        "relative flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-4 py-8 cursor-pointer",
        "transition-colors duration-200",
        isDragActive
          ? "border-[#4B57DB] bg-accent-subtle"
          : "border-[#E5E5E0] bg-[#F5F5F0] hover:border-[#D1E4FC]",
        disabled && "cursor-not-allowed opacity-50",
        className
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
            <div className="flex items-center justify-center w-10 h-10 rounded-lg border border-[#E5E5E0] bg-[#E5E5E0]">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5 text-[#A0A0A0]"
              >
                <rect x="5" y="6" width="14" height="12" rx="1.5" />
                <circle cx="9.5" cy="10" r="1.5" fill="currentColor" stroke="none" opacity="0.6" />
                <path d="M5 15.5l4-3.5 3.5 3 2-2.5 4.5 4" opacity="0.7" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-[#6B6B6B]">
                Drop images or click to browse
              </p>
              <p className="text-[10px] text-[#A0A0A0] mt-0.5">
                PNG, JPG, WebP — Pinterest, Are.na, local files
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
