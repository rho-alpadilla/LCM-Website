import "server-only";

import type { StaffContext } from "@/shared/staff/types";
import type {
  PasswordVerificationInput,
  PasswordVerificationResult,
} from "@/shared/auth/password-authentication";
import { staffPasswordCookieName } from "@/shared/auth/password-authentication";
import type { StaffPasswordCloudflareBindings } from "@/backend/cloudflare/bindings";
import { AccessControlRepository } from "@/backend/repositories/staff/access-control-repository";
import { PasswordAuthenticationRepository } from "@/backend/repositories/staff/password-authentication-repository";
import { PasswordAuthenticationService } from "@/backend/services/staff/password-authentication-service";

type RequestHeaders = Pick<Headers, "get">;

type StaffAuthenticationCoordinatorStub = {
  verifyPassword(
    input: PasswordVerificationInput,
  ): Promise<PasswordVerificationResult>;
  createPasswordHash(
    password: string,
  ): Promise<{ passwordHash: string; passwordSalt: string }>;
};

export async function authenticateStaffPassword(
  input: { username: string; password: string; sourceIdentifier: string },
  environment: StaffPasswordCloudflareBindings,
) {
  const service = createPasswordAuthenticationService(environment);
  return service.login(input);
}

export async function findPasswordStaffContext(
  requestHeaders: RequestHeaders,
  environment: StaffPasswordCloudflareBindings,
): Promise<{
  context: StaffContext;
  temporaryPasswordExpiresAt: string | null;
} | null> {
  const sessionToken = readCookie(
    requestHeaders,
    staffPasswordCookieName(environment),
  );
  if (!sessionToken) return null;

  const session =
    await createPasswordAuthenticationService(environment).resolveSession(
      sessionToken,
    );
  if (!session) return null;

  const context = await new AccessControlRepository(
    environment.DB,
  ).findStaffContextByStaffId(session.staffId);
  if (!context || context.accountStatus !== "active") return null;
  return {
    context,
    temporaryPasswordExpiresAt: session.mustChangePassword
      ? session.passwordExpiresAt
      : null,
  };
}

export async function signOutPasswordSession(
  requestHeaders: RequestHeaders,
  environment: StaffPasswordCloudflareBindings,
) {
  const sessionToken = readCookie(
    requestHeaders,
    staffPasswordCookieName(environment),
  );
  if (!sessionToken) return;
  await createPasswordAuthenticationService(environment).logout(sessionToken);
}

function createPasswordAuthenticationService(
  environment: StaffPasswordCloudflareBindings,
) {
  return new PasswordAuthenticationService(
    new PasswordAuthenticationRepository(environment.DB),
    createPasswordHashCoordinator(environment),
    {
      createRateKey: (scope, value) =>
        hmacBase64Url(
          environment.STAFF_AUTH_RATE_LIMIT_SECRET ?? "",
          `${scope}:${value}`,
        ),
    },
  );
}

export function getPasswordAuthenticationService(
  environment: StaffPasswordCloudflareBindings,
) {
  return createPasswordAuthenticationService(environment);
}

export function readPasswordSessionToken(
  requestHeaders: RequestHeaders,
  environment: Pick<StaffPasswordCloudflareBindings, "APP_ENVIRONMENT">,
) {
  return readCookie(requestHeaders, staffPasswordCookieName(environment));
}

function createPasswordHashCoordinator(
  environment: StaffPasswordCloudflareBindings,
) {
  const coordinatorFor = (key: string) => {
    const shard = key.charCodeAt(0) % 16;
    return environment.STAFF_AUTHENTICATION.getByName(
      `staff-authentication-shard-${shard}`,
    ) as unknown as StaffAuthenticationCoordinatorStub;
  };
  return {
    verifyPassword(input: PasswordVerificationInput) {
      return coordinatorFor(input.accountKey).verifyPassword(input);
    },
    createPasswordHash(password: string) {
      return coordinatorFor("password-hash").createPasswordHash(password);
    },
  };
}

function readCookie(headers: RequestHeaders, name: string) {
  const cookieHeader = headers.get("cookie");
  if (!cookieHeader || cookieHeader.length > 8_192) return null;

  for (const part of cookieHeader.split(";")) {
    const [key, ...valueParts] = part.trim().split("=");
    if (key === name) return valueParts.join("=");
  }
  return null;
}

async function hmacBase64Url(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)),
  );
  let binary = "";
  for (const byte of signature) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}
