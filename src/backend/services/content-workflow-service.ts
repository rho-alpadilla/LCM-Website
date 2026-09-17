import { z } from "zod";

import { ApplicationError } from "@/shared/errors/application-error";
import type { StaffContext } from "@/backend/repositories/access-control-repository";
import type {
  ContentEntry,
  ContentRepositoryPort,
  ContentType,
} from "@/backend/repositories/content-repository";

const contentTypeSchema = z.enum([
  "page",
  "ministry",
  "sermon",
  "series",
  "speaker",
  "schedule",
  "announcement",
  "bulletin",
]);

const draftSchema = z.object({
  contentType: contentTypeSchema,
  slug: z
    .string()
    .trim()
    .min(1)
    .max(180)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().trim().min(1).max(180),
  summary: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((value) => value || null),
  bodyText: z.string().trim().max(50_000).optional().default(""),
  coverMediaId: z.uuid().nullable().optional().default(null),
});

const draftUpdateSchema = draftSchema.omit({ contentType: true });

const contentIdSchema = z.uuid();
const changeSummarySchema = z.string().trim().min(10).max(500);
const optionalReasonSchema = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((value) => value || null);
const archiveReasonSchema = z.string().trim().min(10).max(500);

const managementPermission: Record<ContentType, string> = {
  page: "content.pages.manage",
  ministry: "content.ministries.manage",
  sermon: "content.sermons.manage",
  series: "content.series.manage",
  speaker: "content.speakers.manage",
  schedule: "content.schedule.manage",
  announcement: "content.announcements.manage",
  bulletin: "content.bulletins.manage",
};

type Dependencies = { createId?: () => string; now?: () => Date };

export class ContentWorkflowService {
  private readonly createId: () => string;
  private readonly now: () => Date;

  constructor(
    private readonly repository: ContentRepositoryPort,
    dependencies: Dependencies = {},
  ) {
    this.createId = dependencies.createId ?? (() => crypto.randomUUID());
    this.now = dependencies.now ?? (() => new Date());
  }

  async createDraft(
    actor: StaffContext,
    rawInput: z.input<typeof draftSchema>,
  ) {
    const input = draftSchema.parse(rawInput);
    this.requireContentPermission(
      actor,
      input.contentType,
      managementPermission[input.contentType],
    );
    if (await this.repository.slugExists(input.contentType, input.slug)) {
      throw new ApplicationError(
        "VALIDATION_FAILED",
        "That content URL is already in use.",
      );
    }

    const contentId = this.createId();
    await this.repository.createDraft({
      ...this.mutationIdentity(actor.id),
      contentId,
      contentType: input.contentType,
      slug: input.slug,
      title: input.title,
      summary: input.summary,
      bodyJson: JSON.stringify({ format: "plain_text", text: input.bodyText }),
      coverMediaId: input.coverMediaId,
    });
    return { contentId };
  }

  async listForActor(actor: StaffContext) {
    this.requireActiveActor(actor);
    return this.repository.listContent(this.managedContentTypes(actor));
  }

  async getForActor(actor: StaffContext, rawContentId: string) {
    const contentId = contentIdSchema.parse(rawContentId);
    const content = await this.repository.findById(contentId);
    if (!content) {
      throw new ApplicationError(
        "NOT_FOUND",
        "The content entry was not found.",
      );
    }
    this.requireContentPermission(
      actor,
      content.contentType,
      managementPermission[content.contentType],
    );
    return {
      content,
      subtype: await this.repository.findSubtypeSnapshot(content),
    };
  }

  async updateDraft(
    actor: StaffContext,
    rawContentId: string,
    rawInput: z.input<typeof draftUpdateSchema>,
  ) {
    const content = await this.requireExistingContent(rawContentId);
    this.requireContentPermission(
      actor,
      content.contentType,
      managementPermission[content.contentType],
    );
    const input = draftUpdateSchema.parse(rawInput);
    if (content.status !== "draft") {
      throw new ApplicationError(
        "VALIDATION_FAILED",
        "Only draft content can be edited.",
      );
    }
    if (
      await this.repository.slugExists(
        content.contentType,
        input.slug,
        content.id,
      )
    ) {
      throw new ApplicationError(
        "VALIDATION_FAILED",
        "That content URL is already in use.",
      );
    }
    if (
      input.coverMediaId &&
      !(await this.repository.findReadyPublicImage(input.coverMediaId))
    ) {
      throw new ApplicationError(
        "VALIDATION_FAILED",
        "Select a ready image from the media library.",
      );
    }
    const version = await this.repository.updateDraft({
      ...this.mutationIdentity(actor.id),
      content,
      slug: input.slug,
      title: input.title,
      summary: input.summary,
      bodyJson: JSON.stringify({ format: "plain_text", text: input.bodyText }),
      coverMediaId: input.coverMediaId,
    });
    return { contentId: content.id, version };
  }

  async submitForReview(
    actor: StaffContext,
    rawContentId: string,
    rawSummary: string,
  ) {
    const content = await this.requireContent(
      actor,
      rawContentId,
      "content.submit",
    );
    const changeSummary = changeSummarySchema.parse(rawSummary);
    if (content.status !== "draft") {
      throw new ApplicationError(
        "VALIDATION_FAILED",
        "Only draft content can be submitted.",
      );
    }

    const revisionId = this.createId();
    const subtype = await this.repository.findSubtypeSnapshot(content);
    if (content.contentType !== "page" && !subtype) {
      throw new ApplicationError(
        "VALIDATION_FAILED",
        "Complete the type-specific details before submitting this content.",
      );
    }
    await this.repository.submit({
      ...this.mutationIdentity(actor.id),
      content,
      revisionId,
      reviewEventId: this.createId(),
      snapshotJson: JSON.stringify(this.snapshot(content, subtype)),
      changeSummary,
    });
    return { revisionId };
  }

