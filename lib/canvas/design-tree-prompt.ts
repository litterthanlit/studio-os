// lib/canvas/design-tree-prompt.ts
// AI prompt for generating DesignNode JSON trees.
// Replaces buildPageTreePrompt() — teaches the model the 5-type system,
// composition vocabulary, and archetype-specific grammars.

import type { DesignSystemTokens } from "./generate-system";
import type { TasteProfile } from "@/types/taste-profile";
import type { DesignNode } from "./design-node";
import {
  compileTasteToDirectives,
  directivesToPromptText,
  type CompiledDirectives,
  type FidelityMode,
} from "./directive-compiler";
import { getArchetypeBanDescriptions } from "./design-archetype-bans";
import { PRODUCT_PRIMITIVE_STYLE_TOKENS as PRIM } from "./design-component-library";

// Re-export for consumers
export type VariantMode = "safe" | "creative" | "alternative";

/** Archetypes that use premium-saas primitive + composition grammar (default branch). */
function usesPremiumSaasProductGrammar(archetype: string | undefined): boolean {
  switch (archetype) {
    case "editorial-brand":
    case "minimal-tech":
    case "creative-portfolio":
    case "culture-brand":
    case "experimental":
      return false;
    default:
      return true;
  }
}

/** Phase 4A — prompt-only accent mapping; no runtime merge of insertable library. */
function buildProductPrimitiveAccentMapping4A(tokens: DesignSystemTokens): string {
  return `## PRODUCT PRIMITIVE ACCENT — TASTE / TOKENS (approach 4A)

When generating this **product / SaaS** page, map **accent color** to interactive primitives as follows. Do **not** change radii or padding bands.

**Priority for accent hex:** (1) If **Compiled Design Directives** include **HARD CONSTRAINTS [palette]** with listed colors, use the palette's **accent** (the vivid / CTA color among those hexes) for interactive fills and outlines. (2) Else use **Design Tokens** accent: ${tokens.colors.accent}. (3) Only if neither applies, fall back to default kit accent ${PRIM.accent}.

**Apply that accent to:** **primary** button background; **outline** button borderColor and foreground; **link CTA** (**text** node with underline) foreground; **badge** pill text color; **icon + label row** — small square tile background = a pale tint of the same accent (similar lightness to ${PRIM.accentLight} but hue from the chosen accent).

**Neutrals:** Prefer taste-listed background, surface, text, and border from HARD **[palette]** for **section** backgrounds and page-level type when listed. For **card**, **input**, and **divider** primitives, keep ${PRIM.border}, ${PRIM.muted}, ${PRIM.surface} unless the palette explicitly replaces them.

**Primary button label:** Use **#FFFFFF** on primary unless the accent is very light (near white); then use **${PRIM.text}** for button text for contrast.
`;
}

// ─── Archetype Composition Grammars ──────────────────────────────────────────

