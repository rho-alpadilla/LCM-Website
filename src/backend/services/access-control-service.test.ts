import { describe, expect, it, vi } from "vitest";

import type {
  AccessControlRepositoryPort,
  BootstrapAdministratorRecord,
  CreateInvitationRecord,
  PendingInvitation,
  StaffContext,
} from "@/backend/repositories/access-control-repository";

import { AccessControlService } from "./access-control-service";

function createRepositoryStub(
  overrides: Partial<AccessControlRepositoryPort> = {},
): AccessControlRepositoryPort {
  return {
    isBootstrapAvailable: vi.fn().mockResolvedValue(true),
    bootstrapFirstSystemAdministrator: vi.fn().mockResolvedValue(undefined),
    findStaffContextByAccessSubject: vi.fn().mockResolvedValue(null),
    activeStaffHasPermission: vi.fn().mockResolvedValue(false),
    emailHasStaffProfile: vi.fn().mockResolvedValue(false),
    findPendingInvitationByEmail: vi.fn().mockResolvedValue(null),
    createInvitation: vi.fn().mockResolvedValue(undefined),
    activateInvitation: vi.fn().mockResolvedValue(undefined),
    listStaffDirectory: vi
      .fn()
      .mockResolvedValue({ staff: [], invitations: [] }),
    findStaffById: vi.fn().mockResolvedValue(null),
    assignRole: vi.fn().mockResolvedValue(undefined),
    revokeRole: vi.fn().mockResolvedValue(undefined),
    suspendStaff: vi.fn().mockResolvedValue(undefined),
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
      roles: ["content_editor"],
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

  it.each([
    ["unknown", null],
    [
      "suspended",
      {
        id: "staff-id",
        email: "leader@example.com",
        displayName: "Church Leader",
        accountStatus: "suspended",
        roles: ["content_editor"],
        permissions: ["admin.access"],
      } satisfies StaffContext,
    ],
    [
      "disabled",
      {
        id: "staff-id",
        email: "leader@example.com",
        displayName: "Church Leader",
        accountStatus: "disabled",
        roles: ["content_editor"],
        permissions: ["admin.access"],
      } satisfies StaffContext,
    ],
  ])("rejects a %s staff identity", async (_label, context) => {
    const service = new AccessControlService(
      createRepositoryStub({
        findStaffContextByAccessSubject: vi.fn().mockResolvedValue(context),
      }),
    );

    await expect(
      service.getActiveStaffContext({
        accessSubject: "leader-subject",
        email: "leader@example.com",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects a verified email that does not match the staff profile", async () => {
    const service = new AccessControlService(
      createRepositoryStub({
        findStaffContextByAccessSubject: vi.fn().mockResolvedValue({
          id: "staff-id",
          email: "expected@example.com",
          displayName: "Church Leader",
          accountStatus: "active",
          roles: ["content_editor"],
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
        "prayer.read_pastoral",
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(permissionCheck).toHaveBeenCalledWith(
      "staff-subject",
      "staff@example.com",
      "prayer.read_pastoral",
    );
  });

  it("records a normalized invitation without pretending to send email", async () => {
    const createInvitation = vi
      .fn<(record: CreateInvitationRecord) => Promise<void>>()
      .mockResolvedValue(undefined);
    const ids = ["invitation-id", "audit-id", "correlation-id"];
    const service = new AccessControlService(
      createRepositoryStub({ createInvitation }),
      {
        createId: () => ids.shift() ?? "unexpected-id",
        now: () => new Date("2026-09-10T01:00:00.000Z"),
      },
    );

    await expect(
      service.createInvitation({
        actorStaffId: "5d3a2ee4-7f94-4e95-ae5b-5c0650b8749e",
        email: " LEADER@EXAMPLE.COM ",
        displayName: " Church Leader ",
        phone: "",
        jobTitle: " Ministry Leader ",
        roleCode: "content_editor",
        reason: "Approved content editor",
      }),
    ).resolves.toEqual({ invitationId: "invitation-id" });

    expect(createInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        invitationId: "invitation-id",
        email: "leader@example.com",
        displayName: "Church Leader",
        phone: null,
        jobTitle: "Ministry Leader",
        roleCode: "content_editor",
      }),
    );
  });

  it("blocks duplicate and unreasoned elevated invitations", async () => {
    const duplicateService = new AccessControlService(
      createRepositoryStub({
        emailHasStaffProfile: vi.fn().mockResolvedValue(true),
      }),
    );
    await expect(
      duplicateService.createInvitation({
        actorStaffId: "5d3a2ee4-7f94-4e95-ae5b-5c0650b8749e",
        email: "staff@example.com",
        displayName: "Staff Person",
        roleCode: "content_editor",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });

    const elevatedService = new AccessControlService(createRepositoryStub());
    await expect(
      elevatedService.createInvitation({
        actorStaffId: "5d3a2ee4-7f94-4e95-ae5b-5c0650b8749e",
        email: "admin@example.com",
        displayName: "Second Admin",
        roleCode: "system_admin",
        reason: "short",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });

  it("activates only an invitation matching the verified email", async () => {
    const invitation: PendingInvitation = {
      id: "invitation-id",
      email: "leader@example.com",
      displayName: "Church Leader",
      phone: null,
      jobTitle: null,
      initialRoleCode: "content_editor",
      initialRoleName: "Content Editor",
      assignmentReason: "Approved content editor",
      invitedBy: "5d3a2ee4-7f94-4e95-ae5b-5c0650b8749e",
      createdAt: "2026-09-10T00:00:00.000Z",
    };
    const activateInvitation = vi.fn().mockResolvedValue(undefined);
    const ids = ["staff-id", "assignment-id", "audit-id", "correlation-id"];
    const service = new AccessControlService(
      createRepositoryStub({
        findPendingInvitationByEmail: vi.fn().mockResolvedValue(invitation),
        activateInvitation,
      }),
      {
        createId: () => ids.shift() ?? "unexpected-id",
        now: () => new Date("2026-09-10T02:00:00.000Z"),
      },
    );

    await expect(
      service.activatePendingInvitation({
        accessSubject: "access-subject",
        email: "LEADER@example.com",
      }),
    ).resolves.toEqual({ staffId: "staff-id" });
    expect(activateInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        invitation,
        staffId: "staff-id",
        accessSubject: "access-subject",
      }),
    );
  });

  it("allows a reasoned Core Leader elevation without another prerequisite role", async () => {
    const assignRole = vi.fn().mockResolvedValue(undefined);
    const service = new AccessControlService(
      createRepositoryStub({
        findStaffById: vi.fn().mockResolvedValue({
          id: "7d3a2ee4-7f94-4e95-ae5b-5c0650b8749e",
          email: "pastor@example.com",
          displayName: "Pastor",
          phone: null,
          jobTitle: null,
          accountStatus: "active",
          roles: [],
        }),
        assignRole,
      }),
    );
    await expect(
      service.assignRole({
        actorStaffId: "5d3a2ee4-7f94-4e95-ae5b-5c0650b8749e",
        staffId: "7d3a2ee4-7f94-4e95-ae5b-5c0650b8749e",
        roleCode: "core_leader",
        reason: "Approved for senior leadership access",
      }),
    ).resolves.toBeUndefined();
    expect(assignRole).toHaveBeenCalledWith(
      expect.objectContaining({
        roleCode: "core_leader",
        reason: "Approved for senior leadership access",
      }),
    );
  });

});
