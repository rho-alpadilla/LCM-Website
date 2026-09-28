-- A temporary-password flag may only change as part of a versioned password
-- replacement. This prevents a direct row update from turning a setup-only
-- credential into a dashboard credential.

CREATE TRIGGER staff_password_credentials_require_versioned_temporary_change
BEFORE UPDATE OF must_change_password, password_expires_at
ON staff_password_credentials
WHEN NEW.password_version <> OLD.password_version + 1
BEGIN
  SELECT RAISE(ABORT, 'Temporary password state must change with a new credential version');
END;
