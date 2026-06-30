# Project Kickoff Context

> Copy this file as `CLAUDE.md` into the root of any new project. Claude Code auto-loads it on every session, so anything in here becomes shared context without you having to re-explain it. Trim the parts that don't apply to the new project before saving.

---

## About the user (Richard)

- Restaurant owner running a London Tex-Mex group. Builds side projects to support the business.
- **No formal coding background.** Uses Claude Code for all code changes — does not write or hand-edit code directly.
- Wants explanations in **plain English, focused on business outcomes** ("this means an invoice line will now show…"), not abstract engineering jargon.
- Prefers **short responses**. Skip preamble; lead with the result or the recommendation.
- When you're about to do something hard to reverse (DB migrations, force pushes, destructive deletes), **confirm before acting**.
- Production systems take priority: reliability and safety beat cleverness. If a feature can ship simpler and safer, do that.
- Comfortable being asked clarifying questions when ambiguity is real — but spend a minute looking at the code first; don't ask things you could grep.

---

## Default stack

Unless the new project clearly calls for something else, start with:

- **Framework**: Next.js 14+ (App Router, TypeScript). `next@^14`, `react@^18`, `react-dom@^18`.
- **Hosting**: Vercel (deploy via `git push` to main). Crons defined in `vercel.json`.
- **Database**: Vercel Postgres via `@vercel/postgres` (`import { sql } from '@vercel/postgres'`). Auto-provisioned; uses `POSTGRES_URL`.
- **Styling**: Tailwind CSS (`tailwindcss@^3`), brand accent typically `amber-600`.
- **Auth**: Custom admin login (no third-party auth lib). `bcryptjs` for password hashing, sessions stored in a `admin_sessions` Postgres table with httpOnly cookies. Rate-limit login attempts (5 / 15 min).
- **Email**: Resend (`resend@^6`). Plain HTML + text templates inline (no react-email unless explicitly wanted).
- **SMS** (if needed): Twilio.
- **No tests, no Storybook, no monorepo tools** unless the project genuinely needs them. Keep it lean.

---

## Conventions Richard's projects already use

These are the patterns repeated across his projects — match them by default so things feel consistent.

### File layout

```
app/
  api/
    admin/...            # protected admin endpoints
    <public>/route.ts    # public endpoints (sync crons, public reads)
  admin/
    layout.tsx           # admin nav + auth check
    login/page.tsx
    <section>/page.tsx   # admin sections (settings, transfers, etc.)
  page.tsx               # public-facing landing
middleware.ts            # protects /admin/* (redirects to login if no session)
lib/
  db.ts                  # ALL database operations live here, one file
  auth.ts                # session creation, requireAuth(), rate-limiting
  email.ts               # all email templates + send functions
  <integration>.ts       # one file per external integration (oauth, lightspeed, ...)
```

### URL structure

- `/` — public-facing
- `/admin/login` — admin login
- `/admin/<section>` — protected admin pages (settings, transfers, etc.)
- `/api/admin/<feature>` — protected admin API (uses `requireAuth(request)` at top of every handler)
- `/api/<public>` — public endpoints, no auth (Vercel crons hit these; `/api/sync` is the canonical example)
- Middleware blocks `/admin/*` if no session cookie; API routes additionally call `requireAuth(request)` because middleware can be bypassed.

### Database conventions

- **One `lib/db.ts` file** holds every query. Don't sprinkle SQL across route handlers.
- Tables are created via `initializeTransferTables()`-style functions that use `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for migrations. Idempotent; safe to call at boot.
- Gate the init with a module-level boolean (`let tablesReady = false`) so it only runs once per serverless instance, not per request.
- Use the tagged-template `sql\`SELECT ...\`` for normal queries. Use `sql.query(text, params)` only when you need parameterised arrays (e.g. `WHERE id = ANY($1::int[])`).
- Always parse numerics back from string (`parseFloat`, `parseInt`) — `pg` returns DECIMAL as strings.
- Snapshot critical fields onto historical rows (e.g. `transfer_lines` stores `cost_gbp` per line) so changing the master record never silently rewrites past totals. This is a hard rule for anything that becomes an invoice.

### API routes

- Every admin route starts with:
  ```ts
  export const dynamic = 'force-dynamic';
  export const revalidate = 0;

  export async function GET(request: NextRequest) {
    const authError = await requireAuth(request);
    if (authError) return authError;
    // ...
  }
  ```
