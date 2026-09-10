export type StaffAccountStatus =
  "invited" | "active" | "suspended" | "disabled";

export type StaffContext = {
  id: string;
  email: string;
  displayName: string;
  accountStatus: StaffAccountStatus;
  roles: string[];
  permissions: string[];
};

export type BootstrapAdministratorRecord = {
  staffId: string;
  roleAssignmentId: string;
  auditLogId: string;
  correlationId: string;
  accessSubject: string;
  email: string;
  displayName: string;
  reason: string;
  createdAt: string;
};

export interface AccessControlRepositoryPort {
  isBootstrapAvailable(): Promise<boolean>;
  bootstrapFirstSystemAdministrator(
    record: BootstrapAdministratorRecord,
  ): Promise<void>;
  findStaffContextByAccessSubject(
    accessSubject: string,
  ): Promise<StaffContext | null>;
  activeStaffHasPermission(
    accessSubject: string,
    email: string,
    permissionCode: string,
  ): Promise<boolean>;
}

type StaffProfileRow = {
  id: string;
  email: string;
  display_name: string;
  account_status: StaffAccountStatus;
};

type CodeRow = {
  code: string;
};

type PermissionCheckRow = {
  allowed: number;
};

export class AccessControlRepository implements AccessControlRepositoryPort {
  constructor(private readonly database: D1Database) {}

  async isBootstrapAvailable(): Promise<boolean> {
    const result = await this.database
      .prepare(
        `SELECT completed_at
         FROM system_bootstrap
         WHERE singleton_id = 1`,
      )
      .first<{ completed_at: string | null }>();

    return result?.completed_at === null;
  }

  async bootstrapFirstSystemAdministrator(
    record: BootstrapAdministratorRecord,
  ): Promise<void> {
    const metadata = JSON.stringify({
      role: "system_admin",
      reason: record.reason,
    });

    await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO staff_profiles (
             id,
             access_subject,
             email,
             display_name,
             account_status,
             created_at,
             updated_at
           ) VALUES (?1, ?2, ?3, ?4, 'active', ?5, ?5)`,
        )
        .bind(
          record.staffId,
          record.accessSubject,
          record.email,
          record.displayName,
          record.createdAt,
        ),
      this.database
        .prepare(
          `UPDATE system_bootstrap
           SET completed_by = ?1,
               completed_at = ?2
           WHERE singleton_id = 1`,
        )
        .bind(record.staffId, record.createdAt),
      this.database
        .prepare(
          `INSERT INTO staff_roles (
             id,
             staff_id,
             role_code,
             assigned_by,
             assignment_reason,
             assigned_at
           ) VALUES (?1, ?2, 'system_admin', ?2, ?3, ?4)`,
        )
        .bind(
          record.roleAssignmentId,
          record.staffId,
          record.reason,
          record.createdAt,
        ),
      this.database
        .prepare(
          `INSERT INTO audit_logs (
             id,
             actor_staff_id,
             actor_type,
             action,
             resource_type,
             resource_id,
             sensitivity,
             metadata_json,
             correlation_id,
             created_at
           ) VALUES (?1, ?2, 'staff', 'staff.bootstrap_completed',
                     'staff_profile', ?2, 'security', ?3, ?4, ?5)`,
        )
        .bind(
          record.auditLogId,
          record.staffId,
          metadata,
          record.correlationId,
          record.createdAt,
        ),
    ]);
  }

  async findStaffContextByAccessSubject(
    accessSubject: string,
  ): Promise<StaffContext | null> {
    const profile = await this.database
      .prepare(
        `SELECT id, email, display_name, account_status
         FROM staff_profiles
         WHERE access_subject = ?1`,
      )
      .bind(accessSubject)
      .first<StaffProfileRow>();

    if (!profile) {
      return null;
    }

    const [roleResult, permissionResult] = await this.database.batch<CodeRow>([
      this.database
        .prepare(
          `SELECT role_code AS code
           FROM staff_roles
           WHERE staff_id = ?1
             AND revoked_at IS NULL
           ORDER BY role_code`,
        )
        .bind(profile.id),
      this.database
        .prepare(
          `SELECT DISTINCT granted.permission_code AS code
           FROM staff_roles AS assignment
           JOIN role_permissions AS granted
             ON granted.role_code = assignment.role_code
           WHERE assignment.staff_id = ?1
             AND assignment.revoked_at IS NULL
           ORDER BY granted.permission_code`,
        )
        .bind(profile.id),
    ]);

    return {
      id: profile.id,
      email: profile.email,
      displayName: profile.display_name,
      accountStatus: profile.account_status,
      roles: roleResult.results.map(({ code }) => code),
      permissions: permissionResult.results.map(({ code }) => code),
    };
  }

  async activeStaffHasPermission(
    accessSubject: string,
    email: string,
    permissionCode: string,
  ): Promise<boolean> {
    const result = await this.database
      .prepare(
        `SELECT EXISTS (
           SELECT 1
           FROM staff_profiles AS staff
           JOIN staff_roles AS assignment
             ON assignment.staff_id = staff.id
            AND assignment.revoked_at IS NULL
           JOIN role_permissions AS granted
             ON granted.role_code = assignment.role_code
           WHERE staff.access_subject = ?1
             AND staff.email = ?2 COLLATE NOCASE
             AND staff.account_status = 'active'
             AND granted.permission_code = ?3
         ) AS allowed`,
      )
      .bind(accessSubject, email, permissionCode)
      .first<PermissionCheckRow>();

    return result?.allowed === 1;
  }
}
