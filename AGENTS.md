# Studio OS

A Next.js 16 creative studio management web app (moodboards, typography, projects, briefs, focus mode).

## Cursor Cloud specific instructions

### Running the app

- **Dev server:** `npm run dev` (port 3000).
- The app requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` env vars. If these are missing or contain the placeholder `your-project-ref`, the middleware bypasses auth and the app runs with demo/static data — no real Supabase instance needed for UI development.
- A `.env.local` with placeholder values is sufficient for local development without Supabase.

### Lint / Build / Test

- **Lint:** `npm run lint` (ESLint 9 flat config). The codebase currently has pre-existing lint warnings/errors; these are not regressions.
- **Build:** `npm run build`. TypeScript build errors are ignored via `ignoreBuildErrors: true` in `next.config.ts`.
- **No automated test suite** exists (no Jest, Vitest, or similar configured). Manual browser testing is the primary verification method.

### Key caveats

- External API features (AI tagging via Google Gemini, embeddings via OpenAI, Pinterest/Are.na imports, Lummi stock photos, Resend email) degrade gracefully without their respective API keys.
- The auth redirect for unauthenticated users is intentionally bypassed in `middleware.ts` (commented out), so all routes are accessible without login during development.
- `@react-pdf/renderer` is listed in `transpilePackages` in `next.config.ts` — this is required for the PDF export feature to work with App Router.
