# CLAUDE.md

Guidance for AI agents working in the Studio OS codebase. Read this before writing code.

## Product

Studio OS is a **design harness** — it makes AI models produce better design output, calibrated to each designer's taste. Designers import references, the system extracts taste, and generation is constrained by that taste profile. Output is structured DesignNode JSON rendered on an infinite canvas with a full editing environment.

Benchmark proven: Raw 5/10, Harnessed 9/10, **Delta +4**.

## Commands

```bash
npm run dev                        # Dev server on port 3000
npm run build                      # Production build (TS errors ignored via next.config.ts)
npm run lint                       # ESLint 9 flat config
npm run db:push                    # Push Supabase migrations
npm run generate:marketing-images  # Fetch + crop Lummi images into public/marketing/
npm run benchmark                  # Full benchmark: taste extraction + raw vs harnessed + scoring
npm run benchmark:preflight        # Phase 1 only: taste extraction (no dev server needed)
```

No automated test suite. Manual browser testing is the primary verification method.

## Environment

Create `.env.local` with at minimum:

```
NEXT_PUBLIC_SUPABASE_URL=your-project-ref
NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder
```

If `NEXT_PUBLIC_SUPABASE_URL` contains `your-project-ref`, middleware bypasses auth — no real Supabase needed for UI work.

External features degrade gracefully: `OPENROUTER_API_KEY` (AI generation), `OPENAI_API_KEY` (embeddings), `LUMMI_API_KEY` (stock photos), `RESEND_API_KEY` (waitlist emails).

## Architecture

### Route Groups

```
app/
├── (dashboard)/       # Main app — sidebar + dot-grid
├── (canvas-view)/     # Fullscreen canvas — no sidebar
├── (marketing)/       # Public marketing site
├── api/               # Route handlers
├── auth/              # Supabase auth callbacks
├── onboarding/        # New user onboarding
├── share/             # Public share pages
└── published/         # Published export pages
```

### Data Layer

All project data lives in **localStorage** under `studio-os:*` keys via `lib/project-store.ts`. No server round-trips for core features. Supabase is used only for authentication, taste embeddings, and published exports.

### Canvas Data Model

`UnifiedCanvasState` with flat `items: CanvasItem[]` array. Six item kinds:

| Kind | Purpose |
|------|---------|
| `reference` | Imported reference images with taste extraction |
| `artboard` | Breakpoint-scoped design containers (desktop/mobile) with DesignNode tree |
| `frame` | Canvas-surface frames — DesignNode fields inlined (single-level, no wrapper) |
| `text` | Canvas-surface text — DesignNode fields inlined |
| `note` | Sticky notes |
| `arrow` | Annotation arrows |

**Selection model:** `activeItemId` gates which item's node tree is editable. `selectedNodeId` / `selectedNodeIds` for nodes within the active item. Any item with DesignNode content (artboard, frame, text) can be active.

**State engine:** `useReducer` with 50+ action types. Snapshot-based undo/redo (max 50 entries, in-memory). Canvas provider in `lib/canvas/canvas-context.tsx`.

### V6 DesignNode Model

5 universal node types: `frame | text | image | button | divider`. Expanded CSS style model (positioning, CSS Grid, coverImage backgrounds, gradients, transforms, blend modes, clip paths, effects). Hybrid layout: auto-layout by default, absolute positioning for breakout.

Width/height type: `number | "hug" | "fill"`.

### AI Generation Pipeline

```
References → /api/taste/extract → TasteProfile
                                      ↓
                        compileTasteToDirectives() → HARD/SOFT/AVOID directives
                                      ↓
                        buildDesignTreePrompt() → model → DesignNode JSON
                                      ↓
                        validateAndNormalizeDesignTree() → resolveDesignMediaUrls()
                                      ↓
                        1+1 variant derivation (base + pushed)
                                      ↓
                        REPLACE_SITE → artboards on canvas
```

**Taste loop (closed):** Generate → compare variants → pick → edit → confirm taste changes → reference own work → generate better.

- **Weighted references:** star/default/mute per reference (2x/1x/0x in extraction)
- **Section-level regeneration:** right-click section → "Regenerate similar/different"
- **Variant comparison:** carousel tabs (Base/Pushed) on artboard, PICK_VARIANT to commit
- **Generation-as-reference:** right-click section → "Use as Reference" (html-to-image capture)
- **Feedback loop:** taste edit detection at generation boundary, userOverrides become hard constraints

### Theme System

Editor chrome: **Light | Dark | System** stored in localStorage. `data-theme` attribute on editor root. Semantic tokens in `app/globals.css`. Dashboard/marketing use `next-themes` separately.

Dark mode: `@custom-variant dark` in `globals.css` ties Tailwind's `dark:` to `[data-theme="dark"]`. Use semantic classes (`bg-card-bg`, `text-text-secondary`) inside the editor.

## Design System

### Colors (hex values directly — no CSS variable indirection)
- Accent: `#4B57DB` / hover: `#3D49C7` / light: `#D1E4FC` / subtle: `#EDF1FE`
- Backgrounds: `#FAFAF8` (primary), `#F5F5F0` (panels), `#FFFFFF` (surfaces)
- Borders: `#EFEFEC` (chrome, 0.5px), `#E5E5E0` (controls, 1px), `#4B57DB` (active, 1.5px)
- Text: `#1A1A1A` (primary), `#6B6B6B` (secondary), `#A0A0A0` (muted)

### Typography
- **Bespoke Serif** (`font-serif`) — display headings only. NEVER for body or UI.
- **Geist Sans** — all UI text, body, buttons, labels.
- **IBM Plex Mono** — overline kickers (`.mono-kicker` 10px uppercase tracking-[1px] `#A0A0A0`), code, data.

