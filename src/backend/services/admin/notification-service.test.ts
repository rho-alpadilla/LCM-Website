import { describe, expect, it, vi } from "vitest";

import type { NotificationRepository } from "@/backend/repositories/admin/notification-repository";

import { NotificationService } from "./notification-service";

function repositoryStub() {
  return {
    create: vi.fn().mockResolvedValue(undefined),
    countUnreadForStaff: vi.fn().mockResolvedValue(2),
    listForStaff: vi.fn().mockResolvedValue([]),
    markReadForStaff: vi.fn().mockResolvedValue(undefined),
  } as unknown as NotificationRepository;
}

describe("NotificationService", () => {
  it("creates a small operational notification with a generated identifier", async () => {
    const repository = repositoryStub();
    const service = new NotificationService(
      repository,
      () => "5c0a1c85-ae2f-4255-8d73-a4dcf063a610",
      () => new Date("2026-09-22T02:00:00.000Z"),
    );

    await service.notify({
      recipientStaffId: "5d3a2ee4-7f94-4e95-ae5b-5c0650b8749e",
      category: "staff",
      title: "Staff sign-in is ready",
      body: "The staff member can now sign in.",
      href: "/admin/staff",
    });

    expect(repository.create).toHaveBeenCalledWith({
      id: "5c0a1c85-ae2f-4255-8d73-a4dcf063a610",
      recipientStaffId: "5d3a2ee4-7f94-4e95-ae5b-5c0650b8749e",
      category: "staff",
      title: "Staff sign-in is ready",
      body: "The staff member can now sign in.",
      href: "/admin/staff",
      createdAt: "2026-09-22T02:00:00.000Z",
    });
  });

  it("only marks a notification read for the current staff account", async () => {
    const repository = repositoryStub();
    const service = new NotificationService(
      repository,
      undefined,
      () => new Date("2026-09-22T02:00:00.000Z"),
    );

    await service.markRead(
      "5d3a2ee4-7f94-4e95-ae5b-5c0650b8749e",
      "5c0a1c85-ae2f-4255-8d73-a4dcf063a610",
    );

    expect(repository.markReadForStaff).toHaveBeenCalledWith(
      "5d3a2ee4-7f94-4e95-ae5b-5c0650b8749e",
      "5c0a1c85-ae2f-4255-8d73-a4dcf063a610",
      "2026-09-22T02:00:00.000Z",
    );
  });
});
