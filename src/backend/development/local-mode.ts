import { ApplicationError } from "@/shared/errors/application-error";

export type LocalDevelopmentBindings = {
  APP_ENVIRONMENT?: unknown;
};

export type LocalDevelopmentConfiguration = {
  hostname: string;
};

/**
 * This is a developer convenience only. It is intentionally stricter than a
 * normal environment check: a deployed or preview build cannot become a local
 * administrator session merely by sending a forged Host header.
 */
export function localDevelopmentConfiguration(
  environment: LocalDevelopmentBindings,
  host: string | null,
  nodeEnvironment = process.env.NODE_ENV,
): LocalDevelopmentConfiguration | null {
  if (nodeEnvironment !== "development") return null;
  if (environment.APP_ENVIRONMENT !== "local") return null;

  const hostname = loopbackHostname(host);
  return hostname ? { hostname } : null;
}

/**
 * PayMongo test-mode setup is a separate, deliberate task. Until then, local
 * development must not call an external payment provider by accident.
 */
export function assertPayMongoUnavailableInLocalDevelopment(
  environment: LocalDevelopmentBindings,
  nodeEnvironment = process.env.NODE_ENV,
) {
  if (
    nodeEnvironment === "development" &&
    environment.APP_ENVIRONMENT === "local"
  ) {
    throw new ApplicationError(
      "FORBIDDEN",
      "PayMongo is unavailable during ordinary local development.",
    );
  }
}

function loopbackHostname(host: string | null) {
  if (!host || /[\r\n]/.test(host)) return null;
  try {
    const hostname = new URL(`http://${host.trim()}`).hostname.toLowerCase();
    return hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1"
      ? hostname
      : null;
  } catch {
    return null;
  }
}
