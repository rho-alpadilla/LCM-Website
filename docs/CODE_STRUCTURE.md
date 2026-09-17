# Source structure and ownership

## What changed

Frontend, backend and shared source now have explicit homes. This is a
behavior-preserving refactor: routes, permission rules, data, migrations,
deployment configuration and local startup commands are unchanged. No second
API server, monorepo, new hosting service or dependency was introduced.

The future Church Management System still has its own deployment and data as
approved in decision `0002`; it is not the `backend` folder in this website.

## Where to work

| Task | Location |
| --- | --- |
| Add a URL or change route metadata | `src/app` |
| Change public or admin screen layout | `src/frontend/screens/public` or `admin` |
| Reuse a form, header, card or interactive control | `src/frontend/components` |
| Format displayed dates, durations or labels | `src/frontend/lib` |
| Send a browser HTTP request | `src/frontend/api` |
| Load screen data with staff authorization | `src/backend/queries` |
| Handle a staff form submission | `src/backend/actions` |
| Handle a public form/API request or webhook | `src/backend/http/handlers` |
| Change a permission-aware workflow | `src/backend/services` |
| Read/write D1 | `src/backend/repositories` |
| Verify staff identity or permissions | `src/backend/auth` |
| Call PayMongo or another approved provider | `src/backend/integrations` |
| Verify bots or protect submission limits | `src/backend/security` |
| Access validated Cloudflare bindings | `src/backend/cloudflare` |
| Share a schema, type or safe constant | `src/shared` |
| Change the active database schema | `migrations/d1` |

## Dependency direction

```text
app/page.tsx  -> frontend/screens -> backend/queries -> services -> repositories
UI forms     -> backend/actions --------------------> services -> repositories
app/route.ts -> backend/http/handlers ---------------> services -> repositories

frontend and backend -> shared
active website       -X-> legacy
```

Repositories own SQL, services own business rules, and request/action/query
adapters own transport and session handling. Some read queries compose
repositories after their explicit authorization guard. Backend code does not
import UI. Shared code does not import backend or framework server APIs.

### Next.js server versus browser code

`frontend` means presentation, not necessarily browser execution. Screens are
Server Components by default; their backend query calls execute on the server.
Query modules and identity/environment boundaries are marked `server-only`.
Use `"use client"` only for browser interactivity. Client components may call
HTTP routes or imported `"use server"` actions, never database modules.

ESLint also checks relative imports, re-exports, literal dynamic imports and
literal `require` calls. Server actions and server-only modules retain Next.js
build-time protections; lint is an additional maintenance guard, not an
authentication mechanism. Avoid computed local-module imports that bypass
static analysis.

### Route entries stay small

`src/app/(public)/sermons/page.tsx` owns metadata and dynamic rendering, then
re-exports `src/frontend/screens/public/sermons/index.tsx`.
`src/app/api/prayer/route.ts` re-exports its handler from
`src/backend/http/handlers/api/prayer.ts` while keeping route configuration in
the framework entry. URLs do not change when implementation files move.

Framework layouts, error boundaries, the not-found view, CSS entry and legacy
redirect routes remain in `app`; they are small routing concerns rather than
database/business modules. Static assets remain in root `public`.

## Keep related things together

Group screens by audience and feature, actions/queries/services by workflow,
and unit tests beside the module they verify. Shared types live in `shared`,
while persistence-only record shapes and repository ports stay in `backend`.
Root `tests` holds architecture checks and cross-application browser tests.
Avoid a generic dumping-ground `utils` folder or a single barrel exporting
server and client modules together.

## Refactor map

| Previous location | Current location |
| --- | --- |
| `src/components` | `src/frontend/components` |
| Page UI in `src/app/**/page.tsx` | `src/frontend/screens` (thin route entries retained) |
| Request implementations in `src/app/**/route.ts` | `src/backend/http/handlers` |
| `src/server` | `src/backend` |
| `src/features/*/actions.ts` | `src/backend/actions` |
| `src/features/auth/staff-context.ts` | `src/backend/auth/staff-context.ts` |
| Feature schemas, labels and policies | `src/shared` |
| `src/lib/public-content-cache.ts` | `src/backend/queries/public-content-cache.ts` |
| `src/lib/public-format.ts` | `src/frontend/lib/public-format.ts` |
| Supabase helpers and unused MFA UI | `src/legacy/supabase` |

## Verification

Run lint, TypeScript, unit tests, the production build and desktop/mobile E2E
checks after changing a boundary. Architecture tests verify allowed/denied
imports; protected-query tests check that unauthenticated requests stop before
database work. Existing workflow and browser tests remain regression coverage.
No migration or provider activation is needed just for this reorganization.
