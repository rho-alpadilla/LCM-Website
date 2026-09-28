import type { StaffPasswordCredential } from "@/shared/auth/password-authentication";
import type { StaffAccountStatus } from "@/shared/staff/types";

export type PasswordSessionRecord = {
  id: string;
  staffId: string;
  tokenDigest: Uint8Array;
  passwordVersion: number;
  createdAt: string;
  lastSeenAt: string;
  idleExpiresAt: string;
  absoluteExpiresAt: string;
};

export type ActivePasswordSession = {
  id: string;
  staffId: string;
  passwordVersion: number;
  lastSeenAt: string;
  mustChangePassword: boolean;
  passwordExpiresAt: string | null;
};

export type PasswordStaffDirectoryEntry = {
  id: string;
  email: string;
  displayName: string;
  phone: string | null;
  jobTitle: string | null;
  accountStatus: StaffAccountStatus;
  username: string | null;
  temporaryPasswordPending: boolean;
  temporaryPasswordExpiresAt: string | null;
  roles: { assignmentId: string; code: string; name: string }[];
};

export type CreatePasswordEnrollmentRecord = {
  staffId: string;
  roleAssignmentId: string;
  auditLogId: string;
  correlationId: string;
  actorStaffId: string;
  email: string;
  displayName: string;
  phone: string | null;
  jobTitle: string | null;
  username: string;
  roleCode: string;
  reason: string | null;
  passwordHash: string;
  passwordSalt: string;
  passwordExpiresAt: string;
  createdAt: string;
};

export type CompleteTemporaryPasswordSetupRecord = {
  staffId: string;
  previousPasswordVersion: number;
  passwordHash: string;
  passwordSalt: string;
  changedAt: string;
  session: PasswordSessionRecord;
  auditLogId: string;
  correlationId: string;
  action: "staff.password_temporary_setup_completed";
};

export type ReplacePasswordRecord = {
  staffId: string;
  previousPasswordVersion: number;
  passwordHash: string;
  passwordSalt: string;
  changedAt: string;
  session?: PasswordSessionRecord;
  actorStaffId: string;
  auditLogId: string;
  correlationId: string;
  action: "staff.password_changed" | "staff.password_reset_issued";
  metadata: Record<string, string>;
};

export type RevokeStaffSessionsRecord = {
  staffId: string;
  actorStaffId: string;
  reason: string;
  revokedAt: string;
  auditLogId: string;
  correlationId: string;
};

export type ExpiredTemporaryPasswordRecord = {
  staffId: string;
  disabledAt: string;
  auditLogId: string;
  correlationId: string;
};

export type ReactivateTemporaryPasswordRecord = {
  staffId: string;
  previousPasswordVersion: number;
  passwordHash: string;
  passwordSalt: string;
  passwordExpiresAt: string;
  reactivatedAt: string;
  actorStaffId: string;
  reason: string;
  auditLogId: string;
  correlationId: string;
};

export interface PasswordAuthenticationRepositoryPort {
  findCredentialByUsername(
    username: string,
  ): Promise<StaffPasswordCredential | null>;
  findCredentialByStaffId(
    staffId: string,
  ): Promise<StaffPasswordCredential | null>;
  usernameExists(username: string): Promise<boolean>;
  emailExists(email: string): Promise<boolean>;
  createPasswordEnrollment(
    record: CreatePasswordEnrollmentRecord,
  ): Promise<void>;
  listPasswordStaffDirectory(): Promise<PasswordStaffDirectoryEntry[]>;
  createSession(record: PasswordSessionRecord): Promise<void>;
  findActiveSessionByDigest(
    tokenDigest: Uint8Array,
    now: string,
  ): Promise<ActivePasswordSession | null>;
  touchSession(
    sessionId: string,
    lastSeenAt: string,
    idleExpiresAt: string,
  ): Promise<void>;
  revokeSession(
    sessionId: string,
    revokedAt: string,
    reason: string,
  ): Promise<void>;
  completeTemporaryPasswordSetup(
    record: CompleteTemporaryPasswordSetupRecord,
  ): Promise<void>;
  replacePassword(record: ReplacePasswordRecord): Promise<void>;
  findExpiredTemporaryPasswordStaff(
    now: string,
    limit: number,
  ): Promise<string[]>;
  disableExpiredTemporaryPassword(
    record: ExpiredTemporaryPasswordRecord,
  ): Promise<boolean>;
  reactivateTemporaryPassword(
    record: ReactivateTemporaryPasswordRecord,
  ): Promise<void>;
  revokeAllActiveSessions(record: RevokeStaffSessionsRecord): Promise<void>;
}

