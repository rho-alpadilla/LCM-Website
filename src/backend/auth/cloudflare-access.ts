import {
  createRemoteJWKSet,
  jwtVerify,
  type CryptoKey,
  type JWTVerifyGetKey,
  type JWTPayload,
} from "jose";
import { z } from "zod";

import { ApplicationError } from "@/shared/errors/application-error";
import type { VerifiedStaffIdentity } from "@/backend/services/access-control-service";

const ACCESS_ASSERTION_HEADER = "cf-access-jwt-assertion";
const ACCESS_CERTS_PATH = "/cdn-cgi/access/certs";

type AccessEnvironment = {
  ACCESS_TEAM_DOMAIN: string;
  ACCESS_AUD: string;
};

export type CloudflareAccessConfiguration = {
  teamDomain: string;
  audience: string;
};

type VerificationKey = CryptoKey | JWTVerifyGetKey;

const accessClaimsSchema = z.object({
  sub: z.string().trim().min(1).max(255),
  email: z.email().transform((email) => email.toLowerCase()),
  type: z.literal("app"),
});

const remoteKeySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export function parseCloudflareAccessConfiguration(
  environment: AccessEnvironment,
): CloudflareAccessConfiguration {
  const rawTeamDomain = environment.ACCESS_TEAM_DOMAIN.trim();
  const audience = environment.ACCESS_AUD.trim();

  if (
    !rawTeamDomain ||
    !audience ||
    audience.length > 512 ||
    /\s/.test(audience)
  ) {
    throw new ApplicationError(
      "INTERNAL_ERROR",
      "Cloudflare Access is not configured for this environment.",
    );
  }

  let teamDomain: URL;
  try {
    teamDomain = new URL(rawTeamDomain);
  } catch {
    throw new ApplicationError(
      "INTERNAL_ERROR",
      "Cloudflare Access configuration is invalid.",
    );
  }

  if (
    teamDomain.protocol !== "https:" ||
    !teamDomain.hostname.endsWith(".cloudflareaccess.com") ||
    teamDomain.pathname !== "/" ||
    teamDomain.search ||
    teamDomain.hash ||
    teamDomain.username ||
    teamDomain.password
  ) {
    throw new ApplicationError(
      "INTERNAL_ERROR",
      "Cloudflare Access configuration is invalid.",
    );
  }

  return {
    teamDomain: teamDomain.origin,
    audience,
  };
}

function getRemoteKeySet(teamDomain: string) {
  const cachedKeySet = remoteKeySets.get(teamDomain);
  if (cachedKeySet) return cachedKeySet;

  const keySet = createRemoteJWKSet(
    new URL(ACCESS_CERTS_PATH, `${teamDomain}/`),
  );
  remoteKeySets.set(teamDomain, keySet);
  return keySet;
}

export async function verifyCloudflareAccessToken(
  token: string,
  configuration: CloudflareAccessConfiguration,
  verificationKey: VerificationKey = getRemoteKeySet(configuration.teamDomain),
): Promise<VerifiedStaffIdentity> {
  let payload: JWTPayload;

  try {
    ({ payload } = await jwtVerify(token, verificationKey, {
      algorithms: ["RS256"],
      issuer: configuration.teamDomain,
      audience: configuration.audience,
      requiredClaims: ["exp", "iat", "sub", "email", "type"],
    }));
  } catch (cause) {
    throw new ApplicationError(
      "AUTHENTICATION_REQUIRED",
      "A valid Cloudflare Access session is required.",
      cause,
    );
  }

  const claims = accessClaimsSchema.safeParse(payload);
  if (!claims.success) {
    throw new ApplicationError(
      "AUTHENTICATION_REQUIRED",
      "The Cloudflare Access identity is incomplete.",
    );
  }

  return {
    accessSubject: claims.data.sub,
    email: claims.data.email,
  };
}

export async function verifyCloudflareAccessHeaders(
  headers: Pick<Headers, "get">,
  environment: AccessEnvironment,
): Promise<VerifiedStaffIdentity> {
  const token = headers.get(ACCESS_ASSERTION_HEADER)?.trim();
  if (!token) {
    throw new ApplicationError(
      "AUTHENTICATION_REQUIRED",
      "A Cloudflare Access session is required.",
    );
  }

  return verifyCloudflareAccessToken(
    token,
    parseCloudflareAccessConfiguration(environment),
  );
}
