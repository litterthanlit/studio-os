# Image Treatment Terms — Vocabulary Reference

Precise definitions for image treatment vocabulary used in TasteProfile outputs. Includes CSS/visual properties for each treatment, sizing logic, and corner/shadow specifications.

---

## Image Style

### `editorial`
- Images chosen for compositional value, not informational content
- Subject may be cropped unconventionally — close, off-center, partial
- Color palette in the image complements the site color system
- No generic stock photos — images feel authored and art-directed
- Associated archetypes: editorial-brand, culture-brand, creative-portfolio

### `product`
- Product screenshots, UI captures, or rendered product shots
- The interface or object IS the image — not a metaphor for it
- Treated with care: correct proportions, no distortion, proper context frame
- Often shown inside a device frame or with subtle shadow/border
- Associated archetypes: premium-saas, minimal-tech

### `atmospheric`
- Ambient photography — landscapes, textures, environments
- Not about a subject; about a mood or quality of light
- Often blurred, color-graded, or cropped to an abstract composition
- Associated archetypes: culture-brand, creative-portfolio, experimental

### `abstract`
- Generative, geometric, or non-representational imagery
- No identifiable subject matter
- Serves as visual texture, background, or compositional element
- Associated archetypes: experimental

### `documentary`
- Candid, photojournalistic style — people, places, process
- Not staged or art-directed beyond basic framing
- Reads as authentic, human, process-oriented
- Associated archetypes: certain editorial-brand and culture-brand variants

### `minimal`
- Images used sparingly or not at all
- When present: product screenshots, diagrams, or simple graphic elements
- The absence of imagery is a design decision
- Associated archetypes: minimal-tech, typographic creative-portfolio

---

## Image Sizing

### `full-bleed`
- Image extends to the viewport edge; no padding constraints
- CSS: `width: 100%; height: auto` or `width: 100vw; height: 100vh; object-fit: cover`
- Creates immersive, cinematic effect
- Associated archetypes: editorial-brand, culture-brand

### `contained`
- Image constrained to content column width; respects page margins
- CSS: `max-width: [content-width]; width: 100%`
- Reads as: composed, deliberate, editorial

### `mixed`
- Some images full-bleed, others contained — by design, not inconsistency
- Each image size is a compositional decision
- Requires deliberate system to avoid feeling random
- Associated archetypes: editorial-brand, creative-portfolio

### `thumbnail-grid`
- Multiple small images in a grid or masonry arrangement
- Individual images are small; the composition is the grid as a whole
- CSS: `display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr))`
- Associated archetypes: creative-portfolio (work showcase), culture-brand (lookbook)

---

## Image Treatment (Processing Style)

### `raw`
- No filters, grade adjustments, or effects applied
- Images presented as captured or rendered
- Trust the source photography / UI screenshot
- Most common for product screenshots and editorial photography

### `filtered`
- Color grading or filter applied consistently across all images
- Not a specific effect — a consistent treatment that unifies diverse images
- Example: subtle warm grade (temperature +10, tint +5), or consistent desaturation
- CSS approximation: `filter: saturate(0.85) sepia(0.1) brightness(0.95)`

### `duotone`
- Image rendered in two colors — typically a brand color and black or white
- Implementation: `mix-blend-mode: multiply` + color overlay, or CSS `filter` + `blend-mode`
- CSS:
  ```css
  .duotone {
    filter: grayscale(100%);
    position: relative;
  }
  .duotone::after {
    content: '';
    background: linear-gradient(var(--color-accent), var(--color-primary));
    mix-blend-mode: multiply;
  }
  ```
- Associated archetypes: culture-brand, experimental

### `high-contrast`
- Boosted contrast; shadows darker, highlights brighter
- Creates graphic, punchy feel
- CSS: `filter: contrast(1.2) brightness(0.95)`
- Associated archetypes: culture-brand, experimental

### `desaturated`
- Reduced or removed color; monochrome or near-monochrome images
- CSS: `filter: saturate(0.2)` (partial) or `filter: grayscale(1)` (full)
- Creates editorial consistency; images recede behind typography
- Associated archetypes: editorial-brand, creative-portfolio, minimal-tech

---

## Corner Radius

### `none`
- `border-radius: 0` — sharp corners
- Reads as: graphic, architectural, editorial, precise
- Associated archetypes: culture-brand, editorial-brand, experimental, minimal-tech

### `subtle`
- `border-radius: 6–12px`
- Barely perceptible; softens the image without losing precision
- Associated archetypes: premium-saas (especially product screenshots)

### `rounded`
- `border-radius: 16–24px`
- Visible rounding; friendly, modern
- Associated archetypes: consumer SaaS, humanist designs

### `pill`
- `border-radius: 50%` or `border-radius: 999px` for non-circular images
- Used for avatars, profile photos, small thumbnail images
- Associated archetypes: very specific — testimonial sections, team photos

---

## Borders

### `true`
- Visible border on images; typically 1px solid surface color or subtle line
- Example: `border: 1px solid rgba(255,255,255,0.08)` (dark mode)
- Creates separation between product screenshot and page background
- Essential for: product screenshots on matching-tone backgrounds
- Associated archetypes: premium-saas (product shots), minimal-tech

### `false`
- No border on images
- Images blend into or sit against contrasting backgrounds
- Associated archetypes: editorial photography, full-bleed images

---

## Shadow

### `none`
- No box-shadow
- Reads as: flat, graphic, editorial
- Associated archetypes: editorial-brand, culture-brand, minimal-tech

### `subtle`
- `box-shadow: 0 4px 24px rgba(0,0,0,0.08)` (light mode)
- `box-shadow: 0 4px 24px rgba(0,0,0,0.4)` (dark mode)
- Reads as: slightly elevated, polished
- Associated archetypes: premium-saas (product screenshots)

### `medium`
- `box-shadow: 0 16px 48px rgba(0,0,0,0.15)` (light mode)
- Reads as: floating, elevated, attention-directed

### `dramatic`
- `box-shadow: 0 32px 80px rgba(0,0,0,0.35)` or larger
- High spatial depth; the image appears to float significantly above the surface
- Easy to overuse — reserve for hero images or key visual moments

---

## Aspect Preference

### `landscape`
- Width > height; typically 16:9, 3:2, or 2:1
- Standard for product screenshots, application UI captures, desktop interfaces
- Example: 16:9 = `aspect-ratio: 16/9`

### `portrait`
- Height > width; typically 4:5, 3:4, or 2:3
- Common in: editorial photography, mobile app screenshots, fashion/culture
- Example: 4:5 = `aspect-ratio: 4/5`

### `square`
- Equal width and height; `aspect-ratio: 1`
- Works for: thumbnails, grid items, profile images

### `mixed`
- Images maintain their native aspect ratios — not normalized
- Creates variation and visual rhythm in grids
- Requires careful layout management (CSS masonry or manual placement)
