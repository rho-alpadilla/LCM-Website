# Lifechangers Ministry Incorporated Website

Zero-subscription-first, upgrade-ready church outreach platform built with Next.js, TypeScript, Cloudflare Workers, D1, Access, and R2.

## Current Status

The application foundation, Cloudflare bindings, D1 access control, and the
application-side Phase 3 staff lifecycle are implemented. Admin pages now use
Cloudflare Access identity plus D1 invitations, activation, roles, suspension,
and audit records. Provider activation awaits the church domain. The Supabase
prototype remains only as inactive rollback/reference code. Public content,
giving, and prayer workflows are not production-ready.

## Requirements

- Node.js 20.9 or newer
- pnpm 11
- A Cloudflare account for hosted previews and production
- Docker Desktop only when running the preserved Supabase prototype locally

## Local Setup

1. Copy `.env.example` to `.env.local`.
2. Leave provider values empty while working on public UI foundations. Admin
   sign-in remains unavailable until the Access application values are set; no
   insecure local password or header bypass is provided.
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

## Preserved Legacy Prototype

Supabase helpers, migrations, and tests are retained for rollback/reference.
They are not connected to the active `/admin` routes and must not be deployed as
the production backend. Their deletion remains a separately approved cleanup
task after the Cloudflare replacement is verified in preview.

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

D1 and R2 bindings are configured. The Access application, exact-email policy,
and non-secret audience/team values must be added after the domain exists. See
`docs/CLOUDFLARE_ACCESS_SETUP.md`.

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
