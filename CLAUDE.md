# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Product Vision: Studio OS as a Design Harness

Studio OS is not just an editor — it's a **design harness** that improves AI model design output quality, the same way Cursor's harness improved code completion by 11%+. The goal: make AI models produce better design output than they would on their own, calibrated to each designer's taste.

Designers think in images and references, not text prompts. Studio OS bridges that gap:
1. **Import** moodboards, screenshots, references onto the canvas
2. **Analyze** — AI extracts color palettes, typography, spacing rhythms, layout patterns, density, mood (the "taste skill")
3. **Constrain** — extracted taste becomes structured design directives that constrain generation
4. **Generate** — AI produces sites matching the designer's visual intent, not generic templates
5. **Refine** — designer edits become implicit taste feedback for the next generation

The harness lives in: `TasteProfile` extraction → `tasteToDesignDirectives()` → `referenceFidelityRules()` → `buildPageTreePrompt()` → structured `PageNode` JSON output. Every generation is taste-informed and immediately editable on the canvas.

## Commands

```bash
npm run dev                        # Dev server on port 3000
npm run build                      # Production build (TS errors ignored via next.config.ts)
npm run lint                       # ESLint 9 flat config — pre-existing warnings are not regressions
npm run db:push                    # Push Supabase migrations
npm run generate:marketing-images  # Fetch + crop Lummi images into public/marketing/
```

No automated test suite exists. Manual browser testing is the primary verification method.

## Environment

Create `.env.local` with at minimum:

```
NEXT_PUBLIC_SUPABASE_URL=your-project-ref
NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder
```

If `NEXT_PUBLIC_SUPABASE_URL` contains `your-project-ref`, middleware bypasses auth and the app runs fully on demo/local data — no real Supabase instance needed for UI work.

External features degrade gracefully without their API keys:
- `OPENROUTER_API_KEY` — AI canvas pipeline (image analysis, design system generation, site generation) via Claude Sonnet 4.6, Gemini Flash, Kimi K2.5
- `OPENAI_API_KEY` — Embeddings only (taste profile similarity)
- `LUMMI_API_KEY` — Stock photo search
- `RESEND_API_KEY` — Waitlist emails
- Pinterest / Are.na — image imports

## Architecture

### Route Groups

```
app/
├── (dashboard)/       # Main app — sidebar + dot-grid layout
│   ├── home/          # AI home screen with search
│   ├── projects/      # Project list + [id] project room
│   ├── brief/         # Brief generation tool
│   ├── type/          # Typography explorer
│   ├── vision/        # Moodboard / reference viewer
│   ├── flow/          # Focus/flow mode
│   ├── explore/       # Inspiration explore
│   └── settings/      # User settings
├── (canvas-view)/     # Fullscreen canvas — no sidebar
│   └── canvas/        # AI canvas pipeline (fullscreen)
├── (marketing)/       # Public marketing site + /privacy
├── api/               # Route handlers (see below)
├── auth/              # Supabase auth callbacks
├── onboarding/        # New user onboarding flow
└── share/             # Public share pages
```

### Data Layer

**Primary store: `localStorage` via `lib/project-store.ts`**

All project data (projects, references, tasks, canvas state, palette, typography) lives in `localStorage` under `studio-os:*` keys. This is intentional — no server round-trips for the core studio features. The store uses a custom event bus (`window.dispatchEvent`) to notify components of changes.

Supabase is used only for: authentication, taste profiles (embeddings + similarity), and the waitlist.

### AI Canvas Pipeline (`lib/canvas/` + `app/api/canvas/`)

The canvas is the most complex subsystem. It runs a multi-stage pipeline:

1. **Extract** (`api/canvas/extract`) — pull reference images from a project
2. **Analyze** (`api/canvas/analyze`) — vision model scores images, extracts palette/mood
3. **Generate System** (`api/canvas/generate-system`) — produces design tokens from analysis
4. **Compose** (`api/canvas/compose`) — generates layout/component structure
5. **Generate Component** (`api/canvas/generate-component`) — outputs full React/Tailwind code
6. **Taste Profile** (`api/canvas/taste-profile`) — builds user taste embedding

