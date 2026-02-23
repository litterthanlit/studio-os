export type Phase = "Discovery" | "Concept" | "Refine" | "Deliver";

export type ProjectFont = {
  family: string;
  source: "google" | "fontshare";
  category: "sans-serif" | "serif" | "display" | "handwriting" | "monospace";
};

export type Project = {
  id: string;
  name: string;
  client: string;
  phase: Phase;
  progress: number;
  leadImage: string;
  palette: string[];
  lastActivity: string;
  references: number;
  fontsSelected: number;
  daysActive: number;
  headingFont?: ProjectFont;
  bodyFont?: ProjectFont;
};

export const PROJECTS: Project[] = [
  {
    id: "acme-rebrand",
    name: "Acme Rebrand",
    client: "Acme Corporation",
    phase: "Discovery",
    progress: 40,
    leadImage: "https://picsum.photos/seed/acme-rebrand/400/300",
    palette: ["#1b1b1f", "#f97316", "#fed7aa", "#0f172a", "#e4e4e7"],
    lastActivity: "2 hours ago",
    references: 12,
    fontsSelected: 3,
    daysActive: 9,
  },
  {
    id: "fintech-dashboard",
    name: "FinTech Dashboard",
    client: "Northline Capital",
    phase: "Refine",
    progress: 75,
    leadImage: "https://picsum.photos/seed/fintech-dashboard/400/300",
    palette: ["#020617", "#0f172a", "#1d4ed8", "#38bdf8", "#e5e7eb"],
    lastActivity: "Yesterday",
    references: 8,
    fontsSelected: 2,
    daysActive: 21,
  },
  {
    id: "editorial-magazine",
    name: "Editorial Magazine",
    client: "Field Notes Studio",
    phase: "Concept",
    progress: 25,
    leadImage: "https://picsum.photos/seed/editorial-magazine/400/300",
    palette: ["#f9fafb", "#1f2937", "#111827", "#e5e7eb", "#f97316"],
    lastActivity: "3 days ago",
    references: 15,
    fontsSelected: 4,
    daysActive: 12,
  },
  {
    id: "personal-portfolio",
    name: "Personal Portfolio",
    client: "Nick — Studio OS",
    phase: "Deliver",
    progress: 90,
    leadImage: "https://picsum.photos/seed/personal-portfolio/400/300",
    palette: ["#020617", "#f9fafb", "#64748b", "#e5e7eb", "#0f172a"],
    lastActivity: "45 minutes ago",
    references: 6,
    fontsSelected: 2,
    daysActive: 4,
  },
];

export const PHASE_STYLES: Record<Phase, string> = {
  Discovery:
    "bg-amber-500/20 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300 transition-colors duration-300",
  Concept:
    "bg-purple-500/20 text-purple-600 dark:bg-purple-500/20 dark:text-purple-300 transition-colors duration-300",
  Refine:
    "bg-sky-500/20 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300 transition-colors duration-300",
  Deliver:
    "bg-emerald-500/20 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300 transition-colors duration-300",
};
