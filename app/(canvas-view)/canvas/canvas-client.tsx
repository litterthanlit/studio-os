"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  downloadNextjsZip,
  downloadHtml,
  downloadSection,
  deployToVercel,
  toFramerPasteReady,
  copyToClipboard,
  SECTION_NAMES,
  type ExportConfig,
  type SiteType as ExportSiteType,
} from "@/lib/canvas/export-formats";

// ─── Types ────────────────────────────────────────────────────────────────────

type FrameType = "image" | "palette" | "typography" | "note";
type TabId = "moodboard" | "system" | "generate";

interface CanvasFrame {
  id: string;
  type: FrameType;
  x: number;
  y: number;
  width: number;
  height: number;
  // image
  imageUrl?: string;
  imageTitle?: string;
  imageTags?: string[];
  // palette
  colors?: string[];
  paletteTitle?: string;
  // typography
  fontFamily?: string;
  fontLabel?: string;
  fontSample?: string;
  // note
  noteText?: string;
  noteColor?: string;
}

interface CanvasState {
  pan: { x: number; y: number };
  zoom: number;
  frames: CanvasFrame[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "studio-os:canvas:main";
const MIN_ZOOM = 0.08;
const MAX_ZOOM = 5;
const ZOOM_FACTOR = 0.9985; // per pixel of deltaY

// ─── Default canvas state ──────────────────────────────────────────────────────

const DEFAULT_FRAMES: CanvasFrame[] = [
  {
    id: "f1",
    type: "image",
    x: 60,
    y: 60,
    width: 320,
    height: 240,
    imageTitle: "Mood Reference",
  },
  {
    id: "f2",
    type: "image",
    x: 420,
    y: 60,
    width: 280,
    height: 240,
    imageTitle: "Mood Reference",
  },
  {
    id: "f3",
    type: "image",
    x: 740,
    y: 60,
    width: 320,
    height: 380,
    imageTitle: "Mood Reference",
  },
  {
    id: "f4",
    type: "image",
    x: 60,
    y: 340,
    width: 220,
    height: 280,
    imageTitle: "Mood Reference",
  },
  {
    id: "f5",
    type: "image",
    x: 320,
    y: 340,
    width: 380,
    height: 280,
    imageTitle: "Mood Reference",
  },
  {
    id: "p1",
    type: "palette",
    x: 1100,
    y: 60,
    width: 280,
    height: 200,
    paletteTitle: "Color System",
    colors: ["#2430AD", "#6E79F5", "#C7CAF7", "#111827", "#F9FAFB"],
  },
  {
    id: "t1",
    type: "typography",
    x: 1100,
    y: 300,
    width: 280,
    height: 220,
    fontLabel: "Display / Body",
    fontSample: "The quick brown fox",
  },
  {
    id: "n1",
    type: "note",
    x: 1100,
    y: 560,
    width: 280,
    height: 120,
    noteText: "Canvas loaded. Drag images from your moodboard or import new references.",
    noteColor: "#2430AD",
  },
];

const DEFAULT_STATE: CanvasState = {
  pan: { x: 60, y: 60 },
  zoom: 1,
  frames: DEFAULT_FRAMES,
};

// ─── Image gradient placeholders ──────────────────────────────────────────────

const GRADIENTS = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #30cfd0 0%, #330867 100%)",
  "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
  "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
];

function frameGradient(id: string): string {
  const idx = id.charCodeAt(id.length - 1) % GRADIENTS.length;
  return GRADIENTS[idx];
}

// ─── FrameCard ─────────────────────────────────────────────────────────────────

function FrameCard({
  frame,
  isSelected,
  onMouseDown,
}: {
  frame: CanvasFrame;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
}) {
  const baseStyle: React.CSSProperties = {
    position: "absolute",
    left: frame.x,
    top: frame.y,
    width: frame.width,
    height: frame.height,
    userSelect: "none",
  };

  const ringClass = isSelected
    ? "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg-primary)]"
    : "ring-1 ring-[var(--border-subtle)] hover:ring-[var(--border-hover)]";

  if (frame.type === "image") {
    return (
      <div
        data-frame
        style={baseStyle}
        className={cn(
          "rounded-xl overflow-hidden cursor-grab active:cursor-grabbing",
          "transition-shadow duration-200",
          isSelected ? "shadow-[0_0_0_2px_var(--accent)]" : "shadow-md hover:shadow-xl",
          ringClass
        )}
        onMouseDown={onMouseDown}
      >
        {frame.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={frame.imageUrl}
            alt={frame.imageTitle ?? "Reference"}
            className="w-full h-full object-cover pointer-events-none"
            draggable={false}
          />
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center gap-2"
            style={{ background: frameGradient(frame.id), opacity: 0.85 }}
          >
            <svg
              viewBox="0 0 24 24"
              className="w-8 h-8 text-white/60"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            {frame.imageTitle && (
              <span className="text-[11px] text-white/70 font-medium tracking-wide">
                {frame.imageTitle}
              </span>
            )}
          </div>
        )}
        {/* Selection handle bar */}
        {isSelected && (
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/40 to-transparent flex items-end px-2 pb-1.5">
            <span className="text-[10px] text-white/80 font-medium truncate">
              {frame.imageTitle ?? "Image"}
            </span>
          </div>
        )}
      </div>
    );
  }