All AI calls route through `lib/ai/model-router.ts` which uses OpenRouter (OpenAI-compatible SDK) for multi-model access. `SONNET_4_6`, `GEMINI_FLASH`, and `KIMI_K25` are the available models.

### Taste Engine — The Design Harness Core (`lib/ai/` + `lib/canvas/generate-site.ts`)

The taste engine is what makes Studio OS a harness, not just an editor:

- `api/taste/extract/route.ts` — extracts `TasteProfile` from reference images (colors, typography, spacing, density, mood, CTA style)
- `generate-site.ts: tasteToDesignDirectives()` — converts taste data into specific model constraints (layout rules, type rules, color rules, avoid list)
- `generate-site.ts: referenceFidelityRules()` — tells the model HOW closely to follow references
- `generate-site.ts: buildPageTreePrompt()` — forces structured `PageNode` JSON output so generation is immediately editable
- `tagger.ts` — AI tagging of reference images via Gemini
- `image-scorer.ts` — scores images against taste profile
- `embeddings.ts` — OpenAI embeddings for similarity search
- `taste-profile-compat.ts` — bridges `TasteProfile` type to canvas pipeline

The pipeline: references → `/api/taste/extract` → `TasteProfile` → `tasteToDesignDirectives()` + `referenceFidelityRules()` → model prompt → `PageNode` JSON tree → canvas. The taste profile is persisted per-project in localStorage via `project-store.ts`.

### Theme System

Theme is stored in `localStorage` as `'light'` or `'dark'` and set on `<html data-theme="...">`. The `@custom-variant dark` in `globals.css` ties Tailwind's `dark:` variant to `data-theme="dark"` rather than `prefers-color-scheme`, so media queries don't override explicit user choice. All color tokens are CSS variables defined in `globals.css` under `:root` (light) and `[data-theme="dark"]`.

### Key Caveats

- `useSearchParams()` must always be wrapped in a `<Suspense>` boundary — the shared `Sidebar` renders on every route, so any `useSearchParams` there will break prerendering across the entire app (this caused a production build outage, see `canvas-crash-handoff.md`).
- `@react-pdf/renderer` requires `transpilePackages` in `next.config.ts` for App Router compatibility.
- TypeScript `ignoreBuildErrors: true` is intentional — do not treat TS errors as blockers during development.
- Marketing section background images (`public/marketing/*.webp`) are gitignored — run `npm run generate:marketing-images` locally.

## Design System

Light mode only. No dark theme for V1.

### Colors (hex values used directly — no CSS variable indirection in V2 components)
- Accent: `#1E5DF2` (primary blue)
- Accent light: `#D1E4FC` (highlights, badges, active backgrounds, focus rings)
- Accent hover: `#1A4FD6`
- Backgrounds: `#FAFAF8` (primary), `#F5F5F0` (secondary/panels), `#FFFFFF` (surfaces/inputs)
- Borders: `#E5E5E0` (default), `#D1E4FC` (active/focus)
- Text: `#1A1A1A` (primary), `#6B6B6B` (secondary), `#A0A0A0` (muted)

### Radius
Sharp corners: `rounded-[2px]` (inputs), `rounded-[4px]` (cards/buttons/panels), `rounded-[6px]` (section containers).
No `rounded-xl` (12px+), no pill shapes except avatars/status dots.