function getDesignArchetypeGrammar(archetype: string | undefined): string {
  switch (archetype) {
    case "editorial-brand":
      return `
## SECTION GRAMMAR — EDITORIAL

You are generating an EDITORIAL design, NOT a SaaS landing page.

DO NOT USE these SaaS patterns:
- 3-column uniform card grids (icon + title + description)
- Stats/metrics rows with big numbers
- Logo bars / social proof strips
- Pricing tables or tier comparisons
- "How it works" numbered steps
- FAQ accordions

USE INSTEAD: Layered hero with coverImage, asymmetric grid spreads, pullquotes, full-bleed photo breaks, editorial story indexes, minimal subscribe CTAs.

## COMPLETE EDITORIAL COMPOSITION EXAMPLE

This is a complete editorial homepage as a DesignNode tree. Study the composition — how sections relate, how height varies, how full-bleed alternates with contained text, how coverImage creates layered moments.

[{"id":"page-root","type":"frame","name":"Editorial Homepage","style":{"width":"fill","display":"flex","flexDirection":"column","background":"#FAF9F6","foreground":"#1A1A1A"},"children":[{"id":"nav-01","type":"frame","name":"Navigation","style":{"width":"fill","display":"flex","flexDirection":"row","justifyContent":"space-between","alignItems":"center","padding":{"top":20,"right":64,"bottom":20,"left":64}},"children":[{"id":"nav-logo","type":"text","name":"Logo","style":{"fontSize":14,"fontWeight":600,"letterSpacing":0.12},"content":{"text":"ATELIER"}},{"id":"nav-links","type":"text","name":"Links","style":{"fontSize":13,"foreground":"#888888"},"content":{"text":"Stories     Archive     About"}}]},{"id":"hero-01","type":"frame","name":"Hero","style":{"width":"fill","height":720,"coverImage":"photo:editorial fashion photography, dramatic side lighting, full frame, high contrast","coverSize":"cover","coverPosition":"center 30%","display":"flex","flexDirection":"column","justifyContent":"flex-end","alignItems":"flex-start","padding":{"top":0,"right":64,"bottom":64,"left":64},"foreground":"#FFFFFF"},"children":[{"id":"hero-kicker","type":"text","name":"Kicker","style":{"fontSize":11,"letterSpacing":0.15,"opacity":0.6},"content":{"text":"ISSUE 12 — SPRING 2026"}},{"id":"hero-headline","type":"text","name":"Headline","style":{"fontSize":68,"fontWeight":300,"lineHeight":1.0,"letterSpacing":-0.03,"maxWidth":"70%"},"content":{"text":"The Body as Architecture"}},{"id":"hero-sub","type":"text","name":"Subtext","style":{"fontSize":16,"opacity":0.7,"maxWidth":"40%","lineHeight":1.5},"content":{"text":"How three designers are redefining the relationship between garment and structure."}}]},{"id":"spread-01","type":"frame","name":"Editorial Spread","style":{"width":"fill","display":"grid","gridTemplate":"3fr 2fr","gap":48,"padding":{"top":96,"right":64,"bottom":96,"left":64},"alignItems":"center"},"children":[{"id":"spread-text","type":"frame","name":"Spread Text","style":{"display":"flex","flexDirection":"column","gap":16},"children":[{"id":"spread-kicker","type":"text","name":"Kicker","style":{"fontSize":11,"letterSpacing":0.12,"foreground":"#999999"},"content":{"text":"FEATURE"}},{"id":"spread-title","type":"text","name":"Title","style":{"fontSize":36,"fontWeight":400,"lineHeight":1.2},"content":{"text":"Dressed for No One in Particular"}},{"id":"spread-body","type":"text","name":"Body","style":{"fontSize":15,"lineHeight":1.7,"foreground":"#555555","maxWidth":420},"content":{"text":"In a season defined by excess, these three collections argue for restraint — garments that exist for the wearer, not the audience."}},{"id":"spread-byline","type":"text","name":"Byline","style":{"fontSize":12,"foreground":"#999999"},"content":{"text":"Words by Elena Voss"}}]},{"id":"spread-img","type":"image","name":"Spread Photo","style":{"width":520,"height":520,"objectFit":"cover","borderRadius":4},"content":{"src":"photo:fashion editorial photograph, model in natural light, muted tones","alt":"Fashion editorial"}}]},{"id":"quote-01","type":"frame","name":"Pullquote","style":{"width":"fill","display":"flex","flexDirection":"column","alignItems":"center","justifyContent":"center","padding":{"top":100,"right":120,"bottom":100,"left":120},"background":"#1A1A1A","foreground":"#FFFFFF"},"children":[{"id":"quote-text","type":"text","name":"Quote","style":{"fontSize":30,"fontWeight":300,"fontStyle":"italic","lineHeight":1.6,"textAlign":"center","maxWidth":700},"content":{"text":"\\u201CFashion is not about the garment. It is about the space the garment creates around the body.\\u201D"}},{"id":"quote-attr","type":"text","name":"Attribution","style":{"fontSize":13,"opacity":0.4,"textAlign":"center"},"content":{"text":"— Rei Kawakubo, 1987"}}]},{"id":"photo-break","type":"frame","name":"Photo Break","style":{"width":"fill","height":480,"coverImage":"photo:abstract textile close-up, woven fabric texture, soft natural light","coverSize":"cover","coverPosition":"center"},"children":[]},{"id":"stories-01","type":"frame","name":"Story Index","style":{"width":"fill","display":"flex","flexDirection":"column","gap":0,"padding":{"top":80,"right":64,"bottom":80,"left":64}},"children":[{"id":"stories-hdr","type":"text","name":"Section Header","style":{"fontSize":11,"letterSpacing":0.12,"foreground":"#999999","padding":{"top":0,"right":0,"bottom":24,"left":0}},"content":{"text":"ALSO IN THIS ISSUE"}},{"id":"story-0","type":"frame","name":"Story 01","style":{"display":"flex","flexDirection":"row","justifyContent":"space-between","alignItems":"baseline","padding":{"top":20,"right":0,"bottom":20,"left":0},"borderColor":"#E5E5E0","borderWidth":1},"children":[{"id":"s0-num","type":"text","name":"Number","style":{"fontSize":13,"foreground":"#BBBBBB"},"content":{"text":"01"}},{"id":"s0-title","type":"text","name":"Title","style":{"fontSize":22,"fontWeight":400,"flexGrow":1,"padding":{"top":0,"right":0,"bottom":0,"left":24}},"content":{"text":"The Geometry of Drape"}},{"id":"s0-by","type":"text","name":"Byline","style":{"fontSize":13,"foreground":"#999999"},"content":{"text":"Yuki Tanaka"}}]},{"id":"story-1","type":"frame","name":"Story 02","style":{"display":"flex","flexDirection":"row","justifyContent":"space-between","alignItems":"baseline","padding":{"top":20,"right":0,"bottom":20,"left":0},"borderColor":"#E5E5E0","borderWidth":1},"children":[{"id":"s1-num","type":"text","name":"Number","style":{"fontSize":13,"foreground":"#BBBBBB"},"content":{"text":"02"}},{"id":"s1-title","type":"text","name":"Title","style":{"fontSize":22,"fontWeight":400,"flexGrow":1,"padding":{"top":0,"right":0,"bottom":0,"left":24}},"content":{"text":"After the Show: What Remains"}},{"id":"s1-by","type":"text","name":"Byline","style":{"fontSize":13,"foreground":"#999999"},"content":{"text":"Clara Mendes"}}]}]},{"id":"sub-01","type":"frame","name":"Subscribe","style":{"width":"fill","display":"flex","flexDirection":"column","alignItems":"center","gap":12,"padding":{"top":48,"right":64,"bottom":48,"left":64}},"children":[{"id":"sub-text","type":"text","name":"CTA Text","style":{"fontSize":14,"foreground":"#888888"},"content":{"text":"Receive new issues directly."}},{"id":"sub-btn","type":"button","name":"Subscribe","style":{"fontSize":14,"background":"transparent","foreground":"#1A1A1A","borderColor":"#CCCCCC","borderWidth":1,"borderRadius":2,"padding":{"top":10,"right":24,"bottom":10,"left":24}},"content":{"text":"Subscribe →"}}]},{"id":"footer-01","type":"frame","name":"Footer","style":{"width":"fill","display":"flex","flexDirection":"row","justifyContent":"space-between","padding":{"top":24,"right":64,"bottom":24,"left":64},"opacity":0.4},"children":[{"id":"f-copy","type":"text","name":"Copyright","style":{"fontSize":12},"content":{"text":"© 2026 Atelier Magazine"}},{"id":"f-links","type":"text","name":"Links","style":{"fontSize":12},"content":{"text":"Instagram     Privacy     Contact"}}]}]}]

Adapt this composition to match the brief and taste profile:
- Replace all text with original editorial copy
- Adjust colors to match the taste palette
- Adjust fonts to match the taste profile
- You may add or remove one section, but keep the overall rhythm and pacing
- You may combine editorial patterns differently

## PAGE-LEVEL COMPOSITION RULES

1. **VISUAL RHYTHM**: Adjacent sections MUST contrast in visual weight. Image-heavy → text-led → image-heavy. Never two image-heavy or two text-heavy sections adjacent.

2. **HEIGHT VARIATION**: Hero 600-720px, spread 400-500px content area, pullquote 200-300px (a breath), photo break 400-500px, footer minimal. NEVER make all sections the same height.

3. **WIDTH VARIATION**: Alternate full-bleed (no padding, coverImage fills edge to edge) and contained (padding 64-120px horizontal, text has margins). At least one full-bleed section.

4. **BACKGROUND ALTERNATION**: At most 2-3 bg colors. Light → dark → light creates rhythm. Group 2-3 sections on same bg, then switch. Pullquote or subscribe is a good place to shift.

5. **CTA TREATMENT**: Editorial CTAs are quiet. One line + one understated button. NEVER full-width colored CTA block. NEVER "Start Free Trial" language. Use: "Subscribe →", "Read the issue", "Join the list".

6. **THE PAGE IS ONE ARTIFACT**, not independent blocks. Magazine spread that scrolls. Narrative momentum.

SECTION COUNT: 5-7 sections. Fewer, larger, more impactful.
COPY TONE: Magazine editor, not SaaS copywriter. Confident, understated, evocative.
`;

    case "minimal-tech":
      return `
## SECTION GRAMMAR — MINIMAL TECH

USE these patterns:
- Clean hero with product screenshot or single illustration (use coverImage or child image)
- Single-feature deep dives: one feature per section, large image + minimal text in asymmetric grid
- Dark mode sections with monospace or geometric type
- Sparse sections with generous negative space

DO NOT USE:
- Busy feature grids with 6+ items
- Testimonial carousels
- Logo bars
- Pricing tables with 3+ tiers

SECTION COUNT: 3-5 focused sections. Less is more.
`;

    case "creative-portfolio":
      return `
## SECTION GRAMMAR — CREATIVE PORTFOLIO

USE these patterns:
- Full-bleed project showcases (frame with coverImage, overlaid title text)
- Asymmetric grid layouts ("3fr 2fr" or "2fr 1fr") for image + text pairs
- Statement typography (fontSize 60-80, light weight, tight letterSpacing)
- Personal hero (name, role, one strong image)

DO NOT USE:
- Uniform card grids
- Corporate proof sections
- Pricing or feature comparison tables
- Generic SaaS CTAs

SECTION COUNT: 4-6 sections with strong visual personality.
`;

    case "culture-brand":
      return `
## SECTION GRAMMAR — CULTURE BRAND

USE these patterns:
- Warm, photography-led hero (lifestyle/community coverImage)
- Story-driven sections (narrative flow)
- Community/people sections with real photography (image nodes)
- Rounded borders, warm earthy backgrounds

DO NOT USE:
- Clinical product screenshots
- Dense feature grids
- Technical/developer sections
- Dark mode or monochrome

SECTION COUNT: 5-7 sections with warm, human pacing.
`;

    case "experimental":
      return `
## SECTION GRAMMAR — EXPERIMENTAL

USE these patterns:
- Rule-breaking layouts (overlapping via position: absolute, unusual grid proportions)
- Extreme type scale (fontSize 80+ alongside fontSize 11)
- Bold color blocking (full-section accent backgrounds)
- Unconventional nav placement

DO NOT USE:
- Safe, centered, symmetric layouts
- Standard section ordering
- Conservative type sizes
- Muted corporate palettes

SECTION COUNT: 3-6 sections. Break expectations.
`;

    default: // premium-saas
      return `
## SECTION GRAMMAR — PRODUCT / SAAS

Standard product landing page patterns are appropriate:
- Hero with headline, subtext, CTA buttons
- Feature highlights (grids of 2-3 cards, or individual feature sections)
- Social proof (testimonials in a grid, logo row)
- Pricing (if relevant)
- Final CTA
- Footer

SECTION COUNT: 5-8 sections. Structured and scannable.

## PRODUCT UI PRIMITIVES (Geist / shadcn-like)

Use these recipes for buttons, badges, cards, fields, and dividers so output matches the Studio OS primitive library (same hex and radii).

**Token roles:** accent ${PRIM.accent}, accentLight ${PRIM.accentLight}, text ${PRIM.text}, muted ${PRIM.muted}, border ${PRIM.border}, surface ${PRIM.surface}, canvas ${PRIM.canvas}, destructive ${PRIM.destructive}, destructiveSurface ${PRIM.destructiveSurface}.

**Primary button** (type "button"): background ${PRIM.accent}, foreground #FFFFFF, borderRadius 4, padding ~10px 20px vertical/horizontal, fontSize 14, fontWeight 600. Put the label in content.text.

**Outline button**: background transparent, borderWidth 1, borderColor ${PRIM.accent}, foreground ${PRIM.accent}, borderRadius 4, same padding/font as primary.

**Ghost button**: background transparent, no border, foreground ${PRIM.muted}, fontSize 14, fontWeight 500, padding ~10px 12px.

**Destructive button**: background ${PRIM.destructiveSurface}, foreground ${PRIM.destructive}, borderColor ${PRIM.destructive}, borderWidth 1, borderRadius 4, fontSize 14, fontWeight 600.

**Secondary button** (type "button"): background ${PRIM.borderSubtle}, foreground ${PRIM.text}, borderWidth 1, borderColor ${PRIM.border}, borderRadius 4, padding ~10px 20px, fontSize 14, fontWeight 600. Use for the less prominent action next to primary.

**Link CTA** (type "text", not button): fontSize 14, fontWeight 500, foreground = accent role, textDecoration "underline". For in-flow actions ("Learn more →", "View docs") beside or below button rows.

**Icon + label row**: horizontal **frame** (flexDirection row, alignItems center, gap ~10). Child 1: small **frame** ~22×22px, borderRadius 4, background = pale accent tint (${PRIM.accentLight}-like). Child 2: **text** label fontSize 14, fontWeight 500, foreground ${PRIM.text}. No SVG — the square is an icon placeholder.

**Badge**: small hug-width frame, display flex center, padding ~4px 10px, background ${PRIM.accentLight}, borderRadius 999, child text fontSize 12, fontWeight 600, foreground ${PRIM.accent}.

**Card**: frame with background ${PRIM.surface}, borderWidth 1, borderColor ${PRIM.border}, borderRadius 6, padding ~20px; children = title (text, fontSize 15, fontWeight 600) + body (text, fontSize 14, foreground ${PRIM.muted}).

**Input row**: column frame gap ~8px; label text fontSize 12, foreground ${PRIM.muted}; field frame height ~40, width fill, background ${PRIM.surface}, borderWidth 1, borderColor ${PRIM.border}, borderRadius 2, horizontal padding ~12px, placeholder text inside (visual only).

**Separator**: type "divider", width fill, height 1, borderWidth 1, borderColor ${PRIM.border}.

## SAAS COMPOSITION RECIPES

Build each major block as a **section frame** (direct child of the page root). Inside sections, **compose** from the primitives above — reuse the same radii, token hex values, and button variants. Prefer these named compositions:

1. **Top nav** — One row: logo **text** (fontSize 15, fontWeight 600, foreground ${PRIM.text}) + horizontal **frame** (display flex, flexDirection row, gap 24–32, alignItems center) with nav links (**text**, fontSize 14, foreground ${PRIM.muted}) + trailing **ghost** "Log in" + **primary** CTA.
2. **Hero** — Column (**flexDirection** column, **alignItems** center, gap 16–24, padding vertical 72–120, background often ${PRIM.canvas}). Optional **badge** row at top. **Headline** (**text**, fontSize 48–56, fontWeight 600, textAlign center). **Subtext** (fontSize 16–18, foreground ${PRIM.muted}, maxWidth ~560, textAlign center). **CTA row** (**frame**: flex row, gap 12, justifyContent center): **primary** + **outline** OR **primary** + **secondary** button. Optional **link CTA** **text** node below for tertiary action.
3. **Logo strip** — Short section: centered kicker (**text**, fontSize 11, letterSpacing, uppercase, foreground ${PRIM.muted}) + **frame** flex row, flexWrap wrap, justifyContent center, gap 32–48 with 4–6 **text** "client name" placeholders (fontSize 13, foreground ${PRIM.muted}).
4. **Features 3-up** — Section header (**text** title + optional **text** subtitle in ${PRIM.muted}) + **grid** **frame** (display grid, gridTemplate **repeat(3, 1fr)**, gap 24). Each column is one **Card** primitive (surface ${PRIM.surface}, border, borderRadius 6, padding ~20px): optional **icon + label row** at top of card, then **text** title (fontSize 15, fontWeight 600) + **text** body (fontSize 14, foreground ${PRIM.muted}).
5. **Testimonials 2–3** — Same grid pattern with **repeat(2, 1fr)** or **repeat(3, 1fr)**. Each cell: **Card** with quote **text** (fontSize 15–16, lineHeight 1.5) + name **text** (fontSize 13, fontWeight 600) + role **text** (fontSize 12, foreground ${PRIM.muted}).
6. **Pricing tiers** — Grid **repeat(3, 1fr)** or **repeat(2, 1fr)** when only two plans: each cell is a **Card** containing tier name **text**, price **text** (larger, fontWeight 600), 3–5 bullet lines as **text** in ${PRIM.muted}, and one **primary** or **outline** button at the bottom inside the card.
7. **Closing CTA band** — Section **frame** with background ${PRIM.accentLight} or ${PRIM.canvas}: centered column, strong **text** headline + single **primary** button.
8. **Footer** — **frame** with padding; **text** copyright (fontSize 12, foreground ${PRIM.muted}) + optional row of link **text** or **ghost** buttons. Optional **divider** along the top edge of the section.

**Minimal fragment — nav + hero** (IDs are illustrative; always generate fresh unique ids for real output):

[{"id":"sec-nav","type":"frame","name":"Nav","style":{"width":"fill","display":"flex","flexDirection":"row","justifyContent":"space-between","alignItems":"center","padding":{"top":16,"right":48,"bottom":16,"left":48},"background":"${PRIM.surface}"},"children":[{"id":"nav-logo","type":"text","name":"Logo","style":{"fontSize":15,"fontWeight":600,"foreground":"${PRIM.text}"},"content":{"text":"Acme"}},{"id":"nav-actions","type":"frame","name":"Actions","style":{"display":"flex","flexDirection":"row","alignItems":"center","gap":24},"children":[{"id":"nav-p","type":"text","name":"Link","style":{"fontSize":14,"foreground":"${PRIM.muted}"},"content":{"text":"Pricing"}},{"id":"nav-b1","type":"button","name":"Login","style":{"background":"transparent","foreground":"${PRIM.muted}","borderWidth":0,"padding":{"top":10,"right":12,"bottom":10,"left":12},"borderRadius":4,"fontSize":14,"fontWeight":500},"content":{"text":"Log in"}},{"id":"nav-b2","type":"button","name":"CTA","style":{"background":"${PRIM.accent}","foreground":"#FFFFFF","padding":{"top":10,"right":20,"bottom":10,"left":20},"borderRadius":4,"fontSize":14,"fontWeight":600,"borderWidth":0},"content":{"text":"Start"}}]}]},{"id":"sec-hero","type":"frame","name":"Hero","style":{"width":"fill","display":"flex","flexDirection":"column","alignItems":"center","gap":20,"padding":{"top":88,"right":48,"bottom":88,"left":48},"background":"${PRIM.canvas}"},"children":[{"id":"h1","type":"text","name":"Headline","style":{"fontSize":52,"fontWeight":600,"textAlign":"center","maxWidth":720},"content":{"text":"Headline"}},{"id":"h2","type":"text","name":"Sub","style":{"fontSize":17,"foreground":"${PRIM.muted}","textAlign":"center","maxWidth":560},"content":{"text":"Supporting line."}},{"id":"hero-cta","type":"frame","name":"CTAs","style":{"display":"flex","flexDirection":"row","gap":12,"justifyContent":"center"},"children":[{"id":"hb1","type":"button","name":"Primary","style":{"background":"${PRIM.accent}","foreground":"#FFFFFF","padding":{"top":10,"right":20,"bottom":10,"left":20},"borderRadius":4,"fontSize":14,"fontWeight":600,"borderWidth":0},"content":{"text":"Primary"}},{"id":"hb2","type":"button","name":"Secondary","style":{"background":"transparent","foreground":"${PRIM.accent}","borderColor":"${PRIM.accent}","borderWidth":1,"padding":{"top":10,"right":20,"bottom":10,"left":20},"borderRadius":4,"fontSize":14,"fontWeight":600},"content":{"text":"Secondary"}}]}]}]

**Rules:** Adapt copy, counts, and spacing to the brief. Do **not** swap in different border radii or off-palette neutrals for elements that map to a primitive recipe. Typical section order: Nav → Hero → Logo strip (optional) → Features → Social proof → Pricing (optional) → Closing CTA → Footer — reorder if the brief requires it.
`;
  }
}

