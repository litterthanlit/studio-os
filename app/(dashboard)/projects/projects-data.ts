export type Phase = "Discovery" | "Concept" | "Refine" | "Deliver";

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
    "border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-900/40 dark:text-amber-200",
  Concept:
    "border border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-500/40 dark:bg-purple-900/40 dark:text-purple-200",
  Refine:
    "border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/40 dark:bg-sky-900/40 dark:text-sky-200",
  Deliver:
    "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-900/40 dark:text-emerald-200",
};
