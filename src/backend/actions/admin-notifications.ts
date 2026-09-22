"use server";

import { redirect } from "next/navigation";
import type { Route } from "next";
import { z } from "zod";

import { requireActiveStaffSession } from "@/backend/auth/staff-context";
import { NotificationRepository } from "@/backend/repositories/admin/notification-repository";
import { NotificationService } from "@/backend/services/admin/notification-service";

const markReadSchema = z.object({ notificationId: z.uuid() });

export async function markAdminNotificationReadAction(formData: FormData) {
  const parsed = markReadSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) redirect("/admin/notifications" as Route);

  const { context, environment } = await requireActiveStaffSession();
  await new NotificationService(
    new NotificationRepository(environment.DB),
  ).markRead(context.id, parsed.data.notificationId);
  redirect("/admin/notifications" as Route);
}
