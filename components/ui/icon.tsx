import * as React from "react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type IconName =
  // ── Navigation (7) ──
  | "home"
  | "brief"
  | "vision"
  | "type"
  | "projects"
  | "flow"
  | "canvas"
  // ── Artboard Utility (8) ──
  | "search"
  | "flag"
  | "reject"
  | "undo"
  | "palette"
  | "import"
  | "settings"
  | "ai-spark"
  // ── Extended Artboard (contextual) ──
  | "flame"
  | "image"
  | "clock"
  | "check"
  | "message"
  | "file-text"
  | "calendar"
  | "folder"
  | "zap"
  | "moon"
  | "sun"
  // ── Structural (frameless, always bare) ──
  | "chevron-down"
  | "chevron-right"
  | "chevron-left"
  | "plus"
  | "close"
  | "external";

export interface IconProps {
  name: IconName;
  className?: string;
  /** Strip the outer rect frame — used for small inline sizes */
  bare?: boolean;
}

// ─── Frame ────────────────────────────────────────────────────────────────────

// The standard outer rounded rect. Drawn at opacity 0.3 for the "artboard" language.
const FRAME = (
  <rect x="2" y="2" width="20" height="20" rx="2" opacity="0.3" />
);

// Icons that carry their own frame / layout (not the standard rect)
const SELF_FRAMED = new Set<IconName>(["vision", "projects"]);
// Icons that are pure structural chrome — frame never applies
const STRUCTURAL = new Set<IconName>([
  "chevron-down",
  "chevron-right",
  "chevron-left",
  "plus",
  "close",
  "external",
]);

// ─── Icon Content Registry ────────────────────────────────────────────────────

