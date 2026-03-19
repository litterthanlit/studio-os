# Studio OS Development Skill

description: Use this skill when modifying any Studio OS canvas component, panel, inspector, reducer, hook, or dashboard page. Covers V2 design system enforcement, V3 canvas architecture, and common pitfalls.

---

## Gotchas (built from real failures — read before every session)

### Canvas
- `canvas-client.tsx` is 5000+ lines and deeply interconnected. NEVER rewrite it in one pass. Extract first, then rewire.
- `ComposeDocumentView` renders generated HTML. All click events MUST be intercepted by a transparent overlay or buttons/links in the generated site will navigate, cloning the entire Compose UI inside the artboard.
- Artboard containers must NOT have `overflow: hidden`, `max-height`, or fixed `height`. They show the full rendered page — the CANVAS pans/zooms, not the artboards.
- `@import url()` for Google Fonts cannot come after `@import "tailwindcss"` in globals.css — Tailwind v4 expands first, pushing the import down. Use `<link>` in layout.tsx instead.
- Middle-mouse pan must use `onPointerDownCapture` (capture phase) on the canvas root, while item drag stays on bubble phase. Otherwise items swallow the middle-click event.
- `data-node-id` attributes on rendered page nodes are essential for point-and-edit. If a component re-renders without them, selection breaks silently.

### State & History
- Undo/redo is snapshot-based (stores full items array), not command-based. Max 50 entries.
- Pan, zoom, hover, and selection changes are NEVER recorded in history.
- Drag commits one history entry on pointer-up. Text edits commit on blur/Enter/400ms debounce. AI actions commit once per response. Generation commits once after all artboards are created.
- `PUSH_HISTORY` must ALWAYS be dispatched BEFORE the mutation it records. If reversed, undo captures the already-changed state and does nothing. Caught in V3.2 regression pass on the font family select.
- `compiledCode` is stripped from artboard items before saving to localStorage. It's regenerated on demand.
- The migration layer (`migrateToV3`) must be error-tolerant — wrap each step in try/catch, drop malformed subsections rather than failing the whole project.

### Design System
- Blue `#1E5DF2` is the ONLY accent color. Everything else is grayscale. No exceptions.
- Bespoke Serif is for display headings ONLY — never body copy, never UI labels, never buttons.
- Panel chrome is always `bg-white/95 backdrop-blur-sm border-[#E5E5E0]`. No dither inside panels.
- The halftone dot grid (`app-shell::before`) uses `3.5px` spacing for the app shell. The canvas uses `20px` spacing for the pin-board feel. These are different and intentional.
- Use hex values directly in V2/V3 components (`#1A1A1A`, `#E5E5E0`), not CSS variable tokens (`var(--text-primary)`).
- Form inputs: `border border-[#E5E5E0] rounded-[2px]`. Cards/buttons: `rounded-[4px]`. No `rounded-xl`, no pills.

### Routes
- `/canvas?project=:id` is the canonical workspace route. No `step` parameter in V3.
- `/projects/:id` redirects to `/canvas?project=:id`.
- `/explore`, `/brief`, `/vision`, `/flow`, `/type` are thin redirect shells — not deleted, just redirecting.
- The sidebar only has Home, Projects, Settings. Nothing else.

### TypeScript
- Pre-existing TS errors are expected. `ignoreBuildErrors: true` in next.config.ts.
- Run `npx tsc --noEmit` after changes to confirm no NEW errors. Pre-existing ones (~34) are documented in CLAUDE.md.

### React Compiler
- React Compiler (via `eslint-config-next`) flags `useRef.current` access in callbacks passed through render context as "Cannot access refs during render" — even for callback refs invoked during commit.
- Fix: use `useMemo(() => new Map(), [])` for mutable containers instead of `useRef(new Map())`. For anchor elements in portals, use `useState<HTMLElement | null>` with the setter as a callback ref.

### Framer Motion
- `HTMLMotionProps` type conflicts with React's `onAnimationStart`. This is a known pre-existing error. Don't try to fix it.
- Use `motion.div` / `motion.aside` for panel animations (slide-in drawers, fade-in overlays).

## Verification Scripts

After making changes, run these checks:

### Token Consistency Check
```bash
# Find any old CSS variable token usage in V2/V3 components (should be zero)
grep -rn "var(--text-primary)\|var(--border-primary)\|var(--accent)" \
  app/canvas-v1/components/ \
  app/\(dashboard\)/ \
  components/navigation/ \
  --include="*.tsx" --include="*.ts" | grep -v "globals.css" | grep -v "node_modules"
```

