PRAGMA foreign_keys = ON;

-- Visitor contact and ministry-interest workflows belong to the website,
-- not the future Church Management System. They are deliberately limited to
-- follow-up work and are redacted after the approved retention period.
CREATE TABLE visitor_inquiries (
  id TEXT PRIMARY KEY,
  inquiry_type TEXT NOT NULL CHECK (inquiry_type IN ('contact', 'ministry_interest')),
  ministry_content_id TEXT REFERENCES content_entries(id) ON DELETE RESTRICT,
  name TEXT,
  email TEXT,
  phone TEXT,
  preferred_contact TEXT NOT NULL DEFAULT 'none'
    CHECK (preferred_contact IN ('none', 'email', 'phone')),
  follow_up_consent INTEGER NOT NULL DEFAULT 0 CHECK (follow_up_consent IN (0, 1)),
  message TEXT,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'closed', 'retention_review')),
  source TEXT NOT NULL CHECK (source = 'website'),
  submitted_at TEXT NOT NULL,
  closed_at TEXT,
  retention_due_at TEXT,
  redacted_at TEXT,
  updated_at TEXT NOT NULL,
  CHECK (
    (redacted_at IS NULL
      AND name IS NOT NULL AND length(trim(name)) BETWEEN 2 AND 120
      AND (email IS NULL OR length(trim(email)) BETWEEN 3 AND 254)
      AND (phone IS NULL OR length(trim(phone)) BETWEEN 7 AND 40)
      AND follow_up_consent = 1
      AND preferred_contact IN ('email', 'phone')
      AND (preferred_contact != 'email' OR email IS NOT NULL)
      AND (preferred_contact != 'phone' OR phone IS NOT NULL)
      AND (message IS NULL OR length(trim(message)) BETWEEN 1 AND 2000))
    OR
    (redacted_at IS NOT NULL
      AND name IS NULL AND email IS NULL AND phone IS NULL
      AND preferred_contact = 'none' AND follow_up_consent = 0
      AND message IS NULL)
  ),
  CHECK (inquiry_type != 'contact' OR message IS NOT NULL OR redacted_at IS NOT NULL),
  CHECK (
    (status IN ('open', 'in_progress')
      AND closed_at IS NULL AND retention_due_at IS NULL AND redacted_at IS NULL)
    OR
    (status = 'closed'
      AND closed_at IS NOT NULL AND retention_due_at IS NOT NULL AND redacted_at IS NULL
      AND abs(julianday(retention_due_at) - julianday(closed_at) - 90) < 0.00001)
    OR
    (status = 'retention_review'
      AND closed_at IS NOT NULL AND retention_due_at IS NOT NULL AND redacted_at IS NOT NULL
      AND abs(julianday(retention_due_at) - julianday(closed_at) - 90) < 0.00001)
  )
);

CREATE TABLE visitor_inquiry_assignments (
  id TEXT PRIMARY KEY,
  inquiry_id TEXT NOT NULL REFERENCES visitor_inquiries(id) ON DELETE RESTRICT,
  assigned_to TEXT NOT NULL REFERENCES staff_profiles(id) ON DELETE RESTRICT,
  assigned_by TEXT NOT NULL REFERENCES staff_profiles(id) ON DELETE RESTRICT,
  assigned_at TEXT NOT NULL,
  ended_at TEXT
);

CREATE TABLE visitor_inquiry_updates (
  id TEXT PRIMARY KEY,
  inquiry_id TEXT NOT NULL REFERENCES visitor_inquiries(id) ON DELETE RESTRICT,
  update_type TEXT NOT NULL CHECK (update_type IN ('note', 'responded', 'closed')),
  note TEXT,
  created_by TEXT NOT NULL REFERENCES staff_profiles(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  redacted_at TEXT,
  CHECK (
    (redacted_at IS NULL AND note IS NOT NULL AND length(trim(note)) BETWEEN 1 AND 2000)
    OR (redacted_at IS NOT NULL AND note IS NULL)
  )
);

CREATE INDEX visitor_inquiries_queue_idx
  ON visitor_inquiries(inquiry_type, status, submitted_at DESC);
CREATE INDEX visitor_inquiries_retention_idx
  ON visitor_inquiries(retention_due_at)
  WHERE status = 'closed' AND redacted_at IS NULL;
CREATE UNIQUE INDEX visitor_inquiry_assignments_one_active_per_inquiry
  ON visitor_inquiry_assignments(inquiry_id) WHERE ended_at IS NULL;
CREATE INDEX visitor_inquiry_updates_inquiry_idx
  ON visitor_inquiry_updates(inquiry_id, created_at);

CREATE TRIGGER visitor_inquiries_ministry_reference_guard
BEFORE INSERT ON visitor_inquiries
WHEN NEW.ministry_content_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM content_entries
  WHERE id = NEW.ministry_content_id AND content_type = 'ministry'
)
BEGIN
  SELECT RAISE(ABORT, 'A ministry inquiry must reference a ministry when one is selected');
