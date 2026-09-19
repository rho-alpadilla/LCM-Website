# Backend

- `actions/<workflow>/`: Next.js server-action adapters for staff form
  submissions, grouped by content, prayer, inquiries or media.
- `auth/`: Access verification, active staff context and authorization guards.
- `queries/<workflow>/`: server-only screen loaders and public read-cache
  management, grouped by the data they load.
- `http/handlers/`: request handlers re-exported by thin `src/app/**/route.ts` entries.
- `http/`: request validation/security and consistent response helpers.
- `services/<workflow>/`: business rules, permission-aware use cases and
  workflow orchestration.
- `repositories/<workflow>/`: parameterized D1 queries, repository ports and
  persistence records.
- `integrations/`: provider clients and verification, currently PayMongo.
- `security/`: Turnstile and anonymous rate-limit helpers.
- `cloudflare/`: validated runtime bindings.

Backend modules depend on other backend modules and runtime-neutral shared code,
never frontend screens or routing entry points. Keep Next.js `server-only`
markers on screen loaders and environment boundaries; do not indiscriminately
add them to portable services imported by `custom-worker.ts` for scheduled prayer
retention. That Worker entry is not a React module.

Keep a feature’s query, service and repository names aligned. A future
maintainer should be able to open `content`, `prayer`, `inquiries`, `staff`,
`media`, or `giving` and find the matching layer without guessing.

Mutations must remain validated and authorized server-side even when the UI
hides unavailable operations. See `docs/CODE_STRUCTURE.md`.