type CredentialRow = {
  staff_id: string;
  username: string;
  password_hash: string;
  password_salt: string;
  password_version: number;
  must_change_password: number;
  account_status: StaffPasswordCredential["accountStatus"];
  password_expires_at: string | null;
};

type SessionRow = {
  id: string;
  staff_id: string;
  password_version: number;
  last_seen_at: string;
  must_change_password: number;
  password_expires_at: string | null;
};

type DirectoryRow = {
  id: string;
  email: string;
  display_name: string;
  phone: string | null;
  job_title: string | null;
  account_status: StaffAccountStatus;
  username: string | null;
  temporary_password_pending: number;
  temporary_password_expires_at: string | null;
};

type RoleRow = {
  staff_id: string;
  assignment_id: string;
  code: string;
  name: string;
};
type ExistsRow = { exists_value: number };

export class PasswordAuthenticationRepository implements PasswordAuthenticationRepositoryPort {
  constructor(private readonly database: D1Database) {}

  async findCredentialByUsername(username: string) {
    return this.findCredential(
      `WHERE credential.username = ?1 COLLATE NOCASE`,
      username,
    );
  }

  async findCredentialByStaffId(staffId: string) {
    return this.findCredential("WHERE credential.staff_id = ?1", staffId);
  }

  async usernameExists(username: string) {
    return this.exists(
      `SELECT EXISTS (
         SELECT 1 FROM staff_password_credentials WHERE username = ?1 COLLATE NOCASE
       ) OR EXISTS (
         SELECT 1 FROM staff_password_enrollments
         WHERE username = ?1 COLLATE NOCASE AND status = 'pending_setup'
       ) AS exists_value`,
      username,
    );
  }

  async emailExists(email: string) {
    return this.exists(
      `SELECT EXISTS (
         SELECT 1 FROM staff_profiles WHERE email = ?1 COLLATE NOCASE
       ) OR EXISTS (
         SELECT 1 FROM staff_password_enrollments
         WHERE email = ?1 COLLATE NOCASE AND status = 'pending_setup'
       ) AS exists_value`,
      email,
    );
  }

