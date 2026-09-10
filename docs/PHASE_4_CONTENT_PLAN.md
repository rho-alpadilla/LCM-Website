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

## Temporary Content-Body Assumption

Until the church chooses an editor, new generic drafts use a structured
`plain_text` JSON body with a 50,000-character limit. This is an intentionally
limited implementation choice, not a final rich-text-editor requirement. It
keeps rendering safe and leaves room for a versioned block editor later.

## Remaining Slices

1. Add subtype validation and write services for sermon links, speakers,
   ministries, schedules, announcements, and bulletins.
2. Add the responsive admin content list, editors, review queue, approval,
   publishing, request-changes, and archive interfaces.
3. Add R2 upload initiation and completion with file signatures, size limits,
   generated keys, quotas, and authorization checks. Uploads remain disabled
   until this slice is complete.
4. Add public read repositories and routes that expose only currently published
   content and respect schedule-location privacy.
5. Add targeted cache invalidation, responsive browser tests, accessibility
   checks, and preview-environment verification.

## Decisions Still Needed Before Uploads

- Per-image and per-bulletin file-size limits
- Total application-controlled R2 storage ceiling
- Whether old bulletin PDFs stay publicly available after archiving
- Whether the first editor should remain plain text or use a structured block
  editor
