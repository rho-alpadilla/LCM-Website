import { z } from "zod";

import { ApplicationError } from "@/lib/errors/application-error";
import type { StaffContext } from "@/server/repositories/access-control-repository";
import type {
  PrayerContactRecord,
  PrayerPrivacyScope,
  PrayerRepositoryPort,
  PrayerRequestRecord,
} from "@/server/repositories/prayer-repository";

const contactSchema = z
  .object({
    name: z.string().trim().min(1).max(120).nullable().default(null),
    email: z.string().trim().email().max(254).nullable().default(null),
    phone: z.string().trim().min(7).max(40).nullable().default(null),
    preferredContact: z.enum(["none", "email", "phone"]).default("none"),
    followUpConsent: z.boolean().default(false),
  })
  .superRefine((contact, context) => {
    if (contact.preferredContact === "email" && !contact.email) {
      context.addIssue({
        code: "custom",
        message: "An email is required for email follow-up.",
      });
    }
    if (contact.preferredContact === "phone" && !contact.phone) {
      context.addIssue({
        code: "custom",
        message: "A phone number is required for phone follow-up.",
      });
    }
    if (!contact.followUpConsent && contact.preferredContact !== "none") {
      context.addIssue({
        code: "custom",
        message:
          "Follow-up consent is required before selecting a contact method.",
      });
    }
  });

const createPrayerSchema = z.object({
  requestText: z.string().trim().min(1).max(5000),
  privacyScope: z.enum(["team", "pastoral_only"]),
  contact: contactSchema.nullable().default(null),
});

const reasonSchema = z
  .string()
  .trim()
  .min(10)
  .max(500)
  .nullable()
  .default(null);

const updateSchema = z
  .object({
    updateType: z.enum(["prayed", "note", "follow_up", "escalated"]),
    note: z.string().trim().min(1).max(5000).nullable().default(null),
    visibilityScope: z.enum(["team", "pastoral_only"]).default("team"),
  })
  .superRefine((value, context) => {
    if (value.updateType !== "prayed" && !value.note) {
      context.addIssue({
        code: "custom",
        message: "A note is required for this update.",
      });
    }
    if (
      value.updateType === "escalated" &&
      value.visibilityScope !== "pastoral_only"
    ) {
      context.addIssue({
        code: "custom",
        message: "Escalations must be pastoral-only.",
      });
    }
  });

type Dependencies = {
  repository: PrayerRepositoryPort;
  createId?: () => string;
  now?: () => Date;
};

export class PrayerService {
  private readonly createId: () => string;
  private readonly now: () => Date;

  constructor(private readonly dependencies: Dependencies) {
    this.createId = dependencies.createId ?? (() => crypto.randomUUID());
    this.now = dependencies.now ?? (() => new Date());
  }

  async submitPublic(input: unknown) {
    const parsed = this.parse(createPrayerSchema, input);
    return this.create(parsed, null, "website");
  }

  async createForStaff(actor: StaffContext, input: unknown) {
    this.requireActive(actor);
    this.requirePermission(actor, "prayer.update_team");
    const parsed = this.parse(createPrayerSchema, input);
    this.requireScopeAccess(actor, parsed.privacyScope, "update");
    return this.create(parsed, actor.id, "staff");
  }

  async get(actor: StaffContext, requestId: string) {
    this.requireActive(actor);
    const request = await this.requireRequest(requestId);
    this.requireScopeAccess(actor, request.privacyScope, "read");
    return request;
  }

  async listQueue(actor: StaffContext) {
    this.requireActive(actor);
    const scopes = this.readableScopes(actor);
    if (scopes.length === 0) this.requirePermission(actor, "prayer.read_team");
    return this.dependencies.repository.listQueue(scopes, actor.id);
  }

  async getDetail(actor: StaffContext, requestId: string) {
    const request = await this.get(actor, requestId);
    const scopes = this.readableScopes(actor);
    const createdAt = this.now().toISOString();
    await this.dependencies.repository.recordSensitiveRead(
      {
        requestId: request.id,
        actorStaffId: actor.id,
        createdAt,
        auditLogId: this.createId(),
        correlationId: this.createId(),
      },
      "prayer.detail_viewed",
    );
    const [updates, assignments] = await Promise.all([
      this.dependencies.repository.listUpdates(request.id, scopes),
      this.dependencies.repository.listAssignments(request.id),
    ]);
    return { request, updates, assignments };
  }

