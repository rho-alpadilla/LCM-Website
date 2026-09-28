import { DurableObject } from "cloudflare:workers";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

import {
  staffPasswordHashParameters,
  type PasswordVerificationInput,
  type PasswordVerificationResult,
} from "@/shared/auth/password-authentication";

const rateWindowMilliseconds = 15 * 60 * 1000;
const accountAttemptLimit = 5;
const sourceAttemptLimit = 20;
const retainedRateKeyLimit = 1_024;
const decoySalt = new Uint8Array(16);

type RateLimitRow = {
  attempts: number;
  window_started_at: number;
  blocked_until: number | null;
};

/**
 * Keeps expensive password work outside the standard Worker CPU budget.
 * This class is only reachable through an internal Durable Object binding.
 */
export class StaffAuthenticationCoordinator extends DurableObject<CloudflareEnv> {
  constructor(ctx: DurableObjectState, environment: CloudflareEnv) {
    super(ctx, environment);
    ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS password_rate_limits (
          rate_key TEXT PRIMARY KEY,
          attempts INTEGER NOT NULL CHECK (attempts >= 0),
          window_started_at INTEGER NOT NULL,
          blocked_until INTEGER,
          expires_at INTEGER NOT NULL
        )
      `);
      this.ctx.storage.sql.exec(
        "CREATE INDEX IF NOT EXISTS password_rate_limits_expiry ON password_rate_limits(expires_at)",
      );
    });
  }

  async createPasswordHash(password: string) {
    this.assertPassword(password);
    const salt = randomBytes(16);
    const passwordHash = this.derivePassword(password, salt);

    return {
      passwordHash: passwordHash.toString("base64url"),
      passwordSalt: salt.toString("base64url"),
    };
  }

  async verifyPassword(
    input: PasswordVerificationInput,
  ): Promise<PasswordVerificationResult> {
    this.assertVerificationInput(input);
    this.removeExpiredRateLimits(input.now);

    const accountRate = this.consumeRateLimit(
      `account:${input.accountKey}`,
      accountAttemptLimit,
      input.now,
    );
    const sourceRate = this.consumeRateLimit(
      `source:${input.sourceKey}`,
      sourceAttemptLimit,
      input.now,
    );
    if (!accountRate || !sourceRate) {
      return { accepted: false, rateLimited: true };
    }

    const salt = input.passwordSalt
      ? Buffer.from(input.passwordSalt, "base64url")
      : decoySalt;
    const candidateHash = this.derivePassword(input.password, salt);
    const accepted =
      input.passwordHash !== null &&
      timingSafeEqual(
        candidateHash,
        Buffer.from(input.passwordHash, "base64url"),
      );

    if (accepted) {
      this.clearRateLimit(`account:${input.accountKey}`);
    }
    return { accepted, rateLimited: false };
  }

  private derivePassword(password: string, salt: Uint8Array) {
    return scryptSync(password, salt, staffPasswordHashParameters.keyLength, {
      N: staffPasswordHashParameters.cost,
      r: staffPasswordHashParameters.blockSize,
      p: staffPasswordHashParameters.parallelization,
      maxmem: staffPasswordHashParameters.maxMemory,
    });
  }

  private consumeRateLimit(rateKey: string, limit: number, now: number) {
    const [existing] = this.ctx.storage.sql
      .exec<RateLimitRow>(
        `SELECT attempts, window_started_at, blocked_until
         FROM password_rate_limits WHERE rate_key = ?`,
        rateKey,
      )
      .toArray();

    if (existing?.blocked_until && existing.blocked_until > now) return false;
    if (!existing && !this.hasRateLimitCapacity()) return false;

    const inCurrentWindow =
      existing && now - existing.window_started_at < rateWindowMilliseconds;
    const attempts = (inCurrentWindow ? existing.attempts : 0) + 1;
    const blockedUntil = attempts > limit ? now + rateWindowMilliseconds : null;
    this.ctx.storage.sql.exec(
      `INSERT INTO password_rate_limits
        (rate_key, attempts, window_started_at, blocked_until, expires_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(rate_key) DO UPDATE SET
         attempts = excluded.attempts,
         window_started_at = excluded.window_started_at,
         blocked_until = excluded.blocked_until,
         expires_at = excluded.expires_at`,
      rateKey,
      attempts,
      inCurrentWindow ? existing.window_started_at : now,
      blockedUntil,
      now + rateWindowMilliseconds,
    );
    return attempts <= limit;
  }

  private clearRateLimit(rateKey: string) {
    this.ctx.storage.sql.exec(
      "DELETE FROM password_rate_limits WHERE rate_key = ?",
      rateKey,
    );
  }

  private removeExpiredRateLimits(now: number) {
    this.ctx.storage.sql.exec(
      "DELETE FROM password_rate_limits WHERE expires_at <= ?",
      now,
    );
  }

  private hasRateLimitCapacity() {
    const row = this.ctx.storage.sql
      .exec<{ count: number }>(
        "SELECT count(*) AS count FROM password_rate_limits",
      )
      .one();
    return (row?.count ?? 0) < retainedRateKeyLimit;
  }

  private assertPassword(password: string) {
    if (
      typeof password !== "string" ||
      password.length < 1 ||
      password.length > 128
    ) {
      throw new Error("Password input is invalid.");
    }
  }

  private assertVerificationInput(input: PasswordVerificationInput) {
    this.assertPassword(input.password);
    if (
      !/^[A-Za-z0-9_-]{32,128}$/.test(input.accountKey) ||
      !/^[A-Za-z0-9_-]{32,128}$/.test(input.sourceKey)
    ) {
      throw new Error("Password verification keys are invalid.");
    }
    if (
      (input.passwordHash === null) !== (input.passwordSalt === null) ||
      (input.passwordHash !== null &&
        (!/^[A-Za-z0-9_-]{40,128}$/.test(input.passwordHash) ||
          !/^[A-Za-z0-9_-]{16,128}$/.test(input.passwordSalt ?? "")))
    ) {
      throw new Error("Stored password material is invalid.");
    }
  }
}
