# Phase 4 Content Implementation Plan

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

## Temporary Content-Body Assumption

Until the church chooses an editor, new generic drafts use a structured
`plain_text` JSON body with a 50,000-character limit. This is an intentionally
limited implementation choice, not a final rich-text-editor requirement. It
keeps rendering safe and leaves room for a versioned block editor later.

## Remaining Slices

1. Add public read repositories and routes that expose only currently published
   content and respect schedule-location privacy.
2. Add targeted cache invalidation, responsive browser tests, accessibility
   checks, and preview-environment verification.

## Schedule Recurrence Assumption

Phase 4 accepts a deliberately small recurrence subset: daily, weekly, or
monthly frequency; an optional interval from 1 to 52; and optional weekday
selection. The first launch uses `Asia/Manila` as the only supported timezone.
This covers the church's regular activities without accepting recurrence rules
that the public calendar cannot reliably render yet.

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
