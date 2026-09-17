import "server-only";

import type { StaffContext } from "@/backend/repositories/access-control-repository";
import { AccessControlRepository } from "@/backend/repositories/access-control-repository";
import { AccessControlService } from "@/backend/services/access-control-service";

import { verifyCloudflareAccessHeaders } from "./cloudflare-access";

type StaffAuthenticationEnvironment = {
  ACCESS_TEAM_DOMAIN: string;
  ACCESS_AUD: string;
};

export async function authenticateActiveStaff(
  requestHeaders: Pick<Headers, "get">,
  environment: StaffAuthenticationEnvironment,
  database: D1Database,
  requiredPermission = "admin.access",
): Promise<StaffContext> {
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
