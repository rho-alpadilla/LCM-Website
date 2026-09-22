import { z } from "zod";

import {
  NotificationRepository,
  type CreateAdminNotificationRecord,
} from "@/backend/repositories/admin/notification-repository";

const categorySchema = z.enum([
  "staff",
  "content",
  "media",
  "prayer",
  "inquiry",
  "system",
]);

const notificationInputSchema = z.object({
  recipientStaffId: z.uuid(),
  category: categorySchema,
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(280).nullable(),
  href: z
    .string()
    .regex(/^\/(?!\/)/)
    .max(500),
});

export class NotificationService {
  constructor(
    private readonly repository: NotificationRepository,
    private readonly createId: () => string = () => crypto.randomUUID(),
    private readonly now: () => Date = () => new Date(),
  ) {}

  async notify(rawInput: z.input<typeof notificationInputSchema>) {
    const input = notificationInputSchema.parse(rawInput);
    const record: CreateAdminNotificationRecord = {
      id: this.createId(),
      ...input,
      createdAt: this.now().toISOString(),
    };
    await this.repository.create(record);
  }

  async getSummary(staffId: string) {
    const [unreadCount, notifications] = await Promise.all([
      this.repository.countUnreadForStaff(staffId),
      this.repository.listForStaff(staffId, 5),
    ]);
    return { unreadCount, notifications };
  }

  async getWorkspace(staffId: string) {
    return this.repository.listForStaff(staffId, 50);
  }

  async markRead(staffId: string, notificationId: string) {
    await this.repository.markReadForStaff(
      z.uuid().parse(staffId),
      z.uuid().parse(notificationId),
      this.now().toISOString(),
    );
  }
}