### DitherSurface Audit
```bash
# Find remaining DitherSurface usage (should only be in AsciiLoader)
grep -rn "DitherSurface\|halftone-divider\|halftone-fade-edge" \
  app/ components/ --include="*.tsx" --include="*.ts"
```

### Halftone in Panels Check
```bash
# Ensure no halftone/dither classes inside panel components
grep -rn "halftone\|dither" \
  app/canvas-v1/components/InspectorPanel \
  app/canvas-v1/components/LayersPanel \
  app/canvas-v1/components/BottomBar \
  --include="*.tsx" 2>/dev/null
```

### Font Audit
```bash
# Find hardcoded Geist Mono references (should be zero after IBM Plex Mono migration)
grep -rn '"Geist Mono"' app/ components/ --include="*.tsx" --include="*.ts"
```

### Selection Outline Audit
```bash
# Verify selection uses inline styles not Tailwind (to avoid conflicts with generated site styles)
grep -rn "outline.*1E5DF2\|outline.*D1E4FC" \
  app/canvas-v1/components/ComposeDocumentView.tsx \
  app/canvas-v1/components/CanvasArtboard.tsx
```

## Workflow Rules

### Self-Improvement Loop
After ANY correction from the user — a bug you introduced, a wrong assumption, a style violation — immediately append to the **Gotchas** section above with a rule that prevents the same mistake. Format: `- [component/area]: what went wrong and the correct approach.` This is how the skill gets smarter over time. Be ruthless about capturing lessons.

### Verification Before Done
Never report a task as complete without proving it works:
1. Run `npx tsc --noEmit` — confirm no new errors
2. Run the relevant **Verification Scripts** above
3. If you modified canvas interaction (drag, pan, zoom, selection), list the specific manual checks the user should do
4. If you modified styling, confirm against the **Design System** gotchas above
5. Diff your changes against main mentally — would a staff engineer approve this?

### Plan First
For any task with 3+ steps or architectural decisions:
1. Write the plan as a checklist to `tasks/todo.md` (create if doesn't exist)
2. Check in with the user before starting implementation
3. Mark items complete as you go
4. If something goes sideways, STOP and re-plan — don't keep pushing

### Lessons File
Maintain `tasks/lessons.md` (create if doesn't exist). After any user correction, append:
```
### [date] — [what happened]
**Mistake:** [what you did wrong]
**Rule:** [the rule that prevents this in the future]
```
Review this file at the start of every session.

### Simplicity First
- Make every change as simple as possible. Minimal code impact.
- Find root causes. No temporary fixes. Senior developer standards.
- Changes should only touch what's necessary. Avoid introducing bugs in adjacent code.
- If a fix feels hacky, pause and ask: "Knowing everything I know now, what's the elegant solution?"

## Dev Log

Append to this section after each session. Format: `[date] — what was changed, what broke, what to watch for next time`.

```
[2026-03-19] — V2 visual identity applied. Home, sidebar, projects, settings, type explorer redesigned. Bespoke Serif loaded via Google Fonts <link> (not @import — that breaks with Tailwind v4). Halftone dividers removed from CollectView and home page.

[2026-03-19] — V3 unified canvas shipped. Stage split removed. UnifiedCanvasState with migration layer. Undo/redo history. Point-and-edit with click overlay. PromptPanel replaces CollectView. Three artboard items per site.

[2026-03-19] — V3 compose bugs fixed: clicking inside generated site was navigating (added click overlay with preventDefault). Artboards were in scrollable boxes (removed overflow/max-height). Inspector was tabbed (replaced with single-scroll). Middle mouse pan was broken (event capture phase fix).

[2026-03-19] — V3.2 shipped. Inspector overhaul: shared primitives (InspectorField.tsx), 6 selection states rebuilt with InspectorSection/Label/TextInput/Textarea/NumberInput/Select/ColorField/Row/Divider. Spacing box model (SpacingDiagram.tsx) with two-axis paddingX/paddingY sync and collapsed mode. Color picker refinement: portal rendering, viewport clamping, anchor positioning, document colors deduplication, 3→6 hex expansion, preview strip, defaults grid. Top-level section drag-reorder: REORDER_NODE reducer action with cross-artboard siteId sync, SectionDragHandle with GripVertical, midpoint-based insertion, CSS-transform-only visual dragging (no optimistic state), Escape cancel. Fixed: font select undo order, 2 React Compiler ref-during-render lint errors.
```
