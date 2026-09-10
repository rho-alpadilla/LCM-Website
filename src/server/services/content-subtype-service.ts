import { z } from "zod";

import { ApplicationError } from "@/lib/errors/application-error";
import type { StaffContext } from "@/server/repositories/access-control-repository";
import type { ContentType } from "@/server/repositories/content-repository";
import type {
  ContentSubtype,
  ContentSubtypeRepositoryPort,
  MediaAssetReference,
} from "@/server/repositories/content-subtype-repository";

const contentIdSchema = z.uuid();
const optionalText = (maximum: number) =>
  z
    .union([z.string().trim().max(maximum), z.null()])
    .optional()
    .transform((value) => value || null);
const optionalEmail = z
  .union([z.email().max(254), z.literal(""), z.null()])
  .optional()
  .transform((value) => value || null);
const optionalHttpsUrl = z
  .union([z.url().max(2048), z.literal(""), z.null()])
  .optional()
  .transform((value, context) => {
    if (!value) return null;
    if (new URL(value).protocol !== "https:") {
      context.addIssue({
        code: "custom",
        message: "Only secure HTTPS links are allowed.",
      });
      return z.NEVER;
    }
    return value;
  });
const optionalDate = z
  .union([z.iso.date(), z.literal(""), z.null()])
  .optional()
  .transform((value) => value || null);
const optionalDateTime = z
  .union([z.iso.datetime({ offset: true }), z.literal(""), z.null()])
  .optional()
  .transform((value) => value || null);

const ministrySchema = z.object({
  shortName: optionalText(80),
  contactEmail: optionalEmail,
  contactPhone: optionalText(40),
  sortOrder: z.int().min(0).max(10_000).default(0),
});

const seriesSchema = z
  .object({ startsOn: optionalDate, endsOn: optionalDate })
  .refine(
    ({ startsOn, endsOn }) => !startsOn || !endsOn || endsOn >= startsOn,
    { message: "The series end date cannot be before its start date." },
  );

const speakerSchema = z.object({
  biography: optionalText(5_000),
  photoMediaId: z.uuid().nullable().optional().default(null),
  isActive: z.boolean().default(true),
});

const sermonSchema = z
  .object({
    seriesContentId: z.uuid().nullable().optional().default(null),
    speakerContentId: z.uuid().nullable().optional().default(null),
    preachedAt: z.iso.datetime({ offset: true }),
    scriptureReference: optionalText(255),
    videoProvider: z.enum(["facebook", "youtube"]),
    videoUrl: z.url().max(2048),
    durationSeconds: z
      .int()
      .positive()
      .max(86_400)
      .nullable()
      .optional()
      .default(null),
  })
  .superRefine(({ videoProvider, videoUrl }, context) => {
    const url = new URL(videoUrl);
    const hostname = url.hostname.toLowerCase();
    const isHttps = url.protocol === "https:";
    const isFacebook =
      hostname === "facebook.com" ||
      hostname.endsWith(".facebook.com") ||
      hostname === "fb.watch";
    const isYouTube =
      hostname === "youtube.com" ||
      hostname.endsWith(".youtube.com") ||
      hostname === "youtu.be" ||
      hostname === "youtube-nocookie.com" ||
      hostname.endsWith(".youtube-nocookie.com");
    if (!isHttps || (videoProvider === "facebook" ? !isFacebook : !isYouTube)) {
      context.addIssue({
        code: "custom",
        path: ["videoUrl"],
        message: `Use a secure ${videoProvider === "facebook" ? "Facebook" : "YouTube"} video link.`,
      });
    }
  });

const announcementSchema = z
  .object({
    visibleFrom: optionalDateTime,
    visibleUntil: optionalDateTime,
    priority: z.int().min(0).max(10).default(0),
  })
  .refine(
    ({ visibleFrom, visibleUntil }) =>
      !visibleFrom ||
      !visibleUntil ||
      Date.parse(visibleUntil) > Date.parse(visibleFrom),
    { message: "The announcement end time must be after its start time." },
  );

const bulletinSchema = z.object({
  issueDate: z.iso.date(),
  fileMediaId: z.uuid(),
  editionLabel: optionalText(120),
});

const recurrenceRuleSchema = z
  .string()
  .trim()
  .max(1000)
  .regex(
    /^FREQ=(DAILY|WEEKLY|MONTHLY)(;INTERVAL=([1-9]|[1-4][0-9]|5[0-2]))?(;BYDAY=(MO|TU|WE|TH|FR|SA|SU)(,(MO|TU|WE|TH|FR|SA|SU))*)?$/,
    "Use the supported recurrence format: FREQ, optional INTERVAL, then optional BYDAY.",
  );