// ─── Structural guards for variant transformation ───────────────────────────

function getDesignArchetypeStructuralGuard(archetype: string | undefined): string {
  switch (archetype) {
    case "editorial-brand":
      return "\nIMPORTANT: This is an editorial design. Do NOT restructure into SaaS patterns (uniform card grids, stats rows, pricing tables). Keep editorial composition — coverImage heroes, asymmetric spreads, pullquotes, minimal section count (4-7).";
    case "minimal-tech":
      return "\nIMPORTANT: Minimal tech design. Do NOT add busy feature grids, testimonial carousels, or logo bars. Keep sparse and focused (3-5 sections).";
    case "creative-portfolio":
      return "\nIMPORTANT: Creative portfolio. Do NOT add uniform card grids, corporate proof sections, or SaaS CTAs. Keep visual personality and asymmetric layouts.";
    case "culture-brand":
      return "\nIMPORTANT: Culture brand. Do NOT add clinical product sections or dense feature grids. Keep warm, story-driven composition.";
    case "experimental":
      return "\nIMPORTANT: Experimental design. Do NOT normalize into safe centered layouts or standard SaaS ordering.";
    default:
      return "\nIMPORTANT: Product / SaaS page. Use PRODUCT UI PRIMITIVES for buttons, badges, cards, fields, and dividers. Compose major sections using SAAS COMPOSITION RECIPES (nav, hero, grids of cards, pricing cards, footer). Do not invent alternate radii or arbitrary palette colors for those elements.";
  }
}

