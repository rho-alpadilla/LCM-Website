-- Cross-table guards for the staff invitation workflow.

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
