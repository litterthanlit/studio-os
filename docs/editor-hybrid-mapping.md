# Editor shell ↔ Variant C hybrid (reference)

Static mock: [`ui-cleanup-pass/variant-c-hybrid.html`](./ui-cleanup-pass/variant-c-hybrid.html) (Geist, 1440×900). Use it for **layout hierarchy** and spacing checks in **light** chrome.

## Brand accent

The mock uses **#1E5DF2** (Vercel-like blue). The live editor uses Studio accent **#4B57DB** everywhere (`--accent` in `app/globals.css`). Selection washes map to **`#EDF1FE` / `#D1E4FC`** family to stay aligned with marketing-v2.

## Dimensions (live vs mock)

| Region | Hybrid mock | Live editor (canvas) |
|--------|-------------|----------------------|
| Mini rail | 44px | 44px (`MiniRail`) |
| Layers column | 200px | **200px** (`LayersPanelV3`) |
| Inspector | 288px | **288px** (`InspectorPanelV3`) |
| Bottom transport | ~32px pill | `EditorTransportBar` (tokenized) |
| Tab bar | 40px, mono uppercase + 2px underline | `InspectorTabs` |

## Manual pixel-compare checklist

1. Open the HTML file in a browser (fixed 1440×900).
2. Open `http://localhost:3000/canvas?project=sample-project` in another window; match zoom so widths align (or compare measurements in DevTools).
3. Confirm: rail width, layers/inspector gutters, section-rule density, bottom bar shadow presence (live uses design tokens, not necessarily identical blur values).
4. Toggle **editor** Light / Dark / System (rail sun icon or **Settings → Editor chrome**); artboard area should stay **light** (`--canvas-workspace`).

## When this doc changes

Update if panel widths or the hybrid HTML file moves; keep mock copy under `studio-os/docs/` so the repo is self-contained for design QA.