### Typography
- **Bespoke Serif** (`font-serif` / `--font-instrument-serif`) — display headings only (page greetings, section titles). Loaded via Google Fonts `<link>` in `app/layout.tsx`. NEVER for body copy or UI labels.
- **Geist Sans** — all UI text, body copy, buttons, labels.
- **IBM Plex Mono** — overline kickers (`.mono-kicker`), code, data values, mono labels. Loaded via Google Fonts runtime stylesheet in `app/layout.tsx`. Replaces Geist Mono as of V3.1.
- Scale: Display 28–36px → H1 22px → H2 17px → Body 14px → Small 13px → Caption 11px → Mono overline 10px.

### Icons
Lucide only. Sidebar: 18×18 `strokeWidth={1}`. Elsewhere: 16×16 `strokeWidth={1.5}` (14px in compact contexts like BottomBar).

### Key Patterns
- **`.mono-kicker`** — IBM Plex Mono 10px uppercase tracking-widest `#A0A0A0`. Used for all section headers, panel labels, overline text.
- **Panel chrome** — `bg-white/95 backdrop-blur-sm border-[#E5E5E0]`. No dither, no decorative elements inside panels.
- **Form inputs** — `border border-[#E5E5E0] rounded-[2px] bg-white px-3 py-2 text-[13px] focus:border-[#D1E4FC] focus:ring-2 focus:ring-[#D1E4FC]/40`.
- **Ghost buttons** — `border border-[#E5E5E0] rounded-[4px] px-3 py-2 text-[12px] text-[#6B6B6B] hover:border-[#D1E4FC] hover:text-[#1E5DF2]`.
- **Primary buttons** — `bg-[#1E5DF2] text-white rounded-[4px] hover:bg-[#1A4FD6]`.
- **Filter pills** — Active: `bg-[#1E5DF2] text-white`. Inactive: `bg-[#F5F5F0] text-[#6B6B6B] hover:bg-[#E5E5E0]`.
- **List items** — compact rows (not big cards), 40px thumbnail, hover borders only.
- **Destructive actions** — `text-red-500 hover:text-red-600` link-style text, no red buttons.

### V3 Redesign Status

**V3 Unified Canvas** (complete):
- `app/canvas-v1/components/UnifiedCanvasView.tsx` — single infinite canvas, all item kinds
- `app/canvas-v1/components/InspectorPanelV3.tsx` — split panel: inspector (top) + embedded prompt composer (bottom), replaces floating PromptPanel
- `app/canvas-v1/components/LayersPanelV3.tsx` — grouped tree (Site/References/Notes)
- `app/canvas-v1/components/BottomBarV3.tsx` — zoom, undo/redo, panel toggles
- `lib/canvas/unified-canvas-state.ts` — V3 types, migration, persistence
- `lib/canvas/canvas-reducer.ts` + `canvas-context.tsx` + `history.ts` — state engine

**V3.1 Polish** (complete, verified 2026-03-19):
- Middle-mouse pan fix — capture phase on canvas root, `onAuxClick` suppression
- Embedded prompt — floating PromptPanel removed, prompt/history/chips/generation embedded in inspector right rail split panel with draggable divider
- Live editing feel — instant visual updates from inspector, debounced history (400ms/blur), blue caret in contentEditable, lighter edit-mode outline
- Reference resize — 8 handles (corners + edges), aspect-ratio lock, inspector W/H with lock toggle
- Visual polish — V2 dot grid, scan-line sweep on references, halftone on artboards, generation skeleton + agent log steps
- Prompt resilience — generation now falls back to local/default design tokens when remote image analysis is unavailable, so prompt runs still create artboards/history in demo or offline-ish environments
- Prompt history restore — each run stores an artboard snapshot so Restore can reinstate prior generations even after newer site replacements
- IBM Plex Mono — replaces Geist Mono globally via Google Fonts runtime stylesheet + CSS variable/fallback cascade
- `app/canvas-v1/hooks/useResize.ts` — resize hook (zoom-aware, aspect-ratio, min size)
- `app/canvas-v1/components/ResizeHandles.tsx` — 8-handle resize UI

