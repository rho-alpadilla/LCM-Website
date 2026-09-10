-- Phase 4 content, publishing, and R2 metadata foundation.

CREATE TABLE media_assets (
  id TEXT PRIMARY KEY,
  storage_scope TEXT NOT NULL
    CHECK (storage_scope IN ('public_content', 'bulletins')),
  object_key TEXT NOT NULL UNIQUE
    CHECK (
      length(trim(object_key)) BETWEEN 1 AND 500
      AND object_key NOT LIKE '/%'
      AND object_key NOT LIKE '%..%'
      AND object_key NOT LIKE '%\\%'
    ),
  original_name TEXT NOT NULL CHECK (length(trim(original_name)) BETWEEN 1 AND 255),
  mime_type TEXT NOT NULL
    CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp', 'image/avif', 'application/pdf')),
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0),
  checksum_sha256 TEXT
    CHECK (checksum_sha256 IS NULL OR (length(checksum_sha256) = 64 AND checksum_sha256 NOT GLOB '*[^a-f0-9]*')),
  alt_text TEXT CHECK (alt_text IS NULL OR length(trim(alt_text)) <= 500),
  is_decorative INTEGER NOT NULL DEFAULT 0 CHECK (is_decorative IN (0, 1)),
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private')),
  upload_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (upload_status IN ('pending', 'ready', 'quarantined', 'deleted')),
  uploaded_by TEXT NOT NULL REFERENCES staff_profiles (id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (
    mime_type NOT LIKE 'image/%'
    OR is_decorative = 1
    OR length(trim(coalesce(alt_text, ''))) > 0
  )
);

CREATE INDEX media_assets_scope_status_idx
  ON media_assets (storage_scope, upload_status, created_at DESC);

CREATE TABLE content_entries (
  id TEXT PRIMARY KEY,
  content_type TEXT NOT NULL
    CHECK (content_type IN ('page', 'ministry', 'sermon', 'series', 'speaker', 'schedule', 'announcement', 'bulletin')),
  slug TEXT NOT NULL
    CHECK (
      length(slug) BETWEEN 1 AND 180
      AND slug = lower(slug)
      AND slug GLOB '[a-z0-9]*'
      AND slug NOT GLOB '*[^a-z0-9-]*'
      AND slug NOT LIKE '-%'
      AND slug NOT LIKE '%-'
      AND slug NOT LIKE '%--%'
    ),
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 180),
  summary TEXT CHECK (summary IS NULL OR length(trim(summary)) <= 500),
  body_json TEXT NOT NULL DEFAULT '{}'
    CHECK (json_valid(body_json) AND json_type(body_json) = 'object'),
  cover_media_id TEXT REFERENCES media_assets (id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_review', 'approved', 'published', 'archived')),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_by TEXT NOT NULL REFERENCES staff_profiles (id) ON DELETE RESTRICT,
  updated_by TEXT NOT NULL REFERENCES staff_profiles (id) ON DELETE RESTRICT,
  submitted_by TEXT REFERENCES staff_profiles (id) ON DELETE RESTRICT,
  submitted_at TEXT,
  approved_by TEXT REFERENCES staff_profiles (id) ON DELETE RESTRICT,
  approved_at TEXT,
  published_by TEXT REFERENCES staff_profiles (id) ON DELETE RESTRICT,
  published_at TEXT,
  archived_by TEXT REFERENCES staff_profiles (id) ON DELETE RESTRICT,
  archived_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK ((submitted_by IS NULL) = (submitted_at IS NULL)),
  CHECK ((approved_by IS NULL) = (approved_at IS NULL)),
  CHECK ((published_by IS NULL) = (published_at IS NULL)),
  CHECK ((archived_by IS NULL) = (archived_at IS NULL)),
  CHECK (status <> 'pending_review' OR submitted_at IS NOT NULL),
  CHECK (status <> 'approved' OR approved_at IS NOT NULL),
  CHECK (status <> 'published' OR (approved_at IS NOT NULL AND published_at IS NOT NULL)),
  CHECK (status <> 'archived' OR archived_at IS NOT NULL),
  UNIQUE (content_type, slug)
);

