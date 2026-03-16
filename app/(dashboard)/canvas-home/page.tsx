"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

// ─── Upload Icon ──────────────────────────────────────────────────────────────

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M10 13V7M10 7L7.5 9.5M10 7L12.5 9.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 14.5C2.89543 14.5 2 13.6046 2 12.5C2 11.5 2.67157 10.6563 3.6 10.437C3.39849 10.0018 3.28571 9.51421 3.28571 9C3.28571 7.17208 4.75779 5.7 6.57143 5.7C6.85934 5.7 7.1395 5.73566 7.40686 5.80292C8.0253 4.42208 9.41337 3.5 11 3.5C13.2091 3.5 15 5.29086 15 7.5C15 7.56386 14.998 7.62728 14.994 7.69011C15.1538 7.66408 15.3182 7.65 15.4857 7.65C16.8733 7.65 18 8.77657 18 10.175C18 11.5734 16.8733 12.7 15.4857 12.7H15.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Empty Folder Illustration ────────────────────────────────────────────────

function CanvasFolderIllustration() {
  return (
    <svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Outer folder body */}
      <rect
        x="8"
        y="36"
        width="104"
        height="72"
        rx="10"
        stroke="#D1E4FC"
        strokeWidth="3"
        fill="#F4F8FF"
      />
      {/* Folder tab */}
      <path
        d="M8 44C8 39.5817 11.5817 36 16 36H44L52 28H96C100.418 28 104 31.5817 104 36V44H8Z"
        stroke="#D1E4FC"
        strokeWidth="3"
        strokeLinejoin="round"
        fill="#EDF4FE"
      />
      {/* Inner glyph — stacked lines suggesting content */}
      <rect x="32" y="62" width="56" height="4" rx="2" fill="#2430AD" opacity="0.25" />
      <rect x="32" y="72" width="40" height="4" rx="2" fill="#2430AD" opacity="0.18" />
      <rect x="32" y="82" width="48" height="4" rx="2" fill="#2430AD" opacity="0.12" />
      {/* Upload arrow glyph — centered */}
      <circle cx="84" cy="88" r="16" fill="#2430AD" />
      <path
        d="M84 96V82M84 82L79 87M84 82L89 87"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Drop Zone ────────────────────────────────────────────────────────────────

function DropZone({ onUpload }: { onUpload: () => void }) {
  const [isDragging, setIsDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    // Simulate upload
    onUpload();
  }

  return (
    <motion.div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      animate={{
        borderColor: isDragging ? "#2430AD" : "#E2E8F0",
        backgroundColor: isDragging ? "#F0F5FF" : "#FFFFFF",
      }}
      transition={{ duration: 0.15 }}
      className="mt-10 w-full max-w-md mx-auto rounded-xl border-2 border-dashed py-10 px-8 text-center cursor-pointer transition-all"
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      aria-label="Upload reference images drop zone"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
    >
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        multiple
        accept="image/*"
        onChange={onUpload}
        aria-label="Upload reference images"
      />
      <p className="text-[13px] text-[#94A3B8]">
        Drag &amp; drop images here, or{" "}
        <span className="text-[#2430AD] font-medium">browse files</span>
      </p>
      <p className="mt-1.5 text-[11px] text-[#CBD5E1]">
        PNG, JPG, WEBP — up to 10 files at once
      </p>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CanvasHomePage() {
  const router = useRouter();

  function handleUpload() {
    // Navigate to canvas with acme-rebrand as demo project
    router.push("/canvas?project=acme-rebrand&step=collect");
  }

  return (
    <div
      className="flex min-h-[calc(100vh-2rem)] flex-col items-center justify-center px-8"
      style={{ backgroundColor: "#FAFBFE" }}
    >
      {/* Illustration */}
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex flex-col items-center"
      >
        <CanvasFolderIllustration />

        {/* Heading */}
        <h1
          className="mt-7 text-[24px] font-semibold tracking-[-0.02em] text-[#0F172A] text-center"
          style={{ fontFamily: "var(--font-geist-sans)" }}
        >
          Start your canvas
        </h1>

        {/* Subtext */}
        <p
          className="mt-3 max-w-[360px] text-center text-[14px] leading-relaxed text-[#64748B]"
          style={{ fontFamily: "var(--font-geist-sans)" }}
        >
          Upload reference images to extract your design DNA
        </p>

        {/* Primary CTA */}
        <motion.button
          type="button"
          onClick={handleUpload}
          whileHover={{
            backgroundColor: "#1C27A0",
            boxShadow: "0 4px 12px rgba(36, 48, 173, 0.22)",
            y: -1,
          }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="mt-8 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-[14px] font-medium text-white"
          style={{
            backgroundColor: "#2430AD",
            boxShadow: "0 1px 3px rgba(36, 48, 173, 0.15)",
            fontFamily: "var(--font-geist-sans)",
          }}
          id="canvas-upload-references-btn"
        >
          <UploadIcon />
          Upload References
        </motion.button>
      </motion.div>

      {/* Drop zone */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <DropZone onUpload={handleUpload} />
      </motion.div>

      {/* Subtle footer hint */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.25, ease: "easeOut" }}
        className="mt-8 text-[12px] text-[#CBD5E1]"
        style={{ fontFamily: "var(--font-geist-sans)" }}
      >
        References are only used to train your personal design system
      </motion.p>
    </div>
  );
}
