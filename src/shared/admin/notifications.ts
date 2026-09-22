export const adminNotificationCategories = [
  "staff",
  "content",
  "media",
  "prayer",
  "inquiry",
  "system",
] as const;

export type AdminNotificationCategory =
  (typeof adminNotificationCategories)[number];

export type AdminNotification = {
  id: string;
  category: AdminNotificationCategory;
  title: string;
  body: string | null;
  href: string;
  readAt: string | null;
  createdAt: string;
};

export type AdminNotificationSummary = {
  unreadCount: number;
  notifications: AdminNotification[];
};