// ─── Main Generation Prompt ─────────────────────────────────────────────────

export function buildDesignTreePrompt(
  tokens: DesignSystemTokens,
  prompt: string,
  siteName: string,
  options?: {
    variantMode?: VariantMode;
    tasteProfile?: TasteProfile | null;
    fidelityMode?: FidelityMode;
  }
): string {
  const tasteProfile = options?.tasteProfile;
  const compiledDirectives = compileTasteToDirectives(
    tasteProfile,
    options?.fidelityMode ?? "balanced"
  );
  const tasteSection = directivesToPromptText(compiledDirectives);
  const archetypeGrammar = getDesignArchetypeGrammar(tasteProfile?.archetypeMatch);

  const banDescriptions = getArchetypeBanDescriptions(tasteProfile?.archetypeMatch);
  const banSection =
    banDescriptions.length > 0
      ? `\n## BANNED STRUCTURAL PATTERNS\nDo NOT produce these patterns:\n${banDescriptions.map((b) => `- ${b}`).join("\n")}\n`
      : "";

  const accentMapping4A = usesPremiumSaasProductGrammar(tasteProfile?.archetypeMatch)
    ? `\n${buildProductPrimitiveAccentMapping4A(tokens)}\n`
    : "";

  return `You are a senior editorial designer composing a landing page as a DesignNode JSON tree.

## Mental Model
You are placing rectangles on a page. Every element is one of 5 types:
- **frame** — a container rectangle. Can have a background color, a cover photo (coverImage), and children arranged via flexbox or CSS grid.
- **text** — displays text. Styled with font properties.
- **image** — displays a photo. Use "photo:description" for src.
- **button** — a clickable rectangle with text.
- **divider** — a horizontal line.

Frames are the building blocks. The page is a root frame whose children are section frames.

## Creative Brief
"${prompt}"

Site name: ${siteName}
${archetypeGrammar}${banSection}

${tasteSection}${accentMapping4A}
## DesignNode Schema

\`\`\`
{
  "id": string,           // unique, e.g. "hero-a1b2"
  "type": "frame" | "text" | "image" | "button" | "divider",
  "name": string,         // human-readable, e.g. "Hero", "Headline"
  "content": {
    "text": string,       // text content (text + button)
    "src": "photo:...",   // image URL — ALWAYS "photo:specific description" (image nodes)
    "alt": string,        // alt text (image nodes)
    "href": string,       // link URL (button nodes)
    "label": string       // accessible label
  },
  "style": {
    // POSITIONING — omit for flow layout (99% of nodes)
    "position": "absolute",   // only for overlapping/breakout elements
    "width": number | "hug" | "fill",
    "height": number | "hug" | "fill",
    "overflow": "hidden",

    // LAYOUT — frame nodes only
    "display": "flex" | "grid",
    "flexDirection": "row" | "column",
    "gap": number,
    "alignItems": "flex-start" | "center" | "flex-end" | "stretch",
    "justifyContent": "flex-start" | "center" | "flex-end" | "space-between",
    "gridTemplate": string,   // ONLY: "repeat(2, 1fr)", "repeat(3, 1fr)", "repeat(4, 1fr)", "2fr 1fr", "1fr 2fr", "3fr 2fr", "2fr 1fr 1fr", "1fr 2fr 1fr"
    "flexGrow": number,

    // SPACING
    "padding": { "top": N, "right": N, "bottom": N, "left": N },

    // TYPOGRAPHY — text + button
    "fontFamily": string,
    "fontSize": number,
    "fontWeight": number,
    "lineHeight": number,
    "letterSpacing": number,  // in em (0.12 = wide tracking)
    "fontStyle": "italic",
    "textAlign": "left" | "center" | "right",
    "maxWidth": number | string,

    // VISUAL
    "background": "#hex",
    "coverImage": "photo:...",   // BACKGROUND PHOTO on frames — full-bleed <img> behind children
    "coverSize": "cover" | "contain",
    "coverPosition": string,     // e.g. "center", "center 30%"
    "coverScrim": string,        // gradient overlay, e.g. "linear-gradient(to bottom, transparent, rgba(0,0,0,0.5))"
    "foreground": "#hex",        // text color
    "muted": "#hex",             // secondary text color
    "accent": "#hex",
    "borderColor": "#hex",
    "borderWidth": number,
    "borderRadius": number,
    "opacity": number,
    "effects": [                 // ordered Figma-like effects stack
      {
        "id": string,
        "type": "dropShadow" | "innerShadow",
        "enabled": boolean,
        "x": number,
        "y": number,
        "blur": number,
        "spread": number,
        "color": string
      },
      {
        "id": string,
        "type": "layerBlur" | "backgroundBlur",
        "enabled": boolean,
        "radius": number
      }
    ],
    "objectFit": "cover" | "contain" | "fill"   // image nodes
  },
  "children": DesignNode[]
}
\`\`\`

## Sizing Model

Every node has a sizing mode for each axis:
- **Fixed** (number): explicit pixel size. Use for heroes (height: 600-720), images, and elements that need exact dimensions.
- **Fill** ("fill"): stretch to fill parent. Use for section frames (width), containers that should span their parent, and dividers.
- **Hug** ("hug"): shrink to fit content. Use for text nodes, buttons, and containers that should wrap their children tightly.

When generating new trees, use explicit sizing modes:
- Frame width: "fill". Frame height: "hug" (or fixed for hero/visual sections).
- Text: "hug" both axes.
- Image: fixed both axes (always provide explicit width and height numbers).
- Button: "hug" both axes.
- Divider: "fill" width, omit height.

ONLY use fixed pixel values when the design demands exact dimensions.
Prefer "fill" for containers and "hug" for content nodes.
Do NOT set width/height to fixed numbers on section-level frames unless creating a specific visual height (e.g. hero: 680).

## Composition Vocabulary

**LAYERING** — Frame with coverImage + child text = photo + overlaid headline. Add coverScrim for text readability over light photos. Set foreground: "#FFFFFF" on the frame.

**ASYMMETRY** — Frame with display: "grid", gridTemplate: "3fr 2fr" = asymmetric 2-column spread. Use for text + image editorial pairs.

**PACING** — Vary section heights. Hero: 600-720px. Photo break: 400-500px. Pullquote: 200-300px. Footer: minimal. Never uniform heights.

**CONTRAST** — Alternate light/dark backgrounds. Dark pullquote between light sections = designed moment. Max 2-3 bg colors.

**FULL-BLEED** — Frame with coverImage and zero padding = edge-to-edge photo. Frame with 64-120px padding = contained text. Alternate.

## Design Tokens
- background: ${tokens.colors.background}
- surface: ${tokens.colors.surface}
- text: ${tokens.colors.text}
- textMuted: ${tokens.colors.textMuted}
- accent: ${tokens.colors.accent}
- primary: ${tokens.colors.primary}
- secondary: ${tokens.colors.secondary}
- border: ${tokens.colors.border}
- headingFont: ${tokens.typography.fontFamily}
- shadow.sm: ${tokens.shadows.sm}
- shadow.md: ${tokens.shadows.md}

## Rules

1. Root node MUST be type "frame" with section-level frame children
2. Write COMPELLING, ORIGINAL copy — not placeholders. Write like the brand's copywriter.
3. Kickers, subtitles, bylines, prices, badges are CHILD TEXT NODES with semantic names — NOT content fields. Content only has: text, src, alt, href, label.
4. Use "photo:specific description" for ALL images. Descriptive: "photo:fashion model in dramatic side lighting, editorial portrait" not "photo:image".
5. coverImage on frames = background photos. content.src on image nodes = inline photos.
6. Every ID unique — format "type-xxxx" (4+ random lowercase chars)
7. Keep JSON compact. Omit undefined/null fields. Omit display/flexDirection when defaults (flex/column) work.
8. gridTemplate MUST be one of the allowed patterns (see schema).
9. Choose 4-7 sections based on the brief. The page should feel like ONE DESIGNED ARTIFACT.
10. coverScrim is OPTIONAL. Only add it when placing light text over a light photo. Omit for dark photos or when no text overlays the image.
11. Prefer effects[] over legacy shadow/blur fields. Keep effects compact and purposeful (0-2 entries for most nodes).

## Output
Return ONLY valid JSON. No markdown fences. No explanation. Just the root DesignNode object starting with {.`;
}

