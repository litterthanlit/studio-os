# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Product Vision: Studio OS as a Design Harness

Studio OS is not just an editor — it's a **design harness** that improves AI model design output quality, the same way Cursor's harness improved code completion by 11%+. The goal: make AI models produce better design output than they would on their own, calibrated to each designer's taste.

**Proven:** First benchmark (2026-03-23) — BS-01 Editorial set. Raw model scored 5/10, harnessed output scored 9/10. **Delta: +4 overall.** Typography was the biggest win (+6). Target of +3 exceeded.

**V6 Renderer Proof (2026-03-23):** PageNode renderer hit a quality ceiling — editorial output looked like 'well-styled blocks' regardless of harness quality. V6 renderer architecture (5 universal node types: frame/text/image/button/divider, expanded CSS style model, hybrid auto-layout + breakout positioning) passed the visual proof gate. Hand-authored DesignNode editorial homepage renders at magazine quality. AI generation now targets the DesignNode model — all phases complete through Track 2 + generation animation.

Designers think in images and references, not text prompts. Studio OS bridges that gap:
1. **Import** moodboards, screenshots, references onto the canvas
2. **Analyze** — AI extracts color palettes, typography, spacing rhythms, layout patterns, density, mood (the "taste skill")
3. **Constrain** — extracted taste becomes structured design directives that constrain generation
4. **Generate** — AI produces sites matching the designer's visual intent, not generic templates
5. **Refine** — designer edits become implicit taste feedback for the next generation

The harness lives in: `TasteProfile` extraction → `tasteToDesignDirectives()` → `referenceFidelityRules()` → prompt builder → structured JSON output. V6 pipeline uses `buildDesignTreePrompt()` targeting DesignNode (primary). PageNode pipeline via `buildPageTreePrompt()` remains as fallback. Every generation is taste-informed and immediately editable on the canvas.

## Commands

```bash
npm run dev                        # Dev server on port 3000
npm run build                      # Production build (TS errors ignored via next.config.ts)
npm run lint                       # ESLint 9 flat config — pre-existing warnings are not regressions
npm run db:push                    # Push Supabase migrations
npm run generate:marketing-images  # Fetch + crop Lummi images into public/marketing/
npm run benchmark                  # Full benchmark: image resolution + taste extraction + raw vs harnessed generation + scoring
npm run benchmark:preflight        # Phase 1 only: image resolution + taste extraction (no dev server needed)
```

No automated test suite exists. Manual browser testing is the primary verification method. The benchmark harness (`scripts/benchmark-harness.ts`) is the primary automated quality measurement — it compares raw model output against harnessed output across reference sets.

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

**V5 Alpha harness layers (shipped 2026-03-22/23):**

- `lib/canvas/directive-compiler.ts` — converts `TasteProfile` into structured `HARD / SOFT / AVOID` directives with fidelity modes (close/balanced/push)
- `lib/canvas/directive-validator.ts` — validates generated `PageNode` trees against compiled directives, auto-repairs violations (palette snapping, padding adjustment, banned node removal)
- `lib/canvas/taste-evaluator.ts` — AI-judged fidelity scoring (Gemini Flash, 0-10 across palette/typography/density/structure/overall)
- `lib/canvas/archetype-bans.ts` — banned node types per archetype (e.g. editorial bans feature-grid, pricing-grid, logo-row)
- `app/api/benchmark/score/route.ts` — scoring endpoint for benchmark script (scores raw PageNode trees against TasteProfile)
- `scripts/benchmark-harness.ts` — end-to-end benchmark: image resolution → taste extraction → raw generation → harnessed generation → scoring → delta comparison
- `benchmark-sets.json` — 4 curated benchmark sets (Editorial, Clean SaaS, Creative Agency, Brutalist)
- `benchmark-refs/BS-01/` — 10 pre-resolved reference images for editorial benchmark

**V6 Renderer (all phases complete through Track 2 + generation animation):**

