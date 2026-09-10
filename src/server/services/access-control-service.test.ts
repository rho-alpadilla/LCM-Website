import { describe, expect, it, vi } from "vitest";

import type {
  AccessControlRepositoryPort,
  BootstrapAdministratorRecord,
  StaffContext,
} from "@/server/repositories/access-control-repository";

import { AccessControlService } from "./access-control-service";

function createRepositoryStub(
  overrides: Partial<AccessControlRepositoryPort> = {},
): AccessControlRepositoryPort {
  return {
    isBootstrapAvailable: vi.fn().mockResolvedValue(true),
    bootstrapFirstSystemAdministrator: vi.fn().mockResolvedValue(undefined),
    findStaffContextByAccessSubject: vi.fn().mockResolvedValue(null),
    activeStaffHasPermission: vi.fn().mockResolvedValue(false),
    ...overrides,
  };
}

describe("AccessControlService", () => {
  it("normalizes and creates the first System Administrator", async () => {
    const createRecord = vi
      .fn<(record: BootstrapAdministratorRecord) => Promise<void>>()
      .mockResolvedValue(undefined);
    const repository = createRepositoryStub({
      bootstrapFirstSystemAdministrator: createRecord,
    });
    const identifiers = [
      "staff-id",
      "assignment-id",
      "audit-id",
      "correlation-id",
    ];
    const service = new AccessControlService(repository, {
      createId: () => identifiers.shift() ?? "unexpected-id",
      now: () => new Date("2026-09-10T00:00:00.000Z"),
    });

    await expect(
      service.bootstrapFirstSystemAdministrator({
        accessSubject: " access-user-1 ",
        email: "ADMIN@EXAMPLE.COM",
        displayName: " Church Administrator ",
        reason: " Initial trusted administrator setup ",
      }),
    ).resolves.toEqual({ staffId: "staff-id" });

    expect(createRecord).toHaveBeenCalledWith({
      staffId: "staff-id",
      roleAssignmentId: "assignment-id",
      auditLogId: "audit-id",
      correlationId: "correlation-id",
      accessSubject: "access-user-1",
      email: "admin@example.com",
      displayName: "Church Administrator",
      reason: "Initial trusted administrator setup",
      createdAt: "2026-09-10T00:00:00.000Z",
    });
  });

  it("blocks bootstrap after the first administrator exists", async () => {
    const createRecord =
      vi.fn<(record: BootstrapAdministratorRecord) => Promise<void>>();
    const service = new AccessControlService(
      createRepositoryStub({
        isBootstrapAvailable: vi.fn().mockResolvedValue(false),
        bootstrapFirstSystemAdministrator: createRecord,
      }),
    );

    await expect(
      service.bootstrapFirstSystemAdministrator({
        accessSubject: "access-user-2",
        email: "second@example.com",
        displayName: "Second Administrator",
        reason: "Attempted second administrator bootstrap",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(createRecord).not.toHaveBeenCalled();
  });

  it("returns only an active staff context", async () => {
    const activeContext: StaffContext = {
      id: "staff-id",
      email: "leader@example.com",
      displayName: "Church Leader",
      accountStatus: "active",
      roles: ["leader"],
      permissions: ["admin.access"],
    };
    const service = new AccessControlService(
      createRepositoryStub({
        findStaffContextByAccessSubject: vi
          .fn()
          .mockResolvedValue(activeContext),
      }),
    );

    await expect(
      service.getActiveStaffContext({
        accessSubject: "leader-subject",
        email: "leader@example.com",
      }),
    ).resolves.toEqual(activeContext);
  });

  it("rejects a verified email that does not match the staff profile", async () => {
    const service = new AccessControlService(
      createRepositoryStub({
        findStaffContextByAccessSubject: vi.fn().mockResolvedValue({
          id: "staff-id",
          email: "expected@example.com",
          displayName: "Church Leader",
          accountStatus: "active",
          roles: ["leader"],
          permissions: ["admin.access"],
        }),
      }),
    );

    await expect(
      service.getActiveStaffContext({
        accessSubject: "leader-subject",
        email: "other@example.com",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("denies permissions not granted to an active staff identity", async () => {
    const permissionCheck = vi.fn().mockResolvedValue(false);
    const service = new AccessControlService(
      createRepositoryStub({ activeStaffHasPermission: permissionCheck }),
    );

    await expect(
      service.requirePermission(
        {
          accessSubject: "staff-subject",
          email: "staff@example.com",
        },
        "giving.details.read",
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(permissionCheck).toHaveBeenCalledWith(
      "staff-subject",
      "staff@example.com",
      "giving.details.read",
    );
  });
});
