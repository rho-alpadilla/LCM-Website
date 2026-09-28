-- Staff may use an administrator-issued temporary password for up to three
-- days. The account remains active during that short grace period, but every
-- request and the daily scheduled job enforce expiry and disable overdue
-- accounts until a System Administrator reissues a temporary password.

DROP TRIGGER staff_profiles_restrict_active_insert_after_bootstrap;
DROP TRIGGER staff_sessions_require_active_password_credential;
DROP TRIGGER staff_profiles_password_activation_requires_completed_setup;
DROP TRIGGER staff_password_credentials_require_versioned_temporary_change;
DROP TRIGGER staff_password_enrollments_prevent_identity_rewrite;

-- Existing pending password accounts receive the same three-day grace period
-- from their original temporary-password issue time.
UPDATE staff_password_credentials
SET password_expires_at = strftime(
  '%Y-%m-%dT%H:%M:%fZ',
  password_changed_at,
  '+3 days'
)
WHERE must_change_password = 1;

UPDATE staff_password_enrollments
SET expires_at = (
  SELECT credential.password_expires_at
  FROM staff_password_credentials AS credential
  WHERE credential.staff_id = staff_password_enrollments.staff_id
)
WHERE status = 'pending_setup';

UPDATE staff_profiles
SET account_status = 'active', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE account_status = 'invited'
  AND access_subject = 'password:' || id
  AND EXISTS (
    SELECT 1
    FROM staff_password_enrollments AS enrollment
    JOIN staff_password_credentials AS credential
      ON credential.staff_id = enrollment.staff_id
    WHERE enrollment.staff_id = staff_profiles.id
      AND enrollment.status = 'pending_setup'
      AND credential.must_change_password = 1
  );

CREATE TRIGGER staff_profiles_restrict_active_insert_after_bootstrap
BEFORE INSERT ON staff_profiles
WHEN NEW.account_status = 'active'
  AND EXISTS (
    SELECT 1 FROM system_bootstrap
    WHERE singleton_id = 1 AND completed_at IS NOT NULL
  )
  AND NOT EXISTS (
    SELECT 1
    FROM staff_password_enrollments
    WHERE staff_id = NEW.id
      AND email = NEW.email COLLATE NOCASE
      AND display_name = NEW.display_name
      AND status = 'pending_setup'
      AND NEW.access_subject = 'password:' || NEW.id
  )
BEGIN
  SELECT RAISE(ABORT, 'Active staff profiles must use an approved enrollment flow');
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
    AND (
      credential.must_change_password = 0
      OR credential.password_expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    )
)
BEGIN
  SELECT RAISE(ABORT, 'An active, unexpired password credential is required for a staff session');
END;

CREATE TRIGGER staff_profiles_password_activation_requires_usable_credential
BEFORE UPDATE OF account_status ON staff_profiles
WHEN OLD.account_status <> 'active'
  AND NEW.account_status = 'active'
  AND OLD.access_subject = 'password:' || OLD.id
  AND NEW.access_subject = 'password:' || NEW.id
  AND NOT EXISTS (
    SELECT 1
    FROM staff_password_credentials AS credential
    WHERE credential.staff_id = NEW.id
      AND (
        credential.must_change_password = 0
        OR credential.password_expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      )
  )
BEGIN
  SELECT RAISE(ABORT, 'Password staff need a usable credential before activation');
END;

CREATE TRIGGER staff_password_credentials_require_versioned_temporary_change
BEFORE UPDATE OF must_change_password, password_expires_at
ON staff_password_credentials
WHEN NEW.password_version <> OLD.password_version + 1
BEGIN
  SELECT RAISE(ABORT, 'Temporary password state must change with a new credential version');
END;

CREATE TRIGGER staff_password_enrollments_prevent_identity_rewrite
BEFORE UPDATE OF staff_id, email, username, display_name, initial_role_code,
  issued_by, expires_at, created_at
ON staff_password_enrollments
BEGIN
  SELECT RAISE(ABORT, 'Password enrollment identity is immutable; issue a new credential deliberately');
END;

CREATE INDEX staff_password_credentials_due_expiry
  ON staff_password_credentials (password_expires_at, staff_id)
  WHERE must_change_password = 1;
