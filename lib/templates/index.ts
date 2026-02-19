// ─── Template Types ───────────────────────────────────────────────────────────

export interface TemplateReference {
  imageUrl: string;
  title: string;
  tags: string[];
  colors: string[];
}

export interface FontPairing {
  heading: string;
  body: string;
}

export interface Template {
  id: TemplateId;
  name: string;
  description: string;
  cover: string;
  /** Shown on the card in onboarding */
  refCount: number;
  references: TemplateReference[];
  palette: string[];
  fonts: FontPairing[];
  /** Template-specific search suggestions for the "wow moment" */
  searchSuggestions: string[];
}

export type TemplateId =
  | "brand-identity"
  | "web-redesign"
  | "editorial"
  | "packaging";

// ─── Template Definitions ─────────────────────────────────────────────────────

export const brandIdentityTemplate: Template = {
  id: "brand-identity",
  name: "Brand Identity",
  description: "Logo, visual identity, and brand system exploration",
  cover: "https://picsum.photos/seed/brand-hero/600/400",
  refCount: 12,
  searchSuggestions: [
    "minimal monochrome",
    "bold logotype",
    "identity system",
  ],
  palette: ["#1a1a2e", "#e94560", "#ffffff", "#0f3460", "#533483", "#f5f5f5"],
  fonts: [
    { heading: "Inter", body: "Source Serif Pro" },
    { heading: "Space Grotesk", body: "Lora" },
  ],
  references: [
    {
      imageUrl: "https://picsum.photos/seed/brand-mono-01/800/600",
      title: "Monogram Study",
      tags: ["minimal", "logo", "monochrome", "identity", "lettermark"],
      colors: ["#1a1a1a", "#ffffff"],
    },
    {
      imageUrl: "https://picsum.photos/seed/brand-system-02/800/600",
      title: "Brand System Grid",
      tags: ["grid", "system", "brand", "structure", "identity"],
      colors: ["#f5f5f5", "#222222", "#e94560"],
    },
    {
      imageUrl: "https://picsum.photos/seed/brand-type-03/800/600",
      title: "Logotype Exploration",
      tags: ["wordmark", "logotype", "bold", "sans-serif", "brand"],
      colors: ["#0f3460", "#ffffff"],
    },
    {
      imageUrl: "https://picsum.photos/seed/brand-color-04/800/600",
      title: "Color System",
      tags: ["color", "system", "palette", "brand", "identity"],
      colors: ["#e94560", "#533483", "#0f3460", "#1a1a2e"],
    },
    {
      imageUrl: "https://picsum.photos/seed/brand-dark-05/800/600",
      title: "Dark Mode Brand",
      tags: ["dark", "minimal", "brand", "monochrome", "clean"],
      colors: ["#111111", "#ffffff", "#0070f3"],
    },
    {
      imageUrl: "https://picsum.photos/seed/brand-print-06/800/600",
      title: "Print Collateral",
      tags: ["print", "collateral", "brand", "editorial", "minimal"],
      colors: ["#1a1a1a", "#f5f5f5"],
    },
    {
      imageUrl: "https://picsum.photos/seed/brand-geo-07/800/600",
      title: "Geometric Mark",
      tags: ["geometric", "logo", "mark", "bold", "identity"],
      colors: ["#e94560", "#1a1a2e"],
    },
    {
      imageUrl: "https://picsum.photos/seed/brand-sans-08/800/600",
      title: "Sans-Serif Identity",
      tags: ["sans-serif", "clean", "modern", "minimal", "wordmark"],
      colors: ["#222222", "#f0f0f0"],
    },
    {
      imageUrl: "https://picsum.photos/seed/brand-motion-09/800/600",
      title: "Brand in Motion",
      tags: ["motion", "dynamic", "brand", "system", "animation"],
      colors: ["#533483", "#ffffff"],
    },
    {
      imageUrl: "https://picsum.photos/seed/brand-stationery-10/800/600",
      title: "Brand Stationery",
      tags: ["stationery", "print", "brand", "minimal", "clean"],
      colors: ["#f5f5f5", "#1a1a2e"],
    },
    {
      imageUrl: "https://picsum.photos/seed/brand-signage-11/800/600",
      title: "Environmental Signage",
      tags: ["signage", "environmental", "brand", "scale", "bold"],
      colors: ["#0f3460", "#f5f5f5"],
    },
    {
      imageUrl: "https://picsum.photos/seed/brand-guide-12/800/600",
      title: "Brand Guidelines",
      tags: ["guidelines", "system", "brand", "identity", "documentation"],
      colors: ["#1a1a2e", "#e94560", "#ffffff"],
    },
  ],
};

