PRAGMA foreign_keys = ON;

CREATE TABLE prayer_requests (
  id TEXT PRIMARY KEY,
  request_text TEXT,
  privacy_scope TEXT NOT NULL CHECK (privacy_scope IN ('team', 'pastoral_only')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_prayer', 'follow_up', 'escalated', 'closed', 'retention_review')),
  source TEXT NOT NULL CHECK (source IN ('website', 'staff')),
  submitted_at TEXT NOT NULL,
  closed_at TEXT,
  contact_retention_due_at TEXT,
  content_retention_due_at TEXT,
  content_deleted_at TEXT,
  legal_hold INTEGER NOT NULL DEFAULT 0 CHECK (legal_hold IN (0, 1)),
  legal_hold_reason TEXT,
  created_by TEXT REFERENCES staff_profiles(id) ON DELETE RESTRICT,
  updated_at TEXT NOT NULL,
  CHECK ((request_text IS NOT NULL AND length(trim(request_text)) BETWEEN 1 AND 5000 AND content_deleted_at IS NULL)
    OR (request_text IS NULL AND content_deleted_at IS NOT NULL)),
  CHECK (
    (status IN ('open', 'in_prayer', 'follow_up', 'escalated') AND closed_at IS NULL
      AND contact_retention_due_at IS NULL AND content_retention_due_at IS NULL)
    OR (status IN ('closed', 'retention_review') AND closed_at IS NOT NULL
      AND contact_retention_due_at IS NOT NULL AND content_retention_due_at IS NOT NULL
      AND abs(julianday(contact_retention_due_at) - julianday(closed_at) - 30) < 0.00001
      AND abs(julianday(content_retention_due_at) - julianday(closed_at) - 90) < 0.00001)
  ),
  CHECK ((legal_hold = 0 AND legal_hold_reason IS NULL)
    OR (legal_hold = 1 AND length(trim(legal_hold_reason)) BETWEEN 10 AND 500))
);

CREATE TABLE prayer_request_contacts (
  prayer_request_id TEXT PRIMARY KEY REFERENCES prayer_requests(id) ON DELETE RESTRICT,
  name TEXT,
  email TEXT,
  phone TEXT,
  preferred_contact TEXT NOT NULL DEFAULT 'none' CHECK (preferred_contact IN ('none', 'email', 'phone')),
  follow_up_consent INTEGER NOT NULL DEFAULT 0 CHECK (follow_up_consent IN (0, 1)),
  created_at TEXT NOT NULL,
  deleted_at TEXT,
  CHECK (name IS NULL OR length(trim(name)) BETWEEN 1 AND 120),
  CHECK (email IS NULL OR length(trim(email)) BETWEEN 3 AND 254),
  CHECK (phone IS NULL OR length(trim(phone)) BETWEEN 7 AND 40),
  CHECK (preferred_contact != 'email' OR email IS NOT NULL),
  CHECK (preferred_contact != 'phone' OR phone IS NOT NULL),
  CHECK (follow_up_consent = 1 OR preferred_contact = 'none'),
  CHECK (deleted_at IS NULL OR (name IS NULL AND email IS NULL AND phone IS NULL
    AND preferred_contact = 'none' AND follow_up_consent = 0))
);

CREATE TABLE prayer_assignments (
  id TEXT PRIMARY KEY,
  prayer_request_id TEXT NOT NULL REFERENCES prayer_requests(id) ON DELETE RESTRICT,
  assigned_to TEXT NOT NULL REFERENCES staff_profiles(id) ON DELETE RESTRICT,
  assigned_by TEXT NOT NULL REFERENCES staff_profiles(id) ON DELETE RESTRICT,
  assigned_at TEXT NOT NULL,
  ended_at TEXT
);

CREATE TABLE prayer_updates (
  id TEXT PRIMARY KEY,
  prayer_request_id TEXT NOT NULL REFERENCES prayer_requests(id) ON DELETE RESTRICT,
  update_type TEXT NOT NULL CHECK (update_type IN ('prayed', 'note', 'follow_up', 'escalated', 'closed')),
  note TEXT,
  visibility_scope TEXT NOT NULL CHECK (visibility_scope IN ('team', 'pastoral_only')),
  created_by TEXT NOT NULL REFERENCES staff_profiles(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  content_deleted_at TEXT,
  CHECK (note IS NULL OR length(trim(note)) BETWEEN 1 AND 5000),
  CHECK (content_deleted_at IS NULL OR note IS NULL)
);

CREATE UNIQUE INDEX prayer_assignments_one_active_per_staff ON prayer_assignments(prayer_request_id, assigned_to) WHERE ended_at IS NULL;
CREATE INDEX prayer_requests_queue_idx ON prayer_requests(privacy_scope, status, submitted_at DESC);
CREATE INDEX prayer_requests_retention_idx ON prayer_requests(legal_hold, contact_retention_due_at, content_retention_due_at) WHERE status IN ('closed', 'retention_review');
CREATE INDEX prayer_updates_request_idx ON prayer_updates(prayer_request_id, created_at);