END;

CREATE TRIGGER visitor_inquiries_no_delete BEFORE DELETE ON visitor_inquiries
BEGIN SELECT RAISE(ABORT, 'Visitor inquiries must be retained and redacted, not deleted'); END;

CREATE TRIGGER visitor_inquiries_no_restore
BEFORE UPDATE OF name, email, phone, preferred_contact, follow_up_consent, message, redacted_at
ON visitor_inquiries
WHEN OLD.redacted_at IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'Redacted visitor inquiry data cannot be restored'); END;

CREATE TRIGGER visitor_inquiries_redaction_guard
BEFORE UPDATE OF name, email, phone, preferred_contact, follow_up_consent, message, redacted_at
ON visitor_inquiries
WHEN OLD.redacted_at IS NULL AND NOT (
  NEW.redacted_at IS NOT NULL
  AND OLD.status = 'closed'
  AND OLD.retention_due_at <= NEW.redacted_at
  AND NEW.name IS NULL AND NEW.email IS NULL AND NEW.phone IS NULL
  AND NEW.preferred_contact = 'none' AND NEW.follow_up_consent = 0
  AND NEW.message IS NULL
)
BEGIN SELECT RAISE(ABORT, 'Visitor inquiry data may only be redacted after retention expires'); END;

CREATE TRIGGER visitor_inquiry_assignments_no_delete BEFORE DELETE ON visitor_inquiry_assignments
BEGIN SELECT RAISE(ABORT, 'Visitor inquiry assignments are append-only'); END;

CREATE TRIGGER visitor_inquiry_assignments_identity_immutable
BEFORE UPDATE OF inquiry_id, assigned_to, assigned_by, assigned_at ON visitor_inquiry_assignments
BEGIN SELECT RAISE(ABORT, 'Visitor inquiry assignment identity is immutable'); END;

CREATE TRIGGER visitor_inquiry_assignments_role_guard
BEFORE INSERT ON visitor_inquiry_assignments
WHEN NOT EXISTS (
  SELECT 1
  FROM visitor_inquiries
  JOIN staff_profiles ON staff_profiles.id = NEW.assigned_to
  JOIN staff_roles ON staff_roles.staff_id = staff_profiles.id
  JOIN role_permissions ON role_permissions.role_code = staff_roles.role_code
  WHERE visitor_inquiries.id = NEW.inquiry_id
    AND visitor_inquiries.status IN ('open', 'in_progress')
    AND staff_profiles.account_status = 'active'
    AND staff_roles.revoked_at IS NULL
    AND role_permissions.permission_code = CASE visitor_inquiries.inquiry_type
      WHEN 'contact' THEN 'contact.respond'
      WHEN 'ministry_interest' THEN 'ministry_interest.respond'
    END
)
BEGIN SELECT RAISE(ABORT, 'Assignments require an active staff member with follow-up permission'); END;

CREATE TRIGGER visitor_inquiry_updates_no_delete BEFORE DELETE ON visitor_inquiry_updates
BEGIN SELECT RAISE(ABORT, 'Visitor inquiry updates are append-only and may only be redacted'); END;

CREATE TRIGGER visitor_inquiry_updates_identity_immutable
BEFORE UPDATE OF inquiry_id, update_type, created_by, created_at ON visitor_inquiry_updates
BEGIN SELECT RAISE(ABORT, 'Visitor inquiry update history is immutable'); END;

CREATE TRIGGER visitor_inquiry_updates_redaction_guard
BEFORE UPDATE OF note, redacted_at ON visitor_inquiry_updates
WHEN NOT (
  OLD.redacted_at IS NULL AND NEW.note IS NULL AND NEW.redacted_at IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM visitor_inquiries
    WHERE visitor_inquiries.id = OLD.inquiry_id
      AND visitor_inquiries.status = 'closed'
      AND visitor_inquiries.retention_due_at <= NEW.redacted_at
  )
)
BEGIN SELECT RAISE(ABORT, 'Visitor inquiry updates may only be redacted after retention expires'); END;
