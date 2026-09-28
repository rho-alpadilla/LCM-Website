# Lifechangers Ministry Incorporated Website

Zero-subscription-first, upgrade-ready church outreach platform built with Next.js, TypeScript, Cloudflare Workers, D1, Access, and R2.

## Current Status

Phases 1 through 6 are implemented in the codebase. The public site reads only
published content, expands upcoming activities, and delivers approved R2 files
through protected routes. It also includes the approved About, Contact, Join a
Ministry, calendar and Resources experiences.

The preview Worker uses the completed website-managed username/password sign-in
flow. It has individual accounts, three-day temporary-password grace periods,
manual administrator-assisted recovery, session revocation and audit records.
The preview must use synthetic data for release testing. Production remains on
Cloudflare Access until a separately approved production cutover. See
[ADR 0003](docs/decisions/0003-staff-password-authentication.md) and the
[staff operations guide](docs/ADMIN_OPERATIONS.md).

Phase 5 prayer workflows and the minimal PayMongo hosted-checkout boundary are
implemented. PayMongo and Turnstile are intentionally not activated until the
church has its final domain and leadership completes the provider launch
review. Contact and Ministry Interest submissions therefore remain disabled on
the public preview. See `docs/PHASE_6_PUBLIC_OUTREACH_PLAN.md`.

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
For the safe first-administrator setup and normal staff onboarding flow, see
[the admin operations guide](docs/ADMIN_OPERATIONS.md).

## Requirements

- Node.js 20.9 or newer
- pnpm 11
- A Cloudflare account for hosted previews and production

## Local Setup

1. Copy `.env.example` to `.env.local`.
2. Leave provider values empty while working on public UI foundations.
3. Install dependencies with `pnpm install`.
4. Apply local migrations deliberately when the schema has changed, then start
   the application with `pnpm dev`.
5. Open `http://localhost:3000` or `http://localhost:3000/admin`.

If PowerShell cannot find `pnpm.cmd`, use `corepack.cmd pnpm` in place of
`pnpm` for these commands (for example, `corepack.cmd pnpm dev`). The folder
reorganization does not change the startup commands.

Local development uses Wrangler's local D1 and R2-compatible bindings. Generate
the binding types whenever `wrangler.jsonc` changes:

```text
pnpm cf:typegen
```

D1 migrations live in `migrations/d1`. To inspect or apply them locally:

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
a preview or production build. The deployed preview uses password sign-in;
production currently uses Cloudflare Access.

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

D1 and R2 bindings are configured. The deployed preview's `/admin` uses the
website-managed password flow and has a reversible Cloudflare Access bypass;
it does not send email codes. Production stays Access-based until a future,
separately approved cutover. See `docs/CLOUDFLARE_ACCESS_SETUP.md` for the
production/rollback Access runbook and `docs/ADMIN_OPERATIONS.md` for normal
staff operations.

On Windows, use Docker or WSL for a local OpenNext Cloudflare bundle. Native
Windows bundling is not reliable enough to be the documented release path.

## Documentation

- `docs/PROJECT_BRIEF.md`
- `docs/ARCHITECTURE.md`
- `docs/CODE_STRUCTURE.md`
- `docs/DATABASE_SCHEMA.md`
- `docs/PERMISSION_MATRIX.md`
- `docs/CLOUDFLARE_MIGRATION_PLAN.md`
- `docs/CLOUDFLARE_ACCESS_SETUP.md`
- `docs/PHASE_6_5_RELEASE_CANDIDATE_CHECKLIST.md`
- `docs/PHASE_6_PUBLIC_OUTREACH_PLAN.md`
- `docs/decisions/0001-cloudflare-zero-subscription-platform.md`
