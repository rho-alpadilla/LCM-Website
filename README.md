# Lifechangers Ministry Incorporated Website

Zero-subscription-first, upgrade-ready church outreach platform built with Next.js, TypeScript, Cloudflare Workers, D1, Access, and R2.

## Current Status

The application foundation, Cloudflare bindings, and D1 access-control layer are
implemented. The application-side Cloudflare Access verifier and protected
administrative session/bootstrap endpoints are also implemented; provider
activation awaits the church domain. Cloudflare Workers, D1, Access, and R2 are
the approved production architecture. The Supabase authentication/authorization
prototype is preserved only as a reference until all of its behavior is migrated
and verified. Public content, giving, and prayer workflows are not production-ready.

## Requirements

- Node.js 20.9 or newer
- pnpm 11
- A Cloudflare account for hosted previews and production
- Docker Desktop only when running the preserved Supabase prototype locally

## Local Setup

1. Copy `.env.example` to `.env.local`.
2. Leave provider values empty while working on UI-only foundations. The current
   Supabase variables support the preserved prototype and will be removed only
   after the Cloudflare migration is complete.
3. Install dependencies with `pnpm install`.
4. Start the application with `pnpm dev`.
5. Open `http://localhost:3000`.

Local development uses Wrangler's local D1 and R2-compatible bindings. Generate
the binding types whenever `wrangler.jsonc` changes:

```text
pnpm cf:typegen
```

The server-only `SUPABASE_SERVICE_ROLE_KEY` is used only by the preserved
prototype. Never expose it through a `NEXT_PUBLIC_` variable or commit it to Git.

D1 migrations live in `migrations/d1`. Apply them to local Wrangler storage with:

```text
pnpm d1:migrations:list
pnpm d1:migrations:apply
```

Legacy prototype migrations live in `supabase/migrations`. Once Docker Desktop
is running, apply and test them locally with:

```text
pnpm supabase:start
pnpm supabase:reset
pnpm supabase:test
```

The reset command destroys only the local Supabase database. Never run a reset
against a hosted project.

## Legacy Prototype Setup

The following flow describes the preserved Supabase prototype and is not the
approved production login flow. Public sign-up is disabled:

1. Create and confirm one authentication user through Supabase Studio or the
   hosted Supabase dashboard.
2. Sign in at `/admin/login` with that user's email and password.
3. Enroll an authenticator app when prompted.
4. Complete the one-time System Administrator bootstrap form.

After the first administrator exists, the bootstrap transaction closes itself.
All additional staff accounts must be invited through `/admin/staff`. Local
invitation email can be opened through Supabase's local Mailpit interface.

## Verification

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

`/api/health` verifies that required Cloudflare bindings exist and that D1 can
answer a minimal query. It returns only a generic status and never exposes
resource names, account identifiers, or provider error details.

Run browser tests after installing Playwright's Chromium browser:

```text
pnpm exec playwright install chromium
pnpm test:e2e
```

## Cloudflare Preview

After dependencies and Cloudflare credentials are configured:

```text
pnpm preview:cf
```

Deployment is intentionally not performed during scaffolding.

Preview and production use distinct Worker, D1, and R2 resource names. Deployment
scripts select the environment explicitly so local resources cannot be mistaken
for production resources.

D1 and R2 bindings are configured. Cloudflare Access identity validation is the
next migration phase documented in `docs/CLOUDFLARE_MIGRATION_PLAN.md`.

On Windows, run the OpenNext Cloudflare build from WSL because its bundling
stage creates symbolic links that ordinary Windows sessions commonly block.

## Documentation

- `docs/PROJECT_BRIEF.md`
- `docs/ARCHITECTURE.md`
- `docs/DATABASE_SCHEMA.md`
- `docs/PERMISSION_MATRIX.md`
- `docs/CLOUDFLARE_MIGRATION_PLAN.md`
- `docs/CLOUDFLARE_ACCESS_SETUP.md`
- `docs/decisions/0001-cloudflare-zero-subscription-platform.md`
