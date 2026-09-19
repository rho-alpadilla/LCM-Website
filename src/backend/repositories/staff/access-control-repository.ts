import type { StaffAccountStatus, StaffContext } from "@/shared/staff/types";

export type { StaffAccountStatus, StaffContext } from "@/shared/staff/types";

export type StaffDirectoryEntry = {
  id: string;
  email: string;
  displayName: string;
  phone: string | null;
  jobTitle: string | null;
  accountStatus: StaffAccountStatus;
  roles: { assignmentId: string; code: string; name: string }[];
};

export type PendingInvitation = {
  id: string;
  email: string;
  displayName: string;
  phone: string | null;
  jobTitle: string | null;
  initialRoleCode: string;
  initialRoleName: string;
  assignmentReason: string | null;
  invitedBy: string;
  createdAt: string;
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

export type CreateInvitationRecord = {
  invitationId: string;
  auditLogId: string;
  correlationId: string;
  actorStaffId: string;
  email: string;
  displayName: string;
  phone: string | null;
  jobTitle: string | null;
  roleCode: string;
  reason: string | null;
  createdAt: string;
};

export type ActivateInvitationRecord = {
  invitation: PendingInvitation;
  staffId: string;
  roleAssignmentId: string;
  auditLogId: string;
  correlationId: string;
  accessSubject: string;
  createdAt: string;
};

export type RoleMutationRecord = {
  staffId: string;
  roleCode: string;
  actorStaffId: string;
  reason: string;
  auditLogId: string;
  correlationId: string;
  createdAt: string;
};

export type AssignRoleRecord = RoleMutationRecord & { assignmentId: string };

export type SuspendStaffRecord = {
  staffId: string;
  actorStaffId: string;
  reason: string;
  auditLogId: string;
  correlationId: string;
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
  emailHasStaffProfile(email: string): Promise<boolean>;
  findPendingInvitationByEmail(
    email: string,
  ): Promise<PendingInvitation | null>;
  createInvitation(record: CreateInvitationRecord): Promise<void>;
  activateInvitation(record: ActivateInvitationRecord): Promise<void>;
  listStaffDirectory(): Promise<{
    staff: StaffDirectoryEntry[];
    invitations: PendingInvitation[];
  }>;
  findStaffById(staffId: string): Promise<StaffDirectoryEntry | null>;
  assignRole(record: AssignRoleRecord): Promise<void>;
  revokeRole(record: RoleMutationRecord): Promise<void>;
  suspendStaff(record: SuspendStaffRecord): Promise<void>;
}

type StaffProfileRow = {
  id: string;
  email: string;
  display_name: string;
  phone: string | null;
  job_title: string | null;
  account_status: StaffAccountStatus;
};
type StaffRoleRow = {
  staff_id: string;
  assignment_id: string;
  code: string;
  name: string;
};
type InvitationRow = {
  id: string;
  email: string;
  display_name: string;
  phone: string | null;
  job_title: string | null;
  initial_role_code: string;
  initial_role_name: string;
  assignment_reason: string | null;
  invited_by: string;
  created_at: string;
};
type CodeRow = { code: string };
type BooleanRow = { allowed: number };

const invitationSelect = `
  SELECT invitation.id, invitation.email, invitation.display_name,
         invitation.phone, invitation.job_title, invitation.initial_role_code,
         role.name AS initial_role_name, invitation.assignment_reason,
         invitation.invited_by, invitation.created_at
  FROM staff_invitations AS invitation
  JOIN roles AS role ON role.code = invitation.initial_role_code`;

function mapInvitation(row: InvitationRow): PendingInvitation {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    phone: row.phone,
    jobTitle: row.job_title,
    initialRoleCode: row.initial_role_code,
    initialRoleName: row.initial_role_name,
    assignmentReason: row.assignment_reason,
    invitedBy: row.invited_by,
    createdAt: row.created_at,
  };
}

