# Canvas Crash Handoff

## Purpose
This document summarizes the Canvas crash investigation so Opus can understand:

- what broke
- what was fixed
- how the debugging unfolded
- which commits matter
- what to verify next

## User-Visible Symptoms

### 1. Vercel production builds started failing
The last three production deployments failed after recent Canvas/sidebar work.

Affected deployment chain:
- `8e2fb4d Collapse sidebar inside canvas`
- `7dee730 Simplify compose shell panels`
- `82e442e Add compose hand-tool panning`

### 2. After the build issue was fixed, Canvas still crashed at runtime
Clicking `Open Canvas` showed:

`Application error: a client-side exception has occurred while loading studio-os.io`

Production console showed:

- `Minified React error #418`
- `ReferenceError: Cannot access 'eO' before initialization`

This was later reproduced locally with a readable stack trace:

- `ReferenceError: Cannot access 'refreshCollectTaste' before initialization`

## Debugging Timeline

### Phase 1: Fix Vercel build failures
The build error was not three separate problems. It was one shared regression.

Root cause:
- `useSearchParams` had been added to the shared sidebar
- the sidebar renders broadly across app routes
- Next 16 treated this as a client-side rendering bailout during prerender
- the error surfaced on `/admin/inspiration`, even though the actual regression was in the shared navigation

Build error:
- `useSearchParams() should be wrapped in a suspense boundary at page "/admin/inspiration"`

Fix:
- removed `useSearchParams` from the shared sidebar
- switched to reading `window.location.search` inside a client effect only on Canvas routes

Commit:
- `0b5e81c Fix sidebar search params build regression`

Verification:
- local production build passed with webpack
- conclusion: the three failed Vercel deploys were all symptoms of the same sidebar change

### Phase 2: Suspect malformed persisted Canvas session state
Once the build passed, Canvas still crashed at runtime.

Initial hypothesis:
- stale or malformed localStorage state was being restored into Canvas
- recent work had increased reliance on persisted session objects
- likely candidates were `variants`, `composeDocument`, `analysis`, `designTokens`, and `tasteProfile`

First hardening pass:
- sanitized persisted `variants`
- sanitized persisted `composeDocument`
- guarded rehydration paths to fall back safely

Commits:
- `c34a61b Harden canvas session restore`
- `60f82ca Fix canvas runtime restore crash`

What that changed:
- invalid or partial `variants` no longer crash restore
- malformed `composeDocument` is sanitized before being used
- malformed `analysis`, `designTokens`, and `tasteProfile` are sanitized before render
- AI responses for analysis/system/taste profile are validated before setting state

Result:
- this reduced the risk of restore-path crashes
- but it did **not** fix the primary production crash

### Phase 3: Re-enable Playwright and get the real runtime stack
At first, Playwright was unreliable because Chrome was opening into an existing browser session and exiting immediately.

Later, Playwright was successfully reset and used against production and localhost.

Key production result:
- Canvas route loaded only the generic application error UI
- console showed:
  - `ReferenceError: Cannot access 'eO' before initialization`

Key local result:
- after starting a local Next dev server and loading `/canvas?project=acme-rebrand`
- the readable stack trace showed:
  - `ReferenceError: Cannot access 'refreshCollectTaste' before initialization`
- source location:
  - `app/canvas-v1/canvas-client.tsx`

This gave the real root cause.

## Actual Root Cause
Inside `CanvasPage`, a `useEffect` referenced `refreshCollectTaste` in its dependency array before that callback had been initialized.

This is a temporal dead zone bug in the client component. In development it appeared as:

- `Cannot access 'refreshCollectTaste' before initialization`

In the production bundle it appeared as:

- `Cannot access 'eO' before initialization`

This is why:
- local builds were passing
- restore hardening helped but did not fully resolve the crash
- the runtime still failed immediately when Canvas mounted

## Final Fix
The hook order in `CanvasPage` was corrected.

Specifically:
- the effect that debounces Collect refresh was moved to run **after**
  `refreshCollectTaste` is defined
- this removed the TDZ runtime error

Commit:
- `6818d9c Fix canvas collect refresh initialization`

## Verification Performed

### Local dev verification
Using Playwright against:
- `http://localhost:3020/canvas?project=acme-rebrand`

Result after `6818d9c`:
- Canvas loaded successfully
- route resolved to `?step=collect`
- no console errors
- UI rendered normally

Observed state:
- stepper visible
- Collect screen visible
- project-scoped sidebar behavior intact
- no application error boundary

### Local production verification
Command used:

```bash
NEXT_DIST_DIR=.next-build-verify npx next build --webpack
```

Result:
- build passed successfully

Note:
- Next modified `tsconfig.json` during verification by adding `.next-build-verify` include paths
- those changes were removed before commit

## Commit Sequence Relevant to the Crash

### Regression chain
- `8e2fb4d Collapse sidebar inside canvas`
- `7dee730 Simplify compose shell panels`
- `82e442e Add compose hand-tool panning`

### Fix chain
- `0b5e81c Fix sidebar search params build regression`
- `c34a61b Harden canvas session restore`
- `60f82ca Fix canvas runtime restore crash`
- `6818d9c Fix canvas collect refresh initialization`

## Current Understanding

### What is fixed
- Vercel build regression caused by shared sidebar `useSearchParams`
- Canvas restore hardening for malformed local session data
- the actual runtime TDZ crash in `CanvasPage`

### What should be true after deploy
- `Open Canvas` should no longer throw the generic application error
- Canvas should load into the correct project context
- persisted session restore should be safer than before

## Recommended Post-Deploy Checks

### Functional checks
- open `/projects/acme-rebrand`
- click `Open Canvas`
- confirm Canvas loads without the application error screen
- confirm Collect stage is visible
- confirm no console errors

### Persistence checks
- generate variants
- open Compose
- reload the page
- confirm variants and compose session still restore correctly

### Route checks
- confirm the compact Canvas sidebar still works
- confirm the back-to-project navigation still goes to `/projects/[id]`

## Important Takeaway
There were two separate classes of issues:

1. a shared build-time regression from the sidebar
2. a true client runtime TDZ crash inside `CanvasPage`

The build fix alone was not enough. The production crash was ultimately caused by hook/callback ordering inside the Canvas client component.