  async createPasswordEnrollment(record: CreatePasswordEnrollmentRecord) {
    await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO staff_password_enrollments
         (staff_id, email, username, display_name, initial_role_code, issued_by,
          status, expires_at, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'pending_setup', ?7, ?8)`,
        )
        .bind(
          record.staffId,
          record.email,
          record.username,
          record.displayName,
          record.roleCode,
          record.actorStaffId,
          record.passwordExpiresAt,
          record.createdAt,
        ),
      this.database
        .prepare(
          `INSERT INTO staff_profiles
         (id, access_subject, email, display_name, phone, job_title,
          account_status, created_at, updated_at)
         VALUES (?1, 'password:' || ?1, ?2, ?3, ?4, ?5, 'active', ?6, ?6)`,
        )
        .bind(
          record.staffId,
          record.email,
          record.displayName,
          record.phone,
          record.jobTitle,
          record.createdAt,
        ),
      this.database
        .prepare(
          `INSERT INTO staff_roles
         (id, staff_id, role_code, assigned_by, assignment_reason, assigned_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
        )
        .bind(
          record.roleAssignmentId,
          record.staffId,
          record.roleCode,
          record.actorStaffId,
          record.reason,
          record.createdAt,
        ),
      this.database
        .prepare(
          `INSERT INTO staff_password_credentials
         (staff_id, username, password_hash, password_salt, password_version,
          must_change_password, password_expires_at, password_changed_at,
          created_by, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, 1, 1, ?5, ?6, ?7, ?6, ?6)`,
        )
        .bind(
          record.staffId,
          record.username,
          record.passwordHash,
          record.passwordSalt,
          record.passwordExpiresAt,
          record.createdAt,
          record.actorStaffId,
        ),
      this.auditStatement({
        id: record.auditLogId,
        actorStaffId: record.actorStaffId,
        action: "staff.password_enrollment_issued",
        resourceType: "staff_profile",
        resourceId: record.staffId,
        metadata: {
          role: record.roleCode,
          username: record.username,
          reason: record.reason,
        },
        correlationId: record.correlationId,
        createdAt: record.createdAt,
      }),
    ]);
  }

  async listPasswordStaffDirectory() {
    const [profiles, roles] = await this.database.batch<DirectoryRow | RoleRow>(
      [
        this.database.prepare(
          `SELECT profile.id, profile.email, profile.display_name, profile.phone,
                profile.job_title, profile.account_status, credential.username,
                coalesce(credential.must_change_password, 0) AS temporary_password_pending,
                credential.password_expires_at AS temporary_password_expires_at
         FROM staff_profiles AS profile
         LEFT JOIN staff_password_credentials AS credential ON credential.staff_id = profile.id
         WHERE credential.staff_id IS NOT NULL
         ORDER BY profile.display_name COLLATE NOCASE LIMIT 100`,
        ),
        this.database.prepare(
          `SELECT assignment.staff_id, assignment.id AS assignment_id, role.code, role.name
         FROM staff_roles AS assignment JOIN roles AS role ON role.code = assignment.role_code
         WHERE assignment.revoked_at IS NULL ORDER BY role.name COLLATE NOCASE`,
        ),
      ],
    );
    const rolesByStaff = new Map<
      string,
      PasswordStaffDirectoryEntry["roles"]
    >();
    for (const row of roles.results as RoleRow[]) {
      const roleList = rolesByStaff.get(row.staff_id) ?? [];
      roleList.push({
        assignmentId: row.assignment_id,
        code: row.code,
        name: row.name,
      });
      rolesByStaff.set(row.staff_id, roleList);
    }
    return (profiles.results as DirectoryRow[]).map((profile) => ({
      id: profile.id,
      email: profile.email,
      displayName: profile.display_name,
      phone: profile.phone,
      jobTitle: profile.job_title,
      accountStatus: profile.account_status,
      username: profile.username,
      temporaryPasswordPending: profile.temporary_password_pending === 1,
      temporaryPasswordExpiresAt: profile.temporary_password_expires_at,
      roles: rolesByStaff.get(profile.id) ?? [],
    }));
  }

  async createSession(record: PasswordSessionRecord) {
    await this.sessionStatement(record).run();
  }

  async findActiveSessionByDigest(tokenDigest: Uint8Array, now: string) {
    const row = await this.database
      .prepare(
        `SELECT session.id, session.staff_id, session.password_version, session.last_seen_at,
                credential.must_change_password, credential.password_expires_at
       FROM staff_sessions AS session
       JOIN staff_profiles AS profile ON profile.id = session.staff_id
       JOIN staff_password_credentials AS credential ON credential.staff_id = session.staff_id
       WHERE session.token_digest = ?1 AND session.revoked_at IS NULL
         AND session.idle_expires_at > ?2 AND session.absolute_expires_at > ?2
         AND profile.account_status = 'active'
         AND credential.password_version = session.password_version`,
      )
      .bind(tokenDigest.buffer, now)
      .first<SessionRow>();
    return row
      ? {
          id: row.id,
          staffId: row.staff_id,
          passwordVersion: row.password_version,
          lastSeenAt: row.last_seen_at,
          mustChangePassword: row.must_change_password === 1,
          passwordExpiresAt: row.password_expires_at,
        }
      : null;
  }

  async touchSession(
    sessionId: string,
    lastSeenAt: string,
    idleExpiresAt: string,
  ) {
    await this.database
      .prepare(
        `UPDATE staff_sessions SET last_seen_at = ?2, idle_expires_at = ?3
       WHERE id = ?1 AND revoked_at IS NULL`,
      )
      .bind(sessionId, lastSeenAt, idleExpiresAt)
      .run();
  }

  async revokeSession(sessionId: string, revokedAt: string, reason: string) {
    await this.database
      .prepare(
        `UPDATE staff_sessions SET revoked_at = ?2, revoked_reason = ?3
       WHERE id = ?1 AND revoked_at IS NULL`,
      )
      .bind(sessionId, revokedAt, reason)
      .run();
  }

  async completeTemporaryPasswordSetup(
    record: CompleteTemporaryPasswordSetupRecord,
  ) {
    const [credentialMutation] = await this.database.batch([
      this.replaceCredentialStatement(
        record.staffId,
        record.previousPasswordVersion,
        record.passwordHash,
        record.passwordSalt,
        record.changedAt,
        false,
        null,
      ),
      this.database
        .prepare(
          `UPDATE staff_profiles SET account_status = 'active', updated_at = ?2
         WHERE id = ?1 AND account_status = 'invited'
           AND access_subject = 'password:' || id`,
        )
        .bind(record.staffId, record.changedAt),
      this.database
        .prepare(
          `UPDATE staff_password_enrollments SET status = 'completed', completed_at = ?2
         WHERE staff_id = ?1 AND status = 'pending_setup'`,
        )
        .bind(record.staffId, record.changedAt),
      this.sessionStatement(record.session),
      this.auditStatement({
        id: record.auditLogId,
        actorStaffId: record.staffId,
        action: record.action,
        resourceType: "staff_profile",
        resourceId: record.staffId,
        metadata: {},
        correlationId: record.correlationId,
        createdAt: record.changedAt,
      }),
    ]);
    if (credentialMutation.meta.changes !== 1) {
      throw new Error("Temporary password setup is no longer available.");
    }
  }

  async replacePassword(record: ReplacePasswordRecord) {
    const isReset = record.action === "staff.password_reset_issued";
    const [credentialMutation] = await this.database.batch([
      this.replaceCredentialStatement(
        record.staffId,
        record.previousPasswordVersion,
        record.passwordHash,
        record.passwordSalt,
        record.changedAt,
        isReset,
        isReset
          ? new Date(
              Date.parse(record.changedAt) + 30 * 60 * 1_000,
            ).toISOString()
          : null,
      ),
      this.database
        .prepare(
          `UPDATE staff_sessions SET revoked_at = ?2, revoked_reason = 'Password was replaced.'
         WHERE staff_id = ?1 AND revoked_at IS NULL`,
        )
        .bind(record.staffId, record.changedAt),
      ...(record.session ? [this.sessionStatement(record.session)] : []),
      this.auditStatement({
        id: record.auditLogId,
        actorStaffId: record.actorStaffId,
        action: record.action,
        resourceType: "staff_profile",
        resourceId: record.staffId,
        metadata: record.metadata,
        correlationId: record.correlationId,
        createdAt: record.changedAt,
      }),
    ]);
    if (credentialMutation.meta.changes !== 1) {
      throw new Error("Password replacement could not be completed.");
    }
  }

  async findExpiredTemporaryPasswordStaff(now: string, limit: number) {
    const result = await this.database
      .prepare(
        `SELECT profile.id
         FROM staff_profiles AS profile
         JOIN staff_password_credentials AS credential
           ON credential.staff_id = profile.id
         WHERE profile.account_status = 'active'
           AND credential.must_change_password = 1
           AND credential.password_expires_at <= ?1
         ORDER BY credential.password_expires_at ASC
         LIMIT ?2`,
      )
      .bind(now, limit)
      .all<{ id: string }>();
    return result.results.map((row) => row.id);
  }

  async disableExpiredTemporaryPassword(
    record: ExpiredTemporaryPasswordRecord,
  ) {
    const profileMutation = await this.database
      .prepare(
        `UPDATE staff_profiles
         SET account_status = 'disabled', updated_at = ?2
         WHERE id = ?1
           AND account_status = 'active'
           AND EXISTS (
             SELECT 1
             FROM staff_password_credentials AS credential
             WHERE credential.staff_id = staff_profiles.id
               AND credential.must_change_password = 1
               AND credential.password_expires_at <= ?2
           )`,
      )
      .bind(record.staffId, record.disabledAt)
      .run();
    if (profileMutation.meta.changes !== 1) return false;

    await this.database.batch([
      this.database
        .prepare(
          `UPDATE staff_sessions
           SET revoked_at = ?2,
               revoked_reason = 'Temporary password setup period expired.'
           WHERE staff_id = ?1 AND revoked_at IS NULL`,
        )
        .bind(record.staffId, record.disabledAt),
      this.systemAuditStatement({
        id: record.auditLogId,
        action: "staff.temporary_password_expired",
        resourceType: "staff_profile",
        resourceId: record.staffId,
        correlationId: record.correlationId,
        createdAt: record.disabledAt,
      }),
    ]);
    return true;
  }

  async reactivateTemporaryPassword(record: ReactivateTemporaryPasswordRecord) {
    const [credentialMutation, profileMutation] = await this.database.batch([
      this.replaceCredentialStatement(
        record.staffId,
        record.previousPasswordVersion,
        record.passwordHash,
        record.passwordSalt,
        record.reactivatedAt,
        true,
        record.passwordExpiresAt,
      ),
      this.database
        .prepare(
          `UPDATE staff_profiles
           SET account_status = 'active', updated_at = ?2
           WHERE id = ?1 AND account_status = 'disabled'
             AND access_subject = 'password:' || id`,
        )
        .bind(record.staffId, record.reactivatedAt),
      this.database
        .prepare(
          `UPDATE staff_sessions
           SET revoked_at = ?2,
               revoked_reason = 'Temporary password setup was reissued.'
           WHERE staff_id = ?1 AND revoked_at IS NULL`,
        )
        .bind(record.staffId, record.reactivatedAt),
      this.auditStatement({
        id: record.auditLogId,
        actorStaffId: record.actorStaffId,
        action: "staff.temporary_password_reactivated",
        resourceType: "staff_profile",
        resourceId: record.staffId,
        metadata: { reason: record.reason },
        correlationId: record.correlationId,
        createdAt: record.reactivatedAt,
      }),
    ]);
    if (
      credentialMutation.meta.changes !== 1 ||
      profileMutation.meta.changes !== 1
    ) {
      throw new Error(
        "Temporary password reactivation could not be completed.",
      );
    }
  }

  async revokeAllActiveSessions(record: RevokeStaffSessionsRecord) {
    await this.database.batch([
      this.database
        .prepare(
          `UPDATE staff_sessions SET revoked_at = ?2, revoked_reason = ?3
         WHERE staff_id = ?1 AND revoked_at IS NULL`,
        )
        .bind(record.staffId, record.revokedAt, record.reason),
      this.auditStatement({
        id: record.auditLogId,
        actorStaffId: record.actorStaffId,
        action: "staff.password_sessions_revoked",
        resourceType: "staff_profile",
        resourceId: record.staffId,
        metadata: { reason: record.reason },
        correlationId: record.correlationId,
        createdAt: record.revokedAt,
      }),
    ]);
  }

  private async findCredential(whereClause: string, value: string) {
    const row = await this.database
      .prepare(
        `SELECT credential.staff_id, credential.username, credential.password_hash,
              credential.password_salt, credential.password_version,
              credential.must_change_password, profile.account_status,
              credential.password_expires_at
       FROM staff_password_credentials AS credential
       JOIN staff_profiles AS profile ON profile.id = credential.staff_id
       ${whereClause}`,
      )
      .bind(value)
      .first<CredentialRow>();
    return row ? this.mapCredential(row) : null;
  }

  private async exists(query: string, value: string) {
    const row = await this.database
      .prepare(query)
      .bind(value)
      .first<ExistsRow>();
    return row?.exists_value === 1;
  }

  private mapCredential(row: CredentialRow): StaffPasswordCredential {
    return {
      staffId: row.staff_id,
      username: row.username,
      passwordHash: row.password_hash,
      passwordSalt: row.password_salt,
      passwordVersion: row.password_version,
      mustChangePassword: row.must_change_password === 1,
      accountStatus: row.account_status,
      passwordExpiresAt: row.password_expires_at,
    };
  }

  private replaceCredentialStatement(
    staffId: string,
    previousPasswordVersion: number,
    passwordHash: string,
    passwordSalt: string,
    changedAt: string,
    mustChangePassword: boolean,
    passwordExpiresAt: string | null,
  ) {
    return this.database
      .prepare(
        `UPDATE staff_password_credentials
       SET password_hash = ?3, password_salt = ?4,
           password_version = password_version + 1,
           must_change_password = ?5, password_expires_at = ?6,
           password_changed_at = ?7, updated_at = ?7
       WHERE staff_id = ?1 AND password_version = ?2`,
      )
      .bind(
        staffId,
        previousPasswordVersion,
        passwordHash,
        passwordSalt,
        mustChangePassword ? 1 : 0,
        passwordExpiresAt,
        changedAt,
      );
  }

  private sessionStatement(record: PasswordSessionRecord) {
    return this.database
      .prepare(
        `INSERT INTO staff_sessions
       (id, staff_id, token_digest, password_version, created_at,
        last_seen_at, idle_expires_at, absolute_expires_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
      )
      .bind(
        record.id,
        record.staffId,
        record.tokenDigest.buffer,
        record.passwordVersion,
        record.createdAt,
        record.lastSeenAt,
        record.idleExpiresAt,
        record.absoluteExpiresAt,
      );
  }

  private auditStatement(input: {
    id: string;
    actorStaffId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    metadata: Record<string, string | null>;
    correlationId: string;
    createdAt: string;
  }) {
    return this.database
      .prepare(
        `INSERT INTO audit_logs
       (id, actor_staff_id, actor_type, action, resource_type, resource_id,
        sensitivity, metadata_json, correlation_id, created_at)
       VALUES (?1, ?2, 'staff', ?3, ?4, ?5, 'security', ?6, ?7, ?8)`,
      )
      .bind(
        input.id,
        input.actorStaffId,
        input.action,
        input.resourceType,
        input.resourceId,
        JSON.stringify(input.metadata),
        input.correlationId,
        input.createdAt,
      );
  }

  private systemAuditStatement(input: {
    id: string;
    action: string;
    resourceType: string;
    resourceId: string;
    correlationId: string;
    createdAt: string;
  }) {
    return this.database
      .prepare(
        `INSERT INTO audit_logs
       (id, actor_staff_id, actor_type, action, resource_type, resource_id,
        sensitivity, metadata_json, correlation_id, created_at)
       VALUES (?1, NULL, 'system', ?2, ?3, ?4, 'security', '{}', ?5, ?6)`,
      )
      .bind(
        input.id,
        input.action,
        input.resourceType,
        input.resourceId,
        input.correlationId,
        input.createdAt,
      );
  }
}
