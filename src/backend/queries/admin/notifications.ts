import "server-only";

import { requireActiveStaffSession } from "@/backend/auth/staff-context";
import { NotificationRepository } from "@/backend/repositories/admin/notification-repository";
import { NotificationService } from "@/backend/services/admin/notification-service";

function serviceFor(database: D1Database) {
  return new NotificationService(new NotificationRepository(database));
}

export async function getAdminNotificationSummary() {
  const { context, environment } = await requireActiveStaffSession();
  return serviceFor(environment.DB).getSummary(context.id);
}

export async function getAdminNotificationWorkspace() {
  const { context, environment } = await requireActiveStaffSession();
  const notifications = await serviceFor(environment.DB).getWorkspace(
    context.id,
  );
  return { context, notifications };
}