- `lib/canvas/design-node.ts` — V6 node model: 5 universal types (frame, text, image, button, divider) with expanded CSS style properties (positioning, grid, coverImage, z-index). Width/height type: `number | "hug" | "fill"` (Track 2 clean break from `"auto"`)
- `lib/canvas/design-style-to-css.ts` — single translation layer from DesignNodeStyle to React CSSProperties
- `lib/canvas/design-node-migration.ts` — PageNode → DesignNode bridge (converts all 16 old types, resolves tokens, decomposes card content). Also handles auto→hug migration for stored trees across 5 localStorage sources (Track 2)
- `app/canvas-v1/components/ComposeDocumentViewV6.tsx` — V6 renderer: renders DesignNode trees as live HTML/CSS with coverImage backgrounds, gradient scrim, CSS Grid, click-to-select, hover outlines, double-click drill-down, Escape hierarchy nav, drag-to-reposition, resize handles, snap guides
- `lib/canvas/test-editorial-tree.ts` — hand-authored editorial proof tree
- `app/(dashboard)/test-v6/page.tsx` — visual proof gate test page (http://localhost:3000/test-v6)
- `app/canvas-v1/components/inspector/DesignNodeInspector.tsx` — V6 inspector with 7 sections: Position (flow/breakout toggle, x/y/z-index), Size (inline mode toggle Fixed/Fill/Hug + value field per axis, between Position and Layout), Layout (flex/grid, direction, align, justify, gap), Spacing (4-side padding), Typography (font family with inheritance, weight, size, line-height, tracking, align, style, decoration), Fill (background, foreground, cover image), Appearance (radius, border +/-, shadow, opacity)
- `app/canvas-v1/hooks/useDragDesignNode.ts` — drag-to-reposition for absolute-positioned DesignNodes (zoom-aware, shift-axis lock, snap guide integration, history on pointerup)
- `app/canvas-v1/hooks/useSnapGuides.ts` — smart snap guide calculation during drag (caches sibling bounds, 5px threshold, snaps to edges + centers)
- `app/canvas-v1/components/DesignNodeResizeHandles.tsx` — mode-aware 8-handle resize for DesignNodes (corners + edges, shift aspect-ratio lock, alt center-resize, min 20px, zoom-aware). Fill→Fixed conversion shows toast, Hug→Fixed converts silently
- `app/canvas-v1/components/SnapGuideLines.tsx` — magenta snap alignment line overlay (full-container-width lines at snap positions during drag)

**V6 Interaction Layer:**

- Phase 1b (Selection + Editing): Click-to-select via `data-node-id` attributes, `DesignNodeInspector` for property editing, inline text editing (double-click enters contentEditable with blue caret, Enter commits, Escape cancels), undo/redo via existing history engine
- Phase 1c (Direct Manipulation): Drag-to-reposition for absolute-positioned nodes (`useDragDesignNode`), 8-handle resize (`DesignNodeResizeHandles`) with shift aspect-lock and alt center-resize, breakout mode toggle (flow/absolute) in inspector Position section
- Interaction polish: Hover outlines (dashed blue, direct DOM mutation for zero re-renders), double-click drill-down to deepest child (`elementsFromPoint`), Escape hierarchy navigation (selected node → parent → deselect), smart snap guides (magenta lines, 5px threshold, edge + center alignment) via `useSnapGuides` + `SnapGuideLines`, breakout badge on absolute-positioned nodes, move cursor on selected absolute nodes
- Track 1B (Selection & Manipulation): Multi-select (Shift+Click, rubber-band marquee, Cmd+A), primary/secondary selection visual distinction, inspector action bar (align/distribute/group/ungroup), multi-drag with snap guides on primary, group/ungroup (Cmd+G/Cmd+Shift+G) with `isGroup` metadata, z-order controls (Cmd+]/[), layers panel drag reorder (150ms hold-to-drag), updated Escape hierarchy (multi → primary → parent → deselect). Additive field approach: `selectedNodeId` (primary) + `selectedNodeIds` (full set).
  - `lib/canvas/multi-select-helpers.ts` — selection math (normalize, bounds, align, distribute, LCA)
  - `app/canvas-v1/hooks/useRubberBandSelection.ts` — marquee drag + hit testing
  - `app/canvas-v1/components/MultiSelectActionBar.tsx` — align/distribute/group toolbar
  - `app/canvas-v1/hooks/useLayersDragReorder.ts` — layers panel drag reorder

**Phase 5a — Export Pipeline (2026-04-03):**
- `lib/canvas/design-node-to-html.ts` — DesignNode-to-HTML conversion with inline styles, responsive overrides as CSS classes
- `app/canvas-v1/components/inspector/ExportTab.tsx` — Selection/Full Page scope toggle, HTML preview, Copy HTML button

**Component Gallery (2026-04-03):**
- `lib/canvas/design-component-library.ts` — 7 pre-built DesignNode section templates (Hero, Split Content, Features Grid, Quote Block, Proof Row, CTA Banner, Footer), save-to-library, localStorage persistence
- `app/canvas-v1/components/ComponentQuickPicker.tsx` — popover from insertion bars (templates + recent + Browse All)
- `app/canvas-v1/components/ComponentGalleryPanel.tsx` — full slide-over with filter tabs, search, card grid

**Right-Rail Refactor (2026-04-03):**
- Split panel removed entirely. InspectorPanelV3 now uses single-mode exclusive tabs: Design | CSS | Export | Prompt
- Each tab gets full height. No prompt cramping the inspector.

**Taste Intelligence UX (2026-04-03):**
- `app/canvas-v1/components/TasteCard.tsx` — extracted taste summary display
- `app/canvas-v1/components/ReferenceRail.tsx` — horizontal reference image strip
- Fidelity selector wired into Prompt tab (close/balanced/push modes)
- `FidelityMode` persisted in project state

**Canvas Feel — Track 1A (2026-04-03):**
- Cursor states (pointer/move/grab/grabbing), solid hover outlines
- Frame labels (hover type + blue selection label), parent boundary on drill-in
- Spacing measurement guides (magenta lines with pixel distance pills between siblings)
- Zoom steps (25%-400%), Cmd+0 zoom-to-fit, Cmd+1 zoom-to-selection
- Insertion bar hover tint, empty frame indicator
- Micro-interactions (resize handle scale, snap flash, breakout badge)

**Track 2 — Layout Semantics (2026-04-04):**
- Width/height type changed from `number | "auto" | "fill"` to `number | "hug" | "fill"` — clean break
- `lib/canvas/design-node-migration.ts` extended with auto→hug migration across 5 localStorage sources
- Inspector Size section added (between Position and Layout): inline mode toggle (Fixed/Fill/Hug) + value field per axis
- Non-destructive resize: Fill/Hug nodes get handles, Fill→Fixed shows toast via `SizingModeToast.tsx`
- `lib/canvas/design-tree-prompt.ts` updated to teach AI the Fill/Hug/Fixed vocabulary
- `lib/canvas/canvas-context.tsx` — persistence hardening (unmount flush guard, deferred hydration)

**Generation Animation (2026-04-04):**
- `app/canvas-v1/components/GenerationAnimation.tsx` — Canvas 2D three-stage visualization (dot field → vertical bars → sine waves), replaces skeleton loading. 800ms handoff sequence (collapse → clear → reveal → normalize)
- `GenerationStage` and `GenerationResult` types in unified-canvas-state.ts
- `getGenerationStage()` derives animation phase from agentSteps
- Failure states: credit exhaustion (freeze + pill), hard failure (dissolve + retry), template fallback (amber `#F59E0B` border + "TEMPLATE" badge)
- Prompt-side quieted to single dim label during generation

The pipeline: references → `/api/taste/extract` → `TasteProfile` → `compileTasteToDirectives()` → `buildPageTreePrompt()` → model → `PageNode` JSON → `validateDirectiveCompliance()` → `repairViolations()` → `scoreRealtimeFidelity()` → quality gate → 1+2 variant derivation. The taste profile is persisted per-project in localStorage via `project-store.ts`.

**V6 pipeline (generation proven, consistency gate passed 3/3 BS-01 runs):** Same taste extraction → directive compilation, but generation targets DesignNode (5 types, richer CSS) instead of PageNode (16 types, flexbox only). Renderer produces live HTML/CSS at editorial quality. Composition vocabulary + 5-type system broke the PageNode quality ceiling. See `docs/superpowers/specs/2026-03-23-v6-renderer-architecture-design.md` for full spec.

**V6 generation pipeline files (Phase 2a + 2b):**

- `lib/canvas/design-tree-prompt.ts` — AI prompt builder for DesignNode JSON generation (replaces `buildPageTreePrompt()`, teaches 5-type system, composition vocabulary, archetype-specific grammars)
- `lib/canvas/design-tree-validator.ts` — validates and normalizes AI-generated DesignNode JSON (structural validation, ID deduplication, grid constraint enforcement)
- `lib/canvas/design-media-resolver.ts` — resolves placeholder image references in generated DesignNode trees to real stock photos via Lummi API
- `lib/canvas/design-archetype-bans.ts` — V6 style-pattern-based bans (replaces PageNode type bans with structural pattern detection from style properties at runtime)
- `lib/canvas/design-taste-evaluator.ts` — AI-judged fidelity scoring for DesignNode trees (summarizes tree structure, scores against TasteProfile via Gemini Flash)

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
- Accent: `#4B57DB` (primary violet-blue)
- Accent hover: `#3D49C7`
- Accent light: `#D1E4FC` (highlights, badges, active backgrounds, focus rings)
- Accent subtle: `#EDF1FE` (hover tints, very light highlights)
- Backgrounds: `#FAFAF8` (primary), `#F5F5F0` (secondary/panels), `#FFFFFF` (surfaces/inputs)
- Chrome borders: `#EFEFEC` (panel edges, 0.5px), `#E5E5E0` (inputs/controls, 1px)
- Accent borders: `#4B57DB` (active tab underline, selected layer indicator, 1.5px)
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
- **`.mono-kicker`** — IBM Plex Mono 10px uppercase tracking-[1px] `#A0A0A0`. Used for all section headers, panel labels, overline text.
- **Panel chrome** — `bg-white border-[0.5px] border-[#EFEFEC]`. Solid backgrounds, no blur, no dither.
- **Form inputs** — `border border-[#E5E5E0] rounded-[2px] bg-white px-3 py-2 text-[13px] focus:border-[#D1E4FC] focus:ring-2 focus:ring-[#D1E4FC]/40`.
- **Ghost buttons** — `border border-[#E5E5E0] rounded-[4px] px-3 py-2 text-[12px] text-[#6B6B6B] hover:border-[#D1E4FC] hover:text-[#4B57DB]`.
- **Primary buttons** — `bg-[#4B57DB] text-white rounded-[4px] hover:bg-[#3D49C7]`.
- **Filter pills** — Active: `bg-[#4B57DB] text-white`. Inactive: `bg-[#F5F5F0] text-[#6B6B6B] hover:bg-[#E5E5E0]`.
- **List items** — compact rows (not big cards), 40px thumbnail, hover borders only.
- **Destructive actions** — `text-red-500 hover:text-red-600` link-style text, no red buttons.

### V3 Core Architecture (current)

- `app/canvas-v1/components/UnifiedCanvasView.tsx` — single infinite canvas, all item kinds
- `app/canvas-v1/components/InspectorPanelV3.tsx` — 4 exclusive tabs: Design | CSS | Export | Prompt. Each tab gets full height. No split panel
- `app/canvas-v1/components/LayersPanelV3.tsx` — grouped tree (Site/References/Notes)
- `app/canvas-v1/components/BottomBarV3.tsx` — zoom, undo/redo, panel toggles
- `lib/canvas/unified-canvas-state.ts` — V3 types, migration, persistence. Also has GenerationStage, GenerationResult types and getGenerationStage() function
- `lib/canvas/canvas-reducer.ts` + `canvas-context.tsx` + `history.ts` — state engine

**V3–V4.1 Editor History (2026-03-19 to 2026-03-22, complete):**
V3 unified canvas (single infinite surface, all item kinds). V3.1 polish (embedded prompt, live editing feel, IBM Plex Mono). V3.2 inspector overhaul (shared primitives, spacing box model, color picker, section drag-reorder). V3.3 builder power (element action menu, section library, sibling reorder, AI contextual actions). V4 editor polish (context menu, escape hierarchy, Cmd+Click deep select, Tab navigation, breadcrumb bar, keyboard shortcuts, insertion bars with slash palette, AI preview/accept/reject, per-breakpoint responsive overrides). V4.1 inspector & canvas polish (stable 8-section skeleton, Design/CSS tabs, mini rail, breakpoint badge, addable Border/Shadow sections).

Key V3-V4.1 files: `ElementActionMenu.tsx`, `NodeFormatToolbar.tsx`, `SectionLibraryPanel.tsx`, `ContextMenu.tsx`, `BreadcrumbBar.tsx`, `SlashCommandPalette.tsx`, `AIPreviewBar.tsx`, `InsertionBar.tsx`, `MiniRail.tsx`, `InspectorSkeleton.tsx`, `InspectorTabs.tsx`, `CSSTab.tsx`, `BreakpointBadge.tsx`, `AddableSection.tsx`.

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
Folder silhouette filled with vertical tapered diamond slats. Navy `#071D5C` at edges → violet-blue `#4B57DB` at center. SVG uses `clipPath` for the folder shape with polygon slats. Implemented in `components/navigation/sidebar.tsx` as `LogoMark` component (not exported — inline to sidebar).

### V2 Design Rules
1. **Bespoke Serif for display text only** — page greetings, marketing headlines, section titles
2. **Violet-blue (#4B57DB) is the ONLY accent color** — everything else is grayscale
3. **Halftone dot texture is background only** — never on interactive components, only canvas bg + empty/loading states
4. **No decorative elements** — no gradients on buttons, no heavy shadows, no emojis
5. **Panel headers use `.mono-kicker`** — IBM Plex Mono 10px uppercase 1px letter-spacing `#A0A0A0`
6. **List items are compact rows, not big cards** — thin rows with 40px thumbnail, hover borders only
7. **Panels use solid `bg-white`** — no blur, no transparency
8. **All inputs have focus rings** — `focus:border-[#D1E4FC] focus:ring-2 focus:ring-[#D1E4FC]/40`
9. **No old CSS variable tokens in V2 components** — use hex values directly (`#1A1A1A`, `#E5E5E0`, etc.)
10. **Overall mood: serious, architectural, tool-like, editorial** — Framer meets Swiss poster

### Canvas Architecture (V3 Unified Canvas)

Single infinite canvas per project. References, generation, and composition on one spatial surface. No stages, no tabs.

**Data model:** `UnifiedCanvasState` with flat `items: CanvasItem[]` array. Four item kinds: `reference`, `artboard`, `note`, `arrow`. Single-variant: one active site per project (desktop/tablet/mobile artboards). State persisted to `studio-os:canvas-v3:${projectId}`.

**State engine:** `useReducer`-style reducer (`canvas-reducer.ts`) with 30+ action types. Snapshot-based undo/redo history (`history.ts`) — max 50 entries, in-memory only. Coalescing: drag commits on pointer-up, text edits on 400ms debounce, AI actions once per response.

**Layout:** References cluster on the left (3-column grid at x=100). Artboards positioned on the right (desktop at x=1200, tablet at x=2720, mobile at x=3568). Desktop artboard: `border-t-2 border-t-[#4B57DB]`. Others: `border-t border-t-[#E5E5E0]`. Headers: `font-mono text-[10px] uppercase tracking-[1px]`.

**Panels:**
- LayersPanelV3: 240px left, grouped tree (Site/References/Notes), recursive expand/collapse
- InspectorPanelV3: 280px right, 4 exclusive tabs (Design/CSS/Export/Prompt), adapts by selection type (reference/artboard/node/empty)
- Prompt Composer: Prompt tab in InspectorPanelV3, generation + history + suggestion chips + agent log + taste card + reference rail + fidelity selector
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
| `app/canvas-v1/components/CanvasArtboard.tsx` | Artboard wrapper — header, ComposeDocumentView, click overlay, GenerationAnimation, handoff sequence, template fallback amber state |
| `app/canvas-v1/components/PromptPanel.tsx` | Legacy floating prompt (preserved for rollback, not rendered in V3.1) |
| `app/canvas-v1/hooks/useResize.ts` | Resize hook — pointer cycle, zoom-aware, aspect-ratio lock |
| `app/canvas-v1/components/ResizeHandles.tsx` | 8-handle resize UI for reference items |
| `app/canvas-v1/components/InspectorPanelV3.tsx` | 280px right rail — 4 exclusive tabs (Design/CSS/Export/Prompt), full-height per tab, selection-adaptive |
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
| `app/canvas-v1/components/ComposeDocumentViewV6.tsx` | V6 renderer — DesignNode trees as live HTML/CSS, full interaction layer (select, hover, drill-down, drag, resize, snap guides) |
| `app/canvas-v1/components/inspector/DesignNodeInspector.tsx` | V6 inspector — Position, Layout, Spacing, Typography, Fill, Appearance sections for DesignNode editing |
| `app/canvas-v1/hooks/useDragDesignNode.ts` | V6 drag-to-reposition — absolute-positioned DesignNodes, zoom-aware, shift-axis lock, snap guide integration |
| `app/canvas-v1/hooks/useSnapGuides.ts` | Smart snap guides — sibling edge/center alignment during drag, 5px threshold, cached bounds |
| `app/canvas-v1/components/DesignNodeResizeHandles.tsx` | V6 8-handle resize — corners + edges, shift aspect-lock, alt center-resize, min 20px |
| `app/canvas-v1/components/SnapGuideLines.tsx` | Magenta snap alignment line overlay — full-container lines at active snap positions |
| `app/canvas-v1/hooks/useDrag.ts` | Drag hook — pointer cycle, zoom-aware, shift-axis lock |
| `app/canvas-v1/hooks/useCanvasGestures.ts` | Pan/zoom — wheel, pinch, space+drag, middle-mouse |
| `app/canvas-v1/hooks/useCanvasKeyboard.ts` | Full keyboard shortcut set |
| `app/canvas-v1/hooks/useReferenceExtractor.ts` | Auto-extraction via /api/ai/tag |
| `lib/canvas/unified-canvas-state.ts` | V3 types, migration, persistence (load/save), GenerationStage/GenerationResult types, getGenerationStage() |
| `lib/canvas/canvas-reducer.ts` | Reducer — 30+ actions, history integration |
| `lib/canvas/section-library.ts` | 7 section templates (Hero, Proof, Features, Testimonials, Pricing, CTA, Footer) — PageNode factories |
| `lib/canvas/canvas-context.tsx` | React provider — load, debounced save, useCanvas hook |
| `lib/canvas/history.ts` | Snapshot-based undo/redo engine (pure functions) |
| `lib/canvas/compose.ts` | ComposeDocument types, `createInitialArtboards()`, `fitArtboardsToView()` |
| `lib/project-store.ts` | localStorage API for all project/reference/state data |
| `lib/ai/model-router.ts` | Multi-model AI router via OpenRouter |
| `app/canvas-v1/components/GenerationAnimation.tsx` | Canvas 2D generation animation — three-stage visualization (dots → bars → waves), failure/fallback states, 800ms handoff |
| `app/canvas-v1/components/SizingModeToast.tsx` | "Converted to Fixed" toast on Fill→Fixed resize conversion |
| `app/canvas-v1/components/inspector/ExportTab.tsx` | Export tab — selection/full-page scope, HTML preview, Copy HTML |
| `app/canvas-v1/components/TasteCard.tsx` | Extracted taste summary display in Prompt tab |
| `app/canvas-v1/components/ReferenceRail.tsx` | Horizontal reference image strip in Prompt tab |
| `app/canvas-v1/components/ComponentQuickPicker.tsx` | Quick insert popover — templates + recent + Browse All |
| `app/canvas-v1/components/ComponentGalleryPanel.tsx` | Full component gallery — filter tabs, search, card grid |
| `lib/canvas/design-component-library.ts` | 7 DesignNode section templates + saved component persistence |
| `lib/canvas/design-node-to-html.ts` | DesignNode → HTML conversion with inline styles |

### Pre-existing TypeScript Errors (not regressions)
- `canvas-client.tsx:525` — token merge type mismatch (`Record<string, unknown>` vs `Record<string, string>`)
- `UploadZone.tsx:31` — framer-motion `HTMLMotionProps` typing
- ~32 other errors across hooks, preloader, etc. — all pre-existing, `ignoreBuildErrors: true` in next.config.ts