// ─── Variant Transformation Prompts ─────────────────────────────────────────

export function buildDesignPushedVariantPrompt(
  baseTree: DesignNode,
  tasteProfile: TasteProfile
): string {
  const treeJson = JSON.stringify(baseTree);
  const structuralGuard = getDesignArchetypeStructuralGuard(tasteProfile?.archetypeMatch);
  const banDescriptions = getArchetypeBanDescriptions(tasteProfile?.archetypeMatch);
  const banGuard =
    banDescriptions.length > 0
      ? `\nBANNED PATTERNS: Do NOT introduce ${banDescriptions.join("; ")}.`
      : "";

  return `You are transforming a DesignNode website into a bolder interpretation of the same taste.

## Base Design (DesignNode JSON)
${treeJson}

## Taste Profile
Archetype: ${tasteProfile.archetypeMatch}
Mood: ${tasteProfile.adjectives?.join(", ")}
Palette: ${[tasteProfile.colorBehavior.suggestedColors.background, tasteProfile.colorBehavior.suggestedColors.accent, tasteProfile.colorBehavior.suggestedColors.text].filter(Boolean).join(", ")}
Fonts: ${tasteProfile.typographyTraits.recommendedPairings.join(", ")}
${structuralGuard}${banGuard}

## Transformation
Push this design bolder while keeping the same structure:

1. **Palette temperature:** Shift warmer or cooler. If light, try a dark hero frame background. If warm, push to richer tones.
2. **Spacing:** Tighten section padding ~20%. Reduce gaps ~15%. More editorial density.
3. **CTA prominence:** Larger font, stronger contrast, bolder placement.
4. **Typography:** Push heading weights bolder, increase scale drama.
5. **Section backgrounds:** Add contrast between alternating sections.

## Rules
- Keep SAME section order and count
- Keep SAME text content — only change style properties
- Keep colors within the taste palette
- Keep font families
- Root is type "frame", children are section frames
- Every ID unique ("type-xxxx")

Return ONLY valid JSON. No markdown. Just the root object starting with {.`;
}

