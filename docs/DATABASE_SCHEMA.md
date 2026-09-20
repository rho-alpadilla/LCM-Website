# Website D1 Database Schema

## Status and Boundary

This document describes the active Cloudflare D1 schema for the public website
and protected website-operations dashboard as of 2026-09-17. Full bookkeeping,
offline giving, expenses, member records, official receipts and private office
documents are excluded and belong to the future separate ChMS.

All schema changes are ordered SQL migrations in `migrations/d1`. Foreign keys,
constraints, indexes, parameterized repository queries, service authorization,
and audit writes are required.

## Access Control

Core tables:

- `roles` and `permissions`: the approved six roles and granular capabilities.
- `role_permissions`: reviewed permission grants.
- `staff_profiles`: one profile per verified Cloudflare Access identity.
- `staff_roles`: append-oriented assignments and reasoned revocations.
- `staff_invitations`: exact-email staff onboarding and first-sign-in activation.
  System Administrator and Core Leader records require a documented reason.
- `system_bootstrap`: one-time first-administrator state.
- `audit_logs`: metadata for security, publishing and prayer operations. Prayer
  text is never copied into the audit log.

Role codes are `system_admin`, `pastor`, `core_leader`,
`content_publisher`, `content_editor`, and `prayer_warrior`. Senior/Associate
Pastor distinctions belong in `staff_profiles.job_title`.

Database triggers require reasons for elevated role assignments, keep role
history immutable, and prevent removal or suspension of the final active System
Administrator.

## Public Content

Core content tables include:

- `content_items` and immutable `content_revisions`;
- subtype tables for pages, ministries, sermons, series, speakers,
  announcements and bulletins;
- schedule definitions and audited recurrence exceptions;
- media object metadata for private R2 objects; and
- workflow/audit records for review, publication and archival.

Only published content is returned by public repositories. Private schedule
locations are omitted from public results. Media is delivered through an
allowlisted, publication-aware route rather than a public R2 bucket.

## Prayer Care

### `prayer_requests`

Stores the request text, `team` or `pastoral_only` scope, controlled workflow
status, source, closure timestamps, 30-day contact and 90-day text retention
deadlines, legal-hold state, and creator metadata. Closing a request atomically
sets both retention deadlines.

### `prayer_request_contacts`

Stores optional contact information separately from prayer text. Contact data
requires explicit follow-up consent. Retention redacts the fields in place and
records `deleted_at`; rows are not destructively deleted.

### `prayer_assignments`

Append-oriented assignment history. An active team request may be assigned only
to an active Prayer Warrior. At most one active assignment exists per staff
member and request.

### `prayer_updates`

Append-oriented prayer/follow-up history with team or pastoral visibility.
Closed requests reject new updates. Retention redacts note text without erasing
the audit shape.

### Prayer indexes and guards

- Queue indexes cover privacy scope, status and submission time.
- Retention indexes cover due, closed, non-held records.
- Pastoral-only requests cannot be downgraded to team scope.
- Prayer rows, assignments and updates cannot be directly deleted.
- Redaction is permitted only after its approved deadline and never under an
  active legal hold.
- Scheduled retention runs daily and uses bounded batches.

## PayMongo Checkout Boundary

The obsolete website finance schema has been removed. `giving_checkout_sessions`
stores only a checkout ID, idempotency key, reference number, approved purpose,
amount, provider IDs/URL and lifecycle timestamps. Its constraints cap one
checkout at ₱100,000 and prevent changing the purpose, amount or provider
identity after creation.

`paymongo_webhook_events` stores a duplicate-safe identifier and the minimum
verified event metadata needed to mark a checkout paid. Both tables reject
deletion and preserve their security-relevant identities. They do not store
giver names, email addresses, card details, wallet details, recipient names,
offline gifts, a donor ledger, adjustments, refunds, bookkeeping reports or
official receipt workflows. PayMongo remains the website's payment source of
truth; the future ChMS may later import approved settlement data through a
separate contract.

## Visitor Contact and Ministry Interest

### `visitor_inquiries`

Stores a narrowly scoped website Contact or Ministry Interest submission: type,
optional ministry reference, visitor-supplied follow-up channel, consent,
message, workflow status, assignment state and closure/retention timestamps.
It is not a member profile, donor record, pastoral record or ChMS contact book.

An open or in-progress record requires a name, one consented contact channel,
and any required message. Closing atomically records a 90-day provisional
redaction deadline. Retention preserves the workflow/audit shape while
redacting personal fields and moving the record to `retention_review`.

### `visitor_inquiry_assignments` and `visitor_inquiry_updates`

These append-oriented tables retain assignment and staff follow-up history.
Only an active staff member who has the matching follow-up permission can be
assigned. Updates contain no provider delivery behavior: recording a response
does not send an email or SMS. Redaction clears notes only after the inquiry's
deadline.

### Inquiry guards

- direct deletion and restoration of redacted inquiry data are rejected;
- selected ministry references must resolve to a ministry content entry;
- an inquiry has no more than one active assignee;
- assignment targets must be active staff with the matching response
  permission; and
- retention runs in bounded daily batches alongside prayer retention.

The 90-day period is documented as a Phase 6 provisional policy and requires
leadership confirmation before the public forms receive real submissions.

## Data That Must Never Be Seeded or Committed

- real prayer requests or contact information;
- real staff identities or invitation addresses;
- PayMongo, Turnstile, Access or Cloudflare secrets;
- real member, donor, bank or bookkeeping records; and
- production database or R2 exports.

Tests use synthetic data only.

## Local Development Data

Only during `next dev` on a loopback hostname, the normal dashboard may create
one fixed `local-development-admin@lifechangers.test` System Administrator in
local D1. It is not church staff and is never available to preview or
production builds. It exists only so the normal `/admin` UI can be inspected
without a domain or Cloudflare Access application.
