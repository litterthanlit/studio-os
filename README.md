# Studio OS

A design harness that makes AI models produce better design output, calibrated to each designer's taste. Import references, extract taste, constrain generation, edit on an infinite canvas.

**Live:** [studio-os.io](https://studio-os.io)

## Quick Start

```bash
npm install
cp .env.example .env.local  # or create manually (see below)
npm run dev                  # http://localhost:3000
```

### Environment

Minimum `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your-project-ref
NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder
```

With `your-project-ref` as the URL, auth is bypassed and the app runs on local data. Optional keys for full features: `OPENROUTER_API_KEY` (AI generation), `LUMMI_API_KEY` (stock photos), `OPENAI_API_KEY` (embeddings).

## For AI Agents

Read these before writing code:
- **`CLAUDE.md`** — codebase guide (architecture, commands, design system, constraints, key files)
- **`AGENTS.md`** — role definitions (CEO, COO, Creative Director, QA), project history, decision authority

## Architecture

- **Framework:** Next.js 14, App Router, TypeScript
- **Canvas:** Infinite canvas with V6 DesignNode renderer (5 node types, live HTML/CSS)
- **State:** `useReducer` with 50+ actions, snapshot undo/redo
- **Storage:** localStorage-first, Supabase for auth + published exports
- **AI:** Multi-model via OpenRouter (Claude Sonnet 4.6, Gemini Flash)
- **Taste Engine:** Reference extraction → directive compilation → constrained generation → feedback loop

## Marketing Images

Marketing backgrounds are gitignored. Generate locally:
```bash
# Requires LUMMI_API_KEY in .env.local
npm run generate:marketing-images
```
