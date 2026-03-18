# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

### Taste Engine (`lib/ai/`)

- `tagger.ts` — AI tagging of reference images via Gemini
- `image-scorer.ts` — scores images against taste profile
- `embeddings.ts` — OpenAI embeddings for similarity search
- `taste-profile-compat.ts` — bridges `TasteProfile` type to canvas pipeline

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
- **Geist Mono** — overline kickers (`.mono-kicker`), code, data values, mono labels.
- Scale: Display 28–36px → H1 22px → H2 17px → Body 14px → Small 13px → Caption 11px → Mono overline 10px.

### Icons
Lucide only. Sidebar: 18×18 `strokeWidth={1}`. Elsewhere: 16×16 `strokeWidth={1.5}` (14px in compact contexts like BottomBar).

### Key Patterns
- **`.mono-kicker`** — Geist Mono 10px uppercase tracking-widest `#A0A0A0`. Used for all section headers, panel labels, overline text.
- **Panel chrome** — `bg-white/95 backdrop-blur-sm border-[#E5E5E0]`. No dither, no decorative elements inside panels.
- **Form inputs** — `border border-[#E5E5E0] rounded-[2px] bg-white px-3 py-2 text-[13px] focus:border-[#D1E4FC] focus:ring-2 focus:ring-[#D1E4FC]/40`.
- **Ghost buttons** — `border border-[#E5E5E0] rounded-[4px] px-3 py-2 text-[12px] text-[#6B6B6B] hover:border-[#D1E4FC] hover:text-[#1E5DF2]`.
- **Primary buttons** — `bg-[#1E5DF2] text-white rounded-[4px] hover:bg-[#1A4FD6]`.
- **Filter pills** — Active: `bg-[#1E5DF2] text-white`. Inactive: `bg-[#F5F5F0] text-[#6B6B6B] hover:bg-[#E5E5E0]`.
- **List items** — compact rows (not big cards), 40px thumbnail, hover borders only.
- **Destructive actions** — `text-red-500 hover:text-red-600` link-style text, no red buttons.

### V2 Redesign Status