### Radius
`rounded-[2px]` (inputs), `rounded-[4px]` (cards/buttons), `rounded-[6px]` (containers). No `rounded-xl` or pill shapes.

### Icons
Lucide only. Sidebar: 18px `strokeWidth={1}`. Elsewhere: 16px `strokeWidth={1.5}`.

### Rules
1. Violet-blue `#4B57DB` is the ONLY accent color
2. Panel chrome: solid `bg-white`, no blur, no transparency
3. Panel headers: `.mono-kicker` pattern
4. Compact list rows (40px thumb, hover borders), not big cards
5. No decorative gradients, heavy shadows, or emojis
6. All inputs: `focus:border-[#D1E4FC] focus:ring-2 focus:ring-[#D1E4FC]/40`

## Key Files

### Canvas & State
| File | Purpose |
|------|---------|
| `lib/canvas/unified-canvas-state.ts` | All types: CanvasItem, FrameItem, TextItem, ArtboardItem, UnifiedCanvasState |
| `lib/canvas/canvas-reducer.ts` | 50+ actions, history integration, updateItemTree helper |
| `lib/canvas/canvas-context.tsx` | React provider, load/save, useCanvas hook |
| `lib/canvas/canvas-item-conversion.ts` | canvasItemToDesignNode, designNodeToCanvasItem, getNodeTree, withUpdatedTree |
| `lib/canvas/design-node.ts` | DesignNode types, tree walkers, clone helpers |
| `lib/canvas/design-style-to-css.ts` | DesignNodeStyle → React CSSProperties |

### Rendering & Interaction
| File | Purpose |
|------|---------|
| `app/canvas-v1/components/UnifiedCanvasView.tsx` | Main canvas — items, gestures, drag, tools |
| `app/canvas-v1/components/ComposeDocumentViewV6.tsx` | V6 renderer — live HTML/CSS, full interaction |
| `app/canvas-v1/components/CanvasArtboard.tsx` | Artboard wrapper — header, renderer, generation animation |
| `app/canvas-v1/components/CanvasFrame.tsx` | Canvas-level frame renderer |
| `app/canvas-v1/components/CanvasText.tsx` | Canvas-level text renderer |
| `app/canvas-v1/components/VariantCarousel.tsx` | Pill tabs for variant comparison |

### Inspector & Panels
| File | Purpose |
|------|---------|
| `app/canvas-v1/components/InspectorPanelV3.tsx` | Right rail — Design/CSS/Export tabs |
| `app/canvas-v1/components/inspector/DesignNodeInspector.tsx` | V6 inspector — all property sections |
| `app/canvas-v1/components/LayersPanelV3.tsx` | Tree navigator — Site/Canvas/References/Notes groups |
| `app/canvas-v1/components/FloatingPromptPanel.tsx` | Floating prompt panel |
| `app/canvas-v1/components/PromptComposerV2.tsx` | Generation pipeline + taste feedback dialog trigger |
| `app/canvas-v1/components/EditorTransportBar.tsx` | Bottom toolbar — tools, zoom, generate, undo/redo |

### AI & Taste
| File | Purpose |
|------|---------|
| `app/api/canvas/generate-component/route.ts` | Generation API — single + variant modes |
| `lib/canvas/design-tree-prompt.ts` | Prompt builder — full page + section-level |
| `lib/canvas/design-tree-validator.ts` | Validates/normalizes AI output |
| `lib/canvas/design-media-resolver.ts` | Resolves photo intents to stock URLs |
| `app/api/taste/extract/route.ts` | Taste extraction from references |
| `lib/canvas/directive-compiler.ts` | TasteProfile → HARD/SOFT/AVOID directives |
| `lib/canvas/taste-edit-tracker.ts` | Detects taste-divergent edits for feedback loop |
| `lib/canvas/section-context-builder.ts` | Sibling section summaries for section regen |
| `types/taste-profile.ts` | TasteProfile type with userOverrides |

### Export
| File | Purpose |
|------|---------|
| `lib/canvas/design-node-to-html.ts` | DesignNode → HTML (inline styles, responsive classes) |
| `lib/canvas/build-export-zip.ts` | ZIP handoff (index.html + README) |
| `app/canvas-v1/components/inspector/ExportTab.tsx` | Export UI — scope, format, ZIP, publish |
| `app/api/export/publish/route.ts` | Publish to shareable URL |

## Constraints (DO NOT violate)

- `PUSH_HISTORY` BEFORE the mutation it records
- All structural actions sync across same-`siteId` artboards
- Text nodes: double-click goes straight to contentEditable, NO popover
- Keep UI in the design system — no new colors, no emojis
- No `rounded-xl`, `rounded-lg`, or CSS variable tokens — use direct hex
- Canvas-level FrameItem/TextItem: single-level model (DesignNode fields inlined, no wrapper)
- `activeItemId` (not `activeArtboardId`) — any editable item can be active
- `getNodeTree()` / `withUpdatedTree()` for tree access — never access `.pageTree` directly in new code

## Caveats

- `useSearchParams()` must be in a `<Suspense>` boundary (caused production build outage)
- `@react-pdf/renderer` requires `transpilePackages` in `next.config.ts`
- `ignoreBuildErrors: true` is intentional — ~32 pre-existing TS errors are not regressions
- Marketing images (`public/marketing/*.webp`) are gitignored — run `npm run generate:marketing-images`
- `.next-build-verify/` is a stale build cache — in `.gitignore` + `.vercelignore`, do not commit