**V3.2 Inspector + Reorder** (complete, verified 2026-03-19):
- Inspector overhaul — shared V2-style primitives (`app/canvas-v1/components/inspector/InspectorField.tsx`), all 6 selection states rebuilt (text/media/container/reference/artboard/empty)
- Spacing box model — `app/canvas-v1/components/inspector/SpacingDiagram.tsx`, two-axis paddingX/paddingY sync, collapsed single-padding mode, independent gap
- Color picker refinement — portal rendering (`createPortal`), viewport clamping, anchor positioning, document colors deduplication (references + design tokens), hex 3→6 expansion, preview strip, defaults grid
- Top-level section drag-reorder — `REORDER_NODE` reducer action, `SectionDragHandle.tsx` (GripVertical), midpoint-based insertion, CSS-transform visual drag (no optimistic state), cross-artboard siteId sync, Escape cancel, layers panel read-only
- Scoping: no `PageNodeStyle` expansion, no new node types, no `UnifiedCanvasState` change

**V3.3 Builder Power** (complete, verified 2026-03-20):
- Element action menu — double-click popover with type-specific actions (Edit Text, Edit With AI, Replace Image, Add Section, Move, Duplicate, Delete)
- PageNodeStyle extension — `fontStyle` (normal/italic), `textDecoration` (none/underline)
- Whole-node floating toolbar — B/I/U/Font/Color/AI above selected text nodes, hides during inline editing
- Curated section library — slide-over panel with 7 templates (Hero, Proof, Features, Testimonials, Pricing, CTA, Footer), `INSERT_SECTION` reducer action with cross-artboard sync
- Section duplicate + delete — `DUPLICATE_SECTION` (deep copy with fresh IDs), `DELETE_SECTION` (undo via existing history), `Cmd+D` and `Delete` keyboard shortcuts
- Sibling reorder — `REORDER_NODE` extended with `parentNodeId` for nested reorder (cards within grids, items within lists)
- AI contextual actions — prompt pre-fill based on selected node type, contextual suggestion chips per node type
- New files: `ElementActionMenu.tsx`, `NodeFormatToolbar.tsx`, `SectionLibraryPanel.tsx`, `lib/canvas/section-library.ts`
- New reducer actions: `INSERT_SECTION`, `DUPLICATE_SECTION`, `DELETE_SECTION`
- Interaction model: single-click selects (unchanged), double-click opens action popover, Edit Text enters contentEditable

**V4 Editor Polish** (complete, verified 2026-03-20):
- Right-click context menu — type-specific actions on every node (Edit Text, AI, Duplicate, Move Up/Down, Copy/Paste Style, Delete), portal-rendered with viewport clamping
- Full escape hierarchy — text editing → node → parent → grandparent → deselected
- Cmd+Click deep select — bypass hierarchy to select deepest node at click point via `elementsFromPoint` + `data-node-id`
- Tab/Shift+Tab sibling navigation — cycle through siblings at same tree level, wraps at boundaries
- Enter to start text editing — fires `ENTER_TEXT_EDIT_MODE_EVENT` on selected text node
- Breadcrumb hierarchy bar — clickable path from root to selected node, breakpoint label as root segment
- Keyboard shortcuts: Cmd+D duplicate, Delete remove, Cmd+[/] reorder, Cmd+Alt+C/V copy/paste style (excludes layout properties)
- Between-section "+" insertion bars with "/" slash command palette (7 templates + Browse All + search + keyboard nav)
- AI preview/accept/reject — AI edits stored as proposals via `AIPreviewSession`, accept commits, reject/vary restores prior state
- Per-breakpoint responsive overrides — `UPDATE_NODE_STYLE` writes to `responsiveOverrides[breakpoint]` on non-desktop artboards, inspector shows blue dot indicators with click-to-reset, breakpoint label header, Hide on Tablet/Mobile visibility toggles
- Inspector reads resolved style via `getNodeStyle(node, breakpoint)` — shows effective values including overrides
- New files: `ContextMenu.tsx`, `BreadcrumbBar.tsx`, `SlashCommandPalette.tsx`, `AIPreviewBar.tsx`
- New reducer actions: `START_AI_PREVIEW`, `ACCEPT_AI_PREVIEW`, `RESTORE_AI_PREVIEW`, `RESET_NODE_STYLE_OVERRIDE`, `TOGGLE_NODE_HIDDEN`
- Modified: `useCanvasKeyboard.ts` (full shortcut set), `ComposeDocumentView.tsx` (deep select, hidden node filtering, insertion bars), `canvas-reducer.ts` (breakpoint-aware `UPDATE_NODE_STYLE`, `getActiveBreakpoint` helper), `InspectorPanelV3.tsx` (preview bar, override dots, visibility toggles, resolved style), `InspectorField.tsx` (`InspectorLabel` hasOverride/onResetOverride), `InsertionBar.tsx` (slash palette integration)