  if (frame.type === "palette") {
    const colors = frame.colors ?? [];
    return (
      <div
        data-frame
        style={baseStyle}
        className={cn(
          "rounded-xl overflow-hidden cursor-grab active:cursor-grabbing",
          "bg-[var(--card-bg)] border border-[var(--card-border)]",
          "shadow-md hover:shadow-lg transition-shadow duration-200",
          ringClass
        )}
        onMouseDown={onMouseDown}
      >
        <div className="p-4 h-full flex flex-col gap-3">
          <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-[var(--text-muted)]">
            {frame.paletteTitle ?? "Colors"}
          </span>
          <div className="flex gap-2 flex-wrap flex-1 items-start">
            {colors.map((color) => (
              <div key={color} className="flex flex-col items-center gap-1.5">
                <div
                  className="w-10 h-10 rounded-lg shadow-sm border border-black/10"
                  style={{ backgroundColor: color }}
                />
                <span className="text-[9px] font-mono text-[var(--text-muted)]">
                  {color}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (frame.type === "typography") {
    return (
      <div
        data-frame
        style={baseStyle}
        className={cn(
          "rounded-xl overflow-hidden cursor-grab active:cursor-grabbing",
          "bg-[var(--card-bg)] border border-[var(--card-border)]",
          "shadow-md hover:shadow-lg transition-shadow duration-200",
          ringClass
        )}
        onMouseDown={onMouseDown}
      >
        <div className="p-4 h-full flex flex-col gap-3">
          <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-[var(--text-muted)]">
            {frame.fontLabel ?? "Typography"}
          </span>
          <div className="flex-1 flex flex-col justify-center gap-2">
            <p
              className="text-[32px] leading-tight text-[var(--text-primary)] font-medium"
              style={{ fontFamily: frame.fontFamily ?? "inherit" }}
            >
              {frame.fontSample ?? "The quick brown fox"}
            </p>
            <p
              className="text-[13px] text-[var(--text-tertiary)]"
              style={{ fontFamily: frame.fontFamily ?? "inherit" }}
            >
              ABCDEFGHIJKLMNOPQRSTUVWXYZ
              <br />
              abcdefghijklmnopqrstuvwxyz
              <br />
              0123456789
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (frame.type === "note") {
    return (
      <div
        data-frame
        style={baseStyle}
        className={cn(
          "rounded-xl overflow-hidden cursor-grab active:cursor-grabbing",
          "shadow-md hover:shadow-lg transition-shadow duration-200",
          ringClass
        )}
        onMouseDown={onMouseDown}
      >
        <div
          className="w-full h-full p-4 flex flex-col gap-2"
          style={{ backgroundColor: (frame.noteColor ?? "#2430AD") + "15" }}
        >
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: frame.noteColor ?? "#2430AD" }}
          />
          <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed flex-1">
            {frame.noteText ?? ""}
          </p>
        </div>
      </div>
    );
  }

  return null;
}

// ─── Minimap ──────────────────────────────────────────────────────────────────

const MINIMAP_W = 180;
const MINIMAP_H = 120;

function Minimap({
  pan,
  zoom,
  frames,
  viewportW,
  viewportH,
}: {
  pan: { x: number; y: number };
  zoom: number;
  frames: CanvasFrame[];
  viewportW: number;
  viewportH: number;
}) {
  // Compute world bounding box from all frames + current viewport
  const allX = frames.flatMap((f) => [f.x, f.x + f.width]);
  const allY = frames.flatMap((f) => [f.y, f.y + f.height]);

  const worldLeft = Math.min(-pan.x / zoom, ...allX) - 80;
  const worldTop = Math.min(-pan.y / zoom, ...allY) - 80;
  const worldRight = Math.max((-pan.x + viewportW) / zoom, ...allX) + 80;
  const worldBottom = Math.max((-pan.y + viewportH) / zoom, ...allY) + 80;

  const worldW = worldRight - worldLeft;
  const worldH = worldBottom - worldTop;

  const scaleX = MINIMAP_W / worldW;
  const scaleY = MINIMAP_H / worldH;
  const scale = Math.min(scaleX, scaleY);

  // Viewport rect in minimap coords
  const vpLeft = (-pan.x / zoom - worldLeft) * scale;
  const vpTop = (-pan.y / zoom - worldTop) * scale;
  const vpWidth = (viewportW / zoom) * scale;
  const vpHeight = (viewportH / zoom) * scale;

  return (
    <div
      className="absolute bottom-16 right-4 rounded-lg overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/90 backdrop-blur-sm shadow-lg"
      style={{ width: MINIMAP_W, height: MINIMAP_H }}
      aria-label="Canvas minimap"
    >
      {/* Frames */}
      {frames.map((f) => {
        const fx = (f.x - worldLeft) * scale;
        const fy = (f.y - worldTop) * scale;
        const fw = f.width * scale;
        const fh = f.height * scale;
        const color =
          f.type === "image"
            ? "#6E79F5"
            : f.type === "palette"
            ? "#10B981"
            : f.type === "typography"
            ? "#F59E0B"
            : "#8B5CF6";
        return (
          <div
            key={f.id}
            className="absolute rounded-[1px] opacity-60"
            style={{
              left: fx,
              top: fy,
              width: Math.max(fw, 2),
              height: Math.max(fh, 2),
              backgroundColor: color,
            }}
          />
        );
      })}

      {/* Viewport rect */}
      <div
        className="absolute border border-[var(--accent)] bg-[var(--accent)]/10 pointer-events-none"
        style={{
          left: Math.max(0, vpLeft),
          top: Math.max(0, vpTop),
          width: Math.min(vpWidth, MINIMAP_W - Math.max(0, vpLeft)),
          height: Math.min(vpHeight, MINIMAP_H - Math.max(0, vpTop)),
        }}
      />
    </div>
  );
}

// ─── Export dropdown ──────────────────────────────────────────────────────────

type ExportAction =
  | "deploy-vercel"
  | "download-nextjs"
  | "download-html"
  | "export-section"
  | "copy-framer";

const EXPORT_ACTIONS: { id: ExportAction; label: string; icon: string; description: string }[] = [
  { id: "deploy-vercel",   label: "Deploy to Vercel",   icon: "▲", description: "Download ZIP + open Vercel import" },
  { id: "download-nextjs", label: "Download Next.js",   icon: "⬇", description: "Zero-config Next.js 14 project" },
  { id: "download-html",   label: "Download HTML",      icon: "◻", description: "Single file, no build step" },
  { id: "export-section",  label: "Export Section…",    icon: "◈", description: "Individual TSX component" },
  { id: "copy-framer",     label: "Copy to Framer",     icon: "⬡", description: "Clipboard-ready JSX layer" },
];

function ExportDropdown({ siteName, siteType }: { siteName: string; siteType: ExportSiteType }) {
  const [open, setOpen] = React.useState(false);
  const [showSectionPicker, setShowSectionPicker] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    if (!open && !showSectionPicker) return;
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowSectionPicker(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, showSectionPicker]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  const cfg: ExportConfig = {
    siteType: siteType === "auto" ? "saas-landing" : (siteType as ExportSiteType),
    siteName: siteName || "My Site",
  };

  async function handleAction(id: ExportAction) {
    setOpen(false);
    setShowSectionPicker(false);
    switch (id) {
      case "deploy-vercel":
        deployToVercel(cfg);
        showToast("ZIP downloaded — drag it into Vercel to deploy");
        break;
      case "download-nextjs":
        downloadNextjsZip(cfg);
        showToast("Next.js project ZIP downloaded");
        break;
      case "download-html":
        downloadHtml(cfg);
        showToast("HTML file downloaded");
        break;
      case "export-section":
        setShowSectionPicker(true);
        return;
      case "copy-framer":
        // Copy a minimal Framer-ready wrapper to clipboard
        const frameCopy = toFramerPasteReady(
          `import { motion } from "framer-motion"\n\nexport default function Component() {\n  return (\n    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>\n      {/* Paste your section here */}\n    </motion.div>\n  )\n}`
        );
        const ok = await copyToClipboard(frameCopy);
        showToast(ok ? "Copied to clipboard — paste into Framer" : "Copy failed — try again");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        break;
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); setShowSectionPicker(false); }}
        className={cn(
          "ml-1 flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors duration-150 border",
          open
            ? "bg-[var(--accent)] text-white border-transparent"
            : "text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)] bg-transparent"
        )}
      >
        <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M6 1v7M3.5 5.5L6 8l2.5-2.5M1.5 10.5h9" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Export
        <svg viewBox="0 0 8 8" className="w-2 h-2 opacity-60" fill="currentColor">
          <path d="M4 5.5L1 2.5h6L4 5.5z"/>
        </svg>
      </button>

      {/* Dropdown menu */}
      {open && !showSectionPicker && (
        <div className="absolute right-0 top-full mt-1.5 w-56 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl shadow-xl z-50 overflow-hidden py-1">
          {EXPORT_ACTIONS.map((action, i) => (
            <React.Fragment key={action.id}>
              {i === 3 && (
                <div className="my-1 border-t border-[var(--border-subtle)]" />
              )}
              <button
                type="button"
                onClick={() => handleAction(action.id)}
                className="w-full flex items-start gap-3 px-3.5 py-2.5 text-left hover:bg-[var(--sidebar-hover)] transition-colors group"
              >
                <span className="text-[13px] opacity-60 mt-px w-4 shrink-0 text-center">
                  {action.id === "copy-framer" && copied ? "✓" : action.icon}
                </span>
                <div>
                  <p className="text-[12px] font-medium text-[var(--text-primary)]">
                    {action.label}
                    {action.id === "deploy-vercel" && (
                      <span className="ml-1.5 text-[10px] font-normal px-1 py-0.5 rounded bg-[var(--accent)]/15 text-[var(--accent)]">
                        ✦ new
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{action.description}</p>
                </div>
              </button>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Section picker sub-menu */}
      {showSectionPicker && (
        <div className="absolute right-0 top-full mt-1.5 w-52 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl shadow-xl z-50 overflow-hidden py-1">
          <div className="px-3.5 py-2 border-b border-[var(--border-subtle)] flex items-center justify-between">
            <span className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">Export section</span>
            <button
              type="button"
              onClick={() => { setShowSectionPicker(false); setOpen(true); }}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-xs"
            >
              ←
            </button>
          </div>
          {SECTION_NAMES.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                downloadSection(name, cfg);
                setShowSectionPicker(false);
                showToast(`${name} downloaded`);
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2 text-left hover:bg-[var(--sidebar-hover)] transition-colors"
            >
              <span className="text-[11px] text-[var(--text-muted)] w-4 text-center">◈</span>
              <span className="text-[12px] text-[var(--text-primary)]">{name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div className="absolute right-0 top-full mt-1.5 z-50 pointer-events-none">
          <div className="flex items-center gap-2 px-3.5 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl shadow-xl text-[11px] text-[var(--text-primary)] whitespace-nowrap animate-in fade-in slide-in-from-top-2 duration-200">
            <span className="text-[var(--accent)]">✓</span>
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Toolbar ──────────────────────────────────────────────────────────────────

function CanvasToolbar({
  tab,
  onTabChange,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetView,
  onResetLayout,
  frameCount,
  siteName,
  siteType,
}: {
  tab: TabId;
  onTabChange: (t: TabId) => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onResetLayout: () => void;
  frameCount: number;
  siteName: string;
  siteType: ExportSiteType;
}) {
  const tabs: { id: TabId; label: string }[] = [
    { id: "moodboard", label: "Moodboard" },
    { id: "system", label: "System" },
    { id: "generate", label: "Generate" },
  ];

  return (
    <div className="flex items-center gap-0 h-12 px-4 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]/60 backdrop-blur-sm shrink-0">
      {/* Left: Tabs */}
      <div className="flex items-center gap-1 mr-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onTabChange(t.id)}
            className={cn(
              "px-3.5 py-1.5 rounded-md text-[13px] font-medium transition-all duration-150",
              tab === t.id
                ? "bg-[var(--accent)] text-white shadow-sm"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)]"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Center: Frame count badge */}
      <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] mr-4">
        <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]/60" />
        <span>{frameCount} frames</span>
      </div>

      {/* Right: Zoom + actions */}
      <div className="flex items-center gap-1 ml-auto">
        <button
          type="button"
          onClick={onResetView}
          className="px-2.5 py-1 rounded-md text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)] transition-colors duration-150"
          title="Fit to screen"
        >
          Fit
        </button>

        <div className="flex items-center gap-0.5 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-md px-1.5 py-0.5">
          <button
            type="button"
            onClick={onZoomOut}
            className="w-5 h-5 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-base"
            aria-label="Zoom out"
          >
            −
          </button>
          <span className="w-11 text-center font-mono text-[11px] text-[var(--text-secondary)]">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={onZoomIn}
            className="w-5 h-5 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-base"
            aria-label="Zoom in"
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={onResetLayout}
          className="ml-1 px-2.5 py-1 rounded-md text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)] transition-colors duration-150"
          title="Reset layout to default"
        >
          Reset
        </button>

        {/* Divider */}
        <div className="w-px h-4 bg-[var(--border-subtle)] mx-1" />

        {/* Export dropdown */}
        <ExportDropdown siteName={siteName} siteType={siteType} />
      </div>
    </div>
  );
}

// ─── Site type options ────────────────────────────────────────────────────────

type SiteType =
  | "auto"
  | "saas-landing"
  | "portfolio"
  | "agency"
  | "ecommerce"
  | "docs-site"
  | "blog";

const SITE_TYPE_OPTIONS: { value: SiteType; label: string; desc: string; icon: string }[] = [
  { value: "auto",         label: "Auto",          desc: "AI chooses based on prompt",        icon: "✦" },
  { value: "saas-landing", label: "SaaS Landing",  desc: "Dark Linear-style product page",    icon: "◈" },
  { value: "portfolio",    label: "Portfolio",     desc: "Minimal warm editorial personal",   icon: "◉" },
  { value: "agency",       label: "Agency",        desc: "Bold high-contrast creative site",  icon: "⬡" },
  { value: "ecommerce",    label: "E-commerce",    desc: "Clean premium product store",       icon: "⊕" },
  { value: "docs-site",    label: "Documentation", desc: "Developer-focused Vercel docs",     icon: "⊞" },
  { value: "blog",         label: "Blog",          desc: "Editorial serif publication",       icon: "◧" },
];

const STYLE_PRESETS: { label: string; tokens: string }[] = [
  { label: "Minimal",      tokens: "clean, lots of whitespace, subtle borders, muted palette" },
  { label: "Editorial",    tokens: "serif display, asymmetric, large imagery, magazine-style" },
  { label: "Bold",         tokens: "oversized type, high contrast, electric accent, full-bleed" },
  { label: "Glassmorphic", tokens: "frosted glass, gradient blurs, translucent layers, neon accent" },
];

// ─── Generate panel (sidebar overlay) ────────────────────────────────────────

function GeneratePanel({
  onClose,
  onSiteTypeChange,
}: {
  onClose: () => void;
  onSiteTypeChange?: (t: ExportSiteType) => void;
}) {
  const [prompt, setPrompt] = React.useState("");
  const [siteType, setSiteType] = React.useState<SiteType>("auto");
  const [stylePreset, setStylePreset] = React.useState<string | null>(null);
  const [generating, setGenerating] = React.useState(false);
  const [generated, setGenerated] = React.useState(false);

  async function handleGenerate() {
    if (!prompt.trim() || generating) return;
    setGenerating(true);
    setGenerated(false);
    // Placeholder — hook into AI generation pipeline later
    await new Promise((r) => setTimeout(r, 2200));
    setGenerating(false);
    setGenerated(true);
  }

  const selectedSiteType = SITE_TYPE_OPTIONS.find((o) => o.value === siteType);

  return (
    <div className="absolute top-0 right-0 bottom-0 w-[340px] bg-[var(--bg-secondary)]/95 backdrop-blur-md border-l border-[var(--border-primary)] flex flex-col shadow-2xl z-20">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)]">
        <div>
          <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">Generate</h2>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">AI design generation</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--sidebar-hover)] transition-colors"
        >
          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor">
            <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* ── Site type ── */}
        <div className="space-y-2">
          <label className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">
            Site type
          </label>
          {/* Selected preview */}
          <button
            type="button"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-left transition-colors duration-150 hover:border-[var(--border-hover)] group"
            onClick={() => {/* toggle open */}}
          >
            <span className="w-7 h-7 flex items-center justify-center rounded-md bg-[var(--accent)]/12 text-[var(--accent)] text-[14px] shrink-0">
              {selectedSiteType?.icon}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-[var(--text-primary)] leading-none mb-0.5">
                {selectedSiteType?.label}
              </p>
              <p className="text-[11px] text-[var(--text-muted)] truncate leading-none">
                {selectedSiteType?.desc}
              </p>
            </div>
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" fill="currentColor">
              <path d="M4.427 9.573a.75.75 0 001.06 0L8 7.06l2.513 2.513a.75.75 0 101.06-1.06l-3.043-3.044a.75.75 0 00-1.06 0L4.427 8.513a.75.75 0 000 1.06z" />
            </svg>
          </button>

          {/* Site type grid */}
          <div className="grid grid-cols-1 gap-1 pt-1">
            {SITE_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { setSiteType(opt.value); onSiteTypeChange?.(opt.value); }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-left transition-all duration-100 w-full",
                  siteType === opt.value
                    ? "bg-[var(--accent)]/10 border border-[var(--accent)]/30"
                    : "border border-transparent hover:bg-[var(--sidebar-hover)]"
                )}
              >
                <span
                  className={cn(
                    "w-6 h-6 flex items-center justify-center rounded text-[12px] shrink-0",
                    siteType === opt.value
                      ? "text-[var(--accent)]"
                      : "text-[var(--text-muted)]"
                  )}
                >
                  {opt.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <span
                    className={cn(
                      "text-[12px] font-medium leading-none block mb-0.5",
                      siteType === opt.value ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
                    )}
                  >
                    {opt.label}
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)] truncate block leading-none">
                    {opt.desc}
                  </span>
                </div>
                {siteType === opt.value && (
                  <svg viewBox="0 0 16 16" className="w-3 h-3 text-[var(--accent)] shrink-0" fill="currentColor">
                    <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="h-px bg-[var(--border-subtle)]" />

        {/* ── Prompt ── */}
        <div className="space-y-2">
          <label className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">
            Describe your design
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              siteType === "saas-landing"
                ? "A project management SaaS. Dark mode, purple accent, for engineering teams..."
                : siteType === "portfolio"
                ? "Product designer with 5 years experience. Minimal, warm, serif type..."
                : siteType === "ecommerce"
                ? "Premium organic skincare brand. Clean, cream + forest green palette..."
                : siteType === "docs-site"
                ? "Developer platform API docs. Vercel-style, code-heavy, dark code blocks..."
                : siteType === "blog"
                ? "Tech + design publication. Editorial serif, cream tones, readers-first..."
                : "Describe your site — brand, audience, aesthetic, key sections..."
            }
            rows={4}
            className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2.5 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)] resize-none transition-colors duration-200"
          />
        </div>

        {/* ── Style preset ── */}
        <div className="space-y-2">
          <label className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">
            Style preset
            <span className="normal-case tracking-normal font-normal ml-1 text-[var(--text-muted)]">
              (optional)
            </span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {STYLE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() =>
                  setStylePreset((prev) => (prev === preset.label ? null : preset.label))
                }
                className={cn(
                  "h-14 rounded-lg border text-[12px] font-medium transition-all duration-150 flex flex-col items-center justify-center gap-0.5",
                  stylePreset === preset.label
                    ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--text-primary)]"
                    : "border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-tertiary)] hover:border-[var(--accent)]/40 hover:text-[var(--text-secondary)]"
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Generated result placeholder ── */}
        {generated && (
          <div className="rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/8 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[var(--accent)] flex items-center justify-center">
                <svg viewBox="0 0 12 12" className="w-2.5 h-2.5" fill="white">
                  <path d="M10 3L5 8.5 2 5.5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="text-[12px] font-semibold text-[var(--text-primary)]">
                Design generated
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              Your{" "}
              <span className="text-[var(--text-secondary)] font-medium">
                {selectedSiteType?.label}
              </span>{" "}
              template has been prepared. Click &quot;Add to canvas&quot; to place it as a new frame.
            </p>
            <button
              type="button"
              className="w-full py-2 rounded-md text-[12px] font-semibold bg-[var(--accent)] text-white hover:opacity-90 transition-opacity"
            >
              Add to canvas →
            </button>
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="p-4 border-t border-[var(--border-subtle)] space-y-2">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!prompt.trim() || generating}
          className={cn(
            "w-full py-2.5 rounded-lg text-sm font-semibold transition-all duration-200",
            prompt.trim() && !generating
              ? "bg-[var(--accent)] text-white hover:opacity-90 shadow-sm"
              : "bg-[var(--accent)]/15 text-[var(--text-muted)] cursor-not-allowed"
          )}
        >
          {generating ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating{siteType !== "auto" ? ` ${selectedSiteType?.label}` : ""}…
            </span>
          ) : (
            `Generate${siteType !== "auto" ? ` ${selectedSiteType?.label}` : " design"}`
          )}
        </button>
        <p className="text-[10px] text-[var(--text-muted)] text-center">
          Templates in{" "}
          <code className="font-mono">lib/canvas/templates/</code>
        </p>
      </div>
    </div>
  );
}

// ─── Main CanvasClient ────────────────────────────────────────────────────────

export function CanvasClient() {
  // ── State ──
  const [pan, setPan] = React.useState<{ x: number; y: number }>({ x: 60, y: 60 });
  const [zoom, setZoom] = React.useState(1);
  const [frames, setFrames] = React.useState<CanvasFrame[]>(DEFAULT_FRAMES);
  const [isPanning, setIsPanning] = React.useState(false);
  const [tab, setTab] = React.useState<TabId>("moodboard");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [showGeneratePanel, setShowGeneratePanel] = React.useState(false);
  const [viewportSize, setViewportSize] = React.useState({ w: 800, h: 600 });
  const [canvasSiteName, setCanvasSiteName] = React.useState("My Site");
  const [canvasSiteType, setCanvasSiteType] = React.useState<ExportSiteType>("auto");

  // ── Refs (for event handlers to avoid stale closure issues) ──
  const stateRef = React.useRef({ pan, zoom });

  const isPanningRef = React.useRef(false);
  const panStartMouseRef = React.useRef({ x: 0, y: 0 });
  const panStartPanRef = React.useRef({ x: 0, y: 0 });

  const draggingFrameIdRef = React.useRef<string | null>(null);
  const frameDragStartRef = React.useRef({ mx: 0, my: 0, fx: 0, fy: 0 });
  // Need frames ref to avoid stale closures in mousemove
  const framesRef = React.useRef(frames);

  const canvasRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    stateRef.current = { pan, zoom };
  }, [pan, zoom]);

  React.useEffect(() => {
    framesRef.current = frames;
  }, [frames]);

  // ── Load from localStorage on mount ──
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved: CanvasState = JSON.parse(raw);
        if (saved.pan) setPan(saved.pan);
        if (saved.zoom) setZoom(saved.zoom);
        if (saved.frames && saved.frames.length > 0) setFrames(saved.frames);
      }
    } catch {
      // ignore — first load or corrupt data
    }
  }, []);

  // ── Also try to populate image frames from stored moodboard references ──
  React.useEffect(() => {
    try {
      // Try to find references from any stored project
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key?.startsWith("studio-os:references:")) continue;
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const refs: Array<{ imageUrl?: string; url?: string; title?: string; tags?: string[] }> =
          JSON.parse(raw);
        if (!refs.length) continue;

        // Only populate if canvas is still using default frames (no saved canvas state)
        const savedCanvas = localStorage.getItem(STORAGE_KEY);
        if (savedCanvas) break;

        const imageFrames: CanvasFrame[] = refs.slice(0, 8).map((ref, idx) => {
          const cols = 3;
          const col = idx % cols;
          const row = Math.floor(idx / cols);
          const w = col === 2 ? 320 : 280;
          const h = row === 0 ? 240 : 280;
          return {
            id: `ref-${idx}`,
            type: "image" as FrameType,
            x: 60 + col * 340,
            y: 60 + row * 320,
            width: w,
            height: h,
            imageUrl: ref.imageUrl ?? ref.url,
            imageTitle: ref.title ?? "Reference",
            imageTags: ref.tags ?? [],
          };
        });

        setFrames((prev) => {
          const nonImage = prev.filter((f) => f.type !== "image");
          return [...imageFrames, ...nonImage];
        });
        break;
      }
    } catch {
      // ignore
    }
  }, []);

  // ── Save to localStorage (debounced) ──
  const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  React.useEffect(() => {
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      try {
        const state: CanvasState = { pan, zoom, frames };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        // storage full — ignore
      }
    }, 600);
    return () => clearTimeout(saveTimerRef.current);
  }, [pan, zoom, frames]);

  // ── Attach non-passive wheel handler ──
  React.useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const { pan: curPan, zoom: curZoom } = stateRef.current;
      const rect = el!.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      // Normalize delta across deltaMode
      const rawDelta =
        e.deltaMode === 1
          ? e.deltaY * 24
          : e.deltaMode === 2
          ? e.deltaY * 400
          : e.deltaY;

      const factor = Math.pow(ZOOM_FACTOR, rawDelta);
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, curZoom * factor));

      // Zoom toward mouse cursor
      const worldX = (mx - curPan.x) / curZoom;
      const worldY = (my - curPan.y) / curZoom;
      const newPan = {
        x: mx - worldX * newZoom,
        y: my - worldY * newZoom,
      };

      setPan(newPan);
      setZoom(newZoom);
    }

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []); // mount once — uses stateRef for fresh values

  // ── Measure viewport ──
  React.useEffect(() => {
    function measure() {
      if (canvasRef.current) {
        const r = canvasRef.current.getBoundingClientRect();
        setViewportSize({ w: r.width, h: r.height });
      }
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // ── Mouse handlers ──
  function onCanvasMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-frame]")) return;
    isPanningRef.current = true;
    setIsPanning(true);
    panStartMouseRef.current = { x: e.clientX, y: e.clientY };
    panStartPanRef.current = { ...stateRef.current.pan };
    setSelected(new Set());
  }

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (isPanningRef.current) {
      const dx = e.clientX - panStartMouseRef.current.x;
      const dy = e.clientY - panStartMouseRef.current.y;
      setPan({
        x: panStartPanRef.current.x + dx,
        y: panStartPanRef.current.y + dy,
      });
    }

    if (draggingFrameIdRef.current !== null) {
      const { mx, my, fx, fy } = frameDragStartRef.current;
      const { zoom: curZoom } = stateRef.current;
      const dx = (e.clientX - mx) / curZoom;
      const dy = (e.clientY - my) / curZoom;
      setFrames((prev) =>
        prev.map((f) =>
          f.id === draggingFrameIdRef.current
            ? { ...f, x: Math.round(fx + dx), y: Math.round(fy + dy) }
            : f
        )
      );
    }
  }

  function onMouseUp() {
    isPanningRef.current = false;
    setIsPanning(false);
    draggingFrameIdRef.current = null;
  }

  function onFrameMouseDown(e: React.MouseEvent, frameId: string) {
    e.stopPropagation();
    const frame = framesRef.current.find((f) => f.id === frameId);
    if (!frame) return;
    draggingFrameIdRef.current = frameId;
    frameDragStartRef.current = {
      mx: e.clientX,
      my: e.clientY,
      fx: frame.x,
      fy: frame.y,
    };
    setSelected(new Set([frameId]));
  }

  // ── Zoom controls ──
  function zoomTowardCenter(newZoom: number) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) {
      setZoom(newZoom);
      return;
    }
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const { pan: curPan, zoom: curZoom } = stateRef.current;
    const worldX = (cx - curPan.x) / curZoom;
    const worldY = (cy - curPan.y) / curZoom;
    setPan({ x: cx - worldX * newZoom, y: cy - worldY * newZoom });
    setZoom(newZoom);
  }

  function handleZoomIn() {
    const { zoom: curZoom } = stateRef.current;
    zoomTowardCenter(Math.min(MAX_ZOOM, curZoom * 1.25));
  }

  function handleZoomOut() {
    const { zoom: curZoom } = stateRef.current;
    zoomTowardCenter(Math.max(MIN_ZOOM, curZoom / 1.25));
  }

  function handleResetView() {
    // Fit all frames into view
    if (frames.length === 0) {
      setPan({ x: 60, y: 60 });
      setZoom(1);
      return;
    }
    const minX = Math.min(...frames.map((f) => f.x)) - 60;
    const minY = Math.min(...frames.map((f) => f.y)) - 60;
    const maxX = Math.max(...frames.map((f) => f.x + f.width)) + 60;
    const maxY = Math.max(...frames.map((f) => f.y + f.height)) + 60;
    const worldW = maxX - minX;
    const worldH = maxY - minY;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const fitZoom = Math.min(
      MAX_ZOOM,
      Math.max(MIN_ZOOM, Math.min(rect.width / worldW, rect.height / worldH) * 0.9)
    );
    setPan({
      x: (rect.width - worldW * fitZoom) / 2 - minX * fitZoom,
      y: (rect.height - worldH * fitZoom) / 2 - minY * fitZoom,
    });
    setZoom(fitZoom);
  }

  function handleResetLayout() {
    setPan({ x: 60, y: 60 });
    setZoom(1);
    setFrames(DEFAULT_FRAMES);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  // ── Tab change side effects ──
  function handleTabChange(newTab: TabId) {
    setTab(newTab);
    if (newTab === "generate") {
      setShowGeneratePanel(true);
    } else {
      setShowGeneratePanel(false);
    }
  }

  // ── Which frames to show per tab ──
  const visibleFrames =
    tab === "moodboard"
      ? frames.filter((f) => f.type === "image" || f.type === "note")
      : tab === "system"
      ? frames.filter((f) => f.type === "palette" || f.type === "typography" || f.type === "note")
      : frames; // generate shows all

  const cursorClass = isPanning ? "cursor-grabbing" : "cursor-grab";

  // Background dot grid moves with pan/zoom
  const dotSpacing = Math.max(4, 28 * zoom);
  const dotOffsetX = ((pan.x % dotSpacing) + dotSpacing) % dotSpacing;
  const dotOffsetY = ((pan.y % dotSpacing) + dotSpacing) % dotSpacing;

  return (
    <div className="flex flex-col h-full select-none">
      {/* ── Toolbar ── */}
      <CanvasToolbar
        tab={tab}
        onTabChange={handleTabChange}
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetView={handleResetView}
        onResetLayout={handleResetLayout}
        frameCount={visibleFrames.length}
        siteName={canvasSiteName}
        siteType={canvasSiteType}
      />

      {/* ── Canvas area ── */}
      <div className="flex-1 relative overflow-hidden">
        <div
          ref={canvasRef}
          className={cn("w-full h-full", cursorClass)}
          style={{
            backgroundImage: "radial-gradient(circle, var(--dot-grid-color) 1px, transparent 1px)",
            backgroundSize: `${dotSpacing}px ${dotSpacing}px`,
            backgroundPosition: `${dotOffsetX}px ${dotOffsetY}px`,
          }}
          onMouseDown={onCanvasMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          {/* ── Canvas world (transformed) ── */}
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "0 0",
              position: "absolute",
              top: 0,
              left: 0,
              willChange: "transform",
            }}
          >
            {visibleFrames.map((frame) => (
              <FrameCard
                key={frame.id}
                frame={frame}
                isSelected={selected.has(frame.id)}
                onMouseDown={(e) => onFrameMouseDown(e, frame.id)}
              />
            ))}
          </div>

          {/* ── Minimap ── */}
          <Minimap
            pan={pan}
            zoom={zoom}
            frames={visibleFrames}
            viewportW={viewportSize.w}
            viewportH={viewportSize.h}
          />

          {/* ── Tab hint overlay (empty state) ── */}
          {visibleFrames.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center space-y-2">
                <p className="text-[14px] text-[var(--text-muted)] font-medium">No {tab} frames</p>
                <p className="text-[12px] text-[var(--text-placeholder)]">
                  Switch tabs or reset layout to see frames
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Generate panel (slides in from right) ── */}
        {showGeneratePanel && (
          <GeneratePanel
            onClose={() => setShowGeneratePanel(false)}
            onSiteTypeChange={(t) => setCanvasSiteType(t)}
          />
        )}
      </div>
    </div>
  );
}
