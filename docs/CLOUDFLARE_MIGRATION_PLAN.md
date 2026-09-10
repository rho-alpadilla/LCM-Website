# Cloudflare Migration Plan

## Goal

Move the preserved Supabase prototype to the approved Cloudflare Workers, D1,
Access, and R2 architecture without losing required behavior or weakening
authorization.

## Current State

- Next.js, React, TypeScript, Tailwind CSS, OpenNext, and Wrangler are present.
- Phase 1 platform bindings, Phase 2 D1 access control, and the application-side
  Phase 3 Cloudflare Access staff lifecycle are implemented and verified
  locally.
- Supabase helpers and PostgreSQL migrations remain as an inactive rollback
  prototype. Active admin pages and staff mutations use Cloudflare Access and
  D1.
- No production data migration is currently required because no production
  Supabase database has been identified.

## Migration Principles

- Preserve the public frontend and approved business rules.
- Replace provider-specific code behind identity, repository, and storage
  boundaries.
- Keep the Supabase prototype until each replacement passes its tests.
- Do not combine migration work with unrelated design or content changes.
- Do not deploy real prayer or giving data until authorization, audit, backup,
  and recovery checks pass.

## Phase 0: Preserve and Measure

1. Review the current uncommitted files and create an approved baseline commit.
2. Record the current lint, type-check, unit-test, and production-build results.
3. Inventory every Supabase import, environment variable, migration, route, and
   authentication screen.
4. Record current Cloudflare Free limits from official documentation.

Exit criteria: the prototype can be recovered, and the replacement scope is
fully listed.

## Phase 1: Platform Bindings

1. Add separate local, preview, and production D1 databases.
2. Add R2 bindings without enabling public bucket listing.
3. Generate Cloudflare environment types.
4. Add configuration validation that reports missing bindings without exposing
   credentials or account identifiers.
5. Keep production resources owned by a church-controlled Cloudflare account.

Exit criteria: a local health check can verify application, D1, and optional R2
availability without returning sensitive details.

## Phase 2: D1 Schema and Repositories

Status: access-control scope complete locally. Content, prayer, and giving tables
remain assigned to their later phases below.

1. Convert the approved logical data model to SQLite-compatible migrations.
2. Preserve foreign keys, uniqueness rules, status constraints, indexes, audit
   history, and append-only finance corrections where D1 supports them.
3. Move authorization-sensitive mutations into tested service functions and D1
   transactions/batches.
4. Use bound query parameters and allowlisted sort/filter fields.
5. Implement repositories so UI components never issue D1 queries directly.

Exit criteria: local migrations work from an empty database, schema tests pass,
and denied operations leave no partial writes.

## Phase 3: Cloudflare Access Identity

Status: complete locally. JWT verification, D1 identity authorization,
bootstrap, invitations, first-login activation, role changes, Core Leader
elevation rules, suspension, audit writes, and the D1-backed admin interface are
implemented. Creating the real Access application and activating route
protection remain pending until the church owns its domain.

1. Protect `/admin` and protected API routes with Cloudflare Access.
2. Allowlist exact staff email addresses; never allow `Everyone` or an
   unrestricted one-time-PIN login method.
3. Validate the Access JWT signature, issuer, audience, expiry, and identity in
   trusted server code.
4. Map the validated identity to an active D1 staff profile.
5. Enforce the approved permission matrix for every protected use case.
6. Implement safe bootstrap, staff activation, suspension, role changes, Core
   Leader elevation, and final-System-Administrator safeguards.

Exit criteria: allowed, denied, suspended, unknown, expired-token, and
wrong-audience scenarios all have automated tests and audit behavior.

## Phase 4: Content and File Storage

Status: started. The D1 content schema, R2 metadata schema, immutable revision
history, workflow guards, scoped permission service, and repository boundary are
implemented locally. Admin editors, subtype write services, actual R2 uploads,
public content routes, and cache invalidation remain.

1. Migrate sermons, activities, announcements, bulletins, and publishing
   workflow to D1.
2. Configure R2 Standard for approved images and documents only.
3. Enforce file type, content signature, size, generated names, ownership,
   publication state, and total storage quotas.
4. Continue embedding Facebook/YouTube sermon video instead of storing video.
5. Cache only public published content; private/admin responses use `no-store`.

Exit criteria: heads can self-approve only within their content scope, all
publishing is audited, and private files cannot be retrieved publicly.

## Phase 5: Sensitive Workflows

1. Implement prayer privacy scopes, restricted access, retention states, and
   audit trails.
2. Implement online/offline giving records, receipt requests, corrections,
   refunds, reconciliation, and immutable transaction history.
3. Add Turnstile, server validation, rate limiting, and generic public responses
   to prayer, contact, ministry-interest, and giving-initiation forms.
4. Keep payment collection on a provider-hosted page and trust only verified,
   idempotent webhook events.

Exit criteria: privacy and finance threat-model tests pass, exports are
permission-controlled, and no sensitive content appears in logs.

## Phase 6: Cutover and Cleanup

1. Run the complete lint, type-check, unit, integration, responsive, and
   production-build suite.
2. Test deployment size, Worker CPU behavior, D1 usage, Access login, R2 quotas,
   cache invalidation, error states, backup export, and restore.
3. Obtain explicit approval before deleting Supabase code, migrations,
   dependencies, environment variables, or setup documentation.
4. Remove the legacy implementation in a focused cleanup change only after the
   Cloudflare replacement satisfies every exit criterion.

Exit criteria: no runtime Supabase imports remain, documentation matches the
deployed architecture, and a rollback/recovery procedure has been tested.

## Decisions Still Required

- Domain name and registrar.
- Official service and daily-activity schedule.
- Giving categories, receipt fields, correction thresholds, and refund approver.
- Payment gateway and its transaction fees.
- Prayer-request retention period and whether `pastoral_only` is offered.
- Whether outbound email notifications are required for the first launch.
- R2 application storage ceiling below the provider's free allowance.
- Backup export frequency and responsible person.