export const webRedesignTemplate: Template = {
  id: "web-redesign",
  name: "Web Redesign",
  description: "UI, product design, and web interface exploration",
  cover: "https://picsum.photos/seed/web-hero/600/400",
  refCount: 10,
  searchSuggestions: ["dark UI dashboard", "clean minimal", "mobile interface"],
  palette: ["#0a0a0a", "#1c1c1c", "#0070f3", "#ffffff", "#888888", "#3333ff"],
  fonts: [
    { heading: "Inter", body: "Inter" },
    { heading: "Geist", body: "Geist Mono" },
  ],
  references: [
    {
      imageUrl: "https://picsum.photos/seed/web-dash-01/800/600",
      title: "Analytics Dashboard",
      tags: ["dark", "UI", "dashboard", "data", "interface"],
      colors: ["#0a0a0a", "#0070f3", "#ffffff"],
    },
    {
      imageUrl: "https://picsum.photos/seed/web-landing-02/800/600",
      title: "SaaS Landing Page",
      tags: ["landing", "SaaS", "product", "clean", "minimal"],
      colors: ["#ffffff", "#111111", "#0070f3"],
    },
    {
      imageUrl: "https://picsum.photos/seed/web-mobile-03/800/600",
      title: "Mobile App UI",
      tags: ["mobile", "app", "interface", "iOS", "clean"],
      colors: ["#f5f5f5", "#1c1c1c", "#3333ff"],
    },
    {
      imageUrl: "https://picsum.photos/seed/web-ecom-04/800/600",
      title: "E-commerce Grid",
      tags: ["ecommerce", "grid", "product", "minimal", "web"],
      colors: ["#ffffff", "#222222"],
    },
    {
      imageUrl: "https://picsum.photos/seed/web-nav-05/800/600",
      title: "Navigation Pattern",
      tags: ["navigation", "UI", "pattern", "minimal", "dark"],
      colors: ["#111111", "#ffffff", "#0070f3"],
    },
    {
      imageUrl: "https://picsum.photos/seed/web-type-06/800/600",
      title: "Typography Web",
      tags: ["typography", "web", "clean", "minimal", "editorial"],
      colors: ["#f9f9f9", "#1a1a1a"],
    },
    {
      imageUrl: "https://picsum.photos/seed/web-card-07/800/600",
      title: "Card Components",
      tags: ["components", "cards", "UI", "system", "dark"],
      colors: ["#1c1c1c", "#2a2a2a", "#ffffff"],
    },
    {
      imageUrl: "https://picsum.photos/seed/web-form-08/800/600",
      title: "Form Design",
      tags: ["form", "input", "UI", "clean", "minimal"],
      colors: ["#ffffff", "#e5e5e5", "#0070f3"],
    },
    {
      imageUrl: "https://picsum.photos/seed/web-portfolio-09/800/600",
      title: "Portfolio Layout",
      tags: ["portfolio", "grid", "minimal", "clean", "editorial"],
      colors: ["#f5f5f5", "#1a1a1a"],
    },
    {
      imageUrl: "https://picsum.photos/seed/web-dark-10/800/600",
      title: "Dark Product UI",
      tags: ["dark", "product", "UI", "interface", "minimal"],
      colors: ["#0a0a0a", "#1c1c1c", "#888888"],
    },
  ],
};

export const editorialTemplate: Template = {
  id: "editorial",
  name: "Editorial",
  description: "Magazine layouts, editorial photography, and print design",
  cover: "https://picsum.photos/seed/editorial-hero/600/400",
  refCount: 10,
  searchSuggestions: [
    "warm editorial serif",
    "magazine spread",
    "typographic layout",
  ],
  palette: ["#f4ede4", "#2c1a0e", "#c9a87c", "#1a1a1a", "#8b3a3a", "#ffffff"],
  fonts: [
    { heading: "Playfair Display", body: "Source Serif Pro" },
    { heading: "Fraunces", body: "Lora" },
  ],
  references: [
    {
      imageUrl: "https://picsum.photos/seed/editorial-spread-01/800/600",
      title: "Magazine Spread",
      tags: ["warm", "editorial", "serif", "magazine", "spread"],
      colors: ["#f4ede4", "#2c1a0e", "#c9a87c"],
    },
    {
      imageUrl: "https://picsum.photos/seed/editorial-type-02/800/600",
      title: "Typographic Cover",
      tags: ["typographic", "editorial", "bold", "serif", "print"],
      colors: ["#1a1a1a", "#f4ede4"],
    },
    {
      imageUrl: "https://picsum.photos/seed/editorial-photo-03/800/600",
      title: "Editorial Photography",
      tags: ["photography", "editorial", "warm", "portrait", "film"],
      colors: ["#c9a87c", "#2c1a0e", "#f4ede4"],
    },
    {
      imageUrl: "https://picsum.photos/seed/editorial-grid-04/800/600",
      title: "Grid Layout",
      tags: ["grid", "layout", "editorial", "magazine", "print"],
      colors: ["#ffffff", "#1a1a1a"],
    },
    {
      imageUrl: "https://picsum.photos/seed/editorial-column-05/800/600",
      title: "Column Typesetting",
      tags: ["serif", "column", "typesetting", "print", "editorial"],
      colors: ["#f9f5f0", "#2c1a0e"],
    },
    {
      imageUrl: "https://picsum.photos/seed/editorial-cover-06/800/600",
      title: "Magazine Cover",
      tags: ["cover", "magazine", "bold", "editorial", "serif"],
      colors: ["#8b3a3a", "#f4ede4", "#1a1a1a"],
    },
    {
      imageUrl: "https://picsum.photos/seed/editorial-full-07/800/600",
      title: "Full Bleed Image",
      tags: ["full-bleed", "editorial", "warm", "photography", "spread"],
      colors: ["#c9a87c", "#2c1a0e"],
    },
    {
      imageUrl: "https://picsum.photos/seed/editorial-serif-08/800/600",
      title: "Serif Display",
      tags: ["serif", "display", "editorial", "typography", "warm"],
      colors: ["#f4ede4", "#1a1a1a", "#8b3a3a"],
    },
    {
      imageUrl: "https://picsum.photos/seed/editorial-annual-09/800/600",
      title: "Annual Report",
      tags: ["annual", "report", "editorial", "grid", "minimal"],
      colors: ["#ffffff", "#1a1a1a", "#c9a87c"],
    },
    {
      imageUrl: "https://picsum.photos/seed/editorial-book-10/800/600",
      title: "Book Design",
      tags: ["book", "print", "editorial", "serif", "minimal"],
      colors: ["#f4ede4", "#2c1a0e"],
    },
  ],
};