export function buildDesignRestructuredVariantPrompt(
  baseTree: DesignNode,
  tasteProfile: TasteProfile
): string {
  const treeJson = JSON.stringify(baseTree);
  const structuralGuard = getDesignArchetypeStructuralGuard(tasteProfile?.archetypeMatch);
  const banDescriptions = getArchetypeBanDescriptions(tasteProfile?.archetypeMatch);
  const banGuard =
    banDescriptions.length > 0
      ? `\nBANNED PATTERNS: Do NOT introduce ${banDescriptions.join("; ")}.`
      : "";

  return `You are restructuring a DesignNode website — same taste DNA, different layout.

## Base Design (DesignNode JSON)
${treeJson}

## Taste Profile
Archetype: ${tasteProfile.archetypeMatch}
Mood: ${tasteProfile.adjectives?.join(", ")}
Palette: ${[tasteProfile.colorBehavior.suggestedColors.background, tasteProfile.colorBehavior.suggestedColors.accent, tasteProfile.colorBehavior.suggestedColors.text].filter(Boolean).join(", ")}
Fonts: ${tasteProfile.typographyTraits.recommendedPairings.join(", ")}
${structuralGuard}${banGuard}

## Restructuring
Keep the palette and fonts but REARRANGE the layout:

1. **Hero:** If centered, make it split (text left, image right via "1fr 2fr" grid). If split, make full-bleed centered. Change the structural approach.
2. **Grids:** If 3-column, try 2-column with larger items. If uniform, try asymmetric ("2fr 1fr"). Change grid structure.
3. **Section order:** Move editorial spreads or pullquotes earlier if currently later. Different narrative flow.
4. **Spacing contrast:** If evenly spaced, create more contrast — some sections compact, some generous.
5. **Asymmetry:** If centered/symmetric, push left-aligned and asymmetric. If already asymmetric, try centered elegance.

## Rules
- Keep SAME palette colors
- Keep SAME font families
- Keep SAME section types (don't add pricing if not there)
- You CAN change: section order, grid templates, alignment, padding, gap, coverImage placement
- Root is type "frame", children are section frames
- Every ID unique ("type-xxxx")

Return ONLY valid JSON. No markdown. Just the root object starting with {.`;
}
