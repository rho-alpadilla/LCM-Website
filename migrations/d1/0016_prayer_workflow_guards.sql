PRAGMA foreign_keys = ON;

CREATE TRIGGER prayer_updates_open_request_guard
BEFORE INSERT ON prayer_updates
WHEN EXISTS (
  SELECT 1 FROM prayer_requests
  WHERE id = NEW.prayer_request_id AND status IN ('closed', 'retention_review')
)
BEGIN
  SELECT RAISE(ABORT, 'Closed prayer requests cannot receive updates');
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