const scheduleSchema = z
  .object({
    activityType: z.enum([
      "daily_activity",
      "service",
      "cell_group",
      "discipleship",
      "prayer_meeting",
      "ministry_meeting",
      "outreach",
      "special_event",
    ]),
    ministryContentId: z.uuid().nullable().optional().default(null),
    startsAt: z.iso.datetime({ offset: true }),
    endsAt: z.iso.datetime({ offset: true }),
    timezone: z.literal("Asia/Manila").default("Asia/Manila"),
    recurrenceRule: z
      .union([recurrenceRuleSchema, z.literal(""), z.null()])
      .optional()
      .transform((value) => value || null),
    recurrenceUntil: optionalDate,
    locationName: optionalText(180),
    locationAddress: optionalText(500),
    locationVisibility: z
      .enum(["public_exact", "public_area", "contact_required", "staff_only"])
      .default("public_exact"),
    contactEmail: optionalEmail,
    contactPhone: optionalText(40),
    registrationUrl: optionalHttpsUrl,
  })
  .superRefine((value, context) => {
    if (Date.parse(value.endsAt) <= Date.parse(value.startsAt)) {
      context.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "The schedule end time must be after its start time.",
      });
    }
    if (value.recurrenceUntil && !value.recurrenceRule) {
      context.addIssue({
        code: "custom",
        path: ["recurrenceUntil"],
        message: "A recurrence end date requires a recurrence rule.",
      });
    }
  });

const scheduleExceptionSchema = z
  .object({
    occurrenceDate: z.iso.date(),
    action: z.enum(["cancelled", "rescheduled"]),
    replacementStartsAt: optionalDateTime,
    replacementEndsAt: optionalDateTime,
    publicNote: optionalText(500),
  })
  .superRefine((value, context) => {
    const hasReplacement =
      value.replacementStartsAt !== null && value.replacementEndsAt !== null;
    if (value.action === "cancelled" && hasReplacement) {
      context.addIssue({
        code: "custom",
        message: "A cancelled occurrence cannot include replacement times.",
      });
    }
    if (value.action === "rescheduled" && !hasReplacement) {
      context.addIssue({
        code: "custom",
        message: "A rescheduled occurrence requires both replacement times.",
      });
    }
    if (
      hasReplacement &&
      Date.parse(value.replacementEndsAt!) <=
        Date.parse(value.replacementStartsAt!)
    ) {
      context.addIssue({
        code: "custom",
        path: ["replacementEndsAt"],
        message: "The replacement end time must be after its start time.",
      });
    }
  });

const managementPermission: Record<Exclude<ContentType, "page">, string> = {
  ministry: "content.ministries.manage",
  sermon: "content.sermons.manage",
  series: "content.series.manage",
  speaker: "content.speakers.manage",
  schedule: "content.schedule.manage",
  announcement: "content.announcements.manage",
  bulletin: "content.bulletins.manage",
};

type Dependencies = { createId?: () => string; now?: () => Date };

export class ContentSubtypeService {
  private readonly createId: () => string;
  private readonly now: () => Date;

  constructor(
    private readonly repository: ContentSubtypeRepositoryPort,
    dependencies: Dependencies = {},
  ) {
    this.createId = dependencies.createId ?? (() => crypto.randomUUID());
    this.now = dependencies.now ?? (() => new Date());
  }

  saveMinistry(actor: StaffContext, contentId: string, input: unknown) {
    return this.save(actor, contentId, {
      contentType: "ministry",
      ...ministrySchema.parse(input),
    });
  }

  saveSeries(actor: StaffContext, contentId: string, input: unknown) {
    return this.save(actor, contentId, {
      contentType: "series",
      ...seriesSchema.parse(input),
    });
  }

  async saveSpeaker(actor: StaffContext, contentId: string, input: unknown) {
    this.requirePermission(actor, "speaker");
    const parsed = speakerSchema.parse(input);
    if (parsed.photoMediaId) {
      await this.requireMedia(parsed.photoMediaId, "image", "public_content");
    }
    return this.save(actor, contentId, {
      contentType: "speaker",
      ...parsed,
    });
  }

