import { z } from "zod";

import { ApplicationError } from "@/shared/errors/application-error";
import type {
  PasswordVerificationInput,
  PasswordVerificationResult,
  StaffPasswordCredential,
} from "@/shared/auth/password-authentication";
import type {
  ActivePasswordSession,
  PasswordAuthenticationRepositoryPort,
  PasswordSessionRecord,
} from "@/backend/repositories/staff/password-authentication-repository";

const sessionIdleMilliseconds = 30 * 60 * 1_000;
const sessionAbsoluteMilliseconds = 8 * 60 * 60 * 1_000;
const sessionTouchIntervalMilliseconds = 5 * 60 * 1_000;
const temporaryPasswordLifetimeMilliseconds = 3 * 24 * 60 * 60 * 1_000;

const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z][a-z0-9._-]{2,63}$/, "Enter a valid username.");

const personalPasswordSchema = z
  .string()
  .min(15, "Use at least 15 characters.")
  .max(128, "Password is too long.");

const temporaryPasswordSchema = z.string().min(15).max(128);

export type PasswordHashCoordinator = {
  verifyPassword(
    input: PasswordVerificationInput,
  ): Promise<PasswordVerificationResult>;
  createPasswordHash(
    password: string,
  ): Promise<{ passwordHash: string; passwordSalt: string }>;
};

export type PasswordLoginInput = {
  username: string;
  password: string;
  sourceIdentifier: string;
};

export type PasswordLoginResult = { sessionToken: string; expiresAt: Date };

export type PasswordEnrollmentInput = {
  actorStaffId: string;
  actorPassword: string;
  email: string;
  displayName: string;
  phone?: string;
  jobTitle?: string;
  username: string;
  temporaryPassword: string;
  roleCode: string;
  reason?: string;
  sourceIdentifier: string;
};

export type PasswordResetInput = {
  actorStaffId: string;
  actorPassword: string;
  targetStaffId: string;
  temporaryPassword: string;
  reason: string;
  sourceIdentifier: string;
};

export type CompleteTemporaryPasswordInput = {
  username: string;
  temporaryPassword: string;
  newPassword: string;
  sourceIdentifier: string;
};

export type ChangeOwnPasswordInput = {
  staffId: string;
  currentPassword: string;
  newPassword: string;
  sourceIdentifier: string;
};

export type RevokeSessionsInput = {
  actorStaffId: string;
  actorPassword: string;
  targetStaffId: string;
  reason: string;
  sourceIdentifier: string;
};

export type ReactivateTemporaryPasswordInput = {
  actorStaffId: string;
  actorPassword: string;
  targetStaffId: string;
  temporaryPassword: string;
  reason: string;
  sourceIdentifier: string;
};

type ServiceDependencies = {
  createId?: () => string;
  createToken?: () => string;
  now?: () => Date;
  createRateKey?: (scope: string, value: string) => Promise<string>;
};

export class PasswordAuthenticationService {
  constructor(
    private readonly repository: PasswordAuthenticationRepositoryPort,
    private readonly coordinator: PasswordHashCoordinator,
    private readonly dependencies: ServiceDependencies = {},
  ) {}

  async login(input: PasswordLoginInput): Promise<PasswordLoginResult> {
    const credential = await this.verifyCredential(
      input.username,
      input.password,
      input.sourceIdentifier,
    );
    const now = this.now();
    if (credential?.mustChangePassword && this.isExpired(credential, now)) {
      await this.expireTemporaryPasswordIfDue(credential.staffId, now);
      throw invalidCredentials();
    }
    if (!this.isEligibleCredential(credential, now)) {
      throw invalidCredentials();
    }
    return this.createSessionForCredential(credential, now);
  }

