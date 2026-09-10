-- Lifechangers Ministry Incorporated
-- D1 access-control foundation

CREATE TABLE staff_profiles (
  id TEXT PRIMARY KEY,
  access_subject TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  display_name TEXT NOT NULL
    CHECK (length(trim(display_name)) BETWEEN 2 AND 120),
  phone TEXT CHECK (phone IS NULL OR length(trim(phone)) BETWEEN 1 AND 40),
  job_title TEXT CHECK (job_title IS NULL OR length(trim(job_title)) BETWEEN 1 AND 120),
  account_status TEXT NOT NULL DEFAULT 'invited'
    CHECK (account_status IN ('invited', 'active', 'suspended', 'disabled')),
  last_seen_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE roles (
  code TEXT PRIMARY KEY
    CHECK (
      code GLOB '[a-z]*'
      AND code NOT GLOB '*[^a-z0-9_]*'
    ),
  name TEXT NOT NULL UNIQUE CHECK (length(trim(name)) BETWEEN 1 AND 80),
  description TEXT NOT NULL CHECK (length(trim(description)) > 0),
  is_system INTEGER NOT NULL DEFAULT 1 CHECK (is_system IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE permissions (
  code TEXT PRIMARY KEY
    CHECK (
      code GLOB '[a-z]*'
      AND code NOT GLOB '*[^a-z0-9_.]*'
    ),
  description TEXT NOT NULL CHECK (length(trim(description)) > 0),
  sensitivity TEXT NOT NULL DEFAULT 'standard'
    CHECK (sensitivity IN ('standard', 'personal', 'prayer', 'financial', 'security'))
);

CREATE TABLE role_permissions (
  role_code TEXT NOT NULL REFERENCES roles (code) ON DELETE RESTRICT,
  permission_code TEXT NOT NULL REFERENCES permissions (code) ON DELETE RESTRICT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (role_code, permission_code)
);

CREATE TABLE staff_roles (
  id TEXT PRIMARY KEY,
  staff_id TEXT NOT NULL REFERENCES staff_profiles (id) ON DELETE RESTRICT,
  role_code TEXT NOT NULL REFERENCES roles (code) ON DELETE RESTRICT,
  assigned_by TEXT NOT NULL REFERENCES staff_profiles (id) ON DELETE RESTRICT,
  assignment_reason TEXT,
  assigned_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  revoked_by TEXT REFERENCES staff_profiles (id) ON DELETE RESTRICT,
  revoked_at TEXT,
  revocation_reason TEXT,
  CHECK (
    (revoked_at IS NULL AND revoked_by IS NULL AND revocation_reason IS NULL)
    OR
    (
      revoked_at IS NOT NULL
      AND revoked_by IS NOT NULL
      AND length(trim(revocation_reason)) >= 10
    )
  )
);

CREATE UNIQUE INDEX staff_roles_one_active_assignment
  ON staff_roles (staff_id, role_code)
  WHERE revoked_at IS NULL;

CREATE INDEX staff_roles_active_staff
  ON staff_roles (staff_id, role_code)
  WHERE revoked_at IS NULL;

CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  actor_staff_id TEXT REFERENCES staff_profiles (id) ON DELETE RESTRICT,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('staff', 'system', 'provider')),
  action TEXT NOT NULL
    CHECK (
      action GLOB '[a-z]*'
      AND action NOT GLOB '*[^a-z0-9_.]*'
    ),
  resource_type TEXT NOT NULL CHECK (length(trim(resource_type)) > 0),
  resource_id TEXT,
  sensitivity TEXT NOT NULL DEFAULT 'standard'
    CHECK (sensitivity IN ('standard', 'personal', 'prayer', 'financial', 'security')),
  metadata_json TEXT NOT NULL DEFAULT '{}'
    CHECK (json_valid(metadata_json)),
  correlation_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX audit_logs_created_at_idx ON audit_logs (created_at DESC);
CREATE INDEX audit_logs_actor_idx ON audit_logs (actor_staff_id, created_at DESC);
CREATE INDEX audit_logs_resource_idx
  ON audit_logs (resource_type, resource_id, created_at DESC);
CREATE INDEX audit_logs_sensitivity_idx
  ON audit_logs (sensitivity, created_at DESC);

CREATE TABLE system_bootstrap (
  singleton_id INTEGER PRIMARY KEY CHECK (singleton_id = 1),
  completed_by TEXT REFERENCES staff_profiles (id) ON DELETE RESTRICT,
  completed_at TEXT,
  CHECK (
    (completed_by IS NULL AND completed_at IS NULL)
    OR
    (completed_by IS NOT NULL AND completed_at IS NOT NULL)
  )
);

INSERT INTO system_bootstrap (singleton_id) VALUES (1);

CREATE TRIGGER system_bootstrap_prevent_second_completion
BEFORE UPDATE OF completed_by, completed_at ON system_bootstrap
WHEN OLD.completed_at IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'The first administrator has already been created');
END;

CREATE TRIGGER system_bootstrap_prevent_delete
BEFORE DELETE ON system_bootstrap
BEGIN
  SELECT RAISE(ABORT, 'Bootstrap state cannot be deleted');
END;

CREATE TRIGGER staff_profiles_restrict_active_insert_after_bootstrap
BEFORE INSERT ON staff_profiles
WHEN NEW.account_status = 'active'
  AND EXISTS (
    SELECT 1
    FROM system_bootstrap
    WHERE singleton_id = 1
      AND completed_at IS NOT NULL
  )
BEGIN
  SELECT RAISE(ABORT, 'Active staff profiles must use the approved invitation flow');
END;

CREATE TRIGGER staff_roles_require_elevated_reason
BEFORE INSERT ON staff_roles
WHEN NEW.role_code IN ('system_admin', 'core_leader')
  AND coalesce(length(trim(NEW.assignment_reason)), 0) < 10
BEGIN
  SELECT RAISE(ABORT, 'Elevated role assignments require a reason');
END;

CREATE TRIGGER staff_roles_require_leader_before_core_leader
BEFORE INSERT ON staff_roles
WHEN NEW.role_code = 'core_leader'
  AND NOT EXISTS (
    SELECT 1
    FROM staff_roles
    WHERE staff_id = NEW.staff_id
      AND role_code = 'leader'
      AND revoked_at IS NULL
  )
BEGIN
  SELECT RAISE(ABORT, 'Core Leader access requires an active Leader role');
END;

CREATE TRIGGER staff_roles_prevent_assignment_rewrite
BEFORE UPDATE OF staff_id, role_code, assigned_by, assignment_reason, assigned_at
ON staff_roles
BEGIN
  SELECT RAISE(ABORT, 'Role assignments are immutable; revoke and create a new assignment');
END;

CREATE TRIGGER staff_roles_prevent_revocation_rewrite
BEFORE UPDATE OF revoked_by, revoked_at, revocation_reason ON staff_roles
WHEN OLD.revoked_at IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'Role revocation history is immutable');
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

CREATE TRIGGER staff_profiles_protect_final_system_admin
BEFORE UPDATE OF account_status ON staff_profiles
WHEN OLD.account_status = 'active'
  AND NEW.account_status <> 'active'
  AND EXISTS (
    SELECT 1
    FROM staff_roles
    WHERE staff_id = OLD.id
      AND role_code = 'system_admin'
      AND revoked_at IS NULL
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

CREATE TRIGGER system_roles_prevent_delete
BEFORE DELETE ON roles
WHEN OLD.is_system = 1
BEGIN
  SELECT RAISE(ABORT, 'System roles cannot be deleted');
END;

CREATE TRIGGER permissions_prevent_delete
BEFORE DELETE ON permissions
BEGIN
  SELECT RAISE(ABORT, 'Permissions cannot be deleted');
END;

CREATE TRIGGER audit_logs_prevent_update
BEFORE UPDATE ON audit_logs
BEGIN
  SELECT RAISE(ABORT, 'Audit records are append-only');
END;

CREATE TRIGGER audit_logs_prevent_delete
BEFORE DELETE ON audit_logs
BEGIN
  SELECT RAISE(ABORT, 'Audit records are append-only');
END;