CREATE INDEX content_entries_public_listing_idx
  ON content_entries (content_type, published_at DESC)
  WHERE status = 'published';
CREATE INDEX content_entries_review_queue_idx
  ON content_entries (status, updated_at DESC);

CREATE TABLE content_revisions (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL REFERENCES content_entries (id) ON DELETE RESTRICT,
  version INTEGER NOT NULL CHECK (version > 0),
  snapshot_json TEXT NOT NULL
    CHECK (json_valid(snapshot_json) AND json_type(snapshot_json) = 'object'),
  change_summary TEXT CHECK (change_summary IS NULL OR length(trim(change_summary)) <= 500),
  created_by TEXT NOT NULL REFERENCES staff_profiles (id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (content_id, version)
);

CREATE INDEX content_revisions_content_idx
  ON content_revisions (content_id, version DESC);

CREATE TABLE content_review_events (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL REFERENCES content_entries (id) ON DELETE RESTRICT,
  revision_id TEXT REFERENCES content_revisions (id) ON DELETE RESTRICT,
  action TEXT NOT NULL
    CHECK (action IN ('submitted', 'changes_requested', 'approved', 'published', 'archived')),
  actor_staff_id TEXT NOT NULL REFERENCES staff_profiles (id) ON DELETE RESTRICT,
  is_self_approval INTEGER NOT NULL DEFAULT 0 CHECK (is_self_approval IN (0, 1)),
  reason TEXT CHECK (reason IS NULL OR length(trim(reason)) <= 500),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (action = 'approved' OR is_self_approval = 0),
  CHECK (action <> 'changes_requested' OR length(trim(coalesce(reason, ''))) >= 10)
);

CREATE INDEX content_review_events_content_idx
  ON content_review_events (content_id, created_at DESC);

CREATE TABLE ministries (
  content_id TEXT PRIMARY KEY REFERENCES content_entries (id) ON DELETE RESTRICT,
  short_name TEXT CHECK (short_name IS NULL OR length(trim(short_name)) <= 80),
  contact_email TEXT CHECK (contact_email IS NULL OR length(trim(contact_email)) <= 254),
  contact_phone TEXT CHECK (contact_phone IS NULL OR length(trim(contact_phone)) <= 40),
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE sermon_series (
  content_id TEXT PRIMARY KEY REFERENCES content_entries (id) ON DELETE RESTRICT,
  starts_on TEXT,
  ends_on TEXT,
  CHECK (ends_on IS NULL OR starts_on IS NULL OR ends_on >= starts_on)
);

CREATE TABLE speakers (
  content_id TEXT PRIMARY KEY REFERENCES content_entries (id) ON DELETE RESTRICT,
  biography TEXT CHECK (biography IS NULL OR length(trim(biography)) <= 5000),
  photo_media_id TEXT REFERENCES media_assets (id) ON DELETE SET NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1))
);

CREATE TABLE sermons (
  content_id TEXT PRIMARY KEY REFERENCES content_entries (id) ON DELETE RESTRICT,
  series_content_id TEXT REFERENCES sermon_series (content_id) ON DELETE SET NULL,
  speaker_content_id TEXT REFERENCES speakers (content_id) ON DELETE SET NULL,
  preached_at TEXT NOT NULL,
  scripture_reference TEXT CHECK (scripture_reference IS NULL OR length(trim(scripture_reference)) <= 255),
  video_provider TEXT NOT NULL CHECK (video_provider IN ('facebook', 'youtube')),
  video_url TEXT NOT NULL CHECK (length(trim(video_url)) BETWEEN 8 AND 2048),
  duration_seconds INTEGER CHECK (duration_seconds IS NULL OR duration_seconds > 0)
);

CREATE INDEX sermons_preached_at_idx ON sermons (preached_at DESC);
CREATE INDEX sermons_series_idx ON sermons (series_content_id);
CREATE INDEX sermons_speaker_idx ON sermons (speaker_content_id);

