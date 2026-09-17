PRAGMA foreign_keys = ON;

-- Approved policy: assigned Prayer Warriors may close team requests.
INSERT OR IGNORE INTO role_permissions (role_code, permission_code)
SELECT roles.code, permissions.code FROM roles, permissions
WHERE roles.code = 'prayer_warrior' AND permissions.code = 'prayer.close';

CREATE TRIGGER prayer_requests_no_delete BEFORE DELETE ON prayer_requests
BEGIN SELECT RAISE(ABORT, 'Prayer request records must be retained and redacted, not deleted'); END;

CREATE TRIGGER prayer_requests_no_privacy_downgrade
BEFORE UPDATE OF privacy_scope ON prayer_requests
WHEN OLD.privacy_scope = 'pastoral_only' AND NEW.privacy_scope = 'team'
BEGIN SELECT RAISE(ABORT, 'Pastoral-only prayer requests cannot be downgraded'); END;

CREATE TRIGGER prayer_contacts_no_delete BEFORE DELETE ON prayer_request_contacts
BEGIN SELECT RAISE(ABORT, 'Prayer contact data must be redacted, not deleted'); END;

CREATE TRIGGER prayer_contacts_no_restore BEFORE UPDATE ON prayer_request_contacts
WHEN OLD.deleted_at IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'Deleted prayer contact data cannot be restored'); END;

CREATE TRIGGER prayer_assignments_no_delete BEFORE DELETE ON prayer_assignments
BEGIN SELECT RAISE(ABORT, 'Prayer assignments are append-only'); END;

CREATE TRIGGER prayer_assignments_identity_immutable
BEFORE UPDATE OF prayer_request_id, assigned_to, assigned_by, assigned_at ON prayer_assignments
BEGIN SELECT RAISE(ABORT, 'Prayer assignment identity is immutable'); END;

CREATE TRIGGER prayer_updates_no_delete BEFORE DELETE ON prayer_updates
BEGIN SELECT RAISE(ABORT, 'Prayer updates are append-only and may only be redacted'); END;

CREATE TRIGGER prayer_updates_identity_immutable
BEFORE UPDATE OF prayer_request_id, update_type, visibility_scope, created_by, created_at ON prayer_updates
BEGIN SELECT RAISE(ABORT, 'Prayer update history is immutable'); END;

CREATE TRIGGER prayer_updates_redaction_guard
BEFORE UPDATE OF note, content_deleted_at ON prayer_updates
WHEN NOT (
  OLD.content_deleted_at IS NULL AND NEW.note IS NULL AND NEW.content_deleted_at IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM prayer_requests WHERE prayer_requests.id = OLD.prayer_request_id
      AND prayer_requests.legal_hold = 0
      AND prayer_requests.content_retention_due_at IS NOT NULL
      AND prayer_requests.content_retention_due_at <= NEW.content_deleted_at
  )
)
BEGIN SELECT RAISE(ABORT, 'Prayer update content may only be redacted after retention expires'); END;