  async approve(actor: StaffContext, rawContentId: string, rawReason?: string) {
    const content = await this.requireContent(
      actor,
      rawContentId,
      "content.approve",
    );
    if (content.status !== "pending_review") {
      throw new ApplicationError(
        "VALIDATION_FAILED",
        "Only pending content can be approved.",
      );
    }
    const isSelfApproval = content.submittedBy === actor.id;
    if (isSelfApproval && !actor.permissions.includes("content.self_approve")) {
      throw new ApplicationError(
        "FORBIDDEN",
        "This account cannot approve its own submission.",
      );
    }
    const revisionId = await this.requireCurrentRevision(content);
    await this.repository.approve({
      ...this.mutationIdentity(actor.id),
      content,
      revisionId,
      reviewEventId: this.createId(),
      reason: optionalReasonSchema.parse(rawReason),
      isSelfApproval,
    });
  }

  async requestChanges(
    actor: StaffContext,
    rawContentId: string,
    rawReason: string,
  ) {
    const content = await this.requireContent(
      actor,
      rawContentId,
      "content.approve",
    );
    if (content.status !== "pending_review") {
      throw new ApplicationError(
        "VALIDATION_FAILED",
        "Only pending content can be returned for changes.",
      );
    }
    const reason = archiveReasonSchema.parse(rawReason);
    return this.repository.requestChanges({
      ...this.mutationIdentity(actor.id),
      content,
      revisionId: await this.requireCurrentRevision(content),
      reviewEventId: this.createId(),
      reason,
    });
  }

  async publish(actor: StaffContext, rawContentId: string) {
    const content = await this.requireContent(
      actor,
      rawContentId,
      "content.publish",
    );
    if (content.status !== "approved") {
      throw new ApplicationError(
        "VALIDATION_FAILED",
        "Only approved content can be published.",
      );
    }
    await this.repository.publish({
      ...this.mutationIdentity(actor.id),
      content,
      revisionId: await this.requireCurrentRevision(content),
      reviewEventId: this.createId(),
      reason: null,
    });
    return { contentType: content.contentType, slug: content.slug };
  }

  async archive(actor: StaffContext, rawContentId: string, rawReason: string) {
    const content = await this.requireContent(
      actor,
      rawContentId,
      "content.archive",
    );
    if (content.status === "archived") {
      throw new ApplicationError(
        "VALIDATION_FAILED",
        "This content is already archived.",
      );
    }
    await this.repository.archive({
      ...this.mutationIdentity(actor.id),
      content,
      revisionId: await this.repository.findCurrentRevisionId(
        content.id,
        content.version,
      ),
      reviewEventId: this.createId(),
      reason: archiveReasonSchema.parse(rawReason),
    });
    return { contentType: content.contentType, slug: content.slug };
  }

  private async requireContent(
    actor: StaffContext,
    rawContentId: string,
    actionPermission: string,
  ) {
    const contentId = contentIdSchema.parse(rawContentId);
    const content = await this.repository.findById(contentId);
    if (!content)
      throw new ApplicationError(
        "NOT_FOUND",
        "The content entry was not found.",
      );
    this.requireContentPermission(actor, content.contentType, actionPermission);
    return content;
  }

  private async requireExistingContent(rawContentId: string) {
    const contentId = contentIdSchema.parse(rawContentId);
    const content = await this.repository.findById(contentId);
    if (!content) {
      throw new ApplicationError(
        "NOT_FOUND",
        "The content entry was not found.",
      );
    }
    return content;
  }

  private requireContentPermission(
    actor: StaffContext,
    type: ContentType,
    actionPermission: string,
  ) {
    if (
      actor.accountStatus !== "active" ||
      !actor.permissions.includes(actionPermission) ||
      !actor.permissions.includes(managementPermission[type])
    ) {
      throw new ApplicationError(
        "FORBIDDEN",
        "This account cannot perform that content action.",
      );
    }
  }

  private requireActiveActor(actor: StaffContext) {
    if (actor.accountStatus !== "active") {
      throw new ApplicationError(
        "FORBIDDEN",
        "This account cannot access content management.",
      );
    }
  }

  private managedContentTypes(actor: StaffContext) {
    return (Object.keys(managementPermission) as ContentType[]).filter((type) =>
      actor.permissions.includes(managementPermission[type]),
    );
  }

  private async requireCurrentRevision(content: ContentEntry) {
    const revisionId = await this.repository.findCurrentRevisionId(
      content.id,
      content.version,
    );
    if (!revisionId) {
      throw new ApplicationError(
        "VALIDATION_FAILED",
        "A submitted revision is required.",
      );
    }
    return revisionId;
  }

  private mutationIdentity(actorStaffId: string) {
    return {
      actorStaffId,
      auditLogId: this.createId(),
      correlationId: this.createId(),
      createdAt: this.now().toISOString(),
    };
  }

  private snapshot(
    content: ContentEntry,
    subtype: Record<string, unknown> | null,
  ) {
    return {
      contentType: content.contentType,
      slug: content.slug,
      title: content.title,
      summary: content.summary,
      body: content.body,
      coverMediaId: content.coverMediaId,
      subtype,
    };
  }
}
