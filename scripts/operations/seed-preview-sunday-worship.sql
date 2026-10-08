-- One-time, idempotent preview-content setup for the approved Sunday service.
--
-- This preserves the same draft → review → approval → publication history used
-- by the application. It is intentionally not a schema migration.
--
-- Assumptions approved on 2026-10-09:
-- - Every Sunday, 9:00 AM to 12:00 NN (Asia/Manila).
-- - Starts 2026-10-11.
-- - The public venue remains protected until the church confirms it.

INSERT INTO content_entries (
  id,
  content_type,
  slug,
  title,
  summary,
  body_json,
  cover_media_id,
  status,
  version,
  created_by,
  updated_by,
  created_at,
  updated_at
)
SELECT
  lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' ||
  substr(lower(hex(randomblob(2))), 2) || '-' ||
  substr('89ab', (abs(random()) % 4) + 1, 1) ||
  substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6))),
  'schedule',
  'sunday-worship-service',
  'Sunday Worship Service',
  'Every Sunday · 9:00 AM–12:00 NN',
  '{"format":"plain_text","text":"Join Lifechangers Ministry every Sunday for worship, fellowship, and God''s Word. Our live service is shared through our official Facebook page."}',
  NULL,
  'draft',
  1,
  admin.id,
  admin.id,
  '2026-10-09T00:00:00.000Z',
  '2026-10-09T00:00:00.000Z'
FROM (
  SELECT profile.id
  FROM staff_profiles AS profile
  JOIN staff_roles AS assignment
    ON assignment.staff_id = profile.id AND assignment.revoked_at IS NULL
  WHERE profile.account_status = 'active' AND assignment.role_code = 'system_admin'
  ORDER BY profile.created_at
  LIMIT 1
) AS admin
WHERE NOT EXISTS (
  SELECT 1
  FROM content_entries
  WHERE content_type = 'schedule' AND slug = 'sunday-worship-service'
);

INSERT INTO schedule_items (
  content_id,
  activity_type,
  ministry_content_id,
  starts_at,
  ends_at,
  timezone,
  recurrence_rule,
  recurrence_until,
  location_name,
  location_address,
  location_visibility,
  contact_email,
  contact_phone,
  registration_url
)
SELECT
  content.id,
  'service',
  NULL,
  '2026-10-11T01:00:00.000Z',
  '2026-10-11T04:00:00.000Z',
  'Asia/Manila',
  'FREQ=WEEKLY;BYDAY=SU',
  NULL,
  NULL,
  NULL,
  'contact_required',
  NULL,
  NULL,
  NULL
FROM content_entries AS content
WHERE content.content_type = 'schedule'
  AND content.slug = 'sunday-worship-service'
  AND NOT EXISTS (
    SELECT 1 FROM schedule_items WHERE content_id = content.id
  );

INSERT INTO content_revisions (
  id,
  content_id,
  version,
  snapshot_json,
  change_summary,
  created_by,
  created_at
)
SELECT
  lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' ||
  substr(lower(hex(randomblob(2))), 2) || '-' ||
  substr('89ab', (abs(random()) % 4) + 1, 1) ||
  substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6))),
  content.id,
  1,
  '{"contentType":"schedule","slug":"sunday-worship-service","title":"Sunday Worship Service","summary":"Every Sunday · 9:00 AM–12:00 NN","body":{"format":"plain_text","text":"Join Lifechangers Ministry every Sunday for worship, fellowship, and God''s Word. Our live service is shared through our official Facebook page."},"coverMediaId":null,"subtype":{"activityType":"service","ministryContentId":null,"startsAt":"2026-10-11T01:00:00.000Z","endsAt":"2026-10-11T04:00:00.000Z","timezone":"Asia/Manila","recurrenceRule":"FREQ=WEEKLY;BYDAY=SU","recurrenceUntil":null,"locationName":null,"locationAddress":null,"locationVisibility":"contact_required","contactEmail":null,"contactPhone":null,"registrationUrl":null}}',
  'Create the approved recurring Sunday worship service.',
  content.created_by,
  '2026-10-09T00:00:00.000Z'
FROM content_entries AS content
WHERE content.content_type = 'schedule'
  AND content.slug = 'sunday-worship-service'
  AND NOT EXISTS (
    SELECT 1
    FROM content_revisions
    WHERE content_id = content.id AND version = 1
  );

UPDATE content_entries
SET
  status = 'pending_review',
  submitted_by = created_by,
  submitted_at = '2026-10-09T00:00:00.000Z',
  updated_by = created_by,
  updated_at = '2026-10-09T00:00:00.000Z'
WHERE content_type = 'schedule'
  AND slug = 'sunday-worship-service'
  AND status = 'draft';

