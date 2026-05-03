// lib/canvas/design-tree-prompt.ts
// AI prompt for generating DesignNode JSON trees.
// Replaces buildPageTreePrompt() — teaches the model the 5-type system,
// composition vocabulary, and archetype-specific grammars.

import type { DesignSystemTokens } from "./generate-system";
import type { TasteProfile } from "@/types/taste-profile";
import type { IntentProfile } from "@/types/intent-profile";
import type { DesignNode } from "./design-node";
import {
  compileTasteToDirectives,
  directivesToPromptText,
  type FidelityMode,
} from "./directive-compiler";
import { getArchetypeBanDescriptions } from "./design-archetype-bans";
import { PRODUCT_PRIMITIVE_STYLE_TOKENS as PRIM } from "./design-component-library";
import { deriveDesignKnobs, serializeDesignKnobsForPrompt, type DesignKnobVector } from "./design-knobs";

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

You are generating a CREATIVE PORTFOLIO design — a designer's site where the site IS the work. NOT a SaaS landing page.

DO NOT USE these SaaS patterns:
- 3-column uniform card grids (icon + title + description)
- Stats/metrics rows with big numbers
- Logo bars / social proof strips
- Pricing tables or tier comparisons
- "How it works" numbered steps
- FAQ accordions
- Feature comparison sections
- Testimonial cards with star ratings
- Big colored CTA buttons

USE INSTEAD: Statement typography hero, full-bleed project showcases, asymmetric grid layouts, text-link CTAs, vertical client lists, personal bio sections, dramatic whitespace.

## PAGE-LEVEL COMPOSITION RULES — CREATIVE PORTFOLIO

1. **WHITESPACE IS THE DESIGN**: Generous padding (120–200px vertical on major sections). Empty space is intentional, not missing content. Dramatic whitespace creates the premium, confident feel.

2. **ASYMMETRIC GRIDS**: Never uniform columns. Use "3fr 2fr", "2fr 1fr", or custom proportions. The asymmetry communicates design sensibility — this person understands composition.

3. **TYPOGRAPHY SCALE JUMPS**: Display headings at 64–140px (clamp). Body at 15–17px. The contrast between giant type and small body creates hierarchy through scale, not decoration.

4. **PROJECT SHOWCASES, NOT CARDS**: Work shown at large scale — full-bleed or near-full-bleed. Each project gets visual room. Never a thumbnail grid. Each project is a frame with coverImage, overlaid title optional.