- Never return stack traces in error responses. Log them with `console.error('[FEATURE] context:', err)` and return a short user-safe message.
- Public endpoints (`/api/sync`, etc.) must remain auth-free for Vercel crons — note this explicitly in comments.

### Frontend

- Client components use `'use client'` at the top.
- Tailwind utilities only — no CSS modules, no styled-components.
- Mobile-first: build a stacked-card layout for mobile + a table layout for `md:` and up. iOS Safari zooms in on `<input>` with font-size < 16px — always use `text-base md:text-sm` on form inputs.
- Brand accent: `amber-600` for primary actions, `red-500/600` for destructive, `green-600` for positive states.
- Use confirmation dialogs (`confirm()` or a custom `ConfirmDialog` component) before destructive actions.

### Background work & crons

- Vercel crons defined in `vercel.json` hitting `/api/<job>/route.ts`. Default cadence for live counters is `* * * * *` (every minute).
- Per-instance in-memory caches are fine for read-heavy public endpoints (e.g. 30s TTL on a public count), but document that they don't share across serverless instances and don't store anything where stale data is dangerous.
- Auto-clean log tables to ~7 days at the end of cron runs; don't let them grow unbounded.

### Email / notifications

- Send via `resend.emails.send({ from, to, subject, text, html })`. Always include both `text` and `html`.
- Inline CSS in `<style>` blocks (most email clients still strip linked stylesheets).
- Wrap user-supplied text with an HTML escape helper before injecting into templates.
- Apply a cooldown table (`notification_log`) so the same alert doesn't fire every minute. Connection-loss alerts use 1h cooldown; standard alerts use 24h (overridable via `NOTIFICATION_COOLDOWN_HOURS`).

---

## Required env vars (typical)

```
# Database
POSTGRES_URL=

# Admin auth
ADMIN_PASSWORD=<bcrypt-hash; generate with:
  node -e "const b=require('bcryptjs');b.hash('pwd',10).then(console.log)">
ADMIN_EMAIL=
SESSION_SECRET=<random 32-byte hex>

# Public URL (used in email links)
NEXT_PUBLIC_BASE_URL=

# Initialisation guard
INITIALIZE_TOKEN=<random secret; gates any one-time setup endpoint>

# Email (Resend)
RESEND_API_KEY=
EMAIL_FROM=
NOTIFICATION_COOLDOWN_HOURS=24

# SMS (only if needed)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
```

Add an `.env.example` to the repo with placeholder values so a fresh checkout is self-documenting.

---

## Security defaults

- `ADMIN_PASSWORD` is **always** a bcrypt hash, never plaintext. Code should reject anything that isn't a valid bcrypt string.
- Session cookies: `httpOnly`, `secure` (production), `sameSite=lax`, expiry 24h.
- CSP header set in `next.config.mjs` (already in place — copy it across).
- Never return stack traces in API error responses.
- Rate-limit login: 5 attempts per 15-minute window per IP (in-memory per instance is fine for low traffic).
- If you add a public POST endpoint, think about CSRF and rate limits explicitly.

---

## Gotchas worth remembering

- `@vercel/postgres` returns DECIMAL columns as **strings**. Wrap with `parseFloat`/`parseInt` immediately.
- Vercel serverless instances **don't share memory**. Anything in a module-level Map/Set is per-instance only. Don't put authoritative state there.
- Vercel crons can run on cold serverless instances — keep the cron path's startup cheap.
- iOS Safari font-size zoom on inputs (mentioned above) catches Richard out every time. Default to `text-base md:text-sm`.
- The Vercel build will type-check everything in `**/*.ts(x)`. Run `npx next build` locally before committing if you've touched typed APIs.

---

## Recommended kickoff checklist for a new project

When Richard starts a new project:

1. Create the repo, push initial Next.js scaffold (`npx create-next-app@latest --typescript --tailwind --app`).
2. Drop this file in as `CLAUDE.md`. Edit the "About the project" section below.
3. Add `.env.example` with the env vars above (trim what's not needed).
4. Set up Vercel project + Postgres + Resend + (optional) Twilio integrations. Pull env vars with `vercel env pull`.
5. Build the admin auth foundation first: `middleware.ts`, `lib/auth.ts`, `lib/db.ts` (with `admin_sessions` + an init function), `/admin/login` page, and a protected `/admin` landing.
6. Once auth works end-to-end, build the actual feature.

---

## About this project (fill in for each new project)

- **What it does**: …
- **Who uses it**: …
- **Critical paths** (places where bugs hurt the most): …
- **Key URLs / external systems**: …
- **Anything unusual** (non-default integrations, custom flows): …
