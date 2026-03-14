# Stripe — Design System Reference

**Canonical archetype:** `premium-saas` with editorial influence
**Primary influence:** Light mode default, deep editorial typography, technical + consumer brand crossover

Stripe represents premium-saas at its most editorially sophisticated. Unlike Linear (dark, product-only) or Vercel (neutral, developer-first), Stripe has invested in genuine editorial design — custom illustration systems, deep typographic hierarchy, and a visual language that serves both enterprise developers and small-business owners. It is the most complex system in this reference set.

---

## Color System

**Mode:** Light default (dominant), dark used contextually

**Background:** `#FFFFFF` / `#F6F9FC` (Stripe's signature light blue-gray)
**Surface:** `#FFFFFF` (cards, panels)
**Border:** `#E3E8EF`
**Text primary:** `#0A2540` — Stripe's near-black is distinctly blue-tinted. This is the most important single color in the system.
**Text secondary:** `#425466`
**Text tertiary:** `#697386`

**Accent / Brand:** `#635BFF` — Stripe's purple. Mid-saturation, slightly warm for a purple. Not the default indigo.
**Secondary accent:** `#00D4FF` (cyan) — used in gradient contexts

**Gradient signature:** `linear-gradient(135deg, #635BFF, #00D4FF)` — Stripe's gradient appears on specific brand moments, not everywhere. When it appears, it's intentional and recognizable.

**Key insight:** Stripe's near-black (`#0A2540`) is not gray — it's distinctly dark blue. This single decision makes the entire light mode feel warmer and more premium than a pure gray-black system.

---

## Typography

**Heading font:** `"Sohne"` (Klim Type) — distinctive German grotesque. Not available on Google Fonts. Closest substitute: `"Neue Haas Grotesk"`, `"Aktiv Grotesk"`, or `"Inter"` at high weights.

**Body font:** `"Sohne"` — same family, lighter weight

**Marketing display:** At the largest sizes, Stripe sometimes uses a custom display serif for impact — this is reserved for key brand moments.

**Scale:**
- Hero: 52–72px, weight 700–800
- Heading 1: 40–52px, weight 700
- Heading 2: 28–36px, weight 700
- Heading 3: 20–24px, weight 600
- Body: 17–18px, weight 400, line-height 1.65
- Small / caption: 14px, weight 400, `#697386`
- Code: `"Roboto Mono"` or `"JetBrains Mono"`

**Type behavior:**
- Left-aligned everywhere — no centered body paragraphs
- Large sections use a 2-column text layout for editorial density
- Product descriptions are genuinely long-form — Stripe treats copy as a design element

---

## Spacing System

- Section padding: 80–120px vertical
- Max content width: 1200px
- Feature section gap: 80px between text and illustration
- Dense sections (pricing, feature tables): 40–60px
- Component gap: 20–32px

---

## Component Patterns

**Navigation:**
- Prominent navigation with many items — Stripe has a complex product surface
- Mega menu: appears on hover, well-organized, no dark overlay (feels lighter than competitors)
- Height: 72px
- Background: `#FFFFFF` with `border-bottom: 1px solid #E3E8EF`
- CTA: purple filled button — the one place the accent is prominent

**Buttons:**
- Primary: `background: #635BFF; color: #fff; border-radius: 6px; padding: 10px 20px`
- Secondary: outlined or ghost
- Shape: `border-radius: 6px` — consistent

**Cards / surfaces:**
- White cards on `#F6F9FC` background — very subtle contrast
- `border: 1px solid #E3E8EF`
- Border-radius: `8px` on standard cards, `12px` on larger feature cards
- Box-shadow: `0 2px 8px rgba(10,37,64,0.06)` — slightly blue-tinted shadow matching text color

**Illustration system:**
- Stripe has a proprietary 3D illustration language (isometric + soft gradients)
- These are NOT generic stock illustrations — they are deeply branded
- The engine should NOT attempt to replicate these; instead flag "custom illustration required"

---

## Hero Approach

- Full-width section with a gradient purple-to-cyan element as a visual accent (not full background)
- Heading: 52–72px, left-aligned or centered depending on page
- Subhead: 18–20px, `#425466`, 24px gap below heading
- Hero is often text-heavy with a product interface element to the right
- Bottom of hero fades into the page background — no hard section break

---

## Section Rhythm

1. Hero with gradient accent and product preview
2. Company logos (neutral treatment)
3. Indexed feature sections — Stripe uses numbered sections frequently
4. Deep-dive technical sections (code examples)
5. Developer experience section
6. Business outcome section
7. Enterprise CTA

Rhythm: progressive — sections increase in density and specificity as the page scrolls. Broad claims at the top; technical evidence below.

---

## What Makes Stripe Distinctive

1. The dark blue near-black (`#0A2540`) — not gray, not neutral, distinctly Stripe
2. Sohne typeface is immediately recognizable at large sizes — deeply owned
3. Long-form body copy — treats the product seriously, not as a list of features
4. The gradient (`#635BFF → #00D4FF`) used with restraint — a signature, not a cliché
5. Section structure goes deep: the page is genuinely long and information-rich
6. Custom illustration system at high investment — budget and quality signal
7. Developer docs treated with the same care as marketing — rare and important