INSERT INTO content_review_events (
  id,
  content_id,
  revision_id,
  action,
  actor_staff_id,
  is_self_approval,
  reason,
  created_at
)
SELECT
  lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' ||
  substr(lower(hex(randomblob(2))), 2) || '-' ||
  substr('89ab', (abs(random()) % 4) + 1, 1) ||
  substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6))),
  content.id,
  revision.id,
  'submitted',
  content.submitted_by,
  0,
  NULL,
  '2026-10-09T00:00:00.000Z'
FROM content_entries AS content
JOIN content_revisions AS revision
  ON revision.content_id = content.id AND revision.version = content.version
WHERE content.content_type = 'schedule'
  AND content.slug = 'sunday-worship-service'
  AND content.status = 'pending_review'
  AND NOT EXISTS (
    SELECT 1
    FROM content_review_events
    WHERE content_id = content.id
      AND revision_id = revision.id
      AND action = 'submitted'
  );

UPDATE content_entries
SET
  status = 'approved',
  approved_by = submitted_by,
  approved_at = '2026-10-09T00:00:00.000Z',
  updated_by = submitted_by,
  updated_at = '2026-10-09T00:00:00.000Z'
WHERE content_type = 'schedule'
  AND slug = 'sunday-worship-service'
  AND status = 'pending_review';

INSERT INTO content_review_events (
  id,
  content_id,
  revision_id,
  action,
  actor_staff_id,
  is_self_approval,
  reason,
  created_at
)
SELECT
  lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' ||
  substr(lower(hex(randomblob(2))), 2) || '-' ||
  substr('89ab', (abs(random()) % 4) + 1, 1) ||
  substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6))),
  content.id,
  revision.id,
  'approved',
  content.approved_by,
  1,
  NULL,
  '2026-10-09T00:00:00.000Z'
FROM content_entries AS content
JOIN content_revisions AS revision
  ON revision.content_id = content.id AND revision.version = content.version
WHERE content.content_type = 'schedule'
  AND content.slug = 'sunday-worship-service'
  AND content.status = 'approved'
  AND NOT EXISTS (
    SELECT 1
    FROM content_review_events
    WHERE content_id = content.id
      AND revision_id = revision.id
      AND action = 'approved'
  );

UPDATE content_entries
SET
  status = 'published',
  published_by = approved_by,
  published_at = '2026-10-09T00:00:00.000Z',
  updated_by = approved_by,
  updated_at = '2026-10-09T00:00:00.000Z'
WHERE content_type = 'schedule'
  AND slug = 'sunday-worship-service'
  AND status = 'approved';

INSERT INTO content_review_events (
  id,
  content_id,
  revision_id,
  action,
  actor_staff_id,
  is_self_approval,
  reason,
  created_at
)
SELECT
  lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' ||
  substr(lower(hex(randomblob(2))), 2) || '-' ||
  substr('89ab', (abs(random()) % 4) + 1, 1) ||
  substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6))),
  content.id,
  revision.id,
  'published',
  content.published_by,
  0,
  NULL,
  '2026-10-09T00:00:00.000Z'
FROM content_entries AS content
JOIN content_revisions AS revision
  ON revision.content_id = content.id AND revision.version = content.version
WHERE content.content_type = 'schedule'
  AND content.slug = 'sunday-worship-service'
  AND content.status = 'published'
  AND NOT EXISTS (
    SELECT 1
    FROM content_review_events
    WHERE content_id = content.id
      AND revision_id = revision.id
      AND action = 'published'
  );

INSERT INTO audit_logs (
  id,
  actor_staff_id,
  actor_type,
  action,
  resource_type,
  resource_id,
  sensitivity,
  metadata_json,
  correlation_id,
  created_at
)
SELECT
  lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' ||
  substr(lower(hex(randomblob(2))), 2) || '-' ||
  substr('89ab', (abs(random()) % 4) + 1, 1) ||
  substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6))),
  content.published_by,
  'staff',
  'content.published',
  'content_entry',
  content.id,
  'standard',
  '{"contentType":"schedule","source":"initial approved service schedule"}',
  lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' ||
  substr(lower(hex(randomblob(2))), 2) || '-' ||
  substr('89ab', (abs(random()) % 4) + 1, 1) ||
  substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6))),
  '2026-10-09T00:00:00.000Z'
FROM content_entries AS content
WHERE content.content_type = 'schedule'
  AND content.slug = 'sunday-worship-service'
  AND content.status = 'published'
  AND NOT EXISTS (
    SELECT 1
    FROM audit_logs
    WHERE action = 'content.published'
      AND resource_type = 'content_entry'
      AND resource_id = content.id
      AND json_extract(metadata_json, '$.source') = 'initial approved service schedule'
  );