**V4.1 Inspector & Canvas Polish** (complete, verified 2026-03-22):
- Stable inspector skeleton — `InspectorSkeleton.tsx` renders 8 sections in fixed order (Layout, Spacing, Typography, Fill, Radius, Border, Shadow, Opacity) for ALL node types. Non-applicable sections show collapsed headers ("Controlled by parent container" / "Select a text element"). Follows Paper.design "same shell, different controls" pattern
- Design/CSS tab switcher — `InspectorTabs.tsx` sticky tabs at top of inspector, switches between design controls (`InspectorSkeleton`) and CSS output (`CSSTab`)
- CSS tab with Copy CSS — `CSSTab.tsx` converts `PageNodeStyle` to CSS string, displays in monospace `<pre>`, "Copy CSS" button via clipboard API
- Breakpoint badge — `BreakpointBadge.tsx` shows active breakpoint label (e.g. "TABLET · 768PX") in blue accent below inspector tabs on non-desktop artboards
- "+" add Border/Shadow — `AddableSection.tsx` pattern: sections 6 (Border) and 7 (Shadow) start hidden with a "+" add button, clicking adds default values; "×" removes. Keeps inspector clean when properties aren't set
- Mini rail — `MiniRail.tsx` slim 48px left navigation rail in canvas view with logo mark, Layers/Inspector panel toggles, Home/Settings links, and back-to-dashboard button. Replaces full sidebar in canvas context
- Layers visible by default — `UnifiedCanvasView.tsx` initializes `showLayers` to `true` so layers panel is open on canvas load
- Text deselect on click-outside — clicking empty area within artboard (no `[data-node-id]` ancestor) calls `onSelectNode(null)`. `exitAnyActiveTextEditing()` blurs active contentEditable before new selection
- Cmd+Z during AI preview rejects — `UNDO` reducer case checks `state.aiPreview` first; if active, restores `beforeItems`/`beforeSelection` and clears preview (same as Reject)
- New files: `InspectorSkeleton.tsx`, `InspectorTabs.tsx`, `CSSTab.tsx`, `BreakpointBadge.tsx`, `AddableSection.tsx`, `InspectorCollapsible.tsx`, `InspectorSegmented.tsx`, `MiniRail.tsx`
- Modified: `InspectorPanelV3.tsx` (tab state, skeleton integration, CSS tab, breakpoint badge), `UnifiedCanvasView.tsx` (MiniRail mount, layers default true), `ComposeDocumentView.tsx` (click-outside deselect)

**Dashboard screens** (V2 design, unchanged in V3):
- `app/(dashboard)/home/home-client.tsx` — greeting, search, project list → routes to canvas
- `app/(dashboard)/projects/projects-client.tsx` — filter pills, compact rows → routes to canvas
- `app/(dashboard)/settings/page.tsx` — grouped sections, appearance toggle
- `components/navigation/sidebar.tsx` — Home + Projects only (V3 simplified)

