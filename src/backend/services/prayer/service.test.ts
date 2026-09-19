import { describe, expect, it, vi } from "vitest";

import type { StaffContext } from "@/backend/repositories/staff/access-control-repository";
import type {
  PrayerRepositoryPort,
  PrayerRequestRecord,
} from "@/backend/repositories/prayer/repository";
import { PrayerService } from "@/backend/services/prayer/service";

const IDS = [
  "00000000-0000-4000-8000-000000000001",
  "00000000-0000-4000-8000-000000000002",
  "00000000-0000-4000-8000-000000000003",
  "00000000-0000-4000-8000-000000000004",
];

function actor(overrides: Partial<StaffContext> = {}): StaffContext {
  return {
    id: "10000000-0000-4000-8000-000000000001",
    email: "synthetic@example.test",
    displayName: "Synthetic Staff",
    accountStatus: "active",
    roles: ["prayer_warrior"],
    permissions: [
      "prayer.read_team",
      "prayer.update_team",
      "prayer.contact.read",
      "prayer.close",
    ],
    ...overrides,
  };
}

function request(
  overrides: Partial<PrayerRequestRecord> = {},
): PrayerRequestRecord {
  return {
    id: IDS[0],
    requestText: "Synthetic prayer request",
    privacyScope: "team",
    status: "open",
    submittedAt: "2026-01-01T00:00:00.000Z",
    legalHold: false,
    closedAt: null,
    contactRetentionDueAt: null,
    contentRetentionDueAt: null,
    ...overrides,
  };
}

function repository(
  overrides: Partial<PrayerRepositoryPort> = {},
): PrayerRepositoryPort {
  return {
    create: vi.fn(),
    listQueue: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(request()),
    listUpdates: vi.fn().mockResolvedValue([]),
    listAssignments: vi.fn().mockResolvedValue([]),
    listEligibleAssignees: vi.fn().mockResolvedValue([]),
    isEligibleAssignee: vi.fn().mockResolvedValue(true),
    findContact: vi.fn().mockResolvedValue(null),
    recordSensitiveRead: vi.fn(),
    isActivelyAssigned: vi.fn().mockResolvedValue(true),
    assign: vi.fn(),
    addUpdate: vi.fn(),
    close: vi.fn().mockResolvedValue(1),
    findRetentionCandidates: vi.fn().mockResolvedValue([]),
    applyRetention: vi.fn(),
    ...overrides,
  };
}

function service(repo: PrayerRepositoryPort) {
  let index = 0;
  return new PrayerService({
    repository: repo,
    createId: () => IDS[index++ % IDS.length],
    now: () => new Date("2026-01-01T00:00:00.000Z"),
  });
}

describe("PrayerService policy enforcement", () => {
  it("lists only the scopes granted to the actor", async () => {
    const repo = repository();
    await service(repo).listQueue(
      actor({ permissions: ["prayer.read_team", "prayer.read_pastoral"] }),
    );
    expect(repo.listQueue).toHaveBeenCalledWith(
      ["team", "pastoral_only"],
      actor().id,
    );
  });

  it("allows a pastor to read a pastoral-only request", async () => {
    const repo = repository({
      findById: vi
        .fn()
        .mockResolvedValue(request({ privacyScope: "pastoral_only" })),
    });
    await expect(
      service(repo).get(
        actor({
          roles: ["pastor"],
          permissions: ["prayer.read_pastoral"],
        }),
        IDS[0],
      ),
    ).resolves.toMatchObject({ privacyScope: "pastoral_only" });
  });

  it("denies a Prayer Warrior access to a pastoral-only request", async () => {
    const repo = repository({
      findById: vi
        .fn()
        .mockResolvedValue(request({ privacyScope: "pastoral_only" })),
    });
    await expect(service(repo).get(actor(), IDS[0])).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("allows an assigned Prayer Warrior to close a team request with 30/90-day deadlines", async () => {
    const repo = repository();
    await service(repo).close(actor(), IDS[0]);
    expect(repo.close).toHaveBeenCalledWith(
      expect.objectContaining({
        actorStaffId: actor().id,
        contactRetentionDueAt: "2026-01-31T00:00:00.000Z",
        contentRetentionDueAt: "2026-04-01T00:00:00.000Z",
      }),
    );
  });

  it("denies an unassigned Prayer Warrior from closing a team request", async () => {
    const repo = repository({
      isActivelyAssigned: vi.fn().mockResolvedValue(false),
    });
    await expect(service(repo).close(actor(), IDS[0])).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("does not reveal contact channels without follow-up consent", async () => {
    const repo = repository({
      findContact: vi.fn().mockResolvedValue({
        prayerRequestId: IDS[0],
        name: "Synthetic Person",
        email: "private@example.test",
        phone: "09170000000",
        preferredContact: "none",
        followUpConsent: false,
        deletedAt: null,
      }),
    });
    await expect(
      service(repo).getContact(actor(), IDS[0]),
    ).resolves.toMatchObject({ email: null, phone: null });
    expect(repo.recordSensitiveRead).toHaveBeenCalledWith(
      expect.any(Object),
      "prayer.contact_revealed",
    );
  });

  it("denies updates from an unassigned Prayer Warrior", async () => {
    const repo = repository({
      isActivelyAssigned: vi.fn().mockResolvedValue(false),
    });
    await expect(
      service(repo).addUpdate(actor(), IDS[0], {
        updateType: "prayed",
        note: null,
        visibilityScope: "team",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(repo.addUpdate).not.toHaveBeenCalled();
  });

  it("allows an assigned Prayer Warrior to record prayer", async () => {
    const repo = repository();
    await service(repo).addUpdate(actor(), IDS[0], {
      updateType: "prayed",
      note: null,
      visibilityScope: "team",
    });
    expect(repo.addUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        updateType: "prayed",
        nextStatus: "in_prayer",
      }),
    );
  });

  it("lets pastoral leadership escalate a team request to pastoral-only", async () => {
    const repo = repository();
    await service(repo).addUpdate(
      actor({
        roles: ["pastor"],
        permissions: [
          "prayer.update_team",
          "prayer.update_pastoral",
          "prayer.escalate",
        ],
      }),
      IDS[0],
      {
        updateType: "escalated",
        note: "Synthetic escalation reason",
        visibilityScope: "pastoral_only",
      },
    );
    expect(repo.addUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        updateType: "escalated",
        nextStatus: "escalated",
        increasePrivacy: true,
      }),
    );
  });

  it("rejects assignment to someone who is not an active Prayer Warrior", async () => {
    const repo = repository({
      isEligibleAssignee: vi.fn().mockResolvedValue(false),
    });
    await expect(
      service(repo).assign(
        actor({
          roles: ["pastor"],
          permissions: ["prayer.assign", "prayer.read_team"],
        }),
        IDS[0],
        IDS[1],
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });

  it("processes only repository-selected due retention records", async () => {
    const candidates = [
      { id: IDS[0], deleteContact: true, deleteContent: false },
      { id: IDS[1], deleteContact: true, deleteContent: true },
    ];
    const repo = repository({
      findRetentionCandidates: vi.fn().mockResolvedValue(candidates),
    });
    await expect(service(repo).runRetention()).resolves.toEqual({
      processed: 2,
    });
    expect(repo.findRetentionCandidates).toHaveBeenCalledWith(
      "2026-01-01T00:00:00.000Z",
      100,
    );
    expect(repo.applyRetention).toHaveBeenCalledTimes(2);
  });
});
