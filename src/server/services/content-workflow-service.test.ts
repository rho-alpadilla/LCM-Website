import { describe, expect, it, vi } from "vitest";

import type { StaffContext } from "@/server/repositories/access-control-repository";
import type {
  ContentEntry,
  ContentRepositoryPort,
} from "@/server/repositories/content-repository";

import { ContentWorkflowService } from "./content-workflow-service";

const actorId = "5d3a2ee4-7f94-4e95-ae5b-5c0650b8749e";
const contentId = "7d3a2ee4-7f94-4e95-ae5b-5c0650b8749e";

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

function entry(overrides: Partial<ContentEntry> = {}): ContentEntry {
  return {
    id: contentId,
    contentType: "sermon",
    slug: "faith-that-changes-lives",
    title: "Faith That Changes Lives",
    summary: null,
    body: { format: "plain_text", text: "Sermon notes" },
    coverMediaId: null,
    status: "draft",
    version: 1,
    createdBy: actorId,
    submittedBy: null,
    ...overrides,
  };
}

function repository(
  overrides: Partial<ContentRepositoryPort> = {},
): ContentRepositoryPort {
  return {
    slugExists: vi.fn().mockResolvedValue(false),
    listContent: vi.fn().mockResolvedValue([]),
    createDraft: vi.fn().mockResolvedValue(undefined),
    updateDraft: vi.fn().mockResolvedValue(2),
    findById: vi.fn().mockResolvedValue(null),
    findSubtypeSnapshot: vi.fn().mockResolvedValue({
      preachedAt: "2026-09-07T01:00:00.000Z",
      videoProvider: "facebook",
      videoUrl: "https://www.facebook.com/watch/sermon",
    }),
    findCurrentRevisionId: vi.fn().mockResolvedValue("revision-id"),
    submit: vi.fn().mockResolvedValue(undefined),
    approve: vi.fn().mockResolvedValue(undefined),
    requestChanges: vi.fn().mockResolvedValue(2),
    publish: vi.fn().mockResolvedValue(undefined),
    archive: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("ContentWorkflowService", () => {
  it("creates a normalized draft inside the actor's content scope", async () => {
    const createDraft = vi.fn().mockResolvedValue(undefined);
    const ids = ["content-id", "audit-id", "correlation-id"];
    const service = new ContentWorkflowService(repository({ createDraft }), {
      createId: () => ids.shift() ?? "unexpected-id",
      now: () => new Date("2026-09-11T00:00:00.000Z"),
    });

    await expect(
      service.createDraft(actor(["content.sermons.manage"]), {
        contentType: "sermon",
        slug: "  faith-that-changes-lives  ",
        title: "  Faith That Changes Lives  ",
        summary: "",
        bodyText: "Sermon notes",
      }),
    ).resolves.toEqual({ contentId: "content-id" });
    expect(createDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        contentId: "content-id",
        slug: "faith-that-changes-lives",
        title: "Faith That Changes Lives",
        summary: null,
        bodyJson: JSON.stringify({
          format: "plain_text",
          text: "Sermon notes",
        }),
      }),
    );
  });

  it("blocks a content type outside the actor's management scope", async () => {
    const service = new ContentWorkflowService(repository());
    await expect(
      service.createDraft(actor(["content.sermons.manage"]), {
        contentType: "bulletin",
        slug: "weekly-bulletin",
        title: "Weekly Bulletin",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("submits a draft as an immutable revision", async () => {
    const submit = vi.fn().mockResolvedValue(undefined);
    const ids = ["revision-id", "audit-id", "correlation-id", "event-id"];
    const service = new ContentWorkflowService(
      repository({ findById: vi.fn().mockResolvedValue(entry()), submit }),
      { createId: () => ids.shift() ?? "unexpected-id" },
    );

    await service.submitForReview(
      actor(["content.sermons.manage", "content.submit"]),
      contentId,
      "Initial sermon submission",
    );
    expect(submit).toHaveBeenCalledWith(
      expect.objectContaining({
        revisionId: "revision-id",
        changeSummary: "Initial sermon submission",
        snapshotJson: expect.stringContaining('"subtype"'),
      }),
    );
  });

  it("updates only a permitted draft and advances its version", async () => {
    const updateDraft = vi.fn().mockResolvedValue(2);
    const service = new ContentWorkflowService(
      repository({
        findById: vi.fn().mockResolvedValue(entry()),
        updateDraft,
      }),
    );
    await expect(
      service.updateDraft(actor(["content.sermons.manage"]), contentId, {
        slug: "updated-sermon",
        title: "Updated Sermon",
        summary: "A clear summary",
        bodyText: "Updated notes",
      }),
    ).resolves.toEqual({ contentId, version: 2 });
    expect(updateDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: "updated-sermon",
        bodyJson: JSON.stringify({
          format: "plain_text",
          text: "Updated notes",
        }),
      }),
    );
  });

  it("requires subtype details before submitting non-page content", async () => {
    const service = new ContentWorkflowService(
      repository({
        findById: vi.fn().mockResolvedValue(entry()),
        findSubtypeSnapshot: vi.fn().mockResolvedValue(null),
      }),
    );
    await expect(
      service.submitForReview(
        actor(["content.sermons.manage", "content.submit"]),
        contentId,
        "Initial sermon submission",
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });

  it("allows a Head with explicit self-approval permission to approve their own work", async () => {
    const approve = vi.fn().mockResolvedValue(undefined);
    const service = new ContentWorkflowService(
      repository({
        findById: vi
          .fn()
          .mockResolvedValue(
            entry({ status: "pending_review", submittedBy: actorId }),
          ),
        approve,
      }),
    );
    await service.approve(
      actor([
        "content.sermons.manage",
        "content.approve",
        "content.self_approve",
      ]),
      contentId,
    );
    expect(approve).toHaveBeenCalledWith(
      expect.objectContaining({ isSelfApproval: true }),
    );
  });

  it("blocks self-approval without the explicit permission", async () => {
    const service = new ContentWorkflowService(
      repository({
        findById: vi
          .fn()
          .mockResolvedValue(
            entry({ status: "pending_review", submittedBy: actorId }),
          ),
      }),
    );
    await expect(
      service.approve(
        actor(["content.sermons.manage", "content.approve"]),
        contentId,
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("returns pending content to a new draft version with review notes", async () => {
    const requestChanges = vi.fn().mockResolvedValue(2);
    const service = new ContentWorkflowService(
      repository({
        findById: vi
          .fn()
          .mockResolvedValue(entry({ status: "pending_review" })),
        requestChanges,
      }),
    );
    await expect(
      service.requestChanges(
        actor(["content.sermons.manage", "content.approve"]),
        contentId,
        "Please verify the sermon date.",
      ),
    ).resolves.toBe(2);
    expect(requestChanges).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: "Please verify the sermon date.",
        revisionId: "revision-id",
      }),
    );
  });

  it("publishes only approved content", async () => {
    const service = new ContentWorkflowService(
      repository({ findById: vi.fn().mockResolvedValue(entry()) }),
    );
    await expect(
      service.publish(
        actor(["content.sermons.manage", "content.publish"]),
        contentId,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });
});
