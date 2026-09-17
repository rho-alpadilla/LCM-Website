# Backend

- `actions/`: Next.js server-action adapters for staff form submissions.
- `auth/`: Access verification, active staff context and authorization guards.
- `queries/`: server-only screen loaders and public read-cache management.
- `http/handlers/`: request handlers re-exported by thin `src/app/**/route.ts` entries.
- `http/`: request validation/security and consistent response helpers.
- `services/`: business rules, permission-aware use cases and workflow orchestration.
- `repositories/`: parameterized D1 queries, repository ports and persistence records.
- `integrations/`: provider clients and verification, currently PayMongo.
- `security/`: Turnstile and anonymous rate-limit helpers.
- `cloudflare/`: validated runtime bindings.

Backend modules depend on other backend modules and runtime-neutral shared code,
never frontend screens or routing entry points. Keep Next.js `server-only`
markers on screen loaders and environment boundaries; do not indiscriminately
add them to portable services imported by `custom-worker.ts` for scheduled prayer
retention. That Worker entry is not a React module.

Mutations must remain validated and authorized server-side even when the UI
hides unavailable operations. See `docs/CODE_STRUCTURE.md`.