CREATE TABLE announcements (
  content_id TEXT PRIMARY KEY REFERENCES content_entries (id) ON DELETE RESTRICT,
  visible_from TEXT,
  visible_until TEXT,
  priority INTEGER NOT NULL DEFAULT 0 CHECK (priority BETWEEN 0 AND 10),
  CHECK (visible_until IS NULL OR visible_from IS NULL OR visible_until > visible_from)
);

CREATE TABLE bulletins (
  content_id TEXT PRIMARY KEY REFERENCES content_entries (id) ON DELETE RESTRICT,
  issue_date TEXT NOT NULL,
  file_media_id TEXT NOT NULL REFERENCES media_assets (id) ON DELETE RESTRICT,
  edition_label TEXT CHECK (edition_label IS NULL OR length(trim(edition_label)) <= 120)
);

CREATE INDEX bulletins_issue_date_idx ON bulletins (issue_date DESC);

CREATE TABLE schedule_items (
  content_id TEXT PRIMARY KEY REFERENCES content_entries (id) ON DELETE RESTRICT,
  activity_type TEXT NOT NULL
    CHECK (activity_type IN ('daily_activity', 'service', 'cell_group', 'discipleship', 'prayer_meeting', 'ministry_meeting', 'outreach', 'special_event')),
  ministry_content_id TEXT REFERENCES ministries (content_id) ON DELETE SET NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Manila' CHECK (length(trim(timezone)) BETWEEN 1 AND 80),
  recurrence_rule TEXT CHECK (recurrence_rule IS NULL OR length(trim(recurrence_rule)) <= 1000),
  recurrence_until TEXT,
  location_name TEXT CHECK (location_name IS NULL OR length(trim(location_name)) <= 180),
  location_address TEXT CHECK (location_address IS NULL OR length(trim(location_address)) <= 500),
  location_visibility TEXT NOT NULL DEFAULT 'public_exact'
    CHECK (location_visibility IN ('public_exact', 'public_area', 'contact_required', 'staff_only')),
  contact_email TEXT CHECK (contact_email IS NULL OR length(trim(contact_email)) <= 254),
  contact_phone TEXT CHECK (contact_phone IS NULL OR length(trim(contact_phone)) <= 40),
  registration_url TEXT CHECK (registration_url IS NULL OR length(trim(registration_url)) <= 2048),
  CHECK (ends_at > starts_at)
);

CREATE INDEX schedule_items_starts_at_idx ON schedule_items (starts_at);
CREATE INDEX schedule_items_activity_type_idx ON schedule_items (activity_type);
CREATE INDEX schedule_items_ministry_idx ON schedule_items (ministry_content_id);

CREATE TABLE schedule_exceptions (
  id TEXT PRIMARY KEY,
  schedule_content_id TEXT NOT NULL REFERENCES schedule_items (content_id) ON DELETE RESTRICT,
  occurrence_date TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('cancelled', 'rescheduled')),
  replacement_starts_at TEXT,
  replacement_ends_at TEXT,
  public_note TEXT CHECK (public_note IS NULL OR length(trim(public_note)) <= 500),
  created_by TEXT NOT NULL REFERENCES staff_profiles (id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (
    (action = 'cancelled' AND replacement_starts_at IS NULL AND replacement_ends_at IS NULL)
    OR
    (action = 'rescheduled' AND replacement_starts_at IS NOT NULL
      AND replacement_ends_at IS NOT NULL
      AND replacement_ends_at > replacement_starts_at)
  ),
  UNIQUE (schedule_content_id, occurrence_date)
);

CREATE TRIGGER content_revisions_prevent_update
BEFORE UPDATE ON content_revisions
BEGIN
  SELECT RAISE(ABORT, 'Content revisions are append-only');
END;

CREATE TRIGGER content_revisions_prevent_delete
BEFORE DELETE ON content_revisions
BEGIN
  SELECT RAISE(ABORT, 'Content revisions are append-only');
END;

CREATE TRIGGER content_review_events_prevent_update
BEFORE UPDATE ON content_review_events
BEGIN
  SELECT RAISE(ABORT, 'Content review history is append-only');
END;

CREATE TRIGGER content_review_events_prevent_delete
BEFORE DELETE ON content_review_events
BEGIN
  SELECT RAISE(ABORT, 'Content review history is append-only');
END;
