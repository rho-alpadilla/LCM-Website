import { z } from "zod";

import type { StaffContext } from "@/backend/repositories/access-control-repository";
import type {
  InquiryRecord,
  InquiryRepositoryPort,
} from "@/backend/repositories/inquiry-repository";
import { ApplicationError } from "@/shared/errors/application-error";
import {
  inquiryCloseSchema,
  inquiryPermission,
  inquiryUpdateSchema,
  publicInquirySchema,
} from "@/shared/inquiries/schemas";
import type { InquiryType } from "@/shared/inquiries/types";

type Dependencies = {
  repository: InquiryRepositoryPort;
  createId?: () => string;
  now?: () => Date;
};

export class InquiryService {
  private readonly createId: () => string;
  private readonly now: () => Date;

  constructor(private readonly dependencies: Dependencies) {
    this.createId = dependencies.createId ?? (() => crypto.randomUUID());
    this.now = dependencies.now ?? (() => new Date());
  }

  async submitPublic(input: unknown) {
    const parsed = this.parse(publicInquirySchema, input);
    const createdAt = this.now().toISOString();
    const inquiryId = this.createId();
    await this.dependencies.repository.create({
      inquiryId,
      input: parsed,
      createdAt,
      auditLogId: this.createId(),
      correlationId: this.createId(),
    });
    return { id: inquiryId };
  }

  async listQueue(actor: StaffContext) {
    this.requireActive(actor);
    const types = (["contact", "ministry_interest"] as const).filter((type) =>
      actor.permissions.includes(inquiryPermission(type, "read")),
    );
    if (types.length === 0) {
      throw new ApplicationError(
        "FORBIDDEN",
        "You do not have permission to view visitor inquiries.",
      );
    }
    return this.dependencies.repository.listQueue(types);
  }

  async getDetail(actor: StaffContext, id: string) {
    this.requireActive(actor);
    const inquiry = await this.requireInquiry(id);
    this.requirePermission(actor, inquiry.inquiryType, "read");
    const createdAt = this.now().toISOString();
    await this.dependencies.repository.recordSensitiveRead({
      inquiryId: inquiry.id,
      actorStaffId: actor.id,
      createdAt,
      auditLogId: this.createId(),
      correlationId: this.createId(),
    });
    const [updates, assignees] = await Promise.all([
      this.dependencies.repository.listUpdates(inquiry.id),
      actor.permissions.includes(inquiryPermission(inquiry.inquiryType, "assign"))
        ? this.dependencies.repository.listEligibleAssignees(inquiry.inquiryType)
        : Promise.resolve([]),
    ]);
    return { inquiry, updates, assignees };
  }

  async assign(actor: StaffContext, id: string, assignedTo: unknown) {
    this.requireActive(actor);
    const inquiry = await this.requireInquiry(id);
    this.requirePermission(actor, inquiry.inquiryType, "assign");
    this.requireOpenInquiry(inquiry);
    const staffId = this.parse(z.uuid(), assignedTo);
    if (
      !(await this.dependencies.repository.isEligibleAssignee(
        inquiry.inquiryType,
        staffId,
      ))
    ) {
      throw new ApplicationError(
        "VALIDATION_FAILED",
        "Choose an active staff member who can follow up on this inquiry.",
      );
    }
    const createdAt = this.now().toISOString();
    await this.dependencies.repository.assign({
      inquiryId: inquiry.id,
      assignedTo: staffId,
      assignmentId: this.createId(),
      actorStaffId: actor.id,
      createdAt,
      auditLogId: this.createId(),
      correlationId: this.createId(),
    });
  }

  async addUpdate(actor: StaffContext, id: string, input: unknown) {
    this.requireActive(actor);
    const inquiry = await this.requireInquiry(id);
    this.requirePermission(actor, inquiry.inquiryType, "respond");
    this.requireOpenInquiry(inquiry);
    const parsed = this.parse(inquiryUpdateSchema, input);
    const createdAt = this.now().toISOString();
    await this.dependencies.repository.addUpdate({
      inquiryId: inquiry.id,
      actorStaffId: actor.id,
      createdAt,
      auditLogId: this.createId(),
      correlationId: this.createId(),
      updateId: this.createId(),
      updateType: parsed.updateType,
      note: parsed.note,
    });
  }

  async close(actor: StaffContext, id: string, input: unknown) {
    this.requireActive(actor);
    const inquiry = await this.requireInquiry(id);
    this.requirePermission(actor, inquiry.inquiryType, "respond");
    this.requireOpenInquiry(inquiry);
    const parsed = this.parse(inquiryCloseSchema, input);
    const closedAt = this.now();
    const changed = await this.dependencies.repository.close({
      inquiryId: inquiry.id,
      actorStaffId: actor.id,
      createdAt: closedAt.toISOString(),
      retentionDueAt: this.addDays(closedAt, 90),
      auditLogId: this.createId(),
      correlationId: this.createId(),
      updateId: this.createId(),
      note: parsed.note,
    });
    if (changed !== 1) {
      throw new ApplicationError(
        "VALIDATION_FAILED",
        "This inquiry is already closed.",
      );
    }
  }

  async runRetention(limit = 100) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
      throw new ApplicationError(
        "VALIDATION_FAILED",
        "Retention batch size must be between 1 and 500.",
      );
    }
    const now = this.now().toISOString();
    const candidates = await this.dependencies.repository.findRetentionCandidates(
      now,
      limit,
    );
    for (const id of candidates) {
      await this.dependencies.repository.applyRetention(id, now);
    }
    return { processed: candidates.length };
  }

  private async requireInquiry(id: string) {
    const inquiry = await this.dependencies.repository.findById(
      this.parse(z.uuid(), id),
    );
    if (!inquiry) {
      throw new ApplicationError("NOT_FOUND", "Visitor inquiry not found.");
    }
    return inquiry;
  }

  private requirePermission(
    actor: StaffContext,
    type: InquiryType,
    action: "read" | "respond" | "assign",
  ) {
    if (!actor.permissions.includes(inquiryPermission(type, action))) {
      throw new ApplicationError(
        "FORBIDDEN",
        "You do not have permission to handle this visitor inquiry.",
      );
    }
  }

  private requireOpenInquiry(inquiry: InquiryRecord) {
    if (inquiry.status === "closed" || inquiry.status === "retention_review") {
      throw new ApplicationError(
        "VALIDATION_FAILED",
        "Closed inquiries cannot receive new work updates.",
      );
    }
  }

  private requireActive(actor: StaffContext) {
    if (actor.accountStatus !== "active") {
      throw new ApplicationError(
        "FORBIDDEN",
        "An active staff account is required.",
      );
    }
  }

  private addDays(value: Date, days: number) {
    return new Date(value.getTime() + days * 86_400_000).toISOString();
  }

  private parse<T>(schema: z.ZodType<T>, input: unknown): T {
    const result = schema.safeParse(input);
    if (!result.success) {
      throw new ApplicationError(
        "VALIDATION_FAILED",
        result.error.issues[0]?.message ?? "Invalid inquiry input.",
      );
    }
    return result.data;
  }
}
