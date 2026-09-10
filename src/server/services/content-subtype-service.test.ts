import { describe, expect, it, vi } from "vitest";

import type { StaffContext } from "@/server/repositories/access-control-repository";
import type { ContentEntry } from "@/server/repositories/content-repository";
import type { ContentSubtypeRepositoryPort } from "@/server/repositories/content-subtype-repository";

import { ContentSubtypeService } from "./content-subtype-service";

const actorId = "5d3a2ee4-7f94-4e95-ae5b-5c0650b8749e";
const contentId = "7d3a2ee4-7f94-4e95-ae5b-5c0650b8749e";
const referenceId = "8d3a2ee4-7f94-4e95-ae5b-5c0650b8749e";
const mediaId = "9d3a2ee4-7f94-4e95-ae5b-5c0650b8749e";

function actor(permissions: string[]): StaffContext {
  return {
    id: actorId,
    email: "head@example.com",
    displayName: "Ministry Head",
    accountStatus: "active",
    roles: ["multimedia_head"],
    permissions,
  };
}

function entry(
  contentType: ContentEntry["contentType"],
  overrides: Partial<ContentEntry> = {},
): ContentEntry {
  return {
    id: contentId,
    contentType,
    slug: "weekly-content",
    title: "Weekly Content",
    summary: null,
    body: { format: "plain_text", text: "Details" },
    coverMediaId: null,
    status: "draft",
    version: 2,
    createdBy: actorId,
    submittedBy: null,
    ...overrides,
  };
}

function repository(
  overrides: Partial<ContentSubtypeRepositoryPort> = {},
): ContentSubtypeRepositoryPort {
  return {
    findContent: vi.fn().mockResolvedValue(null),
    contentReferenceExists: vi.fn().mockResolvedValue(true),
    findMediaAsset: vi.fn().mockResolvedValue(null),
    saveSubtype: vi.fn().mockResolvedValue(3),
    saveScheduleException: vi.fn().mockResolvedValue(undefined),
    findScheduleStatus: vi.fn().mockResolvedValue("published"),
    ...overrides,
  };
}

describe("ContentSubtypeService", () => {
  it("saves normalized sermon details and validates references", async () => {
    const saveSubtype = vi.fn().mockResolvedValue(3);
    const contentReferenceExists = vi.fn().mockResolvedValue(true);
    const service = new ContentSubtypeService(
      repository({
        findContent: vi.fn().mockResolvedValue(entry("sermon")),
        contentReferenceExists,
        saveSubtype,
      }),
    );

    await expect(
      service.saveSermon(actor(["content.sermons.manage"]), contentId, {
        seriesContentId: referenceId,
        preachedAt: "2026-09-06T09:00:00+08:00",
        scriptureReference: "Matthew 28:19-20",
        videoProvider: "facebook",
        videoUrl: "https://www.facebook.com/LCMAGENTSofCHANGE/videos/123",
      }),
    ).resolves.toEqual({ contentId, version: 3 });
    expect(contentReferenceExists).toHaveBeenCalledWith("series", referenceId);
    expect(saveSubtype).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({ version: 2 }),
        subtype: expect.objectContaining({
          contentType: "sermon",
          durationSeconds: null,
        }),
      }),
    );
  });

  it("rejects a sermon URL that does not match its provider", async () => {
    const service = new ContentSubtypeService(repository());
    await expect(
      service.saveSermon(actor(["content.sermons.manage"]), contentId, {
        preachedAt: "2026-09-06T09:00:00+08:00",
        videoProvider: "youtube",
        videoUrl: "https://www.facebook.com/watch/123",
      }),
    ).rejects.toBeInstanceOf(Error);
  });

  it("blocks edits after a draft enters review", async () => {
    const service = new ContentSubtypeService(
      repository({
        findContent: vi
          .fn()
          .mockResolvedValue(
            entry("announcement", { status: "pending_review" }),
          ),
      }),
    );
    await expect(
      service.saveAnnouncement(
        actor(["content.announcements.manage"]),
        contentId,
        { priority: 5 },
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });

  it("requires a ready bulletin PDF in the private bulletin scope", async () => {
    const service = new ContentSubtypeService(
      repository({
        findMediaAsset: vi.fn().mockResolvedValue({
          id: mediaId,
          storageScope: "public_content",
          mimeType: "image/webp",
          uploadStatus: "ready",
        }),
      }),
    );
    await expect(
      service.saveBulletin(actor(["content.bulletins.manage"]), contentId, {
        issueDate: "2026-09-13",
        fileMediaId: mediaId,
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });

  it("accepts the supported weekly schedule recurrence subset", async () => {
    const saveSubtype = vi.fn().mockResolvedValue(3);
    const service = new ContentSubtypeService(
      repository({
        findContent: vi.fn().mockResolvedValue(entry("schedule")),
        saveSubtype,
      }),
    );
    await service.saveSchedule(actor(["content.schedule.manage"]), contentId, {
      activityType: "daily_activity",
      startsAt: "2026-09-14T18:00:00+08:00",
      endsAt: "2026-09-14T19:00:00+08:00",
      recurrenceRule: "FREQ=WEEKLY;BYDAY=MO,WE,FR",
      recurrenceUntil: "2026-12-31",
      locationVisibility: "public_area",
    });
    expect(saveSubtype).toHaveBeenCalledWith(
      expect.objectContaining({
        subtype: expect.objectContaining({
          timezone: "Asia/Manila",
          recurrenceRule: "FREQ=WEEKLY;BYDAY=MO,WE,FR",
        }),
      }),
    );
  });

  it("requires replacement times when a schedule occurrence is rescheduled", async () => {
    const service = new ContentSubtypeService(repository());
    await expect(
      service.saveScheduleException(
        actor(["content.schedule.manage"]),
        contentId,
        { occurrenceDate: "2026-09-14", action: "rescheduled" },
      ),
    ).rejects.toBeInstanceOf(Error);
  });

  it("allows a schedule exception after publication but not after archive", async () => {
    const saveScheduleException = vi.fn().mockResolvedValue(undefined);
    const service = new ContentSubtypeService(
      repository({ saveScheduleException }),
      { createId: () => "generated-id" },
    );
    await service.saveScheduleException(
      actor(["content.schedule.manage"]),
      contentId,
      { occurrenceDate: "2026-09-14", action: "cancelled" },
    );
    expect(saveScheduleException).toHaveBeenCalledWith(
      expect.objectContaining({
        scheduleContentId: contentId,
        action: "cancelled",
      }),
    );

    const archivedService = new ContentSubtypeService(
      repository({ findScheduleStatus: vi.fn().mockResolvedValue("archived") }),
    );
    await expect(
      archivedService.saveScheduleException(
        actor(["content.schedule.manage"]),
        contentId,
        { occurrenceDate: "2026-09-14", action: "cancelled" },
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });
});