  async enrollStaff(rawInput: PasswordEnrollmentInput) {
    const input = this.parseEnrollment(rawInput);
    await this.verifyActorPassword(
      input.actorStaffId,
      input.actorPassword,
      input.sourceIdentifier,
    );
    if (await this.repository.emailExists(input.email)) {
      throw new ApplicationError(
        "VALIDATION_FAILED",
        "That email already has a staff account.",
      );
    }
    if (await this.repository.usernameExists(input.username)) {
      throw new ApplicationError(
        "VALIDATION_FAILED",
        "That username is already in use.",
      );
    }
    const now = this.now();
    const password = await this.coordinator.createPasswordHash(
      input.temporaryPassword,
    );
    await this.repository.createPasswordEnrollment({
      staffId: this.createId(),
      roleAssignmentId: this.createId(),
      auditLogId: this.createId(),
      correlationId: this.createId(),
      actorStaffId: input.actorStaffId,
      email: input.email,
      displayName: input.displayName,
      phone: input.phone || null,
      jobTitle: input.jobTitle || null,
      username: input.username,
      roleCode: input.roleCode,
      reason: input.reason || null,
      passwordHash: password.passwordHash,
      passwordSalt: password.passwordSalt,
      passwordExpiresAt: new Date(
        now.getTime() + temporaryPasswordLifetimeMilliseconds,
      ).toISOString(),
      createdAt: now.toISOString(),
    });
  }

  async completeTemporaryPassword(
    input: CompleteTemporaryPasswordInput,
  ): Promise<PasswordLoginResult> {
    const credential = await this.verifyCredential(
      input.username,
      input.temporaryPassword,
      input.sourceIdentifier,
    );
    const now = this.now();
    if (
      !credential ||
      !credential.mustChangePassword ||
      this.isExpired(credential, now)
    ) {
      throw invalidCredentials();
    }
    if (
      credential.accountStatus !== "invited" &&
      credential.accountStatus !== "active"
    ) {
      throw invalidCredentials();
    }
    const newPassword = personalPasswordSchema.parse(input.newPassword);
    const hash = await this.coordinator.createPasswordHash(newPassword);
    const session = await this.newSessionRecord(
      credential.staffId,
      credential.passwordVersion + 1,
      now,
    );
    await this.repository.completeTemporaryPasswordSetup({
      staffId: credential.staffId,
      previousPasswordVersion: credential.passwordVersion,
      passwordHash: hash.passwordHash,
      passwordSalt: hash.passwordSalt,
      changedAt: now.toISOString(),
      session,
      auditLogId: this.createId(),
      correlationId: this.createId(),
      action: "staff.password_temporary_setup_completed",
    });
    return {
      sessionToken: this.sessionTokenFromRecord(session),
      expiresAt: new Date(session.absoluteExpiresAt),
    };
  }

  async changeOwnPassword(
    input: ChangeOwnPasswordInput,
  ): Promise<PasswordLoginResult> {
    const credential = await this.verifyCredentialByStaffId(
      input.staffId,
      input.currentPassword,
      input.sourceIdentifier,
    );
    const now = this.now();
    if (!this.isEligibleCredential(credential, now)) throw invalidCredentials();
    const hash = await this.coordinator.createPasswordHash(
      personalPasswordSchema.parse(input.newPassword),
    );
    const session = await this.newSessionRecord(
      credential.staffId,
      credential.passwordVersion + 1,
      now,
    );
    await this.repository.replacePassword({
      staffId: credential.staffId,
      previousPasswordVersion: credential.passwordVersion,
      passwordHash: hash.passwordHash,
      passwordSalt: hash.passwordSalt,
      changedAt: now.toISOString(),
      session,
      actorStaffId: credential.staffId,
      auditLogId: this.createId(),
      correlationId: this.createId(),
      action: "staff.password_changed",
      metadata: { initiatedBy: "staff" },
    });
    return {
      sessionToken: this.sessionTokenFromRecord(session),
      expiresAt: new Date(session.absoluteExpiresAt),
    };
  }

  async resetStaffPassword(rawInput: PasswordResetInput) {
    const input = this.parseReset(rawInput);
    if (input.actorStaffId === input.targetStaffId) {
      throw new ApplicationError(
        "FORBIDDEN",
        "Use the password-change form for your own account.",
      );
    }
    await this.verifyActorPassword(
      input.actorStaffId,
      input.actorPassword,
      input.sourceIdentifier,
    );
    const target = await this.repository.findCredentialByStaffId(
      input.targetStaffId,
    );
    const now = this.now();
    if (!target || target.accountStatus !== "active") {
      throw new ApplicationError(
        "NOT_FOUND",
        "The active staff password account was not found.",
      );
    }
    const hash = await this.coordinator.createPasswordHash(
      input.temporaryPassword,
    );
    await this.repository.replacePassword({
      staffId: target.staffId,
      previousPasswordVersion: target.passwordVersion,
      passwordHash: hash.passwordHash,
      passwordSalt: hash.passwordSalt,
      changedAt: now.toISOString(),
      actorStaffId: input.actorStaffId,
      auditLogId: this.createId(),
      correlationId: this.createId(),
      action: "staff.password_reset_issued",
      metadata: { reason: input.reason, initiatedBy: "system_admin" },
    });
  }