export const packagingTemplate: Template = {
  id: "packaging",
  name: "Packaging",
  description: "Product packaging, label design, and unboxing experience",
  cover: "https://picsum.photos/seed/packaging-hero/600/400",
  refCount: 8,
  searchSuggestions: ["minimal packaging", "bold product", "organic label"],
  palette: ["#f0e6d3", "#2d4a22", "#c4773b", "#1a1a1a", "#e8d5b7", "#4a7c59"],
  fonts: [
    { heading: "Cormorant Garamond", body: "Jost" },
    { heading: "Space Grotesk", body: "Source Sans Pro" },
  ],
  references: [
    {
      imageUrl: "https://picsum.photos/seed/pack-minimal-01/800/600",
      title: "Minimal Packaging",
      tags: ["minimal", "packaging", "clean", "product", "label"],
      colors: ["#f0e6d3", "#1a1a1a"],
    },
    {
      imageUrl: "https://picsum.photos/seed/pack-organic-02/800/600",
      title: "Organic Product Label",
      tags: ["organic", "label", "packaging", "warm", "natural"],
      colors: ["#2d4a22", "#f0e6d3", "#c4773b"],
    },
    {
      imageUrl: "https://picsum.photos/seed/pack-luxury-03/800/600",
      title: "Luxury Box Design",
      tags: ["luxury", "box", "packaging", "bold", "dark"],
      colors: ["#1a1a1a", "#c4773b", "#f0e6d3"],
    },
    {
      imageUrl: "https://picsum.photos/seed/pack-bottle-04/800/600",
      title: "Bottle Label",
      tags: ["bottle", "label", "product", "minimal", "packaging"],
      colors: ["#4a7c59", "#f0e6d3", "#2d4a22"],
    },
    {
      imageUrl: "https://picsum.photos/seed/pack-bold-05/800/600",
      title: "Bold Graphic Packaging",
      tags: ["bold", "graphic", "packaging", "product", "color"],
      colors: ["#c4773b", "#1a1a1a", "#f0e6d3"],
    },
    {
      imageUrl: "https://picsum.photos/seed/pack-system-06/800/600",
      title: "Packaging System",
      tags: ["system", "packaging", "brand", "product", "minimal"],
      colors: ["#e8d5b7", "#2d4a22"],
    },
    {
      imageUrl: "https://picsum.photos/seed/pack-wrap-07/800/600",
      title: "Tissue & Wrap",
      tags: ["wrap", "tissue", "unboxing", "minimal", "packaging"],
      colors: ["#f0e6d3", "#c4773b"],
    },
    {
      imageUrl: "https://picsum.photos/seed/pack-texture-08/800/600",
      title: "Textured Material",
      tags: ["texture", "material", "packaging", "organic", "craft"],
      colors: ["#e8d5b7", "#2d4a22", "#c4773b"],
    },
  ],
};

// ─── Registry ─────────────────────────────────────────────────────────────────

export const TEMPLATES: Record<TemplateId, Template> = {
  "brand-identity": brandIdentityTemplate,
  "web-redesign": webRedesignTemplate,
  editorial: editorialTemplate,
  packaging: packagingTemplate,
};

export const TEMPLATE_LIST: Template[] = Object.values(TEMPLATES);
