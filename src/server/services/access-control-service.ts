import { z } from "zod";

import { ApplicationError } from "@/lib/errors/application-error";
import type {
  AccessControlRepositoryPort,
  StaffContext,
} from "@/server/repositories/access-control-repository";

const verifiedIdentitySchema = z.object({
  accessSubject: z.string().trim().min(1).max(255),
  email: z.email().transform((email) => email.toLowerCase()),
});

const bootstrapAdministratorSchema = verifiedIdentitySchema.extend({
  displayName: z.string().trim().min(2).max(120),
  reason: z.string().trim().min(10).max(500),
});

const roleCodeSchema = z.enum([
  "system_admin",
  "pastor",
  "core_leader",
  "content_publisher",
  "content_editor",
  "prayer_warrior",
]);

const invitationSchema = z.object({
  actorStaffId: z.uuid(),
  email: z
    .string()
    .trim()
    .max(254)
    .pipe(z.email())
    .transform((email) => email.toLowerCase()),
  displayName: z.string().trim().min(2).max(120),
  phone: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((value) => value || null),
  jobTitle: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => value || null),
  roleCode: roleCodeSchema.exclude(["core_leader"]),
  reason: z.string().trim().max(500).optional().default(""),
});

const roleMutationSchema = z.object({
  actorStaffId: z.uuid(),
  staffId: z.uuid(),
  roleCode: roleCodeSchema,
  reason: z.string().trim().max(500).optional().default(""),
});

const suspensionSchema = z.object({
  actorStaffId: z.uuid(),
  staffId: z.uuid(),
  reason: z.string().trim().min(10).max(500),
});

export type VerifiedStaffIdentity = z.infer<typeof verifiedIdentitySchema>;
export type BootstrapAdministratorInput = z.infer<
  typeof bootstrapAdministratorSchema
>;
export type CreateInvitationInput = z.input<typeof invitationSchema>;
export type RoleMutationInput = z.input<typeof roleMutationSchema>;
export type SuspendStaffInput = z.input<typeof suspensionSchema>;

type AccessControlServiceDependencies = {
  createId?: () => string;
  now?: () => Date;
};

export class AccessControlService {
  private readonly createId: () => string;
  private readonly now: () => Date;

  constructor(
    private readonly repository: AccessControlRepositoryPort,
    dependencies: AccessControlServiceDependencies = {},
  ) {
    this.createId = dependencies.createId ?? (() => crypto.randomUUID());
    this.now = dependencies.now ?? (() => new Date());
  }

  async bootstrapFirstSystemAdministrator(
    rawInput: BootstrapAdministratorInput,
  ): Promise<{ staffId: string }> {
    const input = bootstrapAdministratorSchema.parse(rawInput);

    if (!(await this.repository.isBootstrapAvailable())) {
      throw new ApplicationError(
        "FORBIDDEN",
        "The first System Administrator has already been created.",
      );
    }

    const staffId = this.createId();

    await this.repository.bootstrapFirstSystemAdministrator({
      staffId,
      roleAssignmentId: this.createId(),
      auditLogId: this.createId(),
      correlationId: this.createId(),
      accessSubject: input.accessSubject,
      email: input.email,
      displayName: input.displayName,
      reason: input.reason,
      createdAt: this.now().toISOString(),
    });

    return { staffId };
  }

  async getActiveStaffContext(
    rawIdentity: VerifiedStaffIdentity,
  ): Promise<StaffContext> {
    const identity = verifiedIdentitySchema.parse(rawIdentity);
    const context = await this.repository.findStaffContextByAccessSubject(
      identity.accessSubject,
    );

    if (!context || context.accountStatus !== "active") {
      throw new ApplicationError(
        "FORBIDDEN",
        "An active staff account is required.",
      );
    }

    if (context.email.toLowerCase() !== identity.email) {
      throw new ApplicationError(
        "FORBIDDEN",
        "The verified identity does not match this staff account.",
      );
    }

    return context;
  }

  async requirePermission(
    rawIdentity: VerifiedStaffIdentity,
    permissionCode: string,
  ): Promise<void> {
    const identity = verifiedIdentitySchema.parse(rawIdentity);
    const normalizedPermissionCode = z
      .string()
      .regex(/^[a-z][a-z0-9_.]*$/)
      .parse(permissionCode);

    const allowed = await this.repository.activeStaffHasPermission(
      identity.accessSubject,
      identity.email,
      normalizedPermissionCode,
    );

    if (!allowed) {
      throw new ApplicationError(
        "FORBIDDEN",
        "The required permission is missing.",
      );
    }
  }