  async listEligibleAssignees(actor: StaffContext) {
    this.requireActive(actor);
    this.requirePermission(actor, "prayer.assign");
    return this.dependencies.repository.listEligibleAssignees();
  }

  async getContact(actor: StaffContext, requestId: string) {
    this.requireActive(actor);
    const request = await this.requireRequest(requestId);
    this.requireScopeAccess(actor, request.privacyScope, "read");
    this.requirePermission(actor, "prayer.contact.read");
    if (
      actor.roles.includes("prayer_warrior") &&
      !this.isPastoralLeader(actor)
    ) {
      const assigned = await this.dependencies.repository.isActivelyAssigned(
        requestId,
        actor.id,
      );
      if (!assigned)
        throw new ApplicationError(
          "FORBIDDEN",
          "Only the assigned prayer team may view these contact details.",
        );
    }
    const contact = await this.dependencies.repository.findContact(requestId);
    await this.dependencies.repository.recordSensitiveRead(
      {
        requestId,
        actorStaffId: actor.id,
        createdAt: this.now().toISOString(),
        auditLogId: this.createId(),
        correlationId: this.createId(),
      },
      "prayer.contact_revealed",
    );
    if (!contact || contact.deletedAt) return null;
    if (!contact.followUpConsent) return this.withoutContactChannels(contact);
    return contact;
  }

  async assign(actor: StaffContext, requestId: string, assignedTo: string) {
    this.requireActive(actor);
    this.requirePermission(actor, "prayer.assign");
    const request = await this.requireRequest(requestId);
    this.requireScopeAccess(actor, request.privacyScope, "read");
    if (request.privacyScope !== "team") {
      throw new ApplicationError(
        "VALIDATION_FAILED",
        "Pastoral-only requests cannot be assigned to the prayer team.",
      );
    }
    const parsedAssignee = this.parse(z.uuid(), assignedTo);
    if (
      !(await this.dependencies.repository.isEligibleAssignee(parsedAssignee))
    ) {
      throw new ApplicationError(
        "VALIDATION_FAILED",
        "Choose an active Prayer Warrior.",
      );
    }
    const createdAt = this.now().toISOString();
    await this.dependencies.repository.assign({
      assignmentId: this.createId(),
      requestId,
      assignedTo: parsedAssignee,
      actorStaffId: actor.id,
      createdAt,
      auditLogId: this.createId(),
      correlationId: this.createId(),
    });
  }

  async addUpdate(actor: StaffContext, requestId: string, input: unknown) {
    this.requireActive(actor);
    const request = await this.requireRequest(requestId);
    this.requireScopeAccess(actor, request.privacyScope, "update");
    if (request.status === "closed" || request.status === "retention_review") {
      throw new ApplicationError(
        "VALIDATION_FAILED",
        "Closed prayer requests cannot receive new updates.",
      );
    }
    const parsed = this.parse(updateSchema, input);
    if (parsed.updateType === "escalated")
      this.requirePermission(actor, "prayer.escalate");
    if (parsed.visibilityScope === "pastoral_only")
      this.requirePermission(actor, "prayer.update_pastoral");

    if (
      actor.roles.includes("prayer_warrior") &&
      !this.isPastoralLeader(actor)
    ) {
      const assigned = await this.dependencies.repository.isActivelyAssigned(
        request.id,
        actor.id,
      );
      if (!assigned || request.privacyScope !== "team") {
        throw new ApplicationError(
          "FORBIDDEN",
          "Prayer Warriors may update only team requests assigned to them.",
        );
      }
      if (
        !["prayed", "note"].includes(parsed.updateType) ||
        parsed.visibilityScope !== "team"
      ) {
        throw new ApplicationError(
          "FORBIDDEN",
          "Prayer Warriors may add only prayed or team-visible note updates.",
        );
      }
    }

    const nextStatus =
      parsed.updateType === "escalated"
        ? "escalated"
        : parsed.updateType === "follow_up"
          ? "follow_up"
          : parsed.updateType === "prayed"
            ? "in_prayer"
            : request.status;
    const createdAt = this.now().toISOString();
    await this.dependencies.repository.addUpdate({
      requestId: request.id,
      actorStaffId: actor.id,
      createdAt,
      auditLogId: this.createId(),
      correlationId: this.createId(),
      updateId: this.createId(),
      updateType: parsed.updateType,
      note: parsed.note,
      visibilityScope: parsed.visibilityScope,
      nextStatus,
      increasePrivacy:
        parsed.updateType === "escalated" && request.privacyScope === "team",
    });
  }

