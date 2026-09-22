import type { AdminNotification } from "@/shared/admin/notifications";

export type { AdminNotification } from "@/shared/admin/notifications";

export type CreateAdminNotificationRecord = Omit<
  AdminNotification,
  "readAt" | "createdAt"
> & {
  recipientStaffId: string;
  createdAt: string;
};

type NotificationRow = {
  id: string;
  category: AdminNotification["category"];
  title: string;
  body: string | null;
  href: string;
  read_at: string | null;
  created_at: string;
};

function mapNotification(row: NotificationRow): AdminNotification {
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    body: row.body,
    href: row.href,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

export class NotificationRepository {
  constructor(private readonly database: D1Database) {}

  async create(record: CreateAdminNotificationRecord) {
    await this.database
      .prepare(
        `INSERT INTO admin_notifications
          (id, recipient_staff_id, category, title, body, href, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
      )
      .bind(
        record.id,
        record.recipientStaffId,
        record.category,
        record.title,
        record.body,
        record.href,
        record.createdAt,
      )
      .run();
  }

  async listForStaff(staffId: string, limit: number) {
    const result = await this.database
      .prepare(
        `SELECT id, category, title, body, href, read_at, created_at
         FROM admin_notifications
         WHERE recipient_staff_id = ?1
         ORDER BY created_at DESC
         LIMIT ?2`,
      )
      .bind(staffId, limit)
      .all<NotificationRow>();
    return result.results.map(mapNotification);
  }

  async countUnreadForStaff(staffId: string) {
    const result = await this.database
      .prepare(
        `SELECT count(*) AS count FROM admin_notifications
         WHERE recipient_staff_id = ?1 AND read_at IS NULL`,
      )
      .bind(staffId)
      .first<{ count: number }>();
    return result?.count ?? 0;
  }

  async markReadForStaff(
    staffId: string,
    notificationId: string,
    readAt: string,
  ) {
    await this.database
      .prepare(
        `UPDATE admin_notifications SET read_at = ?3
         WHERE id = ?1 AND recipient_staff_id = ?2 AND read_at IS NULL`,
      )
      .bind(notificationId, staffId, readAt)
      .run();
  }
}
