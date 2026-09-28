import { describe, expect, it, vi } from "vitest";

import type { StaffPasswordCredential } from "@/shared/auth/password-authentication";
import type {
  PasswordAuthenticationRepositoryPort,
  PasswordSessionRecord,
} from "@/backend/repositories/staff/password-authentication-repository";

import {
  PasswordAuthenticationService,
  type PasswordHashCoordinator,
} from "./password-authentication-service";

const activeCredential: StaffPasswordCredential = {
  staffId: "staff-1",
  username: "church.leader",
  passwordHash: "c".repeat(43),
  passwordSalt: "d".repeat(22),
  passwordVersion: 1,
  mustChangePassword: false,
  accountStatus: "active",
  passwordExpiresAt: null,
};

function createRepositoryStub(
  overrides: Partial<PasswordAuthenticationRepositoryPort> = {},
): PasswordAuthenticationRepositoryPort {
  return {
    findCredentialByUsername: vi.fn().mockResolvedValue(activeCredential),
    findCredentialByStaffId: vi.fn().mockResolvedValue(activeCredential),
    usernameExists: vi.fn().mockResolvedValue(false),
    emailExists: vi.fn().mockResolvedValue(false),
    createPasswordEnrollment: vi.fn().mockResolvedValue(undefined),
    listPasswordStaffDirectory: vi.fn().mockResolvedValue([]),
    createSession: vi.fn().mockResolvedValue(undefined),
    findActiveSessionByDigest: vi.fn().mockResolvedValue(null),
    touchSession: vi.fn().mockResolvedValue(undefined),
    revokeSession: vi.fn().mockResolvedValue(undefined),
    completeTemporaryPasswordSetup: vi.fn().mockResolvedValue(undefined),
    replacePassword: vi.fn().mockResolvedValue(undefined),
    findExpiredTemporaryPasswordStaff: vi.fn().mockResolvedValue([]),
    disableExpiredTemporaryPassword: vi.fn().mockResolvedValue(false),
    reactivateTemporaryPassword: vi.fn().mockResolvedValue(undefined),
    revokeAllActiveSessions: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function createCoordinator(
  accepted = true,
  rateLimited = false,
): PasswordHashCoordinator {
  return {
    verifyPassword: vi.fn().mockResolvedValue({ accepted, rateLimited }),
    createPasswordHash: vi.fn().mockResolvedValue({
      passwordHash: "e".repeat(43),
      passwordSalt: "f".repeat(22),
    }),
  };
}

function createService(
  repository: PasswordAuthenticationRepositoryPort,
  coordinator: PasswordHashCoordinator,
  now = new Date("2026-09-22T10:00:00.000Z"),
) {
  return new PasswordAuthenticationService(repository, coordinator, {
    createId: () => "session-1",
    createToken: () => "a".repeat(43),
    createRateKey: async (scope, value) => `${scope}-${value}`.padEnd(32, "x"),
    now: () => now,
  });
}

describe("PasswordAuthenticationService", () => {
  it("creates a digest-only session after a successful password check", async () => {
    const createSession = vi
      .fn<(record: PasswordSessionRecord) => Promise<void>>()
      .mockResolvedValue(undefined);
    const service = createService(
      createRepositoryStub({ createSession }),
      createCoordinator(),
    );

    await expect(
      service.login({
        username: " Church.Leader ",
        password: "synthetic-only-password",
        sourceIdentifier: "203.0.113.11",
      }),
    ).resolves.toEqual({
      sessionToken: "a".repeat(43),
      expiresAt: new Date("2026-09-22T18:00:00.000Z"),
    });

    expect(createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "session-1",
        staffId: "staff-1",
        passwordVersion: 1,
        tokenDigest: expect.any(Uint8Array),
        absoluteExpiresAt: "2026-09-22T18:00:00.000Z",
      }),
    );
    expect(createSession.mock.calls[0]?.[0].tokenDigest).not.toEqual(
      new TextEncoder().encode("a".repeat(43)),
    );
  });

  it("returns the same generic failure for unknown accounts and wrong passwords", async () => {
    const unknown = createService(
      createRepositoryStub({
        findCredentialByUsername: vi.fn().mockResolvedValue(null),
      }),
      createCoordinator(false),
    );
    const wrongPassword = createService(
      createRepositoryStub(),
      createCoordinator(false),
    );

    for (const service of [unknown, wrongPassword]) {
      await expect(
        service.login({
          username: "church.leader",
          password: "synthetic-only-password",
          sourceIdentifier: "203.0.113.11",
        }),
      ).rejects.toMatchObject({
        code: "AUTHENTICATION_REQUIRED",
        message: "The username or password is not valid.",
      });
    }
  });

  it("blocks a rate-limited sign-in without creating a session", async () => {
    const createSession = vi.fn().mockResolvedValue(undefined);
    const service = createService(
      createRepositoryStub({ createSession }),
      createCoordinator(false, true),
    );

    await expect(
      service.login({
        username: "church.leader",
        password: "synthetic-only-password",
        sourceIdentifier: "203.0.113.11",
      }),
    ).rejects.toMatchObject({ code: "RATE_LIMITED" });
    expect(createSession).not.toHaveBeenCalled();
  });

  it.each([
    [
      "expired",
      {
        ...activeCredential,
        mustChangePassword: true,
        passwordExpiresAt: "2026-09-22T09:59:59.000Z",
      },
    ],
    ["suspended", { ...activeCredential, accountStatus: "suspended" as const }],
  ])(
    "does not create a session for an unavailable %s credential",
    async (_label, credential) => {
      const createSession = vi.fn().mockResolvedValue(undefined);
      const service = createService(
        createRepositoryStub({
          findCredentialByUsername: vi.fn().mockResolvedValue(credential),
          createSession,
        }),
        createCoordinator(true),
      );

      await expect(
        service.login({
          username: "church.leader",
          password: "synthetic-only-password",
          sourceIdentifier: "203.0.113.11",
        }),
      ).rejects.toMatchObject({ code: "AUTHENTICATION_REQUIRED" });
      expect(createSession).not.toHaveBeenCalled();
    },
  );

  it("allows a temporary password to create a session before its three-day deadline", async () => {
    const createSession = vi.fn().mockResolvedValue(undefined);
    const service = createService(
      createRepositoryStub({
        findCredentialByUsername: vi.fn().mockResolvedValue({
          ...activeCredential,
          mustChangePassword: true,
          passwordExpiresAt: "2026-09-25T10:00:00.000Z",
        }),
        createSession,
      }),
      createCoordinator(true),
    );

    await expect(
      service.login({
        username: "church.leader",
        password: "synthetic-only-password",
        sourceIdentifier: "203.0.113.11",
      }),
    ).resolves.toMatchObject({ sessionToken: "a".repeat(43) });
    expect(createSession).toHaveBeenCalledOnce();
  });

  it("disables an expired temporary-password account after a valid sign-in attempt", async () => {
    const disableExpiredTemporaryPassword = vi.fn().mockResolvedValue(true);
    const service = createService(
      createRepositoryStub({
        findCredentialByUsername: vi.fn().mockResolvedValue({
          ...activeCredential,
          mustChangePassword: true,
          passwordExpiresAt: "2026-09-22T09:59:59.000Z",
        }),
        disableExpiredTemporaryPassword,
      }),
      createCoordinator(true),
    );

    await expect(
      service.login({
        username: "church.leader",
        password: "synthetic-only-password",
        sourceIdentifier: "203.0.113.11",
      }),
    ).rejects.toMatchObject({ code: "AUTHENTICATION_REQUIRED" });
    expect(disableExpiredTemporaryPassword).toHaveBeenCalledWith(
      expect.objectContaining({ staffId: "staff-1" }),
    );
  });

  it("touches a valid session only after five minutes", async () => {
    const touchSession = vi.fn().mockResolvedValue(undefined);
    const service = createService(
      createRepositoryStub({
        findActiveSessionByDigest: vi.fn().mockResolvedValue({
          id: "session-1",
          staffId: "staff-1",
          passwordVersion: 1,
          lastSeenAt: "2026-09-22T09:54:00.000Z",
        }),
        touchSession,
      }),
      createCoordinator(),
    );

    await expect(service.resolveSession("a".repeat(43))).resolves.toMatchObject(
      {
        staffId: "staff-1",
      },
    );
    expect(touchSession).toHaveBeenCalledWith(
      "session-1",
      "2026-09-22T10:00:00.000Z",
      "2026-09-22T10:30:00.000Z",
    );
  });

  it("replaces a temporary password with a personal password", async () => {
    const completeTemporaryPasswordSetup = vi.fn().mockResolvedValue(undefined);
    const service = createService(
      createRepositoryStub({
        findCredentialByUsername: vi.fn().mockResolvedValue({
          ...activeCredential,
          accountStatus: "active",
          mustChangePassword: true,
          passwordExpiresAt: "2026-09-23T10:00:00.000Z",
        }),
        completeTemporaryPasswordSetup,
      }),
      createCoordinator(),
    );

    await expect(
      service.completeTemporaryPassword({
        username: "church.leader",
        temporaryPassword: "synthetic temporary password",
        newPassword: "a synthetic personal password",
        sourceIdentifier: "203.0.113.11",
      }),
    ).resolves.toMatchObject({ sessionToken: "a".repeat(43) });
    expect(completeTemporaryPasswordSetup).toHaveBeenCalledWith(
      expect.objectContaining({
        staffId: "staff-1",
        action: "staff.password_temporary_setup_completed",
        session: expect.objectContaining({ passwordVersion: 2 }),
      }),
    );
  });

  it("processes a bounded batch of overdue temporary-password accounts", async () => {
    const disableExpiredTemporaryPassword = vi
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    const service = createService(
      createRepositoryStub({
        findExpiredTemporaryPasswordStaff: vi
          .fn()
          .mockResolvedValue(["staff-1", "staff-2"]),
        disableExpiredTemporaryPassword,
      }),
      createCoordinator(),
    );

    await expect(service.expireOverdueTemporaryPasswords(100)).resolves.toEqual(
      { processed: 1 },
    );
    await expect(
      service.expireOverdueTemporaryPasswords(0),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });

  it("allows a System Administrator to reactivate only an expired temporary-password account", async () => {
    const reactivateTemporaryPassword = vi.fn().mockResolvedValue(undefined);
    const targetStaffId = "00000000-0000-4000-8000-000000000002";
    const service = createService(
      createRepositoryStub({
        findCredentialByStaffId: vi.fn().mockImplementation((staffId) =>
          Promise.resolve(
            staffId === targetStaffId
              ? {
                  ...activeCredential,
                  staffId: targetStaffId,
                  accountStatus: "disabled",
                  mustChangePassword: true,
                  passwordExpiresAt: "2026-09-22T09:59:59.000Z",
                }
              : activeCredential,
          ),
        ),
        reactivateTemporaryPassword,
      }),
      createCoordinator(),
    );

    await expect(
      service.reactivateTemporaryPassword({
        actorStaffId: "00000000-0000-4000-8000-000000000001",
        actorPassword: "an administrator verification password",
        targetStaffId,
        temporaryPassword: "a replacement temporary password",
        reason: "Verified staff identity in person.",
        sourceIdentifier: "203.0.113.11",
      }),
    ).resolves.toBeUndefined();
    expect(reactivateTemporaryPassword).toHaveBeenCalledWith(
      expect.objectContaining({
        staffId: targetStaffId,
        passwordExpiresAt: "2026-09-25T10:00:00.000Z",
      }),
    );
  });

  it("does not allow an administrator to reset their own password", async () => {
    const service = createService(createRepositoryStub(), createCoordinator());

    await expect(
      service.resetStaffPassword({
        actorStaffId: "00000000-0000-4000-8000-000000000001",
        actorPassword: "an administrator verification password",
        targetStaffId: "00000000-0000-4000-8000-000000000001",
        temporaryPassword: "a synthetic temporary password",
        reason: "Synthetic self-reset test only.",
        sourceIdentifier: "203.0.113.11",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
