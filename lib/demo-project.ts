import type { TemplateReference } from "./templates";

// ─── Demo Project ─────────────────────────────────────────────────────────────
// A fully pre-populated project that ships with Studio OS.
// Always accessible, dismissable per-session via localStorage.

export const DEMO_PROJECT_ID = "studio-os-demo";
export const DEMO_DISMISSED_KEY = "studio-os:demo-dismissed";

export function isDemoDismissed(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(DEMO_DISMISSED_KEY) === "true";
}

export function dismissDemo(): void {
  localStorage.setItem(DEMO_DISMISSED_KEY, "true");
}

export interface DemoProject {
  id: string;
  name: string;
  client: string;
  brief: string;
  palette: string[];
  fonts: { heading: string; body: string }[];
  references: (TemplateReference & { board?: string })[];
  phase: "Discovery";
  progress: number;
  lastActivity: string;
  references_count: number;
  fontsSelected: number;
  daysActive: number;
  isDemo: true;
}

export const DEMO_PROJECT: DemoProject = {
  id: DEMO_PROJECT_ID,
  name: "Studio OS — Demo",
  client: "Studio OS",
  brief:
    "An interactive sample project to explore every feature of Studio OS. Vision, Type Library, Palette, Tasks — all pre-populated. Duplicate it to use as a real project, or delete it when you're ready.",
  phase: "Discovery",
  progress: 35,
  lastActivity: "Just now",
  references_count: 30,
  fontsSelected: 3,
  daysActive: 0,
  palette: ["#1a1a2e", "#e94560", "#0070f3", "#f4ede4", "#2d4a22", "#ffffff"],
  fonts: [
    { heading: "Inter", body: "Source Serif Pro" },
    { heading: "Playfair Display", body: "Lora" },
    { heading: "Space Grotesk", body: "Jost" },
  ],
  isDemo: true,
  references: [
    // ─ Brand ─
    {
      imageUrl: "https://picsum.photos/seed/demo-brand-01/800/600",
      title: "Monogram Study",
      tags: ["minimal", "logo", "monochrome", "identity"],
      colors: ["#1a1a1a", "#ffffff"],
      board: "Brand",
    },
    {
      imageUrl: "https://picsum.photos/seed/demo-brand-02/800/600",
      title: "Brand System",
      tags: ["grid", "system", "brand", "identity"],
      colors: ["#e94560", "#1a1a2e"],
      board: "Brand",
    },
    {
      imageUrl: "https://picsum.photos/seed/demo-brand-03/800/600",
      title: "Color Exploration",
      tags: ["color", "palette", "brand", "bold"],
      colors: ["#e94560", "#0070f3", "#f4ede4"],
      board: "Brand",
    },
    {
      imageUrl: "https://picsum.photos/seed/demo-brand-04/800/600",
      title: "Wordmark Sketch",
      tags: ["wordmark", "logotype", "sans-serif", "identity"],
      colors: ["#1a1a2e", "#f5f5f5"],
      board: "Brand",
    },
    {
      imageUrl: "https://picsum.photos/seed/demo-brand-05/800/600",
      title: "Brand in Context",
      tags: ["brand", "context", "environmental", "signage"],
      colors: ["#0070f3", "#ffffff"],
      board: "Brand",
    },

    // ─ Typography ─
    {
      imageUrl: "https://picsum.photos/seed/demo-type-01/800/600",
      title: "Typographic Poster",
      tags: ["typography", "bold", "editorial", "poster"],
      colors: ["#1a1a1a", "#f4ede4"],
      board: "Typography",
    },
    {
      imageUrl: "https://picsum.photos/seed/demo-type-02/800/600",
      title: "Serif Display",
      tags: ["serif", "display", "warm", "editorial"],
      colors: ["#f4ede4", "#2c1a0e"],
      board: "Typography",
    },
    {
      imageUrl: "https://picsum.photos/seed/demo-type-03/800/600",
      title: "Paired Typefaces",
      tags: ["pairing", "typography", "serif", "sans-serif"],
      colors: ["#1a1a1a", "#e8e8e8"],
      board: "Typography",
    },
    {
      imageUrl: "https://picsum.photos/seed/demo-type-04/800/600",
      title: "Magazine Layout",
      tags: ["editorial", "magazine", "warm", "serif", "layout"],
      colors: ["#f4ede4", "#8b3a3a"],
      board: "Typography",
    },
    {
      imageUrl: "https://picsum.photos/seed/demo-type-05/800/600",
      title: "Geometric Sans",
      tags: ["geometric", "sans-serif", "clean", "bold", "minimal"],
      colors: ["#0a0a0a", "#f5f5f5"],
      board: "Typography",
    },

    // ─ UI/Web ─
    {
      imageUrl: "https://picsum.photos/seed/demo-web-01/800/600",
      title: "Dark Dashboard",
      tags: ["dark", "dashboard", "UI", "data", "interface"],
      colors: ["#0a0a0a", "#0070f3", "#ffffff"],
      board: "UI/Web",
    },
    {
      imageUrl: "https://picsum.photos/seed/demo-web-02/800/600",
      title: "Product Landing",
      tags: ["landing", "product", "clean", "SaaS", "minimal"],
      colors: ["#ffffff", "#1a1a1a", "#0070f3"],
      board: "UI/Web",
    },
    {
      imageUrl: "https://picsum.photos/seed/demo-web-03/800/600",
      title: "Mobile App",
      tags: ["mobile", "app", "iOS", "interface", "clean"],
      colors: ["#f5f5f5", "#1c1c1c"],
      board: "UI/Web",
    },
    {
      imageUrl: "https://picsum.photos/seed/demo-web-04/800/600",
      title: "Navigation System",
      tags: ["navigation", "minimal", "dark", "UI", "system"],
      colors: ["#111111", "#ffffff"],
      board: "UI/Web",
    },
    {
      imageUrl: "https://picsum.photos/seed/demo-web-05/800/600",
      title: "Card Grid",
      tags: ["cards", "grid", "UI", "components", "dark"],
      colors: ["#1c1c1c", "#2a2a2a", "#ffffff"],
      board: "UI/Web",
    },

    // ─ Packaging ─
    {
      imageUrl: "https://picsum.photos/seed/demo-pack-01/800/600",
      title: "Minimal Label",
      tags: ["minimal", "packaging", "label", "product", "clean"],
      colors: ["#f0e6d3", "#1a1a1a"],
      board: "Packaging",
    },
    {
      imageUrl: "https://picsum.photos/seed/demo-pack-02/800/600",
      title: "Organic Branding",
      tags: ["organic", "natural", "warm", "packaging", "label"],
      colors: ["#2d4a22", "#f0e6d3", "#c4773b"],
      board: "Packaging",
    },
    {
      imageUrl: "https://picsum.photos/seed/demo-pack-03/800/600",
      title: "Luxury Packaging",
      tags: ["luxury", "bold", "dark", "packaging", "product"],
      colors: ["#1a1a1a", "#c4773b"],
      board: "Packaging",
    },
    {
      imageUrl: "https://picsum.photos/seed/demo-pack-04/800/600",
      title: "Bottle Design",
      tags: ["bottle", "product", "minimal", "label", "packaging"],
      colors: ["#4a7c59", "#f0e6d3"],
      board: "Packaging",
    },
    {
      imageUrl: "https://picsum.photos/seed/demo-pack-05/800/600",
      title: "Packaging System",
      tags: ["system", "brand", "packaging", "minimal", "product"],
      colors: ["#e8d5b7", "#2d4a22"],
      board: "Packaging",
    },

    // ─ Photography ─
    {
      imageUrl: "https://picsum.photos/seed/demo-photo-01/800/600",
      title: "Studio Portrait",
      tags: ["photography", "portrait", "warm", "editorial", "film"],
      colors: ["#c9a87c", "#2c1a0e"],
      board: "Photography",
    },
    {
      imageUrl: "https://picsum.photos/seed/demo-photo-02/800/600",
      title: "Architectural Detail",
      tags: ["architecture", "minimal", "geometry", "clean", "monochrome"],
      colors: ["#f5f5f5", "#1a1a1a"],
      board: "Photography",
    },
    {
      imageUrl: "https://picsum.photos/seed/demo-photo-03/800/600",
      title: "Product Still Life",
      tags: ["product", "still-life", "warm", "photography", "minimal"],
      colors: ["#f0e6d3", "#c4773b"],
      board: "Photography",
    },
    {
      imageUrl: "https://picsum.photos/seed/demo-photo-04/800/600",
      title: "Environment",
      tags: ["environment", "space", "photography", "editorial", "moody"],
      colors: ["#2c1a0e", "#c9a87c"],
      board: "Photography",
    },
    {
      imageUrl: "https://picsum.photos/seed/demo-photo-05/800/600",
      title: "Texture Study",
      tags: ["texture", "material", "organic", "craft", "warm"],
      colors: ["#e8d5b7", "#8b6a4a"],
      board: "Photography",
    },

    // ─ Miscellaneous ─
    {
      imageUrl: "https://picsum.photos/seed/demo-misc-01/800/600",
      title: "Color Palette",
      tags: ["color", "palette", "minimal", "clean", "brand"],
      colors: ["#e94560", "#0070f3", "#f4ede4", "#2d4a22"],
      board: "Color",
    },
    {
      imageUrl: "https://picsum.photos/seed/demo-misc-02/800/600",
      title: "Grid System",
      tags: ["grid", "system", "layout", "structure", "minimal"],
      colors: ["#1a1a1a", "#f5f5f5"],
      board: "Layout",
    },
    {
      imageUrl: "https://picsum.photos/seed/demo-misc-03/800/600",
      title: "Motion Study",
      tags: ["motion", "dynamic", "bold", "animation", "brand"],
      colors: ["#0070f3", "#1a1a2e"],
      board: "Motion",
    },
    {
      imageUrl: "https://picsum.photos/seed/demo-misc-04/800/600",
      title: "Dark Editorial",
      tags: ["dark", "editorial", "moody", "photography", "bold"],
      colors: ["#1a1a1a", "#e94560"],
      board: "Editorial",
    },
    {
      imageUrl: "https://picsum.photos/seed/demo-misc-05/800/600",
      title: "Space & Proportion",
      tags: ["space", "proportion", "minimal", "layout", "clean"],
      colors: ["#ffffff", "#cccccc", "#1a1a1a"],
      board: "Layout",
    },
  ],
};
