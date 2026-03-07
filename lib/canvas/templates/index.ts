/**
 * Canvas Template Library
 *
 * Six production-quality site templates for the Generate panel.
 * Each template is a fully self-contained React component with:
 *   - Inline design tokens
 *   - Framer Motion animations
 *   - 5–8 complete sections
 *   - Named section exports for granular canvas insertion
 */

export { default as SaasLanding } from "./saas-landing";
export { default as Portfolio } from "./portfolio";
export { default as Agency } from "./agency";
export { default as Ecommerce } from "./ecommerce";
export { default as DocsSite } from "./docs-site";
export { default as Blog } from "./blog";

export type SiteType =
  | "auto"
  | "saas-landing"
  | "portfolio"
  | "agency"
  | "ecommerce"
  | "docs-site"
  | "blog";

export const SITE_TYPE_OPTIONS: { value: SiteType; label: string; description: string }[] = [
  { value: "auto", label: "Auto", description: "Let AI choose based on your prompt" },
  { value: "saas-landing", label: "SaaS Landing", description: "Dark, Linear-inspired product page" },
  { value: "portfolio", label: "Portfolio", description: "Minimal warm editorial personal site" },
  { value: "agency", label: "Agency", description: "Bold high-contrast creative agency" },
  { value: "ecommerce", label: "E-commerce", description: "Clean premium D2C product store" },
  { value: "docs-site", label: "Documentation", description: "Developer-focused Vercel-style docs" },
  { value: "blog", label: "Blog", description: "Editorial serif publication layout" },
];
