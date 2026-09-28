# Cloudflare Delivery Roadmap

## Current Position

The project uses Next.js on Cloudflare Workers, D1, R2, Access, password
sessions and Turnstile. Phases 1–6 are implemented. Phase 5A/5B prayer work is
preserved. The abandoned Phase 5C finance ledger has been removed following the
approved website/ChMS separation.

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

- Cloudflare Access JWT verification for the production mode;
- website-managed password sessions for the preview mode;
- role mutation, suspension, temporary-password expiry, recovery and audit;
  and
- protected admin dashboard.

The preview Worker uses password authentication and a reversible Access bypass
on its temporary `workers.dev` hostname. Production remains Access-based and
will receive its own policy only when the church-owned domain is ready.

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

## Current Checkpoint: Phase 6.5 Release Candidate

- preview password authentication is deployed with an isolated D1/R2 setup;
- manual role and recovery checks use synthetic accounts/data only;
- public pages have the reviewed responsive light and dark themes; and
- documentation, automated checks and one version-control checkpoint are the
  remaining release-candidate tasks.

## Phase 6: Public Outreach Completion

- approved About content, branded navigation/footer and home calls to action;
- protected Contact and Join a Ministry submissions backed by D1;
- a Pastors/Core Leaders-only inquiry queue with assignment, follow-up and
  closure records; and
- a monthly public calendar based on the existing recurrence expansion.

The visitor forms use their own rate-limit binding and require Turnstile action
`visitor_inquiry`. They remain disabled until Turnstile is configured for the
final church domain. The provisional 90-day inquiry-retention rule must be
confirmed before real public submissions are enabled.

## Implemented Provider Boundary: PayMongo Hosted Giving

- PayMongo Checkout Session V2 adapter, sender-paid fee disclosure and payment
  method request are implemented.
- The public form validates ₱1.00–₱100,000.00 on the server, uses an
  idempotency key, and redirects to a provider-hosted page; it never handles
  card or wallet credentials.
- Minimal D1 records retain only checkout/idempotency/webhook state. Love Gift
  remains a generic church-managed fund without recipient details.
- The raw-body webhook route verifies the time-bound PayMongo HMAC signature
  before parsing an event and records paid status idempotently.
- Provider keys remain environment secrets. Use test mode until the
  church-owned domain, PayMongo account and webhook configuration are ready.

This phase must not recreate an internal contribution ledger, Treasurer role,
offline-entry workflow, finance reports, refunds, adjustments or official
receipts.

## Later Phase: Production Cutover

- purchase and configure the church-owned domain;
- confirm whether production remains Access-based or receives a separately
  approved password-authentication cutover, then configure only that choice;
- create the production Turnstile application;
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
- PayMongo test/live account setup, payment method activation, settlement
  ownership and final fee disclosure review;
- production Turnstile hostname and webhook registration; and
- production backup owner and frequency.
- final approval or revision of the 90-day Contact and Ministry Interest
  retention period.
