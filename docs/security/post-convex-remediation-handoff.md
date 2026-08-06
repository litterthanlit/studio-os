# Post-Convex Remediation Handoff

## Context

The Supabase to Convex migration was committed and pushed to `main` as:

- Commit: `36c2721`
- Message: `Migrate backend to Convex`
- Branch used during work: `codex/stabilization-validation`

A post-migration security audit was run after that push. The app is safer than before, but it is **not production-ready**. The next agent should fix the findings below and re-run the audit gates.

Ignore these pre-existing untracked paths unless the user asks:

- `.playwright-cli/`
- `docs/superpowers/plans/2026-04-30-starter-canvas-implementation-handoff.md`
- `output/`
- `tmp/`

## Ground Rules

- Do not recreate public unauthenticated writes.
- Do not trust client-supplied `userId`, `email`, `role`, ownership, or admin flags.
- Every user-owned Convex read/write must verify the authenticated user.
- Every admin function must verify an explicit server-side admin role.
- Provider tokens and API keys must never reach the client.
- Public HTML and generated previews must not run with main app origin privileges.
- Use Convex validators on all function args.
- Add or update tests for every authorization boundary fixed.

## Recommended Fix Order

1. Wire real Convex auth and generated API.
2. Lock down unauthenticated provider routes.
3. Fix public HTML publish and preview isolation.
4. Move active canvas persistence from localStorage to Convex.
5. Fix token storage and migration plan.
6. Upgrade vulnerable dependencies.
7. Add regression tests and re-run the full audit checklist.

## Findings To Fix

### 1. Convex Auth Is Not Production-Wired

Severity: High

Files:

- `app/convex-provider.tsx`
- `app/auth/login/page.tsx`
- `convex/_generated/api.ts`
- Missing `convex/auth.config.*`

Evidence:

- Login page currently hard-errors that the Convex auth provider is not configured.
- `StudioConvexProvider` uses plain `ConvexProvider`.
- Generated Convex files are handwritten fallbacks.
- `npx convex codegen --typecheck disable` fails because `CONVEX_DEPLOYMENT` is not set.

Fix:

- Configure a real Convex deployment and auth provider.
- Add `convex/auth.config.ts` or equivalent.
- Replace placeholder auth UI with the real login flow.
- Run real Convex codegen and remove handwritten generated fallbacks.
- Ensure `users.storeCurrent` or equivalent user sync runs after login.
- Add an admin bootstrap path using trusted server-side data only.

Proof:

- Guest cannot call protected Convex functions.
- Logged-in user can load their own user record.
- Admin role is read from Convex/trusted claim, not from the client.
- Convex codegen passes.

### 2. Paid AI Compose Route Is Unauthenticated

Severity: Critical

File:

- `app/api/canvas/compose/route.ts`

Evidence:

- `POST` reads `req.json()` directly and calls `geminiEdit`.
- No auth check before paid provider usage.

Fix:

- Require auth before provider call.
- Use durable Convex-backed rate limits and provider budgets.
- Add request body size validation.
- Return safe errors without provider internals.

Proof:

- Guest gets `401`.
- Authenticated user is limited by per-user and global budget.
- Provider usage is logged by user, provider, route, day, and cost category.

### 3. Are.na Routes Proxy A Server Token Publicly

Severity: High

Files:

- `app/api/arena/route.ts`
- `app/api/arena/[channelSlug]/route.ts`

Evidence:

- Routes are unauthenticated.
- They use `ARENA_ACCESS_TOKEN` to fetch `/me/channels` and channel contents.

Fix:

- Require auth for server-token-backed requests.
- Prefer user-bound encrypted provider tokens.
- If anonymous/public Are.na access is required, do not use a server `/me` token.
- Move provider work into Convex actions where possible.

Proof:

- Guest cannot call server-token-backed Are.na endpoints.
- Client never receives tokens or raw privileged provider responses.
- Usage is durable-rate-limited and logged.