  async reactivateTemporaryPassword(
    rawInput: ReactivateTemporaryPasswordInput,
  ) {
    const input = this.parseReactivation(rawInput);
    if (input.actorStaffId === input.targetStaffId) {
      throw new ApplicationError(
        "FORBIDDEN",
        "Use the password-change form for your own account.",
      );
    }
    await this.verifyActorPassword(
      input.actorStaffId,
      input.actorPassword,
      input.sourceIdentifier,
    );
    const target = await this.repository.findCredentialByStaffId(
      input.targetStaffId,
    );
    const now = this.now();
    if (
      !target ||
      target.accountStatus !== "disabled" ||
      !target.mustChangePassword ||
      !this.isExpired(target, now)
    ) {
      throw new ApplicationError(
        "VALIDATION_FAILED",
        "This account is not awaiting temporary-password reactivation.",
      );
    }
    const password = await this.coordinator.createPasswordHash(
      input.temporaryPassword,
    );
    await this.repository.reactivateTemporaryPassword({
      staffId: target.staffId,
      previousPasswordVersion: target.passwordVersion,
      passwordHash: password.passwordHash,
      passwordSalt: password.passwordSalt,
      passwordExpiresAt: new Date(
        now.getTime() + temporaryPasswordLifetimeMilliseconds,
      ).toISOString(),
      reactivatedAt: now.toISOString(),
      actorStaffId: input.actorStaffId,
      reason: input.reason,
      auditLogId: this.createId(),
      correlationId: this.createId(),
    });
  }

