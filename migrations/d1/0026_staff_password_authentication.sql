-- Password-login foundation. Cloudflare Access remains active until the
-- System Administrator deliberately switches authentication modes.

CREATE TABLE staff_password_credentials (
  staff_id TEXT PRIMARY KEY REFERENCES staff_profiles (id) ON DELETE RESTRICT,
  username TEXT NOT NULL COLLATE NOCASE UNIQUE
    CHECK (
      username GLOB '[a-z]*'
      AND username NOT GLOB '*[^a-z0-9._-]*'
      AND length(username) BETWEEN 3 AND 64
    ),
  password_hash TEXT NOT NULL
    CHECK (length(password_hash) BETWEEN 40 AND 128),
  password_salt TEXT NOT NULL
    CHECK (length(password_salt) BETWEEN 16 AND 128),
  hash_algorithm TEXT NOT NULL DEFAULT 'scrypt'
    CHECK (hash_algorithm = 'scrypt'),
  scrypt_cost INTEGER NOT NULL DEFAULT 65536
    CHECK (scrypt_cost = 65536),
  scrypt_block_size INTEGER NOT NULL DEFAULT 8
    CHECK (scrypt_block_size = 8),
  scrypt_parallelization INTEGER NOT NULL DEFAULT 2
    CHECK (scrypt_parallelization = 2),
  password_version INTEGER NOT NULL DEFAULT 1
    CHECK (password_version >= 1),
  must_change_password INTEGER NOT NULL DEFAULT 1
    CHECK (must_change_password IN (0, 1)),
  password_expires_at TEXT,
  password_changed_at TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES staff_profiles (id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (
    (must_change_password = 0 AND password_expires_at IS NULL)
    OR (must_change_password = 1 AND password_expires_at IS NOT NULL)
  )
);

CREATE TABLE staff_sessions (
  id TEXT PRIMARY KEY,
  staff_id TEXT NOT NULL REFERENCES staff_profiles (id) ON DELETE RESTRICT,
  token_digest BLOB NOT NULL UNIQUE CHECK (length(token_digest) = 32),
  password_version INTEGER NOT NULL CHECK (password_version >= 1),
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  idle_expires_at TEXT NOT NULL,
  absolute_expires_at TEXT NOT NULL,
  revoked_at TEXT,
  revoked_reason TEXT,
  CHECK (absolute_expires_at > created_at),
  CHECK (idle_expires_at > created_at),
  CHECK (
    (revoked_at IS NULL AND revoked_reason IS NULL)
    OR (revoked_at IS NOT NULL AND length(trim(revoked_reason)) BETWEEN 10 AND 500)
  )
);

CREATE INDEX staff_sessions_active_lookup
  ON staff_sessions (token_digest, absolute_expires_at)
  WHERE revoked_at IS NULL;

CREATE INDEX staff_sessions_staff_active
  ON staff_sessions (staff_id, created_at DESC)
  WHERE revoked_at IS NULL;

CREATE TRIGGER staff_password_credentials_require_active_staff
BEFORE INSERT ON staff_password_credentials
WHEN NOT EXISTS (
  SELECT 1 FROM staff_profiles
  WHERE id = NEW.staff_id AND account_status = 'active'
)
BEGIN
  SELECT RAISE(ABORT, 'Password credentials require an active staff account');
END;

CREATE TRIGGER staff_password_credentials_prevent_username_rewrite
BEFORE UPDATE OF staff_id, username, created_by, created_at
ON staff_password_credentials
BEGIN
  SELECT RAISE(ABORT, 'Password account identity is immutable; replace credentials deliberately');
END;

CREATE TRIGGER staff_password_credentials_require_password_version_increment
BEFORE UPDATE OF password_hash, password_salt, password_version, password_changed_at
ON staff_password_credentials
WHEN NEW.password_version <> OLD.password_version + 1
  OR NEW.password_changed_at <= OLD.password_changed_at
BEGIN
  SELECT RAISE(ABORT, 'Password changes must increment the credential version');
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

CREATE TRIGGER staff_sessions_prevent_identity_rewrite
BEFORE UPDATE OF id, staff_id, token_digest, password_version, created_at, absolute_expires_at
ON staff_sessions
BEGIN
  SELECT RAISE(ABORT, 'Staff session identity is immutable');
END;

CREATE TRIGGER staff_sessions_prevent_revocation_rewrite
BEFORE UPDATE OF revoked_at, revoked_reason ON staff_sessions
WHEN OLD.revoked_at IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'Staff session revocation history is immutable');
END;