**Legacy routes** (redirects only — not deleted):
- `/explore`, `/brief`, `/vision`, `/flow`, `/type` → redirect to `/projects`
- `/projects/:id` → redirect to `/canvas?project=:id`
- `/canvas-v1` → redirect to `/canvas`

**Legacy canvas components** (preserved for rollback, not rendered in V3):
- `CollectView.tsx`, `LayersPanel.tsx`, `InspectorPanel.tsx`, `BottomBar.tsx` — still in codebase but unused by `UnifiedCanvasPage`
- `PromptPanel.tsx` — preserved for rollback, replaced by embedded prompt in InspectorPanelV3 as of V3.1

### V2 Visual Identity

Inspired by Op Art, Panasonic Design Kyoto, Vasarely, and Swiss International Style.

Three visual systems at different scales — **bars become dots become pixels**:
- **Bars** (macro): Vertical tapered slats — the logo motif, loading indicators
- **Dots** (meso): Halftone dot-matrix grid — full-page background texture (`app-shell::before`), AI regenerating overlay (`3.5px` spacing)
- **Pixels** (micro): Scattered squares that dissolve — AsciiLoader generative states

### Logo Mark
Folder silhouette filled with vertical tapered diamond slats. Navy `#071D5C` at edges → bright blue `#1E5DF2` at center. SVG uses `clipPath` for the folder shape with polygon slats. Implemented in `components/navigation/sidebar.tsx` as `LogoMark` component (not exported — inline to sidebar).