5. **LIGHT MODE, NEUTRAL PALETTE**: Off-white backgrounds (#FAFAF8, #F5F5F0). Near-black text (#1A1A1A). Single muted accent for links/interactions only. Color restraint signals confidence.

6. **UNDERSTATED NAVIGATION**: Hidden hamburger (creative statement) or minimal top bar (2–3 links max). Navigation is designed, not functional default. The way you open the menu should feel authored.

7. **TEXT-LINK CTAs**: No big colored buttons. CTAs are underlined text links with arrows ("View project →", "Get in touch →"). The work sells itself — the CTA is quiet.

8. **PERSONAL VOICE**: Copy is first-person, brief, specific. "I design identities for cultural institutions" not "We help brands tell their story." The bio section is a statement, not a resume.

SECTION COUNT: 4–6 sections. Each one breathes.
COPY TONE: Designer speaking directly — confident, specific, no corporate hedging.

## CREATIVE-PORTFOLIO COMPOSITION RECIPES

Build each major block as a **section frame** (direct child of the page root). Compose from these named recipes:

1. **Minimal nav** — Frame row, justify space-between, padding 20–24px horizontal, 16–20px vertical. Logo: text node, 14–16px, fontWeight 500–600, no uppercase. Right side: 2–3 text links (14px, foreground muted at 50–60% opacity, gap 24–32px) OR single hamburger trigger (text "Menu" 14px or icon frame 24x24). No background, no border. Feels invisible.

2. **Statement hero** — Full-width frame, padding 140–200px vertical, 48–80px horizontal. Single display text node: fontSize clamp(64px, 10vw, 140px), fontWeight 300–500, lineHeight 1.0–1.1, letterSpacing -0.02 to -0.04. Left-aligned (never centered for portfolio). One line or two max. Below (40–48px gap): brief descriptor text, 16–18px, foreground at 50% opacity, maxWidth 480px. No buttons in hero. Maybe a subtle scroll indicator (text "Scroll" 11px, opacity 0.3, absolute bottom).

3. **Project showcase — full bleed** — Frame with coverImage (project photography or mockup), height 500–700px, coverSize cover. Optional overlaid title: text node at bottom-left, 20–28px, fontWeight 500, foreground #FFFFFF (if dark image) with subtle text-shadow or scrim. Optional category text above title: 11px uppercase tracked, opacity 0.5. No borders, no radius, no cards.

4. **Project showcase — asymmetric** — Frame with display grid, gridTemplate "3fr 2fr" or "2fr 1fr". Larger side: project image (image node, objectFit cover, height 400–560px). Smaller side: column frame with project title (24–36px, fontWeight 500), year/category (12px, foreground muted), brief description (15px, lineHeight 1.6, foreground at 60% opacity), and text-link CTA ("View project →" 14px, underline). Gap 48–80px. Asymmetry alternates: odd rows image-left, even rows image-right.

5. **About / bio section** — Frame column, padding 100–160px vertical, max-width 720px (narrow — reads like a letter, not a brochure). Kicker: 11px uppercase tracked, foreground muted. Headline: 32–48px, fontWeight 400, lineHeight 1.3. Body: 16–17px, lineHeight 1.7, foreground at 70% opacity. 3–5 sentences max. First person. Specific. Optional: text-link "Get in touch →" below at same body size.

6. **Selected clients / collaborators** — Frame column, padding 80–120px vertical. Kicker: 11px uppercase tracked, foreground muted ("Selected Clients" or "Collaborations"). Below: column of text nodes, each 20–24px, fontWeight 400, with subtle top border (1px, 10% opacity) and padding 16–20px vertical. Company names as a vertical list, not a logo grid. Understated, not boastful.

7. **Contact / closing** — Frame column, centered or left-aligned, padding 120–200px vertical. One text node: 32–56px, fontWeight 300–400, lineHeight 1.3 ("Let's work together" or specific invite). Below: email as text-link (16px, underline, accent color). Maybe location text (14px, muted). No contact form. No "Send Message" button. Just the email — designers know what to do with it.

8. **Minimal footer** — Frame row or column, padding 20–24px. Copyright (12px, opacity 0.3) + 2–3 social/contact links as text (12px, opacity 0.3). Optional subtle top border. Almost invisible — the content above is the ending, not the footer.

## COMPLETE CREATIVE-PORTFOLIO COMPOSITION EXAMPLE

This is a complete portfolio homepage as a DesignNode tree. Study the composition — how whitespace creates confidence, how asymmetric grids show design sensibility, how typography scale jumps create hierarchy, how text-links replace buttons.

[{"id":"page-root","type":"frame","name":"Portfolio Homepage","style":{"width":"fill","display":"flex","flexDirection":"column","background":"#FAFAF8","foreground":"#1A1A1A"},"children":[{"id":"nav-01","type":"frame","name":"Navigation","style":{"width":"fill","display":"flex","flexDirection":"row","justifyContent":"space-between","alignItems":"center","padding":{"top":20,"right":48,"bottom":20,"left":48}},"children":[{"id":"nav-name","type":"text","name":"Name","style":{"fontSize":15,"fontWeight":500},"content":{"text":"Elena Morisot"}},{"id":"nav-links","type":"frame","name":"Links","style":{"display":"flex","flexDirection":"row","gap":28},"children":[{"id":"nav-l1","type":"text","name":"Link","style":{"fontSize":14,"foreground":"#999999"},"content":{"text":"Work"}},{"id":"nav-l2","type":"text","name":"Link","style":{"fontSize":14,"foreground":"#999999"},"content":{"text":"About"}},{"id":"nav-l3","type":"text","name":"Link","style":{"fontSize":14,"foreground":"#999999"},"content":{"text":"Contact"}}]}]},{"id":"hero-01","type":"frame","name":"Hero","style":{"width":"fill","display":"flex","flexDirection":"column","padding":{"top":160,"right":48,"bottom":160,"left":48}},"children":[{"id":"hero-title","type":"text","name":"Title","style":{"fontSize":96,"fontWeight":300,"lineHeight":1.05,"letterSpacing":-0.03,"maxWidth":"85%"},"content":{"text":"Designing identities\\nfor cultural institutions"}},{"id":"hero-desc","type":"text","name":"Description","style":{"fontSize":17,"foreground":"#888888","maxWidth":460,"lineHeight":1.6,"marginTop":40},"content":{"text":"Art director and brand designer based in Paris. Currently at Studio Fnt, previously Pentagram."}}]},{"id":"project-01","type":"frame","name":"Project 1","style":{"width":"fill","height":600,"coverImage":"photo:museum exhibition space, minimal white walls, large scale typography on wall, visitors in background, architectural photography","coverSize":"cover","coverPosition":"center","display":"flex","flexDirection":"column","justifyContent":"flex-end","padding":{"top":0,"right":48,"bottom":40,"left":48}},"children":[{"id":"p1-cat","type":"text","name":"Category","style":{"fontSize":11,"letterSpacing":0.12,"foreground":"rgba(255,255,255,0.5)"},"content":{"text":"IDENTITY"}},{"id":"p1-title","type":"text","name":"Title","style":{"fontSize":24,"fontWeight":500,"foreground":"#FFFFFF"},"content":{"text":"Fondation Maeght — Visual System"}}]},{"id":"project-02","type":"frame","name":"Project 2","style":{"width":"fill","display":"grid","gridTemplate":"3fr 2fr","gap":48,"padding":{"top":100,"right":48,"bottom":100,"left":48},"alignItems":"center"},"children":[{"id":"p2-img","type":"image","name":"Photo","style":{"width":"fill","height":480,"objectFit":"cover"},"content":{"src":"photo:book cover design mockup, hardcover on marble surface, editorial typography, overhead shot, natural light","alt":"Book design"}},{"id":"p2-text","type":"frame","name":"Text","style":{"display":"flex","flexDirection":"column","gap":12},"children":[{"id":"p2-cat","type":"text","name":"Category","style":{"fontSize":11,"letterSpacing":0.12,"foreground":"#999999"},"content":{"text":"EDITORIAL"}},{"id":"p2-title","type":"text","name":"Title","style":{"fontSize":28,"fontWeight":500,"lineHeight":1.2},"content":{"text":"Type Specimens\\nfor Colophon Foundry"}},{"id":"p2-desc","type":"text","name":"Description","style":{"fontSize":15,"lineHeight":1.6,"foreground":"#888888","maxWidth":360},"content":{"text":"A series of twelve type specimens exploring the relationship between letterform and material surface."}},{"id":"p2-link","type":"text","name":"CTA","style":{"fontSize":14,"fontWeight":500,"foreground":"#1A1A1A","textDecoration":"underline","marginTop":8},"content":{"text":"View project →"}}]}]},{"id":"project-03","type":"frame","name":"Project 3","style":{"width":"fill","display":"grid","gridTemplate":"2fr 3fr","gap":48,"padding":{"top":100,"right":48,"bottom":100,"left":48},"alignItems":"center"},"children":[{"id":"p3-text","type":"frame","name":"Text","style":{"display":"flex","flexDirection":"column","gap":12},"children":[{"id":"p3-cat","type":"text","name":"Category","style":{"fontSize":11,"letterSpacing":0.12,"foreground":"#999999"},"content":{"text":"BRANDING"}},{"id":"p3-title","type":"text","name":"Title","style":{"fontSize":28,"fontWeight":500,"lineHeight":1.2},"content":{"text":"Galerie Perrotin\\nSeasonal Campaign"}},{"id":"p3-desc","type":"text","name":"Description","style":{"fontSize":15,"lineHeight":1.6,"foreground":"#888888","maxWidth":360},"content":{"text":"Seasonal identity system for one of Paris's leading contemporary art galleries. Photography-led, typographically restrained."}},{"id":"p3-link","type":"text","name":"CTA","style":{"fontSize":14,"fontWeight":500,"foreground":"#1A1A1A","textDecoration":"underline","marginTop":8},"content":{"text":"View project →"}}]},{"id":"p3-img","type":"image","name":"Photo","style":{"width":"fill","height":480,"objectFit":"cover"},"content":{"src":"photo:gallery poster on concrete wall, bold sans-serif typography, torn edges, street photography style","alt":"Gallery campaign"}}]},{"id":"about-01","type":"frame","name":"About","style":{"width":"fill","display":"flex","flexDirection":"column","padding":{"top":120,"right":48,"bottom":120,"left":48},"maxWidth":720},"children":[{"id":"about-kicker","type":"text","name":"Kicker","style":{"fontSize":11,"letterSpacing":0.12,"foreground":"#999999"},"content":{"text":"ABOUT"}},{"id":"about-title","type":"text","name":"Title","style":{"fontSize":36,"fontWeight":400,"lineHeight":1.3,"marginTop":16},"content":{"text":"I believe identity design is architecture for attention."}},{"id":"about-body","type":"text","name":"Body","style":{"fontSize":16,"lineHeight":1.7,"foreground":"#777777","marginTop":20},"content":{"text":"For the past eight years I've worked with museums, publishers, and cultural organizations to build visual systems that hold meaning over time. I care about typography, material, and the space between things."}},{"id":"about-link","type":"text","name":"CTA","style":{"fontSize":15,"fontWeight":500,"foreground":"#1A1A1A","textDecoration":"underline","marginTop":24},"content":{"text":"Get in touch →"}}]},{"id":"clients-01","type":"frame","name":"Clients","style":{"width":"fill","display":"flex","flexDirection":"column","padding":{"top":80,"right":48,"bottom":80,"left":48}},"children":[{"id":"clients-kicker","type":"text","name":"Kicker","style":{"fontSize":11,"letterSpacing":0.12,"foreground":"#999999","padding":{"top":0,"right":0,"bottom":20,"left":0}},"content":{"text":"SELECTED CLIENTS"}},{"id":"cl-0","type":"frame","name":"Client 1","style":{"display":"flex","flexDirection":"row","justifyContent":"space-between","alignItems":"baseline","padding":{"top":16,"right":0,"bottom":16,"left":0},"borderColor":"#EFEFEC","borderWidth":1},"children":[{"id":"cl-0-name","type":"text","name":"Name","style":{"fontSize":20,"fontWeight":400},"content":{"text":"Fondation Maeght"}},{"id":"cl-0-type","type":"text","name":"Type","style":{"fontSize":13,"foreground":"#999999"},"content":{"text":"Identity, Editorial"}}]},{"id":"cl-1","type":"frame","name":"Client 2","style":{"display":"flex","flexDirection":"row","justifyContent":"space-between","alignItems":"baseline","padding":{"top":16,"right":0,"bottom":16,"left":0},"borderColor":"#EFEFEC","borderWidth":1},"children":[{"id":"cl-1-name","type":"text","name":"Name","style":{"fontSize":20,"fontWeight":400},"content":{"text":"Colophon Foundry"}},{"id":"cl-1-type","type":"text","name":"Type","style":{"fontSize":13,"foreground":"#999999"},"content":{"text":"Editorial, Type Specimens"}}]},{"id":"cl-2","type":"frame","name":"Client 3","style":{"display":"flex","flexDirection":"row","justifyContent":"space-between","alignItems":"baseline","padding":{"top":16,"right":0,"bottom":16,"left":0},"borderColor":"#EFEFEC","borderWidth":1},"children":[{"id":"cl-2-name","type":"text","name":"Name","style":{"fontSize":20,"fontWeight":400},"content":{"text":"Galerie Perrotin"}},{"id":"cl-2-type","type":"text","name":"Type","style":{"fontSize":13,"foreground":"#999999"},"content":{"text":"Branding, Campaign"}}]}]},{"id":"contact-01","type":"frame","name":"Contact","style":{"width":"fill","display":"flex","flexDirection":"column","padding":{"top":140,"right":48,"bottom":140,"left":48}},"children":[{"id":"contact-title","type":"text","name":"Title","style":{"fontSize":48,"fontWeight":300,"lineHeight":1.2},"content":{"text":"Have a project in mind?"}},{"id":"contact-email","type":"text","name":"Email","style":{"fontSize":17,"fontWeight":500,"foreground":"#1A1A1A","textDecoration":"underline","marginTop":20},"content":{"text":"elena@morisot.design →"}},{"id":"contact-loc","type":"text","name":"Location","style":{"fontSize":14,"foreground":"#999999","marginTop":8},"content":{"text":"Paris, France"}}]},{"id":"footer-01","type":"frame","name":"Footer","style":{"width":"fill","display":"flex","flexDirection":"row","justifyContent":"space-between","padding":{"top":20,"right":48,"bottom":20,"left":48},"borderColor":"#EFEFEC","borderWidth":1},"children":[{"id":"f-copy","type":"text","name":"Copyright","style":{"fontSize":12,"foreground":"#BBBBBB"},"content":{"text":"© 2026 Elena Morisot"}},{"id":"f-social","type":"frame","name":"Social","style":{"display":"flex","flexDirection":"row","gap":20},"children":[{"id":"f-s1","type":"text","name":"Link","style":{"fontSize":12,"foreground":"#BBBBBB"},"content":{"text":"Instagram"}},{"id":"f-s2","type":"text","name":"Link","style":{"fontSize":12,"foreground":"#BBBBBB"},"content":{"text":"Are.na"}},{"id":"f-s3","type":"text","name":"Link","style":{"fontSize":12,"foreground":"#BBBBBB"},"content":{"text":"Read.cv"}}]}]}]}]

Adapt this composition to match the brief and taste profile:
- Replace all text with original portfolio copy — first person, specific, no hedging
- Replace all photo descriptions with the designer's actual work domain
- Adjust colors to match taste palette (keep light + neutral bias)
- Project showcases alternate: full-bleed → asymmetric left → asymmetric right
- You may add or remove one project showcase, but keep asymmetric grid rhythm
- About section is non-negotiable — every portfolio needs a voice
- Clients section: use names relevant to the brief's domain, listed vertically
- Never use card grids for projects. Each project breathes individually.
`;

    case "culture-brand":
      return `
## SECTION GRAMMAR — CULTURE BRAND

You are generating a CULTURE BRAND design — a cultural artifact, NOT a SaaS landing page.

DO NOT USE these SaaS patterns:
- 3-column uniform card grids (icon + title + description)
- Stats/metrics rows with big numbers
- Logo bars / social proof strips
- Pricing tables or tier comparisons
- "How it works" numbered steps
- FAQ accordions
- Feature comparison sections
- Testimonial cards with star ratings

USE INSTEAD: Full-bleed editorial photography, display-scale type as graphic element, transparent navigation, bold sharp CTAs, statement sections, lookbook sequences, community blocks.

## PAGE-LEVEL COMPOSITION RULES — CULTURE BRAND

1. **PHOTOGRAPHY LEADS**: Every major section anchored by editorial photography. Full-bleed or near-full-bleed. Images are lifestyle/community — never product-on-white. Use coverImage on section frames. Raw treatment, no filters.

2. **TYPOGRAPHY AS GRAPHIC ELEMENT**: Headings are display-scale (80px+), often uppercase or tracked. Typography competes with photography for attention — intentionally. This tension IS the brand feel.

3. **DARK + WARM**: Near-black backgrounds (#0F0F0F–#1A1A1A), warm-tinted neutrals for text (#E8E4DF, #D4CFC8), single pop accent for CTAs only. Never clinical white. Never blue-tinted dark.

4. **SECTION RHYTHM**: Full-bleed photo → contained text → full-bleed photo → statement. Never two contained sections adjacent. Photography creates the breathing room, not whitespace.

5. **MINIMAL NAVIGATION**: Transparent overlay or hidden hamburger. Nav does not compete with the hero. Logo + menu trigger + maybe one CTA. No mega-menus, no multi-level dropdowns.

6. **CTA TREATMENT**: Bold, high-contrast, sharp corners (0–2px radius). CTAs are confident — "Shop Now", "Enter", "See Collection". Never "Learn More" or "Get Started". Culture brands don't explain — they invite.

7. **NO SAAS PATTERNS**: No feature grids, no pricing tables, no testimonial cards, no logo bars, no stats rows, no FAQ sections. If it looks like B2B software, it's wrong.

SECTION COUNT: 5–7 sections. Fewer, larger, more impactful.
COPY TONE: Brand voice — terse, confident, culturally aware. Not marketing copy.

## CULTURE-BRAND COMPOSITION RECIPES

Build each major block as a **section frame** (direct child of the page root). Compose from these named recipes:

1. **Transparent nav** — Absolute-positioned frame over hero. Logo left (text, 14–16px, fontWeight 700, uppercase, letterSpacing 0.08–0.12). Right side: 1–2 text links (13px, foreground rgba(255,255,255,0.6)) + optional CTA button (sharp, high contrast). No background until scroll. Height 56–64px, padding horizontal 32–48px.

2. **Full-bleed photo hero** — Frame with coverImage (editorial lifestyle/fashion photography), height 680–800px, coverSize cover, coverScrim "linear-gradient(transparent 40%, rgba(0,0,0,0.6))". Display type overlaid: fontSize 72–120px (clamp), fontWeight 700–900, uppercase, letterSpacing -0.02 to 0.06, foreground #FFFFFF, positioned bottom-left (padding 48–64px) or centered. Kicker above: 11–12px uppercase tracked (0.12em) at 50% opacity. One bold CTA below headline: sharp corners, high contrast fill.

3. **Editorial photo grid** — Frame with display grid, gridTemplate "2fr 1fr" or "1fr 1fr". Two large editorial images side by side or stacked, no gap or 2–4px gap. Images use coverImage on child frames, height 400–560px. Optional overlaid text on one image (collection name, 24–36px). Raw treatment, no borders, no radius.

4. **Statement section** — Full-width frame, background dark (#0F0F0F or brand accent), padding 100–160px vertical, 48–80px horizontal. Single large text node: 36–56px, fontWeight 300–400, lineHeight 1.3–1.5, foreground near-white. The statement is brand philosophy, not product description. Max one sentence. Optional small attribution below (12px, 40% opacity).

5. **Lookbook / collection** — Frame column, gap 0. Series of 3–5 full-bleed coverImage frames, each 400–600px height. No text overlay on most — just photography. Maybe one has a small caption (12px, bottom-right, 40% opacity). This section IS the content. Let photography speak.

6. **Community / culture block** — Grid section "1fr 1fr" or "3fr 2fr". One side: editorial photo (coverImage frame, 400–500px height). Other side: column frame with kicker (11px uppercase tracked), headline (28–40px), body text (15–16px, lineHeight 1.7, foreground at 70% opacity), and optional text-link CTA ("Read the story →"). Warm, human, first-person voice.

7. **Bold CTA section** — Full-width frame, background accent or near-black (#0F0F0F), centered column. Headline 40–64px uppercase or display weight. Single button: sharp corners (0–2px), filled, high contrast (e.g., #EDEDED on #0F0F0F or inverse). Padding 100–140px vertical. Nothing else — no subtext, no secondary action. Confident.

8. **Minimal footer** — Frame row, justify space-between, padding 24–32px horizontal, 20–24px vertical. Left: copyright text (12px, 40% opacity). Right: 2–3 text links (12–13px, 40% opacity) with 16–24px gap. Optional top border (1px, rgba(255,255,255,0.1)). No newsletter signup, no sitemap, no social icons as squares.

## COMPLETE CULTURE-BRAND COMPOSITION EXAMPLE

This is a complete culture-brand homepage as a DesignNode tree. Study the composition — how photography leads, how display type creates tension, how dark + warm backgrounds set mood, how sections are fewer but larger.

[{"id":"page-root","type":"frame","name":"Culture Brand Homepage","style":{"width":"fill","display":"flex","flexDirection":"column","background":"#0F0F0F","foreground":"#E8E4DF"},"children":[{"id":"nav-01","type":"frame","name":"Navigation","style":{"width":"fill","display":"flex","flexDirection":"row","justifyContent":"space-between","alignItems":"center","padding":{"top":20,"right":48,"bottom":20,"left":48},"position":"absolute","foreground":"#FFFFFF","opacity":0.9},"children":[{"id":"nav-logo","type":"text","name":"Logo","style":{"fontSize":15,"fontWeight":700,"letterSpacing":0.1},"content":{"text":"MAISON"}},{"id":"nav-right","type":"frame","name":"Nav Right","style":{"display":"flex","flexDirection":"row","alignItems":"center","gap":24},"children":[{"id":"nav-link","type":"text","name":"Link","style":{"fontSize":13,"foreground":"rgba(255,255,255,0.5)"},"content":{"text":"Archive"}},{"id":"nav-cta","type":"button","name":"CTA","style":{"fontSize":13,"fontWeight":600,"background":"#EDEDED","foreground":"#0F0F0F","borderRadius":2,"borderWidth":0,"padding":{"top":8,"right":16,"bottom":8,"left":16}},"content":{"text":"Shop"}}]}]},{"id":"hero-01","type":"frame","name":"Hero","style":{"width":"fill","height":740,"coverImage":"photo:fashion editorial, two models walking on empty street, golden hour side lighting, grainy film texture, full frame","coverSize":"cover","coverPosition":"center 35%","coverScrim":"linear-gradient(transparent 50%, rgba(0,0,0,0.55))","display":"flex","flexDirection":"column","justifyContent":"flex-end","padding":{"top":0,"right":48,"bottom":64,"left":48},"foreground":"#FFFFFF"},"children":[{"id":"hero-kicker","type":"text","name":"Kicker","style":{"fontSize":11,"letterSpacing":0.12,"opacity":0.5},"content":{"text":"SS26 COLLECTION"}},{"id":"hero-title","type":"text","name":"Title","style":{"fontSize":88,"fontWeight":800,"letterSpacing":-0.02,"lineHeight":0.95,"maxWidth":"80%"},"content":{"text":"WALKING NOWHERE"}},{"id":"hero-btn","type":"button","name":"CTA","style":{"fontSize":14,"fontWeight":600,"background":"#EDEDED","foreground":"#0F0F0F","borderRadius":2,"borderWidth":0,"padding":{"top":12,"right":28,"bottom":12,"left":28},"marginTop":24},"content":{"text":"Enter the Collection"}}]},{"id":"grid-01","type":"frame","name":"Photo Grid","style":{"width":"fill","display":"grid","gridTemplate":"1fr 1fr","gap":4},"children":[{"id":"grid-img-1","type":"frame","name":"Photo 1","style":{"height":520,"coverImage":"photo:fashion model in concrete interior, natural light from left, neutral tones, editorial pose","coverSize":"cover"},"children":[]},{"id":"grid-img-2","type":"frame","name":"Photo 2","style":{"height":520,"coverImage":"photo:close-up of hands adjusting jacket collar, soft focus background, warm skin tones, film grain","coverSize":"cover"},"children":[]}]},{"id":"statement-01","type":"frame","name":"Statement","style":{"width":"fill","display":"flex","flexDirection":"column","alignItems":"center","justifyContent":"center","padding":{"top":120,"right":80,"bottom":120,"left":80},"background":"#0F0F0F"},"children":[{"id":"statement-text","type":"text","name":"Quote","style":{"fontSize":42,"fontWeight":300,"lineHeight":1.4,"textAlign":"center","maxWidth":780,"foreground":"#E8E4DF"},"content":{"text":"Clothes are not about being seen. They are about how you move through the world when no one is watching."}},{"id":"statement-attr","type":"text","name":"Attribution","style":{"fontSize":12,"opacity":0.35,"textAlign":"center","marginTop":24},"content":{"text":"Maison, Spring 2026"}}]},{"id":"lookbook-01","type":"frame","name":"Lookbook","style":{"width":"fill","display":"flex","flexDirection":"column","gap":0},"children":[{"id":"look-1","type":"frame","name":"Look 1","style":{"width":"fill","height":560,"coverImage":"photo:fashion editorial, model leaning against raw concrete wall, oversized coat, desaturated tones, full body","coverSize":"cover","coverPosition":"center"},"children":[]},{"id":"look-2","type":"frame","name":"Look 2","style":{"width":"fill","height":480,"coverImage":"photo:fashion editorial, model walking in empty gallery space, high ceilings, natural light, minimal styling","coverSize":"cover","coverPosition":"center 40%"},"children":[]},{"id":"look-3","type":"frame","name":"Look 3","style":{"width":"fill","height":520,"coverImage":"photo:close-up of woven textile texture, natural fibers, warm tones, shallow depth of field","coverSize":"cover"},"children":[]}]},{"id":"culture-01","type":"frame","name":"Culture Block","style":{"width":"fill","display":"grid","gridTemplate":"3fr 2fr","gap":0,"alignItems":"center"},"children":[{"id":"culture-img","type":"frame","name":"Photo","style":{"height":480,"coverImage":"photo:behind the scenes fashion studio, designer pinning fabric on mannequin, warm overhead light, documentary style","coverSize":"cover"},"children":[]},{"id":"culture-text","type":"frame","name":"Text","style":{"display":"flex","flexDirection":"column","gap":16,"padding":{"top":64,"right":64,"bottom":64,"left":48}},"children":[{"id":"culture-kicker","type":"text","name":"Kicker","style":{"fontSize":11,"letterSpacing":0.12,"foreground":"rgba(232,228,223,0.4)"},"content":{"text":"THE STUDIO"}},{"id":"culture-title","type":"text","name":"Title","style":{"fontSize":32,"fontWeight":400,"lineHeight":1.2},"content":{"text":"Made by Hand, Worn Without Ceremony"}},{"id":"culture-body","type":"text","name":"Body","style":{"fontSize":15,"lineHeight":1.7,"foreground":"rgba(232,228,223,0.6)","maxWidth":380},"content":{"text":"Every piece begins as a conversation between material and maker. We work slowly, in a studio that values silence over speed."}}]}]},{"id":"cta-01","type":"frame","name":"CTA","style":{"width":"fill","display":"flex","flexDirection":"column","alignItems":"center","justifyContent":"center","padding":{"top":120,"right":48,"bottom":120,"left":48},"background":"#0F0F0F"},"children":[{"id":"cta-headline","type":"text","name":"Headline","style":{"fontSize":48,"fontWeight":700,"letterSpacing":0.04,"textAlign":"center"},"content":{"text":"ENTER THE ARCHIVE"}},{"id":"cta-btn","type":"button","name":"CTA","style":{"fontSize":14,"fontWeight":600,"background":"#EDEDED","foreground":"#0F0F0F","borderRadius":2,"borderWidth":0,"padding":{"top":12,"right":28,"bottom":12,"left":28},"marginTop":32},"content":{"text":"Shop Collection"}}]},{"id":"footer-01","type":"frame","name":"Footer","style":{"width":"fill","display":"flex","flexDirection":"row","justifyContent":"space-between","alignItems":"center","padding":{"top":20,"right":48,"bottom":20,"left":48},"borderColor":"rgba(255,255,255,0.08)","borderWidth":1},"children":[{"id":"f-copy","type":"text","name":"Copyright","style":{"fontSize":12,"opacity":0.3},"content":{"text":"© 2026 Maison"}},{"id":"f-links","type":"frame","name":"Links","style":{"display":"flex","flexDirection":"row","gap":20},"children":[{"id":"f-l1","type":"text","name":"Link","style":{"fontSize":12,"opacity":0.3},"content":{"text":"Instagram"}},{"id":"f-l2","type":"text","name":"Link","style":{"fontSize":12,"opacity":0.3},"content":{"text":"Contact"}},{"id":"f-l3","type":"text","name":"Link","style":{"fontSize":12,"opacity":0.3},"content":{"text":"Privacy"}}]}]}]}]

Adapt this composition to match the brief and taste profile:
- Replace all text with original brand copy — terse, confident, culturally aware
- Replace all photo descriptions with brief-relevant editorial photography
- Adjust colors to match taste palette (keep dark + warm bias)
- You may add or remove one section, but keep the photography-led rhythm
- Statement section is non-negotiable — every culture brand needs a voice moment
- If the brief is a specific brand/product, the lookbook becomes that product's editorial
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

**Token roles:** accent ${PRIM.accent}, accentLight ${PRIM.accentLight}, text ${PRIM.text}, muted ${PRIM.muted}, border ${PRIM.border}, surface ${PRIM.surface}, canvas ${PRIM.canvas}, destructive ${PRIM.destructive}, destructiveSurface ${PRIM.destructiveSurface}, success ${PRIM.success}, successSurface ${PRIM.successSurface}, warning ${PRIM.warning}, warningSurface ${PRIM.warningSurface}, info ${PRIM.info}, infoSurface ${PRIM.infoSurface}.

**Primary button** (type "button"): background ${PRIM.accent}, foreground #FFFFFF, borderRadius 4, padding ~10px 20px vertical/horizontal, fontSize 14, fontWeight 600. Put the label in content.text.

**Outline button**: background transparent, borderWidth 1, borderColor ${PRIM.accent}, foreground ${PRIM.accent}, borderRadius 4, same padding/font as primary.

**Ghost button**: background transparent, no border, foreground ${PRIM.muted}, fontSize 14, fontWeight 500, padding ~10px 12px.

**Destructive button**: background ${PRIM.destructiveSurface}, foreground ${PRIM.destructive}, borderColor ${PRIM.destructive}, borderWidth 1, borderRadius 4, fontSize 14, fontWeight 600.

**Secondary button** (type "button"): background ${PRIM.borderSubtle}, foreground ${PRIM.text}, borderWidth 1, borderColor ${PRIM.border}, borderRadius 4, padding ~10px 20px, fontSize 14, fontWeight 600. Use for the less prominent action next to primary.

**Link CTA** (type "text", not button): fontSize 14, fontWeight 500, foreground = accent role, textDecoration "underline". For in-flow actions ("Learn more →", "View docs") beside or below button rows.

**Icon + label row**: horizontal **frame** (flexDirection row, alignItems center, gap ~10). Child 1: small **frame** ~22×22px, borderRadius 4, background = pale accent tint (${PRIM.accentLight}-like). Child 2: **text** label fontSize 14, fontWeight 500, foreground ${PRIM.text}. No SVG — the square is an icon placeholder.

**Stat Card** (KPI): inner **frame** "Card Surface" — background ${PRIM.surface}, borderWidth 1, borderColor ${PRIM.border}, borderRadius 6, padding ~20, flexDirection column, gap 4. Children: **text** label (fontSize 12, fontWeight 500, letterSpacing ~0.04, foreground ${PRIM.muted}); **text** value (fontSize 36, fontWeight 700, lineHeight ~1.1, foreground ${PRIM.text}); **frame** trend row (flex row, gap 6, alignItems center) with small circle **frame** ~18×18, borderRadius 999, background ${PRIM.successSurface}, plus **text** delta (fontSize 13, fontWeight 500, foreground ${PRIM.success} or ${PRIM.destructive} if negative).

**Alert / Note**: **frame** row (flexDirection row, alignItems flex-start, gap 12, padding 16) with background ${PRIM.infoSurface}, borderColor ${PRIM.info}, borderWidth 1, borderRadius 6. Left: icon **frame** ~20×20, borderRadius 999, background ${PRIM.info}. Right: column **frame** (gap 4, width fill) with title **text** (fontSize 14, fontWeight 600) + message **text** (fontSize 13, foreground ${PRIM.muted}, lineHeight ~1.5). For warnings use ${PRIM.warningSurface} / ${PRIM.warning}; success ${PRIM.successSurface} / ${PRIM.success}; errors ${PRIM.destructiveSurface} / ${PRIM.destructive}.

**Avatar**: horizontal **frame** (flex row, alignItems center, gap 12). **frame** circle ~40×40, borderRadius 999, overflow hidden, background ${PRIM.accentLight}, display flex center, child **text** initials (fontSize 15, fontWeight 600, foreground ${PRIM.accent}). Beside it: column **frame** (gap 2) with name **text** (fontSize 14, fontWeight 600) + role **text** (fontSize 12, foreground ${PRIM.muted}). Place inside testimonial **Card** cells or team sections.

**Badge**: small hug-width frame, display flex center, padding ~4px 10px, background ${PRIM.accentLight}, borderRadius 999, child text fontSize 12, fontWeight 600, foreground ${PRIM.accent}.

**Card**: frame with background ${PRIM.surface}, borderWidth 1, borderColor ${PRIM.border}, borderRadius 6, padding ~20px; children = title (text, fontSize 15, fontWeight 600) + body (text, fontSize 14, foreground ${PRIM.muted}).

**Input row**: column frame gap ~8px; label text fontSize 12, foreground ${PRIM.muted}; field frame height ~40, width fill, background ${PRIM.surface}, borderWidth 1, borderColor ${PRIM.border}, borderRadius 2, horizontal padding ~12px, placeholder text inside (visual only).

**Separator**: type "divider", width fill, height 1, borderWidth 1, borderColor ${PRIM.border}.

## SAAS COMPOSITION RECIPES

Build each major block as a **section frame** (direct child of the page root). Inside sections, **compose** from the primitives above — reuse the same radii, token hex values, and button variants. Prefer these named compositions:

1. **Top nav** — One row: logo **text** (fontSize 15, fontWeight 700, foreground ${PRIM.text}) + horizontal **frame** (display flex, flexDirection row, gap 24–32 or 28, alignItems center) with nav links (**text**, fontSize 14, foreground ${PRIM.muted}) + trailing **ghost** "Log in" (padding ~8px 12px) + **primary** "Sign up" (padding ~8px 16px). Match the **Nav Bar** insertable template: justifyContent space-between, padding 16/24, background ${PRIM.surface}, borderWidth 1 borderColor ${PRIM.border} on the bar.
2. **Hero** — Column (**flexDirection** column, **alignItems** center, gap 16–24, padding vertical 72–120, background often ${PRIM.canvas}). Optional **badge** row at top. **Headline** (**text**, fontSize 48–56, fontWeight 600, textAlign center). **Subtext** (fontSize 16–18, foreground ${PRIM.muted}, maxWidth ~560, textAlign center). **CTA row** (**frame**: flex row, gap 12, justifyContent center): **primary** + **outline** OR **primary** + **secondary** button. Optional **link CTA** **text** node below for tertiary action.
3. **Logo strip** — Short section: centered kicker (**text**, fontSize 11, letterSpacing, uppercase, foreground ${PRIM.muted}) + **frame** flex row, flexWrap wrap, justifyContent center, gap 32–48 with 4–6 **text** "client name" placeholders (fontSize 13, foreground ${PRIM.muted}).
4. **Features 3-up** — Section header (**text** title + optional **text** subtitle in ${PRIM.muted}) + **grid** **frame** (display grid, gridTemplate **repeat(3, 1fr)**, gap 24). Each column is one **Card** primitive (surface ${PRIM.surface}, border, borderRadius 6, padding ~20px): optional **icon + label row** at top of card, then **text** title (fontSize 15, fontWeight 600) + **text** body (fontSize 14, foreground ${PRIM.muted}).
5. **Testimonials 2–3** — Same grid pattern with **repeat(2, 1fr)** or **repeat(3, 1fr)**. Each cell: **Card** with quote **text** (fontSize 15–16, lineHeight 1.5). Prefer an **Avatar** row (circle + initials + name + role) below the quote instead of loose name lines, or keep name + role **text** if space is tight.
6. **Pricing tiers** — Grid **repeat(3, 1fr)** or **repeat(2, 1fr)** when only two plans: each cell is a **Card** containing tier name **text**, price **text** (larger, fontWeight 600), 3–5 bullet lines as **text** in ${PRIM.muted}, and one **primary** or **outline** button at the bottom inside the card.
7. **Closing CTA band** — Section **frame** with background ${PRIM.accentLight} or ${PRIM.canvas}: centered column, strong **text** headline + single **primary** button.
8. **Footer** — **frame** with padding; **text** copyright (fontSize 12, foreground ${PRIM.muted}) + optional row of link **text** or **ghost** buttons. Optional **divider** along the top edge of the section.

9. **Stats row** — Section **frame** with grid (**repeat(3, 1fr)** or **repeat(4, 1fr)**, gap 24). Each cell is one **Stat Card** primitive (surface, border, label + big value + optional trend). Use after hero or in proof/metrics sections.

10. **Alert banner** — Full-width section or top-of-page **frame**: one **Alert / Note** row (info default). Use for system messages, legal notices, or dismissible-style announcements below **Top nav**.

**Minimal fragment — nav + hero** (IDs are illustrative; always generate fresh unique ids for real output):

[{"id":"sec-nav","type":"frame","name":"Nav","style":{"width":"fill","display":"flex","flexDirection":"row","justifyContent":"space-between","alignItems":"center","padding":{"top":16,"right":24,"bottom":16,"left":24},"background":"${PRIM.surface}","borderColor":"${PRIM.border}","borderWidth":1},"children":[{"id":"nav-logo","type":"text","name":"Logo","style":{"fontSize":15,"fontWeight":700,"foreground":"${PRIM.text}"},"content":{"text":"Acme"}},{"id":"nav-actions","type":"frame","name":"Actions","style":{"display":"flex","flexDirection":"row","alignItems":"center","gap":24},"children":[{"id":"nav-p","type":"text","name":"Link","style":{"fontSize":14,"foreground":"${PRIM.muted}"},"content":{"text":"Pricing"}},{"id":"nav-b1","type":"button","name":"Login","style":{"background":"transparent","foreground":"${PRIM.muted}","borderWidth":0,"padding":{"top":8,"right":12,"bottom":8,"left":12},"borderRadius":4,"fontSize":14,"fontWeight":500},"content":{"text":"Log in"}},{"id":"nav-b2","type":"button","name":"CTA","style":{"background":"${PRIM.accent}","foreground":"#FFFFFF","padding":{"top":8,"right":16,"bottom":8,"left":16},"borderRadius":4,"fontSize":14,"fontWeight":600,"borderWidth":0},"content":{"text":"Sign up"}}]}]},{"id":"sec-hero","type":"frame","name":"Hero","style":{"width":"fill","display":"flex","flexDirection":"column","alignItems":"center","gap":20,"padding":{"top":88,"right":48,"bottom":88,"left":48},"background":"${PRIM.canvas}"},"children":[{"id":"h1","type":"text","name":"Headline","style":{"fontSize":52,"fontWeight":600,"textAlign":"center","maxWidth":720},"content":{"text":"Headline"}},{"id":"h2","type":"text","name":"Sub","style":{"fontSize":17,"foreground":"${PRIM.muted}","textAlign":"center","maxWidth":560},"content":{"text":"Supporting line."}},{"id":"hero-cta","type":"frame","name":"CTAs","style":{"display":"flex","flexDirection":"row","gap":12,"justifyContent":"center"},"children":[{"id":"hb1","type":"button","name":"Primary","style":{"background":"${PRIM.accent}","foreground":"#FFFFFF","padding":{"top":10,"right":20,"bottom":10,"left":20},"borderRadius":4,"fontSize":14,"fontWeight":600,"borderWidth":0},"content":{"text":"Primary"}},{"id":"hb2","type":"button","name":"Secondary","style":{"background":"transparent","foreground":"${PRIM.accent}","borderColor":"${PRIM.accent}","borderWidth":1,"padding":{"top":10,"right":20,"bottom":10,"left":20},"borderRadius":4,"fontSize":14,"fontWeight":600},"content":{"text":"Secondary"}}]}]}]

**Rules:** Adapt copy, counts, and spacing to the brief. Do **not** swap in different border radii or off-palette neutrals for elements that map to a primitive recipe. Typical section order: Nav → optional **Alert banner** → Hero → Logo strip (optional) → Features → **Stats row** (optional) → Social proof → Pricing (optional) → Closing CTA → Footer — reorder if the brief requires it.
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
      return "\nIMPORTANT: Product / SaaS page. Use PRODUCT UI PRIMITIVES for buttons, badges, cards, stat cards, alerts, avatars, fields, and dividers. Compose major sections using SAAS COMPOSITION RECIPES (top nav, hero, stats row, alert banner, grids of cards, pricing cards, footer). Do not invent alternate radii or arbitrary palette colors for those elements.";
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
    intentProfile?: IntentProfile | null;
    knobVector?: DesignKnobVector;
    fidelityMode?: FidelityMode;
    compositionBlueprint?: string;  // NEW: output from buildCompositionBlueprint()
  }
): string {
  const tasteProfile = options?.tasteProfile;
  const knobVector = options?.knobVector ?? deriveDesignKnobs({
    tasteProfile,
    intentProfile: options?.intentProfile ?? null,
    fidelityMode: options?.fidelityMode ?? "balanced",
  });
  const compiledDirectives = compileTasteToDirectives(
    tasteProfile,
    options?.fidelityMode ?? "balanced"
  );
  const tasteSection = directivesToPromptText(compiledDirectives);
  const intentSection = options?.intentProfile
    ? `\n## Intent Profile\n- summary: ${options.intentProfile.summary}\n- goal: ${options.intentProfile.businessGoal}\n- output type: ${options.intentProfile.outputType}\n- content priority: ${options.intentProfile.contentPriority.join(", ")}\n- must include: ${options.intentProfile.mustInclude.join(", ") || "none"}\n- must avoid: ${options.intentProfile.mustAvoid.join(", ") || "none"}\n- copy tone: ${options.intentProfile.copyTone}\n- literalness: ${options.intentProfile.literalness}\n`
    : "";
  const knobSection = `\n${serializeDesignKnobsForPrompt(knobVector)}\n`;
  const blueprintSection = options?.compositionBlueprint
    ? `\n${options.compositionBlueprint}\n`
    : "";
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

${tasteSection}${intentSection}${knobSection}${blueprintSection}${accentMapping4A}
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
    "gradient": { "type": "linear"|"radial", "angle": number, "position": { "x": 50, "y": 50 }, "stops": [{ "color": "#hex or rgba()", "position": 0-100 }], "interpolation": "srgb"|"oklch" },
    // gradient: angle is degrees 0-360 (linear only, 180 = top-to-bottom); position is radial center as %; interpolation defaults to srgb, use oklch for distant hues (e.g. blue to orange) to avoid muddy midpoints.
    // Use gradient for hero backgrounds, section transitions, and decorative fills. Prefer 2-3 stops. Subtle gradients over dramatic ones. gradient renders on top of background but behind coverImage.
    "transform": { "rotate": number, "scale": { "x": number, "y": number } },
    // transform: rotate is degrees clockwise (default 0), scale x/y are multipliers (default 1/1).
    // Rotate is available but use it rarely. Most elements should not be rotated. Only use rotate when the brief explicitly asks for dynamic or playful composition. Default is 0. Subtle rotations (1-5deg) are more useful than dramatic ones. Use scale sparingly — prefer explicit width/height for sizing.
    "transformOrigin": { "x": number, "y": number },
    // transformOrigin: x/y are percentages (default 50/50, center).
    // blendMode: "normal"|"multiply"|"screen"|"overlay"|"darken"|"lighten"|"color-dodge"|"color-burn"|"hard-light"|"soft-light"|"difference"|"exclusion"|"hue"|"saturation"|"color"|"luminosity"
    // Default is "normal" (no blending). Use sparingly: "multiply" for darkening overlays on images, "screen" for lightening/glow, "overlay" for contrast-enhancing texture layers. Do not use blend modes on text, buttons, or content that needs to be readable. Only use when the brief calls for textured, layered, or photographic composition.
    // clipPath: { type: "circle"|"ellipse"|"inset"|"polygon", circle: { radius, cx, cy }, ellipse: { rx, ry, cx, cy }, inset: { top, right, bottom, left, borderRadius? }, polygon: [{ x, y }...] } — all values as percentages
    // Clips the element to a geometric shape. Use very rarely. Only use for: circular avatar frames (circle), decorative diagonal section dividers (polygon), or angled image reveals (inset). Do not clip text, buttons, or interactive elements. Do not use on more than 1-2 elements per page.
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

## Responsive Overrides (mobile)

Each node MAY include a \`responsiveOverrides\` object with a \`mobile\` key containing style properties that should differ on mobile (375px viewport). Only include properties that ACTUALLY DIFFER from the desktop (base) styles. If a node looks identical at 375px, omit responsiveOverrides entirely.

Common mobile overrides:
- fontSize: reduce by ~30-40% (e.g. desktop 48 → mobile 28)
- flexDirection: "column" for horizontal layouts that should stack vertically on mobile
- padding: compress by ~40-50% (e.g. "64px 80px" → "32px 20px")
- gap: reduce proportionally
- width: change fixed widths to "fill" for full-width mobile
- gridTemplateColumns: simplify multi-column grids to "1fr"

To hide a node on mobile, use the separate \`hidden\` field: \`"hidden": { "mobile": true }\`

Example:
\`\`\`json
{
  "id": "hero-section",
  "type": "frame",
  "name": "Hero",
  "style": {
    "flexDirection": "row",
    "padding": "80px 120px",
    "gap": "60px",
    "fontSize": 56
  },
  "responsiveOverrides": {
    "mobile": {
      "flexDirection": "column",
      "padding": "40px 20px",
      "gap": "24px",
      "fontSize": 32
    }
  },
  "children": [...]
}
\`\`\`

Keep overrides SPARSE. A typical page should have responsiveOverrides on 30-50% of nodes, not every node. Only nodes whose layout or typography needs to change at mobile width should have overrides.

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

## Shadow Effects

effects: [{ type: "dropShadow"|"innerShadow", x, y, blur, spread, color, enabled }]
Structured shadow effects. Most elements need 0 or 1 shadow effect.
Use subtle drop shadows for card elevation: { type: "dropShadow", x: 0, y: 2, blur: 8, spread: 0, color: "rgba(0,0,0,0.08)", enabled: true }
Use inner shadows rarely — only for pressed/recessed effects.
Do not stack more than 2 shadow effects on a single element unless the brief explicitly calls for complex depth.

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
11. Use effects[] for all shadows — do NOT use legacy "shadow" string fields. Keep effects compact and purposeful (0-2 entries for most nodes).

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

// ─── Section-Level Regeneration Prompt ──────────────────────────────────────

export function buildDesignTreeSectionPrompt(
  tokens: DesignSystemTokens,
  sectionName: string,
  siblingContext: { above: string; below: string },
  options?: {
    intent?: "more-like-this" | "different-approach";
    direction?: string;
    tasteProfile?: TasteProfile | null;
    fidelityMode?: FidelityMode;
  }
): string {
  const taste = options?.tasteProfile;
  const fidelity = options?.fidelityMode || "balanced";

  let directives = "";
  if (taste) {
    const compiled = compileTasteToDirectives(taste, fidelity);
    directives = directivesToPromptText(compiled);
  }

  const intentBlock = options?.intent === "different-approach"
    ? `IMPORTANT: The designer wants a COMPLETELY DIFFERENT approach for this section. Change the layout structure, composition, and visual pattern. Keep the same taste/palette but reimagine the section entirely.`
    : `The designer wants a REFRESHED version of this section. Keep the general concept but improve the content, styling, and composition. Make it feel fresh, not identical.`;

  const directionBlock = options?.direction
    ? `\nDesigner's direction: "${options.direction}"`
    : "";

  return `You are regenerating a SINGLE SECTION of a website design.

## Section to Regenerate
Name: "${sectionName}"

## Intent
${intentBlock}${directionBlock}

## Page Context
This section sits between:
- ABOVE: ${siblingContext.above}
- BELOW: ${siblingContext.below}

The regenerated section MUST complement its neighbors:
- Do NOT duplicate the background color of adjacent sections
- Do NOT repeat the same layout pattern as adjacent sections
- Maintain visual flow and pacing across the page

${directives ? `## Taste Directives\n${directives}\n` : ""}
## Output Format
Return a SINGLE DesignNode JSON object (type: "frame") representing ONLY this section.
Do NOT return a full page tree. Return ONE section frame with its children.

The section must follow the DesignNode schema:
- Root: type "frame" with children
- Valid child types: frame, text, image, button, divider
- Style properties: position, display, flexDirection, gap, padding, background, foreground, fontSize, fontFamily, fontWeight, lineHeight, etc.
- Use composition vocabulary: layering, asymmetry, pacing, contrast

## Design Tokens
${tokens ? JSON.stringify(tokens, null, 2) : "No tokens provided"}

## Rules
- COMPELLING, ORIGINAL copy — no lorem ipsum, no placeholder text
- Every ID must be unique (use descriptive IDs like "hero-heading", "features-grid")
- Return valid JSON only — no markdown, no code fences, no explanation
`;
}
