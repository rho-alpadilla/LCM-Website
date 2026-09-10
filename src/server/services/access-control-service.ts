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

export type VerifiedStaffIdentity = z.infer<typeof verifiedIdentitySchema>;
export type BootstrapAdministratorInput = z.infer<
  typeof bootstrapAdministratorSchema
>;

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
}