  async saveSermon(actor: StaffContext, contentId: string, input: unknown) {
    this.requirePermission(actor, "sermon");
    const parsed = sermonSchema.parse(input);
    if (parsed.seriesContentId) {
      await this.requireReference("series", parsed.seriesContentId);
    }
    if (parsed.speakerContentId) {
      await this.requireReference("speaker", parsed.speakerContentId);
    }
    return this.save(actor, contentId, {
      contentType: "sermon",
      ...parsed,
    });
  }

  saveAnnouncement(actor: StaffContext, contentId: string, input: unknown) {
    return this.save(actor, contentId, {
      contentType: "announcement",
      ...announcementSchema.parse(input),
    });
  }

  async saveBulletin(actor: StaffContext, contentId: string, input: unknown) {
    this.requirePermission(actor, "bulletin");
    const parsed = bulletinSchema.parse(input);
    await this.requireMedia(parsed.fileMediaId, "pdf", "bulletins");
    return this.save(actor, contentId, {
      contentType: "bulletin",
      ...parsed,
    });
  }

  async saveSchedule(actor: StaffContext, contentId: string, input: unknown) {
    this.requirePermission(actor, "schedule");
    const parsed = scheduleSchema.parse(input);
    if (parsed.ministryContentId) {
      await this.requireReference("ministry", parsed.ministryContentId);
    }
    return this.save(actor, contentId, {
      contentType: "schedule",
      ...parsed,
    });
  }

  async saveScheduleException(
    actor: StaffContext,
    rawContentId: string,
    input: unknown,
  ) {
    this.requirePermission(actor, "schedule");
    const scheduleContentId = contentIdSchema.parse(rawContentId);
    const status = await this.repository.findScheduleStatus(scheduleContentId);
    if (!status) {
      throw new ApplicationError("NOT_FOUND", "The schedule was not found.");
    }
    if (status === "archived") {
      throw new ApplicationError(
        "VALIDATION_FAILED",
        "Archived schedules cannot receive exceptions.",
      );
    }
    const parsed = scheduleExceptionSchema.parse(input);
    await this.repository.saveScheduleException({
      ...this.mutationIdentity(actor.id),
      exceptionId: this.createId(),
      scheduleContentId,
      ...parsed,
    });
  }

  private async save(
    actor: StaffContext,
    rawContentId: string,
    subtype: ContentSubtype,
  ) {
    this.requirePermission(actor, subtype.contentType);
    const contentId = contentIdSchema.parse(rawContentId);
    const content = await this.repository.findContent(contentId);
    if (!content) {
      throw new ApplicationError(
        "NOT_FOUND",
        "The content entry was not found.",
      );
    }
    if (content.contentType !== subtype.contentType) {
      throw new ApplicationError(
        "VALIDATION_FAILED",
        "These details do not match the content type.",
      );
    }
    if (content.status !== "draft") {
      throw new ApplicationError(
        "VALIDATION_FAILED",
        "Only draft content details can be edited.",
      );
    }
    const version = await this.repository.saveSubtype({
      ...this.mutationIdentity(actor.id),
      content,
      subtype,
    });
    return { contentId, version };
  }

  private requirePermission(
    actor: StaffContext,
    contentType: Exclude<ContentType, "page">,
  ) {
    if (
      actor.accountStatus !== "active" ||
      !actor.permissions.includes(managementPermission[contentType])
    ) {
      throw new ApplicationError(
        "FORBIDDEN",
        "This account cannot manage these content details.",
      );
    }
  }

  private async requireReference(
    contentType: "ministry" | "series" | "speaker",
    contentId: string,
  ) {
    if (
      !(await this.repository.contentReferenceExists(contentType, contentId))
    ) {
      throw new ApplicationError(
        "VALIDATION_FAILED",
        `The selected ${contentType} is unavailable.`,
      );
    }
  }

  private async requireMedia(
    mediaId: string,
    kind: "image" | "pdf",
    scope: MediaAssetReference["storageScope"],
  ) {
    const media = await this.repository.findMediaAsset(mediaId);
    const hasExpectedMime =
      kind === "image"
        ? media?.mimeType.startsWith("image/")
        : media?.mimeType === "application/pdf";
    if (
      !media ||
      media.uploadStatus !== "ready" ||
      media.storageScope !== scope ||
      !hasExpectedMime
    ) {
      throw new ApplicationError(
        "VALIDATION_FAILED",
        `Select a ready ${kind === "image" ? "image" : "bulletin PDF"}.`,
      );
    }
  }

  private mutationIdentity(actorStaffId: string) {
    return {
      actorStaffId,
      auditLogId: this.createId(),
      correlationId: this.createId(),
      createdAt: this.now().toISOString(),
    };
  }
}