export class AccessControlRepository implements AccessControlRepositoryPort {
  constructor(private readonly database: D1Database) {}

  async isBootstrapAvailable(): Promise<boolean> {
    const result = await this.database
      .prepare(
        "SELECT completed_at FROM system_bootstrap WHERE singleton_id = 1",
      )
      .first<{ completed_at: string | null }>();
    return result?.completed_at === null;
  }

  async bootstrapFirstSystemAdministrator(
    record: BootstrapAdministratorRecord,
  ) {
    await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO staff_profiles
          (id, access_subject, email, display_name, account_status, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, 'active', ?5, ?5)`,
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
          `UPDATE system_bootstrap SET completed_by = ?1, completed_at = ?2
         WHERE singleton_id = 1`,
        )
        .bind(record.staffId, record.createdAt),
      this.database
        .prepare(
          `INSERT INTO staff_roles
          (id, staff_id, role_code, assigned_by, assignment_reason, assigned_at)
         VALUES (?1, ?2, 'system_admin', ?2, ?3, ?4)`,
        )
        .bind(
          record.roleAssignmentId,
          record.staffId,
          record.reason,
          record.createdAt,
        ),
      this.auditStatement({
        id: record.auditLogId,
        actorStaffId: record.staffId,
        action: "staff.bootstrap_completed",
        resourceType: "staff_profile",
        resourceId: record.staffId,
        metadata: { role: "system_admin", reason: record.reason },
        correlationId: record.correlationId,
        createdAt: record.createdAt,
      }),
    ]);
  }

  async findStaffContextByAccessSubject(accessSubject: string) {
    const profile = await this.database
      .prepare(
        `SELECT id, email, display_name, phone, job_title, account_status
       FROM staff_profiles WHERE access_subject = ?1`,
      )
      .bind(accessSubject)
      .first<StaffProfileRow>();
    if (!profile) return null;

    const [roleResult, permissionResult] = await this.database.batch<CodeRow>([
      this.database
        .prepare(
          `SELECT role_code AS code FROM staff_roles
         WHERE staff_id = ?1 AND revoked_at IS NULL ORDER BY role_code`,
        )
        .bind(profile.id),
      this.database
        .prepare(
          `SELECT DISTINCT granted.permission_code AS code
         FROM staff_roles AS assignment
         JOIN role_permissions AS granted ON granted.role_code = assignment.role_code
         WHERE assignment.staff_id = ?1 AND assignment.revoked_at IS NULL
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
  ) {
    const result = await this.database
      .prepare(
        `SELECT EXISTS (
         SELECT 1 FROM staff_profiles AS staff
         JOIN staff_roles AS assignment ON assignment.staff_id = staff.id AND assignment.revoked_at IS NULL
         JOIN role_permissions AS granted ON granted.role_code = assignment.role_code
         WHERE staff.access_subject = ?1 AND staff.email = ?2 COLLATE NOCASE
           AND staff.account_status = 'active' AND granted.permission_code = ?3
       ) AS allowed`,
      )
      .bind(accessSubject, email, permissionCode)
      .first<BooleanRow>();
    return result?.allowed === 1;
  }

  async emailHasStaffProfile(email: string) {
    const result = await this.database
      .prepare(
        "SELECT EXISTS (SELECT 1 FROM staff_profiles WHERE email = ?1 COLLATE NOCASE) AS allowed",
      )
      .bind(email)
      .first<BooleanRow>();
    return result?.allowed === 1;
  }

  async findPendingInvitationByEmail(email: string) {
    const row = await this.database
      .prepare(
        `${invitationSelect} WHERE invitation.email = ?1 COLLATE NOCASE AND invitation.status = 'pending'`,
      )
      .bind(email)
      .first<InvitationRow>();
    return row ? mapInvitation(row) : null;
  }

