import "server-only";

import { ApplicationError } from "@/shared/errors/application-error";
import type { StaffContext } from "@/backend/repositories/access-control-repository";
import { AccessControlRepository } from "@/backend/repositories/access-control-repository";
import { localDevelopmentAdministrator } from "@/backend/development/local-administrator";
import { AccessControlService } from "@/backend/services/access-control-service";

import { verifyCloudflareAccessHeaders } from "./cloudflare-access";

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
