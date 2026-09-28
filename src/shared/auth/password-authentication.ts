export function staffPasswordCookieName(environment: {
  APP_ENVIRONMENT?: unknown;
}) {
  return environment.APP_ENVIRONMENT === "local"
    ? "lcm_staff_session"
    : "__Host-lcm_staff_session";
}

export const staffPasswordHashParameters = {
  algorithm: "scrypt" as const,
  keyLength: 32,
  cost: 65_536,
  blockSize: 8,
  parallelization: 2,
  maxMemory: 80 * 1024 * 1024,
};

export type StaffPasswordCredential = {
  staffId: string;
  username: string;
  passwordHash: string;
  passwordSalt: string;
  passwordVersion: number;
  mustChangePassword: boolean;
  accountStatus: "invited" | "active" | "suspended" | "disabled";
  passwordExpiresAt: string | null;
};

export type PasswordVerificationInput = {
  password: string;
  passwordHash: string | null;
  passwordSalt: string | null;
  accountKey: string;
  sourceKey: string;
  now: number;
};

export type PasswordVerificationResult = {
  accepted: boolean;
  rateLimited: boolean;
};