  async createInvitation(record: CreateInvitationRecord) {
    await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO staff_invitations
          (id, email, display_name, phone, job_title, initial_role_code,
           assignment_reason, invited_by, status, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'pending', ?9)`,
        )
        .bind(
          record.invitationId,
          record.email,
          record.displayName,
          record.phone,
          record.jobTitle,
          record.roleCode,
          record.reason,
          record.actorStaffId,
          record.createdAt,
        ),
      this.auditStatement({
        id: record.auditLogId,
        actorStaffId: record.actorStaffId,
        action: "staff.invitation_created",
        resourceType: "staff_invitation",
        resourceId: record.invitationId,
        metadata: {
          email: record.email,
          role: record.roleCode,
          reason: record.reason,
        },
        correlationId: record.correlationId,
        createdAt: record.createdAt,
      }),
    ]);
  }

  async activateInvitation(record: ActivateInvitationRecord) {
    const invite = record.invitation;
    await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO staff_profiles
          (id, access_subject, email, display_name, phone, job_title,
           account_status, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'invited', ?7, ?7)`,
        )
        .bind(
          record.staffId,
          record.accessSubject,
          invite.email,
          invite.displayName,
          invite.phone,
          invite.jobTitle,
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
          invite.initialRoleCode,
          invite.invitedBy,
          invite.assignmentReason,
          record.createdAt,
        ),
      this.database
        .prepare(
          `UPDATE staff_profiles SET account_status = 'active', updated_at = ?2
         WHERE id = ?1 AND account_status = 'invited'`,
        )
        .bind(record.staffId, record.createdAt),
      this.database
        .prepare(
          `UPDATE staff_invitations
         SET status = 'accepted', accepted_by = ?2, accepted_at = ?3
         WHERE id = ?1 AND status = 'pending'`,
        )
        .bind(invite.id, record.staffId, record.createdAt),
      this.auditStatement({
        id: record.auditLogId,
        actorStaffId: record.staffId,
        action: "staff.invitation_accepted",
        resourceType: "staff_profile",
        resourceId: record.staffId,
        metadata: { invitationId: invite.id, role: invite.initialRoleCode },
        correlationId: record.correlationId,
        createdAt: record.createdAt,
      }),
    ]);
  }

  async listStaffDirectory() {
    const [profileResult, roleResult, invitationResult] = await Promise.all([
      this.database
        .prepare(
          `SELECT id, email, display_name, phone, job_title, account_status
         FROM staff_profiles ORDER BY display_name COLLATE NOCASE LIMIT 100`,
        )
        .all<StaffProfileRow>(),
      this.database
        .prepare(
          `SELECT assignment.staff_id, assignment.id AS assignment_id, role.code, role.name
         FROM staff_roles AS assignment JOIN roles AS role ON role.code = assignment.role_code
         WHERE assignment.revoked_at IS NULL ORDER BY role.name COLLATE NOCASE`,
        )
        .all<StaffRoleRow>(),
      this.database
        .prepare(
          `${invitationSelect} WHERE invitation.status = 'pending'
         ORDER BY invitation.created_at DESC LIMIT 100`,
        )
        .all<InvitationRow>(),
    ]);
    const rolesByStaff = new Map<string, StaffDirectoryEntry["roles"]>();
    for (const role of roleResult.results) {
      const roles = rolesByStaff.get(role.staff_id) ?? [];
      roles.push({
        assignmentId: role.assignment_id,
        code: role.code,
        name: role.name,
      });
      rolesByStaff.set(role.staff_id, roles);
    }
    return {
      staff: profileResult.results.map((profile) => ({
        id: profile.id,
        email: profile.email,
        displayName: profile.display_name,
        phone: profile.phone,
        jobTitle: profile.job_title,
        accountStatus: profile.account_status,
        roles: rolesByStaff.get(profile.id) ?? [],
      })),
      invitations: invitationResult.results.map(mapInvitation),
    };
  }

  async findStaffById(staffId: string) {
    const profile = await this.database
      .prepare(
        `SELECT id, email, display_name, phone, job_title, account_status
       FROM staff_profiles WHERE id = ?1`,
      )
      .bind(staffId)
      .first<StaffProfileRow>();
    if (!profile) return null;
    const roles = await this.database
      .prepare(
        `SELECT assignment.staff_id, assignment.id AS assignment_id, role.code, role.name
       FROM staff_roles AS assignment JOIN roles AS role ON role.code = assignment.role_code
       WHERE assignment.staff_id = ?1 AND assignment.revoked_at IS NULL ORDER BY role.name`,
      )
      .bind(staffId)
      .all<StaffRoleRow>();
    return {
      id: profile.id,
      email: profile.email,
      displayName: profile.display_name,
      phone: profile.phone,
      jobTitle: profile.job_title,
      accountStatus: profile.account_status,
      roles: roles.results.map((role) => ({
        assignmentId: role.assignment_id,
        code: role.code,
        name: role.name,
      })),
    };
  }

  async assignRole(record: AssignRoleRecord) {
    await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO staff_roles
          (id, staff_id, role_code, assigned_by, assignment_reason, assigned_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
        )
        .bind(
          record.assignmentId,
          record.staffId,
          record.roleCode,
          record.actorStaffId,
          record.reason || null,
          record.createdAt,
        ),
      this.auditStatement({
        id: record.auditLogId,
        actorStaffId: record.actorStaffId,
        action: "staff.role_assigned",
        resourceType: "staff_profile",
        resourceId: record.staffId,
        metadata: { role: record.roleCode, reason: record.reason },
        correlationId: record.correlationId,
        createdAt: record.createdAt,
      }),
    ]);
  }

  async revokeRole(record: RoleMutationRecord) {
    const [mutation] = await this.database.batch([
      this.database
        .prepare(
          `UPDATE staff_roles SET revoked_by = ?3, revoked_at = ?4, revocation_reason = ?5
         WHERE staff_id = ?1 AND role_code = ?2 AND revoked_at IS NULL`,
        )
        .bind(
          record.staffId,
          record.roleCode,
          record.actorStaffId,
          record.createdAt,
          record.reason,
        ),
      this.changedRowAuditStatement({
        id: record.auditLogId,
        actorStaffId: record.actorStaffId,
        action: "staff.role_revoked",
        resourceType: "staff_profile",
        resourceId: record.staffId,
        metadata: { role: record.roleCode, reason: record.reason },
        correlationId: record.correlationId,
        createdAt: record.createdAt,
      }),
    ]);
    if (mutation.meta.changes !== 1) {
      throw new Error("The active role assignment no longer exists.");
    }
  }

  async suspendStaff(record: SuspendStaffRecord) {
    const [mutation] = await this.database.batch([
      this.database
        .prepare(
          `UPDATE staff_profiles SET account_status = 'suspended', updated_at = ?2
         WHERE id = ?1 AND account_status = 'active'`,
        )
        .bind(record.staffId, record.createdAt),
      this.changedRowAuditStatement({
        id: record.auditLogId,
        actorStaffId: record.actorStaffId,
        action: "staff.account_suspended",
        resourceType: "staff_profile",
        resourceId: record.staffId,
        metadata: { reason: record.reason },
        correlationId: record.correlationId,
        createdAt: record.createdAt,
      }),
    ]);
    if (mutation.meta.changes !== 1) {
      throw new Error("The staff account is no longer active.");
    }
  }

  private auditStatement(input: {
    id: string;
    actorStaffId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    metadata: Record<string, unknown>;
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

  private changedRowAuditStatement(
    input: Parameters<AccessControlRepository["auditStatement"]>[0],
  ) {
    return this.database
      .prepare(
        `INSERT INTO audit_logs
          (id, actor_staff_id, actor_type, action, resource_type, resource_id,
           sensitivity, metadata_json, correlation_id, created_at)
         SELECT ?1, ?2, 'staff', ?3, ?4, ?5, 'security', ?6, ?7, ?8
         WHERE changes() = 1`,
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
}
