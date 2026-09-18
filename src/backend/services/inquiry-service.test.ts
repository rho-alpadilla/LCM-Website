import { describe, expect, it, vi } from "vitest";

import type { StaffContext } from "@/backend/repositories/access-control-repository";
import type {
  InquiryRecord,
  InquiryRepositoryPort,
} from "@/backend/repositories/inquiry-repository";
import { InquiryService } from "@/backend/services/inquiry-service";

const ids = [
  "00000000-0000-4000-8000-000000000101",
  "00000000-0000-4000-8000-000000000102",
  "00000000-0000-4000-8000-000000000103",
  "00000000-0000-4000-8000-000000000104",
];

function actor(overrides: Partial<StaffContext> = {}): StaffContext {
  return {
    id: "10000000-0000-4000-8000-000000000101",
    email: "synthetic-pastor@example.test",
    displayName: "Synthetic Pastor",
    accountStatus: "active",
    roles: ["pastor"],
    permissions: [
      "contact.read",
      "contact.respond",
      "contact.assign",
      "ministry_interest.read",
      "ministry_interest.respond",
      "ministry_interest.assign",
    ],
    ...overrides,
  };
}

function inquiry(overrides: Partial<InquiryRecord> = {}): InquiryRecord {
  return {
    id: ids[0],
    inquiryType: "contact",
    status: "open",
    name: "Synthetic Visitor",
    ministryTitle: null,
    submittedAt: "2026-01-01T00:00:00.000Z",
    assignedToName: null,
    ministryContentId: null,
    email: "synthetic-visitor@example.test",
    phone: "09170000000",
    preferredContact: "email",
    followUpConsent: true,
    message: "Synthetic request for church information.",
    closedAt: null,
    retentionDueAt: null,
    redactedAt: null,
    assignedToId: null,
    ...overrides,
  };
}

function repository(
  overrides: Partial<InquiryRepositoryPort> = {},
): InquiryRepositoryPort {
  return {
    create: vi.fn(),
    listQueue: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(inquiry()),
    listUpdates: vi.fn().mockResolvedValue([]),
    recordSensitiveRead: vi.fn(),
    listEligibleAssignees: vi.fn().mockResolvedValue([]),
    isEligibleAssignee: vi.fn().mockResolvedValue(true),
    assign: vi.fn(),
    addUpdate: vi.fn(),
    close: vi.fn().mockResolvedValue(1),
    findRetentionCandidates: vi.fn().mockResolvedValue([]),
    applyRetention: vi.fn(),
    ...overrides,
  };
}

function service(repo: InquiryRepositoryPort) {
  let index = 0;
  return new InquiryService({
    repository: repo,
    createId: () => ids[index++ % ids.length]!,
    now: () => new Date("2026-01-01T00:00:00.000Z"),
  });
}

describe("InquiryService privacy and permission enforcement", () => {
  it("lists only inquiry categories granted to the staff member", async () => {
    const repo = repository();
    await service(repo).listQueue(actor({ permissions: ["contact.read"] }));
    expect(repo.listQueue).toHaveBeenCalledWith(["contact"]);
  });

  it("denies an account without visitor-inquiry permission", async () => {
    await expect(
      service(repository()).listQueue(actor({ permissions: [] })),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("audits a permitted inquiry detail view without exposing the message in audit input", async () => {
    const repo = repository();
    await service(repo).getDetail(actor(), ids[0]!);
    expect(repo.recordSensitiveRead).toHaveBeenCalledWith(
      expect.objectContaining({ inquiryId: ids[0] }),
    );
  });

  it("denies handling a ministry inquiry when only contact permission exists", async () => {
    const repo = repository({
      findById: vi.fn().mockResolvedValue(inquiry({ inquiryType: "ministry_interest" })),
    });
    await expect(
      service(repo).addUpdate(actor({ permissions: ["contact.respond"] }), ids[0]!, {
        updateType: "note",
        note: "Synthetic internal note.",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(repo.addUpdate).not.toHaveBeenCalled();
  });

  it("requires an eligible staff member before assignment", async () => {
    const repo = repository({ isEligibleAssignee: vi.fn().mockResolvedValue(false) });
    await expect(
      service(repo).assign(actor(), ids[0]!, ids[1]),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
    expect(repo.assign).not.toHaveBeenCalled();
  });

  it("closes an inquiry with the provisional 90-day redaction deadline", async () => {
    const repo = repository();
    await service(repo).close(actor(), ids[0]!, {
      note: "Synthetic closure record for this visitor inquiry.",
    });
    expect(repo.close).toHaveBeenCalledWith(
      expect.objectContaining({
        retentionDueAt: "2026-04-01T00:00:00.000Z",
      }),
    );
  });

  it("processes only bounded retention batches", async () => {
    const repo = repository({ findRetentionCandidates: vi.fn().mockResolvedValue([ids[0], ids[1]]) });
    await expect(service(repo).runRetention(501)).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
    });
    await expect(service(repo).runRetention(100)).resolves.toEqual({ processed: 2 });
    expect(repo.applyRetention).toHaveBeenCalledTimes(2);
  });
});
