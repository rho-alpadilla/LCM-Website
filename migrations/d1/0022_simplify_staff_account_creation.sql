-- Direct staff creation keeps the original audit trail, while allowing a
-- System Administrator to assign Core Leader access at account creation.

CREATE TABLE staff_invitations_revised (
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
  CHECK (
    initial_role_code NOT IN ('system_admin', 'core_leader')
    OR coalesce(length(trim(assignment_reason)), 0) >= 10
  ),
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

DROP TRIGGER staff_profiles_require_pending_invitation_after_bootstrap;

INSERT INTO staff_invitations_revised
SELECT id, email, display_name, phone, job_title, initial_role_code,
  assignment_reason, invited_by, status, accepted_by, accepted_at,
  cancelled_by, cancelled_at, cancellation_reason, created_at
FROM staff_invitations;

DROP TABLE staff_invitations;
ALTER TABLE staff_invitations_revised RENAME TO staff_invitations;

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

CREATE TRIGGER staff_invitations_validate_acceptance_profile
BEFORE UPDATE OF status, accepted_by, accepted_at ON staff_invitations
WHEN NEW.status = 'accepted'
  AND NOT EXISTS (
    SELECT 1 FROM staff_profiles
    WHERE id = NEW.accepted_by
      AND email = OLD.email COLLATE NOCASE
      AND account_status = 'active'
  )
BEGIN
  SELECT RAISE(ABORT, 'Invitation acceptance must match an active staff profile');
END;

CREATE TRIGGER staff_profiles_require_pending_invitation_after_bootstrap
BEFORE INSERT ON staff_profiles
WHEN NEW.account_status = 'invited'
  AND EXISTS (
    SELECT 1 FROM system_bootstrap
    WHERE singleton_id = 1 AND completed_at IS NOT NULL
  )
  AND NOT EXISTS (
    SELECT 1 FROM staff_invitations
    WHERE email = NEW.email COLLATE NOCASE AND status = 'pending'
  )
BEGIN
  SELECT RAISE(ABORT, 'A pending invitation is required for staff activation');
END;
