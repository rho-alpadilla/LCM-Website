-- Keep staff provisioning recoverable when Cloudflare Access needs attention.
-- Existing pending invitations predate this workflow and were already added to
-- the Access policy, so they start in the ready state.

ALTER TABLE staff_invitations
  ADD COLUMN access_provisioning_status TEXT NOT NULL DEFAULT 'ready'
    CHECK (access_provisioning_status IN ('setting_up', 'ready', 'needs_attention'));

ALTER TABLE staff_invitations
  ADD COLUMN access_provisioning_error_code TEXT
    CHECK (
      access_provisioning_error_code IS NULL
      OR access_provisioning_error_code GLOB '[a-z]*'
        AND access_provisioning_error_code NOT GLOB '*[^a-z0-9_]*'
    );

ALTER TABLE staff_invitations
  ADD COLUMN access_provisioning_attempts INTEGER NOT NULL DEFAULT 0
    CHECK (access_provisioning_attempts >= 0);

ALTER TABLE staff_invitations
  ADD COLUMN access_provisioning_updated_at TEXT;

CREATE INDEX staff_invitations_pending_provisioning
  ON staff_invitations (access_provisioning_status, created_at DESC)
  WHERE status = 'pending';

CREATE TRIGGER staff_invitations_require_ready_access_for_acceptance
BEFORE UPDATE OF status, accepted_by, accepted_at ON staff_invitations
WHEN NEW.status = 'accepted' AND OLD.access_provisioning_status <> 'ready'
BEGIN
  SELECT RAISE(ABORT, 'Staff Access setup must be ready before invitation acceptance');
END;

CREATE TRIGGER staff_invitations_lock_access_provisioning_after_completion
BEFORE UPDATE OF access_provisioning_status, access_provisioning_error_code,
  access_provisioning_attempts, access_provisioning_updated_at
ON staff_invitations
WHEN OLD.status <> 'pending'
BEGIN
  SELECT RAISE(ABORT, 'Completed invitations cannot change Access provisioning');
END;
