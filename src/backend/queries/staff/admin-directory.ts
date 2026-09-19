import "server-only";

import { requireActiveStaffSession } from "@/backend/auth/staff-context";
import { AccessControlRepository } from "@/backend/repositories/staff/access-control-repository";
import { AccessControlService } from "@/backend/services/staff/access-control-service";

export async function getStaffWorkspace() {
  const { context, environment } =
    await requireActiveStaffSession("staff.read");
  const service = new AccessControlService(
    new AccessControlRepository(environment.DB),
  );
  return { context, ...(await service.listStaffDirectory()) };
}