function renderContent(name: IconName): React.ReactNode {
  switch (name) {
    // ── Navigation ─────────────────────────────────────────────────────────

    case "home":
      return (
        <>
          <path d="M4 10l8-7 8 7v10a1 1 0 01-1 1H5a1 1 0 01-1-1z" />
          <path d="M9 21V12h6v9" opacity="0.5" />
        </>
      );

    case "brief":
      return (
        <>
          <circle cx="12" cy="13" r="3" />
          <path d="M7 10l1.5 1.5" />
          <path d="M17 10l-1.5 1.5" />
          <path d="M12 7v2" />
          <line x1="6" y1="17" x2="18" y2="17" />
        </>
      );

    case "vision":
      // Self-framed: two overlapping artboard rects
      return (
        <>
          <rect x="2" y="5" width="13" height="13" rx="2" opacity="0.3" />
          <rect x="9" y="2" width="13" height="13" rx="2" />
          <circle cx="15.5" cy="8" r="1.5" />
          <path d="M9 15l3.5-4 3.5 4" />
        </>
      );

    case "type":
      return (
        <>
          <path d="M7 17L11 7h2l4 10" />
          <line x1="8.5" y1="13" x2="15.5" y2="13" />
        </>
      );

    case "projects":
      // Self-framed: artboard chrome with window bar
      return (
        <>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 7h18" opacity="0.4" />
          <circle cx="5.5" cy="5" r="0.75" fill="currentColor" stroke="none" opacity="0.4" />
          <circle cx="8" cy="5" r="0.75" fill="currentColor" stroke="none" opacity="0.4" />
          <rect x="6" y="10" width="5" height="4" rx="1" opacity="0.5" />
          <rect x="13" y="10" width="5" height="7" rx="1" opacity="0.5" />
          <rect x="6" y="16" width="5" height="1" rx="0.5" opacity="0.5" />
        </>
      );

    case "flow":
      return (
        <>
          <path d="M5 12c1.5-3 3-3 4.5 0s3 3 4.5 0 3-3 4.5 0" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" opacity="0.6" />
        </>
      );

    case "canvas":
      return (
        <>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none" opacity="0.6" />
          <path d="M3 15l5-5 4 4 3-3 6 6" opacity="0.6" />
        </>
      );

    // ── Utility ────────────────────────────────────────────────────────────

    case "search":
      return (
        <>
          <circle cx="11" cy="11" r="4" />
          <path d="M14 14l4 4" />
        </>
      );

    case "flag":
      return (
        <>
          <path d="M8 5v14" />
          <path d="M8 5h8l-2 3.5 2 3.5H8" />
        </>
      );

    case "reject":
      return (
        <>
          <path d="M9 9l6 6" />
          <path d="M15 9l-6 6" />
        </>
      );

    case "undo":
      return (
        <>
          <path d="M8 11l-2 2 2 2" />
          <path d="M6 13h8a3 3 0 010 6h-1" />
        </>
      );

    case "palette":
      return (
        <>
          <circle cx="9" cy="8" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="15" cy="9" r="1.5" fill="currentColor" stroke="none" opacity="0.7" />
          <circle cx="8" cy="14" r="1.5" fill="currentColor" stroke="none" opacity="0.5" />
          <circle cx="14" cy="15" r="1.5" fill="currentColor" stroke="none" opacity="0.3" />
        </>
      );

    case "import":
      return (
        <>
          <path d="M12 7v7" />
          <path d="M9 11l3 3 3-3" />
          <line x1="7" y1="17" x2="17" y2="17" />
        </>
      );

    case "settings":
      return (
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 5v2" />
          <path d="M12 17v2" />
          <path d="M5 12h2" />
          <path d="M17 12h2" />
        </>
      );

    case "ai-spark":
      return (
        <>
          <path d="M12 4l1 4 4 1-4 1-1 4-1-4-4-1 4-1z" />
          <path d="M17 14l.5 2 2 .5-2 .5-.5 2-.5-2-2-.5 2-.5z" opacity="0.5" />
        </>
      );

    // ── Extended ───────────────────────────────────────────────────────────

    case "flame":
      return (
        <>
          <path d="M12 3c0 3.5-4 5.5-4 9 0 2.5 1.6 4 4 5 2.4-1 4-2.5 4-5 0-3.5-4-5.5-4-9z" />
          <circle cx="12" cy="14.5" r="1.5" fill="currentColor" stroke="none" opacity="0.5" />
        </>
      );

    case "image":
      return (
        <>
          <rect x="5" y="6" width="14" height="12" rx="1.5" />
          <circle cx="9.5" cy="10" r="1.5" fill="currentColor" stroke="none" opacity="0.6" />
          <path d="M5 15.5l4-3.5 3.5 3 2-2.5 4.5 4" opacity="0.7" />
        </>
      );

    case "clock":
      return (
        <>
          <circle cx="12" cy="12" r="7" />
          <path d="M12 8v4l2.5 2.5" />
        </>
      );

    case "check":
      return <path d="M7 12l3.5 3.5L17 8" />;

    case "message":
      return (
        <>
          <rect x="4" y="5" width="16" height="11" rx="1.5" />
          <path d="M4 16l3.5 4v-4" opacity="0.5" />
        </>
      );

    case "file-text":
      return (
        <>
          <path d="M8 3h6l4 4v14H8z" />
          <path d="M14 3v4h4" opacity="0.4" />
          <line x1="10.5" y1="11" x2="16" y2="11" opacity="0.5" />
          <line x1="10.5" y1="14" x2="16" y2="14" opacity="0.5" />
          <line x1="10.5" y1="17" x2="13" y2="17" opacity="0.5" />
        </>
      );

    case "calendar":
      return (
        <>
          <rect x="4" y="5" width="16" height="15" rx="1.5" />
          <path d="M4 9h16" opacity="0.4" />
          <path d="M8 3v4M16 3v4" opacity="0.4" />
          <circle cx="8.5" cy="13.5" r="1" fill="currentColor" stroke="none" opacity="0.6" />
          <circle cx="12" cy="13.5" r="1" fill="currentColor" stroke="none" opacity="0.5" />
          <circle cx="15.5" cy="13.5" r="1" fill="currentColor" stroke="none" opacity="0.4" />
        </>
      );

    case "folder":
      return (
        <>
          <path d="M4 8h4.5l2 2.5H20v10H4z" />
          <path d="M4 11h16" opacity="0.4" />
        </>
      );

    case "zap":
      return <path d="M13 2L4 13h7l-1 9 9-12h-7l1-8z" />;

    case "moon":
      return <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />;

    case "sun":
      return (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </>
      );

    // ── Structural ─────────────────────────────────────────────────────────

    case "chevron-down":
      return <path d="M6 9l6 6 6-6" />;

    case "chevron-right":
      return <path d="M9 6l6 6-6 6" />;

    case "chevron-left":
      return <path d="M15 6l-6 6 6 6" />;

    case "plus":
      return <path d="M12 4v16M4 12h16" />;

    case "close":
      return (
        <>
          <path d="M5 5l14 14" />
          <path d="M19 5L5 19" />
        </>
      );

    case "external":
      return (
        <>
          <path d="M18 13v6H5V6h6" />
          <path d="M15 3h6v6" />
          <path d="M10 14L21 3" />
        </>
      );

    default:
      return null;
  }
}