### 4. Lummi Route Uses Server API Key From A Public Endpoint

Severity: High

File:

- `app/api/lummi/route.ts`

Evidence:

- Unauthenticated `GET` uses `LUMMI_API_KEY`.
- Current protection is only IP-limited.
- Debug logs expose endpoint/key metadata.

Fix:

- Require auth unless this endpoint is intentionally public.
- If public, add anonymous durable limits plus global daily budget.
- Remove debug logs about key presence, key length, and endpoint internals.

Proof:

- Guest behavior is explicitly tested.
- Limits persist across server restarts/deploys.
- No secret metadata appears in logs.

### 5. Published Exports Serve Active HTML From Main Origin

Severity: Critical

Files:

- `convex/publicContent.ts`
- `app/published/[id]/route.ts`
- `app/canvas-v1/components/inspector/ExportTab.tsx`

Evidence:

- Arbitrary `html` is accepted and served as `text/html` from the main app origin.

Fix:

- Serve published HTML from a separate origin/subdomain with no app cookies.
- Add strict CSP and deny same-origin app privileges.
- Or sanitize and serve only static/non-executable output.
- Ensure only the project owner can publish.

Proof:

- Private projects remain private.
- Public export reads only work after explicit owner publish.
- Published HTML cannot read app cookies, localStorage, or same-origin app APIs.

### 6. Generated Preview Sandbox Is Unsafe

Severity: Critical

Files:

- `app/canvas-v1/components/ComponentPreview.tsx`
- `app/canvas-v1/canvas-client.tsx`
- `app/canvas-v1/components/CollectView.tsx`
- `app/canvas-v1/components/DesignNodeIframePreview.tsx`

Evidence:

- Generated TSX is executed with `new Function`.
- Multiple iframes use `sandbox="allow-scripts allow-same-origin"`.

Fix:

- Remove `allow-same-origin` from preview iframes.
- Isolate previews on a separate origin where possible.
- Block or validate generated code access to `window`, `document`, `parent`, `top`, `fetch`, navigation, storage, `eval`, and `Function`.
- Use strict `postMessage` origin checks.

Proof:

- Generated preview code cannot access main app origin storage or APIs.
- Preview can still render normal expected output.
- Browser test covers attempted escape.

### 7. Public Waitlist Convex Mutation Bypasses Route Limiter

Severity: Medium

File:

- `convex/waitlist.ts`

Evidence:

- HTTP/Next route rate limits before calling it.
- Direct public Convex mutation can bypass that route protection.

Fix:

- Make the raw insert internal-only, or
- Put durable rate limiting inside the public mutation itself.
- Do not trust caller-supplied IP or identity fields.

Proof:

- Direct Convex calls are limited.
- Duplicate/abusive submissions are rejected.
- Public write is intentionally scoped to waitlist only.

### 8. Active Project Persistence Still Depends On localStorage

Severity: High

Files:

- `lib/project-store.ts`
- `lib/canvas/unified-canvas-state.ts`
- `app/(canvas-view)/canvas/canvas-client.tsx`
- `app/canvas-v1/canvas-client.tsx`
- Convex functions: `projects.saveCanvas`, `projects.loadCanvas`

Evidence:

- Active UI still reads/writes localStorage.
- Convex save/load functions exist but are not wired into active UI.
- Quota errors can still drop state.

Fix:

- Load and save durable project/canvas state through Convex.
- Keep localStorage only as cache or draft fallback.
- Add revision/version conflict handling.
- Show recoverable save errors.
- Handle multiple tabs and offline retry.

Proof:

- New project persists after browser storage clear.
- Quota failure does not lose saved canvas state.
- Cross-user project access is denied.
- Concurrent edit conflict path is visible and recoverable.

### 9. Next.js And Dependency Vulnerabilities Remain

Severity: High

Files:

- `package.json`
- `package-lock.json`