  async createInvitation(rawInput: CreateInvitationInput) {
    const input = invitationSchema.parse(rawInput);
    if (input.roleCode === "system_admin" && input.reason.length < 10) {
      throw new ApplicationError(
        "VALIDATION_FAILED",
        "System Administrator invitations require a reason of at least 10 characters.",
      );
    }
    if (
      (await this.repository.emailHasStaffProfile(input.email)) ||
      (await this.repository.findPendingInvitationByEmail(input.email))
    ) {
      throw new ApplicationError(
        "VALIDATION_FAILED",
        "That email already has an account or pending invitation.",
      );
    }

    const invitationId = this.createId();
    await this.repository.createInvitation({
      invitationId,
      auditLogId: this.createId(),
      correlationId: this.createId(),
      actorStaffId: input.actorStaffId,
      email: input.email,
      displayName: input.displayName,
      phone: input.phone,
      jobTitle: input.jobTitle,
      roleCode: input.roleCode,
      reason: input.reason || null,
      createdAt: this.now().toISOString(),
    });
    return { invitationId };
  }

  async activatePendingInvitation(rawIdentity: VerifiedStaffIdentity) {
    const identity = verifiedIdentitySchema.parse(rawIdentity);
    if (await this.repository.emailHasStaffProfile(identity.email)) {
      throw new ApplicationError(
        "FORBIDDEN",
        "This identity is already registered.",
      );
    }
    const invitation = await this.repository.findPendingInvitationByEmail(
      identity.email,
    );
    if (!invitation) {
      throw new ApplicationError(
        "FORBIDDEN",
        "A pending staff invitation is required.",
      );
    }

    const staffId = this.createId();
    await this.repository.activateInvitation({
      invitation,
      staffId,
      roleAssignmentId: this.createId(),
      auditLogId: this.createId(),
      correlationId: this.createId(),
      accessSubject: identity.accessSubject,
      createdAt: this.now().toISOString(),
    });
    return { staffId };
  }

  async listStaffDirectory() {
    return this.repository.listStaffDirectory();
  }

  async assignRole(rawInput: RoleMutationInput) {
    const input = roleMutationSchema.parse(rawInput);
    const target = await this.requireActiveTarget(input.staffId);
    if (target.roles.some((role) => role.code === input.roleCode)) {
      throw new ApplicationError(
        "VALIDATION_FAILED",
        "That role is already assigned.",
      );
    }
    if (
      ["system_admin", "core_leader"].includes(input.roleCode) &&
      input.reason.length < 10
    ) {
      throw new ApplicationError(
        "VALIDATION_FAILED",
        "Elevated roles require a reason of at least 10 characters.",
      );
    }

    await this.repository.assignRole({
      ...input,
      assignmentId: this.createId(),
      auditLogId: this.createId(),
      correlationId: this.createId(),
      createdAt: this.now().toISOString(),
    });
  }

  async revokeRole(rawInput: RoleMutationInput) {
    const input = roleMutationSchema.parse(rawInput);
    if (input.reason.length < 10) {
      throw new ApplicationError(
        "VALIDATION_FAILED",
        "Role removal requires a reason of at least 10 characters.",
      );
    }
    const target = await this.repository.findStaffById(input.staffId);
    if (!target || !target.roles.some((role) => role.code === input.roleCode)) {
      throw new ApplicationError(
        "NOT_FOUND",
        "The active role assignment was not found.",
      );
    }
    await this.repository.revokeRole({
      ...input,
      auditLogId: this.createId(),
      correlationId: this.createId(),
      createdAt: this.now().toISOString(),
    });
  }

  async suspendStaff(rawInput: SuspendStaffInput) {
    const input = suspensionSchema.parse(rawInput);
    await this.requireActiveTarget(input.staffId);
    await this.repository.suspendStaff({
      ...input,
      auditLogId: this.createId(),
      correlationId: this.createId(),
      createdAt: this.now().toISOString(),
    });
  }

  private async requireActiveTarget(staffId: string) {
    const target = await this.repository.findStaffById(staffId);
    if (!target)
      throw new ApplicationError(
        "NOT_FOUND",
        "The staff account was not found.",
      );
    if (target.accountStatus !== "active") {
      throw new ApplicationError(
        "VALIDATION_FAILED",
        "The staff account must be active.",
      );
    }
    return target;
  }
}
