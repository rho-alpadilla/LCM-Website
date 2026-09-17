# Cloudflare Delivery Roadmap

## Current Position

The project uses Next.js on Cloudflare Workers, D1, R2, Access and Turnstile.
Phases 1-4 are complete locally. Phase 5A/5B prayer work is complete locally
and preserved. The abandoned Phase 5C finance ledger has been removed following
the approved website/ChMS separation.

## Completed Locally

### Phase 1: Platform foundation

- local/preview/production Worker, D1 and R2 bindings;
- typed environment validation and health checks; and
- free-first Cloudflare deployment path.

### Phase 2: Access-control database

- D1 staff, role, permission and audit schema;
- invitation/bootstrap lifecycle and final-admin protection; and
- repository/service authorization boundaries.

### Phase 3: Staff identity and administration

- Cloudflare Access JWT verification;
- staff invitations, activation, role mutation and suspension; and
- protected admin dashboard.

Real Access application/audience setup waits for the church-owned domain.

### Phase 4: Content and public read layer

- content subtypes, immutable revisions and approval workflow;
- sermons, ministries, announcements, bulletins and recurring schedules;
- private R2 metadata/upload and safe public file delivery;
- public-only reads, private location protection, caching and targeted
  invalidation; and
- responsive/accessibility E2E coverage.

### Phase 5A/5B: Prayer care

- public prayer form with team/pastoral-only privacy;
- Turnstile verification boundary, rate limiting and generic responses;
- permission-filtered queues, assignments, updates, audited contact reveal,
  escalation and closure; and
- 30-day contact and 90-day prayer-text retention with daily scheduled cleanup.

Production Turnstile keys and hostname validation wait for the domain.

## Current Checkpoint: Architecture and Roles

- website and future ChMS are formally separated;
- obsolete Treasurer/finance ledger code and schema are removed;
- the six-role website permission model is active; and
- prayer functionality remains part of the website.

## Next Focused Phase: PayMongo Hosted Giving

1. Confirm PayMongo account eligibility, supported methods, current fees,
   `pass_on_fees` behavior, settlement ownership and love-gift policy.
2. Create a provider adapter and server-only checkout endpoint.
3. Validate purpose and amount on the server and use an idempotency key.
4. Redirect visitors to PayMongo's hosted page; never collect card or wallet
   credentials in this application.
5. Verify webhook signatures and event identity before updating minimal checkout
   status.
6. Add safe success/cancel/status pages and synthetic test fixtures.
7. Keep provider keys in environment secrets. Use test mode until the domain and
   church-owned provider account exist.

This phase must not recreate an internal contribution ledger, Treasurer role,
offline-entry workflow, finance reports, refunds, adjustments or official
receipts.

## Later Phase: Production Cutover

- purchase and configure the church-owned domain;
- create production Access and Turnstile applications;
- provision production D1/R2 resources and secrets;
- run migrations and full checks in preview;
- test backup/export and recovery;
- confirm privacy notices and operational owners; and
- deploy with monitoring and a rollback plan.

## Deferred Future Project: ChMS

The ChMS is a separate project for members, attendance, bookkeeping, offline
giving, expenses, reconciliation, official receipts and private documents. It
requires its own architecture, threat model, deployment, database, storage,
secrets, roles, backups and repository.

## Decisions Still Required

- church-owned domain and registrar;
- official service/weekly schedule content;
- final PayMongo giving-purpose labels and minimum/maximum amounts;
- which payment methods the church will enable;
- whether the giver may add fees and how that is disclosed;
- transactional email requirement; and
- production backup owner and frequency.
