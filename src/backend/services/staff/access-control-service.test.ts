import { describe, expect, it, vi } from "vitest";

import type {
  AccessControlRepositoryPort,
  BootstrapAdministratorRecord,
  CancelInvitationRecord,
  CreateInvitationRecord,
  PendingInvitation,
  StaffContext,
} from "@/backend/repositories/staff/access-control-repository";
import type { StaffAccessDirectory } from "@/backend/integrations/cloudflare/staff-access-directory";

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
    findPendingInvitationById: vi.fn().mockResolvedValue(null),
    createInvitation: vi.fn().mockResolvedValue(undefined),
    activateInvitation: vi.fn().mockResolvedValue(undefined),
    cancelInvitation: vi.fn().mockResolvedValue(undefined),
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

  it("blocks duplicate and unreasoned elevated staff accounts", async () => {
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

    await expect(
      elevatedService.createInvitation({
        actorStaffId: "5d3a2ee4-7f94-4e95-ae5b-5c0650b8749e",
        email: "core-leader@example.com",
        displayName: "Core Leader",
        roleCode: "core_leader",
        reason: "short",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });

  it("allows a reasoned Core Leader account to be created directly", async () => {
    const createInvitation = vi.fn().mockResolvedValue(undefined);
    const service = new AccessControlService(
      createRepositoryStub({ createInvitation }),
      {
        createId: () => "core-leader-account-id",
        now: () => new Date("2026-09-20T00:00:00.000Z"),
      },
    );

    await expect(
      service.createInvitation({
        actorStaffId: "5d3a2ee4-7f94-4e95-ae5b-5c0650b8749e",
        email: "core-leader@example.com",
        displayName: "Trusted Core Leader",
        roleCode: "core_leader",
        reason: "Approved for trusted pastoral leadership.",
      }),
    ).resolves.toEqual({ invitationId: "core-leader-account-id" });
    expect(createInvitation).toHaveBeenCalledWith(
      expect.objectContaining({ roleCode: "core_leader" }),
    );
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

  it("cancels a pending invitation after removing its Access email", async () => {
    const invitation: PendingInvitation = {
      id: "5c0a1c85-ae2f-4255-8d73-a4dcf063a610",
      email: "leader@example.com",
      displayName: "Church Leader",
      phone: null,
      jobTitle: null,
      initialRoleCode: "content_editor",
      initialRoleName: "Content Editor",
      assignmentReason: null,
      invitedBy: "5d3a2ee4-7f94-4e95-ae5b-5c0650b8749e",
      createdAt: "2026-09-10T00:00:00.000Z",
    };
    const cancelInvitation = vi
      .fn<(record: CancelInvitationRecord) => Promise<void>>()
      .mockResolvedValue(undefined);
    const removeEmail = vi.fn().mockResolvedValue({ removed: true });
    const directory = {
      allowEmail: vi.fn().mockResolvedValue({ added: true }),
      removeEmail,
    } satisfies StaffAccessDirectory;
    const identifiers = ["audit-id", "correlation-id"];
    const service = new AccessControlService(
      createRepositoryStub({
        findPendingInvitationById: vi.fn().mockResolvedValue(invitation),
        cancelInvitation,
      }),
      {
        createId: () => identifiers.shift() ?? "unexpected-id",
        now: () => new Date("2026-09-22T01:00:00.000Z"),
      },
    );

    await expect(
      service.cancelInvitation(
        {
          actorStaffId: "5d3a2ee4-7f94-4e95-ae5b-5c0650b8749e",
          invitationId: invitation.id,
          reason: "Duplicate invitation created during testing.",
        },
        directory,
      ),
    ).resolves.toBeUndefined();

    expect(removeEmail).toHaveBeenCalledWith("leader@example.com");
    expect(cancelInvitation).toHaveBeenCalledWith({
      invitationId: invitation.id,
      actorStaffId: "5d3a2ee4-7f94-4e95-ae5b-5c0650b8749e",
      reason: "Duplicate invitation created during testing.",
      auditLogId: "audit-id",
      correlationId: "correlation-id",
      createdAt: "2026-09-22T01:00:00.000Z",
    });
    expect(removeEmail.mock.invocationCallOrder[0]).toBeLessThan(
      cancelInvitation.mock.invocationCallOrder[0] ?? Infinity,
    );
  });

  it("leaves Access unchanged when the invitation is no longer pending", async () => {
    const removeEmail = vi.fn();
    const service = new AccessControlService(createRepositoryStub());
    const directory = {
      allowEmail: vi.fn(),
      removeEmail,
    } satisfies StaffAccessDirectory;

    await expect(
      service.cancelInvitation(
        {
          actorStaffId: "5d3a2ee4-7f94-4e95-ae5b-5c0650b8749e",
          invitationId: "5c0a1c85-ae2f-4255-8d73-a4dcf063a610",
          reason: "Duplicate invitation created during testing.",
        },
        directory,
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    expect(removeEmail).not.toHaveBeenCalled();
  });

  it("restores the Access email if the D1 cancellation cannot be recorded", async () => {
    const invitation: PendingInvitation = {
      id: "5c0a1c85-ae2f-4255-8d73-a4dcf063a610",
      email: "leader@example.com",
      displayName: "Church Leader",
      phone: null,
      jobTitle: null,
      initialRoleCode: "content_editor",
      initialRoleName: "Content Editor",
      assignmentReason: null,
      invitedBy: "5d3a2ee4-7f94-4e95-ae5b-5c0650b8749e",
      createdAt: "2026-09-10T00:00:00.000Z",
    };
    const allowEmail = vi.fn().mockResolvedValue({ added: true });
    const service = new AccessControlService(
      createRepositoryStub({
        findPendingInvitationById: vi.fn().mockResolvedValue(invitation),
        cancelInvitation: vi
          .fn()
          .mockRejectedValue(new Error("D1 unavailable")),
      }),
    );
    const directory = {
      allowEmail,
      removeEmail: vi.fn().mockResolvedValue({ removed: true }),
    } satisfies StaffAccessDirectory;

    await expect(
      service.cancelInvitation(
        {
          actorStaffId: "5d3a2ee4-7f94-4e95-ae5b-5c0650b8749e",
          invitationId: invitation.id,
          reason: "Duplicate invitation created during testing.",
        },
        directory,
      ),
    ).rejects.toThrow("D1 unavailable");

    expect(allowEmail).toHaveBeenCalledWith("leader@example.com");
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