// ─── Icon Component ───────────────────────────────────────────────────────────

export function Icon({ name, className, bare }: IconProps) {
  const isStructural = STRUCTURAL.has(name);
  const isSelfFramed = SELF_FRAMED.has(name);
  const showFrame = !bare && !isStructural && !isSelfFramed;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-5 w-5 shrink-0", className)}
      aria-hidden="true"
    >
      {showFrame && FRAME}
      {renderContent(name)}
    </svg>
  );
}

// ─── Named Exports ────────────────────────────────────────────────────────────
// Each is a drop-in React component matching the { className?: string } interface.

type NamedIconProps = { className?: string; bare?: boolean };

function makeIcon(name: IconName, defaultBare?: boolean) {
  const C = ({ className, bare }: NamedIconProps) => (
    <Icon name={name} className={className} bare={bare ?? defaultBare} />
  );
  C.displayName = `${name
    .split("-")
    .map((s) => s[0].toUpperCase() + s.slice(1))
    .join("")}Icon`;
  return C;
}

// Navigation
export const HomeIcon     = makeIcon("home");
export const BriefIcon    = makeIcon("brief");
export const VisionIcon   = makeIcon("vision");
export const TypeIcon     = makeIcon("type");
export const ProjectsIcon = makeIcon("projects");
export const FlowIcon     = makeIcon("flow");
export const CanvasIcon   = makeIcon("canvas");

// Artboard utility
export const SearchIcon   = makeIcon("search");
export const FlagIcon     = makeIcon("flag");
export const RejectIcon   = makeIcon("reject");
export const UndoIcon     = makeIcon("undo");
export const PaletteIcon  = makeIcon("palette");
export const ImportIcon   = makeIcon("import");
export const SettingsIcon = makeIcon("settings");
export const AiSparkIcon  = makeIcon("ai-spark");

// Extended
export const FlameIcon    = makeIcon("flame");
export const ImageIcon    = makeIcon("image");     // artboard image/reference
export const ClockIcon    = makeIcon("clock");
export const CheckIcon    = makeIcon("check");
export const MessageIcon  = makeIcon("message");
export const FileTextIcon = makeIcon("file-text");
export const CalendarIcon = makeIcon("calendar");
export const FolderIcon   = makeIcon("folder");
export const ZapIcon      = makeIcon("zap");
export const MoonIcon     = makeIcon("moon");
export const SunIcon      = makeIcon("sun");

// Structural (always bare)
export const ChevronDownIcon  = makeIcon("chevron-down",  true);
export const ChevronRightIcon = makeIcon("chevron-right", true);
export const ChevronLeftIcon  = makeIcon("chevron-left",  true);
export const PlusIcon         = makeIcon("plus",          true);
export const CloseIcon        = makeIcon("close",         true);
export const ExternalIcon     = makeIcon("external",      true);
