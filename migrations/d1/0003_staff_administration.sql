-- Staff invitation and activation workflow for Cloudflare Access.

CREATE TABLE staff_invitations (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL COLLATE NOCASE,
  display_name TEXT NOT NULL
    CHECK (length(trim(display_name)) BETWEEN 2 AND 120),
  phone TEXT CHECK (phone IS NULL OR length(trim(phone)) BETWEEN 1 AND 40),
  job_title TEXT CHECK (job_title IS NULL OR length(trim(job_title)) BETWEEN 1 AND 120),
  initial_role_code TEXT NOT NULL REFERENCES roles (code) ON DELETE RESTRICT,
  assignment_reason TEXT,
  invited_by TEXT NOT NULL REFERENCES staff_profiles (id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'cancelled')),
  accepted_by TEXT REFERENCES staff_profiles (id) ON DELETE RESTRICT,
  accepted_at TEXT,
  cancelled_by TEXT REFERENCES staff_profiles (id) ON DELETE RESTRICT,
  cancelled_at TEXT,
  cancellation_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (initial_role_code <> 'core_leader'),
  CHECK (
    (status = 'pending' AND accepted_by IS NULL AND accepted_at IS NULL
      AND cancelled_by IS NULL AND cancelled_at IS NULL AND cancellation_reason IS NULL)
    OR
    (status = 'accepted' AND accepted_by IS NOT NULL AND accepted_at IS NOT NULL
      AND cancelled_by IS NULL AND cancelled_at IS NULL AND cancellation_reason IS NULL)
    OR
    (status = 'cancelled' AND accepted_by IS NULL AND accepted_at IS NULL
      AND cancelled_by IS NOT NULL AND cancelled_at IS NOT NULL
      AND length(trim(cancellation_reason)) >= 10)
  )
);

CREATE UNIQUE INDEX staff_invitations_one_pending_email
  ON staff_invitations (email)
  WHERE status = 'pending';

CREATE INDEX staff_invitations_status_created
  ON staff_invitations (status, created_at DESC);

CREATE TRIGGER staff_invitations_prevent_identity_rewrite
BEFORE UPDATE OF email, display_name, phone, job_title, initial_role_code,
  assignment_reason, invited_by, created_at
ON staff_invitations
BEGIN
  SELECT RAISE(ABORT, 'Invitation details are immutable; cancel and create a new invitation');
END;

CREATE TRIGGER staff_invitations_prevent_terminal_rewrite
BEFORE UPDATE ON staff_invitations
WHEN OLD.status <> 'pending'
BEGIN
  SELECT RAISE(ABORT, 'Accepted and cancelled invitations are immutable');
END;