  async expireOverdueTemporaryPasswords(limit = 100) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
      throw new ApplicationError(
        "VALIDATION_FAILED",
        "Temporary-password expiry batch size must be between 1 and 500.",
      );
    }
    const now = this.now();
    const candidates = await this.repository.findExpiredTemporaryPasswordStaff(
      now.toISOString(),
      limit,
    );
    let processed = 0;
    for (const staffId of candidates) {
      const disabled = await this.expireTemporaryPasswordIfDue(staffId, now);
      if (disabled) processed += 1;
    }
    return { processed };
  }

  async revokeStaffSessions(rawInput: RevokeSessionsInput) {
    const input = this.parseRevoke(rawInput);
    await this.verifyActorPassword(
      input.actorStaffId,
      input.actorPassword,
      input.sourceIdentifier,
    );
    await this.repository.revokeAllActiveSessions({
      staffId: input.targetStaffId,
      actorStaffId: input.actorStaffId,
      reason: input.reason,
      revokedAt: this.now().toISOString(),
      auditLogId: this.createId(),
      correlationId: this.createId(),
    });
  }

  async resolveSession(
    sessionToken: string,
  ): Promise<ActivePasswordSession | null> {
    if (!isSessionToken(sessionToken)) return null;
    const now = this.now();
    const session = await this.repository.findActiveSessionByDigest(
      await digestToken(sessionToken),
      now.toISOString(),
    );
    if (!session) return null;
    if (
      session.mustChangePassword &&
      this.isExpiryTimestampElapsed(session.passwordExpiresAt, now)
    ) {
      await this.expireTemporaryPasswordIfDue(session.staffId, now);
      return null;
    }
    if (
      now.getTime() - Date.parse(session.lastSeenAt) >=
      sessionTouchIntervalMilliseconds
    ) {
      await this.repository.touchSession(
        session.id,
        now.toISOString(),
        new Date(now.getTime() + sessionIdleMilliseconds).toISOString(),
      );
    }
    return session;
  }

  async logout(sessionToken: string) {
    const session = await this.resolveSession(sessionToken);
    if (!session) return;
    await this.repository.revokeSession(
      session.id,
      this.now().toISOString(),
      "Staff member signed out.",
    );
  }

  private async verifyActorPassword(
    staffId: string,
    password: string,
    sourceIdentifier: string,
  ) {
    const credential = await this.verifyCredentialByStaffId(
      staffId,
      password,
      sourceIdentifier,
    );
    if (!this.isEligibleCredential(credential, this.now()))
      throw invalidCredentials();
    return credential;
  }

  private async verifyCredential(
    username: string,
    password: string,
    sourceIdentifier: string,
  ) {
    const normalizedUsername = normalizeUsername(username);
    const credential =
      await this.repository.findCredentialByUsername(normalizedUsername);
    return this.verifyCredentialMaterial(
      credential,
      password,
      sourceIdentifier,
      credential?.staffId ?? normalizedUsername,
    );
  }

  private async verifyCredentialByStaffId(
    staffId: string,
    password: string,
    sourceIdentifier: string,
  ) {
    const credential = await this.repository.findCredentialByStaffId(staffId);
    return this.verifyCredentialMaterial(
      credential,
      password,
      sourceIdentifier,
      credential?.staffId ?? staffId,
    );
  }

  private async verifyCredentialMaterial(
    credential: StaffPasswordCredential | null,
    password: string,
    sourceIdentifier: string,
    accountValue: string,
  ) {
    const checkedPassword = validateAnyPassword(password);
    const [accountKey, sourceKey] = await Promise.all([
      this.createRateKey("account", accountValue),
      this.createRateKey("source", normalizeSourceIdentifier(sourceIdentifier)),
    ]);
    const verification = await this.coordinator.verifyPassword({
      password: checkedPassword,
      passwordHash: credential?.passwordHash ?? null,
      passwordSalt: credential?.passwordSalt ?? null,
      accountKey,
      sourceKey,
      now: this.now().getTime(),
    });
    if (verification.rateLimited) {
      throw new ApplicationError(
        "RATE_LIMITED",
        "Too many sign-in attempts. Please wait before trying again.",
      );
    }
    if (!credential || !verification.accepted) throw invalidCredentials();
    return credential;
  }

  private isEligibleCredential(
    credential: StaffPasswordCredential | null,
    now: Date,
  ) {
    return (
      credential !== null &&
      credential.accountStatus === "active" &&
      (!credential.mustChangePassword || !this.isExpired(credential, now))
    );
  }

  private isExpired(credential: StaffPasswordCredential, now: Date) {
    return this.isExpiryTimestampElapsed(credential.passwordExpiresAt, now);
  }

  private isExpiryTimestampElapsed(expiresAt: string | null, now: Date) {
    return expiresAt !== null && Date.parse(expiresAt) <= now.getTime();
  }

  private async expireTemporaryPasswordIfDue(staffId: string, now: Date) {
    return this.repository.disableExpiredTemporaryPassword({
      staffId,
      disabledAt: now.toISOString(),
      auditLogId: this.createId(),
      correlationId: this.createId(),
    });
  }

  private async createSessionForCredential(
    credential: StaffPasswordCredential,
    now: Date,
  ): Promise<PasswordLoginResult> {
    const record = await this.newSessionRecord(
      credential.staffId,
      credential.passwordVersion,
      now,
    );
    await this.repository.createSession(record);
    return {
      sessionToken: this.sessionTokenFromRecord(record),
      expiresAt: new Date(record.absoluteExpiresAt),
    };
  }

  private async newSessionRecord(
    staffId: string,
    passwordVersion: number,
    now: Date,
  ): Promise<PasswordSessionRecord & { plaintextToken: string }> {
    const plaintextToken = this.createToken();
    const createdAt = now.toISOString();
    return {
      id: this.createId(),
      staffId,
      tokenDigest: await digestToken(plaintextToken),
      passwordVersion,
      createdAt,
      lastSeenAt: createdAt,
      idleExpiresAt: new Date(
        now.getTime() + sessionIdleMilliseconds,
      ).toISOString(),
      absoluteExpiresAt: new Date(
        now.getTime() + sessionAbsoluteMilliseconds,
      ).toISOString(),
      plaintextToken,
    };
  }

  private sessionTokenFromRecord(
    record: PasswordSessionRecord & { plaintextToken?: string },
  ) {
    if (!record.plaintextToken)
      throw new Error("A new password session token was unavailable.");
    return record.plaintextToken;
  }

  private parseEnrollment(input: PasswordEnrollmentInput) {
    const roleCode = z
      .enum([
        "system_admin",
        "pastor",
        "core_leader",
        "content_publisher",
        "content_editor",
        "prayer_warrior",
      ])
      .parse(input.roleCode);
    const reason = z
      .string()
      .trim()
      .max(500)
      .parse(input.reason ?? "");
    if (
      ["system_admin", "core_leader"].includes(roleCode) &&
      reason.length < 10
    ) {
      throw new ApplicationError(
        "VALIDATION_FAILED",
        "Elevated roles require a reason of at least 10 characters.",
      );
    }
    return {
      actorStaffId: z.uuid().parse(input.actorStaffId),
      actorPassword: temporaryPasswordSchema.parse(input.actorPassword),
      email: z
        .string()
        .trim()
        .max(254)
        .pipe(z.email())
        .transform((value) => value.toLowerCase())
        .parse(input.email),
      displayName: z.string().trim().min(2).max(120).parse(input.displayName),
      phone: z
        .string()
        .trim()
        .max(40)
        .parse(input.phone ?? ""),
      jobTitle: z
        .string()
        .trim()
        .max(120)
        .parse(input.jobTitle ?? ""),
      username: normalizeUsername(input.username),
      temporaryPassword: temporaryPasswordSchema.parse(input.temporaryPassword),
      roleCode,
      reason,
      sourceIdentifier: normalizeSourceIdentifier(input.sourceIdentifier),
    };
  }

  private parseReset(input: PasswordResetInput) {
    return {
      actorStaffId: z.uuid().parse(input.actorStaffId),
      actorPassword: temporaryPasswordSchema.parse(input.actorPassword),
      targetStaffId: z.uuid().parse(input.targetStaffId),
      temporaryPassword: temporaryPasswordSchema.parse(input.temporaryPassword),
      reason: z.string().trim().min(10).max(500).parse(input.reason),
      sourceIdentifier: normalizeSourceIdentifier(input.sourceIdentifier),
    };
  }

  private parseRevoke(input: RevokeSessionsInput) {
    return {
      actorStaffId: z.uuid().parse(input.actorStaffId),
      actorPassword: temporaryPasswordSchema.parse(input.actorPassword),
      targetStaffId: z.uuid().parse(input.targetStaffId),
      reason: z.string().trim().min(10).max(500).parse(input.reason),
      sourceIdentifier: normalizeSourceIdentifier(input.sourceIdentifier),
    };
  }

  private parseReactivation(input: ReactivateTemporaryPasswordInput) {
    return {
      actorStaffId: z.uuid().parse(input.actorStaffId),
      actorPassword: temporaryPasswordSchema.parse(input.actorPassword),
      targetStaffId: z.uuid().parse(input.targetStaffId),
      temporaryPassword: temporaryPasswordSchema.parse(input.temporaryPassword),
      reason: z.string().trim().min(10).max(500).parse(input.reason),
      sourceIdentifier: normalizeSourceIdentifier(input.sourceIdentifier),
    };
  }

  private now() {
    return this.dependencies.now?.() ?? new Date();
  }
  private createId() {
    return this.dependencies.createId?.() ?? crypto.randomUUID();
  }
  private createToken() {
    return this.dependencies.createToken?.() ?? createSessionToken();
  }
  private async createRateKey(scope: string, value: string) {
    return this.dependencies.createRateKey
      ? this.dependencies.createRateKey(scope, value)
      : sha256Base64Url(`${scope}:${value}`);
  }
}

export function normalizeUsername(value: string) {
  return usernameSchema.parse(value);
}
function validateAnyPassword(value: string) {
  if (typeof value !== "string" || value.length < 1 || value.length > 128)
    throw invalidCredentials();
  return value;
}
function normalizeSourceIdentifier(value: string) {
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= 256
    ? normalized
    : "unknown";
}
function invalidCredentials() {
  return new ApplicationError(
    "AUTHENTICATION_REQUIRED",
    "The username or password is not valid.",
  );
}
function createSessionToken() {
  return encodeBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}
function isSessionToken(value: string) {
  return /^[A-Za-z0-9_-]{43}$/.test(value);
}
export async function digestToken(token: string) {
  return new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)),
  );
}
export async function sha256Base64Url(value: string) {
  return encodeBase64Url(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
  );
}
function encodeBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}
