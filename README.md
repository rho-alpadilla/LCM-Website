# Lifechangers Ministry Incorporated Website

Zero-subscription-first, upgrade-ready church outreach platform built with Next.js, TypeScript, Cloudflare Workers, D1, Access, and R2.

## Current Status

Phases 1 through 4 are complete in the local codebase. Admin pages use
Cloudflare Access identity plus D1 invitations, activation, roles, suspension,
and audit records. The public site reads only published content, expands
upcoming activities, and delivers approved R2 files through protected routes.
Phase 5 protected prayer workflows and the minimal PayMongo hosted-checkout
flow are implemented locally. Cloudflare Access is active for the temporary
`workers.dev` preview's admin route. PayMongo and Turnstile activation, plus
all production-provider verification, await the final domain/launch stage.
Phase 6 public outreach pages and workflows are implemented: About, Contact,
Join a Ministry, a monthly activities planner, consistent public navigation,
and protected staff inquiry handling. Contact and Ministry Interest submissions
remain intentionally disabled until Turnstile is configured for the final
church domain. See `docs/PHASE_6_PUBLIC_OUTREACH_PLAN.md`.

Local development opens `/admin` as one clearly labelled, synthetic System
Administrator on `localhost` only. It uses local D1/R2, never replaces
Cloudflare Access in preview or production, and keeps PayMongo unavailable
until its separate test-mode setup.

## Code Organization

The frontend and backend have separate source folders but remain one Next.js
application, one local development server, and one website deployment.

```text
src/app/         URL entry points, route metadata, layouts and error boundaries
src/frontend/    Public/admin screens, reusable UI and display helpers
src/backend/     Protected queries, actions, HTTP handlers, services and D1 access
src/shared/      Runtime-neutral types, schemas, labels and public configuration
migrations/d1/   Active database migrations (unchanged by the source refactor)
tests/e2e/       Browser regression and accessibility tests
```

Start with [the code structure guide](docs/CODE_STRUCTURE.md) to find the right
place for a change. `pnpm lint` enforces the source dependency boundaries.

## Requirements

- Node.js 20.9 or newer
- pnpm 11
- A Cloudflare account for hosted previews and production

## Local Setup

1. Copy `.env.example` to `.env.local`.
2. Leave provider values empty while working on public UI foundations.
3. Install dependencies with `pnpm install`.
4. Start the application with `pnpm dev`. Pending local D1 migrations are
   applied automatically before Next.js starts.
5. Open `http://localhost:3000` or `http://localhost:3000/admin`.

If PowerShell cannot find `pnpm.cmd`, use `corepack.cmd pnpm` in place of
`pnpm` for these commands (for example, `corepack.cmd pnpm dev`). The folder
reorganization does not change the startup commands.

Local development uses Wrangler's local D1 and R2-compatible bindings. Generate
the binding types whenever `wrangler.jsonc` changes:

```text
pnpm cf:typegen
```

D1 migrations live in `migrations/d1`. `pnpm dev` applies pending migrations to
local Wrangler storage automatically. To inspect or apply them separately:

```text
pnpm d1:migrations:list
pnpm d1:migrations:apply
```

## Local Development Administrator

During `pnpm dev`, `/admin` automatically uses one fixed
`local-development-admin@lifechangers.test` System Administrator identity when
the request is on `localhost` or `127.0.0.1`. A warning banner remains visible
so local data cannot be mistaken for real church data. The helper requires both
the local Worker environment and Next.js development mode; it does not run in
a preview or production build. Cloudflare Access remains the only deployed
staff sign-in method.

## Verification

```text
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
```

Use `pnpm format` only when you intentionally want Prettier to rewrite source
formatting. `.editorconfig` and `.gitattributes` keep future edits consistent
across Windows, macOS and Linux without rewriting existing files automatically.

## Continuous integration

GitHub Actions runs the same formatting, lint, typecheck, unit-test and
production-build checks on pushes and pull requests targeting `master`. The
workflow in `.github/workflows/quality.yml` is read-only: it does not deploy,
connect to Cloudflare, access PayMongo or use any project secret. Browser E2E
tests remain a local and release-readiness check until the church approves the
extra CI runtime.

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

`pnpm build` always generates the ignored `cloudflare-env.d.ts` Worker binding
types before Next.js type-checks the application. `pnpm build:cf` then runs the
OpenNext conversion required for Cloudflare Workers. This keeps local and
Cloudflare Workers Builds consistent.

For the dedicated remote preview Worker, configure Cloudflare Workers Builds
with:

```text
Build command: pnpm run build:cf
Deploy command: pnpm exec opennextjs-cloudflare deploy --env preview
```

Do not use `npx wrangler deploy` alone: it does not perform the OpenNext build.

Preview and production use distinct Worker, D1, and R2 resource names. Deployment
scripts select the environment explicitly so local resources cannot be mistaken
for production resources.

D1 and R2 bindings are configured. Cloudflare Access protects the temporary
`workers.dev` preview's `/admin*` route before the final domain exists. The
preview policy uses individual approved email addresses; its non-secret team
and audience values are versioned in `wrangler.jsonc`. See
`docs/CLOUDFLARE_ACCESS_SETUP.md` for the policy, verification and staff
onboarding process. The preview admin sign-in sends an email one-time code;
staff do not need Cloudflare accounts.

On Windows, run the OpenNext Cloudflare build from WSL because its bundling
stage creates symbolic links that ordinary Windows sessions commonly block.

## Documentation

- `docs/PROJECT_BRIEF.md`
- `docs/ARCHITECTURE.md`
- `docs/CODE_STRUCTURE.md`
- `docs/DATABASE_SCHEMA.md`
- `docs/PERMISSION_MATRIX.md`
- `docs/CLOUDFLARE_MIGRATION_PLAN.md`
- `docs/CLOUDFLARE_ACCESS_SETUP.md`
- `docs/PHASE_6_PUBLIC_OUTREACH_PLAN.md`
- `docs/decisions/0001-cloudflare-zero-subscription-platform.md`
