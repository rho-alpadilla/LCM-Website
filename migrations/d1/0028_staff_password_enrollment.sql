-- Password-only staff identities are deliberately separate from Cloudflare
-- Access identities. Existing Access subjects and all staff IDs are retained.

PRAGMA defer_foreign_keys = ON;

DROP TRIGGER staff_profiles_restrict_active_insert_after_bootstrap;
DROP TRIGGER staff_profiles_protect_final_system_admin;
DROP TRIGGER staff_profiles_prevent_delete;
DROP TRIGGER staff_profiles_require_pending_invitation_after_bootstrap;
DROP TRIGGER staff_password_credentials_require_active_staff;
DROP TRIGGER staff_sessions_require_active_password_credential;
DROP TRIGGER staff_roles_protect_final_system_admin;
DROP TRIGGER staff_invitations_validate_acceptance_profile;
DROP TRIGGER prayer_assignments_scope_and_role_guard;
DROP TRIGGER visitor_inquiry_assignments_role_guard;
-- Legacy finance triggers may remain in databases created before that module
-- was removed. They are intentionally retired with the obsolete tables.

CREATE TABLE staff_password_enrollments (
  staff_id TEXT PRIMARY KEY,
  email TEXT NOT NULL COLLATE NOCASE,
  username TEXT NOT NULL COLLATE NOCASE UNIQUE
    CHECK (
      username GLOB '[a-z]*'
      AND username NOT GLOB '*[^a-z0-9._-]*'
      AND length(username) BETWEEN 3 AND 64
    ),
  display_name TEXT NOT NULL
    CHECK (length(trim(display_name)) BETWEEN 2 AND 120),
  initial_role_code TEXT NOT NULL REFERENCES roles (code) ON DELETE RESTRICT,
  issued_by TEXT NOT NULL REFERENCES staff_profiles (id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'pending_setup'
    CHECK (status IN ('pending_setup', 'completed', 'cancelled')),
  expires_at TEXT NOT NULL,
  completed_at TEXT,
  cancelled_by TEXT REFERENCES staff_profiles (id) ON DELETE RESTRICT,
  cancelled_at TEXT,
  cancellation_reason TEXT,
  created_at TEXT NOT NULL,
  CHECK (
    (status = 'pending_setup' AND completed_at IS NULL
      AND cancelled_by IS NULL AND cancelled_at IS NULL AND cancellation_reason IS NULL)
    OR (status = 'completed' AND completed_at IS NOT NULL
      AND cancelled_by IS NULL AND cancelled_at IS NULL AND cancellation_reason IS NULL)
    OR (status = 'cancelled' AND completed_at IS NULL
      AND cancelled_by IS NOT NULL AND cancelled_at IS NOT NULL
      AND length(trim(cancellation_reason)) BETWEEN 10 AND 500)
  )
);

CREATE INDEX staff_password_enrollments_status_expiry
  ON staff_password_enrollments (status, expires_at);

-- `staff_profiles.access_subject` is already a required unique column and is
-- referenced by several protected staff tables. Rebuilding it would make an
-- otherwise additive migration unsafe on an existing database. Password-only
-- accounts therefore use the reserved, internal identity `password:<staff-id>`.
-- This is not a Cloudflare Access subject and cannot be supplied by a visitor.

CREATE TRIGGER staff_profiles_restrict_active_insert_after_bootstrap
BEFORE INSERT ON staff_profiles
WHEN NEW.account_status = 'active'
  AND EXISTS (
    SELECT 1 FROM system_bootstrap
    WHERE singleton_id = 1 AND completed_at IS NOT NULL
  )
BEGIN
  SELECT RAISE(ABORT, 'Active staff profiles must use an approved enrollment flow');
END;

CREATE TRIGGER staff_profiles_protect_final_system_admin
BEFORE UPDATE OF account_status ON staff_profiles
WHEN OLD.account_status = 'active'
  AND NEW.account_status <> 'active'
  AND EXISTS (
    SELECT 1 FROM staff_roles
    WHERE staff_id = OLD.id AND role_code = 'system_admin' AND revoked_at IS NULL
  )
  AND (
    SELECT count(DISTINCT assignment.staff_id)
    FROM staff_roles AS assignment
    JOIN staff_profiles AS staff ON staff.id = assignment.staff_id
    WHERE assignment.role_code = 'system_admin'
      AND assignment.revoked_at IS NULL
      AND staff.account_status = 'active'
  ) <= 1
BEGIN
  SELECT RAISE(ABORT, 'The final active System Administrator cannot be suspended');
END;

CREATE TRIGGER staff_profiles_prevent_delete
BEFORE DELETE ON staff_profiles
BEGIN
  SELECT RAISE(ABORT, 'Staff profiles must be disabled instead of deleted');
END;

CREATE TRIGGER staff_roles_protect_final_system_admin
BEFORE UPDATE OF revoked_at ON staff_roles
WHEN OLD.role_code = 'system_admin'
  AND OLD.revoked_at IS NULL
  AND NEW.revoked_at IS NOT NULL
  AND (
    SELECT count(DISTINCT assignment.staff_id)
    FROM staff_roles AS assignment
    JOIN staff_profiles AS staff ON staff.id = assignment.staff_id
    WHERE assignment.role_code = 'system_admin'
      AND assignment.revoked_at IS NULL
      AND staff.account_status = 'active'
  ) <= 1
BEGIN
  SELECT RAISE(ABORT, 'The final active System Administrator role cannot be removed');
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

CREATE TRIGGER prayer_assignments_scope_and_role_guard
BEFORE INSERT ON prayer_assignments
WHEN NOT EXISTS (
  SELECT 1
  FROM prayer_requests
  JOIN staff_profiles ON staff_profiles.id = NEW.assigned_to
  JOIN staff_roles ON staff_roles.staff_id = staff_profiles.id
  WHERE prayer_requests.id = NEW.prayer_request_id
    AND prayer_requests.privacy_scope = 'team'
    AND prayer_requests.status NOT IN ('closed', 'retention_review')
    AND staff_profiles.account_status = 'active'
    AND staff_roles.role_code = 'prayer_warrior'
    AND staff_roles.revoked_at IS NULL
)
BEGIN
  SELECT RAISE(ABORT, 'Prayer assignments require an active Prayer Warrior and a team request');
END;

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
BEGIN
  SELECT RAISE(ABORT, 'Assignments require an active staff member with follow-up permission');
END;


CREATE TRIGGER staff_profiles_require_approved_enrollment_after_bootstrap
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
  AND NOT EXISTS (
    SELECT 1 FROM staff_password_enrollments
    WHERE staff_id = NEW.id
      AND email = NEW.email COLLATE NOCASE
      AND display_name = NEW.display_name
      AND status = 'pending_setup'
  )
BEGIN
  SELECT RAISE(ABORT, 'A pending invitation or password enrollment is required');
END;

CREATE TRIGGER staff_password_credentials_require_approved_staff
BEFORE INSERT ON staff_password_credentials
WHEN NOT EXISTS (
  SELECT 1 FROM staff_profiles
  WHERE id = NEW.staff_id AND account_status = 'active'
)
AND NOT EXISTS (
  SELECT 1
  FROM staff_profiles AS profile
  JOIN staff_password_enrollments AS enrollment
    ON enrollment.staff_id = profile.id
  WHERE profile.id = NEW.staff_id
    AND profile.access_subject = 'password:' || profile.id
    AND profile.account_status = 'invited'
    AND enrollment.status = 'pending_setup'
    AND enrollment.username = NEW.username COLLATE NOCASE
    AND NEW.must_change_password = 1
)
BEGIN
  SELECT RAISE(ABORT, 'Password credentials require an approved staff enrollment');
END;

CREATE TRIGGER staff_sessions_require_active_password_credential
BEFORE INSERT ON staff_sessions
WHEN NOT EXISTS (
  SELECT 1
  FROM staff_profiles AS profile
  JOIN staff_password_credentials AS credential
    ON credential.staff_id = profile.id
  WHERE profile.id = NEW.staff_id
    AND profile.account_status = 'active'
    AND credential.password_version = NEW.password_version
    AND credential.must_change_password = 0
)
BEGIN
  SELECT RAISE(ABORT, 'Active password credentials are required for a staff session');
END;

CREATE TRIGGER staff_profiles_password_activation_requires_completed_setup
BEFORE UPDATE OF account_status ON staff_profiles
WHEN OLD.account_status = 'invited'
  AND NEW.account_status = 'active'
  AND OLD.access_subject = 'password:' || OLD.id
  AND NEW.access_subject = 'password:' || NEW.id
  AND NOT EXISTS (
    SELECT 1
    FROM staff_password_enrollments AS enrollment
    JOIN staff_password_credentials AS credential
      ON credential.staff_id = enrollment.staff_id
    WHERE enrollment.staff_id = NEW.id
      AND enrollment.status = 'pending_setup'
      AND enrollment.expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      AND credential.must_change_password = 0
  )
BEGIN
  SELECT RAISE(ABORT, 'Password setup must complete before activating staff');
END;

CREATE TRIGGER staff_password_enrollments_prevent_identity_rewrite
BEFORE UPDATE OF staff_id, email, username, display_name, initial_role_code,
  issued_by, expires_at, created_at
ON staff_password_enrollments
BEGIN
  SELECT RAISE(ABORT, 'Password enrollment identity is immutable; issue a new credential deliberately');
END;

CREATE TRIGGER staff_password_enrollments_prevent_terminal_rewrite
BEFORE UPDATE ON staff_password_enrollments
WHEN OLD.status <> 'pending_setup'
BEGIN
  SELECT RAISE(ABORT, 'Completed and cancelled password enrollments are immutable');
END;

CREATE TRIGGER staff_password_enrollments_require_completed_account
BEFORE UPDATE OF status, completed_at ON staff_password_enrollments
WHEN NEW.status = 'completed'
  AND NOT EXISTS (
    SELECT 1
    FROM staff_profiles AS profile
    JOIN staff_password_credentials AS credential ON credential.staff_id = profile.id
    WHERE profile.id = NEW.staff_id
      AND profile.account_status = 'active'
      AND credential.must_change_password = 0
  )
BEGIN
  SELECT RAISE(ABORT, 'Password enrollment can only complete for an active account');
END;

INSERT INTO permissions (code, description, sensitivity)
VALUES (
  'staff.credentials.manage',
  'Create, reset and revoke staff password credentials and sessions.',
  'security'
);

INSERT INTO role_permissions (role_code, permission_code)
VALUES ('system_admin', 'staff.credentials.manage');