  async close(actor: StaffContext, requestId: string, rawReason?: unknown) {
    this.requireActive(actor);
    this.requirePermission(actor, "prayer.close");
    const request = await this.requireRequest(requestId);
    this.requireScopeAccess(actor, request.privacyScope, "update");
    if (
      actor.roles.includes("prayer_warrior") &&
      !this.isPastoralLeader(actor)
    ) {
      const assigned = await this.dependencies.repository.isActivelyAssigned(
        requestId,
        actor.id,
      );
      if (request.privacyScope !== "team" || !assigned) {
        throw new ApplicationError(
          "FORBIDDEN",
          "Prayer Warriors may close only team requests assigned to them.",
        );
      }
    }
    const note = this.parse(reasonSchema, rawReason ?? null);
    const closedAt = this.now();
    const changed = await this.dependencies.repository.close({
      requestId,
      actorStaffId: actor.id,
      createdAt: closedAt.toISOString(),
      contactRetentionDueAt: this.addDays(closedAt, 30),
      contentRetentionDueAt: this.addDays(closedAt, 90),
      updateId: this.createId(),
      note,
      visibilityScope: request.privacyScope,
      auditLogId: this.createId(),
      correlationId: this.createId(),
    });
    if (changed !== 1)
      throw new ApplicationError(
        "VALIDATION_FAILED",
        "This prayer request is already closed.",
      );
  }

  async runRetention(limit = 100) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
      throw new ApplicationError(
        "VALIDATION_FAILED",
        "Retention batch size must be between 1 and 500.",
      );
    }
    const now = this.now().toISOString();
    const candidates =
      await this.dependencies.repository.findRetentionCandidates(now, limit);
    for (const candidate of candidates) {
      await this.dependencies.repository.applyRetention(candidate, now);
    }
    return { processed: candidates.length };
  }

  private async create(
    input: z.infer<typeof createPrayerSchema>,
    createdBy: string | null,
    source: "website" | "staff",
  ) {
    const requestId = this.createId();
    const createdAt = this.now().toISOString();
    await this.dependencies.repository.create({
      requestId,
      requestText: input.requestText,
      privacyScope: input.privacyScope,
      source,
      createdBy,
      contact: input.contact,
      createdAt,
      auditLogId: this.createId(),
      correlationId: this.createId(),
    });
    return { id: requestId };
  }

  private async requireRequest(
    requestId: string,
  ): Promise<PrayerRequestRecord> {
    const parsedId = this.parse(z.uuid(), requestId);
    const request = await this.dependencies.repository.findById(parsedId);
    if (!request)
      throw new ApplicationError("NOT_FOUND", "Prayer request not found.");
    return request;
  }

  private requireScopeAccess(
    actor: StaffContext,
    scope: PrayerPrivacyScope,
    action: "read" | "update",
  ) {
    const permission =
      scope === "pastoral_only"
        ? `prayer.${action}_pastoral`
        : `prayer.${action}_team`;
    this.requirePermission(actor, permission);
  }

  private readableScopes(actor: StaffContext): PrayerPrivacyScope[] {
    const scopes: PrayerPrivacyScope[] = [];
    if (actor.permissions.includes("prayer.read_team")) scopes.push("team");
    if (actor.permissions.includes("prayer.read_pastoral"))
      scopes.push("pastoral_only");
    return scopes;
  }

  private requirePermission(actor: StaffContext, permission: string) {
    if (!actor.permissions.includes(permission)) {
      throw new ApplicationError(
        "FORBIDDEN",
        "You do not have permission to perform this prayer-care action.",
      );
    }
  }

  private requireActive(actor: StaffContext) {
    if (actor.accountStatus !== "active")
      throw new ApplicationError(
        "FORBIDDEN",
        "An active staff account is required.",
      );
  }

  private isPastoralLeader(actor: StaffContext) {
    return actor.roles.some((role) =>
      ["pastor", "core_leader"].includes(role),
    );
  }

  private withoutContactChannels(
    contact: PrayerContactRecord,
  ): PrayerContactRecord {
    return { ...contact, email: null, phone: null, preferredContact: "none" };
  }

  private addDays(value: Date, days: number) {
    return new Date(value.getTime() + days * 86_400_000).toISOString();
  }

  private parse<T>(schema: z.ZodType<T>, input: unknown): T {
    const result = schema.safeParse(input);
    if (!result.success)
      throw new ApplicationError(
        "VALIDATION_FAILED",
        result.error.issues[0]?.message ?? "Invalid input.",
      );
    return result.data;
  }
}
