// ─── Archetype Banned Node Types ────────────────────────────────────────────
// Certain PageNode types are structurally inappropriate for non-SaaS archetypes.
// These are hard-banned at prompt level and validated post-generation.
//
// Shared by generate-site.ts (prompt injection) and directive-compiler.ts
// (hard directive compilation). Extracted to avoid circular imports.

export function getArchetypeBannedNodeTypes(archetype: string | undefined): string[] {
  switch (archetype) {
    case "editorial-brand":
      return ["feature-grid", "testimonial-grid", "pricing-grid", "metric-row", "logo-row"];
    case "culture-event":
      return ["feature-grid", "testimonial-grid", "pricing-grid", "metric-row", "logo-row"];
    case "minimal-tech":
      return ["testimonial-grid", "pricing-grid", "logo-row"];
    case "creative-portfolio":
      return ["feature-grid", "pricing-grid", "metric-row", "logo-row"];
    case "culture-brand":
      return ["pricing-grid", "metric-row"];
    case "experimental":
      return ["feature-grid", "pricing-grid", "metric-row", "logo-row"];
    default: // premium-saas
      return []; // SaaS can use all primitives
  }
}
