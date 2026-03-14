# Color Terms — Vocabulary Reference

Precise definitions for color vocabulary used in TasteProfile outputs. Includes palette types, saturation levels, accent strategies, and example hex ranges.

---

## Color Mode

### `light`
- Background: #F5F5F5–#FFFFFF
- Surfaces: #FAFAFA–#F0F0F0
- Text: #0A0A0A–#2A2A2A (primary), #6B6B6B–#9B9B9B (secondary)
- Reads as: open, accessible, editorial
- Default mode for most professional web contexts

### `dark`
- Background: #080808–#1A1A1A
- Surfaces: #141414–#2A2A2A
- Text: #E8E8E8–#FAFAFA (primary), #6B6B6B–#9B9B9B (secondary)
- Note: pure #000000 backgrounds read as harsh and low-craft; favor #0A0A0A or #0D0D0D
- Reads as: premium, technical, exclusive
- Associated archetypes: premium-saas, culture-brand (aggressive variant)

### `mixed`
- Deliberate alternation between dark and light sections
- Not a default; every section's mode is a design decision
- Associated archetypes: experimental, some culture-brand

### `adaptive`
- Site has both a light and dark mode, user-controlled or system-controlled
- Both modes must be designed and specified
- Most common in: premium-saas, minimal-tech

---

## Palette Types

### `monochromatic`
- All colors are variations in lightness/darkness of a single hue
- Example: near-black background, dark gray surfaces, near-white text
- Accent is a singular, isolated note — not part of the palette system
- Ratio: background 60%, surfaces 25%, text 10%, accent ≤5%
- Example hex range: `#0A0A0A` / `#1A1A1A` / `#EDEDED` / `#5E5CE6` (accent)
- Associated archetypes: premium-saas, minimal-tech

### `analogous`
- Colors from adjacent hue positions on the color wheel
- Example: warm cream, warm off-white, warm sand, warm brown
- Creates natural, cohesive warmth without high contrast
- Example hex range: `#FAF7F4` / `#F2EDE6` / `#2C2218` / `#C4A882`
- Associated archetypes: editorial-brand, creative-portfolio (warm variant)

### `complementary`
- Two hues from opposite positions on the color wheel
- High visual tension — requires careful balance to avoid clashing
- Example: deep navy + ochre, black + chartreuse
- Use sparingly; the complement is an accent, not a second primary
- Associated archetypes: experimental, culture-brand

### `neutral-plus-accent`
- Mostly neutral palette (grays, blacks, whites) with a single accent color
- Accent creates focal points — buttons, highlights, active states
- Accent coverage: ≤ 5–8% of total page surface area
- Example: `#FAFAFA` / `#1A1A1A` / `#4F46E5` (accent)
- Most common palette type across all archetypes

### `restrained`
- Extremely limited — often 2-3 values total
- No accent; hierarchy achieved through typography and spacing
- Example: pure white + pure black, or cream + near-black
- Associated archetypes: minimal-tech, creative-portfolio (typographic focus)

---

## Saturation Levels

Values expressed in HSL Saturation (S%).

### `desaturated`
- S: 0–15%
- No perceptible color — pure grays or near-grays
- Reads as: technical, minimal, precise
- Example: `hsl(220, 5%, 10%)` vs `hsl(0, 0%, 10%)`

### `muted`
- S: 15–35%
- Color is present but restrained; identifiable hue without vibrancy
- Reads as: premium, considered, sophisticated
- Example: `hsl(220, 25%, 15%)` — dark blue-gray with character

### `moderate`
- S: 35–65%
- Clear, legible color; neither corporate nor vivid
- Most common for accent colors in professional contexts
- Example: `hsl(245, 50%, 55%)` — medium purple

### `vivid`
- S: 65–100%
- High chroma, maximum color energy
- Use sparingly — most powerful at small coverage percentages
- Associated archetypes: experimental, culture-brand
- Example: `hsl(340, 85%, 55%)` — strong magenta

---

## Accent Strategy

### `single-pop`
- One accent color used consistently for interactive elements and key focal points
- Coverage: ≤ 5% of page surface area
- All CTAs, links, and highlights use the same accent
- Example: everything interactive is `#4F46E5`; everything else is neutral

### `gradient-subtle`
- Accent applied as a gentle gradient — two adjacent hues, low contrast between stops
- Never used as a background; used on buttons, borders, or icons
- Example: `linear-gradient(135deg, #6C5CE7, #4F46E5)` on a button

### `gradient-bold`
- High-contrast gradient — visible color shift across the element
- Used on hero backgrounds, large section backgrounds, or bold CTAs
- High execution risk — easily becomes the "generic SaaS gradient"
- Only use when the gradient has personality, not when it's purple-to-indigo

### `multi-accent`
- Two or more accent colors used systematically
- Each accent has a defined purpose (e.g., interactive vs. highlight vs. status)
- Requires a clear system; without one it reads as chaotic
- Associated archetypes: experimental, some editorial-brand (seasonal)

### `no-accent`
- All color from text and background values; no separate accent hue
- Hierarchy through typography and spacing only
- Associated archetypes: restrained minimal-tech, typographic creative-portfolio

---

## Temperature

### `cool`
- Background/neutral hues lean toward blue-gray
- Example backgrounds: `#0A0C10`, `#F4F6F9`
- Reads as: technical, precise, digital, premium

### `neutral`
- Background/neutral hues have no dominant warmth or coolness
- Example: `#0A0A0A`, `#F5F5F5`, `#1C1C1E` (Apple's system gray)

### `warm`
- Background/neutral hues lean toward yellow-red-brown
- Example backgrounds: `#FAF7F4`, `#1A1510`
- Reads as: editorial, approachable, analog, craft

---

## Color Anti-Patterns

These combinations appear in the `avoid[]` list for most archetypes:
- Purple-to-indigo gradients on hero backgrounds — overused, signals template
- Bright blue `#0066FF` as the sole accent — the default SaaS button color
- White backgrounds with a colored top section — "hero" gradient that fades to white
- Multi-accent without a system — random color, not intentional palette
- Pure black (`#000000`) as the only dark value — harsh, unrefined
