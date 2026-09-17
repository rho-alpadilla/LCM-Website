import "server-only";

import { requireActiveStaffSession } from "@/backend/auth/staff-context";
import { PrayerRepository } from "@/backend/repositories/prayer-repository";
import { PrayerService } from "@/backend/services/prayer-service";

export async function getPrayerQueue() {
  const { context, environment } =
    await requireActiveStaffSession("prayer.read_team");
  const service = new PrayerService({
    repository: new PrayerRepository(environment.DB),
  });
  return { context, requests: await service.listQueue(context) };
}

export async function getPrayerDetail(requestId: string) {
  const { context, environment } =
    await requireActiveStaffSession("prayer.read_team");
  const service = new PrayerService({
    repository: new PrayerRepository(environment.DB),
  });
  const [detail, assignees] = await Promise.all([
    service.getDetail(context, requestId),
    context.permissions.includes("prayer.assign")
      ? service.listEligibleAssignees(context)
      : Promise.resolve([]),
  ]);
  return { context, detail, assignees };
}