Evidence:

- `next` is `16.1.6`.
- `eslint-config-next` is `16.1.6`.
- `npm audit --omit=dev --json` found 10 production vulnerabilities.
- `npm view next version` returned `16.2.6`.
- Audit also flagged `protobufjs`, `resend/svix/uuid`, `convex/ws`.

Fix:

- Upgrade `next` and `eslint-config-next` to a patched version.
- Re-run install, build, lint, typecheck, audit.
- Address remaining production advisories or document accepted residual risk.

Proof:

- `npm audit --omit=dev` has no critical/high untriaged findings.
- App builds on the upgraded Next version.

### 10. Token And Secret Cleanup Is Incomplete

Severity: High

Files:

- `.env.local` and deployment envs
- Supabase migration files
- Convex integration/token storage code

Evidence:

- Runtime Supabase code was removed.
- Local ignored env still contains Supabase URL/anon/service-role values.
- Supabase migrations remain and include plaintext integration token schema/comments.
- Provider token vault integration is not complete.

Fix:

- Remove Supabase env vars from local and deployment environments.
- Rotate Supabase keys if they were ever exposed or committed elsewhere.
- Finish encrypted provider token storage with a server-only key.
- Never return token values to the client.
- Store only scopes, account metadata, expiry, and status in user-visible data.

Proof:

- `rg -i "supabase|service_role|anon key"` shows no runtime dependency.
- Token query paths return metadata only.
- Token reads happen only inside trusted server-side functions/actions.

### 11. Data Migration Script Is Not Production-Import-Ready

Severity: Medium

File:

- `scripts/migrate-supabase-to-convex.ts`

Evidence:

- Dry-run passes with zero counts.
- Output includes fields like `legacyOwnerId` and `legacySupabaseId` that are not schema fields.
- No real Convex importer or two-phase ID resolution exists.

Fix:

- Add schema-compatible export transforms.
- Add a two-phase import with ID mapping.
- Preserve ownership, timestamps, publication status, integration metadata, and project links.
- Do not import plaintext OAuth/provider tokens.
- Add dry-run counts, post-import counts, and rollback instructions.

Proof:

- Dry-run shows source counts and transformed counts.
- Test import validates document shape against Convex schema.
- Rollback path is documented before production import.

## Required Regression Tests

Add automated tests where possible, or a clear manual verification script if the framework is not ready yet:

- Guest cannot call protected Convex mutations.
- Normal user cannot read or mutate another user's private project.
- Normal user cannot call admin inspiration/import/scoring functions.
- Admin can call admin inspiration functions.
- Public inspiration writes are impossible.
- Provider-backed routes require auth unless explicitly public.
- Durable rate limits persist across server restarts/deploys.
- Published export data is readable only after explicit publish.
- Preview code cannot access main app origin privileges.
- OAuth/provider tokens are never returned to the client.
- Supabase env vars are not required at runtime.

## Commands To Run Before Handoff Back

Run these and record results:

```bash
npm install
npm run typecheck
npm run lint -- --quiet
npm run build
npm audit --omit=dev
npx convex codegen --typecheck disable
npm run migrate:supabase:dry-run
```

If a test script is added:

```bash
npm test
```

## Definition Of Done

- Real Convex auth is configured and generated API files are produced by codegen.
- No unauthenticated route can trigger paid/provider APIs unless intentionally public and durably limited.
- No public Convex mutation can write sensitive or user-owned data.
- Admin Convex functions reject normal users.
- Active canvas/project state persists durably outside localStorage.
- Published HTML and generated previews cannot run with main app origin privileges.
- Provider tokens are encrypted or re-authorized, never plaintext-returned.
- Production dependency audit has no untriaged high/critical findings.
- Migration tooling can dry-run, import, validate counts, and roll back.
- Build, typecheck, lint, Convex codegen, migration dry-run, and auth/security regression tests pass.
