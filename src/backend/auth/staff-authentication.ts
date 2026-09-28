import "server-only";

import { ApplicationError } from "@/shared/errors/application-error";
import type { StaffContext } from "@/backend/repositories/staff/access-control-repository";
import { AccessControlRepository } from "@/backend/repositories/staff/access-control-repository";
import { localDevelopmentAdministrator } from "@/backend/development/local-administrator";
import { AccessControlService } from "@/backend/services/staff/access-control-service";
import {
  staffAuthenticationMode,
  type StaffPasswordCloudflareBindings,
} from "@/backend/cloudflare/bindings";

import { verifyCloudflareAccessHeaders } from "./cloudflare-access";
import { findPasswordStaffContext } from "./password-authentication";

type StaffAuthenticationEnvironment = {
  ACCESS_TEAM_DOMAIN: string;
  ACCESS_AUD: string;
  APP_ENVIRONMENT?: unknown;
  DB: D1Database;
};

export async function authenticateActiveStaff(
  requestHeaders: Pick<Headers, "get">,
  environment: StaffAuthenticationEnvironment,
  database: D1Database,
  requiredPermission = "admin.access",
): Promise<StaffContext> {
  const development = await localDevelopmentAdministrator(
    requestHeaders,
    environment,
  );
  if (development) {
    if (!development.context.permissions.includes(requiredPermission)) {
      throw new ApplicationError(
        "FORBIDDEN",
        "The required permission is missing.",
      );
    }
    return development.context;
  }
  if (
    staffAuthenticationMode(environment as StaffPasswordCloudflareBindings) ===
    "password"
  ) {
    const passwordEnvironment = environment as StaffPasswordCloudflareBindings;
    if (
      !passwordEnvironment.STAFF_AUTHENTICATION ||
      !passwordEnvironment.STAFF_AUTH_RATE_LIMIT_SECRET
    ) {
      throw new ApplicationError(
        "INTERNAL_ERROR",
        "Password sign-in is not configured for this environment.",
      );
    }
    const authenticatedStaff = await findPasswordStaffContext(
      requestHeaders,
      passwordEnvironment,
    );
    if (!authenticatedStaff) {
      throw new ApplicationError(
        "AUTHENTICATION_REQUIRED",
        "A valid staff session is required.",
      );
    }
    if (!authenticatedStaff.context.permissions.includes(requiredPermission)) {
      throw new ApplicationError(
        "FORBIDDEN",
        "The required permission is missing.",
      );
    }
    return authenticatedStaff.context;
  }
  const identity = await verifyCloudflareAccessHeaders(
    requestHeaders,
    environment,
  );
  const service = new AccessControlService(
    new AccessControlRepository(database),
  );

  const context = await service.getActiveStaffContext(identity);
  await service.requirePermission(identity, requiredPermission);

  return context;
}
