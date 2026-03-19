# Lessons Learned

Review this file at the start of every session. Append after any user correction.

---

### 2026-03-19 — @import url() in Tailwind v4
**Mistake:** Added `@import url('https://fonts.googleapis.com/css2?family=...')` after `@import "tailwindcss"` in globals.css. Tailwind v4 expands into thousands of lines, pushing the Google Fonts import below all rules — CSS requires @import to come first.
**Rule:** Never use `@import url()` in globals.css for external fonts. Always use `<link>` tags in `app/layout.tsx` or `next/font/google`.

### 2026-03-19 — Generated site click events navigating
**Mistake:** Rendered generated HTML directly without click interception. Buttons and links in the generated site executed their real href/onclick, cloning the entire Compose UI inside the artboard.
**Rule:** Always wrap rendered HTML in a transparent click-intercepting overlay with `e.preventDefault()` and `e.stopPropagation()`. Walk up from `e.target` to find `[data-node-id]` for selection.

### 2026-03-19 — Artboards in scrollable boxes
**Mistake:** Artboard containers had `overflow: hidden` or fixed heights, making users scroll within each artboard instead of panning the canvas.
**Rule:** Artboard containers must have `height: auto` and `overflow: visible`. The canvas surface pans/zooms — individual artboards never scroll internally.

### 2026-03-19 — Halftone dividers as decorative bands
**Mistake:** Applied halftone as thin decorative bands between sections (24px tall strips of dot patterns). Users said "what is this?"
**Rule:** Halftone is a FULL PAGE background texture only (on `app-shell::before`). Never use it as a component-level decoration, divider, or overlay on interactive elements.

### 2026-03-19 — PUSH_HISTORY must come BEFORE the mutation
**Mistake:** Font family select handler dispatched `UPDATE_NODE_STYLE` before `PUSH_HISTORY`. Undo captured the post-change state, so undoing a font change did nothing.
**Rule:** Always dispatch `PUSH_HISTORY` BEFORE the action it records (`UPDATE_NODE_STYLE`, `UPDATE_ITEM`, `MOVE_ITEM`, etc.). The snapshot captures state at the time `PUSH_HISTORY` fires.

### 2026-03-19 — React Compiler flags ref access through render context
**Mistake:** Passed a callback that accesses `useRef.current` through a `useMemo` render context object. React Compiler traced the transitive ref access and flagged it as "Cannot access refs during render", even though the callback was only invoked as a callback ref during commit.
**Rule:** When passing ref-accessing callbacks through render context, use `useMemo(() => new Map(), [])` for mutable containers instead of `useRef(new Map())`. For anchor elements in portals, use state (`useState<HTMLElement | null>`) with the setter as a callback ref instead of `useRef`.
