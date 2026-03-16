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

## Design System (Studio OS Redesign V1)
 
Light mode only. No dark theme for V1.
 
### Colors
- Accent: #1E5DF2 (primary blue)
- Accent light: #D1E4FC (highlights, badges, active backgrounds)
- Accent hover: #1A4FD6
- Backgrounds: #FAFAF8 (primary), #F5F5F0 (secondary/panels), #FAFAFA (tertiary)
- Surface: #FFFFFF (cards, inputs), hover: #F5F5F0
- Borders: #E5E5E0 (default), #D1E4FC (active/focus)
- Text: #1A1A1A (primary), #6B6B6B (secondary), #A0A0A0 (muted)
 
### Radius
Sharp corners, Cursor-style: 2px (sm), 4px (md), 6px (lg), 8px (xl).
No rounded-xl (12px+), no pill shapes except avatars/dots.
 
### Typography
Geist Sans for UI. Geist Mono for code/ASCII elements.
Scale: Display 28px, H1 22px, H2 17px, Body 14px, Small 13px, Caption 11px, Overline 10px.
 
### Icons
Lucide only. Sidebar: 18x18 strokeWidth=1. Elsewhere: 16x16 strokeWidth=1.5.
 
### Architecture
Two stages: "collect" (references + generate) and "compose" (Framer-style canvas).
Compose has fixed LayersPanel (left 220px), InspectorPanel (right 280px), BottomBar.
Breakpoints as side-by-side artboards: Desktop 1440, Tablet 768, Mobile 375.
 
### Key files
- app/globals.css — all design tokens
- app/canvas-v1/canvas-client.tsx — main canvas (~4800 lines)
- app/canvas-v1/components/AppSidebar.tsx — global sidebar
- app/canvas-v1/components/LayersPanel.tsx — Compose left panel
- app/canvas-v1/components/InspectorPanel.tsx — Compose right panel
- app/canvas-v1/components/BottomBar.tsx — Compose bottom toolbar
- app/canvas-v1/components/AsciiLoader.tsx — generation loading animation
- app/canvas-v1/components/CollectView.tsx — references + generation UI
- lib/canvas/compose.ts — ComposeDocument types and utilities
- See studio-os-redesign-plan.md for full redesign specification.