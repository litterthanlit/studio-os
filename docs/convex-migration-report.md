# Convex Migration Report

## Summary
- What was migrated: Supabase runtime clients, service-role inspiration routes, public share/published reads, share/publish writes, waitlist storage, durable provider rate-limit foundation, token vault scaffolding, project/reference/canvas Convex schema.
- What remains: production auth provider wiring, full client migration for Pinterest/import/search/reference embeddings, real data import into Convex, published HTML isolation, preview sandbox hardening.
- Biggest security improvements: no service-role Supabase routes, no public inspiration writes, explicit Convex admin guards, durable provider buckets, plaintext token storage replaced by encrypted-token design.
- Biggest remaining risks: auth is not wired to a real Convex/OIDC provider yet, published HTML is still served from the main app origin, generated previews remain same-origin sandbox work, old Supabase data still needs migration/rotation.

## Supabase to Convex Mapping
| Supabase table/route/client usage | New Convex table/function | Access model | Status |
|---|---|---|---|
| `profiles` | `users`, `roles`, `users.storeCurrent`, `users.setOnboardingComplete` | user-owned; admin via allowlist/role | scaffolded |
| `projects` | `projects`, `canvasDocuments`, `projects.upsertBySlug`, `projects.saveCanvas` | owner-only writes | scaffolded |
| `boards` | `boards` | owner-only | schema ready |
| `references`, `match_references` | `references`, `references.listMine`, `references.searchMine`, `references.updateTags` | owner-only | partial; vector ANN replaced by review-needed search |
| `integrations` plaintext tokens | `integrations`, `providerTokens.storeTokens` | server/action only; encrypted | scaffolded; needs auth wiring |
| `inspiration_images` | `inspirationImages`, `inspiration.listPublic`, `inspirationAdmin.*` | public read approved only; admin writes | migrated |
| `inspiration_likes`, `inspiration_daily` | `inspirationLikes`, `inspirationDaily` | user-owned | migrated |
| `/api/inspiration/admin/*` | `inspirationAdmin.*`, `inspirationAdminActions.*` | admin-only | old routes return 410 |
| `/api/export/publish`, `published_exports` | `publicContent.publishExport`, `publishedExports` | authenticated create; public active read | migrated |
| `/api/share`, `shares` | `publicContent.createShareLink`, `shareLinks` | authenticated create; public active read | migrated |
| `/api/waitlist` tmp storage | `waitlistEntries`, `waitlist.add` | public with durable rate limit | migrated |
| process-local API rate limits | `rateLimitBuckets`, `providerUsage` | server-secret or authenticated usage | migrated foundation |

## New Convex Schema
- `users`: identity mirror; indexed by token, subject, email; private.
- `roles`: explicit admin/member roles; indexed by user/role; admin-only writes.
- `projects`: owner-owned project metadata; indexes by owner, owner+slug, slug, status.
- `canvasDocuments` / `canvasSnapshots`: durable canvas state with revision conflict handling; owner-only.
- `references` / `boards`: user inspiration library; owner-only.
- `inspirationImages`, `inspirationLikes`, `inspirationDaily`, `inspirationImports`: curated feed and admin imports; public approved reads, user likes, admin writes.
- `publishedExports`, `shareLinks`: explicitly public only when active.
- `integrations`: encrypted provider tokens only; no client reads.
- `rateLimitBuckets`, `providerUsage`: durable abuse controls by namespace, subject, provider, route, day.
- `auditLogs`: admin/security events.
- `waitlistEntries`: durable public waitlist.

## Authorization Model
- Users are identified by `ctx.auth.getUserIdentity().tokenIdentifier`.
- Admins are identified by `roles.role === "admin"` or server-controlled `CONVEX_ADMIN_EMAILS`.
- Ownership is checked through `ownerId` fields in Convex helpers before reads/writes.
- Public functions: active share/published reads, approved inspiration reads, waitlist insert.
- Authenticated functions: projects, canvas, references, likes, publishing, share creation.
- Admin-only functions: all `inspirationAdmin` queries/mutations/actions.

## Files Changed
- `convex/*`: new schema, auth helpers, admin/user functions, rate limits, token vault, HTTP actions.
- `app/*`, `components/*`, `hooks/*`: switched publish/share/inspiration/admin flows to Convex or disabled old insecure routes.
- `lib/security/api-guard.ts`, `lib/convex/server.ts`: Convex-backed auth/rate-limit shims.
- `scripts/migrate-supabase-to-convex.ts`: dry-run migration transformer.
- `README.md`, `CLAUDE.md`, `.env.example`, `package.json`: Convex config and scripts.

## Removed Supabase Usage
- Removed imports: app/client/server Supabase imports, service-role clients, Supabase middleware.
- Removed env vars from docs: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- Removed service-role usage: old admin inspiration routes now return 410.
- Remaining Supabase references: `supabase/migrations/*` and migration script/table names are retained only as legacy migration input.

## Provider Abuse Controls
- Rate limits are stored in `rateLimitBuckets`.
- Usage aggregates are stored in `providerUsage`.
- Next routes use `CONVEX_INTERNAL_API_SECRET` to consume durable server-side buckets.
- Convex admin actions rate-limit by authenticated admin user.
- Public endpoints rate-limit by hashed/derived IP subject where no user exists.

## Token Storage
- Provider/OAuth tokens are stored in `integrations` as AES-GCM ciphertext.
- Encryption key: `PROVIDER_TOKEN_ENCRYPTION_KEY`, server-only.
- Tokens are only read/decrypted inside Convex actions.
- Existing plaintext Supabase tokens must be rotated or re-authorized; the migration script redacts them.

## Data Migration
- Migration script: `scripts/migrate-supabase-to-convex.ts`
- Dry run: `npm run migrate:supabase:dry-run -- --input tmp/supabase-export`
- Production flow: export Supabase tables as JSON, run transformer without `--dry-run`, resolve legacy IDs to Convex IDs, import into Convex, compare counts, then cut traffic.
- Validation counts: emitted to `counts.json`.
- Rollback: keep Supabase data read-only until Convex counts and authorization checks pass; switch env/routes back only if needed.

## Security Regression Checklist
- Guest access: needs-review until Convex auth provider is configured.
- User access: needs-review.
- Admin access: pass in Convex functions; needs live auth verification.
- Cross-user data access: pass in helper design; needs live tests.
- Public writes: pass for inspiration; waitlist intentionally public with limit.
- Provider API abuse: partial pass; durable buckets added.
- Published export access: needs-review; active public reads only, but same-origin risk remains.
- Preview sandbox impact: needs-review.
- Token exposure: pass in new design; existing tokens require rotation.
- Supabase removal: pass for runtime imports; legacy migrations retained.

## Commands Run
- `npm install convex`
- `npm uninstall @supabase/ssr @supabase/supabase-js`
- `npx convex codegen --typecheck disable --init` failed because `CONVEX_DEPLOYMENT` is not configured.
- `npm run typecheck` passed.
- `npm run lint` passed with existing warnings.
- `npm run lint -- --quiet` passed.
- `npm run migrate:supabase:dry-run` passed with zero input rows.
- `npm run build` passed. Next patched SWC lockfile entries and requested `npm install`.
- `npm install` passed after the build warning.

## Remaining Work Before Re-Audit
- Configure Convex deployment and real auth provider.
- Run real Convex codegen and deploy.
- Rotate/re-authorize existing provider tokens.
- Complete reference/search embedding migration.
- Move durable canvas save/load into active UI flows.
- Serve published HTML from a separate origin.
- Harden generated preview sandbox.
- Add live authorization tests against Convex dev/prod.