### V2 Design Rules
1. **Bespoke Serif for display text only** — page greetings, marketing headlines, section titles
2. **Blue (#1E5DF2) is the ONLY accent color** — everything else is grayscale
3. **Halftone dot texture is background only** — never on interactive components, only canvas bg + empty/loading states
4. **No decorative elements** — no gradients on buttons, no heavy shadows, no emojis
5. **Panel headers use `.mono-kicker`** — Geist Mono 10px uppercase wide letter-spacing `#A0A0A0`
6. **List items are compact rows, not big cards** — thin rows with 40px thumbnail, hover borders only
7. **Panels use `bg-white/95 backdrop-blur-sm`** so halftone texture bleeds through
8. **All inputs have focus rings** — `focus:border-[#D1E4FC] focus:ring-2 focus:ring-[#D1E4FC]/40`
9. **No old CSS variable tokens in V2 components** — use hex values directly (`#1A1A1A`, `#E5E5E0`, etc.)
10. **Overall mood: serious, architectural, tool-like, editorial** — Framer meets Swiss poster

### Canvas Architecture (V3 Unified Canvas)

Single infinite canvas per project. References, generation, and composition on one spatial surface. No stages, no tabs.

**Data model:** `UnifiedCanvasState` with flat `items: CanvasItem[]` array. Four item kinds: `reference`, `artboard`, `note`, `arrow`. Single-variant: one active site per project (desktop/tablet/mobile artboards). State persisted to `studio-os:canvas-v3:${projectId}`.

**State engine:** `useReducer`-style reducer (`canvas-reducer.ts`) with 29 action types. Snapshot-based undo/redo history (`history.ts`) — max 50 entries, in-memory only. Coalescing: drag commits on pointer-up, text edits on 400ms debounce, AI actions once per response.

**Layout:** References cluster on the left (3-column grid at x=100). Artboards positioned on the right (desktop at x=1200, tablet at x=2720, mobile at x=3568). Desktop artboard: `border-t-2 border-t-[#1E5DF2]`. Others: `border-t border-t-[#E5E5E0]`. Headers: `font-mono text-[10px] uppercase tracking-widest`.

**Panels:**
- LayersPanelV3: 240px left, grouped tree (Site/References/Notes), recursive expand/collapse
- InspectorPanelV3: 280px right, single scroll, adapts by selection type (reference/artboard/node/empty)
- Prompt Composer: embedded in InspectorPanelV3 bottom split, generation + history + suggestion chips + agent log
- BottomBarV3: floating centered strip — zoom, undo/redo, panel toggles (L/I/P)

**Interactions:** `useDrag` (pointer cycle, shift-axis lock), `useCanvasGestures` (wheel zoom, space+drag pan, middle-mouse pan), file drop, clipboard paste, `useCanvasKeyboard` (full shortcut set).

**Migration:** `migrateToV3()` hydrates from legacy `references`, `composeDocument`, `generatedVariants`, `canvasSession`, and `composeWorkspace`. Error-tolerant (try/catch per step). Bi-directional sync: reference items projected back to legacy storage for project card counts.

**Generation:** PromptPanel calls same API routes (`/api/canvas/analyze` → `/api/canvas/generate-system` → `/api/canvas/generate-component`). Single-variant normalization: pick `safe` strategy, else first. `REPLACE_SITE` action removes old artboards, adds new, pushes history.

**Reference intelligence:** `useReferenceExtractor` auto-calls `/api/ai/tag` for new references. Extracted colors/fonts/tags shown in inspector and as color dots below reference cards.

**Routes:** `/canvas?project=:id` is canonical. `/projects/:id` → redirect to canvas. `/canvas-v1` → redirect to canvas. `/explore`, `/brief`, `/vision`, `/flow`, `/type` → redirect to `/projects`.

### Key Files

| File | Purpose |
|------|---------|
| `app/globals.css` | Design tokens, `.mono-kicker`, `.app-shell::before` halftone, animations |
| `app/layout.tsx` | Google Fonts link for Bespoke Serif (Instrument Serif) |
| `components/navigation/sidebar.tsx` | Sidebar — Home, Projects only (V3 simplified) |
| `app/(canvas-view)/canvas/page.tsx` | Canvas route — V3 entry point, redirects legacy `step` param |
| `app/canvas-v1/canvas-client.tsx` | Legacy CanvasPage + V3 UnifiedCanvasPage export |
| `app/canvas-v1/components/UnifiedCanvasView.tsx` | V3 canvas renderer — items, drag, gestures, drop, paste |
| `app/canvas-v1/components/CanvasReference.tsx` | Reference card — image, annotation pin, color dots, style badge |
| `app/canvas-v1/components/CanvasArtboard.tsx` | Artboard wrapper — header, ComposeDocumentView, click overlay |
| `app/canvas-v1/components/PromptPanel.tsx` | Legacy floating prompt (preserved for rollback, not rendered in V3.1) |
| `app/canvas-v1/hooks/useResize.ts` | Resize hook — pointer cycle, zoom-aware, aspect-ratio lock |
| `app/canvas-v1/components/ResizeHandles.tsx` | 8-handle resize UI for reference items |
| `app/canvas-v1/components/InspectorPanelV3.tsx` | 280px split panel — inspector (top) + embedded prompt composer (bottom), selection-adaptive |
| `app/canvas-v1/components/LayersPanelV3.tsx` | 240px tree navigator — Site/References/Notes groups |
| `app/canvas-v1/components/BottomBarV3.tsx` | Transport strip — zoom, undo/redo, panel toggles |
| `app/canvas-v1/components/ColorPickerPopover.tsx` | Color picker — portal, viewport clamping, document colors, hex input, defaults grid |
| `app/canvas-v1/components/inspector/InspectorField.tsx` | Shared inspector primitives — Section, Label, TextInput, Textarea, NumberInput, Select, ColorField, Row, Divider |
| `app/canvas-v1/components/inspector/SpacingDiagram.tsx` | Spacing box model — two-axis paddingX/paddingY sync, collapsed mode, gap |
| `app/canvas-v1/components/SectionDragHandle.tsx` | Drag handle for top-level section reorder — GripVertical, hover/selected visibility |
| `app/canvas-v1/components/ElementActionMenu.tsx` | Double-click popover — type-specific actions (Edit Text, AI, Replace Image, Add Section, Move, Duplicate, Delete) |
| `app/canvas-v1/components/NodeFormatToolbar.tsx` | Floating B/I/U/Font/Color/AI toolbar above selected text nodes |
| `app/canvas-v1/components/SectionLibraryPanel.tsx` | Slide-over panel with 7 section templates + search |
| `app/canvas-v1/components/ContextMenu.tsx` | Right-click context menu — type-specific actions, portal-rendered |
| `app/canvas-v1/components/BreadcrumbBar.tsx` | Clickable hierarchy path from root to selected node |
| `app/canvas-v1/components/SlashCommandPalette.tsx` | "/" command palette for section insertion — search, keyboard nav |
| `app/canvas-v1/components/AIPreviewBar.tsx` | Accept/Reject/Vary bar for AI preview proposals |
| `app/canvas-v1/components/InsertionBar.tsx` | Between-section "+" hover bar with slash palette integration |
| `app/canvas-v1/components/MiniRail.tsx` | 48px left navigation rail — logo, panel toggles, Home/Settings, back button |
| `app/canvas-v1/components/inspector/InspectorSkeleton.tsx` | Stable 8-section inspector shell — same section order for all node types |
| `app/canvas-v1/components/inspector/InspectorTabs.tsx` | Design/CSS tab switcher at top of inspector |
| `app/canvas-v1/components/inspector/CSSTab.tsx` | Computed CSS display with Copy CSS button |
| `app/canvas-v1/components/inspector/BreakpointBadge.tsx` | Blue breakpoint label (TABLET · 768PX) for non-desktop artboards |
| `app/canvas-v1/components/inspector/AddableSection.tsx` | "+" add / "×" remove pattern for optional properties (Border, Shadow) |
| `app/canvas-v1/components/inspector/InspectorCollapsible.tsx` | Collapsible inspector section with chevron toggle |
| `app/canvas-v1/components/inspector/InspectorSegmented.tsx` | Segmented control for inspector options (direction, shadow style) |
| `app/canvas-v1/components/ComposeDocumentView.tsx` | Artboard renderer — point-and-edit, inline text editing, section drag-reorder, action menu, floating toolbar |
| `app/canvas-v1/hooks/useDrag.ts` | Drag hook — pointer cycle, zoom-aware, shift-axis lock |
| `app/canvas-v1/hooks/useCanvasGestures.ts` | Pan/zoom — wheel, pinch, space+drag, middle-mouse |
| `app/canvas-v1/hooks/useCanvasKeyboard.ts` | Full keyboard shortcut set |
| `app/canvas-v1/hooks/useReferenceExtractor.ts` | Auto-extraction via /api/ai/tag |
| `lib/canvas/unified-canvas-state.ts` | V3 types, migration, persistence (load/save) |
| `lib/canvas/canvas-reducer.ts` | Reducer — 29 actions, history integration |
| `lib/canvas/section-library.ts` | 7 section templates (Hero, Proof, Features, Testimonials, Pricing, CTA, Footer) — PageNode factories |
| `lib/canvas/canvas-context.tsx` | React provider — load, debounced save, useCanvas hook |
| `lib/canvas/history.ts` | Snapshot-based undo/redo engine (pure functions) |
| `lib/canvas/compose.ts` | ComposeDocument types, `createInitialArtboards()`, `fitArtboardsToView()` |
| `lib/project-store.ts` | localStorage API for all project/reference/state data |
| `lib/ai/model-router.ts` | Multi-model AI router via OpenRouter |

### Pre-existing TypeScript Errors (not regressions)
- `canvas-client.tsx:525` — token merge type mismatch (`Record<string, unknown>` vs `Record<string, string>`)
- `UploadZone.tsx:31` — framer-motion `HTMLMotionProps` typing
- ~32 other errors across hooks, preloader, etc. — all pre-existing, `ignoreBuildErrors: true` in next.config.ts