**Completed screens** (all use V2 hex tokens, mono-kicker headers, Bespoke Serif display headings):
- `app/(dashboard)/home/home-client.tsx` — greeting, search bar, project list, quick actions
- `app/(dashboard)/projects/projects-client.tsx` — filter pills, compact row list, "New Project" CTA
- `app/(dashboard)/type/type-client.tsx` — specimen panels, search/filter, font grid, detail slide-over
- `app/(dashboard)/settings/page.tsx` — grouped sections, appearance toggle, ghost buttons, destructive links
- `components/navigation/sidebar.tsx` — V2 logo mark, Bespoke Serif wordmark, blue active accent bar
- `app/canvas-v1/components/CollectView.tsx` — mono-kicker headers, V2 taste panel, generation controls, variant gallery, "Open in Compose" CTA
- `app/canvas-v1/components/LayersPanel.tsx` — 240px tree navigator, artboard switcher pills, recursive expand/collapse, selection sync
- `app/canvas-v1/components/InspectorPanel.tsx` — 280px, 4-tab bar, Content/Style/Layout/AI tabs, color swatches, empty state
- `app/canvas-v1/components/BottomBar.tsx` — 36px floating transport strip, editable zoom, panel toggle icons
- `app/canvas-v1/components/ComposeDocumentView.tsx` — point-and-edit selection (2px solid outline), hover (1px dashed), double-click inline text editing
- `app/canvas-v1/canvas-client.tsx` — side-by-side breakpoint artboards with fit-to-view, artboard headers ("DESKTOP · 1440PX"), blue top-border accent on desktop, bg-[#FAFAF8] canvas, AI regenerating halftone overlay, skeleton empty states, Reference/System slide-over docks (320px, right-edge, click-outside-to-close)

**Supporting components cleaned** (old semantic tokens replaced with V2 hex values):
- AnalysisPanel, CodeViewer, ComponentPreview, ExportActions, ReferenceGrid, SystemEditor, UploadZone

**Not yet redesigned** (still use old CSS variable tokens — functional but visually V1):
- `app/(dashboard)/explore/page.tsx`
- `app/(dashboard)/brief/brief-client.tsx`
- `app/(dashboard)/vision/vision-client.tsx`
- `app/(dashboard)/flow/flow-client.tsx`
- `app/(dashboard)/projects/project-room.tsx` + `[id]/project-room-page-client.tsx`

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

### Canvas Architecture (Compose Stage)
Framer-style spatial editor with parallel breakpoint artboards.
Three artboards per variant: Desktop (1440), Tablet (768), Mobile (375) with 80px gap.
Desktop artboard: `border-t-2 border-t-[#1E5DF2]`. Others: `border-t border-t-[#E5E5E0]`.
Artboard headers: `font-mono text-[10px] uppercase tracking-widest` showing "DESKTOP · 1440PX".
`fitArtboardsToView()` auto-frames all artboards on mount with 60px padding.

Panel widths: LayersPanel 240px, InspectorPanel 280px, Docks 320px.
All Compose panels: `bg-white/95 backdrop-blur-sm`, no dither.
References/System are right-edge slide-over drawers (320px, `shadow-lg`, click-outside closes).
BottomBar: floating centered transport strip, 36px, `max-w-[480px]`, editable zoom %.

Point-and-edit: click to select (`outline: 2px solid #1E5DF2`), double-click heading/paragraph for inline `contentEditable`.
Hover: `outline: 1px dashed #D1E4FC`. Escape deselects.
AI regenerating: halftone dot overlay on selected artboard + pulsing "Generating..." badge.

Canvas stages:
  collect = expressive, warm (halftone textures, editorial feel, warm gradient background)
  compose = precise, quiet (clean panels, tool-like, Framer aesthetic, `bg-[#FAFAF8]`)

### Key Files

| File | Purpose |
|------|---------|
| `app/globals.css` | Design tokens, `.mono-kicker`, `.app-shell::before` halftone, animations |
| `app/layout.tsx` | Google Fonts link for Bespoke Serif (Instrument Serif) |
| `components/navigation/sidebar.tsx` | V2 sidebar with LogoMark, Bespoke Serif wordmark, blue accent bar |
| `app/(dashboard)/home/home-client.tsx` | V2 home screen — greeting, search, project list, quick actions |
| `app/(dashboard)/projects/projects-client.tsx` | V2 projects list — filter pills, compact rows, "New Project" |
| `app/(dashboard)/type/type-client.tsx` | V2 type explorer — specimen panels, font grid, detail slide-over |
| `app/(dashboard)/settings/page.tsx` | V2 settings — grouped sections, appearance toggle, destructive links |
| `app/canvas-v1/canvas-client.tsx` | Main canvas (~5000 lines) — ComposeStage, artboards, docks, selection |
| `app/canvas-v1/components/CollectView.tsx` | Collect stage — references, taste panel, generation, variant gallery |
| `app/canvas-v1/components/LayersPanel.tsx` | 240px tree navigator with recursive expand/collapse |
| `app/canvas-v1/components/InspectorPanel.tsx` | 280px property editor — Content/Style/Layout/AI tabs |
| `app/canvas-v1/components/BottomBar.tsx` | Floating 36px transport strip — zoom + panel toggles |
| `app/canvas-v1/components/ComposeDocumentView.tsx` | Artboard renderer — point-and-edit, inline text editing |
| `app/canvas-v1/components/AsciiLoader.tsx` | Generation loading animation (pixel dissolve) |
| `lib/canvas/compose.ts` | ComposeDocument types, `createInitialArtboards()`, `fitArtboardsToView()` |
| `lib/project-store.ts` | localStorage API for all project/reference/state data |
| `lib/ai/model-router.ts` | Multi-model AI router via OpenRouter |

### Pre-existing TypeScript Errors (not regressions)
- `canvas-client.tsx:525` — token merge type mismatch (`Record<string, unknown>` vs `Record<string, string>`)
- `UploadZone.tsx:31` — framer-motion `HTMLMotionProps` typing
- ~32 other errors across hooks, preloader, etc. — all pre-existing, `ignoreBuildErrors: true` in next.config.ts