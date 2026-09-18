# Phase 4 Content Implementation Record

## Status

Phase 4 is complete in the local codebase as of 2026-09-16. Production preview
verification remains part of Phase 6 because it requires the church-owned
Cloudflare account, domain, Access application, and deployed resource IDs.

## Confirmed Scope

Phase 4 covers public pages, ministries, sermons, sermon series, speakers, daily
activities and other schedules, announcements, bulletins, and approved media.
The existing permission matrix and publishing workflow remain authoritative.

## Implemented Foundation

- Shared D1 content entries with unique type-scoped slugs
- R2 object metadata kept private by default
- Immutable content revisions and review history
- Type-specific ministry, sermon, series, speaker, announcement, bulletin, and
  schedule tables
- Schedule recurrence exceptions and location privacy levels
- Database guards for workflow state, subtype consistency, ready media, and safe
  R2 object keys
- Service authorization requiring both the matching content-management
  permission and the requested workflow permission
- Explicit scoped self-approval for authorized Multimedia and Bulletin Heads
- Bound D1 statements and transactional batches for content mutations
- Validated subtype services for ministries, series, speakers, sermons,
  announcements, bulletins, schedules, and schedule exceptions
- Provider-matched HTTPS sermon links, ready-media checks, and referenced-content
  checks at the trusted service boundary
- Versioned subtype edits included in review snapshots and protected by
  draft-only database guards
- Responsive, permission-aware admin content listing and editor
- Dedicated review queue with submit, approve, request-changes, publish, and
  confirmed archive actions
- Operational schedule cancellation and rescheduling form
- Private-by-default R2 uploads with server-side size and file-signature checks
- SHA-256 integrity verification, generated object keys, D1 quota reservation,
  and audited upload completion or failure cleanup
- Media library and validated selectors for cover images, speaker photos, and
  bulletin PDFs
- Public repositories and responsive routes for published sermons, ministries,
  announcements, bulletins, and activities
- Repository-level schedule location redaction for exact, area-only,
  contact-required, and staff-only locations
- Controlled R2 delivery that streams only ready files referenced by currently
  published content, forces bulletin downloads, and supports ETag validation
- Application-level caching for published D1 reads with content-type tags and
  fallback expiry
- Immediate, targeted cache and route invalidation after publishing, archiving,
  or changing a schedule exception
- Upcoming occurrence expansion for one-time, daily, weekly, and monthly
  schedules, including cancellations and reschedules
- Automated desktop and mobile accessibility checks for all public listing
  routes, including WCAG scans, landmarks, heading structure, overflow, and a
  keyboard-accessible skip link

## Temporary Content-Body Assumption

Until the church chooses an editor, new generic drafts use a structured
`plain_text` JSON body with a 50,000-character limit. This is an intentionally
limited implementation choice, not a final rich-text-editor requirement. It
keeps rendering safe and leaves room for a versioned block editor later.

## Completion Verification

- Unit and service tests cover public filtering, media authorization, cache
  targeting, and recurrence expansion.
- Playwright covers the public routes at desktop and mobile viewport sizes.
- The Next.js production build passes locally. OpenNext passes its Next.js and
  compatibility stages, then reaches the documented Windows symlink limitation;
  its final bundle must be repeated in WSL/Linux or CI during Phase 6.
- Cloudflare preview deployment and real D1/R2 smoke tests were completed on
  2026-09-18. Preview Access now protects the staff `/admin*` route. Final
  production verification still depends on the church-owned domain, Turnstile
  configuration and launch approval; it is not unfinished Phase 4 application
  code.

## Schedule Recurrence Assumption

Phase 4 accepts a deliberately small recurrence subset: daily, weekly, or
monthly frequency; an optional interval from 1 to 52; and optional weekday
selection. The first launch uses `Asia/Manila` as the only supported timezone,
and the public page expands the next 90 calendar days with a 200-occurrence
safety limit. This covers the church's regular activities without accepting
recurrence rules that the public calendar cannot reliably render yet.

## Provisional Launch Media Policy

- Images: 5 MB maximum; JPEG, PNG, WebP, or AVIF only
- Bulletin PDFs: 10 MB maximum and download-only when public delivery is added
- Total application-controlled storage ceiling: 500 MB
- Uploaded files stay private until referenced by approved published content
- Archived bulletin files stay private and are retained until a separately
  approved deletion policy exists
- Plain text remains the first-launch editor

These are conservative, code-configurable assumptions and require church
confirmation before production deployment. The zero-cost stack has no malware
scanner, so bulletin staff must upload only church-created or verified PDFs.
